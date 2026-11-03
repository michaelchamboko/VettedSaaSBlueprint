import { z } from "zod";
import path from "node:path";
import { canReuseEditorialEvidence, compareEditorialArtifacts, editorialEvidenceSchema, editorialProse, editorialProsePaths, fingerprintEditorialArtifact, EDITORIAL_REVISION } from "../editorial/refinement";
import { importArtifactTarget, validateImportArtifact } from "./format-validation";
import { CONTENT_FORMATS, WORKFLOW_REVISION, WORKFLOW_SEQUENCE, workflowRequirements, type WorkflowStage } from "./workflow-requirements";
import { evidenceRefSchema, frozenFileSchema, withEvidenceSnapshot, isEvidenceSnapshotActive, hashSchema, readEvidence, readEvidenceBytes, verifyEvidenceRef, validateExecutionEvidence, proseProjectionDigest, sha256, type EvidenceRef, type ExecutionEvidence } from "./execution-evidence";
import { renderingInputsSchema, requiredDetectorInputs, validateRenderingInputs } from "./rendering-inputs";
export { evidenceRefSchema, evidenceReference, readEvidence, storeEvidence } from "./execution-evidence";
export { freezeEvidenceGraph } from "./execution-evidence";
export type { EvidenceRef } from "./execution-evidence";

