import { createHash } from "node:crypto";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { z } from "zod";

import { contentApprovalSchema, resolveContentApproval } from "./content-approval";
import { externalArticleImportSchema, importPresentationReceiptSchema, type ExternalArticleImportV1 } from "./contracts";
import { evidenceRefSchema, evidenceReference, readEvidence, readVerifiedEvidenceBytes, storeEvidenceBytes, verifyEvidenceRef, type EvidenceRef } from "./execution-evidence";
import { fingerprintEditorialArtifact } from "../editorial/refinement";
import { validateEditorialExecution, workflowEvidenceSchema } from "./workflow-evidence";
import { verifyImportPresentationEvidence } from "./presentation";

const hashSchema = z.string().regex(/^[a-f0-9]{64}$/);
const findingProvenanceSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("known"), reviewer: z.string().min(1), executionId: z.string().min(1) }).strict(),
  z.object({ status: z.literal("missing"), reason: z.string().min(1) }).strict(),
]);
const findingApplicabilitySchema = z.object({
  status: z.enum(["applicable", "not-applicable"]),
  reason: z.string().min(1),
}).strict();
const registrationBase = {
  schemaVersion: z.literal("ArticleReviewEvidenceRegistrationV1"),
  registrationId: z.string().uuid(),
  importId: z.string().regex(/^article-[0-9a-f-]{36}$/),
  sourceFingerprint: hashSchema,
  examinedRevision: hashSchema,
  reviewer: z.object({ id: z.string().min(1), independent: z.boolean() }).strict(),
  criteria: z.array(z.object({ id: z.string().min(1), revision: z.string().min(1) }).strict()).min(1),
  evidenceRef: evidenceRefSchema,
  retentionDependencies: z.array(evidenceRefSchema).min(1),
  support: z.enum(["accepted", "rejected", "insufficient-evidence"]),
  registeredAt: z.string().datetime({ offset: true }),
  expiresAt: z.string().datetime({ offset: true }).optional(),
};

export const reviewEvidenceRegistrationSchema = z.discriminatedUnion("evidenceClass", [
  z.object({
    ...registrationBase,
    evidenceClass: z.literal("editorial-judgment"),
    payload: z.object({
      kind: z.literal("editorial-judgment"),
      artifactPath: z.string().min(1),
      assessmentRef: evidenceRefSchema,
      editorialExecutionRef: evidenceRefSchema,
      contentApproval: contentApprovalSchema,
    }).strict(),
  }).strict(),
  z.object({
    ...registrationBase,
    evidenceClass: z.literal("browser-observation"),
    payload: z.object({
      kind: z.literal("browser-observation"),
      presentationRef: evidenceRefSchema,
      presentation: importPresentationReceiptSchema,
    }).strict(),
  }).strict(),
  z.object({
    ...registrationBase,
    evidenceClass: z.literal("rejected-finding"),
    payload: z.object({
      kind: z.literal("rejected-finding"),
      findingId: z.string().regex(/^finding-[a-f0-9]{24}$/),
      stage: z.enum(["REFINING", "VALIDATING"]),
      activityId: z.string().min(1),
      observation: z.string().min(1),
      expectedCheck: z.string().min(1),
      provenance: findingProvenanceSchema,
      applicability: findingApplicabilitySchema,
      protectedReferences: z.array(evidenceRefSchema).min(1),
    }).strict(),
  }).strict(),
  z.object({
    ...registrationBase,
    evidenceClass: z.literal("finding-resolution"),
    payload: z.object({
      kind: z.literal("finding-resolution"),
      findingId: z.string().regex(/^finding-[a-f0-9]{24}$/),
      findingRegistrationId: z.string().uuid(),
      reviewId: z.string().regex(/^finding-review-[a-f0-9]{24}$/),
      disposition: z.enum(["verified-repair", "appropriate-removal", "evidenced-dismissal"]),
      observation: z.string().min(1),
      expectedCheck: z.string().min(1),
      provenance: findingProvenanceSchema,
      applicability: findingApplicabilitySchema,
      protectedReferences: z.array(evidenceRefSchema).min(1),
    }).strict(),
  }).strict(),
]);

