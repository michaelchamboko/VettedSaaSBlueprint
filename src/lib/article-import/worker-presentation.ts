import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, realpath, rm } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { z } from "zod";
import { chromium } from "playwright";
import { REPOSITORY_CANONICAL_ORIGIN } from "../site/public-site";
import { candidatePreviewPath } from "./candidate-route";
import { captureCommandExecution, evidenceReference, readEvidenceBytes, storeEvidence, storeEvidenceBytes, type EvidenceRef } from "./execution-evidence";
import { readImportArtifactTarget } from "./format-validation";
import { requiredDetectorInputs, validateRenderingInputs } from "./rendering-inputs";
import { readImportVerifierEvidence, verificationContext } from "./verification-evidence";
import { createDesignReviewSchema, designReviewInput } from "./workflow-evidence";
import type { Packet } from "./worker-editorial";

const designRules = ["design-read", "context", "shape", "critique", "audit", "polish"] as const;
export const presentationTool = z.object({ rule: z.enum([...designRules, "detect", "desktop", "mobile", "reduced-motion", "owner-verifier"]) }).strict();
type Exchange = (pass: string, input: Record<string,string>, refs: EvidenceRef[], instructions: (EvidenceRef & {text:string})[],
  prompt: string, model: string) => Promise<{output: Record<string,string>,executionRef:EvidenceRef}>;

