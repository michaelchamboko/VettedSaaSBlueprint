import { createHash } from "node:crypto";
import { lstat, mkdir, readdir, realpath, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
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

export type GateCleanupOptions = {
  now?: () => Date;
  afterBoundary?: (boundary: "intent-recorded" | "archive-copied" | "archive-registered") => void | Promise<void>;
  resolveRetentionDependencies?: (record: ExternalArticleImportV1) => Promise<
    { status: "verified"; references: EvidenceRef[] } | { status: "unavailable"; reason: string }
  >;
};

type CleanupTrigger = "gate" | "manual";
type PersistCleanup = (record: ExternalArticleImportV1) => Promise<ExternalArticleImportV1>;

const RETENTION_MS = 30 * 24 * 60 * 60 * 1_000;

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function normalized(file: string): string {
  return file.replaceAll("\\", "/");
}

function sameReference(left: EvidenceRef, right: EvidenceRef): boolean {
  return left.sha256 === right.sha256 || normalized(left.path) === normalized(right.path);
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
  return protectedRefs.some((reference) => sameReference(reference, candidate.reference));
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

function selectedHandoff(record: ExternalArticleImportV1): { handoff: ImportGateHandoff; index: number } | undefined {
  const index = record.gateHandoffs?.findLastIndex((handoff) => handoff.nextStage === record.stage) ?? -1;
  return index >= 0 ? { handoff: record.gateHandoffs![index], index } : undefined;
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

function latestOperation(handoff: ImportGateHandoff): CleanupOperation | undefined {
  return handoff.cleanup.operations?.at(-1);
}

function operationFor(record: ExternalArticleImportV1, operationId: string) {
  const selected = selectedHandoff(record);
  if (!selected) throw new Error("CLEANUP_HANDOFF_MISSING");
  const operation = selected.handoff.cleanup.operations?.find((item) => item.operationId === operationId);
  if (!operation) throw new Error("CLEANUP_OPERATION_MISSING");
  return { ...selected, operation };
}

async function persistOperation(record: ExternalArticleImportV1, index: number, handoff: ImportGateHandoff, operation: CleanupOperation, persist: PersistCleanup) {
  return persist(replaceHandoff(record, index, replaceOperation(handoff, operation)));
}

export async function reconcileGateCleanup(
  root: string,
  record: ExternalArticleImportV1,
  trigger: CleanupTrigger,
  persist: PersistCleanup,
  options: GateCleanupOptions = {},
): Promise<{ record: ExternalArticleImportV1; handled: boolean }> {
  let current = record;
  let selected = selectedHandoff(current);
  if (!selected || selected.handoff.disposalCandidates.length === 0) return { record: current, handled: false };
  const at = options.now?.() ?? new Date();
  let registeredDependencies;
  try {
    registeredDependencies = options.resolveRetentionDependencies
      ? await options.resolveRetentionDependencies(current)
      : { status: "unavailable" as const, reason: "Canonical retention dependencies were not checked." };
  } catch (error) {
    registeredDependencies = { status: "unavailable" as const, reason: error instanceof Error ? error.message : String(error) };
  }
  if (registeredDependencies.status === "unavailable") {
    if (selected.handoff.cleanup.status === "held" && !selected.handoff.cleanup.operationId) return { record: current, handled: true };
    const held = { ...selected.handoff, cleanup: { ...selected.handoff.cleanup, status: "held" as const } };
    current = await persist(replaceHandoff(current, selected.index, held));
    return { record: current, handled: true };
  }
  let canonicalReferences = registeredDependencies.references;
  const protectedRefs = [...protectedReferences(current), ...canonicalReferences];
  const fingerprint = eligibilityFingerprint(selected.handoff.disposalCandidates, protectedRefs, at);
  let operation = latestOperation(selected.handoff);
  const incomplete = operation && operation.phase !== "completed";
  if (!incomplete && operation?.eligibilityFingerprint === fingerprint) return { record: current, handled: false };
  if (!incomplete) {
    const dispositions = selected.handoff.disposalCandidates.map((candidate) => classifyCandidate(candidate, protectedRefs, at));
    const mutationDue = dispositions.some((item) => item.disposition === "archive" || item.disposition === "dispose");
    const expiryRecheckDue = selected.handoff.disposalCandidates.some((candidate) => candidate.archivedAt && at.getTime() >= Date.parse(candidate.archivedAt) + RETENTION_MS);
    if (trigger === "gate" && !mutationDue && !expiryRecheckDue) return { record: current, handled: false };
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
  let located = operationFor(current, operationId);
  selected = { handoff: located.handoff, index: located.index };
  operation = located.operation;
  let dispositions = [...operation.dispositions];
  for (let index = 0; index < dispositions.length; index += 1) {
    let disposition = dispositions[index];
    const refreshedDependencies = await options.resolveRetentionDependencies!(current);
    if (refreshedDependencies.status === "unavailable") {
      const held = { ...operation, phase: "held" as const, updatedAt: at.toISOString() };
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
      } catch {
        const held = { ...operation, phase: "held" as const, updatedAt: at.toISOString() };
        current = await persistOperation(current, selected.index, { ...selected.handoff, cleanup: { ...selected.handoff.cleanup, status: "held" } }, held, persist);
        return { record: current, handled: true };
      }
      await options.afterBoundary?.("archive-copied");
      disposition = { ...disposition, archiveRef };
      dispositions[index] = disposition;
      operation = { ...operation, phase: "registered", dispositions, updatedAt: at.toISOString() };
      current = await persistOperation(current, selected.index, selected.handoff, operation, persist);
      located = operationFor(current, operationId);
      selected = { handoff: located.handoff, index: located.index };
      operation = located.operation;
      dispositions = [...operation.dispositions];
      disposition = dispositions[index];
      await options.afterBoundary?.("archive-registered");
    }
    if (disposition.disposition === "archive") {
      if (!disposition.archiveRef) throw new Error("CLEANUP_ARCHIVE_REGISTRATION_MISSING");
      await verifyEvidenceRef(root, disposition.archiveRef);
      const removal = await removeVerifiedOriginal(root, current.importId, disposition.original.reference);
      disposition = { ...disposition, removedAt: at.toISOString() };
      dispositions[index] = disposition;
      if (removal === "missing" && operation.phase !== "registered") {
        operation = { ...operation, phase: "held", dispositions, updatedAt: at.toISOString() };
        current = await persistOperation(current, selected.index, { ...selected.handoff, cleanup: { ...selected.handoff.cleanup, status: "held" } }, operation, persist);
        return { record: current, handled: true };
      }
    } else if (disposition.disposition === "dispose" && !disposition.removedAt) {
      const removal = await removeVerifiedOriginal(root, current.importId, disposition.original.reference);
      if (removal === "missing") {
        operation = { ...operation, phase: "held", dispositions, updatedAt: at.toISOString() };
        current = await persistOperation(current, selected.index, { ...selected.handoff, cleanup: { ...selected.handoff.cleanup, status: "held" } }, operation, persist);
        return { record: current, handled: true };
      }
      disposition = { ...disposition, removedAt: at.toISOString() };
      dispositions[index] = disposition;
    }
  }

  located = operationFor(current, operationId);
  selected = { handoff: located.handoff, index: located.index };
  operation = located.operation;
  const remainingCandidates = selected.handoff.disposalCandidates.flatMap((candidate) => {
    const disposition = dispositions.find((item) => sameReference(item.original.reference, candidate.reference));
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
  let entries;
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