export type ReviewEvidenceRegistration = z.infer<typeof reviewEvidenceRegistrationSchema>;
export type ReviewEvidenceClass = ReviewEvidenceRegistration["evidenceClass"];
export type ReviewEvidenceDimensions = {
  relevance: boolean;
  support: boolean;
  integrity: boolean;
  freshness: boolean;
  reusable: boolean;
};

export interface ArticleReviewEvidenceRegistry {
  list(input: { importId: string; evidenceClass: ReviewEvidenceClass }): Promise<ReviewEvidenceRegistration[]>;
  commit(input: ReviewEvidenceRegistration): Promise<{ registrationId: string; replayed: boolean }>;
}

export function reviewExaminedRevision(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function reviewRegistrationId(value: unknown): string {
  const hex = reviewExaminedRevision(value).slice(0, 32).split("");
  hex[12] = "4";
  hex[16] = ((Number.parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const id = hex.join("");
  return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
}

export async function evaluateRegisteredReviewEvidence(
  raw: ReviewEvidenceRegistration,
  context: { root: string; importId: string; sourceFingerprint: string; examinedRevision: string; now: string },
): Promise<ReviewEvidenceDimensions> {
  const registration = reviewEvidenceRegistrationSchema.parse(raw);
  const relevance = registration.importId === context.importId &&
    registration.sourceFingerprint === context.sourceFingerprint &&
    registration.examinedRevision === context.examinedRevision;
  const support = registration.evidenceClass === "rejected-finding"
    ? registration.support === "rejected" && registration.payload.provenance.status === "known" && registration.criteria.length > 0
    : registration.support === "accepted" && registration.reviewer.independent && registration.criteria.length > 0;
  const freshness = !registration.expiresAt || Date.parse(registration.expiresAt) > Date.parse(context.now);
  let integrity = true;
  try {
    const refs = [registration.evidenceRef, ...registration.retentionDependencies];
    for (const ref of refs) await verifyEvidenceRef(context.root, ref);
  } catch {
    integrity = false;
  }
  return { relevance, support, integrity, freshness, reusable: relevance && support && integrity && freshness };
}

export async function resolveRegisteredReviewEvidence(
  registry: ArticleReviewEvidenceRegistry,
  input: { root: string; importId: string; sourceFingerprint: string; evidenceClass: ReviewEvidenceClass; examinedRevision: string; now: string },
): Promise<{ registration?: ReviewEvidenceRegistration; dimensions: ReviewEvidenceDimensions }> {
  const candidates = await registry.list({ importId: input.importId, evidenceClass: input.evidenceClass });
  for (const candidate of candidates.sort((a, b) => Date.parse(b.registeredAt) - Date.parse(a.registeredAt))) {
    const dimensions = await evaluateRegisteredReviewEvidence(candidate, input);
    if (dimensions.reusable) return { registration: candidate, dimensions };
  }
  const latest = candidates.at(0);
  return latest
    ? { dimensions: await evaluateRegisteredReviewEvidence(latest, input) }
    : { dimensions: { relevance: false, support: false, integrity: false, freshness: false, reusable: false } };
}

export function uniqueEvidenceRefs(refs: EvidenceRef[]): EvidenceRef[] {
  return [...new Map(refs.map((ref) => [`${ref.path}:${ref.sha256}`, ref])).values()];
}

type ActivityFinding = NonNullable<ExternalArticleImportV1["activityFindings"]>[number];
type ActivityFindingReview = NonNullable<ExternalArticleImportV1["activityFindingReviews"]>[number];

export async function registerActivityFindingEvidence(
  root: string,
  registry: ArticleReviewEvidenceRegistry,
  record: ExternalArticleImportV1,
  finding: ActivityFinding,
): Promise<ReviewEvidenceRegistration> {
  const frozen = await freezeActivityReferences(root, record.importId, [finding.originalEvidenceRef, ...finding.dependencyRefs]);
  const originalEvidenceRef = frozen[0];
  const protectedReferences = uniqueEvidenceRefs(frozen);
  const registration = reviewEvidenceRegistrationSchema.parse({
    schemaVersion: "ArticleReviewEvidenceRegistrationV1",
    registrationId: reviewRegistrationId({ importId: record.importId, evidenceClass: "rejected-finding", findingId: finding.findingId, evidenceSha256: originalEvidenceRef.sha256 }),
    evidenceClass: "rejected-finding",
    importId: record.importId,
    sourceFingerprint: record.sourceFingerprint,
    examinedRevision: finding.revision,
    reviewer: { id: finding.reviewer, independent: false },
    criteria: [finding.criterion],
    evidenceRef: originalEvidenceRef,
    retentionDependencies: protectedReferences,
    support: "rejected",
    registeredAt: finding.openedAt,
    payload: {
      kind: "rejected-finding",
      findingId: finding.findingId,
      stage: finding.stage,
      activityId: finding.activityId,
      observation: finding.observation,
      expectedCheck: finding.expectedCheck,
      provenance: { status: "known", reviewer: finding.reviewer, executionId: finding.executionId },
      applicability: { status: "applicable", reason: "The rejected criterion applies to the examined activity revision." },
      protectedReferences,
    },
  });
  await registry.commit(registration);
  return registration;
}

export async function registerActivityFindingResolutionEvidence(
  root: string,
  registry: ArticleReviewEvidenceRegistry,
  record: ExternalArticleImportV1,
  finding: ActivityFinding,
  review: ActivityFindingReview,
): Promise<ReviewEvidenceRegistration> {
  if (!["verified-repair", "appropriate-removal", "evidenced-dismissal"].includes(review.disposition)) throw new Error("ACTIVITY_FINDING_RESOLUTION_NOT_CONCLUSIVE");
  const findingRegistrations = await registry.list({ importId: record.importId, evidenceClass: "rejected-finding" });
  const findingRegistration = await reusableFindingRegistration(root, record, finding, findingRegistrations, review.reviewedAt)
    ?? await registerActivityFindingEvidence(root, registry, record, finding);
  const findingRegistrationId = findingRegistration.registrationId;
  const currentReferences = await freezeActivityReferences(root, record.importId, [
    review.resultRef,
    ...review.evidenceRefs,
    ...(review.changedInputRefs ?? []),
    ...(review.regressionChecks ?? []).flatMap((check) => check.evidenceRefs),
  ]);
  const protectedReferences = uniqueEvidenceRefs([findingRegistration.evidenceRef, ...findingRegistration.retentionDependencies, ...currentReferences]);
  const resolutionEvidenceRef = currentReferences[0];
  const registration = reviewEvidenceRegistrationSchema.parse({
    schemaVersion: "ArticleReviewEvidenceRegistrationV1",
    registrationId: reviewRegistrationId({ importId: record.importId, evidenceClass: "finding-resolution", findingId: finding.findingId, reviewId: review.reviewId }),
    evidenceClass: "finding-resolution",
    importId: record.importId,
    sourceFingerprint: record.sourceFingerprint,
    examinedRevision: review.inputFingerprint,
    reviewer: { id: review.reviewer, independent: review.reviewer !== finding.reviewer && review.executionId !== finding.executionId },
    criteria: uniqueCriteria([finding.criterion, ...(review.regressionChecks ?? []).map((check) => check.criterion)]),
    evidenceRef: resolutionEvidenceRef,
    retentionDependencies: protectedReferences,
    support: "accepted",
    registeredAt: review.reviewedAt,
    payload: {
      kind: "finding-resolution",
      findingId: finding.findingId,
      findingRegistrationId,
      reviewId: review.reviewId,
      disposition: review.disposition,
      observation: review.observation,
      expectedCheck: review.expectedCheck,
      provenance: { status: "known", reviewer: review.reviewer, executionId: review.executionId },
      applicability: review.disposition === "appropriate-removal"
        ? { status: "not-applicable", reason: review.observation }
        : { status: "applicable", reason: "The independent resolution applies to the changed activity revision." },
      protectedReferences,
    },
  });
  await registry.commit(registration);
  return registration;
}

export async function reconcileActivityFindingEvidence(
  root: string,
  registry: ArticleReviewEvidenceRegistry,
  record: ExternalArticleImportV1,
  now = new Date().toISOString(),
): Promise<ExternalArticleImportV1> {
  const findings = [...(record.activityFindings ?? [])];
  let changed = false;
  for (let index = 0; index < findings.length; index += 1) {
    const finding = findings[index];
    const findingCandidates = await registry.list({ importId: record.importId, evidenceClass: "rejected-finding" });
    const findingRegistration = await reusableFindingRegistration(root, record, finding, findingCandidates, now);
    let findingReusable = Boolean(findingRegistration);
    if (!findingCandidates.some((candidate) => candidate.payload.kind === "rejected-finding" && candidate.payload.findingId === finding.findingId)) {
      try { await registerActivityFindingEvidence(root, registry, record, finding); findingReusable = true; }
      catch (error) { rethrowRegistryFailure(error); findingReusable = false; }
    }
    if (!findingReusable) {
      if (finding.status === "resolved") { findings[index] = reopenFinding(finding); changed = true; }
      continue;
    }
    if (finding.status !== "resolved" || !finding.resolutionReviewId) continue;
    const review = record.activityFindingReviews?.find((candidate) => candidate.reviewId === finding.resolutionReviewId);
    if (!review) { findings[index] = reopenFinding(finding); changed = true; continue; }
    const resolutionCandidates = await registry.list({ importId: record.importId, evidenceClass: "finding-resolution" });
    const resolutionCandidate = resolutionCandidates.find((candidate) => candidate.payload.kind === "finding-resolution" && candidate.payload.reviewId === review.reviewId);
    if (resolutionCandidate) {
      const dimensions = await evaluateRegisteredReviewEvidence(resolutionCandidate, { root, importId: record.importId, sourceFingerprint: record.sourceFingerprint, examinedRevision: review.inputFingerprint, now });
      if (dimensions.reusable) continue;
    } else {
      try {
        await registerActivityFindingResolutionEvidence(root, registry, record, finding, review);
        continue;
      } catch (error) { rethrowRegistryFailure(error); /* Missing local evidence must be reacquired through the owning activity. */ }
    }
    findings[index] = reopenFinding(finding);
    changed = true;
  }
  return changed ? externalArticleImportSchema.parse({ ...record, activityFindings: findings }) : record;
}

async function reusableFindingRegistration(
  root: string,
  record: ExternalArticleImportV1,
  finding: ActivityFinding,
  candidates: ReviewEvidenceRegistration[],
  now: string,
): Promise<ReviewEvidenceRegistration | undefined> {
  for (const candidate of candidates) {
    if (candidate.payload.kind !== "rejected-finding" || candidate.payload.findingId !== finding.findingId) continue;
    const dimensions = await evaluateRegisteredReviewEvidence(candidate, { root, importId: record.importId, sourceFingerprint: record.sourceFingerprint, examinedRevision: finding.revision, now });
    if (dimensions.reusable) return candidate;
  }
  return undefined;
}

function rethrowRegistryFailure(error: unknown): void {
  if (error instanceof Error && error.message.startsWith("CAPABILITY_UNAVAILABLE:")) throw error;
}

function reopenFinding(finding: ActivityFinding): ActivityFinding {
  const { resolutionReviewId: _resolutionReviewId, resolvedAt: _resolvedAt, ...retained } = finding;
  return { ...retained, status: "open" };
}

async function freezeActivityReferences(root: string, importId: string, refs: EvidenceRef[]): Promise<EvidenceRef[]> {
  const frozen: EvidenceRef[] = [];
  for (const ref of refs) frozen.push(await storeEvidenceBytes(root, importId, await readVerifiedEvidenceBytes(root, ref)));
  return uniqueEvidenceRefs(frozen);
}

function uniqueCriteria(criteria: Array<{ id: string; revision: string }>) {
  return [...new Map(criteria.map((criterion) => [`${criterion.id}:${criterion.revision}`, criterion])).values()];
}

export async function editorialReviewRevision(root: string, record: ExternalArticleImportV1): Promise<string> {
  if (!record.artifactPath) throw new Error("EVIDENCE_ARTIFACT_REQUIRED");
  const artifact = JSON.parse(await readFile(path.resolve(root, record.artifactPath), "utf8"));
  return reviewExaminedRevision({
    evidenceClass: "editorial-judgment",
    sourceFingerprint: record.sourceFingerprint,
    requirementRevision: record.requirementRevision,
    format: record.format,
    artifactFingerprint: fingerprintEditorialArtifact(artifact),
  });
}

export function browserReviewRevision(record: ExternalArticleImportV1): string {
  if (!record.contentApproval) throw new Error("CONTENT_APPROVAL_INVALID");
  return reviewExaminedRevision({
    evidenceClass: "browser-observation",
    sourceFingerprint: record.sourceFingerprint,
    requirementRevision: record.requirementRevision,
    format: record.format,
    artifactFingerprint: record.contentApproval.artifactFingerprint,
    heroImage: record.heroImage ? fingerprintEditorialArtifact(record.heroImage) : null,
  });
}

const acceptedDimensions: ReviewEvidenceDimensions = { relevance: true, support: true, integrity: true, freshness: true, reusable: true };

export async function registerEditorialReviewEvidence(
  root: string,
  registry: ArticleReviewEvidenceRegistry,
  record: ExternalArticleImportV1,
  now = new Date().toISOString(),
): Promise<ReviewEvidenceRegistration> {
  const approval = contentApprovalSchema.parse(record.contentApproval);
  const assessmentRef = evidenceRefSchema.parse(record.evidenceRefs?.assessment);
  const editorialExecutionRef = evidenceRefSchema.parse(record.evidenceRefs?.editorial);
  const resolved = await resolveContentApproval(root, approval, record.format, record.sourceFingerprint, record.artifactPath, record.transformation?.resolvedAffiliateUrl);
  if (!resolved.ok) throw new Error("CONTENT_APPROVAL_INVALID");
  const execution = await validateEditorialExecution(root, editorialExecutionRef, record);
  const receiptRef = execution.editorialEvidenceRef;
  const qualityRef = await evidenceReference(root, approval.formatQualityPath);
  const artifactRef = await evidenceReference(root, approval.artifactPath);
  const passRefs = execution.passes.flatMap((pass) => [pass.inputRef, pass.outputRef, pass.executionRef, pass.judgmentRef, ...pass.instructionRefs]);
  const registration = reviewEvidenceRegistrationSchema.parse({
    schemaVersion: "ArticleReviewEvidenceRegistrationV1",
    registrationId: reviewRegistrationId({ importId: record.importId, evidenceClass: "editorial-judgment", examinedRevision: await editorialReviewRevision(root, record), evidenceRef: receiptRef }),
    evidenceClass: "editorial-judgment",
    importId: record.importId,
    sourceFingerprint: record.sourceFingerprint,
    examinedRevision: await editorialReviewRevision(root, record),
    reviewer: { id: `independent:${execution.passes[3].judgmentRef.sha256}`, independent: true },
    criteria: [
      ...execution.passes.map((pass) => ({ id: `editorial:${pass.name}`, revision: execution.schemaRevision })),
      { id: "editorial:5/5-clean", revision: execution.schemaRevision },
    ],
    evidenceRef: receiptRef,
    retentionDependencies: uniqueEvidenceRefs([artifactRef, qualityRef, assessmentRef, editorialExecutionRef, receiptRef, ...(record.evidenceRefs?.research ? [record.evidenceRefs.research] : []), ...passRefs, execution.checkerExecutionRef]),
    support: "accepted",
    registeredAt: now,
    payload: { kind: "editorial-judgment", artifactPath: approval.artifactPath, assessmentRef, editorialExecutionRef, contentApproval: approval },
  });
  await registry.commit(registration);
  return registration;
}

export async function registerBrowserReviewEvidence(
  root: string,
  registry: ArticleReviewEvidenceRegistry,
  record: ExternalArticleImportV1,
  now = new Date().toISOString(),
): Promise<ReviewEvidenceRegistration> {
  await verifyImportPresentationEvidence(root, record);
  const presentationRef = evidenceRefSchema.parse(record.evidenceRefs?.presentation);
  const presentation = importPresentationReceiptSchema.parse(record.presentation);
  const workflow = workflowEvidenceSchema.parse(await readEvidence(root, presentationRef));
  const registration = reviewEvidenceRegistrationSchema.parse({
    schemaVersion: "ArticleReviewEvidenceRegistrationV1",
    registrationId: reviewRegistrationId({ importId: record.importId, evidenceClass: "browser-observation", examinedRevision: browserReviewRevision(record), evidenceRef: presentationRef }),
    evidenceClass: "browser-observation",
    importId: record.importId,
    sourceFingerprint: record.sourceFingerprint,
    examinedRevision: browserReviewRevision(record),
    reviewer: { id: `independent:${presentation.validationReceiptFingerprint}`, independent: true },
    criteria: workflow.ruleResults.map((result) => ({ id: `presentation:${result.ruleId}`, revision: result.revision })),
    evidenceRef: presentationRef,
    retentionDependencies: uniqueEvidenceRefs([workflow.artifactRef, workflow.renderInputsRef, ...workflow.predecessorRefs, ...workflow.ruleResults.flatMap((result) => result.evidenceRefs), ...presentation.evidenceFiles]),
    support: "accepted",
    registeredAt: now,
    payload: { kind: "browser-observation", presentationRef, presentation },
  });
  await registry.commit(registration);
  return registration;
}

export async function reuseEditorialReviewEvidence(
  root: string,
  registry: ArticleReviewEvidenceRegistry,
  record: ExternalArticleImportV1,
  now = new Date().toISOString(),
) {
  const examinedRevision = await editorialReviewRevision(root, record);
  const resolution = await resolveRegisteredReviewEvidence(registry, { root, importId: record.importId, sourceFingerprint: record.sourceFingerprint, evidenceClass: "editorial-judgment", examinedRevision, now });
  const status = { registrationId: resolution.registration?.registrationId, examinedRevision, dimensions: resolution.dimensions, action: resolution.registration ? "reused" as const : "reacquire" as const, checkedAt: now };
  if (!resolution.registration || resolution.registration.payload.kind !== "editorial-judgment") return { status };
  const payload = resolution.registration.payload;
  const reused = { ...record, artifactPath: payload.artifactPath, contentApproval: contentApprovalSchema.parse(payload.contentApproval), evidenceRefs: { ...record.evidenceRefs, assessment: payload.assessmentRef, editorial: payload.editorialExecutionRef } };
  const content = await resolveContentApproval(root, reused.contentApproval, reused.format, reused.sourceFingerprint, reused.artifactPath, reused.transformation?.resolvedAffiliateUrl);
  if (!content.ok) return { status: { ...status, dimensions: { ...status.dimensions, integrity: false, reusable: false }, action: "reacquire" as const } };
  try {
    await validateEditorialExecution(root, payload.editorialExecutionRef, reused);
    return { record: reused, status };
  } catch {
    return { status: { ...status, dimensions: { ...status.dimensions, support: false, reusable: false }, action: "reacquire" as const } };
  }
}

export async function reuseBrowserReviewEvidence(
  root: string,
  registry: ArticleReviewEvidenceRegistry,
  record: ExternalArticleImportV1,
  now = new Date().toISOString(),
) {
  const examinedRevision = browserReviewRevision(record);
  const resolution = await resolveRegisteredReviewEvidence(registry, { root, importId: record.importId, sourceFingerprint: record.sourceFingerprint, evidenceClass: "browser-observation", examinedRevision, now });
  const status = { registrationId: resolution.registration?.registrationId, examinedRevision, dimensions: resolution.dimensions, action: resolution.registration ? "reused" as const : "reacquire" as const, checkedAt: now };
  if (!resolution.registration || resolution.registration.payload.kind !== "browser-observation") return { status };
  const reused = { ...record, presentation: resolution.registration.payload.presentation, evidenceRefs: { ...record.evidenceRefs, presentation: resolution.registration.payload.presentationRef } };
  try {
    await verifyImportPresentationEvidence(root, reused);
    return { record: reused, status };
  } catch {
    return { status: { ...status, dimensions: { ...status.dimensions, support: false, reusable: false }, action: "reacquire" as const } };
  }
}

export function registeredReviewStatus(registration: ReviewEvidenceRegistration, checkedAt = registration.registeredAt) {
  return { registrationId: registration.registrationId, examinedRevision: registration.examinedRevision, dimensions: acceptedDimensions, action: "registered" as const, checkedAt };
}
