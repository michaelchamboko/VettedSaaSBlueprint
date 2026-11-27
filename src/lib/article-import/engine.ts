import { createHash, randomUUID } from "node:crypto";
import { importPacketId, researchRecoveryGeneration } from "./packet-binding";
import { isDeepStrictEqual } from "node:util";
import { AsyncLocalStorage } from "node:async_hooks";
import { mkdir, open, readFile, readdir, realpath, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { parseApprovedUrls } from "../affiliate/approved-urls";
import { contentApprovalMatches, createContentApproval, formatQualityApprovalMatches, type ApprovalFiles } from "./content-approval";
import { actionableDiagnosisSchema, externalArticleImportSchema, remedyMeasurementVerificationSchema, remedyVerificationEvidenceSchema, type ExternalArticleImportV1, type FailureClass, type ImportFailureCategory, type ImportFormat, type ImportStage, type ImportTransformationV1 } from "./contracts";
import { createImportPresentation, requireImportPresentationBinding, verifyImportPresentationEvidence } from "./presentation";
import { approvedAffiliateUrl, longFormAffiliateAssessmentSchema } from "./long-form-affiliate";
import { claimWorkflowLease, type WorkflowLease } from "./workflow-lease";
export { recoverWorkflowLease } from "./workflow-lease";
import { instructionsForStage, RESEARCH_RECOVERY_INSTRUCTION, WORKFLOW_REVISION } from "./workflow-requirements";
import { contentAssessmentSchema, evaluateWorkflowEvidence, freezeEvidenceGraph, readEvidence, storeEvidence, validateContentAssessment, validateEditorialExecution, validatePresentationEvidence, validateProductionWorkflowEvidence, validateResearchEvidence, workflowEvidenceSchema } from "./workflow-evidence";
import { recoveryEvidenceSchema } from "./contracts";
import { evidenceRefSchema, evidenceReference, readEvidenceBytes, validateExecutionEvidence, verifyEvidenceRef, type EvidenceRef } from "./execution-evidence";
import type { ImproveExecutor } from "./improve-supervisor";
import { articleHeroBindingSchema } from "./hero-image";
import { readImportArtifactTarget } from "./format-validation";
import { validateArticleVisualRuntime } from "./article-visual-quality";
import { classifyImportFailure, ImportFailure } from "./failure-routing";
export { ImportFailure } from "./failure-routing";
import { declareGateHandoff, reconcileGateCleanup, type GateCleanupOptions } from "./gate-handoff";
import { registerPublicationApproval } from "./publication-approval";
import type { ArticleReviewEvidenceRegistry } from "./review-evidence-registry";

const ROOT = ".automation/article-imports";
type ActiveImportLease = { lease: WorkflowLease; importId: string; root: string; writing?: boolean };
const activeLease = new AsyncLocalStorage<ActiveImportLease>();
const INSTRUCTION_LINE = /ignore\s+(all|any|the)\s+(previous|prior)|system\s+prompt|developer\s+message|reveal\s+your\s+instructions|jailbreak/i;
const RISK_PATTERNS = [
  ["price", /\$\s?\d|\b\d+\s?(?:\/month|per month|monthly)\b/i],
  ["discount", /\b(?:discount|sale|coupon|off)\b/i],
  ["ranking", /\b(?:best|#1|number one|top)\b/i],
  ["named_comparison", /\b(?:versus|vs\.?|alternative to|unlike)\b/i],
  ["first_person_experience", /\b(?:i tested|we tested|i used|our experience|we found)\b/i],
  ["unsupported_certainty", /\b(?:always|never|guaranteed|will\s+(?:solve|increase|reduce))\b/i],
] as const;
const STRATEGIES: Record<string, string[]> = {
  research: ["alternate-source", "narrow-claim", "remove-claim"],
  transform: ["field-repair", "reconstruct-schema", "reclassify"],
  validate: ["targeted-repair", "fresh-rewrite", "fresh-topic"],
  media: ["retry-generation", "simplify-asset", "brand-graphic"],
  release: ["retry-transient", "rollback", "fix-forward"],
};

export const ARTICLE_WAIT_POLICY = { firstCheckMs: 15_000, secondCheckMs: 30_000, subsequentCheckMs: 60_000, timeoutMs: 2 * 60 * 60_000 } as const;

export function fingerprint(value: string | Buffer): string { return createHash("sha256").update(value).digest("hex"); }
function now(): string { return new Date().toISOString(); }
function storeRoot(repositoryRoot: string): string { return path.join(path.resolve(repositoryRoot), ROOT); }
function recordPath(repositoryRoot: string, importId: string): string { return path.join(storeRoot(repositoryRoot), `${importId}.json`); }
function sourcePath(repositoryRoot: string, importId: string): string { return path.join(storeRoot(repositoryRoot), `${importId}.source.md`); }

function scalar(value: string): string {
  const trimmed = value.trim();
  if ((trimmed.startsWith("\"") && trimmed.endsWith("\"")) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) return trimmed.slice(1, -1);
  return trimmed;
}

function extractUrl(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const markdownLink = trimmed.match(/^\[[^\]]*\]\((https:\/\/[^)\s]+)\)$/i);
  if (markdownLink?.[1]) return markdownLink[1];
  return trimmed.match(/https:\/\/[^)\s]+/i)?.[0] ?? trimmed;
}

export function parseExternalArticle(markdown: string): { title: string; primaryQuestion: string; affiliateName?: string; affiliateUrl?: string; body: string; promptInjectionDetected: boolean; unusableReason?: string; inferredFields: string[] } {
  const normalized = markdown.replace(/^\uFEFF/, "");
  const fenced = normalized.match(/^[\s\S]*?```(?:markdown|md)?\s*\r?\n(---[\s\S]*?)(?:\r?\n```\s*)?$/i);
  const input = fenced?.[1] && /^---\s*\r?\n/.test(fenced[1]) ? fenced[1] : normalized;
  const lines = input.split(/\r?\n/);
  const metadata: Record<string, string> = {};
  let bodyStart = 0;
  let malformedFrontmatter = false;
  if (lines[0]?.trim() === "---") {
    const end = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
    if (end < 0) {
      malformedFrontmatter = true;
    } else {
      bodyStart = end + 1;
      for (const line of lines.slice(1, end)) {
        const match = line.match(/^([A-Za-z][A-Za-z0-9_-]*)\s*:\s*(.*)$/);
        if (match) metadata[match[1]] = scalar(match[2]);
      }
    }
  }
  const bodyLines = lines.slice(bodyStart);
  const promptInjectionDetected = bodyLines.some((line) => INSTRUCTION_LINE.test(line)) || Object.values(metadata).some((value) => INSTRUCTION_LINE.test(value));
  for (const [key, value] of Object.entries(metadata)) {
    if (INSTRUCTION_LINE.test(value)) delete metadata[key];
  }
  const body = bodyLines.filter((line) => !INSTRUCTION_LINE.test(line)).join("\n").trim();
  const title = metadata.title?.trim() || body.match(/^#\s+(.+)$/m)?.[1]?.trim() || "Imported article";
  const primaryQuestion = metadata.primary_question?.trim() || metadata.primaryQuestion?.trim() || title;
  const inferredFields = [
    ...(metadata.title ? [] : ["title"]),
    ...(metadata.primary_question || metadata.primaryQuestion ? [] : ["primaryQuestion"]),
    ...(malformedFrontmatter ? ["frontmatter"] : []),
  ];
  const unusableReason = body.length === 0 ? "The submission has no usable article body." : undefined;
  const link = extractUrl(metadata.affiliate_url);
  return { title, primaryQuestion, affiliateName: metadata.affiliate_name, affiliateUrl: link, body, promptInjectionDetected, unusableReason, inferredFields };
}

function classify(input: ReturnType<typeof parseExternalArticle>): ImportFormat {
  const text = `${input.title}\n${input.primaryQuestion}\n${input.body}`.toLowerCase();
  if (input.affiliateName || input.affiliateUrl) return "direct-review";
  if (/decision hub|solution hub|decision scenario|three connected pages/.test(text)) return "decision-set";
  if (/^#{1,2}\s*(faq|frequently asked)/im.test(text) || /buyer question|topic cluster/.test(text)) return "blog";
  if (/guide|how to|checklist|workflow/.test(text)) return "visibility";
  return "agent_review_required";
}

function risks(body: string): ImportTransformationV1["claimRisks"] {
  return RISK_PATTERNS.filter(([, pattern]) => pattern.test(body)).map(([name]) => name);
}

function domainKey(host: string): string {
  const labels = host.toLowerCase().replace(/^www\./, "").split(".");
  return labels.slice(-2).join(".");
}

function hostMatches(candidate: string, submitted: string | undefined, affiliateName?: string): boolean {
  try {
    const host = new URL(candidate).hostname.toLowerCase().replace(/^www\./, "");
    const submittedHost = submitted ? new URL(submitted).hostname.toLowerCase().replace(/^www\./, "") : "";
    if (!submittedHost || domainKey(host) !== domainKey(submittedHost)) return false;
    if (!affiliateName) return false;
    const compactName = affiliateName.toLowerCase().replace(/[^a-z0-9]/g, "");
    const tokens = [compactName, ...affiliateName.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 2).map((token) => token.replace(/[^a-z0-9]/g, ""))];
    const labels = host.split(".").map((label) => label.replace(/[^a-z0-9]/g, ""));
    return tokens.some((token) => labels.includes(token));
  } catch { return false; }
}

export function resolveAffiliateUrl(submitted: string | undefined, affiliateName: string | undefined, allowlistMarkdown: string): { mode: "approved" | "decommercialized" | "none"; submitted?: string; resolved?: string } {
  if (!submitted) return { mode: "none" };
  const manifest = parseApprovedUrls(allowlistMarkdown);
  const exact = manifest.entries.find((entry) => entry.exactUrl === submitted);
  if (exact) return { mode: "approved", submitted, resolved: exact.exactUrl };
  const matches = manifest.entries.filter((entry) => hostMatches(entry.exactUrl, submitted, affiliateName));
  if (matches.length === 1) return { mode: "approved", submitted, resolved: matches[0].exactUrl };
  return { mode: "decommercialized", submitted };
}

export function prepareTransformation(parsed: ReturnType<typeof parseExternalArticle>, allowlistMarkdown: string): ImportTransformationV1 {
  const resolved = resolveAffiliateUrl(parsed.affiliateUrl, parsed.affiliateName, allowlistMarkdown);
  const removals: string[] = [...risks(parsed.body)];
  if (resolved.mode === "decommercialized") removals.push("affiliate destination and commercial CTA");
  const format = resolved.mode === "approved" ? classify(parsed) : classify({ ...parsed, affiliateName: undefined, affiliateUrl: undefined });
  return {
    schemaVersion: "ImportTransformationV1", format, title: parsed.title,
    primaryQuestion: parsed.primaryQuestion, affiliateName: resolved.mode === "approved" ? parsed.affiliateName : undefined,
    submittedAffiliateUrl: resolved.submitted, resolvedAffiliateUrl: resolved.resolved,
    commercialMode: resolved.mode, removals, claimRisks: risks(parsed.body),
    sourceFingerprint: "0".repeat(64), inferredFields: parsed.inferredFields,
  };
}

function initialRecord(input: { importId: string; sourceFile: string; sourceFingerprint: string; parsed: ReturnType<typeof parseExternalArticle>; transformation: ImportTransformationV1 }): ExternalArticleImportV1 {
  const at = now();
  return {
    schemaVersion: "ExternalArticleImportV2", workflowVersion: 2, requirementRevision: WORKFLOW_REVISION, evidenceRefs: {}, repairStageTotals: {}, diagnoses: [], activityProtocolVersion: 1, handoffProtocolVersion: 1, gateHandoffs: [], importId: input.importId, sourceFingerprint: input.sourceFingerprint,
    sourceFile: input.sourceFile, stage: "INGESTING", createdAt: at, updatedAt: at,
    title: input.parsed.title, primaryQuestion: input.parsed.primaryQuestion, format: input.transformation.format,
    promptInjectionDetected: input.parsed.promptInjectionDetected, ...(input.parsed.unusableReason ? { unusableReason: input.parsed.unusableReason } : {}),
    transformation: { ...input.transformation, sourceFingerprint: input.sourceFingerprint }, stageReceipts: [{ stage: "INGESTING", status: "started", at, message: "Source captured and normalized." }],
    strategyAttempts: {}, nextAction: input.parsed.unusableReason ? "Quarantine unusable input." : "Supervising agent: gather evidence and produce the existing content schema.",
  };
}

