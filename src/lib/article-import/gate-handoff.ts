import { createHash } from "node:crypto";
import { lstat, mkdir, readdir, realpath, unlink, writeFile } from "node:fs/promises";
import type { Dirent } from "node:fs";
import path from "node:path";
import {
  gateCleanupRemedySchema,
  importGateHandoffSchema,
  type ExternalArticleImportV1,
  type ImportGateHandoff,
  type ImportStage,
} from "./contracts";
import {
  evidenceReference,
  readVerifiedEvidenceBytes,
  verifyEvidenceRef,
  type EvidenceRef,
} from "./execution-evidence";

type NamedReference = { name: string; reference: EvidenceRef; reason: string };
type DisposalCandidate = ImportGateHandoff["disposalCandidates"][number];
type CleanupOperation = NonNullable<ImportGateHandoff["cleanup"]["operations"]>[number];
type CleanupDisposition = CleanupOperation["dispositions"][number];
type CleanupAttempt = NonNullable<CleanupOperation["automaticAttempts"]>[number];
type CleanupFailureStatus = Extract<CleanupAttempt["status"], "temporary-failure" | "shared-failure" | "uncertain-mutation">;
type CleanupHold = NonNullable<CleanupOperation["hold"]>;

export type GateCleanupOptions = {
  now?: () => Date;
  afterBoundary?: (boundary: "intent-recorded" | "attempt-recorded" | "pre-mutation-verified" | "archive-copied" | "archive-registered" | "original-removed") => void | Promise<void>;
  resolveRetentionDependencies?: (record: ExternalArticleImportV1) => Promise<
    { status: "verified"; references: EvidenceRef[] } | { status: "unavailable"; reason: string }
  >;
  remedyRef?: EvidenceRef;
};

type CleanupTrigger = "gate" | "manual";
type PersistCleanup = (record: ExternalArticleImportV1) => Promise<ExternalArticleImportV1>;

const RETENTION_MS = 30 * 24 * 60 * 60 * 1_000;
const MAX_AUTOMATIC_ATTEMPTS = 3;

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function normalized(file: string): string {
  return file.replaceAll("\\", "/");
}

function sameReference(left: EvidenceRef, right: EvidenceRef): boolean {
  return left.sha256 === right.sha256 || normalized(left.path) === normalized(right.path);
}

function sameArtifact(left: EvidenceRef, right: EvidenceRef): boolean {
  return left.sha256 === right.sha256 && normalized(left.path) === normalized(right.path);
}

function protectedReferences(record: ExternalArticleImportV1): EvidenceRef[] {
  const references: EvidenceRef[] = [];
  const visit = (value: unknown, key?: string) => {
    if (key === "cleanup" || key === "disposalCandidates" || key === "activityAttempts" || key === "stageAttempts") return;
    if (typeof value === "string" && key && /(?:Path|File)$/.test(key)) {
      references.push({ path: value, sha256: "0".repeat(64) });
      return;
    }
    if (!value || typeof value !== "object") return;
    if (!Array.isArray(value)) {
      const candidate = value as Record<string, unknown>;
      if (typeof candidate.path === "string" && typeof candidate.sha256 === "string" && /^[a-f0-9]{64}$/.test(candidate.sha256)) {
        references.push({ path: candidate.path, sha256: candidate.sha256 });
      }
      for (const [childKey, child] of Object.entries(candidate)) visit(child, childKey);
      return;
    }
    for (const child of value) visit(child);
  };
  visit(record);
  return references;
}

function candidateProtected(candidate: DisposalCandidate, protectedRefs: EvidenceRef[]): boolean {
  return protectedRefs.some((reference) => candidate.kind === "verified-temporary"
    ? normalized(reference.path) === normalized(candidate.reference.path)
    : sameReference(reference, candidate.reference));
}

function classifyCandidate(candidate: DisposalCandidate, protectedRefs: EvidenceRef[], at: Date): CleanupDisposition {
  if (candidateProtected(candidate, protectedRefs)) {
    return { original: candidate, disposition: "retain", reason: "Protected by a current workflow, evidence, diagnosis, rollback, publication, or IMPROVE reference." };
  }
  if (candidate.kind === "verified-temporary") {
    return { original: candidate, disposition: "dispose", reason: "Verified temporary material has no current dependency." };
  }
  if (!candidate.archivedAt) {
    return {
      original: candidate,
      disposition: "archive",
      reason: "Dependency-free superseded material starts recoverable 30-day retention.",
      retainUntil: new Date(at.getTime() + RETENTION_MS).toISOString(),
    };
  }
  if (at.getTime() < Date.parse(candidate.archivedAt) + RETENTION_MS) {
    return {
      original: candidate,
      disposition: "retain",
      reason: "Recoverable archive has not reached 30 days.",
      retainUntil: new Date(Date.parse(candidate.archivedAt) + RETENTION_MS).toISOString(),
    };
  }
  return { original: candidate, disposition: "dispose", reason: "The 30-day archive expired and dependency eligibility was rechecked." };
}

function eligibilityFingerprint(candidates: DisposalCandidate[], protectedRefs: EvidenceRef[], at: Date): string {
  return sha256(JSON.stringify(candidates.map((candidate) => ({
    reference: candidate.reference,
    kind: candidate.kind,
    archivedAt: candidate.archivedAt,
    expired: candidate.archivedAt ? at.getTime() >= Date.parse(candidate.archivedAt) + RETENTION_MS : false,
    protected: candidateProtected(candidate, protectedRefs),
  }))));
}

