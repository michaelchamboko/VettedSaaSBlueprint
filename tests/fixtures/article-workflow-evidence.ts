/** Synthetic adapter fixtures only. Never use these producers from the production CLI. */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { importPacketId } from "../../src/lib/article-import/packet-binding";
import path from "node:path";
import { artifactProseProjection, contentAssessmentReviewInput, designReviewInput, designRuntimeMaterial, editorialJudgmentReviewInput, editorialPassReviewInput, evidenceReference, longFormAffiliateJudgmentReviewInput, longFormAffiliatePassReviewInput, readEvidence, storeEvidence, type EvidenceRef } from "../../src/lib/article-import/workflow-evidence";
import { captureStructuredExecution, extractOpenCodeExecution, proseProjectionDigest, sha256, storeEvidenceBytes } from "../../src/lib/article-import/execution-evidence";
import { WORKFLOW_REVISION, workflowRequirements } from "../../src/lib/article-import/workflow-requirements";
import { editorialProse, editorialProsePaths, fingerprintEditorialArtifact, EDITORIAL_REVISION } from "../../src/lib/editorial/refinement";
import { importArtifactTarget } from "../../src/lib/article-import/format-validation";
import { captureRenderingInputs, detectorCoreFiles, publicationServingInputPaths, renderingInputsSchema, requiredDetectorInputs } from "../../src/lib/article-import/rendering-inputs";
import { countVisibleArticleWords, isLongFormAffiliateArticle } from "../../src/lib/editorial/article-visible-word-count";
import { ARTICLE_VISUAL_QUALITY_INSTRUCTIONS, MOTION_SITES_REVIEW_SOURCE } from "../../src/lib/article-import/article-visual-quality";
import { candidatePreviewPath } from "../../src/lib/article-import/candidate-route";

