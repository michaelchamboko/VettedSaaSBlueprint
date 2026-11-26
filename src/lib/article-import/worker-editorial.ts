// Packet-local MCP server launched only by the refinement worker's private profile.
import { execFile } from "node:child_process";
import { mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import { tmpdir } from "node:os";
import path from "node:path";
import { z } from "zod";
import { presentationTool, presentationOperation } from "./worker-presentation";
import { editorialProse, editorialProsePaths, fingerprintEditorialArtifact } from "../editorial/refinement";
import { contentAssessmentReviewInput, contentAssessmentSchema, validateContentAssessment, validateResearchEvidence, editorialExecutionSchema, editorialPassReviewInput, editorialJudgmentReviewInput, longFormAffiliateJudgmentReviewInput } from "./workflow-evidence";
import { captureStructuredExecution, readEvidenceBytes, evidenceRefSchema, evidenceReference, extractOpenCodeExecution, proseProjectionDigest, storeEvidence, structuredCaptureSelectionSchema, validateExecutionEvidence } from "./execution-evidence";
import { workflowRequirements } from "./workflow-requirements";
import { normalizeOpenCodeVersion, openCodeExportArgs } from "./opencode-runtime";
import { countVisibleArticleWords, isLongFormAffiliateArticle } from "../editorial/article-visible-word-count";
import { LONG_FORM_AFFILIATE_INSTRUCTION, longFormAffiliateReviewSchema } from "./long-form-affiliate";

const formats = { blog: "blog", visibility: "visibility", "direct-review": "landing", "decision-set": "decision" } as const;
export const descriptor = z.object({ root: z.string(), importId: z.string().regex(/^article-[a-f0-9-]{36}$/), key: z.string().regex(/^[a-f0-9]{64}$/),
  format: z.enum(["blog", "visibility", "direct-review", "decision-set", "agent_review_required"]), stage: z.enum(["TRANSFORMING", "REFINING", "VALIDATING"]), model: z.string(), executionExporterId: z.string().min(1).optional(), independentReviewModel: z.string().min(1).optional(), research: evidenceRefSchema.optional(), assessment: evidenceRefSchema.optional(), researchGeneration: z.number().int().optional(), affiliateUrl: z.string().nullable().optional(), artifactPath: z.string().optional(), approvedFingerprint: z.string().optional(), rendering: evidenceRefSchema.optional(), sourceFingerprint: z.string(), requirementRevision: z.string(), executable: z.string() }).strict();
export type Packet = z.infer<typeof descriptor>;
const passes = ["purposeAndStructure", "meaningAndEvidence", "wordingAndRhythm", "independentReview", "finalFidelityReview"] as const;
const file = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,100}\.json$/);
const check = z.object({ artifact: file }).strict();
const exchange = z.object({ pass: z.enum(passes), before: file, after: file.optional(), capture: structuredCaptureSelectionSchema.optional() }).strict();
const compare = z.object({ before: file, after: file, notes: file, manifest: file }).strict();
const assess = z.object({ artifact: file, format: z.enum(["blog", "visibility", "direct-review", "decision-set"]), capture: structuredCaptureSelectionSchema.optional() }).strict();
const descriptions = {
  present: "Run one validation rule or the format owner verifier on the controller-bound candidate. Returns references for the presentation packet.",
  assess: "Independently assess the complete packet editorial artifact against its bound research and workflow requirements. Returns the validated assessment reference.",
  check: "Run the pinned checker on a packet editorial JSON artifact.",
  exchange: "With before only, run a dedicated pass and return its prose projection and executionRef. With before and after, run a distinct judgment and return its judgmentRef. Returns pinned instructionRefs and artifact refs for the manifest.",
  compare: "Validate before, after, notes and EditorialExecutionV1 manifest and return the receipts. All filenames are in the packet editorial directory.",
};
const schemas = { check, exchange, compare, assess, present: presentationTool };
function run(executable: string, args: string[], cwd: string, stdin?: string) {
  return new Promise<string>((resolve, reject) => {
    const child = execFile(executable, args, { cwd, encoding: "utf8", windowsHide: true, timeout: 150000, maxBuffer: 16 * 1024 * 1024,
      env: { ...process.env, PYTHONIOENCODING: "utf-8" } }, (error, stdout, stderr) => {
      if (error) reject(new Error([error.code, error.signal, error.killed ? "terminated" : "", stderr.slice(-1000), stdout.slice(-260)].filter(Boolean).join(" ")));
      else resolve(stdout);
    });
    child.stdin?.on("error", () => {});
    child.stdin?.end(stdin);
  });
}