function handoffMayNeedDependencyCheck(handoff: ImportGateHandoff, at: Date): boolean {
  const operation = latestOperation(handoff);
  return handoff.disposalCandidates.length > 0 && (
    handoff.cleanup.status === "pending" ||
    handoff.cleanup.status === "held" ||
    Boolean(operation && operation.phase !== "completed") ||
    handoff.disposalCandidates.some((candidate) => !candidate.archivedAt || at.getTime() >= Date.parse(candidate.archivedAt) + RETENTION_MS)
  );
}

function cleanupOrder(record: ExternalArticleImportV1): number[] {
  const handoffs = record.gateHandoffs ?? [];
  const current = handoffs.findLastIndex((handoff) => handoff.nextStage === record.stage);
  return [...(current >= 0 ? [current] : []), ...handoffs.map((_, index) => index).filter((index) => index !== current)];
}

function selectedHandoff(record: ExternalArticleImportV1, protectedRefs: EvidenceRef[], at: Date): { handoff: ImportGateHandoff; index: number } | undefined {
  for (const index of cleanupOrder(record)) {
    const handoff = record.gateHandoffs![index];
    if (handoff.disposalCandidates.length === 0) continue;
    const operation = latestOperation(handoff);
    const fingerprint = eligibilityFingerprint(handoff.disposalCandidates, protectedRefs, at);
    if (handoff.cleanup.status === "pending" || handoff.cleanup.status === "held" || (operation && operation.phase !== "completed") || operation?.eligibilityFingerprint !== fingerprint) {
      return { handoff, index };
    }
  }
  return undefined;
}

function replaceHandoff(record: ExternalArticleImportV1, index: number, handoff: ImportGateHandoff): ExternalArticleImportV1 {
  return { ...record, gateHandoffs: record.gateHandoffs!.map((item, itemIndex) => itemIndex === index ? handoff : item) };
}

function replaceOperation(handoff: ImportGateHandoff, operation: CleanupOperation): ImportGateHandoff {
  const operations = (handoff.cleanup.operations ?? []).map((item) => item.operationId === operation.operationId ? operation : item);
  return { ...handoff, cleanup: { ...handoff.cleanup, operationId: operation.operationId, operations } };
}

function archivePath(importId: string, candidate: DisposalCandidate): string {
  return `.automation/article-imports/archive/${importId}/${candidate.reference.sha256}/${path.basename(candidate.reference.path)}`;
}

function assertAuthorizedCandidatePath(importId: string, reference: EvidenceRef): void {
  const file = normalized(reference.path);
  const roots = [
    `.automation/article-imports/work/${importId}/`,
    `.automation/article-imports/archive/${importId}/`,
    `.automation/article-imports/cleanup-failures/${importId}/`,
  ];
  if (!roots.some((root) => file.startsWith(root)) || file.includes("../")) throw new Error("CLEANUP_PATH_NOT_AUTHORIZED");
}

async function writeVerifiedArchive(root: string, importId: string, candidate: DisposalCandidate): Promise<EvidenceRef> {
  assertAuthorizedCandidatePath(importId, candidate.reference);
  const bytes = await readVerifiedEvidenceBytes(root, candidate.reference);
  const relative = archivePath(importId, candidate);
  const target = path.join(root, relative);
  await mkdir(path.dirname(target), { recursive: true });
  const canonicalRoot = await realpath(root);
  const canonicalParent = await realpath(path.dirname(target));
  const relativeParent = path.relative(canonicalRoot, canonicalParent);
  if (relativeParent === ".." || relativeParent.startsWith(`..${path.sep}`) || path.isAbsolute(relativeParent)) throw new Error("CLEANUP_ARCHIVE_PATH_ESCAPE");
  await writeFile(target, bytes, { flag: "wx" }).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "EEXIST") throw error;
  });
  const reference = await evidenceReference(root, relative);
  if (reference.sha256 !== candidate.reference.sha256) throw new Error("CLEANUP_ARCHIVE_INTEGRITY_UNCERTAIN");
  return reference;
}

async function removeVerifiedOriginal(root: string, importId: string, reference: EvidenceRef): Promise<"removed" | "missing"> {
  assertAuthorizedCandidatePath(importId, reference);
  const target = path.resolve(root, reference.path);
  const metadata = await lstat(target).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return undefined;
    throw error;
  });
  if (!metadata) return "missing";
  if (!metadata.isFile() || metadata.isSymbolicLink()) throw new Error("CLEANUP_ORIGINAL_UNSAFE");
  await readVerifiedEvidenceBytes(root, reference);
  await unlink(target);
  return "removed";
}

async function restoreVerifiedOriginal(root: string, importId: string, original: EvidenceRef, archive: EvidenceRef): Promise<void> {
  assertAuthorizedCandidatePath(importId, original);
  assertAuthorizedCandidatePath(importId, archive);
  const bytes = await readVerifiedEvidenceBytes(root, archive);
  if (archive.sha256 !== original.sha256) throw new Error("CLEANUP_RESTORE_INTEGRITY_UNCERTAIN");
  const target = path.resolve(root, original.path);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes, { flag: "wx" });
  await verifyEvidenceRef(root, original);
}