export async function presentationOperation(packet: Packet, {rule}: z.infer<typeof presentationTool>, exchange: Exchange) {
  if (packet.stage !== "VALIDATING" || !packet.artifactPath || !packet.rendering || !packet.approvedFingerprint ||
      packet.format === "agent_review_required") throw new Error("PRESENTATION_APPROVAL_REQUIRED");
  const {root, importId, rendering: renderInputsRef} = packet;
  const {artifact, target} = await readImportArtifactTarget(root, packet.format, packet.artifactPath);
  if (target.artifactFingerprint !== packet.approvedFingerprint) throw new Error("PRESENTATION_ARTIFACT_MISMATCH");
  const artifactRef = await evidenceReference(root,packet.artifactPath);
  const inputRefs = [artifactRef, renderInputsRef];
  const rendering = await validateRenderingInputs(root,renderInputsRef);
  const routes = target.format === "direct-review" ? [candidatePreviewPath(target.slug)] : target.renderedRoutes;
  if (routes.some(route => !/^\/(?!\/)/.test(route) || route.includes("\\"))) throw new Error("PRESENTATION_ROUTES_MISMATCH");
  const capability = JSON.parse((await readEvidenceBytes(root,"config/article-workflow-capabilities.json")).toString("utf8"));
  if (rule === "detect") {
    const binary = ".agents/skills/impeccable/scripts/bin/windows-x64/impeccable.exe";
    const versionFile = ".agents/skills/impeccable/scripts/VERSION";
    const binaryRef = await evidenceReference(root,binary);
    const versionRef = await evidenceReference(root,versionFile);
    for (const ref of [binaryRef,versionRef]) {
      if (!capability.files.some((pin:EvidenceRef) => pin.path === ref.path && pin.sha256 === ref.sha256)) throw new Error("PRESENTATION_PIN_MISMATCH");
    }
    const version = (await readFile(path.join(root,versionFile),"utf8")).trim();
    const evidenceRefs = [];
    for (const file of requiredDetectorInputs(rendering,target)) {
      const execution = await captureCommandExecution(root,{executable:path.resolve(root,binary),argv:["detect","--json","--no-config",file.path],
        toolVersion:version,inputRefs:[...inputRefs,binaryRef,versionRef,file]});
      evidenceRefs.push(await storeEvidence(root,importId,execution));
    }
    return {rule,artifactRef,evidenceRefs};
  }
  if (designRules.some(name => name === rule)) {
    const impeccable = ".agents/skills/impeccable/";
    const instruction = rule === "design-read" ? ".agents/skills/design-taste-frontend/SKILL.md" : impeccable + (rule === "context" ? "SKILL.md" : "reference/" + rule + ".md");
    const instructions = await Promise.all([instruction,impeccable + "reference/craft-floor.md"].map(async file => ({
      ...await evidenceReference(root,file),text:(await readEvidenceBytes(root,file)).toString("utf8"),
    })));
    const input = await designReviewInput(root,packet.format,artifact,renderInputsRef);
    const shape = createDesignReviewSchema({rule,artifactFingerprint:target.artifactFingerprint,renderInputsRef,renderingDigest:rendering.digest,allowedRoutes:[JSON.stringify(routes)]});
    const prompt = "Independently perform the design review. Return a JSON object with one string designReview containing JSON with rule, artifactFingerprint, routes, renderInputsRef, renderingDigest, verdict, findings and notes. Use pass, fail or insufficient-evidence. Each finding has description and disposition. Required identity: " + JSON.stringify({rule,artifactFingerprint:target.artifactFingerprint,routes,renderInputsRef,renderingDigest:rendering.digest});
    const model = capability.assessmentModel ?? packet.model;
    const result = await exchange("design:" + rule,input,inputRefs,instructions,prompt,model);
    const judgment = shape.parse(JSON.parse(result.output.designReview));
    return {rule,artifactRef,judgment,evidenceRefs:[result.executionRef]};
  }
  if (!process.env.ARTICLE_CANDIDATE_ORIGIN) throw new Error("CAPABILITY_UNAVAILABLE: set ARTICLE_CANDIDATE_ORIGIN to the running checkout's local candidate renderer");
  const {origin,canonicalOrigin} = verificationContext({mode:"candidate",origin:process.env.ARTICLE_CANDIDATE_ORIGIN,canonicalOrigin:REPOSITORY_CANONICAL_ORIGIN});
  if (rule === "owner-verifier") {
    const parent = path.join(root,".automation/article-imports/evidence",importId);
    await mkdir(parent,{recursive:true});
    if (path.relative(await realpath(root),await realpath(parent)) !== path.join(".automation","article-imports","evidence",importId)) throw new Error("EVIDENCE_PATH_ESCAPE");
    const temp = await mkdtemp(path.join(parent,"candidate-"));
    try {
      const receipt = path.join(temp,"verifier.json");
      const script = "verify-" + (packet.format === "direct-review" ? "landing" : packet.format) + "-deployment.ts";
      await promisify(execFile)(process.execPath,[require.resolve("tsx/cli"),"--tsconfig",path.resolve(__dirname,"../../../tsconfig.json"),
        path.resolve(__dirname,"../../../scripts",script),"--mode","candidate","--origin",origin,"--canonical-origin",canonicalOrigin,
        "--artifact",packet.artifactPath,"--screenshot-dir",temp,"--attempts","1","--receipt",receipt],{cwd:root,timeout:150000,windowsHide:true,maxBuffer:16*1024*1024});
      const saved = await storeEvidence(root,importId,JSON.parse(await readFile(receipt,"utf8")));
      await readImportVerifierEvidence(root,saved.path,{...target,importId,sourceFingerprint:packet.sourceFingerprint});
      return {rule,artifactRef,verifierRef:saved,renderedRoutes:target.renderedRoutes,artifactFingerprint:target.artifactFingerprint};
    } catch (error) {
      await rm(temp,{recursive:true,force:true});
      throw error;
    }
  }
  const viewport = {width:rule === "mobile" ? 390 : 1440,height:rule === "mobile" ? 844 : 900,reducedMotion:rule === "reduced-motion"};
  const startedAt = new Date().toISOString();
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({viewport:{width:viewport.width,height:viewport.height},reducedMotion:viewport.reducedMotion ? "reduce" : "no-preference"});
    const page = await context.newPage();
    const errors:string[] = [];
    page.on("pageerror",error => errors.push(error.message));
    await page.route("**/*", route => route.request().isNavigationRequest() && new URL(route.request().url()).origin !== origin ? route.abort() : route.continue());
    const screenshots = [];
    for (const route of routes) {
      const expected = new URL(route,origin);
      const response = await page.goto(expected.href,{waitUntil:"domcontentloaded",timeout:30000});
      if (!response?.ok() || page.url() !== expected.href) throw new Error("PRESENTATION_CANDIDATE_UNAVAILABLE");
      if (target.format === "direct-review" && await page.locator('meta[name="artifact-fingerprint"]').getAttribute("content") !== target.artifactFingerprint) {
        throw new Error("PRESENTATION_SERVED_ARTIFACT_MISMATCH");
      }
      await page.locator("main h1").first().waitFor({state:"visible"});
      const layout = await page.evaluate(() => ({overflow:document.documentElement.scrollWidth > window.innerWidth + 1, reduced:matchMedia("(prefers-reduced-motion: reduce)").matches}));
      if (layout.overflow || layout.reduced !== viewport.reducedMotion || errors.length) throw new Error("PRESENTATION_BROWSER_CHECK_FAILED");
      screenshots.push(await storeEvidenceBytes(root,importId,await page.screenshot({fullPage:true}),"png"));
    }
    if (errors.length) throw new Error("PRESENTATION_BROWSER_CHECK_FAILED");
    const executionRef = await storeEvidence(root,importId,{schemaVersion:"ExecutionEvidenceV1",kind:"browser",toolVersion:browser.version(),startedAt,
      completedAt:new Date().toISOString(),inputRefs,outputRefs:[],target:origin,routes,viewport,screenshots,checks:{routesLoaded:true,headingVisible:true,viewport:true,noRuntimeErrors:true}});
    return {rule,artifactRef,evidenceRefs:[executionRef]};
  } finally { await browser.close(); }
}