type Reference = z.infer<typeof evidenceRefSchema>;
async function capturedExchange(packet: Packet, pass: string, prose: Record<string,string>, refs: Reference[],
  instructions: (Reference & {text:string})[], prompt: string, model: string, invoke: typeof run, imageRefs: Reference[] = [],
  capture?: z.infer<typeof structuredCaptureSelectionSchema>) {
  const {root, key, importId} = packet;
  if (capture) {
    if (packet.executionExporterId && capture.exporterId !== packet.executionExporterId) throw new Error("EXECUTION_SELECTION_MISMATCH");
    const execution = await captureStructuredExecution(root, importId, capture);
    const expectedInputRefs = [...refs, ...instructions.map(({path, sha256}) => ({path, sha256}))];
    if (execution.kind !== "structured" || execution.packetId !== key || execution.pass !== pass || execution.inputDigest !== proseProjectionDigest(prose) ||
        JSON.stringify(execution.inputRefs) !== JSON.stringify(expectedInputRefs) || JSON.stringify(execution.instructions) !== JSON.stringify(instructions)) throw new Error("EXECUTION_SELECTION_MISMATCH");
    const output = z.record(z.string(), z.string()).parse(execution.output);
    const executionRef = await storeEvidence(root, importId, execution);
    await validateExecutionEvidence(root, executionRef);
    return { output, executionRef };
  }
  const capabilities = JSON.parse(await readFile(path.join(root, "config/article-workflow-capabilities.json"), "utf8"));
  const version = normalizeOpenCodeVersion(await invoke(packet.executable, ["--version"], root));
  if (version !== capabilities.openCodeVersion || !version.startsWith("2.")) throw new Error("EVIDENCE_UNSUPPORTED");
  const cwd = await mkdtemp(path.join(tmpdir(), "article-editorial-"));
  try {
    await writeFile(path.join(cwd, "opencode.json"), JSON.stringify({ default_agent: "editorial", compaction: { auto: false }, agents: { editorial: { mode: "primary", description: "Dedicated editorial exchange", system: prompt, permissions: [{ action: "*", resource: "*", effect: "deny" }] } } }));
    const envelope = JSON.stringify({packetId: key, pass, prose, digest: proseProjectionDigest(prose), instructions});
    const stdout = await invoke(packet.executable, ["run", "--standalone", "--model", model, "--format", "json", ...imageRefs.flatMap(ref => ["--file",path.resolve(root,ref.path)])], cwd, envelope);
    const events = stdout.trim().split(/\r?\n/).map(line => JSON.parse(line));
    const session = z.string().regex(/^ses_[a-zA-Z0-9]+$/).parse(events[0]?.sessionID);
    if (!events.every(e => e.sessionID === session) || events.at(-1)?.part?.reason !== "stop") throw new Error("EDITORIAL_EXCHANGE_INCOMPLETE");
    const raw = JSON.parse(await invoke(packet.executable, [...openCodeExportArgs(version, session), "--standalone"], cwd));
    const messages = (raw.data ?? raw).messages;
    const [user, assistant] = messages;
    if (messages.length !== 3 || !assistant?.content?.some((p: {type:string}) => p.type === "text")) throw new Error("EDITORIAL_EXCHANGE_INCOMPLETE " + session + " " + messages.map((m: {type:string}) => m.type).join(","));
    const output = z.record(z.string(), z.string()).parse(JSON.parse(assistant.content.find((p: {type: string}) => p.type === "text").text));
    const execution = extractOpenCodeExecution(raw, {version, sessionId: session, userMessageId: user.id, assistantMessageId: assistant.id, packetId: key, pass, input: prose, output, families: capabilities.modelFamilies, instructions, inputRefs: refs, imageRefs});
    if (execution.kind !== "opencode" || execution.providerId + "/" + execution.modelId !== model) throw new Error("EXECUTION_MODEL_MISMATCH");
    const executionRef = await storeEvidence(root, importId, execution);
    return { output, executionRef };
  } finally { await rm(cwd, {recursive: true, force: true}); }
}