function latestOperation(handoff: ImportGateHandoff): CleanupOperation | undefined {
  return handoff.cleanup.operations?.at(-1);
}

function operationFor(record: ExternalArticleImportV1, handoffIndex: number, operationId: string) {
  const handoff = record.gateHandoffs?.[handoffIndex];
  if (!handoff) throw new Error("CLEANUP_HANDOFF_MISSING");
  const operation = handoff.cleanup.operations?.find((item) => item.operationId === operationId);
  if (!operation) throw new Error("CLEANUP_OPERATION_MISSING");
  return { handoff, index: handoffIndex, operation };
}

async function persistOperation(record: ExternalArticleImportV1, index: number, handoff: ImportGateHandoff, operation: CleanupOperation, persist: PersistCleanup) {
  return persist(replaceHandoff(record, index, replaceOperation(handoff, operation)));
}

function latestAttempt(operation: CleanupOperation): CleanupAttempt | undefined {
  return operation.automaticAttempts?.at(-1);
}

function isCleanupFailure(attempt: CleanupAttempt | undefined): attempt is CleanupAttempt & { status: CleanupFailureStatus } {
  return Boolean(attempt && ["temporary-failure", "shared-failure", "uncertain-mutation"].includes(attempt.status));
}

function replaceLatestAttempt(operation: CleanupOperation, attempt: CleanupAttempt): CleanupOperation {
  const attempts = [...(operation.automaticAttempts ?? [])];
  attempts[attempts.length - 1] = attempt;
  return { ...operation, automaticAttempts: attempts };
}

function remedyKind(status: CleanupFailureStatus) {
  if (status === "temporary-failure") return "temporary-failure-remedy" as const;
  if (status === "uncertain-mutation") return "uncertain-mutation-reconciliation" as const;
  return "shared-failure-recovery" as const;
}

async function verifyBoundRemedy(root: string, importId: string, reference: EvidenceRef, operation: CleanupOperation, failure: { status: CleanupFailureStatus; failureEvidence?: EvidenceRef }): Promise<void> {
  if (!failure.failureEvidence) throw new Error("CLEANUP_REMEDY_FAILURE_EVIDENCE_MISSING");
  assertAuthorizedCandidatePath(importId, reference);
  assertAuthorizedCandidatePath(importId, failure.failureEvidence);
  await verifyEvidenceRef(root, failure.failureEvidence);
  const bytes = await readVerifiedEvidenceBytes(root, reference);
  const remedy = gateCleanupRemedySchema.parse(JSON.parse(bytes.toString("utf8")));
  if (remedy.operationId !== operation.operationId) throw new Error("CLEANUP_REMEDY_OPERATION_MISMATCH");
  if (remedy.failureEvidence.sha256 !== failure.failureEvidence.sha256 || normalized(remedy.failureEvidence.path) !== normalized(failure.failureEvidence.path)) {
    throw new Error("CLEANUP_REMEDY_FAILURE_MISMATCH");
  }
  if (remedy.kind !== remedyKind(failure.status)) throw new Error("CLEANUP_REMEDY_KIND_MISMATCH");
}

function cleanupErrorCode(error: unknown): string {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  return code || (error instanceof Error ? error.message : String(error));
}

function classifyPreMutationFailure(error: unknown): Extract<CleanupFailureStatus, "temporary-failure" | "shared-failure"> {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  return code && ["ENOENT", "EBUSY", "EAGAIN", "EMFILE", "ENFILE", "ETXTBSY", "EPERM", "EACCES"].includes(code)
    ? "temporary-failure"
    : "shared-failure";
}

async function recordCleanupFailure(
  root: string,
  record: ExternalArticleImportV1,
  operation: CleanupOperation,
  attempt: CleanupAttempt,
  status: CleanupFailureStatus,
  error: unknown,
  at: Date,
): Promise<CleanupOperation> {
  const relative = `.automation/article-imports/cleanup-failures/${record.importId}/${operation.operationId}-attempt-${attempt.sequence}.failure.json`;
  await mkdir(path.dirname(path.join(root, relative)), { recursive: true });
  await writeFile(path.join(root, relative), `${JSON.stringify({
    schemaVersion: "ImportGateCleanupFailureV1",
    operationId: operation.operationId,
    attempt: attempt.sequence,
    trigger: attempt.trigger,
    status,
    code: cleanupErrorCode(error),
    observedAt: at.toISOString(),
  })}\n`);
  const failureEvidence = await evidenceReference(root, relative);
  const failed = { ...attempt, status, failureEvidence, failureCode: cleanupErrorCode(error), finishedAt: at.toISOString() };
  return { ...replaceLatestAttempt(operation, failed), phase: "held", updatedAt: at.toISOString() };
}