export type AtomicReplace = (from: string, to: string) => Promise<void>;

const TRANSIENT_REPLACE_ERRORS = new Set(["EPERM", "EBUSY", "EACCES"]);

async function replaceWithRetry(replace: AtomicReplace, from: string, to: string): Promise<void> {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await replace(from, to);
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (!TRANSIENT_REPLACE_ERRORS.has(code ?? "") || attempt === 3) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 25));
    }
  }
}

export async function writeJsonAtomically(file: string, value: unknown, replace: AtomicReplace = rename): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${randomUUID()}.tmp`;
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  const handle = await open(temp, "w");
  try {
    await handle.writeFile(serialized, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await replaceWithRetry(replace, temp, file);
  } catch (error) {
    await unlink(temp).catch(() => undefined);
    throw error;
  }
}

export async function saveImport(repositoryRoot: string, record: ExternalArticleImportV1): Promise<string> {
  const parsed = externalArticleImportSchema.parse({ ...record, stateRevision: randomUUID() });
  assertCurrentImport(parsed);
  const file = recordPath(repositoryRoot, parsed.importId);
  const context = activeLease.getStore();
  if (!context) throw new Error("IMPORT_LEASE_REQUIRED");
  if (context.importId !== parsed.importId) throw new Error("IMPORT_LEASE_MISMATCH");
  const canonicalRoot = await realpath(repositoryRoot);
  if (context.root !== canonicalRoot) throw new Error("IMPORT_LEASE_ROOT_MISMATCH");
  if (context.writing) throw new Error("IMPORT_WRITE_BUSY");
  context.writing = true;
  try {
    await context.lease.assertOwned();
    const prior = await readFile(file, "utf8").catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
      return undefined;
    });
    if (prior !== undefined) {
      const stored = JSON.parse(prior);
      if (stored.stateRevision !== record.stateRevision) throw new Error("STALE_IMPORT_RECORD");
      if (isDeepStrictEqual(stored, JSON.parse(JSON.stringify({ ...parsed, stateRevision: record.stateRevision })))) return file;
    }
    await writeJsonAtomically(file, parsed, async (from, to) => {
      await context.lease.assertOwned();
      await rename(from, to);
    });
    record.stateRevision = parsed.stateRevision;
    return file;
  } finally {
    context.writing = false;
  }
}

export async function loadImport(repositoryRoot: string, importId: string): Promise<ExternalArticleImportV1> {
  if (!/^article-[0-9a-f-]{36}$/.test(importId)) throw new Error("INVALID_IMPORT_ID");
  const raw = JSON.parse(await readFile(recordPath(repositoryRoot, importId), "utf8"));
  if (raw.schemaVersion === "ExternalArticleImportV1") {
    const diagnostics: string[] = [];
    for (const field of ["contentApproval", "presentation"] as const) {
      if (raw[field] !== undefined && !externalArticleImportSchema.shape[field].safeParse(raw[field]).success) { diagnostics.push(`INVALID_LEGACY_EVIDENCE:${field}`); delete raw[field]; }
    }
    if (raw.pendingRelease?.codeReview && !externalArticleImportSchema.shape.pendingRelease.unwrap().shape.codeReview.safeParse(raw.pendingRelease.codeReview).success) {
      diagnostics.push("INVALID_LEGACY_EVIDENCE:pendingRelease.codeReview"); delete raw.pendingRelease.codeReview;
    }
    raw.legacyDiagnostics = diagnostics;
  }
  return externalArticleImportSchema.parse(raw);
}

export async function listPendingImports(repositoryRoot: string): Promise<ExternalArticleImportV1[]> {
  return (await listAllImports(repositoryRoot)).filter((record) => !["LIVE", "QUARANTINED"].includes(record.stage));
}


export type ImportLease = WorkflowLease;

// Immutable generations make exclusive hard-link creation a filesystem compare-and-swap.
// An expired owner can never delete or overwrite a successor's lease.
export async function claimImportLease(repositoryRoot: string, importId: string, ttlMs = 30 * 60_000): Promise<ImportLease | undefined> {
  const legacyFiles = await readdir(path.join(storeRoot(repositoryRoot), "leases", importId)).catch((error: NodeJS.ErrnoException) => { if (error.code === "ENOENT") return []; throw error; });
  if (legacyFiles.length) throw new Error("LEASE_RECOVERY_UNVERIFIED");
  return claimWorkflowLease(repositoryRoot, "import", importId, ttlMs);
}

export type ImportExecutionContext = {
  record: ExternalArticleImportV1; stage: ImportStage; strategy: string; attempt: number;
  idempotencyKey: string; leaseToken: string; assertLease: () => Promise<void>;
};
export type ImportStageExecutor = (context: ImportExecutionContext) => Promise<ExternalArticleImportV1>;

function strategyGroup(stage: ImportStage): string {
  return ({ RESEARCHING: "research", TRANSFORMING: "transform", REFINING: "validate", VALIDATING: "validate", RELEASING: "release", VERIFYING: "release" } as Partial<Record<ImportStage, string>>)[stage] ?? "research";
}

export async function canonicalSubmissionFingerprint(record: ExternalArticleImportV1, root: string): Promise<string> {
  const inputs: unknown[] = [{ stage: record.resumeStage ?? record.stage, sourceFingerprint: record.sourceFingerprint, transformation: record.transformation, artifactPath: record.artifactPath, contentApproval: record.contentApproval, heroImage: record.heroImage, presentation: record.presentation, pendingRelease: record.pendingRelease, release: record.release, evidenceRefs: record.evidenceRefs }];
  const files = new Set<string>();
  const addFile = (file: string) => files.add(path.relative(path.resolve(root), path.resolve(root, file)).replaceAll("\\", "/"));
  // Explicit supervised-result/approval dependencies; never infer files from arbitrary article path keys.
    const fileFields = new Set(["artifactPath", "assessmentPath", "editorialExecutionPath", "editorialEvidencePath", "formatQualityPath", "validationReceiptPath", "presentationEvidencePath", "heroGenerationEvidencePath", "evidencePath", "registryDecisionPath", "registryWritebackPath", "codeReviewPath", "workPath", "resultPath", "proposalPath"]);
  function collect(value: unknown): void {
    if (!value || typeof value !== "object") return;
    const ref = evidenceRefSchema.safeParse(value);
    if (ref.success) { addFile(ref.data.path); return; }
    for (const [key, entry] of Object.entries(value)) {
      if (fileFields.has(key) && typeof entry === "string") addFile(entry);
      else collect(entry);
    }
  }
  collect(inputs);
  // Resolve persisted packets independently of continuation: recording a repair must not
  // drop the work packet (or change path spelling/order) from the submitted byte set.
  const workDir = path.join(storeRoot(root), "work", record.importId);
  for (const name of (await readdir(workDir).catch((e: NodeJS.ErrnoException) => { if (e.code === "ENOENT") return []; throw e; })).sort()) {
    if (name.endsWith(".work.json") || name.endsWith(".result.json")) addFile(path.join(workDir, name));
  }
  for (const file of files) {
    const resolved = path.resolve(root, file);
    const relative = path.relative(path.resolve(root), resolved);
    if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("EVIDENCE_PATH_ESCAPE");
    try { const bytes = await readEvidenceBytes(root, file); inputs.push([file, fingerprint(bytes)]); if (file.endsWith(".json")) { try { collect(JSON.parse(bytes.toString("utf8"))); } catch (error) { if (!(error instanceof SyntaxError)) throw error; } } }
    catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") inputs.push([file, "missing"]); else throw e; }
  }
  return fingerprint(JSON.stringify(inputs));
}

export function assertCurrentImport(record: ExternalArticleImportV1): void {
  if (record.schemaVersion !== "ExternalArticleImportV2" || record.workflowVersion !== 2) throw new Error("LEGACY_UPGRADE_REQUIRED");
}

/** Standalone mutation entry points share the same ownership context as resume. */
export async function withImportLease<T>(root: string, importId: string, action: (record: ExternalArticleImportV1) => Promise<T>): Promise<T> {
  const canonicalRoot = await realpath(root);
  const existing = activeLease.getStore();
  if (existing) {
    if (existing.importId !== importId) throw new Error("NESTED_IMPORT_LEASE");
    if (existing.root !== canonicalRoot) throw new Error("IMPORT_LEASE_ROOT_MISMATCH");
    const record = await loadImport(root, importId); assertCurrentImport(record);
    await existing.lease.assertOwned();
    return action(record);
  }
  const lease = await claimImportLease(root, importId);
  if (!lease) throw new Error("IMPORT_LEASE_BUSY");
  try {
    return await activeLease.run({ lease, importId, root: canonicalRoot }, async () => {
      const record = await loadImport(root, importId); assertCurrentImport(record);
      await lease.assertOwned();
      return action(record);
    });
  } finally { await lease.release(); }
}
/** Accept candidate fields only while the record revision they were derived from is current. */
export async function withRecordLease<T>(root: string, record: ExternalArticleImportV1, action: (current: ExternalArticleImportV1) => Promise<T>): Promise<T> {
  return withImportLease(root, record.importId, (current) => {
    if (current.stateRevision !== record.stateRevision) throw new Error("STALE_IMPORT_RECORD");
    return action(current);
  });
}

export async function clearImportBlocker(root: string, importId: string, recoveryRef: EvidenceRef): Promise<ExternalArticleImportV1> {
  return withImportLease(root, importId, async (record) => {
    const prior = record.continuation;
    const recovery = recoveryEvidenceSchema.parse(await readEvidence(root, recoveryRef));
    if (!prior || (prior.kind !== "blocked" && prior.kind !== "wait")) {
      if (recovery.importId === importId && recovery.sourceFingerprint === record.sourceFingerprint && record.recoveryRefs?.some((ref) => ref.path === recoveryRef.path && ref.sha256 === recoveryRef.sha256)) return record;
      throw new Error("IMPORT_BLOCKER_REQUIRED");
    }
    const cause = prior.kind === "blocked" ? prior.cause : record.nextAction;
    const requirement = prior.kind === "blocked" ? prior.resumptionRequirement : prior.dependency;
    if (recovery.importId !== importId || recovery.sourceFingerprint !== record.sourceFingerprint || recovery.cause !== cause || recovery.resumptionRequirement !== requirement || Date.parse(recovery.checkedAt) < Date.parse(record.updatedAt) || Date.parse(recovery.checkedAt) > Date.now()) throw new Error("RECOVERY_EVIDENCE_MISMATCH");
    for (const ref of recovery.executionRefs) {
      const execution = await validateExecutionEvidence(root, ref);
      if (Date.parse(execution.completedAt) < Date.parse(record.updatedAt) || Date.parse(execution.completedAt) > Date.parse(recovery.checkedAt)) throw new Error("RECOVERY_EXECUTION_STALE");
    }
    const stage = prior.kind === "wait" ? prior.resumeStage : record.resumeStage ?? record.stage;
    if (!["INGESTING", "RESEARCHING", "TRANSFORMING", "REFINING", "VALIDATING", "RELEASING", "VERIFYING"].includes(stage)) throw new Error("RECOVERY_STAGE_INVALID");
    const at = now();
    const updated = externalArticleImportSchema.parse({ ...record, stage, resumeStage: undefined, continuation: undefined, blockerScope: undefined, updatedAt: at, recoveryRefs: [...(record.recoveryRefs ?? []), recoveryRef], stageReceipts: [...record.stageReceipts, { stage, status: "started", at, message: `Explicit verified recovery: ${JSON.stringify({ prior, recoveryRef })}` }], nextAction: `Resume ${stage.toLowerCase()} after verified recovery; all workflow gates remain required.` });
    await saveImport(root, updated); return updated;
  });
}

export type PendingImportOptions = {
  rejectBusy?: boolean;
  executeStage?: (stage: ImportStage, action: () => Promise<ExternalArticleImportV1>) => Promise<ExternalArticleImportV1>;
  improveExecutor?: ImproveExecutor;
  cleanup?: GateCleanupOptions;
};

async function persistCleanupRecord(repositoryRoot: string, record: ExternalArticleImportV1): Promise<ExternalArticleImportV1> {
  await saveImport(repositoryRoot, externalArticleImportSchema.parse(record));
  return loadImport(repositoryRoot, record.importId);
}

export async function cleanupImportGateHandoff(repositoryRoot: string, importId: string, options?: GateCleanupOptions): Promise<ExternalArticleImportV1> {
  return withImportLease(repositoryRoot, importId, async (record) => {
    const result = await reconcileGateCleanup(repositoryRoot, record, "manual", (updated) => persistCleanupRecord(repositoryRoot, updated), options);
    return result.record;
  });
}

export async function executePendingImport(repositoryRoot: string, importId: string, execute: ImportStageExecutor, options?: PendingImportOptions): Promise<ExternalArticleImportV1> {
  const lease = await claimImportLease(repositoryRoot, importId);
  if (!lease && options?.rejectBusy) throw new Error("IMPORT_LEASE_BUSY");
  if (!lease) return loadImport(repositoryRoot, importId);
  try {
    return await activeLease.run({ lease, importId, root: await realpath(repositoryRoot) }, async () => {
      let current = await loadImport(repositoryRoot, importId);
      assertCurrentImport(current);
      const cleanup = await reconcileGateCleanup(repositoryRoot, current, "gate", (updated) => persistCleanupRecord(repositoryRoot, updated), options?.cleanup);
      current = cleanup.record;
      if (cleanup.handled) return current;
      if (["LIVE", "QUARANTINED"].includes(current.stage)) {
        if (!(await evaluateWorkflowEvidence(current, { root: repositoryRoot }, "historical-terminal")).ok) throw new Error("TERMINAL_PROOF_INVALID");
        if (!current.sourceDeletedAt) current = await deleteRawSource(repositoryRoot, importId, current, now());
        if (current.stage === "LIVE" && current.improve && !["COMPLETE", "BLOCKED"].includes(current.improve.phase)) {
          if (!options?.improveExecutor) return current;
          if (!current.improve.startedAt) {
            current = externalArticleImportSchema.parse({ ...current, improve: { ...current.improve, startedAt: now() } });
            await saveImport(repositoryRoot, current);
          }
          if (!current.improve) throw new Error("IMPROVE_ASSIGNMENT_MISSING");
          try {
            const improved = await options.improveExecutor({ record: current, assignment: current.improve, leaseToken: lease.ownerToken, assertLease: lease.assertOwned });
            if (improved.stage !== "LIVE" || improved.terminalRef?.sha256 !== current.terminalRef?.sha256 || improved.release?.commitSha !== current.release?.commitSha ||
                !isDeepStrictEqual(improved.publicationApproval, current.publicationApproval) || improved.continuation?.kind !== "complete") throw new Error("IMPROVE_MUTATED_PUBLICATION");
            await lease.assertOwned();
            await saveImport(repositoryRoot, improved);
            return improved;
          } catch (error) {
            await lease.assertOwned();
            const persisted = await loadImport(repositoryRoot, importId);
            if (!persisted.improve || persisted.improve.phase === "COMPLETE") throw error;
            const failed = externalArticleImportSchema.parse({ ...persisted, improve: { ...persisted.improve, attempt: persisted.improve.attempt + 1, workPath: undefined, resultPath: undefined, failure: { code: "IMPROVE_EXECUTION_FAILED", message: error instanceof Error ? error.message : String(error), at: now() } } });
            await saveImport(repositoryRoot, failed);
            throw error;
          }
        }
        return current;
      }
      if (current.continuation?.kind === "blocked") return current;
      if (current.continuation?.kind !== "wait" && !(current.continuation?.kind === "repair" && current.continuation.diagnosisRequired)) current = await ensureImportResearch(repositoryRoot, current);
      if (current.continuation?.kind === "blocked") return current;
      if (current.continuation?.kind === "repair") {
        const repair = current.continuation;
        const digest = await canonicalSubmissionFingerprint(current, repositoryRoot);
        if (digest === current.continuation.submittedFingerprint) throw new Error("UNCHANGED_SUBMISSION");
        if (current.continuation.diagnosisRequired) {
          const diagnosis = current.diagnoses?.find((d) => !d.consumedAt && d.remedyVerifiedAt && d.remedyCheck?.result === "verified" && d.stage === current.stage && d.failedSubmissionDigest === repair.submittedFingerprint && d.replacementSubmissionDigest === digest);
          if (!diagnosis) return current;
          diagnosis.consumedAt = now();
          await saveImport(repositoryRoot, current);
        }
      }
      if (current.continuation?.kind === "wait") {
        const currentTime = Date.now();
        if (currentTime >= Date.parse(current.continuation.timeoutAt)) return recordImportFailure(repositoryRoot, current, { strategy: "release", classification: "transient", message: "CAPABILITY_UNAVAILABLE: External dependency wait timed out; shared capability must be restored." });
        if (currentTime < Date.parse(current.continuation.nextCheckAt)) return current;
      }
      if (current.unusableReason) return quarantineUnusableImport(repositoryRoot, current);
      const record = await resumeImport(repositoryRoot, current);
      if (record.continuation?.kind === "blocked") return record;
      const group = strategyGroup(record.stage);
      const failures = record.strategyAttempts[group] ?? 0;
      const strategy = STRATEGIES[group][Math.min(Math.floor(failures / 3), STRATEGIES[group].length - 1)];
      const idempotencyKey = importPacketId(record, record.stage, strategy);
      await lease.assertOwned();
      let result: ExternalArticleImportV1;
      try {
        const runStage = () => execute({ record, stage: record.stage, strategy, attempt: failures % 3 + 1, idempotencyKey, leaseToken: lease.ownerToken, assertLease: lease.assertOwned });
        result = options?.executeStage ? await options.executeStage(record.stage, runStage) : await runStage();
      } catch (error) {
        await lease.assertOwned();
        const message = error instanceof Error ? error.message : String(error);
        const failureCategory = classifyImportFailure(error);
        const failedCheck = error instanceof ImportFailure ? error.failedCheck : undefined;
        const persisted = await loadImport(repositoryRoot, importId);
        if (persisted.stage === "LIVE" || persisted.stage === "QUARANTINED") throw error;
        const code = (error as NodeJS.ErrnoException).code;
        if (message === "RESEARCH_REGISTRY_PLAN_STALE") {
          const refreshed = externalArticleImportSchema.parse({ ...persisted, stageReceipts: [...persisted.stageReceipts, { stage: "RESEARCHING", status: "failed", at: now(), message: "RESEARCH_RECOVERY_REQUIRED: registry plan changed before writeback; preserve the prior packet and retrieve a fresh plan." }] });
          return recordImportFailure(repositoryRoot, refreshed, { strategy: group, classification: "transient", message });
        }
        if (failureCategory === "unavailable-capability" || failureCategory === "uncertain-external-outcome") {
          return recordImportFailure(repositoryRoot, persisted, { strategy: group, classification: "transient", failureCategory, message });
        }
        if (failureCategory === "content-rejection" || failureCategory === "invalid-evidence") {
          return recordImportRepair(repositoryRoot, persisted, { strategy: group, failureCategory, message, failedCheck });
        }
        if (message === "PUBLICATION_CATALOGUE_BUSY" || message === "RESEARCH_REGISTRY_SERIALIZATION_RETRY_EXHAUSTED" || ["EACCES", "EPERM", "EBUSY", "ENOSPC"].includes(code ?? "") || /^(network unavailable|credentials missing|rate limit|git unavailable|vercel timeout)$/i.test(message.trim())) {
          return recordImportFailure(repositoryRoot, persisted, { strategy: group, classification: "transient", message });
        }
        return recordImportRepair(repositoryRoot, persisted, { strategy: group, message, failedCheck });
      }
      if (result.importId !== importId || result.sourceFingerprint !== record.sourceFingerprint) throw new Error("Stage executor changed import identity.");
      await lease.assertOwned();
      if (options?.rejectBusy && ["LIVE", "QUARANTINED"].includes(result.stage) && !(await evaluateWorkflowEvidence(result, { root: repositoryRoot }, "historical-terminal")).ok) throw new Error("TERMINAL_PROOF_INVALID");
      await saveImport(repositoryRoot, result);
      return result;
    });
  } finally { await lease.release(); }
}

/** Executor output is repair work, not an external outage or an automatic quarantine. */
export async function recordImportRepair(repositoryRoot: string, record: ExternalArticleImportV1, input: { strategy: string; message: string; verifiedHeroRejection?: {
  decisionRef: EvidenceRef; heroEvidenceRef: EvidenceRef; assetRef: EvidenceRef; generationRef: EvidenceRef;
}; failureCategory?: ImportFailureCategory; failedCheck?: { code: string; criterionId?: string; criterionRevision?: string; settings?: Record<string, string> } }): Promise<ExternalArticleImportV1> {
  return withRecordLease(repositoryRoot, record, async () => {
    assertCurrentImport(record);
    const attemptKey = `repair:${input.strategy}:${fingerprint(input.message)}`;
    const attempt = (record.strategyAttempts[attemptKey] ?? 0) + 1;
    const attempts = { ...record.strategyAttempts, [attemptKey]: attempt };
    const at = now();
    const stageTotal = (record.repairStageTotals?.[record.resumeStage ?? record.stage] ?? 0) + 1;
    const diagnostic = stageTotal >= 3;
    const researchRecovery = record.stage === "RESEARCHING" || input.message.includes("ASSESSMENT_RULE_FAILED:claims") ? ` ${RESEARCH_RECOVERY_INSTRUCTION}` : "";
    const message = diagnostic ? `Three unchanged repair failures; diagnose before retrying. ${input.message}` : input.message;
    const submittedFingerprint = await canonicalSubmissionFingerprint(record, repositoryRoot);
    const failedWork = record.continuation?.kind === "work" && record.continuation.idempotencyKey ? { workPath: record.continuation.workPath, resultPath: record.continuation.resultPath, idempotencyKey: record.continuation.idempotencyKey, ...(record.continuation.activityId && { activityId: record.continuation.activityId }) } : record.continuation?.kind === "repair" ? record.continuation.failedWork : undefined;
    if (record.continuation?.kind === "repair" && record.continuation.submittedFingerprint === submittedFingerprint) return record;
    const verifiedHeroRejection = input.message === "ARTICLE_HERO_VISUAL_INSPECTION_FAILED" && record.heroImage && record.evidenceRefs?.hero && input.verifiedHeroRejection &&
      isDeepStrictEqual(input.verifiedHeroRejection.heroEvidenceRef, record.evidenceRefs.hero) &&
      isDeepStrictEqual(input.verifiedHeroRejection.assetRef, record.heroImage.assetRef) &&
      isDeepStrictEqual(input.verifiedHeroRejection.generationRef, record.heroImage.generationRef);
    if (verifiedHeroRejection) await verifyEvidenceRef(repositoryRoot, input.verifiedHeroRejection!.decisionRef);
    const rejectedHero = verifiedHeroRejection
      ? { heroImage: record.heroImage, heroEvidence: record.evidenceRefs?.hero, presentationEvidence: record.evidenceRefs?.presentation }
      : undefined;
    if (rejectedHero) {
      attempts["hero-generation"] = (record.strategyAttempts["hero-generation"] ?? 0) + 1;
    }
    const categoryAction = input.failureCategory === "invalid-evidence"
      ? "Repair and revalidate the rejected evidence."
      : input.failureCategory === "content-rejection"
        ? "Repair the rejected content and repeat its criterion check."
        : `Repair ${record.stage.toLowerCase()} output.`;
    const updated = externalArticleImportSchema.parse({ ...record,
      ...(rejectedHero && { heroImage: undefined, evidenceRefs: { ...record.evidenceRefs, hero: undefined, presentation: undefined }, presentation: undefined, pendingRelease: undefined, release: undefined }),
      repairStageTotals: { ...record.repairStageTotals, [record.resumeStage ?? record.stage]: stageTotal }, strategyAttempts: attempts, stage: record.stage, resumeStage: record.stage, blockerScope: "article", continuation: { kind: "repair", stage: record.stage, failureCategory: input.failureCategory, failureFingerprint: fingerprint(input.message), submittedFingerprint, failedCheck: input.failedCheck, failedEvidenceRefs: Object.values(record.evidenceRefs ?? {}).filter((ref): ref is EvidenceRef => ref !== undefined), failedWork, diagnosisRequired: diagnostic, requiredChange: rejectedHero ? "Generate a fresh hero through the next built-in ChatGPT ImageGen handoff and repeat exact-pixel visual inspection." : (diagnostic ? "Record a diagnosis with supporting evidence, a predicted observation, a disproof check and a separate verified remedy before retrying." : categoryAction) + researchRecovery, idempotencyKey: fingerprint(`${record.importId}:${record.sourceFingerprint}:${record.stage}`), sourceFingerprint: record.sourceFingerprint }, updatedAt: at,
      stageReceipts: [...record.stageReceipts, { stage: record.stage, status: "failed", at, message }],
      nextAction: rejectedHero ? `The rejected hero remains preserved in the failed receipt (${JSON.stringify(rejectedHero)}). Resume to generate and inspect a fresh image.` : (diagnostic ? "Record a falsifiable diagnosis and verify its remedy before retrying the same productive stage." : categoryAction) + researchRecovery,
    });
    await saveImport(repositoryRoot, updated);
    return updated;
  });
}

async function listAllImports(repositoryRoot: string): Promise<ExternalArticleImportV1[]> {
  let names: string[];
  try { names = await readdir(storeRoot(repositoryRoot)); } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
  const records: ExternalArticleImportV1[] = [];
  for (const name of names.filter((entry) => entry.endsWith(".json"))) {
    if (!/^article-[0-9a-f-]{36}\.json$/.test(name)) continue;
    const record = await loadImport(repositoryRoot, name.slice(0, -5));
    records.push(record);
  }
  return records.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function createArticleImport(repositoryRoot: string, sourceFile: string, allowlistFile = "approved-urls.md", expectedFingerprint?: string): Promise<ExternalArticleImportV1> {
  const absoluteSource = path.resolve(repositoryRoot, sourceFile);
  const raw = await readFile(absoluteSource);
  const parsed = parseExternalArticle(raw.toString("utf8"));
  const sourceFingerprint = fingerprint(raw);
  if (expectedFingerprint !== undefined && sourceFingerprint !== expectedFingerprint) throw new Error("INTAKE_SOURCE_MISMATCH");
  const claim = await claimWorkflowLease(repositoryRoot, "source", sourceFingerprint);
  if (!claim) throw new Error("SOURCE_CLAIM_BUSY");
  try {
    const indexPath = path.join(storeRoot(repositoryRoot), "source-index", `${sourceFingerprint}.json`);
    let reservation: { importId: string; sourceFingerprint: string; sourceRef: { path: string; sha256: string } } | undefined;
    try { reservation = JSON.parse(await readFile(indexPath, "utf8")); }
    catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; }
    if (reservation) {
      if (reservation.sourceFingerprint !== sourceFingerprint) throw new Error("SOURCE_RESERVATION_INVALID");
      const bytes = await readEvidenceBytes(repositoryRoot, reservation.sourceRef.path);
      if (fingerprint(bytes) !== sourceFingerprint || reservation.sourceRef.sha256 !== sourceFingerprint) throw new Error("SOURCE_RESERVATION_INVALID");
      try {
        const existing = await loadImport(repositoryRoot, reservation.importId);
        if (existing.sourceFingerprint !== sourceFingerprint) throw new Error("SOURCE_IDENTITY_CONFLICT");
        if (existing.stage === "LIVE") {
          const historical = await evaluateWorkflowEvidence(existing, { root: repositoryRoot }, "historical-terminal");
          if (!historical.ok) throw new Error("DUPLICATE_TERMINAL_PROOF_INVALID");
          const reusable = await evaluateWorkflowEvidence(existing, { root: repositoryRoot, throughStage: "LIVE" }, "duplicate-reuse");
          if (!reusable.ok) throw new Error(`DUPLICATE_REVALIDATION_REQUIRED:${reusable.earliestRequiredStage}`);
        }
        return existing;
      } catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; }
    } else {
      const existing = (await listAllImports(repositoryRoot)).filter((record) => record.sourceFingerprint === sourceFingerprint);
      if (existing.length > 1) throw new Error("SOURCE_IDENTITY_CONFLICT");
      const importId = existing[0]?.importId ?? `article-${randomUUID()}`;
      const relativeSource = `${ROOT}/evidence/${importId}/${sourceFingerprint}.source`;
      await mkdir(path.dirname(path.join(repositoryRoot, relativeSource)), { recursive: true });
      try { await writeFile(path.join(repositoryRoot, relativeSource), raw, { flag: "wx" }); }
      catch (e) { if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e; }
      reservation = { importId, sourceFingerprint, sourceRef: { path: relativeSource, sha256: sourceFingerprint } };
      await claim.assertOwned();
      await writeJsonAtomically(indexPath, reservation);
      if (existing[0]) {
        if (existing[0].stage === "LIVE" && !(await evaluateWorkflowEvidence(existing[0], { root: repositoryRoot, throughStage: "LIVE" }, "duplicate-reuse")).ok) throw new Error("DUPLICATE_REVALIDATION_REQUIRED");
        return existing[0];
      }
    }
    const allowlist = await readFile(path.resolve(repositoryRoot, allowlistFile), "utf8");
    const transformation = prepareTransformation(parsed, allowlist);
    const record = initialRecord({ importId: reservation.importId, sourceFile: absoluteSource, sourceFingerprint, parsed, transformation });
    record.sourceRef = reservation.sourceRef;
    await claim.assertOwned();
    const importLease = await claimImportLease(repositoryRoot, record.importId);
    if (!importLease) throw new Error("IMPORT_LEASE_BUSY");
    try {
      return await activeLease.run({ lease: importLease, importId: record.importId, root: await realpath(repositoryRoot) }, async () => {
        await importLease.assertOwned();
        await writeFile(sourcePath(repositoryRoot, record.importId), parsed.body, "utf8");
        if (record.unusableReason) return quarantineUnusableImport(repositoryRoot, record);
        await saveImport(repositoryRoot, record);
        return record;
      });
    } finally { await importLease.release(); }
  } finally { await claim.release(); }
}

const nextStage: Partial<Record<ImportStage, ImportStage>> = { INGESTING: "RESEARCHING", RESEARCHING: "TRANSFORMING", TRANSFORMING: "REFINING", REFINING: "VALIDATING", VALIDATING: "RELEASING" };

async function reconcileLegacyTransformingRequirements(repositoryRoot: string, record: ExternalArticleImportV1): Promise<ExternalArticleImportV1> {
  const effectiveStage = ["REPAIRING", "WAITING_EXTERNAL", "ROLLED_BACK"].includes(record.stage) ? record.resumeStage : record.stage;
  if (!effectiveStage || !["REFINING", "VALIDATING", "RELEASING", "VERIFYING"].includes(effectiveStage)) return record;
  const destination = approvedAffiliateUrl(record);
  if (!destination) return record;

  const transformAssessment = record.evidenceRefs?.transformAssessment;
  const retainedAssessmentRef = transformAssessment ?? record.evidenceRefs?.assessment;
  if (!retainedAssessmentRef) return record;
  const retained = contentAssessmentSchema.safeParse(await readEvidence(repositoryRoot, retainedAssessmentRef));
  if (!retained.success) throw new Error("LEGACY_TRANSFORMING_ASSESSMENT_INVALID");
  const accepted = longFormAffiliateAssessmentSchema.safeParse(retained.data.longFormAffiliate);
  if (transformAssessment && accepted.success && accepted.data.approvedAffiliateUrl === destination) return record;

  const at = now();
  if (record.pendingRelease || record.release) {
    const cause = "STATE_INTEGRITY: legacy Transforming assessment cannot be replaced while a release journal is active";
    const requirement = "Reconcile the existing release and its rollback target through explicit verified recovery before returning this import to Transforming.";
    if (record.continuation?.kind === "blocked" && record.continuation.cause === cause && record.continuation.resumptionRequirement === requirement) return record;
    const blocked = externalArticleImportSchema.parse({
      ...record,
      blockerScope: "shared",
      continuation: {
        kind: "blocked",
        scope: "shared",
        cause,
        attemptedRecovery: "Detected the pre-rule Transforming receipt and preserved the active release journal without starting new authoring work.",
        resumptionRequirement: requirement,
      },
      updatedAt: at,
      stageReceipts: [...record.stageReceipts, {
        stage: record.stage,
        status: "failed",
        at,
        message: "WORKFLOW_REQUIREMENT_MIGRATION_BLOCKED: active release journal and rollback target require explicit verified recovery.",
      }],
      nextAction: requirement,
    });
    await saveImport(repositoryRoot, blocked);
    return blocked;
  }
  const { research, ...invalidatedEvidenceRefs } = record.evidenceRefs ?? {};
  const prior = {
    stage: record.stage,
    resumeStage: record.resumeStage,
    continuation: record.continuation,
    transformAssessment,
    invalidatedEvidenceRefs,
    contentApproval: record.contentApproval,
    presentation: record.presentation,
    retainedReleaseJournal: { pendingRelease: Boolean(record.pendingRelease), release: Boolean(record.release) },
  };
  const updated = externalArticleImportSchema.parse({
    ...record,
    stage: "TRANSFORMING",
    resumeStage: undefined,
    continuation: undefined,
    blockerScope: undefined,
    evidenceRefs: research ? { research } : {},
    contentApproval: undefined,
    presentation: undefined,
    updatedAt: at,
    stageReceipts: [...record.stageReceipts, {
      stage: "TRANSFORMING",
      status: "started",
      at,
      message: `WORKFLOW_REQUIREMENT_MIGRATION: accepted long-form affiliate brief is missing; rebuild the Transforming assessment. Preserved prior state: ${JSON.stringify(prior)}`,
    }],
    nextAction: "Return to Transforming, retain the approved affiliate destination and research, and record the required five-field buyer brief before refinement.",
  });
  await saveImport(repositoryRoot, updated);
  return updated;
}

export async function approveImportContent(repositoryRoot: string, record: ExternalArticleImportV1, files: ApprovalFiles): Promise<ExternalArticleImportV1> {
  return withRecordLease(repositoryRoot, record, async () => {
    assertCurrentImport(record);
    const reconciled = await reconcileLegacyTransformingRequirements(repositoryRoot, record);
    if (reconciled !== record || reconciled.continuation?.kind === "blocked") return reconciled;
    const evaluated = await evaluateWorkflowEvidence(record, { root: repositoryRoot, throughStage: "VALIDATING", artifactPath: files.artifactPath }, "current-transition");
    if (!evaluated.ok) throw new Error(`WORKFLOW_EVIDENCE_INVALID:${JSON.stringify(evaluated.diagnostics)}`);
    if (record.stage !== "REFINING") throw new Error("Content approval requires REFINING.");
    const contentApproval = await createContentApproval(repositoryRoot, { ...files, format: record.format, sourceFingerprint: record.sourceFingerprint, approvedAffiliateUrl: record.transformation?.resolvedAffiliateUrl });
    const updated = externalArticleImportSchema.parse({ ...record, contentApproval, heroImage: undefined, evidenceRefs: { ...record.evidenceRefs, hero: undefined, presentation: undefined }, presentation: undefined, pendingRelease: undefined, release: undefined, updatedAt: now() });
    await saveImport(repositoryRoot, updated);
    return updated;
  });
}

export async function ensureImportContentApproval(repositoryRoot: string, record: ExternalArticleImportV1, artifactPath?: string): Promise<ExternalArticleImportV1> {
  return withRecordLease(repositoryRoot, record, async () => {
    assertCurrentImport(record);
    const reconciled = await reconcileLegacyTransformingRequirements(repositoryRoot, record);
    if (reconciled !== record || reconciled.continuation?.kind === "blocked") return reconciled;
    if (await contentApprovalMatches(repositoryRoot, record.contentApproval, record.format, record.sourceFingerprint, artifactPath, record.transformation?.resolvedAffiliateUrl)) return record;
    const at = now();
    const updated = externalArticleImportSchema.parse({ ...record, contentApproval: undefined, heroImage: undefined, evidenceRefs: { ...record.evidenceRefs, hero: undefined, presentation: undefined }, presentation: undefined, pendingRelease: undefined, release: undefined, resumeStage: undefined, stage: "REFINING", updatedAt: at,
      stageReceipts: [...record.stageReceipts, { stage: "REFINING", status: "failed", at, message: "Content approval is missing or no longer matches the artifact and evidence." }],
      nextAction: "Refine the current artifact and record fresh editorial and format quality approval.",
    });
    await saveImport(repositoryRoot, updated);
    return updated;
  });
}

export async function ensureImportPresentation(repositoryRoot: string, record: ExternalArticleImportV1): Promise<ExternalArticleImportV1> {
  return ensureImportPresentationWith(repositoryRoot, record, () => verifyImportPresentationEvidence(repositoryRoot, record));
}

async function ensureImportPresentationBinding(repositoryRoot: string, record: ExternalArticleImportV1): Promise<ExternalArticleImportV1> {
  return ensureImportPresentationWith(repositoryRoot, record, async () => requireImportPresentationBinding(record));
}

async function ensureImportPresentationWith(repositoryRoot: string, record: ExternalArticleImportV1, verify: () => Promise<void>): Promise<ExternalArticleImportV1> {
  return withRecordLease(repositoryRoot, record, async () => {
    assertCurrentImport(record);
    try {
      await verify();
      return record;
    } catch {
      const at = now();
      const updated = externalArticleImportSchema.parse({ ...record, presentation: undefined, pendingRelease: undefined, release: undefined, resumeStage: undefined, stage: "VALIDATING", updatedAt: at,
        stageReceipts: [...record.stageReceipts, { stage: "VALIDATING", status: "failed", at, message: "Presentation evidence is missing or no longer matches the approved content." }],
        nextAction: "Render the approved content without changing its words and record fresh presentation evidence.",
      });
      await saveImport(repositoryRoot, updated);
      return updated;
    }
  });
}

export async function recordImportPresentation(repositoryRoot: string, record: ExternalArticleImportV1, input: { validationGate: string; validationReceipt: unknown }): Promise<ExternalArticleImportV1> {
  return withRecordLease(repositoryRoot, record, async () => {
    if (record.stage !== "VALIDATING") throw new Error("Presentation evidence can only be recorded from VALIDATING.");
    const checked = await ensureImportContentApproval(repositoryRoot, record);
    if (!checked.contentApproval) return checked;
    const presentation = await createImportPresentation(repositoryRoot, checked, input);
    const at = now();
    const updated = externalArticleImportSchema.parse({ ...checked, presentation, pendingRelease: undefined, release: undefined, updatedAt: at,
      stageReceipts: [...checked.stageReceipts, { stage: "VALIDATING", status: "passed", at, message: "Presentation evidence recorded for the approved content fingerprint." }],
      nextAction: "Advance to release without changing the approved words.",
    });
    await saveImport(repositoryRoot, updated);
    return updated;
  });
}

export async function advanceImport(repositoryRoot: string, record: ExternalArticleImportV1, message: string): Promise<ExternalArticleImportV1> {
  return withRecordLease(repositoryRoot, record, async () => {
    assertCurrentImport(record);
    if (record.unusableReason) return quarantineUnusableImport(repositoryRoot, record);
    const reconciled = await reconcileLegacyTransformingRequirements(repositoryRoot, record);
    if (reconciled !== record || reconciled.continuation?.kind === "blocked") return reconciled;
    const stage = nextStage[record.stage];
    if (!stage) throw new Error("Stage " + record.stage + " cannot advance automatically.");
    if (["VALIDATING", "RELEASING"].includes(stage) && record.contentApproval
        && !(await formatQualityApprovalMatches(repositoryRoot, record.contentApproval, record.format, record.sourceFingerprint))) {
      return ensureImportContentApproval(repositoryRoot, record);
    }
    const evidence = await evaluateWorkflowEvidence(record, { root: repositoryRoot, throughStage: stage }, "current-transition");
    if (!evidence.ok) throw new Error(`WORKFLOW_EVIDENCE_INVALID:${JSON.stringify(evidence.diagnostics)}`);
    if (["VALIDATING", "RELEASING"].includes(stage)) {
      const checked = await ensureImportContentApproval(repositoryRoot, record);
      if (!checked.contentApproval) return checked;
      record = checked;
    }
    if (stage === "RELEASING") {
      const checked = await ensureImportPresentation(repositoryRoot, record);
      if (!checked.presentation) return checked;
      record = checked;
    }
    const at = now();
    const handoff = await declareGateHandoff(repositoryRoot, record, record.stage, stage);
    const updated = externalArticleImportSchema.parse({ ...record, gateHandoffs: [...(record.gateHandoffs ?? []), handoff], continuation: undefined, resumeStage: undefined, blockerScope: undefined, stage, updatedAt: at, stageReceipts: [...record.stageReceipts, { stage, status: "passed", at, message }], nextAction: "Complete " + stage.toLowerCase() + " and record its receipt." });
    await saveImport(repositoryRoot, updated);
    return updated;
  });
}

async function quarantineUnusableImport(repositoryRoot: string, record: ExternalArticleImportV1): Promise<ExternalArticleImportV1> {
  assertCurrentImport(record);
  if (!record.sourceRef || !record.unusableReason) throw new Error("QUARANTINE_PROOF_REQUIRED");
  const captured = await readEvidenceBytes(repositoryRoot, record.sourceRef.path);
  if (fingerprint(captured) !== record.sourceFingerprint || !parseExternalArticle(captured.toString("utf8")).unusableReason) throw new Error("QUARANTINE_PROOF_INVALID");
  const at = now();
  const dispositionEvidenceRef = await storeEvidence(repositoryRoot, record.importId, { sourceFingerprint: record.sourceFingerprint, reasonCode: "empty", reason: record.unusableReason });
  const terminalRef = await storeEvidence(repositoryRoot, record.importId, { schemaVersion: "TerminalEvidenceV1", id: randomUUID(), createdAt: at, importId: record.importId, originImportId: record.importId, sourceFingerprint: record.sourceFingerprint, requirementRevision: record.requirementRevision, sourceRef: record.sourceRef, completedAt: at, kind: "quarantine", reasonCode: "empty", dispositionEvidenceRef });
  const updated = externalArticleImportSchema.parse({ ...record, terminalRef, continuation: { kind: "complete", result: "QUARANTINED", receiptPaths: [terminalRef.path] }, stage: "QUARANTINED", updatedAt: at,
    stageReceipts: [...record.stageReceipts, { stage: "QUARANTINED", status: "quarantined", at, message: record.unusableReason }], nextAction: "none",
  });
  await saveImport(repositoryRoot, updated);
  return deleteRawSource(repositoryRoot, updated.importId, updated, at);
}

export async function recordImportRelease(repositoryRoot: string, record: ExternalArticleImportV1, releaseInput: unknown): Promise<ExternalArticleImportV1> {
  return withRecordLease(repositoryRoot, record, async () => {
    assertCurrentImport(record);
    if (record.stage !== "RELEASING") throw new Error("A release receipt can only be recorded from RELEASING.");
    const checked = await ensureImportContentApproval(repositoryRoot, record);
    if (!checked.contentApproval) return checked;
    const release = externalArticleImportSchema.shape.release.unwrap().parse(releaseInput);
    if (!release.productionVerifierRef) throw new Error("PRODUCTION_VERIFIER_EVIDENCE_REQUIRED");
    const presented = await ensureImportPresentationBinding(repositoryRoot, { ...checked, release });
    if (!presented.presentation) return presented;
    const at = now();
    const released = externalArticleImportSchema.parse({ ...presented, evidenceRefs: { ...presented.evidenceRefs, production: release.productionVerifierRef }, release });
    const handoff = await declareGateHandoff(repositoryRoot, released, "RELEASING", "VERIFYING");
    const updated = externalArticleImportSchema.parse({ ...released, gateHandoffs: [...(released.gateHandoffs ?? []), handoff], stage: "VERIFYING", updatedAt: at, stageReceipts: [...released.stageReceipts, { stage: "VERIFYING", status: "started", at, message: "Release receipt recorded; production verification is required." }], nextAction: instructionsForStage("VERIFYING") });
    await saveImport(repositoryRoot, updated);
    return updated;
  });
}

export async function verifyImportRelease(repositoryRoot: string, record: ExternalArticleImportV1, options?: { reviewEvidenceRegistry?: ArticleReviewEvidenceRegistry }): Promise<ExternalArticleImportV1> {
  return withRecordLease(repositoryRoot, record, async () => {
    assertCurrentImport(record);
    if (record.stage !== "VERIFYING" || !record.release) throw new Error("A validated release receipt is required before production verification.");
    const release = externalArticleImportSchema.shape.release.unwrap().parse(record.release);
    const presented = await ensureImportPresentation(repositoryRoot, { ...record, release });
    if (!presented.presentation) return presented;

    if (!release.productionVerifierRef || release.productionVerifierRef.path !== record.evidenceRefs?.production?.path || release.productionVerifierRef.sha256 !== record.evidenceRefs.production.sha256) throw new Error("TERMINAL_PRODUCTION_REFERENCE_MISMATCH");
    let production;
    try { production = await validateProductionWorkflowEvidence(repositoryRoot, record); }
    catch (error) { throw new Error(`TERMINAL_PROOF_INVALID:${JSON.stringify([error instanceof Error ? error.message : String(error)])}`); }
    if (!record.sourceRef || !record.contentApproval) throw new Error("TERMINAL_PROOF_INVALID");
    const at = now();
    const operations = record.pendingRelease?.operations;
    const merge = operations?.merge, review = operations?.review, deployment = operations?.deployment;
    if (!merge || !review || merge.reviewedHeadSha !== review.reviewedHeadSha || merge.mergeCommitSha !== release.commitSha ||
        record.pendingRelease?.reviewedCommitSha !== review.reviewedHeadSha || !record.pendingRelease.pullRequestUrl) throw new Error("TERMINAL_MERGE_PROOF_INVALID");
    if (deployment && (deployment.commitSha !== merge.mergeCommitSha || deployment.deploymentId !== release.deploymentId || deployment.url !== release.canonicalUrl)) throw new Error("TERMINAL_DEPLOYMENT_PROOF_INVALID");
    if (record.reviewEvidence && !options?.reviewEvidenceRegistry) throw new Error("PUBLICATION_APPROVAL_REGISTRY_REQUIRED");
    const publicationApproval = options?.reviewEvidenceRegistry ? {
      catalogue: await registerPublicationApproval(repositoryRoot, options.reviewEvidenceRegistry, record, "catalogue", at),
      import: await registerPublicationApproval(repositoryRoot, options.reviewEvidenceRegistry, record, "import", at),
    } : record.publicationApproval;
    const artifactRef = await storeEvidence(repositoryRoot, record.importId, production.artifact);
    const mergeEvidenceRef = await storeEvidence(repositoryRoot, record.importId, { reviewedCommitSha: merge.reviewedHeadSha, mergeCommitSha: merge.mergeCommitSha, pullRequestUrl: record.pendingRelease.pullRequestUrl, evidenceUrl: review.evidenceUrl });
    const frozenFiles = await freezeEvidenceGraph(repositoryRoot, record.importId, [record.sourceRef, artifactRef, mergeEvidenceRef, ...Object.values(record.evidenceRefs ?? {}).filter((ref): ref is { path: string; sha256: string } => ref !== undefined)]);
    const retainedHero = record.heroImage ?? (record.evidenceRefs?.hero ? articleHeroBindingSchema.parse(await readEvidence(repositoryRoot, record.evidenceRefs.hero)) : undefined);
    const terminalRef = await storeEvidence(repositoryRoot, record.importId, { schemaVersion: "TerminalEvidenceV1", id: randomUUID(), createdAt: at, importId: record.importId, originImportId: record.importId, sourceFingerprint: record.sourceFingerprint, requirementRevision: record.requirementRevision, sourceRef: record.sourceRef, completedAt: at, kind: "live", researchGeneration: researchRecoveryGeneration(record), artifactRef, evidenceRefs: record.evidenceRefs, ...(retainedHero && { heroImage: retainedHero }), ...(publicationApproval && { publicationApproval }), frozenFiles, format: record.format, commercialMode: record.transformation?.commercialMode ?? "none", ...(record.transformation?.resolvedAffiliateUrl && { approvedAffiliateUrl: record.transformation.resolvedAffiliateUrl }), reviewedCommitSha: record.pendingRelease.reviewedCommitSha, mergeCommitSha: merge.mergeCommitSha, mergeEvidenceRef, deployment: { deploymentId: release.deploymentId, canonicalUrl: release.canonicalUrl, commitSha: release.commitSha } });
    const publicationKey = fingerprint(`${record.importId}:${release.commitSha}`);
    const runRef = await storeEvidence(repositoryRoot, record.importId, { schemaVersion: "ImproveRunSnapshotV1", publicationKey, importId: record.importId, sourceFingerprint: record.sourceFingerprint, stageReceipts: record.stageReceipts, repairStageTotals: record.repairStageTotals, strategyAttempts: record.strategyAttempts, pendingRelease: record.pendingRelease, release, terminalRef });
    const improve = { schemaVersion: "ImportImproveV1" as const, publicationKey, boundCommitSha: release.commitSha, runRef, phase: "ASSESSING" as const, attempt: 0, issueKeys: [], resolvedKeys: [], openKeys: [], handoffRefs: [] };
    const verified = externalArticleImportSchema.parse({ ...presented, ...(publicationApproval && { publicationApproval }), terminalRef, improve });
    const handoff = await declareGateHandoff(repositoryRoot, verified, "VERIFYING", "LIVE");
    const updated = externalArticleImportSchema.parse({ ...verified, gateHandoffs: [...(verified.gateHandoffs ?? []), handoff], continuation: { kind: "complete", result: "LIVE", receiptPaths: [terminalRef.path] }, stage: "LIVE", updatedAt: at, stageReceipts: [...verified.stageReceipts, { stage: "LIVE", status: "passed", at, message: "All production checks passed." }], nextAction: "none" });
    const historical = await evaluateWorkflowEvidence(updated, { root: repositoryRoot }, "historical-terminal");
    if (!historical.ok) throw new Error(`TERMINAL_PROOF_INVALID:${JSON.stringify(historical.diagnostics)}`);
    await saveImport(repositoryRoot, updated);
    return deleteRawSource(repositoryRoot, updated.importId, updated, at);
  });
}

/** Invalid research invalidates every dependent approval before more work or release side effects. */
async function ensureImportResearch(repositoryRoot: string, record: ExternalArticleImportV1): Promise<ExternalArticleImportV1> {
  const productiveStage = ["REPAIRING", "WAITING_EXTERNAL", "ROLLED_BACK"].includes(record.stage) ? record.resumeStage : record.stage;
  if (!productiveStage || !["TRANSFORMING", "REFINING", "VALIDATING", "RELEASING", "VERIFYING"].includes(productiveStage)) return record;
  try {
    if (!record.evidenceRefs?.research) throw new Error("WORKFLOW_EVIDENCE_REQUIRED:research");
    await validateResearchEvidence(repositoryRoot, record.evidenceRefs.research, record);
    const lastFailure = record.stageReceipts.at(-1);
    if (lastFailure?.status === "failed" && lastFailure.message.includes("ASSESSMENT_RULE_FAILED:claims")) throw new Error("ASSESSMENT_RULE_FAILED:claims");
    return record;
  } catch (error) {
    if (["EACCES", "EPERM", "EBUSY", "ENOSPC"].includes((error as NodeJS.ErrnoException).code ?? "")) throw error;
    const at = now();
    const cause = error instanceof Error ? error.message : String(error);
    if (record.pendingRelease || record.release) {
      const blocked = externalArticleImportSchema.parse({ ...record, updatedAt: at, blockerScope: "shared",
        continuation: { kind: "blocked", scope: "shared", cause: `STATE_INTEGRITY: research failed during an existing release: ${cause}`,
          attemptedRecovery: "Revalidated retained research and preserved the existing release journal and rollback target.",
          resumptionRequirement: "Conduct research and restore authentic, matching research evidence for this release; reconcile any merged or deployed attempt and its rollback target before explicit verified recovery." },
        stageReceipts: [...record.stageReceipts, { stage: record.stage, status: "failed", at, message: `RESEARCH_RECOVERY_REQUIRED: ${cause}. Existing release requires verified integrity recovery.` }],
        nextAction: `${RESEARCH_RECOVERY_INSTRUCTION} Preserve the existing release journal and rollback target; complete explicit verified recovery before further release actions.`,
      });
      await saveImport(repositoryRoot, blocked);
      return blocked;
    }
    // Retain the prior references in history; the files themselves are never deleted.
    const prior = { stage: record.stage, evidenceRefs: record.evidenceRefs, contentApproval: record.contentApproval, presentation: record.presentation, pendingRelease: record.pendingRelease, release: record.release };
    const updated = externalArticleImportSchema.parse({ ...record, stage: "RESEARCHING", resumeStage: undefined,
      evidenceRefs: {}, contentApproval: undefined, heroImage: undefined, presentation: undefined, pendingRelease: undefined, release: undefined,
      continuation: undefined, blockerScope: undefined, updatedAt: at,
      stageReceipts: [...record.stageReceipts, { stage: "RESEARCHING", status: "failed", at,
        message: `RESEARCH_RECOVERY_REQUIRED: ${cause}. Invalidated dependent evidence: ${JSON.stringify(prior)}` }],
      nextAction: RESEARCH_RECOVERY_INSTRUCTION,
    });
    await saveImport(repositoryRoot, updated);
    return updated;
  }
}

export async function resumeImport(repositoryRoot: string, record: ExternalArticleImportV1): Promise<ExternalArticleImportV1> {
  return withRecordLease(repositoryRoot, record, async () => {
    assertCurrentImport(record);
    record = await ensureImportResearch(repositoryRoot, record);
    if (record.continuation?.kind === "blocked") return record;
    const reconciled = await reconcileLegacyTransformingRequirements(repositoryRoot, record);
    if (reconciled !== record || reconciled.continuation?.kind === "blocked") return reconciled;
    if (["VALIDATING", "RELEASING", "VERIFYING"].includes(record.resumeStage ?? record.stage)) {
      const checked = await ensureImportContentApproval(repositoryRoot, record);
      if (!checked.contentApproval) return checked;
      record = checked;
    }
    if (["RELEASING", "VERIFYING"].includes(record.resumeStage ?? record.stage)) {
      const checked = await ensureImportPresentation(repositoryRoot, record);
      if (!checked.presentation) return checked;
      record = checked;
    }
    if (!["WAITING_EXTERNAL", "REPAIRING", "ROLLED_BACK"].includes(record.stage)) return record;
    const stage = record.resumeStage;
    if (!stage || ["REPAIRING", "WAITING_EXTERNAL", "ROLLED_BACK", "LIVE", "QUARANTINED"].includes(stage)) {
      throw new Error("Recovery receipt does not identify a productive resume stage.");
    }
    const at = now();
    const updated = externalArticleImportSchema.parse({ ...record, stage, updatedAt: at, stageReceipts: [...record.stageReceipts, { stage, status: "started", at, message: "Resumed from " + record.stage + " using the recorded productive stage." }], nextAction: "Retry " + stage.toLowerCase() + " using the next recorded strategy." });
    await saveImport(repositoryRoot, updated);
    return updated;
  });
}
export async function recordImportFailure(repositoryRoot: string, record: ExternalArticleImportV1, input: { strategy: string; classification: FailureClass; failureCategory?: ImportFailureCategory; message: string; failedCheck?: { code: string; criterionId?: string; criterionRevision?: string; settings?: Record<string, string> } }): Promise<ExternalArticleImportV1> {
  return withRecordLease(repositoryRoot, record, async () => {
    if (input.classification !== "transient") return recordImportRepair(repositoryRoot, record, input);
    const attemptKey = input.classification === "transient" ? `transient:${input.strategy}` : input.strategy;
    const attempt = (record.strategyAttempts[attemptKey] ?? 0) + 1;
    const attempts = { ...record.strategyAttempts, [attemptKey]: attempt };
    const strategies = STRATEGIES[input.strategy] ?? ["retry", "alternate", "quarantine"];
    const next = strategies[Math.floor(attempt / 3)] ?? "quarantine";
    const at = now();
    const exhausted = next === "quarantine";
    const stage: ImportStage = input.classification === "transient" ? "WAITING_EXTERNAL" : exhausted ? "QUARANTINED" : "REPAIRING";
    const resumeStage = stage === "REPAIRING" || stage === "WAITING_EXTERNAL" ? (record.stage === "REPAIRING" || record.stage === "WAITING_EXTERNAL" ? record.resumeStage : record.stage) : record.resumeStage;
    const capabilityBlock = input.classification === "transient" && (input.failureCategory === "unavailable-capability" || input.failureCategory === "uncertain-external-outcome" || /credentials missing|git unavailable|model[ _]access|editorial[ _]tool|integrity|vercel timeout|CAPABILITY_UNAVAILABLE|SOURCE_IDENTITY_CONFLICT|LEASE_OWNER_CHANGED/i.test(input.message));
    const previousWait = record.continuation?.kind === "wait" ? record.continuation : undefined;
    const blockedAction = input.failureCategory === "uncertain-external-outcome"
      ? { requirement: "Reconcile the external operation identity and observed outcome before any retry.", next: "Reconcile the uncertain external outcome before retrying this operation." }
      : { requirement: "Restore the shared capability and verify it independently before resuming.", next: "Restore the unavailable shared capability and verify the remedy before resuming." };
    const continuation = capabilityBlock ? { kind: "blocked" as const, scope: "shared" as const, failureCategory: input.failureCategory, cause: input.message, attemptedRecovery: "Recorded the failed operation and preserved the import state.", resumptionRequirement: blockedAction.requirement } : stage === "WAITING_EXTERNAL" ? { kind: "wait" as const, resumeStage: resumeStage ?? record.stage, dependency: input.message, waitStartedAt: previousWait?.waitStartedAt ?? at, lastProgressAt: at, nextCheckAt: new Date(Date.now() + (previousWait ? ARTICLE_WAIT_POLICY.subsequentCheckMs : ARTICLE_WAIT_POLICY.firstCheckMs)).toISOString(), timeoutAt: previousWait?.timeoutAt ?? new Date(Date.now() + ARTICLE_WAIT_POLICY.timeoutMs).toISOString() } : stage === "REPAIRING" ? { kind: "repair" as const, stage: resumeStage ?? record.stage, failureCategory: input.failureCategory, failureFingerprint: fingerprint(input.message), submittedFingerprint: await canonicalSubmissionFingerprint(record, repositoryRoot), failedEvidenceRefs: Object.values(record.evidenceRefs ?? {}).filter((ref): ref is EvidenceRef => ref !== undefined), diagnosisRequired: attempt >= 3, requiredChange: attempt >= 3 ? "Record a diagnosis receipt before retrying." : `Repair ${record.stage.toLowerCase()} output.`, idempotencyKey: fingerprint(`${record.importId}:${record.sourceFingerprint}:${record.stage}`), sourceFingerprint: record.sourceFingerprint } : undefined;
    const updated = externalArticleImportSchema.parse({ ...record, stage, ...(resumeStage ? { resumeStage } : {}), blockerScope: input.classification === "transient" ? "shared" : "article", continuation, updatedAt: at, strategyAttempts: attempts, stageReceipts: [...record.stageReceipts, { stage, status: stage === "WAITING_EXTERNAL" ? "waiting" : stage === "QUARANTINED" ? "quarantined" : "failed", at, message: input.message }], nextAction: capabilityBlock ? blockedAction.next : stage === "WAITING_EXTERNAL" ? "Heartbeat: retry after external dependency recovers." : stage === "QUARANTINED" ? "none" : `Apply strategy ${next}.` });
    await saveImport(repositoryRoot, updated);
    if (stage === "QUARANTINED") return deleteRawSource(repositoryRoot, updated.importId, updated, at);
    return updated;
  });
}

async function deleteRawSource(repositoryRoot: string, importId: string, record: ExternalArticleImportV1, at: string): Promise<ExternalArticleImportV1> {
  try { await unlink(sourcePath(repositoryRoot, importId)); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  const updated = externalArticleImportSchema.parse({ ...record, sourceDeletedAt: at });
  await saveImport(repositoryRoot, updated);
  return updated;
}

export async function upgradeImportEvidence(root: string, importId: string): Promise<ExternalArticleImportV1> {
  const lease = await claimImportLease(root, importId);
  if (!lease) throw new Error("IMPORT_BUSY");
  try { return await activeLease.run({ lease, importId, root: await realpath(root) }, async () => {
    const record = await loadImport(root, importId);
    if (record.schemaVersion === "ExternalArticleImportV2") return record;
    const bytes = await readFile(recordPath(root, importId));
    const archive = path.join(storeRoot(root), "archives", `${importId}-${fingerprint(bytes)}.json`);
    await mkdir(path.dirname(archive), { recursive: true });
    await writeFile(archive, bytes, { flag: "wx" }).catch((e: NodeJS.ErrnoException) => { if (e.code !== "EEXIST") throw e; });
    const raw = await readFile(record.sourceFile);
    if (fingerprint(raw) !== record.sourceFingerprint) throw new Error("SOURCE_IDENTITY_CONFLICT");
    const source = `${ROOT}/evidence/${importId}/${record.sourceFingerprint}.source`;
    await mkdir(path.dirname(path.resolve(root, source)), { recursive: true });
    await writeFile(path.resolve(root, source), raw, { flag: "wx" }).catch((e: NodeJS.ErrnoException) => { if (e.code !== "EEXIST") throw e; });
    const totals: Record<string, number> = {};
    for (const receipt of record.stageReceipts) if (receipt.status === "failed") {
      if (!["INGESTING", "RESEARCHING", "TRANSFORMING", "REFINING", "VALIDATING", "RELEASING", "VERIFYING"].includes(receipt.stage)) throw new Error("REPAIR_HISTORY_INCOMPLETE");
      totals[receipt.stage] = (totals[receipt.stage] ?? 0) + 1;
    }
    const attemptedRepairs = Object.entries(record.strategyAttempts).filter(([key]) => key.startsWith("repair:")).reduce((sum, [, count]) => sum + count, 0);
    if (attemptedRepairs > record.stageReceipts.filter((r) => r.status === "failed").length) throw new Error("REPAIR_HISTORY_INCOMPLETE");
    const updated = externalArticleImportSchema.parse({ ...record, schemaVersion: "ExternalArticleImportV2", workflowVersion: 2, requirementRevision: WORKFLOW_REVISION, sourceRef: { path: source, sha256: record.sourceFingerprint }, evidenceRefs: {}, diagnoses: [], repairStageTotals: totals, stage: "RESEARCHING", resumeStage: undefined, continuation: undefined, contentApproval: undefined, heroImage: undefined, presentation: undefined, pendingRelease: undefined, release: undefined, terminalRef: undefined, nextAction: "Legacy evidence archived; complete current research requirements before advancing.", updatedAt: now() });
    await saveImport(root, updated);
    return updated;
  }); } finally { await lease.release(); }
}

async function verifiedRemedyEvidence(root: string, ref: EvidenceRef, diagnosis: ReturnType<typeof actionableDiagnosisSchema.parse>, record: ExternalArticleImportV1) {
  const evidence = remedyVerificationEvidenceSchema.parse(await readEvidence(root, ref));
  if (evidence.importId !== diagnosis.importId || evidence.sourceFingerprint !== diagnosis.sourceFingerprint || evidence.stage !== diagnosis.stage || evidence.failedSubmissionDigest !== diagnosis.failedSubmissionDigest || evidence.replacementSubmissionDigest !== diagnosis.replacementSubmissionDigest) throw new Error("DIAGNOSIS_REMEDY_BINDING_MISMATCH");
  let pendingArtifactPath: string | undefined;
  let pendingEditorialRef: EvidenceRef | undefined;
  let pendingReleaseWork: { artifactPath: string; changedFiles: string[]; slug?: string } | undefined;
  let actualEvidenceRef: EvidenceRef | undefined;
  if (record.continuation?.kind === "repair" && record.continuation.failedWork) {
    const resultFile = path.resolve(root, record.continuation.failedWork.resultPath);
    const relative = path.relative(await realpath(root), await realpath(resultFile));
    if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("DIAGNOSIS_REMEDY_RESULT_PATH_INVALID");
    const result = JSON.parse(await readFile(resultFile, "utf8")) as { idempotencyKey?: unknown; sourceFingerprint?: unknown; work?: { stage?: unknown; evidencePath?: unknown; artifactPath?: unknown; assessmentPath?: unknown; editorialExecutionPath?: unknown; presentationEvidencePath?: unknown; changedFiles?: unknown; slug?: unknown } };
    if (result.idempotencyKey !== record.continuation.failedWork.idempotencyKey || result.sourceFingerprint !== record.sourceFingerprint || result.work?.stage !== diagnosis.stage) throw new Error("DIAGNOSIS_REMEDY_RESULT_BINDING_MISMATCH");
    const evidencePath = diagnosis.stage === "RESEARCHING" ? result.work.evidencePath : diagnosis.stage === "TRANSFORMING" || diagnosis.stage === "REFINING" ? result.work.assessmentPath : diagnosis.stage === "VALIDATING" ? result.work.presentationEvidencePath : undefined;
    if (typeof evidencePath === "string") actualEvidenceRef = await evidenceReference(root, evidencePath);
    if (typeof result.work.artifactPath === "string") pendingArtifactPath = result.work.artifactPath;
    if (diagnosis.stage === "REFINING" && typeof result.work.editorialExecutionPath === "string") pendingEditorialRef = await evidenceReference(root, result.work.editorialExecutionPath);
    if (diagnosis.stage === "RELEASING" && typeof result.work.artifactPath === "string" && Array.isArray(result.work.changedFiles) && result.work.changedFiles.every((file) => typeof file === "string")) {
      pendingReleaseWork = { artifactPath: result.work.artifactPath, changedFiles: result.work.changedFiles as string[], ...(typeof result.work.slug === "string" && { slug: result.work.slug }) };
      actualEvidenceRef = await evidenceReference(root, record.continuation.failedWork.resultPath);
    }
  }
  const binding = { ...record, artifactPath: pendingArtifactPath ?? record.artifactPath ?? record.contentApproval?.artifactPath, requirementRevision: WORKFLOW_REVISION };
  actualEvidenceRef ??= diagnosis.stage === "RESEARCHING" ? record.evidenceRefs?.research
    : diagnosis.stage === "TRANSFORMING" ? record.evidenceRefs?.transformAssessment
      : diagnosis.stage === "REFINING" ? record.evidenceRefs?.assessment
        : diagnosis.stage === "VALIDATING" ? record.evidenceRefs?.presentation : undefined;
  if (!actualEvidenceRef || !isDeepStrictEqual(actualEvidenceRef, evidence.validatedEvidenceRef)) throw new Error("DIAGNOSIS_REMEDY_REPLACEMENT_EVIDENCE_MISMATCH");
  if (diagnosis.stage === "RESEARCHING" && evidence.criterion.id === "research-evidence" && evidence.criterion.revision === WORKFLOW_REVISION) await validateResearchEvidence(root, actualEvidenceRef, binding);
  else if (["TRANSFORMING", "REFINING"].includes(diagnosis.stage) && evidence.criterion.id === "content-assessment" && evidence.criterion.revision === WORKFLOW_REVISION) {
    await validateContentAssessment(root, actualEvidenceRef, binding);
    if (diagnosis.stage === "REFINING") {
      if (!pendingEditorialRef || !evidence.relatedEvidenceRefs?.some((candidate) => isDeepStrictEqual(candidate, pendingEditorialRef))) throw new Error("DIAGNOSIS_REMEDY_EDITORIAL_EVIDENCE_MISMATCH");
      await validateEditorialExecution(root, pendingEditorialRef, binding);
    }
  }
  else if (diagnosis.stage === "VALIDATING" && evidence.criterion.id === "presentation-evidence" && evidence.criterion.revision === WORKFLOW_REVISION) await validatePresentationEvidence(root, actualEvidenceRef, binding);
  else if (diagnosis.stage === "RELEASING" && evidence.criterion.id === "release-result" && evidence.criterion.revision === WORKFLOW_REVISION && pendingReleaseWork) {
    if (record.continuation?.kind !== "repair" || record.continuation.failedCheck?.code !== "RELEASE_DECLARATION") throw new Error("DIAGNOSIS_RELEASE_CHECK_UNSUPPORTED");
    const target = await readImportArtifactTarget(root, record.format, pendingReleaseWork.artifactPath, pendingReleaseWork.slug);
    const release = await import("./release");
    if (release.validateReleasePaths(pendingReleaseWork.changedFiles, record.format).length) throw new Error("DIAGNOSIS_RELEASE_PATHS_INVALID");
    if (record.format === "agent_review_required") throw new Error("DIAGNOSIS_RELEASE_FORMAT_UNSUPPORTED");
    const required = release.requiredImportReleaseFiles({ format: record.format, approvedArtifactPath: pendingReleaseWork.artifactPath, slug: target.target.slug, includeHero: Boolean(record.heroImage) });
    if (required.all.some((file) => !pendingReleaseWork!.changedFiles.includes(file))) throw new Error("DIAGNOSIS_RELEASE_REQUIRED_PATH_MISSING");
  }
  else throw new Error("DIAGNOSIS_REMEDY_CRITERION_NOT_ALLOWED");
  return { evidence, actualEvidenceRef, check: { method: "deterministic" as const, result: "verified" as const, observation: `Controller ${evidence.criterion.id} validator passed revision ${evidence.criterion.revision}.` } };
}

async function verifiedMeasurementChange(root: string, ref: EvidenceRef, diagnosis: ReturnType<typeof actionableDiagnosisSchema.parse>, record: ExternalArticleImportV1, replacementPresentationRef?: EvidenceRef) {
  const evidence = remedyMeasurementVerificationSchema.parse(await readEvidence(root, ref));
  if (evidence.importId !== diagnosis.importId || evidence.sourceFingerprint !== diagnosis.sourceFingerprint || evidence.stage !== diagnosis.stage || evidence.failedSubmissionDigest !== diagnosis.failedSubmissionDigest || evidence.replacementSubmissionDigest !== diagnosis.replacementSubmissionDigest) throw new Error("DIAGNOSIS_MEASUREMENT_BINDING_MISMATCH");
  if (evidence.criterion.revision !== WORKFLOW_REVISION) throw new Error("DIAGNOSIS_MEASUREMENT_CRITERION_MISMATCH");
  if (record.continuation?.kind !== "repair" || !record.continuation.failedEvidenceRefs?.some((failed) => isDeepStrictEqual(failed, evidence.previousPresentationRef))) throw new Error("DIAGNOSIS_MEASUREMENT_PRIOR_EVIDENCE_MISMATCH");
  if (!replacementPresentationRef || !isDeepStrictEqual(replacementPresentationRef, evidence.currentPresentationRef)) throw new Error("DIAGNOSIS_MEASUREMENT_REPLACEMENT_EVIDENCE_MISMATCH");
  const previous = workflowEvidenceSchema.parse(await readEvidence(root, evidence.previousPresentationRef));
  const current = await validatePresentationEvidence(root, evidence.currentPresentationRef, { ...record, artifactPath: record.artifactPath ?? record.contentApproval?.artifactPath, requirementRevision: WORKFLOW_REVISION });
  if (previous.importId !== record.importId || previous.sourceFingerprint !== record.sourceFingerprint || previous.stage !== "VALIDATING") throw new Error("DIAGNOSIS_MEASUREMENT_PRIOR_BINDING_MISMATCH");
  const ruleEvidence = (presentation: typeof previous, rule: string, expected: EvidenceRef) => {
    const refs = presentation.ruleResults.find((result) => result.ruleId === rule)?.evidenceRefs;
    if (!refs?.some((candidate) => isDeepStrictEqual(candidate, expected))) throw new Error("DIAGNOSIS_MEASUREMENT_RULE_EVIDENCE_MISMATCH");
  };
  const observationRule = evidence.verificationKind === "presentation-viewport" ? evidence.criterion.id : evidence.criterion.observationRule;
  ruleEvidence(previous, observationRule, evidence.previousObservationRef);
  ruleEvidence(current, observationRule, evidence.currentObservationRef);
  const previousObservation = await validateExecutionEvidence(root, evidence.previousObservationRef);
  const currentObservation = await validateExecutionEvidence(root, evidence.currentObservationRef);
  if (previousObservation.kind !== "browser" || currentObservation.kind !== "browser") throw new Error("DIAGNOSIS_MEASUREMENT_OBSERVATION_REQUIRED");
  const ordinaryReviewRef = current.ruleResults.find((result) => result.ruleId === evidence.criterion.reviewRule)?.evidenceRefs[0];
  if (!ordinaryReviewRef) throw new Error("DIAGNOSIS_MEASUREMENT_REVIEW_REQUIRED");
  const ordinaryReview = await validateExecutionEvidence(root, ordinaryReviewRef);
  const reviewExecution = await validateExecutionEvidence(root, evidence.reviewExecutionRef);
  if ((reviewExecution.kind !== "opencode" && reviewExecution.kind !== "structured") || reviewExecution.pass !== "remedy:measurement-change" || reviewExecution.packetId !== importPacketId(record, "VALIDATING", "targeted-repair") || !reviewExecution.inputRefs.some((item) => isDeepStrictEqual(item, evidence.previousObservationRef)) || !reviewExecution.inputRefs.some((item) => isDeepStrictEqual(item, evidence.currentObservationRef))) throw new Error("DIAGNOSIS_MEASUREMENT_REVIEW_REQUIRED");
  const context = (execution: typeof reviewExecution | typeof ordinaryReview) => execution.kind === "opencode" ? execution.sessionId : execution.kind === "structured" ? execution.contextId : "";
  if (context(reviewExecution) === context(ordinaryReview)) throw new Error("DIAGNOSIS_MEASUREMENT_REVIEW_NOT_INDEPENDENT");
  let expectedInput: Record<string, string>;
  let expectedReview: Record<string, unknown>;
  if (evidence.verificationKind === "presentation-viewport") {
    if (evidence.measurementChange.aspect !== "viewport" || !isDeepStrictEqual(previousObservation.viewport, evidence.sourceViewport) || !isDeepStrictEqual(currentObservation.viewport, evidence.targetViewport)) throw new Error("DIAGNOSIS_MEASUREMENT_VIEWPORT_CONTRADICTED");
    expectedInput = { criterion: JSON.stringify({ id: evidence.criterion.id, revision: evidence.criterion.revision }), previousObservationRef: JSON.stringify(evidence.previousObservationRef), currentObservationRef: JSON.stringify(evidence.currentObservationRef), sourceViewport: JSON.stringify(evidence.sourceViewport), targetViewport: JSON.stringify(evidence.targetViewport) };
    expectedReview = { schemaVersion: "RemedyMeasurementReviewV1", verdict: "pass", criterion: { id: evidence.criterion.id, revision: evidence.criterion.revision }, previousObservationRef: evidence.previousObservationRef, currentObservationRef: evidence.currentObservationRef, sourceViewport: evidence.sourceViewport, targetViewport: evidence.targetViewport, justification: evidence.measurementChange.justification, limitations: evidence.reviewLimitations };
    if (evidence.measurementChange.from !== JSON.stringify(evidence.sourceViewport) || evidence.measurementChange.to !== JSON.stringify(evidence.targetViewport)) throw new Error("DIAGNOSIS_MEASUREMENT_CHANGE_MISMATCH");
  } else {
    if (record.continuation?.kind !== "repair" || record.continuation.failedCheck?.code !== "TYPOGRAPHY_TRACKING_FLOOR" || record.continuation.failedCheck.criterionId !== evidence.criterion.id || record.continuation.failedCheck.criterionRevision !== evidence.criterion.revision || record.continuation.failedCheck.settings?.criterionFloor !== evidence.sourceCriterionFloor) throw new Error("DIAGNOSIS_MEASUREMENT_PRIOR_CHECK_MISMATCH");
    if (!['threshold', 'criterion', 'measurement'].includes(evidence.measurementChange.aspect)) throw new Error("DIAGNOSIS_MEASUREMENT_KIND_UNSUPPORTED");
    const authority = await evidenceReference(root, ".agents/skills/impeccable/reference/craft-floor.md");
    if (!isDeepStrictEqual(authority, evidence.authorityInstructionRef) || !(await readEvidenceBytes(root, authority.path)).toString("utf8").includes("-0.04em")) throw new Error("DIAGNOSIS_MEASUREMENT_AUTHORITY_MISMATCH");
    const observed = async (execution: typeof previousObservation, expected: string) => {
      const observedValues: string[] = [];
      for (const outputRef of execution.outputRefs) {
        const value = await readEvidence(root, outputRef).catch(() => undefined);
        const runtime = (() => { try { return validateArticleVisualRuntime(value); } catch { return undefined; } })();
        if (!runtime) continue;
        const spacing = runtime.typography.heading.letterSpacing;
        const fontSize = runtime.typography.heading.fontSize;
        const spacingPx = /^(-?\d+(?:\.\d+)?)px$/.exec(spacing);
        const sizePx = /^(\d+(?:\.\d+)?)px$/.exec(fontSize);
        const normalized = spacingPx && sizePx ? `${Number(spacingPx[1]) / Number(sizePx[1])}em` : spacing;
        observedValues.push(normalized);
        if (normalized === expected) return;
      }
      throw new Error(`DIAGNOSIS_MEASUREMENT_COMPUTED_VALUE_MISMATCH:${expected}:${observedValues.join(",")}`);
    };
    await observed(previousObservation, evidence.sourceComputedValue); await observed(currentObservation, evidence.targetComputedValue);
    if (!reviewExecution.instructions.some((instruction) => instruction.path === authority.path && instruction.sha256 === authority.sha256)) throw new Error("DIAGNOSIS_MEASUREMENT_AUTHORITY_NOT_PINNED");
    expectedInput = { criterion: JSON.stringify(evidence.criterion), previousObservationRef: JSON.stringify(evidence.previousObservationRef), currentObservationRef: JSON.stringify(evidence.currentObservationRef), sourceComputedValue: evidence.sourceComputedValue, targetComputedValue: evidence.targetComputedValue, sourceCriterionFloor: evidence.sourceCriterionFloor, criterionFloor: evidence.criterionFloor, authorityInstructionRef: JSON.stringify(authority) };
    expectedReview = { schemaVersion: "RemedyMeasurementReviewV1", verdict: "pass", criterion: evidence.criterion, previousObservationRef: evidence.previousObservationRef, currentObservationRef: evidence.currentObservationRef, sourceComputedValue: evidence.sourceComputedValue, targetComputedValue: evidence.targetComputedValue, sourceCriterionFloor: evidence.sourceCriterionFloor, criterionFloor: evidence.criterionFloor, authorityInstructionRef: authority, justification: evidence.measurementChange.justification, limitations: evidence.reviewLimitations };
    if (evidence.measurementChange.from !== evidence.sourceCriterionFloor || evidence.measurementChange.to !== evidence.criterionFloor) throw new Error("DIAGNOSIS_MEASUREMENT_CHANGE_MISMATCH");
  }
  if (!isDeepStrictEqual(reviewExecution.input, expectedInput)) throw new Error("DIAGNOSIS_MEASUREMENT_REVIEW_INPUT_MISMATCH");
  const review = JSON.parse(reviewExecution.output.measurementReview ?? "null") as Record<string, unknown>;
  if (!isDeepStrictEqual(review, expectedReview)) throw new Error("DIAGNOSIS_MEASUREMENT_REVIEW_CONTRADICTED");
  return evidence;
}

async function presentationMeasurementChanged(root: string, record: ExternalArticleImportV1, replacementPresentationRef?: EvidenceRef): Promise<boolean> {
  if (record.continuation?.kind !== "repair" || !replacementPresentationRef) return false;
  const failedCheck = record.continuation.failedCheck;
  if (failedCheck?.code === "TYPOGRAPHY_TRACKING_FLOOR" && failedCheck.criterionId === "typography.heading.letterSpacing" && failedCheck.criterionRevision === WORKFLOW_REVISION) {
    const authority = await evidenceReference(root, ".agents/skills/impeccable/reference/craft-floor.md");
    const currentFloor = (await readEvidenceBytes(root, authority.path)).toString("utf8").includes("-0.04em") ? "-0.04em" : undefined;
    if (!currentFloor || failedCheck.settings?.criterionFloor !== currentFloor) return true;
  }
  const current = workflowEvidenceSchema.safeParse(await readEvidence(root, replacementPresentationRef));
  if (!current.success) return false;
  for (const failedRef of record.continuation.failedEvidenceRefs ?? []) {
    const failed = workflowEvidenceSchema.safeParse(await readEvidence(root, failedRef).catch(() => undefined));
    if (!failed.success || failed.data.stage !== "VALIDATING") continue;
    for (const rule of ["desktop", "mobile", "reduced-motion"]) {
      const priorRef = failed.data.ruleResults.find((result) => result.ruleId === rule)?.evidenceRefs[0];
      const currentRef = current.data.ruleResults.find((result) => result.ruleId === rule)?.evidenceRefs[0];
      if (!priorRef || !currentRef) continue;
      const [prior, replacement] = await Promise.all([validateExecutionEvidence(root, priorRef), validateExecutionEvidence(root, currentRef)]);
      if (prior.kind === "browser" && replacement.kind === "browser" && !isDeepStrictEqual(prior.viewport, replacement.viewport)) return true;
    }
  }
  return false;
}

export async function submitImportDiagnosis(root: string, importId: string, input: unknown): Promise<ExternalArticleImportV1> {
  return withImportLease(root, importId, async (record) => {
    const diagnosis = actionableDiagnosisSchema.parse(input);
    if (diagnosis.consumedAt || diagnosis.importId !== importId || diagnosis.sourceFingerprint !== record.sourceFingerprint || diagnosis.stage !== record.stage || record.continuation?.kind !== "repair" || diagnosis.failedSubmissionDigest !== record.continuation.submittedFingerprint || diagnosis.replacementSubmissionDigest !== await canonicalSubmissionFingerprint(record, root)) throw new Error("DIAGNOSIS_BINDING_MISMATCH");
    for (const ref of diagnosis.attemptedRecoveryRefs) await readEvidence(root, ref);
    const remedies = await Promise.all(diagnosis.remedyEvidenceRefs.map((ref) => verifiedRemedyEvidence(root, ref, diagnosis, record)));
    const derivedCheck = remedies[0].check;
    const replacementPresentationRef = diagnosis.stage === "VALIDATING" ? remedies[0].actualEvidenceRef : undefined;
    if (diagnosis.repairChange.kind === "product-repair" && await presentationMeasurementChanged(root, record, replacementPresentationRef)) throw new Error("DIAGNOSIS_MEASUREMENT_CHANGE_UNDECLARED");
    if (diagnosis.repairChange.kind === "measurement-change") {
      const repairChange = diagnosis.repairChange;
      if (diagnosis.remedyEvidenceRefs.some((ref) => isDeepStrictEqual(ref, repairChange.independentVerificationRef))) throw new Error("DIAGNOSIS_MEASUREMENT_VERIFICATION_NOT_INDEPENDENT");
      const measurement = await verifiedMeasurementChange(root, repairChange.independentVerificationRef, diagnosis, record, replacementPresentationRef);
      const expectedChange = { aspect: repairChange.aspect, from: repairChange.from, to: repairChange.to, justification: repairChange.justification };
      if (!isDeepStrictEqual(measurement.measurementChange, expectedChange)) throw new Error("DIAGNOSIS_MEASUREMENT_VERIFICATION_MISMATCH");
    }
    const verified = { ...diagnosis, remedyCheck: derivedCheck, remedyVerifiedAt: now() };
    const updated = { ...record, diagnoses: [...(record.diagnoses ?? []), verified] };
    await saveImport(root, updated); return updated;
  });
}