export async function editorialOperation(packet: Packet, name: string, args: unknown, invoke: typeof run = run) {
  const { root, importId, key } = packet;
  const base = path.join("build-pack", "editorial", importId, key);

  const scoped = async (name: string) => {
    const relative = path.join(base, file.parse(name));
    if (path.relative(await realpath(root), await realpath(path.join(root, relative))) !== relative) throw new Error("EDITORIAL_PATH_ESCAPE");
    return relative.replaceAll("\\", "/");
  };
  const json = async (name: string) => JSON.parse((await readEvidenceBytes(root, await scoped(name))).toString("utf8"));
  const longFormAffiliate = isLongFormAffiliateArticle({ format: packet.format, approvedAffiliateUrl: packet.affiliateUrl });
  const longFormInstructions = async () => longFormAffiliate ? [{ ...await evidenceReference(root, LONG_FORM_AFFILIATE_INSTRUCTION), text: await readFile(path.join(root, LONG_FORM_AFFILIATE_INSTRUCTION), "utf8") }] : [];
  if (packet.stage === "VALIDATING") {
    if (name !== "present") throw new Error("PRESENTATION_TOOL_REQUIRED");
    return presentationOperation(packet, presentationTool.parse(args), async (pass, prose, refs, instructions, prompt, model, images) =>
      capturedExchange(packet, pass, prose, refs, instructions, prompt, model, invoke, images));
  }
  if (name === "assess") {
    const input = assess.parse(args);
    if (input.capture && packet.stage !== "REFINING") throw new Error("ASSESSMENT_CAPTURE_STAGE_REQUIRED");
    if (!packet.research || (packet.stage === "REFINING" && input.format !== packet.format)) throw new Error("ASSESSMENT_PACKET_BINDING");
    const artifactPath = await scoped(input.artifact);
    const artifact = await json(input.artifact);
    const binding = { ...packet, format: input.format, artifactPath, evidenceRefs: {research: packet.research, ...(packet.assessment && { transformAssessment: packet.assessment })} };
    const research = await validateResearchEvidence(root, packet.research, binding);
    const prose = await contentAssessmentReviewInput(root, artifact, research, packet.research);
    const schemaRevisions = {blog:"BlogPostV1",visibility:"VisibilityPageV1","direct-review":"PageBlueprintV1","decision-set":"DecisionSetV2"};
    const identity = {format: input.format, schemaRevision: schemaRevisions[input.format], artifactFingerprint:fingerprintEditorialArtifact(artifact),
      sourceFingerprint:packet.sourceFingerprint,requirementRevision:packet.requirementRevision,researchRef:packet.research};
    const shape = contentAssessmentSchema.omit({id:true, createdAt:true, importId:true, schemaVersion:true, reviewerExecutionRef:true});
    const visibleCount = longFormAffiliate ? countVisibleArticleWords("direct-review", artifact).wordCount : undefined;
    const accepted = longFormAffiliate && packet.assessment ? contentAssessmentSchema.parse(await readEvidenceBytes(root, packet.assessment.path).then((bytes) => JSON.parse(bytes.toString("utf8")))).longFormAffiliate : undefined;
    const prompt = "Assess every claim and rule independently. Return only a JSON object with a single string field assessment containing JSON in this order: format, schemaRevision, artifactFingerprint, sourceFingerprint, requirementRevision, researchRef, intent, longFormAffiliate when required, claimCoverage, ruleResults, findings. For eligible long-form affiliate work, preserve the accepted five-field buyer brief exactly, record the actual visible word count and give actionable drafting feedback; an out-of-range draft must be reported rather than hidden. Use these identity fields, accepted brief, rules, count, and output schema: " + JSON.stringify({identity, acceptedBrief:accepted?.brief, rules:workflowRequirements, visibleWordCount:visibleCount, approvedAffiliateUrl:longFormAffiliate ? packet.affiliateUrl : undefined, schema:z.toJSONSchema(shape)});
    const capabilities = JSON.parse((await readEvidenceBytes(root, "config/article-workflow-capabilities.json")).toString("utf8"));
    const reviewer = packet.stage === "REFINING" ? packet.model : (capabilities.assessmentModel ?? packet.model);
    if (!input.capture && !Object.hasOwn(capabilities.modelFamilies, reviewer)) throw new Error("CAPABILITY_UNAVAILABLE: configure a registered assessmentModel");
    const assessmentInstructions = await longFormInstructions();
    const {output, executionRef} = await capturedExchange(packet, "content-assessment", prose,
      [await evidenceReference(root,artifactPath),packet.research], assessmentInstructions, prompt, reviewer, invoke, [], input.capture);
    const assessmentRef = await storeEvidence(root, importId, {...shape.parse(JSON.parse(output.assessment)), schemaVersion:"ContentAssessmentV1", id:crypto.randomUUID(), createdAt:new Date().toISOString(), importId, reviewerExecutionRef: executionRef});
    await validateContentAssessment(root, assessmentRef, binding);
    return assessmentRef;
  }
  if (packet.stage !== "REFINING" || packet.format === "agent_review_required") throw new Error("EDITORIAL_STAGE_REQUIRED");
  const format = formats[packet.format];
  if (name === "check") {
    const artifact = await json(check.parse(args).artifact);
    const argv = [".agents/skills/eleanor-editorial/tools/deslop.py", "--text", editorialProse(format, artifact)];
    // The checker uses exit 1 for findings. Preserve its full baseline output.
    return new Promise((resolve, reject) => execFile(process.env.PYTHON || "python", argv,
      { cwd: root, timeout: 120000, maxBuffer: 16 * 1024 * 1024, encoding: "utf8", windowsHide: true, env: { ...process.env, PYTHONIOENCODING: "utf-8" } },
      (error, stdout, stderr) => (error && error.code !== 1) || !stdout.includes("score ") ? reject(new Error("EDITORIAL_CHECKER_FAILED")) : resolve({ stdout, stderr })));
  }
  if (name === "compare") {
    const input = compare.parse(args);
    const manifest = await json(input.manifest);
    if (manifest.importId !== importId || manifest.sourceFingerprint !== packet.sourceFingerprint || manifest.format !== packet.format ||
        manifest.requirementRevision !== packet.requirementRevision) throw new Error("EDITORIAL_MANIFEST_BINDING");
    const passList = editorialExecutionSchema.shape.passes.parse(manifest.passes);
    const evidencePrefix = ".automation/article-imports/evidence/" + importId + "/";
    for (const pass of passList) {
      for (const artifact of [pass.inputRef, pass.outputRef]) {
        if (artifact.path !== await scoped(path.basename(artifact.path))) throw new Error("EDITORIAL_PATH_ESCAPE");
      }
      for (const receipt of [pass.executionRef, pass.judgmentRef]) {
        if (receipt.path !== evidencePrefix + receipt.sha256 + ".json") throw new Error("EDITORIAL_RECEIPT_SCOPE");
      }
    }
    const files = await Promise.all([input.before, input.after, input.notes, input.manifest].map(scoped));
    const receipt = path.join(base, "receipt-" + crypto.randomUUID() + ".json");
    const stdout = await run(process.execPath, [require.resolve("tsx/cli"), "--tsconfig", path.resolve(__dirname, "../../../tsconfig.json"), path.resolve(__dirname, "../../../scripts/compare-editorial-artifacts.ts"),
      format, files[0], files[1], files[2], receipt, files[3], String(packet.researchGeneration ?? 0), packet.affiliateUrl ?? "", packet.research ? JSON.stringify(packet.research) : "", packet.assessment ? JSON.stringify(packet.assessment) : ""], root);
    return { ...JSON.parse(stdout.trim().split(/\r?\n/).at(-1)!), receipt: await evidenceReference(root, receipt) };
  }
  if (name !== "exchange") throw new Error("Unknown tool");
  const input = exchange.parse(args);
  const before = await json(input.before);
  const after = input.after ? await json(input.after) : undefined;
  const refs = [await evidenceReference(root, await scoped(input.before))];
  if (input.after) refs.push(await evidenceReference(root, await scoped(input.after)));
  const pass = input.pass + (after ? "-judgment" : "");
  let prose = after ? editorialJudgmentReviewInput(before, after) : editorialPassReviewInput(before);
  if (after && input.pass === "independentReview" && longFormAffiliate) {
    if (!packet.research || !packet.assessment || !packet.affiliateUrl) throw new Error("LONG_FORM_AFFILIATE_REVIEW_INPUT_REQUIRED");
    prose = await longFormAffiliateJudgmentReviewInput(root, before, after, packet.research, packet.assessment, packet.affiliateUrl);
    refs.push(packet.research, packet.assessment);
  }
  const files = ["SKILL.md","references/principles.md","references/signs-of-ai-writing.md","references/dr-eleanor-hayes.md"];
  if (longFormAffiliate) files.push("references/long-form-affiliate.md");
  if (input.pass === "independentReview") files.push("prompts/cleanse.txt");
  const instructions = await Promise.all(files.map(async name => {
    const relative = ".agents/skills/eleanor-editorial/" + name;
    return { ...await evidenceReference(root, relative), text: await readFile(path.join(root, relative), "utf8") };
  }));
  const instructionRefs = instructions.map(({path, sha256}) => ({path, sha256}));
  const paths = editorialProsePaths(format, before);
  const prompt = after ? "Independently judge " + input.pass + ". Return a JSON object with a single string judgment encoding JSON with fields in order pass, beforeFingerprint, afterFingerprint, coveredPaths, verdict, findings, semanticNotes, meaningPreserved, protectedFieldsPreserved, and longFormAffiliateReview when required. Verdict may be pass, fail, or insufficient-evidence; do not force pass and retain unresolved findings. The eligible independent review must cite exact visible passages for fit, rationale, alternative, and next step, bind the actual count and destination, and report padding, unsupported claims, misleading CTA promises, and unresolved objections. Fingerprints, covered paths, long-form identity, and review schema: " + JSON.stringify({beforeFingerprint:fingerprintEditorialArtifact(before),afterFingerprint:fingerprintEditorialArtifact(after),paths,requiredLongFormReview:longFormAffiliate && input.pass === "independentReview",wordCount:longFormAffiliate ? countVisibleArticleWords("direct-review", after).wordCount : undefined,approvedAffiliateUrl:longFormAffiliate ? packet.affiliateUrl : undefined,longFormSchema:z.toJSONSchema(longFormAffiliateReviewSchema)}) :
    "Perform " + input.pass + " following the attached editorial instructions. Return only a JSON object mapping each editable dotted path to its complete rewritten text. Editable paths: " + JSON.stringify(paths);
  const { output, executionRef } = await capturedExchange(packet, pass, prose, refs, instructions, prompt,
    input.pass === "independentReview" ? (packet.independentReviewModel ?? packet.model) : packet.model, invoke, [], input.capture);
  const judgmentRef = after ? await storeEvidence(root, importId, {...JSON.parse(output.judgment), executionRef}) : undefined;
  return { output, executionRef, judgmentRef, instructionRefs, inputRef: refs[0], outputRef: refs[1] };

}