async function holdMutationFailure(
  root: string,
  record: ExternalArticleImportV1,
  operation: CleanupOperation,
  status: Extract<CleanupFailureStatus, "shared-failure" | "uncertain-mutation">,
  error: unknown,
  at: Date,
): Promise<CleanupOperation> {
  const attempt = latestAttempt(operation);
  let held = attempt?.status === "ready"
    ? await recordCleanupFailure(root, record, operation, attempt, status, error, at)
    : operation;
  let failureEvidence = latestAttempt(held)?.failureEvidence;
  if (!failureEvidence || operation.remedyRef) {
    const relative = `.automation/article-imports/cleanup-failures/${record.importId}/${operation.operationId}-hold-${sha256(`${at.toISOString()}:${status}:${cleanupErrorCode(error)}`).slice(0, 16)}.failure.json`;
    await mkdir(path.dirname(path.join(root, relative)), { recursive: true });
    await writeFile(path.join(root, relative), `${JSON.stringify({
      schemaVersion: "ImportGateCleanupFailureV1",
      operationId: operation.operationId,
      status,
      code: cleanupErrorCode(error),
      observedAt: at.toISOString(),
    })}\n`);
    failureEvidence = await evidenceReference(root, relative);
  }
  const hold: CleanupHold = {
    status,
    failureEvidence,
    failureCode: cleanupErrorCode(error),
    observedAt: at.toISOString(),
  };
  return { ...held, phase: "held", remedyRef: undefined, hold, updatedAt: at.toISOString() };
}

async function verifyMutationInputs(root: string, importId: string, operation: CleanupOperation): Promise<void> {
  for (const disposition of operation.dispositions) {
    if (disposition.removedAt || disposition.disposition === "retain" || disposition.disposition === "unclassified") continue;
    if (disposition.disposition === "archive" && disposition.archiveRef) {
      await verifyEvidenceRef(root, disposition.archiveRef);
      continue;
    }
    assertAuthorizedCandidatePath(importId, disposition.original.reference);
    const target = path.resolve(root, disposition.original.reference.path);
    const metadata = await lstat(target);
    if (!metadata.isFile() || metadata.isSymbolicLink()) throw new Error("CLEANUP_ORIGINAL_UNSAFE");
    await readVerifiedEvidenceBytes(root, disposition.original.reference);
  }
}

