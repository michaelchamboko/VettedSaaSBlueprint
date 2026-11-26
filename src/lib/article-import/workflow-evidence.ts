import { z } from "zod";
import { AsyncLocalStorage } from "node:async_hooks";
import { importPacketId, type ResearchGenerationBinding } from "./packet-binding";
import path from "node:path";
import { canReuseEditorialEvidence, compareEditorialArtifacts, editorialEvidenceSchema, editorialProse, editorialProsePaths, fingerprintEditorialArtifact, EDITORIAL_REVISION } from "../editorial/refinement";
import { importArtifactTarget, validateImportArtifact } from "./format-validation";
import { CONTENT_FORMATS, WORKFLOW_REVISION, WORKFLOW_SEQUENCE, workflowRequirements, type WorkflowStage } from "./workflow-requirements";
import { evidenceRefSchema, frozenFileSchema, withTerminalEvidenceSnapshot, isEvidenceSnapshotActive, hashSchema, readEvidence, readEvidenceBytes, readVerifiedEvidenceBytes, verifyEvidenceRef, validateExecutionEvidence, proseProjectionDigest, sha256, type EvidenceRef, type ExecutionEvidence } from "./execution-evidence";
import { renderingInputsSchema, requiredDetectorInputs, validateRenderingInputs } from "./rendering-inputs";
import { candidatePreviewPath } from "./candidate-route";
import { countVisibleArticleWords } from "../editorial/article-visible-word-count";
import { approvedAffiliateUrl, assertLongFormAffiliateAssessment, assertLongFormAffiliateReview, LONG_FORM_AFFILIATE_INSTRUCTION, longFormAffiliateAssessmentSchema, longFormAffiliateReviewSchema } from "./long-form-affiliate";
export { evidenceRefSchema, evidenceReference, readEvidence, readVerifiedEvidenceBytes, storeEvidence } from "./execution-evidence";
export { freezeEvidenceGraph } from "./execution-evidence";
export type { EvidenceRef } from "./execution-evidence";