async function main() {
  const packet = descriptor.parse(JSON.parse(await readFile(process.argv[2], "utf8")));
  const lines = createInterface({ input: process.stdin });
  for await (const line of lines) {
    const message = JSON.parse(line);
    if (message.id === undefined) continue;
    let result, error;
    if (message.method === "initialize") result = { protocolVersion: message.params.protocolVersion, capabilities: { tools: {} }, serverInfo: {name: "editorial", version: "1"} };
    else if (message.method === "ping") result = {};
    else if (message.method === "tools/list") result = { tools: Object.entries(schemas).filter(([name]) => packet.stage === "VALIDATING" ? name === "present" : name !== "present" && (packet.stage === "REFINING" || name === "assess")).map(([name,schema]) => ({name, description: descriptions[name as keyof typeof descriptions], inputSchema: z.toJSONSchema(schema)})) };
    else if (message.method === "tools/call") {
      try { result = { content: [{type: "text", text: JSON.stringify(await editorialOperation(packet, message.params.name, message.params.arguments))}] }; }
      catch (cause) { result = { isError: true, content: [{type: "text", text: cause instanceof Error ? cause.message : "EDITORIAL_TOOL_FAILED"}] }; }
    } else error = {code: -32601, message: "Method not found"};
    process.stdout.write(JSON.stringify({jsonrpc: "2.0", id: message.id, result, error}) + "\n");
  }
}
if (require.main === module) main().catch(() => {process.exitCode = 1;});