export async function reconcileGateCleanup(
  root: string,
  record: ExternalArticleImportV1,
  trigger: CleanupTrigger,
  persist: PersistCleanup,
  options: GateCleanupOptions = {},
): Promise<{ record: ExternalArticleImportV1; handled: boolean }> {
  let current = record;
  const at = options.now?.() ?? new Date();
  const uncheckedIndex = cleanupOrder(current).find((index) => handoffMayNeedDependencyCheck(current.gateHandoffs![index], at));
  if (uncheckedIndex === undefined) return { record: current, handled: false };
  let selected = { handoff: current.gateHandoffs![uncheckedIndex], index: uncheckedIndex };
  let registeredDependencies;
  try {
    registeredDependencies = options.resolveRetentionDependencies
      ? await options.resolveRetentionDependencies(current)
      : { status: "unavailable" as const, reason: "Canonical retention dependencies were not checked." };
  } catch (error) {
    registeredDependencies = { status: "unavailable" as const, reason: error instanceof Error ? error.message : String(error) };
  }
  if (registeredDependencies.status === "unavailable") {
    if (selected.handoff.cleanup.status === "held") return { record: current, handled: true };
    const held = { ...selected.handoff, cleanup: { ...selected.handoff.cleanup, status: "held" as const } };
    current = await persist(replaceHandoff(current, selected.index, held));
    return { record: current, handled: true };
  }
  let canonicalReferences = registeredDependencies.references;
  const protectedRefs = [...protectedReferences(current), ...canonicalReferences];
  selected = selectedHandoff(current, protectedRefs, at) ?? selected;
  const fingerprint = eligibilityFingerprint(selected.handoff.disposalCandidates, protectedRefs, at);
  let operation = latestOperation(selected.handoff);
  const incomplete = operation && operation.phase !== "completed";
  if (!incomplete && operation?.eligibilityFingerprint === fingerprint) {
    if (selected.handoff.cleanup.status !== "verified") {
      const released = { ...selected.handoff, cleanup: { ...selected.handoff.cleanup, status: "verified" as const } };
      current = await persist(replaceHandoff(current, selected.index, released));
      return { record: current, handled: true };
    }
    return { record: current, handled: false };
  }
  if (!incomplete) {
    const dispositions = selected.handoff.disposalCandidates
      .map((candidate) => classifyCandidate(candidate, protectedRefs, at))
      .sort((left, right) => Number(right.original.kind === "verified-temporary") - Number(left.original.kind === "verified-temporary"));
    const operationId = `cleanup-${sha256(`${current.importId}:${selected.handoff.passedGate}:${selected.handoff.nextStage}:${fingerprint}`).slice(0, 24)}`;
    operation = {
      schemaVersion: "ImportGateCleanupOperationV1",
      operationId,
      phase: "intended",
      eligibilityFingerprint: fingerprint,
      dispositions,
      createdAt: at.toISOString(),
      updatedAt: at.toISOString(),
    };
    const handoff = {
      ...selected.handoff,
      cleanup: {
        status: "pending" as const,
        operationId,
        operations: [...(selected.handoff.cleanup.operations ?? []), operation],
      },
    };
    current = await persist(replaceHandoff(current, selected.index, handoff));
    await options.afterBoundary?.("intent-recorded");
  }

  if (!operation) throw new Error("CLEANUP_OPERATION_MISSING");
  const operationId = operation.operationId;
  let located = operationFor(current, selected.index, operationId);
  selected = { handoff: located.handoff, index: located.index };
  operation = located.operation;
  let attempt = latestAttempt(operation);
  const attemptFailure = isCleanupFailure(attempt) ? attempt : undefined;
  const failure = operation.hold ?? attemptFailure;
  const needsRemedy = failure && (failure.status !== "temporary-failure" || (operation.automaticAttempts?.length ?? 0) >= MAX_AUTOMATIC_ATTEMPTS);
  if (operation.phase === "held" && !attempt) return { record: current, handled: true };
  if (needsRemedy) {
    const remedyRef = options.remedyRef ?? operation.remedyRef;
    if (!remedyRef) return { record: current, handled: true };
    try {
      await verifyBoundRemedy(root, current.importId, remedyRef, operation, failure);
      await verifyMutationInputs(root, current.importId, operation);
    } catch {
      return { record: current, handled: true };
    }
    operation = { ...operation, remedyRef, hold: undefined, updatedAt: at.toISOString() };
    current = await persistOperation(current, selected.index, selected.handoff, operation, persist);
    located = operationFor(current, selected.index, operationId);
    selected = { handoff: located.handoff, index: located.index };
    operation = located.operation;
    attempt = latestAttempt(operation);
  }
  const retryableFailure = attemptFailure?.status === "temporary-failure" && !needsRemedy;
  if (!operation.remedyRef && (!attempt || retryableFailure)) {
    const sequence = (operation.automaticAttempts?.length ?? 0) + 1;
    const admitted: CleanupAttempt = {
      sequence,
      trigger,
      status: "admitted",
      startedAt: at.toISOString(),
    };
    operation = { ...operation, automaticAttempts: [...(operation.automaticAttempts ?? []), admitted], updatedAt: at.toISOString() };
    current = await persistOperation(current, selected.index, selected.handoff, operation, persist);
    located = operationFor(current, selected.index, operationId);
    selected = { handoff: located.handoff, index: located.index };
    operation = located.operation;
    attempt = latestAttempt(operation);
    await options.afterBoundary?.("attempt-recorded");
  }
  if (!operation.remedyRef && attempt?.status === "admitted") {
    try {
      await verifyMutationInputs(root, current.importId, operation);
    } catch (error) {
      const status = classifyPreMutationFailure(error);
      operation = await recordCleanupFailure(root, current, operation, attempt, status, error, at);
      if (status === "temporary-failure" && attempt.sequence === MAX_AUTOMATIC_ATTEMPTS) operation = { ...operation, exhaustedAt: at.toISOString() };
      current = await persistOperation(current, selected.index, { ...selected.handoff, cleanup: { ...selected.handoff.cleanup, status: "held" } }, operation, persist);
      return { record: current, handled: true };
    }
    operation = replaceLatestAttempt(operation, { ...attempt, status: "ready" });
    current = await persistOperation(current, selected.index, selected.handoff, operation, persist);
    located = operationFor(current, selected.index, operationId);
    selected = { handoff: located.handoff, index: located.index };
    operation = located.operation;
    attempt = latestAttempt(operation);
    await options.afterBoundary?.("pre-mutation-verified");
  }
  let dispositions = [...operation.dispositions];
  for (let index = 0; index < dispositions.length; index += 1) {
    let disposition = dispositions[index];
    let refreshedDependencies;
    try { refreshedDependencies = await options.resolveRetentionDependencies!(current); }
    catch (error) { refreshedDependencies = { status: "unavailable" as const, reason: error instanceof Error ? error.message : String(error) }; }
    if (refreshedDependencies.status === "unavailable") {
      const held = await holdMutationFailure(root, current, operation, "shared-failure", new Error(refreshedDependencies.reason), at);
      current = await persistOperation(current, selected.index, { ...selected.handoff, cleanup: { ...selected.handoff.cleanup, status: "held" } }, held, persist);
      return { record: current, handled: true };
    }
    canonicalReferences = refreshedDependencies.references;
    const nowProtected = candidateProtected(disposition.original, [...protectedReferences(current), ...canonicalReferences]);
    if (nowProtected && disposition.disposition !== "retain") {
      disposition = { ...disposition, disposition: "retain", reason: "A dependency claimed the artifact before mutation completed." };
      dispositions[index] = disposition;
    }
    if (disposition.disposition === "archive" && !disposition.archiveRef) {
      let archiveRef: EvidenceRef;
      try {
        archiveRef = await writeVerifiedArchive(root, current.importId, disposition.original);
      } catch (error) {
        const held = await holdMutationFailure(root, current, operation, "uncertain-mutation", error, at);
        current = await persistOperation(current, selected.index, { ...selected.handoff, cleanup: { ...selected.handoff.cleanup, status: "held" } }, held, persist);
        return { record: current, handled: true };
      }
      await options.afterBoundary?.("archive-copied");
      disposition = { ...disposition, archiveRef };
      dispositions[index] = disposition;
      operation = { ...operation, phase: "registered", dispositions, updatedAt: at.toISOString() };
      current = await persistOperation(current, selected.index, selected.handoff, operation, persist);
      located = operationFor(current, selected.index, operationId);
      selected = { handoff: located.handoff, index: located.index };
      operation = located.operation;
      dispositions = [...operation.dispositions];
      disposition = dispositions[index];
      await options.afterBoundary?.("archive-registered");
    }
    let beforeRemoval;
    try { beforeRemoval = await options.resolveRetentionDependencies!(current); }
    catch (error) { beforeRemoval = { status: "unavailable" as const, reason: error instanceof Error ? error.message : String(error) }; }
    if (beforeRemoval.status === "unavailable") {
      operation = await holdMutationFailure(root, current, { ...operation, dispositions }, "shared-failure", new Error(beforeRemoval.reason), at);
      current = await persistOperation(current, selected.index, { ...selected.handoff, cleanup: { ...selected.handoff.cleanup, status: "held" } }, operation, persist);
      return { record: current, handled: true };
    }
    canonicalReferences = beforeRemoval.references;
    const claimedBeforeRemoval = candidateProtected(disposition.original, [...protectedReferences(current), ...canonicalReferences]);
    if (claimedBeforeRemoval && disposition.disposition !== "retain") {
      disposition = { ...disposition, disposition: "retain", reason: "A dependency claimed the artifact immediately before original removal." };
      dispositions[index] = disposition;
    }
    if (disposition.disposition === "retain") {
      const originalExists = await lstat(path.resolve(root, disposition.original.reference.path)).then(() => true).catch((error: NodeJS.ErrnoException) => error.code === "ENOENT" ? false : Promise.reject(error));
      try {
        if (!originalExists && disposition.archiveRef) await restoreVerifiedOriginal(root, current.importId, disposition.original.reference, disposition.archiveRef);
        await verifyEvidenceRef(root, disposition.original.reference);
      } catch (error) {
        operation = await holdMutationFailure(root, current, { ...operation, dispositions }, "uncertain-mutation", error, at);
        current = await persistOperation(current, selected.index, { ...selected.handoff, cleanup: { ...selected.handoff.cleanup, status: "held" } }, operation, persist);
        return { record: current, handled: true };
      }
      continue;
    }
    if (disposition.disposition === "archive") {
      if (!disposition.archiveRef) throw new Error("CLEANUP_ARCHIVE_REGISTRATION_MISSING");
      let removal: "removed" | "missing";
      try {
        await verifyEvidenceRef(root, disposition.archiveRef);
        removal = await removeVerifiedOriginal(root, current.importId, disposition.original.reference);
      } catch (error) {
        const held = await holdMutationFailure(root, current, operation, "uncertain-mutation", error, at);
        current = await persistOperation(current, selected.index, { ...selected.handoff, cleanup: { ...selected.handoff.cleanup, status: "held" } }, held, persist);
        return { record: current, handled: true };
      }
      if (removal === "removed") await options.afterBoundary?.("original-removed");
      disposition = { ...disposition, removedAt: at.toISOString() };
      dispositions[index] = disposition;
    } else if (disposition.disposition === "dispose" && !disposition.removedAt) {
      let removal: "removed" | "missing";
      try {
        if (disposition.original.kind === "verified-temporary") {
          const redundantWith = disposition.original.redundantWith;
          assertAuthorizedCandidatePath(current.importId, redundantWith);
          if (redundantWith.sha256 !== disposition.original.reference.sha256 ||
              normalized(redundantWith.path) === normalized(disposition.original.reference.path)) {
            throw new Error("CLEANUP_TEMPORARY_REDUNDANCY_UNVERIFIED");
          }
          try {
            await verifyEvidenceRef(root, redundantWith);
          } catch {
            const archivedTarget = dispositions.find((item) =>
              sameArtifact(item.original.reference, redundantWith) && item.archiveRef);
            if (!archivedTarget?.archiveRef) throw new Error("CLEANUP_TEMPORARY_REDUNDANCY_UNVERIFIED");
            await verifyEvidenceRef(root, archivedTarget.archiveRef);
          }
        }
        removal = await removeVerifiedOriginal(root, current.importId, disposition.original.reference);
      } catch (error) {
        const held = await holdMutationFailure(root, current, operation, "uncertain-mutation", error, at);
        current = await persistOperation(current, selected.index, { ...selected.handoff, cleanup: { ...selected.handoff.cleanup, status: "held" } }, held, persist);
        return { record: current, handled: true };
      }
      if (removal === "removed") await options.afterBoundary?.("original-removed");
      disposition = { ...disposition, removedAt: at.toISOString() };
      dispositions[index] = disposition;
    }
  }

  located = operationFor(current, selected.index, operationId);
  selected = { handoff: located.handoff, index: located.index };
  operation = located.operation;
  const remainingCandidates = selected.handoff.disposalCandidates.flatMap((candidate) => {
    const disposition = dispositions.find((item) => sameArtifact(item.original.reference, candidate.reference));
    if (!disposition || disposition.disposition === "retain" || disposition.disposition === "unclassified") return [candidate];
    if (disposition.disposition === "archive" && disposition.archiveRef) {
      return [{ ...candidate, reference: disposition.archiveRef, archivedAt: at.toISOString() }];
    }
    return [];
  });
  const completedHandoff: ImportGateHandoff = {
    ...selected.handoff,
    disposalCandidates: remainingCandidates,
    cleanup: { ...selected.handoff.cleanup, status: "verified", operationId },
  };
  const completedFingerprint = eligibilityFingerprint(remainingCandidates, [...protectedReferences(current), ...canonicalReferences], at);
  const completedAttempt = latestAttempt(operation);
  if (completedAttempt?.status === "ready") {
    operation = replaceLatestAttempt(operation, { ...completedAttempt, status: "succeeded", finishedAt: at.toISOString() });
  }
  operation = { ...operation, phase: "completed", dispositions, eligibilityFingerprint: completedFingerprint, updatedAt: at.toISOString() };
  current = await persistOperation(current, selected.index, completedHandoff, operation, persist);
  return { record: current, handled: true };
}