const families = { "opencode-go/beam-free": "reflection-beam", "fixture/cleanser": "fixture-cleanser-family" };
const now = "2026-11-03T00:00:00.000Z";
type RecordIdentity = { importId: string; sourceFingerprint: string; researchGeneration?: number; transformation?: { commercialMode?: string; resolvedAffiliateUrl?: string }; heroImage?: unknown; evidenceRefs?: { hero?: EvidenceRef } };
export async function buildWorkflowFixture(root: string, record: RecordIdentity, input: { format: "direct-review" | "blog" | "visibility" | "decision-set"; artifactPath: string; before: unknown; after: unknown; editorialEvidencePath: string; structuredEditorial?: boolean; currentPolicy?: boolean; reuseIndependentContext?: boolean; assessmentStage?: "TRANSFORMING" | "REFINING" }) {
  await mkdir(path.join(root, "config"), { recursive: true });
  const approvedAffiliateUrl = record.transformation?.commercialMode === "approved" ? record.transformation.resolvedAffiliateUrl : undefined;
  const longFormAffiliate = isLongFormAffiliateArticle({ format: input.format, approvedAffiliateUrl });
  const editorialFiles = ["SKILL.md", "references/principles.md", "references/signs-of-ai-writing.md", "references/dr-eleanor-hayes.md", "prompts/cleanse.txt", ...(longFormAffiliate ? ["references/long-form-affiliate.md"] : [])].map((file) => `.agents/skills/eleanor-editorial/${file}`);
  const currentHero = !!record.heroImage && !!record.evidenceRefs?.hero;
  const currentPolicy = currentHero || input.currentPolicy;
  const designFiles = ["SKILL.md", "reference/craft-floor.md", "reference/shape.md", "reference/critique.md", "reference/audit.md", "reference/polish.md"].map((file) => `.agents/skills/impeccable/${file}`).concat(".agents/skills/design-taste-frontend/SKILL.md");
  if (currentHero) designFiles.push(...new Set([".agents/skills/external-article-import/references/design-judgment.md", ".agents/skills/external-article-import/references/hero-imagegen.md", ...ARTICLE_VISUAL_QUALITY_INSTRUCTIONS].filter(file => !designFiles.includes(file))));
  const checkerFile = ".agents/skills/eleanor-editorial/tools/deslop.py", detectorFile = ".agents/skills/impeccable/scripts/bin/windows-x64/impeccable.exe", detectorVersion = ".agents/skills/impeccable/scripts/VERSION";
  const pinFiles = [...editorialFiles, ...designFiles, checkerFile, detectorFile, detectorVersion];
  const pinned = new Map<string, { path: string; sha256: string; text: string }>();
  for (const file of pinFiles) {
    const text = file === detectorVersion ? "0.1.5\n" : `Synthetic pinned fixture: ${file}\n`;
    await mkdir(path.dirname(path.join(root, file)), { recursive: true }); await writeFile(path.join(root, file), text);
    pinned.set(file, { path: file, sha256: sha256(text), text });
  }
  const pinRef = (file: string) => { const pin = pinned.get(file)!; return { path: pin.path, sha256: pin.sha256 }; };
  const exportDirectory = path.join(root, ".fixture-structured-exports");
  const exporter = path.resolve("tests/fixtures/structured-execution-exporter.mjs");
  if (input.structuredEditorial) await mkdir(exportDirectory, { recursive: true });
  await writeFile(path.join(root, "config/article-workflow-capabilities.json"), JSON.stringify({ schemaVersion: "ArticleWorkflowCapabilitiesV1", openCodeVersion: currentPolicy ? "2.2.6" : "1.19.4", modelFamilies: families, files: pinFiles.map(pinRef),
    ...(input.structuredEditorial && { executionExporters: {
      writer: { executable: process.execPath, versionArgs: [exporter, "--version"], toolName: "writer-tool", toolVersion: "fixture-exporter 1", exportArgs: [exporter, "export-map", exportDirectory, "{contextId}", "{exchangeId}"] },
      reviewer: { executable: process.execPath, versionArgs: [exporter, "--version"], toolName: "review-tool", toolVersion: "fixture-exporter 1", exportArgs: [exporter, "export-map", exportDirectory, "{contextId}", "{exchangeId}"] },
    } }) }));
  const common = { id: "synthetic-adapter-fixture", createdAt: now, importId: record.importId, sourceFingerprint: record.sourceFingerprint, requirementRevision: WORKFLOW_REVISION };
  const save = (value: unknown) => storeEvidence(root, record.importId, value);
  const packet = (stage: string) => importPacketId(record, stage, stage === "TRANSFORMING" ? "field-repair" : "targeted-repair");
  const beforeRef = await save(input.before), afterRef = await evidenceReference(root, input.artifactPath);
  let exchangeSequence = 0;
  async function model(pass: string, before: unknown, after: unknown, inputRef: EvidenceRef, outputRef: EvidenceRef, modelId = "writer", reviewOutput?: Record<string, string>, assessmentInput?: Record<string, string>, sessionId = "fixture-session", extraInputRefs: EvidenceRef[] = [], imageRefs: EvidenceRef[] = []) {
    const projection = assessmentInput ?? editorialPassReviewInput(before), result = reviewOutput ?? artifactProseProjection(input.format, after);
    const packetId = packet(pass.startsWith("design:") ? "VALIDATING" : pass === "content-assessment" ? (input.assessmentStage ?? "REFINING") : "REFINING");
    const instructions = (pass.startsWith("design:") || pass === "hero-image-inspection" ? designFiles : editorialFiles).map((file) => pinned.get(file)!);
    if (input.structuredEditorial && !pass.startsWith("design:")) {
      const exchangeId = `exchange-${++exchangeSequence}`;
      const independent = pass === "independentReview" || pass === "independentReview-judgment";
      const exporterId = independent ? "reviewer" : "writer", toolName = independent ? "review-tool" : "writer-tool";
      const source = { schemaVersion: "StructuredExecutionExportV1", exporterId, tool: { name: toolName, version: "fixture-exporter 1" }, contextId: sessionId, exchangeId,
        startedAt: now, completedAt: "2026-11-03T00:00:01.000Z", status: "succeeded", providerId: independent ? "alternate-provider" : "writer-provider", modelId,
        packetId, pass, input: projection, output: result, instructions, inputRefs: [inputRef, ...(pass === "content-assessment" ? [research] : []), ...extraInputRefs, ...instructions.map(({path, sha256}) => ({path, sha256}))], outputRefs: [outputRef] };
      await writeFile(path.join(exportDirectory, `${sessionId}--${exchangeId}.json`), JSON.stringify(source));
      return save(await captureStructuredExecution(root, record.importId, { exporterId, contextId: sessionId, exchangeId }));
    }
    const inputRefs = [inputRef, ...(pass === "content-assessment" ? [research] : []), ...extraInputRefs, ...(pass.startsWith("design:") && renderInputsRef ? [renderInputsRef] : [])];
    if (currentPolicy) {
      const providerModel = modelId === "alternate-reviewer" ? "fixture/cleanser" : "opencode-go/beam-free";
      const [providerID, id] = providerModel.split("/");
      const userFiles = await Promise.all(imageRefs.map(async ref => ({ name: path.basename(ref.path), mime: ref.path.endsWith(".webp") ? "image/webp" : "image/png", source: { type: "inline" }, data: (await readFile(path.join(root, ref.path))).toString("base64") })));
      const raw = { info: { id: sessionId, model: { providerID, id, variant: "default" }, outcome: "succeeded" }, messages: [
        { id: "fixture-user", type: "user", text: JSON.stringify({ packetId, pass, prose: projection, digest: proseProjectionDigest(projection), instructions }), files: userFiles, time: { created: 1 } },
        { id: "fixture-assistant", type: "assistant", model: { providerID, id, variant: "default" }, time: { created: 2, streamed: 3, completed: 4 }, finish: "stop", content: [{ type: "reasoning", text: "private" }, { type: "text", text: JSON.stringify(result) }] },
        { id: "fixture-idle", type: "idle", outcome: "succeeded", time: { created: 5 } },
      ] };
      return save(extractOpenCodeExecution(raw, { version: "2.2.6", sessionId, userMessageId: "fixture-user", assistantMessageId: "fixture-assistant", packetId, pass, input: projection, output: result, families, instructions, inputRefs, outputRefs: [outputRef], imageRefs }));
    }
    return save(extractOpenCodeExecution({ info: { id: sessionId }, messages: [
      { info: { id: "fixture-user", role: "user", sessionID: sessionId }, parts: [{ type: "text", text: JSON.stringify({ packetId, pass, prose: projection, digest: proseProjectionDigest(projection), instructions }) }] },
      { info: { id: "fixture-assistant", role: "assistant", sessionID: sessionId, parentID: "fixture-user", providerID: "opencode-go", modelID: "beam-free", time: { created: 1793664000000, completed: 1793664001000 }, finish: "stop" }, parts: [{ type: "reasoning", text: "Must never be retained." }, { type: "text", text: JSON.stringify(result) }] },
    ] }, { version: "1.19.4", sessionId, userMessageId: "fixture-user", assistantMessageId: "fixture-assistant", packetId, pass, input: projection, output: result, families, instructions, inputRefs, outputRefs: [outputRef] }));
  }
  const researchSnapshot = await save({ source: "Synthetic source supports this scoped fixture claim." });
  const research = await save({ ...common, schemaVersion: "ResearchEvidenceV2", sources: [{ id: "source", url: "https://example.test/source", retrievedAt: now, snapshotRef: researchSnapshot }], claims: [{ id: "claim", text: "Synthetic source supports this scoped fixture claim.", sourceIds: ["source"], excerptLocations: [{ sourceId: "source", quote: "Synthetic source supports this scoped fixture claim." }], limitations: ["Synthetic fixture; no real research."] }], freshness: "Fixed synthetic input for deterministic tests." });
  const format = { "direct-review": "landing", blog: "blog", visibility: "visibility", "decision-set": "decision" } as const;
  const schemaRevision = { "direct-review": "PageBlueprintV1", blog: "BlogPostV1", visibility: "VisibilityPageV1", "decision-set": "DecisionSetV2" }[input.format];
  const paths = editorialProsePaths(format[input.format], input.after);
  const visible = input.format === "direct-review" ? countVisibleArticleWords("direct-review", input.after) : undefined;
  const longForm = longFormAffiliate && visible ? { artifactFingerprint: fingerprintEditorialArtifact(input.after), wordCount: visible.wordCount, approvedAffiliateUrl: approvedAffiliateUrl!, brief: { reader: "A buyer with a specific workflow", purchaseDecision: "Whether this product fits the workflow", strongestEvidencedAdvantage: "The supported workflow advantage", disqualifyingCondition: "The documented limiting condition", affiliateNextStep: "Verify current fit at the approved destination" }, lengthStatus: visible.wordCount < 1800 ? "needs-expansion" as const : visible.wordCount > 2300 ? "needs-reduction" as const : "pass" as const, draftingFeedback: "Synthetic fixture records the measured visible length." } : undefined;
  const assessed = { format: input.format, schemaRevision, artifactFingerprint: fingerprintEditorialArtifact(input.after), sourceFingerprint: record.sourceFingerprint, requirementRevision: WORKFLOW_REVISION, researchRef: research, intent: { audience: "Fixture reader", decision: "Fixture decision", query: "Fixture query", pageType: input.format }, ...(longForm && { longFormAffiliate: longForm }), claimCoverage: [{ claimId: "claim", artifactPaths: [paths[0]] }], ruleResults: workflowRequirements.map((rule) => ({ ruleId: rule.id, revision: WORKFLOW_REVISION, status: "pass", rationale: "Synthetic assessment for pipeline tests.", evidenceRefs: [research] })), findings: [] };
  const reviewInput = await contentAssessmentReviewInput(root, input.after, await readEvidence(root, research), research);
  const assessment = await save({ ...common, schemaVersion: "ContentAssessmentV1", ...assessed, reviewerExecutionRef: await model("content-assessment", input.after, input.after, afterRef, afterRef, "writer", { assessment: JSON.stringify(assessed) }, reviewInput) });
  const passNames = ["purposeAndStructure", "meaningAndEvidence", "wordingAndRhythm", input.structuredEditorial || longFormAffiliate ? "independentReview" : "beamReview", "finalFidelityReview"];
  const passes = [];
  for (const [index, name] of passNames.entries()) {
    const initial = index === 0 ? input.before : input.after, initialRef = index === 0 ? beforeRef : afterRef;
    const citations = visible?.visibleProsePaths.slice(0, 4).map((artifactPath) => ({ artifactPath, quote: String(artifactPath.split(".").reduce<unknown>((value, key) => value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined, input.after)), explanation: "Synthetic exact visible passage citation." }));
    const longFormAffiliateReview = longFormAffiliate && name === "independentReview" && visible && citations?.length === 4 ? { artifactFingerprint: fingerprintEditorialArtifact(input.after), wordCount: visible.wordCount, approvedAffiliateUrl: approvedAffiliateUrl!, passages: { fit: citations[0], rationale: citations[1], alternative: citations[2], nextStep: citations[3] }, checks: { padding: "pass", unsupportedClaims: "pass", misleadingCta: "pass", unresolvedObjections: "pass" }, findings: [] } : undefined;
    const judgment = { pass: name, beforeFingerprint: fingerprintEditorialArtifact(initial), afterFingerprint: fingerprintEditorialArtifact(input.after), coveredPaths: paths, verdict: "pass", findings: [], semanticNotes: "Synthetic scoped judgment for adapter regression tests.", meaningPreserved: true, protectedFieldsPreserved: true, ...(longFormAffiliateReview && { longFormAffiliateReview }) };
    const independentContext = input.reuseIndependentContext ? "fixture-session" : "fixture-review-session";
    const judgmentContext = input.reuseIndependentContext ? "fixture-session" : "fixture-review-judgment-session";
    const judgmentInput = longFormAffiliate && name === "independentReview" ? await longFormAffiliateJudgmentReviewInput(root, initial, input.after, research, assessment, approvedAffiliateUrl!) : editorialJudgmentReviewInput(initial, input.after);
    const judgmentExecution = await model(`${name}-judgment`, initial, input.after, initialRef, afterRef, index === 3 ? "alternate-reviewer" : "writer", { judgment: JSON.stringify(judgment) }, judgmentInput, name === "independentReview" ? judgmentContext : "fixture-session", longFormAffiliate && name === "independentReview" ? [research, assessment] : []);
    const rewriteInput = longFormAffiliate && index < 3 ? await longFormAffiliatePassReviewInput(root, initial, research, assessment, approvedAffiliateUrl!) : undefined;
    passes.push({ name, inputRef: initialRef, outputRef: afterRef, instructionRefs: editorialFiles.map(pinRef), executionRef: await model(name, initial, input.after, initialRef, afterRef, index === 3 ? "alternate-reviewer" : "writer", undefined, rewriteInput, index === 3 ? independentContext : "fixture-session", longFormAffiliate && index < 3 ? [research, assessment] : []), judgmentRef: await save({ ...judgment, executionRef: judgmentExecution }) });
  }
  const checkerExecutionRef = await save({ schemaVersion: "ExecutionEvidenceV1", kind: "command", toolVersion: EDITORIAL_REVISION, startedAt: now, completedAt: now, inputRefs: [afterRef, pinRef(checkerFile)], outputRefs: [], executable: "python", argv: [checkerFile, "--text", editorialProse(format[input.format], input.after)], cwd: root, stdout: "score 5/5 CLEAN", stderr: "", exitCode: 0 });
  const editorial = await save({ ...common, schemaVersion: "EditorialExecutionV1", format: input.format, editorialEvidenceRef: await evidenceReference(root, input.editorialEvidencePath), schemaRevision, eligibleProsePaths: paths, passes, checkerExecutionRef });
  const rules = currentHero
    ? ["hero-image", "design-read", "context", "shape", "critique", "audit", "detect", "polish", "desktop", "mobile", "reduced-motion", "visual-quality"]
    : ["design-read", "context", "shape", "critique", "audit", "detect", "polish", "desktop", "mobile", "reduced-motion"];
  const target = importArtifactTarget(input.format, input.after);
  const detectorFiles = input.format === "direct-review" ? [detectorCoreFiles[input.format], "src/app/landing-page-previews/[slug]/page.tsx"] : [detectorCoreFiles[input.format]];
  for (const file of [...new Set([...detectorFiles, ...publicationServingInputPaths(input.format), "src/styles/fixture-renderer.css", "package-lock.json"])]) {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    const bytes = file.endsWith(".css") ? "body { color: black; background: white; }\n" : file.endsWith(".tsx") ? "export default function Fixture() { return <main>Fixture</main>; }\n" : "{}";
    await writeFile(path.join(root, file), bytes, { flag: "wx" }).catch((error: NodeJS.ErrnoException) => { if (error.code !== "EEXIST") throw error; });
  }
  const renderInputsRef = await captureRenderingInputs(root, record.importId);
  const rendering = renderingInputsSchema.parse(await readEvidence(root, renderInputsRef));
  const detectorInputs = requiredDetectorInputs(rendering, target);
  const designInput = await designReviewInput(root, input.format, input.after, renderInputsRef);
  const reviewRoutes = input.format === "direct-review" ? [candidatePreviewPath(target.slug)] : target.renderedRoutes;
  const runtimeEvidence: Partial<Record<"desktop" | "mobile" | "reduced-motion", EvidenceRef>> = {};
  if (currentHero) {
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1WsAAAAASUVORK5CYII=", "base64");
    for (const rule of ["desktop", "mobile", "reduced-motion"] as const) {
      const viewport = { width: rule === "mobile" ? 390 : 1440, height: rule === "mobile" ? 844 : 900, reducedMotion: rule === "reduced-motion" };
      const screenshots = [];
      const outputRefs = [];
      for (const route of reviewRoutes) {
        const early = await storeEvidenceBytes(root, record.importId, png, "png");
        const settled = await storeEvidenceBytes(root, record.importId, png, "png");
        const effect = {
          target: "[data-reviewed-article-hero]",
          purpose: "Introduce the reviewed media as the article's authored focal moment.",
          properties: ["opacity"],
          samples: viewport.reducedMotion
            ? [{ elapsedMs: 0, values: { opacity: "1" } }, { elapsedMs: 140, values: { opacity: "1" } }, { elapsedMs: 900, values: { opacity: "1" } }]
            : [{ elapsedMs: 0, values: { opacity: "0.9" } }, { elapsedMs: 140, values: { opacity: "0.96" } }, { elapsedMs: 900, values: { opacity: "1" } }],
        };
        outputRefs.push(await save({
          schemaVersion: "ArticleVisualRuntimeV1", format: input.format, route, screenshots: { early, settled }, viewport,
          rects: { main: { x: 20, y: 20, width: viewport.width - 40, height: 1800 }, primaryHeading: { x: 40, y: 80, width: Math.min(760, viewport.width - 80), height: 140 }, bodyCopy: [{ x: 40, y: 300, width: Math.min(680, viewport.width - 80), height: 180 }], primaryMedia: { x: 40, y: 500, width: Math.min(600, viewport.width - 80), height: 300 } },
          typography: { heading: { fontFamily: "Editorial Display", fontSize: "64px", fontWeight: "650", lineHeight: "68px", letterSpacing: "-2px" }, body: { fontFamily: "Editorial Sans", fontSize: "18px", fontWeight: "400", lineHeight: "29px", letterSpacing: "normal" } },
          layout: { documentHeight: 2100, scrollWidth: viewport.width, visibleTextCharacters: 720, horizontalOverflow: false },
          assertions: { headingVisible: true, bodyCopyVisible: true, mediaVisible: true, mediaDecoded: true, motionPreferenceConfirmed: true },
          motion: { effects: [effect], ...(viewport.reducedMotion && { reducedAlternative: "static" }) },
        }));
        screenshots.push(settled);
      }
      runtimeEvidence[rule] = await save({ schemaVersion: "ExecutionEvidenceV1", kind: "browser", toolVersion: "fixture-1", startedAt: now, completedAt: now,
        inputRefs: [afterRef, renderInputsRef], outputRefs, target: "http://127.0.0.1:3000", routes: reviewRoutes, viewport,
        checks: { rendered: true }, screenshots });
    }
  }
  const runtime = currentHero ? await designRuntimeMaterial(root, record.importId, afterRef, renderInputsRef, reviewRoutes, runtimeEvidence as Record<"desktop" | "mobile" | "reduced-motion", EvidenceRef>, "current-v3") : undefined;
  const ruleResults = [];
  for (const rule of rules) {
    if (rule === "hero-image") {
      const heroRef = record.evidenceRefs!.hero!;
      const hero = record.heroImage as { assetRef: EvidenceRef; inspectionRef: EvidenceRef; generationRef: EvidenceRef };
      const generation = await readEvidence(root, hero.generationRef);
      const review = { schemaVersion: "ArticleHeroVisualInspectionV1", artifactFingerprint: target.artifactFingerprint, assetSha256: hero.assetRef.sha256, verdict: "pass", checks: {
        noPeople: { verdict: "pass", observations: ["The attached WebP contains no people or body parts."] },
        brandFit: { verdict: "pass", observations: ["The attached WebP uses the restrained editorial decision-workspace motif."] },
      }, findings: [] };
      const projection = { artifactFingerprint: target.artifactFingerprint, format: input.format, slug: target.slug, imageBinding: JSON.stringify(record.heroImage), imagegenProvenance: JSON.stringify(generation) };
      ruleResults.push({ ruleId: rule, revision: WORKFLOW_REVISION, status: "pass", rationale: "Synthetic retained hero inspection evidence.", evidenceRefs: [await model("hero-image-inspection", input.after, input.after, afterRef, afterRef, "writer", { imageInspection: JSON.stringify(review) }, projection, "fixture-hero-review", [renderInputsRef, heroRef, hero.assetRef, hero.inspectionRef, hero.generationRef], [hero.inspectionRef])] });
      continue;
    }
    if (["design-read", "context", "shape", "critique", "audit", "polish"].includes(rule)) {
      const review = { rule, artifactFingerprint: fingerprintEditorialArtifact(input.after), routes: target.renderedRoutes, renderInputsRef, renderingDigest: rendering.digest, verdict: "pass", findings: [], notes: `Synthetic scoped ${rule} review.` };
      const visual = currentHero && ["critique", "audit", "polish"].includes(rule);
      const projection = visual ? { ...designInput, browserObservations: runtime!.browserObservations } : designInput;
      const extraRefs = visual ? [...Object.values(runtimeEvidence) as EvidenceRef[], ...runtime!.images] : [];
      ruleResults.push({ ruleId: rule, revision: WORKFLOW_REVISION, status: "pass", rationale: `Synthetic ${rule} evidence.`, evidenceRefs: [await model(`design:${rule}`, input.after, input.after, afterRef, afterRef, "writer", { designReview: JSON.stringify({ ...review, routes: currentHero ? reviewRoutes : target.renderedRoutes }) }, projection, `fixture-design-${rule}`, extraRefs, visual ? runtime!.images : [])] });
      continue;
    }
    if (rule === "detect") {
      const evidenceRefs = [];
      for (const scannedRef of detectorInputs) evidenceRefs.push(await save({ schemaVersion: "ExecutionEvidenceV1", kind: "command", toolVersion: "0.1.5", startedAt: now, completedAt: now, inputRefs: [afterRef, renderInputsRef, scannedRef, pinRef(detectorFile), pinRef(detectorVersion)], outputRefs: [], executable: detectorFile, argv: ["detect", "--json", "--no-config", scannedRef.path], cwd: root, stdout: "[]", stderr: "", exitCode: 0 }));
      ruleResults.push({ ruleId: rule, revision: WORKFLOW_REVISION, status: "pass", rationale: "Synthetic captured detector output for the complete required surface.", evidenceRefs });
      continue;
    }
    if (rule === "visual-quality") {
      const pass = (detail: string) => ({ verdict: "pass", observations: [`${detail}; the desktop screenshot and measured rectangle retain the exact location.`, `${detail}; the mobile screenshot confirms the intended responsive reading order.`] });
      const review = { schemaVersion: "ArticleVisualQualityReviewV1", format: input.format, artifactFingerprint: target.artifactFingerprint, routes: reviewRoutes, source: MOTION_SITES_REVIEW_SOURCE, verdict: "pass", checks: {
        firstGlance: pass("The 64px heading and integrated media establish one immediate focal group"), whitespaceAndDensity: pass("Measured spacing separates the lead from the readable body column"), typographicHierarchy: pass("The 64px heading and 18px body remain visibly distinct"), mediaIntegration: pass("The media rectangle shares the opening composition with the lead"), purposefulMotion: pass("Early intermediate and settled opacity frames change without hiding content"), responsiveAdaptation: pass("The 390px mobile capture retains heading-first reading order"), reducedMotion: pass("The reduced-motion capture preserves hierarchy with a static alternative"),
      }, findings: [] };
      const projection = { ...designInput, browserObservations: runtime!.browserObservations, source: JSON.stringify(MOTION_SITES_REVIEW_SOURCE) };
      const extraRefs = [...Object.values(runtimeEvidence) as EvidenceRef[], ...runtime!.runtimeRefs, ...runtime!.images];
      ruleResults.push({ ruleId: rule, revision: WORKFLOW_REVISION, status: "pass", rationale: "Synthetic retained visual-quality review evidence.", evidenceRefs: [await model("design:visual-quality", input.after, input.after, afterRef, afterRef, "writer", { visualQuality: JSON.stringify(review) }, projection, "fixture-visual-quality", extraRefs, runtime!.images)] });
      continue;
    }
    if (currentHero && ["desktop", "mobile", "reduced-motion"].includes(rule)) {
      ruleResults.push({ ruleId: rule, revision: WORKFLOW_REVISION, status: "pass", rationale: `Synthetic ${rule} evidence.`, evidenceRefs: [runtimeEvidence[rule as keyof typeof runtimeEvidence]!] });
      continue;
    }
    const execution = { schemaVersion: "ExecutionEvidenceV1", kind: "browser", toolVersion: "fixture-1", startedAt: now, completedAt: now, inputRefs: [afterRef, renderInputsRef], outputRefs: [], target: "http://127.0.0.1:3000", routes: target.renderedRoutes, viewport: { width: rule === "mobile" ? 390 : 1440, height: 900, reducedMotion: rule === "reduced-motion" }, checks: { rendered: true }, screenshots: [await save({ screenshot: "synthetic browser fixture" })] };
    ruleResults.push({ ruleId: rule, revision: WORKFLOW_REVISION, status: "pass", rationale: `Synthetic ${rule} evidence.`, evidenceRefs: [await save(execution)] });
  }
  const presentation = await save({ ...common, schemaVersion: currentHero ? "WorkflowEvidenceV3" : "WorkflowEvidenceV1", stage: "VALIDATING", packetId: packet("VALIDATING"), artifactRef: afterRef, renderInputsRef, predecessorRefs: currentHero ? [assessment, editorial, record.evidenceRefs!.hero!] : [assessment, editorial], ruleResults });
  return { research, transformAssessment: assessment, assessment, editorial, presentation };
}