const nonempty = z.string().trim().min(1);
export function createDesignReviewSchema(input: { rule: string; artifactFingerprint: string; renderInputsRef: { path: string; sha256: string }; renderingDigest: string; allowedRoutes: string[] }) {
  return z.object({
    rule: z.literal(input.rule),
    artifactFingerprint: z.literal(input.artifactFingerprint),
    routes: z.array(z.string()),
    renderInputsRef: z.object({ path: z.literal(input.renderInputsRef.path), sha256: z.literal(input.renderInputsRef.sha256) }).strict(),
    renderingDigest: z.literal(input.renderingDigest),
    verdict: z.enum(["pass", "fail", "insufficient-evidence"]),
    findings: z.array(z.object({ description: nonempty, disposition: z.enum(["resolved", "unresolved"]) }).strict()),
    notes: nonempty,
  }).strict().refine((judgment) => input.allowedRoutes.includes(JSON.stringify(judgment.routes)), "PRESENTATION_JUDGMENT_ROUTES_MISMATCH");
}
const common = { id: nonempty, createdAt: z.string().datetime({ offset: true }), importId: z.string().regex(/^article-[0-9a-f-]{36}$/), sourceFingerprint: hashSchema, requirementRevision: z.literal(WORKFLOW_REVISION) };
const formatSchema = z.enum(CONTENT_FORMATS);
export const ruleResultSchema = z.object({ ruleId: nonempty, revision: z.literal(WORKFLOW_REVISION), status: z.enum(["pass", "fail", "not-applicable", "recommendation-not-adopted"]), rationale: nonempty, evidenceRefs: z.array(evidenceRefSchema).min(1) }).strict();
export const workflowEvidenceSchema = z.object({ ...common, schemaVersion: z.enum(["WorkflowEvidenceV1","WorkflowEvidenceV2"]), stage: z.enum(WORKFLOW_SEQUENCE), packetId: hashSchema, artifactRef: evidenceRefSchema, renderInputsRef: evidenceRefSchema, predecessorRefs: z.array(evidenceRefSchema).min(1), ruleResults: z.array(ruleResultSchema).min(1) }).strict();
export const researchEvidenceSchema = z.object({ ...common, schemaVersion: z.literal("ResearchEvidenceV2"), sources: z.array(z.object({ id: nonempty, url: z.string().url(), retrievedAt: z.string().datetime({ offset: true }), snapshotRef: evidenceRefSchema }).strict()).min(1), claims: z.array(z.object({ id: nonempty, text: nonempty, sourceIds: z.array(nonempty).min(1), excerptLocations: z.array(z.object({ sourceId: nonempty, quote: nonempty }).strict()).min(1), limitations: z.array(nonempty), price: z.object({ amount: z.number().nonnegative(), currency: z.string().regex(/^[A-Z]{3}$/), period: nonempty, plan: nonempty, restrictions: z.array(nonempty) }).strict().optional() }).strict()).min(1), freshness: nonempty }).strict();
export const contentAssessmentSchema = z.object({ ...common, schemaVersion: z.literal("ContentAssessmentV1"), format: formatSchema, artifactFingerprint: hashSchema, schemaRevision: nonempty, intent: z.object({ audience: nonempty, decision: nonempty, query: nonempty, pageType: nonempty }).strict(), longFormAffiliate: longFormAffiliateAssessmentSchema.optional(), researchRef: evidenceRefSchema, claimCoverage: z.array(z.object({ claimId: nonempty, artifactPaths: z.array(nonempty).min(1) }).strict()).min(1), ruleResults: z.array(ruleResultSchema).min(1), reviewerExecutionRef: evidenceRefSchema, findings: z.array(z.object({ id: nonempty, artifactPaths: z.array(nonempty).min(1), claimIds: z.array(nonempty), description: nonempty, disposition: z.enum(["resolved", "unresolved", "justified-exception"]), evidenceRefs: z.array(evidenceRefSchema).min(1) }).strict()) }).strict();
const passes = ["purposeAndStructure", "meaningAndEvidence", "wordingAndRhythm", "rivalFamilyCleanse", "finalFidelityReview", "beamReview", "independentReview"] as const;
export const editorialExecutionSchema = z.object({ ...common, schemaVersion: z.literal("EditorialExecutionV1"), format: formatSchema, editorialEvidenceRef: evidenceRefSchema, schemaRevision: nonempty, eligibleProsePaths: z.array(nonempty).min(1), passes: z.array(z.object({ name: z.enum(passes), inputRef: evidenceRefSchema, outputRef: evidenceRefSchema, instructionRefs: z.array(evidenceRefSchema).min(1), executionRef: evidenceRefSchema, judgmentRef: evidenceRefSchema }).strict()).length(5), checkerExecutionRef: evidenceRefSchema }).strict();
export const evidenceRefsSchema = z.object({ research: evidenceRefSchema.optional(), transformAssessment: evidenceRefSchema.optional(), assessment: evidenceRefSchema.optional(), editorial: evidenceRefSchema.optional(), presentation: evidenceRefSchema.optional(), production: evidenceRefSchema.optional() }).strict();
export const terminalEvidenceSchema = z.discriminatedUnion("kind", [
  z.object({ ...common, schemaVersion: z.literal("TerminalEvidenceV1"), kind: z.literal("live"), researchGeneration: z.number().int().nonnegative().optional(), originImportId: nonempty, sourceRef: evidenceRefSchema, completedAt: z.string().datetime({ offset: true }), artifactRef: evidenceRefSchema, format: formatSchema, evidenceRefs: evidenceRefsSchema, frozenFiles: z.array(frozenFileSchema).min(1), reviewedCommitSha: z.string().regex(/^[a-f0-9]{40}$/), mergeCommitSha: z.string().regex(/^[a-f0-9]{40}$/), mergeEvidenceRef: evidenceRefSchema, deployment: z.object({ deploymentId: nonempty, canonicalUrl: z.string().url(), commitSha: z.string().regex(/^[a-f0-9]{40}$/) }).strict() }).strict(),
  z.object({ ...common, schemaVersion: z.literal("TerminalEvidenceV1"), kind: z.literal("quarantine"), originImportId: nonempty, sourceRef: evidenceRefSchema, completedAt: z.string().datetime({ offset: true }), reasonCode: z.enum(["empty", "unusable", "unsupported-format"]), dispositionEvidenceRef: evidenceRefSchema }).strict(),
  z.object({ ...common, schemaVersion: z.literal("TerminalEvidenceV1"), kind: z.literal("duplicate"), originImportId: nonempty, sourceRef: evidenceRefSchema, completedAt: z.string().datetime({ offset: true }), originTerminalRef: evidenceRefSchema }).strict(),
]);
export const diagnosisSchema = z.object({ ...common, schemaVersion: z.literal("DiagnosisV1"), stage: z.enum(WORKFLOW_SEQUENCE), failedSubmissionDigest: hashSchema, failureCode: nonempty, cause: nonempty, attemptedRecoveryRefs: z.array(evidenceRefSchema).min(1), remedyEvidenceRefs: z.array(evidenceRefSchema).min(1), replacementSubmissionDigest: hashSchema, consumedAt: z.string().datetime({ offset: true }).optional() }).strict();
export type EvidenceBinding = ResearchGenerationBinding & { evidenceRefs?: { research?: EvidenceRef; transformAssessment?: EvidenceRef; assessment?: EvidenceRef }; importId: string; sourceFingerprint: string; format: string; artifactPath?: string; requirementRevision?: string; stage?: string; resumeStage?: string; affiliateUrl?: string | null; transformation?: { commercialMode?: string; resolvedAffiliateUrl?: string } };
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
  if (execution.kind !== "opencode" && execution.kind !== "structured") throw new Error("EXECUTION_INSTRUCTION_MISMATCH");
  const captured = execution.instructions.map(({ path, sha256 }) => ({ path, sha256 }));
  if (declared && (declared.length !== captured.length || declared.some((ref) => !captured.some((item) => item.path === ref.path && item.sha256 === ref.sha256)))) throw new Error("EXECUTION_INSTRUCTION_MISMATCH");
  for (const file of required) {
    const pin = await pinnedInput(root, execution, file);
    if (!execution.instructions.some((item) => item.path === pin.path && item.sha256 === pin.sha256 && sha256(item.text) === pin.sha256)) throw new Error(`EXECUTION_INSTRUCTION_REQUIRED:${file}`);
  }
}
async function longFormAffiliatePolicyRequired(root: string, binding: EvidenceBinding): Promise<string | undefined> {
  const destination = approvedAffiliateUrl(binding);
  if (!destination) return undefined;
  const manifest = z.object({ files: z.array(evidenceRefSchema) }).passthrough().parse(JSON.parse((await readEvidenceBytes(root, "config/article-workflow-capabilities.json")).toString("utf8")));
  const pinned = manifest.files.some((ref) => ref.path === LONG_FORM_AFFILIATE_INSTRUCTION);
  if (!pinned && !isEvidenceSnapshotActive()) throw new Error("LONG_FORM_AFFILIATE_POLICY_PIN_REQUIRED");
  return pinned ? destination : undefined;
}
type ReviewExecution = Extract<ExecutionEvidence, { kind: "opencode" | "structured" }>;
function reviewExecution(execution: ExecutionEvidence): ReviewExecution {
  if (execution.kind !== "opencode" && execution.kind !== "structured") throw new Error("EDITORIAL_EXECUTION_MISMATCH");
  return execution;
}
function executionContext(execution: ReviewExecution): string {
  return execution.kind === "opencode" ? execution.sessionId : execution.contextId;
}
function assertPacket(packetId: string, binding: EvidenceBinding, stage: string): void {
  const strategies = stage === "REFINING" || stage === "VALIDATING" ? ["targeted-repair", "fresh-rewrite", "fresh-topic"] : ["field-repair", "reconstruct-schema", "reclassify"];
  if (!strategies.some((strategy) => importPacketId(binding, stage, strategy) === packetId)) throw new Error("EXECUTION_PACKET_MISMATCH");
}
function consumingStage(binding: EvidenceBinding): string | undefined {
  return ["REPAIRING", "WAITING_EXTERNAL", "ROLLED_BACK"].includes(binding.stage ?? "")
    ? binding.resumeStage
    : binding.stage;
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
    const bytes = await readVerifiedEvidenceBytes(root, source.snapshotRef);
    sourceSnapshots.push({ sourceId: source.id, ref: source.snapshotRef, text: bytes.toString("utf8") });
  }
  return { artifact: JSON.stringify(artifact), research: JSON.stringify(research), researchRef: JSON.stringify(evidenceRefSchema.parse(researchRef)), sourceSnapshots: JSON.stringify(sourceSnapshots) };
}
export function editorialPassReviewInput(before: unknown): Record<string, string> {
  return { beforeArtifact: JSON.stringify(before) };
}
export function editorialJudgmentReviewInput(before: unknown, after: unknown): Record<string, string> {
  return { beforeArtifact: JSON.stringify(before), afterArtifact: JSON.stringify(after) };
}
export async function longFormAffiliateJudgmentReviewInput(root: string, before: unknown, after: unknown, researchRef: EvidenceRef, assessmentRef: EvidenceRef, destination: string): Promise<Record<string, string>> {
  const retainedResearch = researchEvidenceSchema.parse(await readEvidence(root, researchRef));
  const research = await validateResearchEvidence(root, researchRef, { importId: retainedResearch.importId, sourceFingerprint: retainedResearch.sourceFingerprint, requirementRevision: retainedResearch.requirementRevision, format: "direct-review" });
  const assessment = contentAssessmentSchema.parse(await readEvidence(root, assessmentRef));
  if (!assessment.longFormAffiliate || assessment.longFormAffiliate.approvedAffiliateUrl !== destination) throw new Error("LONG_FORM_AFFILIATE_BRIEF_REQUIRED");
  const researchInput = await contentAssessmentReviewInput(root, after, research, researchRef);
  const count = countVisibleArticleWords("direct-review", after);
  return { ...editorialJudgmentReviewInput(before, after), approvedAffiliateUrl: destination, acceptedBrief: JSON.stringify(assessment.longFormAffiliate.brief), visibleWordCount: String(count.wordCount), retainedResearch: researchInput.research, sourceSnapshots: researchInput.sourceSnapshots };
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
export const designJudgmentInstruction = ".agents/skills/external-article-import/references/design-judgment.md";
export const runtimeRules = ["desktop", "mobile", "reduced-motion"] as const;
export const visualDesignRules = new Set(["critique", "audit", "polish"]);
export const runtimeRefSchema = z.object({desktop:evidenceRefSchema, mobile:evidenceRefSchema, "reduced-motion":evidenceRefSchema}).strict();

/** Reconstruct the exact runtime material seen by a visual reviewer from browser receipts. */
export async function designRuntimeMaterial(root: string, importId: string, artifactRef: EvidenceRef, renderRef: EvidenceRef,
  routes: string[], observations: z.infer<typeof runtimeRefSchema>) {
  const images = new Map<string,EvidenceRef>();
  const material = [];
  let origin: string | undefined;
  for (const rule of runtimeRules) {
    const ref = observations[rule];
    const prefix = ".automation/article-imports/evidence/" + importId + "/";
    if (ref.path !== prefix + ref.sha256 + ".json") throw new Error("PRESENTATION_OBSERVATION_SCOPE");
    const receipt = await validateExecutionEvidence(root,ref);
    if (receipt.kind !== "browser" || ![artifactRef,renderRef].every(expected => receipt.inputRefs.some(r => r.path === expected.path && r.sha256 === expected.sha256)) ||
        JSON.stringify(receipt.routes) !== JSON.stringify(routes) || receipt.screenshots.length !== routes.length || (origin && origin !== receipt.target) ||
        !["127.0.0.1","localhost","[::1]"].includes(new URL(receipt.target).hostname) ||
        (rule === "mobile" ? receipt.viewport.width > 767 : receipt.viewport.width < 1024) ||
        receipt.viewport.reducedMotion !== (rule === "reduced-motion")) throw new Error("PRESENTATION_OBSERVATION_BINDING");
    origin = receipt.target;
    for (const image of receipt.screenshots) {
      if (image.path !== prefix + image.sha256 + ".png") throw new Error("PRESENTATION_OBSERVATION_SCOPE");
      images.set(image.path,image);
    }
    material.push({rule,ref,routes:receipt.routes,viewport:receipt.viewport,checks:receipt.checks,screenshots:receipt.screenshots});
  }
  return { browserObservations:JSON.stringify(material), images:[...images.values()] };
}

async function artifactFor(root: string, binding: EvidenceBinding): Promise<unknown> {
  if (!binding.artifactPath) throw new Error("EVIDENCE_ARTIFACT_REQUIRED");
  const value: unknown = JSON.parse((await readEvidenceBytes(root, binding.artifactPath)).toString("utf8"));
  validateImportArtifact(formatSchema.parse(binding.format), value);
  return value;
}
type TransformingArtifactContext = { root: string; importId: string; sourceFingerprint: string; artifactPath: string; format: string; artifact: unknown };
const transformingArtifactContext = new AsyncLocalStorage<TransformingArtifactContext>();
export async function withTransformingArtifact<T>(
  root: string,
  binding: EvidenceBinding & { stage: string },
  check: (artifact: unknown) => void,
  operation: () => Promise<T>,
): Promise<T> {
  if (binding.stage !== "TRANSFORMING" || !binding.artifactPath) throw new Error("TRANSFORMING_ARTIFACT_CONTEXT_INVALID");
  const artifact = await artifactFor(root, binding);
  check(artifact);
  const scoped = { root, importId: binding.importId, sourceFingerprint: binding.sourceFingerprint, artifactPath: binding.artifactPath, format: binding.format, artifact };
  return transformingArtifactContext.run(scoped, operation);
}
function scopedTransformingArtifact(root: string, record: WorkflowEvidenceRecord, binding: EvidenceBinding, through: string, mode: string): unknown | undefined {
  const scoped = transformingArtifactContext.getStore();
  if (!scoped || mode !== "current-transition" || record.stage !== "TRANSFORMING" || through !== "REFINING") return undefined;
  const matchesBinding = scoped.root === root
    && scoped.importId === binding.importId
    && scoped.sourceFingerprint === binding.sourceFingerprint
    && scoped.artifactPath === binding.artifactPath
    && scoped.format === binding.format;
  if (!matchesBinding) throw new Error("TRANSFORMING_ARTIFACT_CONTEXT_MISMATCH");
  return scoped.artifact;
}
export async function validateResearchEvidence(root: string, ref: EvidenceRef, binding: EvidenceBinding) {
  return (await validateResearchEvidenceForRegistry(root, ref, binding)).evidence;
}

export async function validateResearchEvidenceForRegistry(root: string, ref: EvidenceRef, binding: EvidenceBinding) {
  const value = researchEvidenceSchema.parse(await readEvidence(root, ref));
  assertBinding(value, binding); unique(value.sources.map((x) => x.id)); unique(value.claims.map((x) => x.id));
  const snapshots = new Map<string, string>();
  const snapshotBytes = new Map<string, Buffer>();
  for (const source of value.sources) {
    const bytes = await readVerifiedEvidenceBytes(root, source.snapshotRef);
    snapshotBytes.set(source.id, bytes);
    snapshots.set(source.id, bytes.toString("utf8"));
    if (Date.parse(source.retrievedAt) > Date.parse(value.createdAt)) throw new Error("RESEARCH_RETRIEVAL_TIME_INVALID");
  }
  for (const claim of value.claims) {
    if (claim.sourceIds.some((id) => !snapshots.has(id))) throw new Error("RESEARCH_SOURCE_MISSING");
    for (const excerpt of claim.excerptLocations) if (!claim.sourceIds.includes(excerpt.sourceId) || !snapshots.get(excerpt.sourceId)?.includes(excerpt.quote)) throw new Error("RESEARCH_EXCERPT_MISMATCH");
    if (/\b(?:starts? at|costs?|priced? at)\s*\/|(?:\$|\u00a3|\u20ac)\s*\//i.test(claim.text)) throw new Error("RESEARCH_PRICE_INVALID");
    if (/(?:\$|\u00a3|\u20ac)\s*\d|\b\d+(?:\.\d+)?\s*(?:USD|GBP|EUR)\b/i.test(claim.text) && !claim.price) throw new Error("RESEARCH_PRICE_CONTEXT_REQUIRED");
  }
  return { evidence: value, snapshotBytes };
}
async function validateContentAssessmentImpl(root: string, ref: EvidenceRef, binding: EvidenceBinding, prevalidatedResearch?: { ref: EvidenceRef; value: z.infer<typeof researchEvidenceSchema> }, artifactSnapshot?: unknown) {
  const value = contentAssessmentSchema.parse(await readEvidence(root, ref));
  assertBinding(value, binding);
  const artifact = artifactSnapshot === undefined ? await artifactFor(root, binding) : artifactSnapshot;
  if (value.format !== binding.format || value.artifactFingerprint !== fingerprintEditorialArtifact(artifact) || value.schemaRevision !== revisions[value.format]) throw new Error("ASSESSMENT_ARTIFACT_MISMATCH");
  const currentResearch = binding.evidenceRefs?.research;
  if (currentResearch && (value.researchRef.path !== currentResearch.path || value.researchRef.sha256 !== currentResearch.sha256)) throw new Error("ASSESSMENT_RESEARCH_MISMATCH");
  let research: z.infer<typeof researchEvidenceSchema>;
  if (prevalidatedResearch && prevalidatedResearch.ref.path === value.researchRef.path && prevalidatedResearch.ref.sha256 === value.researchRef.sha256) {
    research = prevalidatedResearch.value;
  } else {
    research = await validateResearchEvidence(root, value.researchRef, binding);
  }
  unique(value.ruleResults.map((x) => x.ruleId));
  if (value.ruleResults.length !== workflowRequirements.length) throw new Error("ASSESSMENT_RULE_MISSING");
  for (const requirement of workflowRequirements) {
    const result = value.ruleResults.find((x) => x.ruleId === requirement.id);
    if (!result || result.status === "fail" || result.status === "not-applicable" || (requirement.strength === "required" && result.status !== "pass")) throw new Error(`ASSESSMENT_RULE_FAILED:${requirement.id}`);
    for (const evidence of result.evidenceRefs) await verifyEvidenceRef(root, evidence);
  }
  const researchClaimIds = new Set(research.claims.map((claim) => claim.id));
  for (const coverage of value.claimCoverage) {
    if (!researchClaimIds.has(coverage.claimId) || coverage.artifactPaths.some((p) => typeof atPath(artifact, p) !== "string")) throw new Error("ASSESSMENT_CLAIM_MISMATCH");
  }
  for (const finding of value.findings) {
    if (finding.disposition === "unresolved") throw new Error("ASSESSMENT_UNRESOLVED_FINDING");
    if (finding.artifactPaths.some((p) => atPath(artifact, p) === undefined)) throw new Error("ASSESSMENT_SCOPE_MISMATCH");
    if (finding.claimIds.some((claimId) => !researchClaimIds.has(claimId))) throw new Error("ASSESSMENT_CLAIM_MISMATCH");
    for (const evidence of finding.evidenceRefs) await verifyEvidenceRef(root, evidence);
  }
  const execution = await validateExecutionEvidence(root, value.reviewerExecutionRef);
  const reviewInput = await contentAssessmentReviewInput(root, artifact, research, value.researchRef);
  const review = reviewExecution(execution);
  if (review.pass !== "content-assessment" || proseProjectionDigest(review.input) !== proseProjectionDigest(reviewInput) || !review.inputRefs.some((ref) => ref.path === value.researchRef.path && ref.sha256 === value.researchRef.sha256)) throw new Error("ASSESSMENT_EXECUTION_MISMATCH");
  const destination = await longFormAffiliatePolicyRequired(root, binding);
  if (destination) {
    if (!value.longFormAffiliate) throw new Error("LONG_FORM_AFFILIATE_ASSESSMENT_REQUIRED");
    const count = countVisibleArticleWords("direct-review", artifact);
    assertLongFormAffiliateAssessment(value.longFormAffiliate, { artifactFingerprint: value.artifactFingerprint, wordCount: count.wordCount, approvedAffiliateUrl: destination });
    await pinnedInstructions(root, review, [LONG_FORM_AFFILIATE_INSTRUCTION]);
    const acceptedRef = binding.evidenceRefs?.transformAssessment;
    if (acceptedRef && (acceptedRef.path !== ref.path || acceptedRef.sha256 !== ref.sha256)) {
      const accepted = contentAssessmentSchema.parse(await readEvidence(root, acceptedRef));
      if (!accepted.longFormAffiliate || JSON.stringify(accepted.longFormAffiliate.brief) !== JSON.stringify(value.longFormAffiliate.brief) || accepted.longFormAffiliate.approvedAffiliateUrl !== value.longFormAffiliate.approvedAffiliateUrl) throw new Error("LONG_FORM_AFFILIATE_BRIEF_CHANGED");
    }
  }
  const assessed = { format: value.format, schemaRevision: value.schemaRevision, artifactFingerprint: value.artifactFingerprint, sourceFingerprint: value.sourceFingerprint, requirementRevision: value.requirementRevision, researchRef: value.researchRef, intent: value.intent, ...(value.longFormAffiliate && { longFormAffiliate: value.longFormAffiliate }), claimCoverage: value.claimCoverage, ruleResults: value.ruleResults, findings: value.findings };
  if (review.output.assessment !== JSON.stringify(assessed)) throw new Error("ASSESSMENT_JUDGMENT_MISMATCH");
  // Structured evidence is the final reassessment and must originate inside REFINING.
  // Retained OpenCode evidence keeps the historical TRANSFORMING-or-REFINING policy.
  if (review.kind === "structured") {
    assertPacket(review.packetId, binding, "REFINING");
    const consumer = consumingStage(binding);
    if (!consumer || WORKFLOW_SEQUENCE.indexOf(consumer as WorkflowStage) < WORKFLOW_SEQUENCE.indexOf("REFINING")) throw new Error("ASSESSMENT_CONSUMER_STAGE_MISMATCH");
  }
  else {
    try { assertPacket(review.packetId, binding, "TRANSFORMING"); } catch { assertPacket(review.packetId, binding, "REFINING"); }
  }
  return value;
}

export async function validateContentAssessment(root: string, ref: EvidenceRef, binding: EvidenceBinding) {
  return validateContentAssessmentImpl(root, ref, binding);
}
export async function validateEditorialExecution(root: string, ref: EvidenceRef, binding: EvidenceBinding) {
  const historical = isEvidenceSnapshotActive();
  const value = editorialExecutionSchema.parse(await readEvidence(root, ref));
  assertBinding(value, binding);
  const artifact = await artifactFor(root, binding), format = editorialFormats[value.format];
  if (value.format !== binding.format || value.schemaRevision !== revisions[value.format]) throw new Error("EDITORIAL_FORMAT_MISMATCH");
  const receipt = editorialEvidenceSchema.parse(await readEvidence(root, value.editorialEvidenceRef));
  if (!canReuseEditorialEvidence(receipt, format, artifact)) throw new Error("EDITORIAL_RECEIPT_MISMATCH");
  const paths = editorialProsePaths(format, artifact);
  if (JSON.stringify(paths) !== JSON.stringify(value.eligibleProsePaths)) throw new Error("EDITORIAL_PROSE_COVERAGE");
  let previous: string | undefined; let writerFamily: string | undefined; let reviewFamily: string | undefined;
  const rewriteContexts = new Set<string>();
  const legacyRewriteSessions = new Set<string>();
  const reviewPolicy = value.passes[3]?.name;
  const affiliateDestination = await longFormAffiliatePolicyRequired(root, binding);
  for (const [index, pass] of value.passes.entries()) {
    const expectedNames = index === 3 ? (historical ? ["rivalFamilyCleanse", "beamReview", "independentReview"] : ["beamReview", "independentReview"]) : [passes[index]];
    if (!expectedNames.includes(pass.name) || (previous && previous !== pass.inputRef.sha256)) throw new Error("EDITORIAL_PASS_ORDER");
    const before = await readEvidence(root, pass.inputRef), after = await readEvidence(root, pass.outputRef);
    if (index === 0 && receipt.beforeFingerprint !== fingerprintEditorialArtifact(before)) throw new Error("EDITORIAL_INITIAL_ARTIFACT_MISMATCH");
    compareEditorialArtifacts(format, before, after);
    const execution = reviewExecution(await validateExecutionEvidence(root, pass.executionRef));
    if (execution.pass !== pass.name || proseProjectionDigest(execution.input) !== proseProjectionDigest(editorialPassReviewInput(before)) || proseProjectionDigest(execution.output) !== proseProjectionDigest(artifactProseProjection(value.format, after))) throw new Error("EDITORIAL_EXECUTION_MISMATCH");
    assertPacket(execution.packetId, binding, "REFINING");
    await pinnedInstructions(root, execution, [...requiredEditorialInstructions, ...(affiliateDestination ? [LONG_FORM_AFFILIATE_INSTRUCTION] : []), ...(["rivalFamilyCleanse", "beamReview", "independentReview"].includes(pass.name) ? [ELEANOR_ROOT + "prompts/cleanse.txt"] : [])], pass.instructionRefs);
    const family = execution.kind === "opencode" ? execution.family : undefined;
    if (index === 0 && reviewPolicy !== "independentReview") writerFamily = family;
    if (index === 3) reviewFamily = family;
    if (index < 3 && reviewPolicy !== "independentReview" && (execution.kind !== "opencode" || execution.family !== writerFamily)) throw new Error("EDITORIAL_WRITER_FAMILY_MISMATCH");
    if (index === 3 && pass.name === "independentReview" && rewriteContexts.has(executionContext(execution))) throw new Error("EDITORIAL_INDEPENDENT_REVIEW_CONTEXT_REUSED");
    if (index === 3 && pass.name === "rivalFamilyCleanse" && execution.kind === "opencode" && execution.family === writerFamily) throw new Error("EDITORIAL_CLEANSE_FAMILY_MISMATCH");
    if (index === 3 && pass.name === "beamReview") {
      if (execution.kind !== "opencode" || execution.family !== writerFamily) throw new Error("EDITORIAL_BEAM_REVIEW_FAMILY_MISMATCH");
      if (legacyRewriteSessions.has(execution.sessionId)) throw new Error("EDITORIAL_BEAM_REVIEW_SESSION_REUSED");
      const receiptUsesBeam = receipt.passes.beamReview === true;
      if (receiptUsesBeam !== true) throw new Error("EDITORIAL_PASS_POLICY_MISMATCH");
    }
    if (index === 3 && pass.name === "rivalFamilyCleanse") {
      const receiptUsesBeam = receipt.passes.beamReview === true;
      if (receiptUsesBeam !== false) throw new Error("EDITORIAL_PASS_POLICY_MISMATCH");
    }
    if (index === 3 && pass.name === "independentReview" && receipt.passes.independentReview !== true) throw new Error("EDITORIAL_PASS_POLICY_MISMATCH");
    for (const instruction of pass.instructionRefs) await verifyEvidenceRef(root, instruction);
    const judgment = z.object({ pass: z.literal(pass.name), beforeFingerprint: z.literal(fingerprintEditorialArtifact(before)), afterFingerprint: z.literal(fingerprintEditorialArtifact(after)), coveredPaths: z.array(nonempty), verdict: z.enum(["pass", "fail", "insufficient-evidence"]), findings: z.array(z.object({ description: nonempty, disposition: z.enum(["resolved", "unresolved"]) }).strict()), semanticNotes: nonempty, meaningPreserved: z.boolean(), protectedFieldsPreserved: z.boolean(), longFormAffiliateReview: longFormAffiliateReviewSchema.optional(), executionRef: evidenceRefSchema }).strict().parse(await readEvidence(root, pass.judgmentRef));
    if (judgment.verdict !== "pass" || !judgment.meaningPreserved || !judgment.protectedFieldsPreserved || judgment.findings.some((finding) => finding.disposition === "unresolved")) throw new Error("EDITORIAL_JUDGMENT_FAILED");
    if (JSON.stringify(judgment.coveredPaths) !== JSON.stringify(paths)) throw new Error("EDITORIAL_JUDGMENT_COVERAGE");
    const judgmentExecution = reviewExecution(await validateExecutionEvidence(root, judgment.executionRef));
    const judgmentText = { ...judgment, executionRef: undefined };
    let expectedJudgmentInput = editorialJudgmentReviewInput(before, after);
    if (affiliateDestination && index === 3) {
      const researchRef = binding.evidenceRefs?.research, assessmentRef = binding.evidenceRefs?.transformAssessment;
      if (!researchRef || !assessmentRef) throw new Error("LONG_FORM_AFFILIATE_REVIEW_INPUT_REQUIRED");
      expectedJudgmentInput = await longFormAffiliateJudgmentReviewInput(root, before, after, researchRef, assessmentRef, affiliateDestination);
      if (![researchRef, assessmentRef].every((expected) => judgmentExecution.inputRefs.some((input) => input.path === expected.path && input.sha256 === expected.sha256))) throw new Error("LONG_FORM_AFFILIATE_REVIEW_INPUT_REQUIRED");
    }
    if (judgmentExecution.pass !== `${pass.name}-judgment` || proseProjectionDigest(judgmentExecution.input) !== proseProjectionDigest(expectedJudgmentInput) || judgmentExecution.output.judgment !== JSON.stringify(judgmentText)) throw new Error("EDITORIAL_JUDGMENT_EXECUTION_MISMATCH");
    assertPacket(judgmentExecution.packetId, binding, "REFINING");
    await pinnedInstructions(root, judgmentExecution, [...requiredEditorialInstructions, ...(affiliateDestination ? [LONG_FORM_AFFILIATE_INSTRUCTION] : [])]);
    if (affiliateDestination && index === 3) {
      if (pass.name !== "independentReview" || !judgment.longFormAffiliateReview) throw new Error("LONG_FORM_AFFILIATE_INDEPENDENT_REVIEW_REQUIRED");
      const count = countVisibleArticleWords("direct-review", after);
      assertLongFormAffiliateReview(judgment.longFormAffiliateReview, after, count.visibleProsePaths, { artifactFingerprint: fingerprintEditorialArtifact(after), wordCount: count.wordCount, approvedAffiliateUrl: affiliateDestination });
    }
    if (index === 3 && pass.name === "independentReview" && rewriteContexts.has(executionContext(judgmentExecution))) throw new Error("EDITORIAL_INDEPENDENT_REVIEW_CONTEXT_REUSED");
    if (index < 3) {
      rewriteContexts.add(executionContext(execution));
      rewriteContexts.add(executionContext(judgmentExecution));
      if (execution.kind === "opencode") legacyRewriteSessions.add(execution.sessionId);
    }
    previous = pass.outputRef.sha256;
    if (affiliateDestination && index === 4 && fingerprintEditorialArtifact(before) !== fingerprintEditorialArtifact(after)) throw new Error("LONG_FORM_AFFILIATE_REVIEW_STALE");
    if (index === 4 && fingerprintEditorialArtifact(after) !== fingerprintEditorialArtifact(artifact)) throw new Error("EDITORIAL_FINAL_ARTIFACT_MISMATCH");
  }
  const checker = await validateExecutionEvidence(root, value.checkerExecutionRef);
  if (checker.kind !== "command" || !/score\s+5\/5\s+CLEAN/.test(checker.stdout) || !checker.inputRefs.some((r) => r.sha256 === previous)) throw new Error("EDITORIAL_CHECKER_FAILED");
  const checkerScript = ELEANOR_ROOT + "tools/deslop.py";
  if (!/^python(?:3(?:\.\d+)?)?(?:\.exe)?$/i.test(checker.executable.replaceAll("\\", "/").split("/").at(-1) ?? "") || checker.toolVersion !== EDITORIAL_REVISION || path.resolve(checker.cwd) !== path.resolve(root) || JSON.stringify(checker.argv) !== JSON.stringify([checkerScript, "--text", editorialProse(format, artifact)])) throw new Error("EDITORIAL_CHECKER_COMMAND_MISMATCH");
  await pinnedInput(root, checker, checkerScript);
  if (value.passes[3]?.name === "beamReview") {
    if (writerFamily && receipt.writerModelFamily?.toLocaleLowerCase() !== writerFamily.toLocaleLowerCase()) throw new Error("EDITORIAL_RECEIPT_WRITER_FAMILY_MISMATCH");
    if (reviewFamily && receipt.cleanseModelFamily?.toLocaleLowerCase() !== reviewFamily.toLocaleLowerCase()) throw new Error("EDITORIAL_RECEIPT_CLEANSE_FAMILY_MISMATCH");
  }
  return value;
}

export type WorkflowEvidenceRecord = EvidenceBinding & { stage: string; schemaVersion?: string; workflowVersion?: number; evidenceRefs?: z.infer<typeof evidenceRefsSchema>; terminalRef?: EvidenceRef; presentation?: {artifactFingerprint: string}; contentApproval?: { artifactPath: string }; release?: { commitSha: string; deploymentId: string; canonicalUrl: string }; sourceRef?: EvidenceRef };
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
    let prevalidatedResearch: { ref: EvidenceRef; value: z.infer<typeof researchEvidenceSchema> } | undefined;
    if (rank >= 2) await need("research", "RESEARCHING", async (ref) => {
      const value = await validateResearchEvidence(context.root, ref, binding);
      prevalidatedResearch = { ref, value };
      return value;
    });
    if (rank >= 3) await need("assessment", "TRANSFORMING", (ref) => validateContentAssessmentImpl(context.root, ref, binding, prevalidatedResearch, scopedTransformingArtifact(context.root, record, binding, through, mode)));
    if (rank >= 4) await need("editorial", "REFINING", (ref) => validateEditorialExecution(context.root, ref, binding));
    if (rank >= 5) await need("presentation", "VALIDATING", async (ref) => {
      const presentation = await validatePresentationEvidence(context.root, ref, binding, record.presentation);
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
export async function validatePresentationEvidence(root: string, ref: EvidenceRef, binding: EvidenceBinding, priorPresentation?: {artifactFingerprint: string}) {
  const value = workflowEvidenceSchema.parse(await readEvidence(root, ref)); assertBinding(value, binding);
  if (value.schemaVersion === "WorkflowEvidenceV1" && !isEvidenceSnapshotActive()) {
    const policy = JSON.parse((await readEvidenceBytes(root,"config/article-workflow-capabilities.json")).toString("utf8"));
    if (policy.designEvidenceVersion === 2) {
      if (!priorPresentation) throw new Error("PRESENTATION_RUNTIME_EVIDENCE_REQUIRED");
      const saved = JSON.parse((await readEvidenceBytes(root, `.automation/article-imports/${value.importId}.json`)).toString("utf8"));
      const accepted = saved.evidenceRefs?.presentation;
      if (!saved.presentation || saved.importId !== value.importId || saved.sourceFingerprint !== binding.sourceFingerprint ||
          saved.presentation.artifactPath !== binding.artifactPath || accepted?.path !== ref.path || accepted?.sha256 !== ref.sha256 ||
          saved.presentation.artifactFingerprint !== fingerprintEditorialArtifact(await artifactFor(root,binding)) ||
          fingerprintEditorialArtifact(saved.presentation) !== fingerprintEditorialArtifact(priorPresentation)) {
        throw new Error("PRESENTATION_RUNTIME_EVIDENCE_REQUIRED");
      }
    }
  }
  if (value.stage !== "VALIDATING") throw new Error("PRESENTATION_STAGE_MISMATCH");
  assertPacket(value.packetId, binding, "VALIDATING");
  const artifact = await artifactFor(root, binding);
  const target = importArtifactTarget(formatSchema.parse(binding.format), artifact);
  const rendering = await validateRenderingInputs(root, value.renderInputsRef, { historical: isEvidenceSnapshotActive() });
  const designInput = await designInputFromManifest(root, artifact, value.renderInputsRef, rendering, target);
  const currentDesign = value.schemaVersion === "WorkflowEvidenceV2";
  const reviewRoutes = target.format === "direct-review" ? [candidatePreviewPath(target.slug)] : target.renderedRoutes;
  let runtime;
  if (currentDesign) {
    const observations = Object.fromEntries(runtimeRules.map(rule => {
      const refs = value.ruleResults.find(r => r.ruleId === rule)?.evidenceRefs;
      if (refs?.length !== 1) throw new Error("PRESENTATION_OBSERVATION_REQUIRED");
      return [rule,refs[0]];
    }));
    runtime = await designRuntimeMaterial(root,binding.importId,value.artifactRef,value.renderInputsRef,reviewRoutes,runtimeRefSchema.parse(observations));
  }
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
        const visual = runtime && visualDesignRules.has(rule) ? runtime : undefined;
        const expectedInput = visual ? {...designInput,browserObservations:visual.browserObservations} : designInput;
        if (execution.kind !== "opencode" || JSON.stringify(execution.imageRefs ?? []) !== JSON.stringify(visual?.images ?? []) || execution.pass !== `design:${rule}` || proseProjectionDigest(execution.input) !== proseProjectionDigest(expectedInput)) throw new Error("PRESENTATION_JUDGMENT_REQUIRED");
        assertPacket(execution.packetId, binding, "VALIDATING");
        const reference = rule === "design-read" ? ".agents/skills/design-taste-frontend/SKILL.md" : rule === "context" ? IMPECCABLE_ROOT + "SKILL.md" : IMPECCABLE_ROOT + `reference/${rule}.md`;
        await pinnedInstructions(root, execution, [reference, IMPECCABLE_ROOT + "reference/craft-floor.md", ...(currentDesign ? [designJudgmentInstruction] : [])]);
        const allowedJudgmentRoutes = target.format === "direct-review" ? [JSON.stringify(target.renderedRoutes), JSON.stringify([candidatePreviewPath(target.slug)])] : [JSON.stringify(target.renderedRoutes)];
const designReview = createDesignReviewSchema({ rule, artifactFingerprint: fingerprintEditorialArtifact(artifact), renderInputsRef: value.renderInputsRef, renderingDigest: rendering.digest, allowedRoutes: allowedJudgmentRoutes }).parse(JSON.parse(execution.output.designReview ?? "null"));
if (designReview.verdict !== "pass") throw new Error("PRESENTATION_DESIGN_REVIEW_VERDICT_NOT_PASS");
if (designReview.findings.some((finding) => finding.disposition !== "resolved")) throw new Error("PRESENTATION_DESIGN_REVIEW_UNRESOLVED_FINDING");
      }
      if (execution.kind === "browser") {
        const allowedBrowserRoutes = target.format === "direct-review" ? [JSON.stringify(target.renderedRoutes), JSON.stringify([candidatePreviewPath(target.slug)])] : [JSON.stringify(target.renderedRoutes)];
        if (!allowedBrowserRoutes.includes(JSON.stringify(execution.routes))) throw new Error("PRESENTATION_ROUTES_MISMATCH");
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
  const result = await withTerminalEvidenceSnapshot(value.frozenFiles, () => evaluateWorkflowEvidence({ ...value, workflowVersion: 2, stage: "LIVE", artifactPath: value.artifactRef.path, release: value.deployment }, { root, throughStage: "LIVE", artifactPath: value.artifactRef.path }));
  if (!result.ok) throw new Error(result.diagnostics.join("; "));
}