function unique(items: NamedReference[]): NamedReference[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.name}:${item.reference.path}:${item.reference.sha256}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function optionalPath(root: string, name: string, file: string | undefined, reason: string): Promise<NamedReference | undefined> {
  return file ? { name, reference: await evidenceReference(root, file), reason } : undefined;
}

function optionalRef(name: string, reference: EvidenceRef | undefined, reason: string): NamedReference | undefined {
  return reference ? { name, reference, reason } : undefined;
}

async function availableReferences(root: string, record: ExternalArticleImportV1): Promise<Record<string, NamedReference | undefined>> {
  return {
    source: optionalRef("captured-source", record.sourceRef, "Immutable captured source and intake identity."),
    research: optionalRef("accepted-research", record.evidenceRefs?.research, "Validated research and registered provenance."),
    artifact: await optionalPath(root, "candidate-artifact", record.artifactPath, "Current candidate artifact bytes."),
    approvedArtifact: await optionalPath(root, "approved-artifact", record.contentApproval?.artifactPath, "Exact content-approved artifact bytes."),
    transformAssessment: optionalRef("transform-assessment", record.evidenceRefs?.transformAssessment, "Accepted transform assessment and buyer brief."),
    assessment: optionalRef("content-assessment", record.evidenceRefs?.assessment, "Accepted content assessment."),
    editorial: optionalRef("editorial-execution", record.evidenceRefs?.editorial, "Retained editorial execution and independent judgment."),
    hero: optionalRef("hero-evidence", record.evidenceRefs?.hero, "Bound image generation and inspection evidence."),
    presentation: optionalRef("presentation-evidence", record.evidenceRefs?.presentation, "Accepted browser and presentation observations."),
    production: optionalRef("production-evidence", record.evidenceRefs?.production, "Retained production verifier evidence."),
    terminal: optionalRef("terminal-evidence", record.terminalRef, "Immutable publication terminal proof."),
    improveRun: optionalRef("improve-run", record.improve?.runRef, "Immutable post-publication improvement input."),
  };
}