const nonempty = z.string().trim().min(1);
const common = { id: nonempty, createdAt: z.string().datetime({ offset: true }), importId: z.string().regex(/^article-[0-9a-f-]{36}$/), sourceFingerprint: hashSchema, requirementRevision: z.literal(WORKFLOW_REVISION) };
const formatSchema = z.enum(CONTENT_FORMATS);
export const ruleResultSchema = z.object({ ruleId: nonempty, revision: z.literal(WORKFLOW_REVISION), status: z.enum(["pass", "fail", "not-applicable", "recommendation-not-adopted"]), rationale: nonempty, evidenceRefs: z.array(evidenceRefSchema).min(1) }).strict();
export const workflowEvidenceSchema = z.object({ ...common, schemaVersion: z.literal("WorkflowEvidenceV1"), stage: z.enum(WORKFLOW_SEQUENCE), packetId: hashSchema, artifactRef: evidenceRefSchema, renderInputsRef: evidenceRefSchema, predecessorRefs: z.array(evidenceRefSchema).min(1), ruleResults: z.array(ruleResultSchema).min(1) }).strict();
export const researchEvidenceSchema = z.object({ ...common, schemaVersion: z.literal("ResearchEvidenceV2"), sources: z.array(z.object({ id: nonempty, url: z.string().url(), retrievedAt: z.string().datetime({ offset: true }), snapshotRef: evidenceRefSchema }).strict()).min(1), claims: z.array(z.object({ id: nonempty, text: nonempty, sourceIds: z.array(nonempty).min(1), excerptLocations: z.array(z.object({ sourceId: nonempty, quote: nonempty }).strict()).min(1), limitations: z.array(nonempty), price: z.object({ amount: z.number().nonnegative(), currency: z.string().regex(/^[A-Z]{3}$/), period: nonempty, plan: nonempty, restrictions: z.array(nonempty) }).strict().optional() }).strict()).min(1), freshness: nonempty }).strict();
export const contentAssessmentSchema = z.object({ ...common, schemaVersion: z.literal("ContentAssessmentV1"), format: formatSchema, artifactFingerprint: hashSchema, schemaRevision: nonempty, intent: z.object({ audience: nonempty, decision: nonempty, query: nonempty, pageType: nonempty }).strict(), researchRef: evidenceRefSchema, claimCoverage: z.array(z.object({ claimId: nonempty, artifactPaths: z.array(nonempty).min(1) }).strict()).min(1), ruleResults: z.array(ruleResultSchema).min(1), reviewerExecutionRef: evidenceRefSchema, findings: z.array(z.object({ id: nonempty, artifactPaths: z.array(nonempty).min(1), claimIds: z.array(nonempty), description: nonempty, disposition: z.enum(["resolved", "unresolved", "justified-exception"]), evidenceRefs: z.array(evidenceRefSchema).min(1) }).strict()) }).strict();
const passes = ["purposeAndStructure", "meaningAndEvidence", "wordingAndRhythm", "rivalFamilyCleanse", "finalFidelityReview"] as const;
export const editorialExecutionSchema = z.object({ ...common, schemaVersion: z.literal("EditorialExecutionV1"), format: formatSchema, editorialEvidenceRef: evidenceRefSchema, schemaRevision: nonempty, eligibleProsePaths: z.array(nonempty).min(1), passes: z.array(z.object({ name: z.enum(passes), inputRef: evidenceRefSchema, outputRef: evidenceRefSchema, instructionRefs: z.array(evidenceRefSchema).min(1), executionRef: evidenceRefSchema, judgmentRef: evidenceRefSchema }).strict()).length(5), checkerExecutionRef: evidenceRefSchema }).strict();
export const evidenceRefsSchema = z.object({ research: evidenceRefSchema.optional(), assessment: evidenceRefSchema.optional(), editorial: evidenceRefSchema.optional(), presentation: evidenceRefSchema.optional(), production: evidenceRefSchema.optional() }).strict();
export const terminalEvidenceSchema = z.discriminatedUnion("kind", [
  z.object({ ...common, schemaVersion: z.literal("TerminalEvidenceV1"), kind: z.literal("live"), originImportId: nonempty, sourceRef: evidenceRefSchema, completedAt: z.string().datetime({ offset: true }), artifactRef: evidenceRefSchema, format: formatSchema, evidenceRefs: evidenceRefsSchema, frozenFiles: z.array(frozenFileSchema).min(1), reviewedCommitSha: z.string().regex(/^[a-f0-9]{40}$/), mergeCommitSha: z.string().regex(/^[a-f0-9]{40}$/), mergeEvidenceRef: evidenceRefSchema, deployment: z.object({ deploymentId: nonempty, canonicalUrl: z.string().url(), commitSha: z.string().regex(/^[a-f0-9]{40}$/) }).strict() }).strict(),
  z.object({ ...common, schemaVersion: z.literal("TerminalEvidenceV1"), kind: z.literal("quarantine"), originImportId: nonempty, sourceRef: evidenceRefSchema, completedAt: z.string().datetime({ offset: true }), reasonCode: z.enum(["empty", "unusable", "unsupported-format"]), dispositionEvidenceRef: evidenceRefSchema }).strict(),
  z.object({ ...common, schemaVersion: z.literal("TerminalEvidenceV1"), kind: z.literal("duplicate"), originImportId: nonempty, sourceRef: evidenceRefSchema, completedAt: z.string().datetime({ offset: true }), originTerminalRef: evidenceRefSchema }).strict(),
]);
export const diagnosisSchema = z.object({ ...common, schemaVersion: z.literal("DiagnosisV1"), stage: z.enum(WORKFLOW_SEQUENCE), failedSubmissionDigest: hashSchema, failureCode: nonempty, cause: nonempty, attemptedRecoveryRefs: z.array(evidenceRefSchema).min(1), remedyEvidenceRefs: z.array(evidenceRefSchema).min(1), replacementSubmissionDigest: hashSchema, consumedAt: z.string().datetime({ offset: true }).optional() }).strict();
export type EvidenceBinding = { importId: string; sourceFingerprint: string; format: string; artifactPath?: string; requirementRevision?: string };
type Bound = { importId: string; sourceFingerprint: string; requirementRevision: string };
function assertBinding(value: Bound, binding: EvidenceBinding): void {
  if (value.importId !== binding.importId || value.sourceFingerprint !== binding.sourceFingerprint || value.requirementRevision !== (binding.requirementRevision ?? WORKFLOW_REVISION)) throw new Error("EVIDENCE_BINDING_MISMATCH");
}
function unique(values: string[]): void { if (new Set(values).size !== values.length) throw new Error("EVIDENCE_DUPLICATE_ID"); }
const ELEANOR_ROOT = ".agents/skills/eleanor-editorial/";
const IMPECCABLE_ROOT = ".agents/skills/impeccable/";
const requiredEditorialInstructions = ["SKILL.md", "references/principles.md", "references/signs-of-ai-writing.md", "references/dr-eleanor-hayes.md"].map((item) => ELEANOR_ROOT + item);
async function pinnedInput(root: string, execution: ExecutionEvidence, file: string): Promise<EvidenceRef> {
  const manifest = z.object({ files: z.array(evidenceRefSchema) }).passthrough().parse(JSON.parse((await readEvidenceBytes(root, "config/article-workflow-capabilities.json")).toString("utf8")));
  const refs = manifest.files.filter((ref) => ref.path === file);
  if (refs.length !== 1 || !execution.inputRefs.some((ref) => ref.path === file && ref.sha256 === refs[0].sha256)) throw new Error(`EXECUTION_PINNED_INPUT_REQUIRED:${file}`);
  await verifyEvidenceRef(root, refs[0]);
  return refs[0];
}
async function pinnedInstructions(root: string, execution: ExecutionEvidence, required: string[], declared?: EvidenceRef[]): Promise<void> {
  if (execution.kind !== "opencode") throw new Error("EXECUTION_INSTRUCTION_MISMATCH");
  const captured = execution.instructions.map(({ path, sha256 }) => ({ path, sha256 }));
  if (declared && (declared.length !== captured.length || declared.some((ref) => !captured.some((item) => item.path === ref.path && item.sha256 === ref.sha256)))) throw new Error("EXECUTION_INSTRUCTION_MISMATCH");
  for (const file of required) {
    const pin = await pinnedInput(root, execution, file);
    if (!execution.instructions.some((item) => item.path === pin.path && item.sha256 === pin.sha256 && sha256(item.text) === pin.sha256)) throw new Error(`EXECUTION_INSTRUCTION_REQUIRED:${file}`);
  }
}
function assertPacket(packetId: string, binding: EvidenceBinding, stage: string): void {
  const strategies = stage === "REFINING" || stage === "VALIDATING" ? ["targeted-repair", "fresh-rewrite", "fresh-topic"] : ["field-repair", "reconstruct-schema", "reclassify"];
  if (!strategies.some((strategy) => sha256(`${binding.importId}:${binding.sourceFingerprint}:${stage}:${strategy}`) === packetId)) throw new Error("EXECUTION_PACKET_MISMATCH");
}
const editorialFormats = { "direct-review": "landing", blog: "blog", visibility: "visibility", "decision-set": "decision" } as const;
const revisions = { "direct-review": "PageBlueprintV1", blog: "BlogPostV1", visibility: "VisibilityPageV1", "decision-set": "DecisionSetV2" } as const;
function atPath(value: unknown, dotted: string): unknown {
  return dotted.split(".").reduce<unknown>((current, key) => current !== null && typeof current === "object" ? (current as Record<string, unknown>)[key] : undefined, value);
}
export function artifactProseProjection(format: string, artifact: unknown): Record<string, string> {
  const selected = editorialFormats[format as keyof typeof editorialFormats];
  if (!selected) throw new Error("EVIDENCE_FORMAT_UNSUPPORTED");
  return Object.fromEntries(editorialProsePaths(selected, artifact).map((key) => [key, z.string().parse(atPath(artifact, key))]));
}
/** Assess the whole page contract and retained sources, not only editorially editable prose. */
export async function contentAssessmentReviewInput(root: string, artifact: unknown, researchEvidence: unknown, researchRef: EvidenceRef): Promise<Record<string, string>> {
  const research = researchEvidenceSchema.parse(researchEvidence);
  const sourceSnapshots = [];
  for (const source of research.sources) {
    await verifyEvidenceRef(root, source.snapshotRef);
    sourceSnapshots.push({ sourceId: source.id, ref: source.snapshotRef, text: (await readEvidenceBytes(root, source.snapshotRef.path)).toString("utf8") });
  }
  return { artifact: JSON.stringify(artifact), research: JSON.stringify(research), researchRef: JSON.stringify(evidenceRefSchema.parse(researchRef)), sourceSnapshots: JSON.stringify(sourceSnapshots) };
}
export function editorialPassReviewInput(before: unknown): Record<string, string> {
  return { beforeArtifact: JSON.stringify(before) };
}
export function editorialJudgmentReviewInput(before: unknown, after: unknown): Record<string, string> {
  return { beforeArtifact: JSON.stringify(before), afterArtifact: JSON.stringify(after) };
}
async function designInputFromManifest(root: string, artifact: unknown, renderInputsRef: EvidenceRef, rendering: z.infer<typeof renderingInputsSchema>, target: ReturnType<typeof importArtifactTarget>): Promise<Record<string, string>> {
  const rendererSources = [];
  for (const ref of requiredDetectorInputs(rendering, target)) {
    const bytes = await readEvidenceBytes(root, ref.path);
    if (sha256(bytes) !== ref.sha256) throw new Error("PRESENTATION_RENDER_INPUT_CHANGED");
    rendererSources.push({ ref, text: bytes.toString("utf8") });
  }
  return { artifact: JSON.stringify(artifact), renderInputsRef: JSON.stringify(renderInputsRef), renderingManifest: JSON.stringify(rendering), renderedRoutes: JSON.stringify(target.renderedRoutes), rendererSources: JSON.stringify(rendererSources) };
}
/** Bind design judgments to the exact render context shown in the actual exchange. */
export async function designReviewInput(root: string, format: string, artifact: unknown, renderInputsRef: EvidenceRef): Promise<Record<string, string>> {
  const rendering = await validateRenderingInputs(root, renderInputsRef, { historical: isEvidenceSnapshotActive() });
  return designInputFromManifest(root, artifact, renderInputsRef, rendering, importArtifactTarget(formatSchema.parse(format), artifact));
}
async function artifactFor(root: string, binding: EvidenceBinding): Promise<unknown> {
  if (!binding.artifactPath) throw new Error("EVIDENCE_ARTIFACT_REQUIRED");
  const value: unknown = JSON.parse((await readEvidenceBytes(root, binding.artifactPath)).toString("utf8"));
  validateImportArtifact(formatSchema.parse(binding.format), value);
  return value;
}
export async function validateResearchEvidence(root: string, ref: EvidenceRef, binding: EvidenceBinding) {
  const value = researchEvidenceSchema.parse(await readEvidence(root, ref));
  assertBinding(value, binding); unique(value.sources.map((x) => x.id)); unique(value.claims.map((x) => x.id));
  const snapshots = new Map<string, string>();
  for (const source of value.sources) {
    await verifyEvidenceRef(root, source.snapshotRef);
    snapshots.set(source.id, (await readEvidenceBytes(root, source.snapshotRef.path)).toString("utf8"));
    if (Date.parse(source.retrievedAt) > Date.parse(value.createdAt)) throw new Error("RESEARCH_RETRIEVAL_TIME_INVALID");
  }
  for (const claim of value.claims) {
    if (claim.sourceIds.some((id) => !snapshots.has(id))) throw new Error("RESEARCH_SOURCE_MISSING");
    for (const excerpt of claim.excerptLocations) if (!claim.sourceIds.includes(excerpt.sourceId) || !snapshots.get(excerpt.sourceId)?.includes(excerpt.quote)) throw new Error("RESEARCH_EXCERPT_MISMATCH");
    if (/\b(?:starts? at|costs?|priced? at)\s*\/|(?:\$|£|€)\s*\//i.test(claim.text)) throw new Error("RESEARCH_PRICE_INVALID");
    if (/(?:\$|£|€)\s*\d|\b\d+(?:\.\d+)?\s*(?:USD|GBP|EUR)\b/i.test(claim.text) && !claim.price) throw new Error("RESEARCH_PRICE_CONTEXT_REQUIRED");
  }
  return value;
}
export async function validateContentAssessment(root: string, ref: EvidenceRef, binding: EvidenceBinding) {
  const value = contentAssessmentSchema.parse(await readEvidence(root, ref));
  assertBinding(value, binding);
  const artifact = await artifactFor(root, binding);
  if (value.format !== binding.format || value.artifactFingerprint !== fingerprintEditorialArtifact(artifact) || value.schemaRevision !== revisions[value.format]) throw new Error("ASSESSMENT_ARTIFACT_MISMATCH");
  const research = await validateResearchEvidence(root, value.researchRef, binding);
  unique(value.ruleResults.map((x) => x.ruleId));
  if (value.ruleResults.length !== workflowRequirements.length) throw new Error("ASSESSMENT_RULE_MISSING");
  for (const requirement of workflowRequirements) {
    const result = value.ruleResults.find((x) => x.ruleId === requirement.id);
    if (!result || result.status === "fail" || result.status === "not-applicable" || (requirement.strength === "required" && result.status !== "pass")) throw new Error(`ASSESSMENT_RULE_FAILED:${requirement.id}`);
    for (const evidence of result.evidenceRefs) await verifyEvidenceRef(root, evidence);
  }
  for (const coverage of value.claimCoverage) {
    if (!research.claims.some((claim) => claim.id === coverage.claimId) || coverage.artifactPaths.some((p) => typeof atPath(artifact, p) !== "string")) throw new Error("ASSESSMENT_CLAIM_MISMATCH");
  }
  for (const finding of value.findings) {
    if (finding.disposition === "unresolved") throw new Error("ASSESSMENT_UNRESOLVED_FINDING");
    if (finding.artifactPaths.some((p) => atPath(artifact, p) === undefined)) throw new Error("ASSESSMENT_SCOPE_MISMATCH");
    for (const evidence of finding.evidenceRefs) await verifyEvidenceRef(root, evidence);
  }
  const execution = await validateExecutionEvidence(root, value.reviewerExecutionRef);
  const reviewInput = await contentAssessmentReviewInput(root, artifact, research, value.researchRef);
  if (execution.kind !== "opencode" || execution.pass !== "content-assessment" || proseProjectionDigest(execution.input) !== proseProjectionDigest(reviewInput) || !execution.inputRefs.some((ref) => ref.path === value.researchRef.path && ref.sha256 === value.researchRef.sha256)) throw new Error("ASSESSMENT_EXECUTION_MISMATCH");
  const assessed = { format: value.format, schemaRevision: value.schemaRevision, artifactFingerprint: value.artifactFingerprint, sourceFingerprint: value.sourceFingerprint, requirementRevision: value.requirementRevision, researchRef: value.researchRef, intent: value.intent, claimCoverage: value.claimCoverage, ruleResults: value.ruleResults, findings: value.findings };
  if (execution.output.assessment !== JSON.stringify(assessed)) throw new Error("ASSESSMENT_JUDGMENT_MISMATCH");
  // Final assessments are repeated in REFINING; either authentic stage packet is valid.
  try { assertPacket(execution.packetId, binding, "TRANSFORMING"); } catch { assertPacket(execution.packetId, binding, "REFINING"); }
  return value;
}
export async function validateEditorialExecution(root: string, ref: EvidenceRef, binding: EvidenceBinding) {
  const value = editorialExecutionSchema.parse(await readEvidence(root, ref));
  assertBinding(value, binding);
  const artifact = await artifactFor(root, binding), format = editorialFormats[value.format];
  if (value.format !== binding.format || value.schemaRevision !== revisions[value.format]) throw new Error("EDITORIAL_FORMAT_MISMATCH");
  const receipt = editorialEvidenceSchema.parse(await readEvidence(root, value.editorialEvidenceRef));
  if (!canReuseEditorialEvidence(receipt, format, artifact)) throw new Error("EDITORIAL_RECEIPT_MISMATCH");
  const paths = editorialProsePaths(format, artifact);
  if (JSON.stringify(paths) !== JSON.stringify(value.eligibleProsePaths)) throw new Error("EDITORIAL_PROSE_COVERAGE");
  let previous: string | undefined; let writerFamily: string | undefined;
  for (const [index, pass] of value.passes.entries()) {
    if (pass.name !== passes[index] || (previous && previous !== pass.inputRef.sha256)) throw new Error("EDITORIAL_PASS_ORDER");
    const before = await readEvidence(root, pass.inputRef), after = await readEvidence(root, pass.outputRef);
    if (index === 0 && receipt.beforeFingerprint !== fingerprintEditorialArtifact(before)) throw new Error("EDITORIAL_INITIAL_ARTIFACT_MISMATCH");
    compareEditorialArtifacts(format, before, after);
    const execution = await validateExecutionEvidence(root, pass.executionRef);
    if (execution.kind !== "opencode" || execution.pass !== pass.name || proseProjectionDigest(execution.input) !== proseProjectionDigest(editorialPassReviewInput(before)) || proseProjectionDigest(execution.output) !== proseProjectionDigest(artifactProseProjection(value.format, after))) throw new Error("EDITORIAL_EXECUTION_MISMATCH");
    assertPacket(execution.packetId, binding, "REFINING");
    await pinnedInstructions(root, execution, [...requiredEditorialInstructions, ...(pass.name === "rivalFamilyCleanse" ? [ELEANOR_ROOT + "prompts/cleanse.txt"] : [])], pass.instructionRefs);
    if (index === 0) writerFamily = execution.family;
    if (index < 3 && execution.family !== writerFamily) throw new Error("EDITORIAL_WRITER_FAMILY_MISMATCH");
    if (index === 3 && execution.family === writerFamily) throw new Error("EDITORIAL_CLEANSE_FAMILY_MISMATCH");
    for (const instruction of pass.instructionRefs) await verifyEvidenceRef(root, instruction);
    const judgment = z.object({ pass: z.literal(pass.name), beforeFingerprint: z.literal(fingerprintEditorialArtifact(before)), afterFingerprint: z.literal(fingerprintEditorialArtifact(after)), coveredPaths: z.array(nonempty), verdict: z.literal("pass"), findings: z.array(z.object({ description: nonempty, disposition: z.literal("resolved") }).strict()), semanticNotes: nonempty, meaningPreserved: z.literal(true), protectedFieldsPreserved: z.literal(true), executionRef: evidenceRefSchema }).strict().parse(await readEvidence(root, pass.judgmentRef));
    if (JSON.stringify(judgment.coveredPaths) !== JSON.stringify(paths)) throw new Error("EDITORIAL_JUDGMENT_COVERAGE");
    const judgmentExecution = await validateExecutionEvidence(root, judgment.executionRef);
    const judgmentText = { ...judgment, executionRef: undefined };
    if (judgmentExecution.kind !== "opencode" || judgmentExecution.pass !== `${pass.name}-judgment` || proseProjectionDigest(judgmentExecution.input) !== proseProjectionDigest(editorialJudgmentReviewInput(before, after)) || judgmentExecution.output.judgment !== JSON.stringify(judgmentText)) throw new Error("EDITORIAL_JUDGMENT_EXECUTION_MISMATCH");
    assertPacket(judgmentExecution.packetId, binding, "REFINING");
    await pinnedInstructions(root, judgmentExecution, requiredEditorialInstructions);
    previous = pass.outputRef.sha256;
    if (index === 4 && fingerprintEditorialArtifact(after) !== fingerprintEditorialArtifact(artifact)) throw new Error("EDITORIAL_FINAL_ARTIFACT_MISMATCH");
  }
  const checker = await validateExecutionEvidence(root, value.checkerExecutionRef);
  if (checker.kind !== "command" || !/score\s+5\/5\s+CLEAN/.test(checker.stdout) || !checker.inputRefs.some((r) => r.sha256 === previous)) throw new Error("EDITORIAL_CHECKER_FAILED");
  const checkerScript = ELEANOR_ROOT + "tools/deslop.py";
  if (!/^python(?:3(?:\.\d+)?)?(?:\.exe)?$/i.test(checker.executable.replaceAll("\\", "/").split("/").at(-1) ?? "") || checker.toolVersion !== EDITORIAL_REVISION || path.resolve(checker.cwd) !== path.resolve(root) || JSON.stringify(checker.argv) !== JSON.stringify([checkerScript, "--text", editorialProse(format, artifact)])) throw new Error("EDITORIAL_CHECKER_COMMAND_MISMATCH");
  await pinnedInput(root, checker, checkerScript);
  return value;
}

export type WorkflowEvidenceRecord = EvidenceBinding & { stage: string; schemaVersion?: string; workflowVersion?: number; evidenceRefs?: z.infer<typeof evidenceRefsSchema>; terminalRef?: EvidenceRef; contentApproval?: { artifactPath: string }; release?: { commitSha: string; deploymentId: string; canonicalUrl: string }; sourceRef?: EvidenceRef };
export type WorkflowEvaluation = { ok: boolean; diagnostics: string[]; earliestRequiredStage?: WorkflowStage; validatedRefs: EvidenceRef[] };
export async function evaluateWorkflowEvidence(record: WorkflowEvidenceRecord, context: { root: string; throughStage?: string; artifactPath?: string }, mode: "historical-terminal" | "current-transition" | "duplicate-reuse" = "current-transition"): Promise<WorkflowEvaluation> {
  const validatedRefs: EvidenceRef[] = [];
  let required: WorkflowStage = "INGESTING";
  try {
    if (record.requirementRevision !== WORKFLOW_REVISION || record.workflowVersion !== 2) throw new Error("LEGACY_UPGRADE_REQUIRED");
    if (mode === "historical-terminal") {
      if (!record.terminalRef) throw new Error("TERMINAL_EVIDENCE_REQUIRED");
      await validateTerminalEvidence(context.root, record.terminalRef, record);
      return { ok: true, diagnostics: [], validatedRefs: [record.terminalRef] };
    }
    const through = context.throughStage ?? record.stage;
    const rank = WORKFLOW_SEQUENCE.indexOf(through as WorkflowStage);
    if (rank < 0) throw new Error("WORKFLOW_STAGE_UNSUPPORTED");
    const binding = { ...record, artifactPath: context.artifactPath ?? record.artifactPath ?? record.contentApproval?.artifactPath };
    const need = async (key: keyof NonNullable<WorkflowEvidenceRecord["evidenceRefs"]>, stage: WorkflowStage, validate: (ref: EvidenceRef) => Promise<unknown>) => {
      required = stage;
      const ref = record.evidenceRefs?.[key]; if (!ref) throw new Error(`WORKFLOW_EVIDENCE_REQUIRED:${key}`);
      await validate(ref); validatedRefs.push(ref);
    };
    if (rank >= 2) await need("research", "RESEARCHING", (ref) => validateResearchEvidence(context.root, ref, binding));
    if (rank >= 3) await need("assessment", "TRANSFORMING", (ref) => validateContentAssessment(context.root, ref, binding));
    if (rank >= 4) await need("editorial", "REFINING", (ref) => validateEditorialExecution(context.root, ref, binding));
    if (rank >= 5) await need("presentation", "VALIDATING", async (ref) => {
      const presentation = await validatePresentationEvidence(context.root, ref, binding);
      for (const predecessor of [record.evidenceRefs?.assessment, record.evidenceRefs?.editorial]) {
        if (!predecessor || !presentation.predecessorRefs.some((item) => item.sha256 === predecessor.sha256 && item.path === predecessor.path)) throw new Error("PRESENTATION_PREDECESSOR_MISMATCH");
      }
      return presentation;
    });
    if (rank >= 7) await need("production", "VERIFYING", async (ref) => {
      if (!record.release) throw new Error("RELEASE_EVIDENCE_REQUIRED");
      const { assertProductionVerifierEvidence } = await import("./verification-evidence");
      const target = importArtifactTarget(formatSchema.parse(binding.format), await artifactFor(context.root, binding));
      return assertProductionVerifierEvidence(await readEvidence(context.root, ref), { target, deployment: record.release, importId: record.importId, sourceFingerprint: record.sourceFingerprint });
    });
    return { ok: true, diagnostics: [], validatedRefs };
  } catch (error) {
    return { ok: false, diagnostics: [error instanceof Error ? error.message : String(error)], earliestRequiredStage: required, validatedRefs };
  }
}
export async function validatePresentationEvidence(root: string, ref: EvidenceRef, binding: EvidenceBinding) {
  const value = workflowEvidenceSchema.parse(await readEvidence(root, ref)); assertBinding(value, binding);
  if (value.stage !== "VALIDATING") throw new Error("PRESENTATION_STAGE_MISMATCH");
  assertPacket(value.packetId, binding, "VALIDATING");
  const artifact = await artifactFor(root, binding);
  const target = importArtifactTarget(formatSchema.parse(binding.format), artifact);
  const rendering = await validateRenderingInputs(root, value.renderInputsRef, { historical: isEvidenceSnapshotActive() });
  const designInput = await designInputFromManifest(root, artifact, value.renderInputsRef, rendering, target);
  const detectorInputs = requiredDetectorInputs(rendering, target);
  const detectedFiles = new Set<string>();
  if (fingerprintEditorialArtifact(await readEvidence(root, value.artifactRef)) !== fingerprintEditorialArtifact(artifact)) throw new Error("PRESENTATION_ARTIFACT_MISMATCH");
  for (const predecessor of value.predecessorRefs) await verifyEvidenceRef(root, predecessor);
  const rules = ["design-read", "context", "shape", "critique", "audit", "detect", "polish", "desktop", "mobile", "reduced-motion"];
  unique(value.ruleResults.map((r) => r.ruleId));
  if (value.ruleResults.length !== rules.length) throw new Error("PRESENTATION_RULE_MISSING");
  for (const rule of rules) {
    const result = value.ruleResults.find((r) => r.ruleId === rule);
    if (!result || result.status !== "pass") throw new Error(`PRESENTATION_RULE_FAILED:${rule}`);
    for (const evidence of result.evidenceRefs) {
      const execution = await validateExecutionEvidence(root, evidence);
      if (!execution.inputRefs.some((ref) => ref.path === value.renderInputsRef.path && ref.sha256 === value.renderInputsRef.sha256)) throw new Error("PRESENTATION_RENDER_INPUT_BINDING_MISMATCH");
      let boundInput = false;
      for (const input of execution.inputRefs) {
        try { if (fingerprintEditorialArtifact(await readEvidence(root, input)) === fingerprintEditorialArtifact(artifact)) boundInput = true; } catch { /* Non-JSON command input is not artifact proof. */ }
      }
      if (!boundInput) throw new Error("PRESENTATION_EXECUTION_ARTIFACT_MISMATCH");
      if (["desktop", "mobile", "reduced-motion"].includes(rule) && execution.kind !== "browser") throw new Error("PRESENTATION_BROWSER_REQUIRED");
      if (rule === "detect" && execution.kind !== "command") throw new Error("PRESENTATION_DETECTOR_REQUIRED");
      if (rule === "detect" && execution.kind === "command") {
        const binary = IMPECCABLE_ROOT + "scripts/bin/windows-x64/impeccable.exe";
        const versionFile = IMPECCABLE_ROOT + "scripts/VERSION";
        await pinnedInput(root, execution, binary); await pinnedInput(root, execution, versionFile);
        const version = (await readEvidenceBytes(root, versionFile)).toString("utf8").trim();
        const scannedFile = execution.argv[3];
        if (version !== "0.1.5" || execution.toolVersion !== version || path.resolve(root, execution.executable) !== path.resolve(root, binary) || path.resolve(execution.cwd) !== path.resolve(root) || execution.argv.length !== 4 || execution.argv.slice(0, 3).join(" ") !== "detect --json --no-config" || !scannedFile || !execution.inputRefs.some((ref) => ref.path === scannedFile && rendering.files.some((item) => item.path === ref.path && item.sha256 === ref.sha256))) throw new Error("PRESENTATION_DETECTOR_COMMAND_MISMATCH");
        if (!detectorInputs.some((ref) => ref.path === scannedFile && execution.inputRefs.some((item) => item.path === ref.path && item.sha256 === ref.sha256))) throw new Error(`PRESENTATION_DETECTOR_TARGET_OUTSIDE_SCOPE:${scannedFile}`);
        // The pinned engine emits an array; [] is the unambiguous clean result.
        z.array(z.unknown()).length(0).parse(JSON.parse(execution.stdout));
        detectedFiles.add(scannedFile);
      }
      if (["design-read", "context", "shape", "critique", "audit", "polish"].includes(rule)) {
        if (execution.kind !== "opencode" || execution.pass !== `design:${rule}` || proseProjectionDigest(execution.input) !== proseProjectionDigest(designInput)) throw new Error("PRESENTATION_JUDGMENT_REQUIRED");
        assertPacket(execution.packetId, binding, "VALIDATING");
        const reference = rule === "design-read" ? ".agents/skills/design-taste-frontend/SKILL.md" : rule === "context" ? IMPECCABLE_ROOT + "SKILL.md" : IMPECCABLE_ROOT + `reference/${rule}.md`;
        await pinnedInstructions(root, execution, [reference, IMPECCABLE_ROOT + "reference/craft-floor.md"]);
        z.object({ rule: z.literal(rule), artifactFingerprint: z.literal(fingerprintEditorialArtifact(artifact)), routes: z.array(z.string()), renderInputsRef: z.object({ path: z.literal(value.renderInputsRef.path), sha256: z.literal(value.renderInputsRef.sha256) }).strict(), renderingDigest: z.literal(rendering.digest), verdict: z.literal("pass"), findings: z.array(z.object({ description: nonempty, disposition: z.literal("resolved") }).strict()), notes: nonempty }).strict().refine((judgment) => JSON.stringify(judgment.routes) === JSON.stringify(target.renderedRoutes), "PRESENTATION_JUDGMENT_ROUTES_MISMATCH").parse(JSON.parse(execution.output.designReview ?? "null"));
      }
      if (execution.kind === "browser") {
        if (JSON.stringify(execution.routes) !== JSON.stringify(target.renderedRoutes)) throw new Error("PRESENTATION_ROUTES_MISMATCH");
        if ((rule === "mobile" && execution.viewport.width > 767) || (rule === "desktop" && execution.viewport.width < 1024) || (rule === "reduced-motion" && !execution.viewport.reducedMotion)) throw new Error("PRESENTATION_VIEWPORT_MISMATCH");
      }
    }
  }
  if (detectorInputs.some((ref) => !detectedFiles.has(ref.path))) throw new Error("PRESENTATION_DETECTOR_COVERAGE_INCOMPLETE");
  return value;
}
export async function validateTerminalEvidence(root: string, ref: EvidenceRef, binding: EvidenceBinding, seen = new Set<string>()): Promise<void> {
  if (seen.has(ref.sha256) || seen.size >= 16) throw new Error("TERMINAL_REFERENCE_CYCLE"); seen.add(ref.sha256);
  const value = terminalEvidenceSchema.parse(await readEvidence(root, ref)); assertBinding(value, binding);
  await verifyEvidenceRef(root, value.sourceRef);
  if (value.sourceRef.sha256 !== value.sourceFingerprint) throw new Error("TERMINAL_SOURCE_MISMATCH");
  if (value.kind === "quarantine") {
    z.object({ sourceFingerprint: z.literal(value.sourceFingerprint), reasonCode: z.literal(value.reasonCode), reason: nonempty }).strict().parse(await readEvidence(root, value.dispositionEvidenceRef)); return;
  }
  if (value.kind === "duplicate") {
    const origin = terminalEvidenceSchema.parse(await readEvidence(root, value.originTerminalRef));
    if (origin.importId !== value.originImportId || origin.sourceFingerprint !== value.sourceFingerprint || origin.kind !== "live") throw new Error("DUPLICATE_ORIGIN_MISMATCH");
    return validateTerminalEvidence(root, value.originTerminalRef, { ...binding, importId: origin.importId }, seen);
  }
  if (value.mergeCommitSha !== value.deployment.commitSha) throw new Error("TERMINAL_COMMIT_MISMATCH");
  z.object({ reviewedCommitSha: z.literal(value.reviewedCommitSha), mergeCommitSha: z.literal(value.mergeCommitSha), pullRequestUrl: z.string().url(), evidenceUrl: z.string().url() }).strict().parse(await readEvidence(root, value.mergeEvidenceRef));
  const result = await withEvidenceSnapshot(value.frozenFiles, () => evaluateWorkflowEvidence({ ...value, workflowVersion: 2, stage: "LIVE", artifactPath: value.artifactRef.path, release: value.deployment }, { root, throughStage: "LIVE", artifactPath: value.artifactRef.path }));
  if (!result.ok) throw new Error(result.diagnostics.join("; "));
}