function present(values: Array<NamedReference | undefined>): NamedReference[] {
  return unique(values.filter((value): value is NamedReference => Boolean(value)));
}

function acceptedFor(gate: ImportStage, refs: Record<string, NamedReference | undefined>): NamedReference[] {
  const byGate: Partial<Record<ImportStage, Array<NamedReference | undefined>>> = {
    INGESTING: [refs.source],
    RESEARCHING: [refs.research],
    TRANSFORMING: [refs.artifact, refs.transformAssessment, refs.assessment],
    REFINING: [refs.approvedArtifact, refs.assessment, refs.editorial],
    VALIDATING: [refs.approvedArtifact, refs.hero, refs.presentation],
    RELEASING: [refs.production],
    VERIFYING: [refs.terminal, refs.improveRun],
  };
  return present(byGate[gate] ?? []);
}

function requiredFor(nextStage: ImportStage, refs: Record<string, NamedReference | undefined>): NamedReference[] {
  const byStage: Partial<Record<ImportStage, Array<NamedReference | undefined>>> = {
    RESEARCHING: [refs.source],
    TRANSFORMING: [refs.source, refs.research],
    REFINING: [refs.source, refs.research, refs.artifact, refs.transformAssessment ?? refs.assessment],
    VALIDATING: [refs.source, refs.research, refs.approvedArtifact, refs.assessment, refs.editorial],
    RELEASING: [refs.source, refs.approvedArtifact, refs.assessment, refs.editorial, refs.hero, refs.presentation],
    VERIFYING: [refs.source, refs.approvedArtifact, refs.presentation, refs.production],
    LIVE: [refs.terminal, refs.improveRun],
  };
  return present(byStage[nextStage] ?? []);
}

async function unclassifiedMaterial(root: string, record: ExternalArticleImportV1, declared: NamedReference[]) {
  const directory = path.join(root, ".automation/article-imports/work", record.importId);
  let entries: Dirent[];
  try { entries = await readdir(directory, { withFileTypes: true }); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const known = new Set(declared.map((item) => item.reference.path.replaceAll("\\", "/")));
  const material = [];
  for (const entry of entries.filter((item) => item.isFile()).sort((a, b) => a.name.localeCompare(b.name))) {
    const name = entry.name;
    const relative = path.join(".automation/article-imports/work", record.importId, name).replaceAll("\\", "/");
    if (known.has(relative)) continue;
    material.push({ reference: await evidenceReference(root, relative), reason: "No accepted-output, required-input, retention, or disposal rule classifies this material." });
  }
  return material;
}

async function declaredDisposalCandidates(root: string, record: ExternalArticleImportV1): Promise<DisposalCandidate[]> {
  const paths = [
    ...(record.activityAttempts ?? []).filter((attempt) => attempt.status === "superseded").flatMap((attempt) => [
      { path: attempt.workPath, kind: "superseded-draft" as const, reason: `Superseded activity attempt ${attempt.attemptId} work packet.` },
      { path: attempt.resultPath, kind: "superseded-capture" as const, reason: `Superseded activity attempt ${attempt.attemptId} result packet.` },
    ]),
    ...(record.stageAttempts ?? []).filter((attempt) => attempt.status === "superseded").flatMap((attempt) => [
      { path: attempt.workPath, kind: "superseded-draft" as const, reason: `Superseded stage attempt ${attempt.attemptId} work packet.` },
      { path: attempt.resultPath, kind: "superseded-capture" as const, reason: `Superseded stage attempt ${attempt.attemptId} result packet.` },
    ]),
  ];
  const candidates: DisposalCandidate[] = [];
  const seen = new Set<string>();
  for (const item of paths) {
    let reference: EvidenceRef;
    try { reference = await evidenceReference(root, item.path); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw error;
    }
    assertAuthorizedCandidatePath(record.importId, reference);
    const key = `${reference.path}:${reference.sha256}`;
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push({ reference, kind: item.kind, reason: item.reason });
  }
  const workDirectory = `.automation/article-imports/work/${record.importId}`;
  const atomicTemporary = /^(.+)\.\d+\.[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.tmp$/i;
  let entries: Dirent[];
  try { entries = await readdir(path.join(root, workDirectory), { withFileTypes: true }); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    entries = [];
  }
  for (const entry of entries.filter((item) => item.isFile()).sort((left, right) => left.name.localeCompare(right.name))) {
    const match = atomicTemporary.exec(entry.name);
    if (!match) continue;
    const temporaryPath = `${workDirectory}/${entry.name}`;
    const targetPath = `${workDirectory}/${match[1]}`;
    let temporary: EvidenceRef;
    let target: EvidenceRef;
    try {
      const targetMetadata = await lstat(path.join(root, targetPath));
      if (!targetMetadata.isFile() || targetMetadata.isSymbolicLink()) continue;
      temporary = await evidenceReference(root, temporaryPath);
      target = await evidenceReference(root, targetPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw error;
    }
    if (temporary.sha256 !== target.sha256) continue;
    const key = `${temporary.path}:${temporary.sha256}`;
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push({
      reference: temporary,
      kind: "verified-temporary",
      reason: `Verified redundant atomic-write temporary for ${target.path}.`,
      redundantWith: target,
    });
  }
  return candidates;
}

export async function declareGateHandoff(
  root: string,
  record: ExternalArticleImportV1,
  passedGate: ImportStage,
  nextStage: ImportStage,
): Promise<ImportGateHandoff> {
  const refs = await availableReferences(root, record);
  const acceptedOutputs = acceptedFor(passedGate, refs);
  const requiredNextInputs = requiredFor(nextStage, refs);
  if (!requiredNextInputs.length) throw new Error(`GATE_HANDOFF_INPUTS_MISSING:${passedGate}:${nextStage}`);
  for (const input of requiredNextInputs) await verifyEvidenceRef(root, input.reference);
  const retainedEvidence = present([
    refs.source, refs.research, refs.transformAssessment, refs.assessment, refs.editorial,
    refs.hero, refs.presentation, refs.production, refs.terminal, refs.improveRun,
    ...(record.activityReceipts ?? []).map((receipt) => ({ name: `activity:${receipt.stage}:${receipt.activityId}:${receipt.executionId}`, reference: receipt.resultRef, reason: "Attributable activity outcome remains inspectable." })),
  ]);
  const disposalCandidates = await declaredDisposalCandidates(root, record);
  const declared = unique([
    ...acceptedOutputs,
    ...requiredNextInputs,
    ...retainedEvidence,
    ...disposalCandidates.map((candidate) => ({ name: `disposal:${candidate.kind}`, reference: candidate.reference, reason: candidate.reason })),
  ]);
  return importGateHandoffSchema.parse({
    schemaVersion: "ImportGateHandoffV1",
    passedGate,
    nextStage,
    acceptedOutputs,
    requiredNextInputs,
    retainedEvidence,
    disposalCandidates,
    unclassifiedMaterial: await unclassifiedMaterial(root, record, declared),
    constraints: {
      sourceFingerprint: record.sourceFingerprint,
      requirementRevision: record.requirementRevision ?? "historical",
      format: record.format,
      commercialMode: record.transformation?.commercialMode ?? "none",
      ...(record.transformation?.resolvedAffiliateUrl ? { approvedAffiliateUrl: record.transformation.resolvedAffiliateUrl } : {}),
    },
    cleanup: { status: disposalCandidates.length ? "pending" : "not-required" },
    declaredAt: new Date().toISOString(),
  });
}

export async function verifyGateHandoffForDispatch(root: string, record: ExternalArticleImportV1) {
  if (!record.gateHandoffs?.length) return undefined;
  const handoff = [...record.gateHandoffs].reverse().find((item) => item.nextStage === record.stage);
  if (!handoff) return { status: "held" as const, reason: `No gate handoff targets ${record.stage}.` };
  if (handoff.cleanup.status === "pending" || handoff.cleanup.status === "held") return { status: "held" as const, reason: `Cleanup ${handoff.cleanup.operationId ?? "operation"} is ${handoff.cleanup.status}.` };
  const verifiedInputs: NamedReference[] = [];
  for (const input of handoff.requiredNextInputs) {
    try { await verifyEvidenceRef(root, input.reference); verifiedInputs.push(input); }
    catch { return { status: "held" as const, reason: `Required handoff input ${input.name} is unreadable.`, handoff }; }
  }
  return { status: "verified" as const, handoff, verifiedInputs };
}
