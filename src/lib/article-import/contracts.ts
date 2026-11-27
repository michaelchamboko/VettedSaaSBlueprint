import { z } from "zod";
import { contentApprovalSchema } from "./content-approval";

const stateEvidenceRef = z.object({ path: z.string().min(1), sha256: z.string().regex(/^[a-f0-9]{64}$/) }).strict();
export const importFailureCategorySchema = z.enum(["content-rejection", "invalid-evidence", "unavailable-capability", "uncertain-external-outcome"]);
export type ImportFailureCategory = z.infer<typeof importFailureCategorySchema>;
export const recoveryEvidenceSchema = z.object({ schemaVersion: z.literal("RecoveryEvidenceV1"), importId: z.string(), sourceFingerprint: z.string().regex(/^[a-f0-9]{64}$/), cause: z.string().min(1), checkedAt: z.string().datetime({ offset: true }), executionRefs: z.array(stateEvidenceRef).min(1), resumptionRequirement: z.string().min(1) }).strict();
const remedyCheckSchema = z.discriminatedUnion("method", [
  z.object({ method: z.literal("deterministic"), result: z.enum(["verified", "contradicted"]), observation: z.string().min(1) }).strict(),
  z.object({ method: z.literal("independent-judgment"), independent: z.literal(true), result: z.enum(["verified", "contradicted"]), observation: z.string().min(1) }).strict(),
]);
const repairChangeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("product-repair"), changedInputs: z.array(z.string().min(1)).min(1) }).strict(),
  z.object({ kind: z.literal("measurement-change"), aspect: z.enum(["measurement", "viewport", "criterion", "threshold"]), from: z.string().min(1), to: z.string().min(1), justification: z.string().min(1), independentVerificationRef: stateEvidenceRef }).strict(),
]);
const diagnosisFields = {
  schemaVersion: z.literal("DiagnosisV1"), importId: z.string(), sourceFingerprint: z.string(), stage: z.string(),
  failedSubmissionDigest: z.string().regex(/^[a-f0-9]{64}$/), replacementSubmissionDigest: z.string().regex(/^[a-f0-9]{64}$/),
  failureCode: z.string().min(1), cause: z.string().min(1), attemptedRecoveryRefs: z.array(stateEvidenceRef).min(1),
  remedyEvidenceRefs: z.array(stateEvidenceRef).min(1), createdAt: z.string().datetime({ offset: true }), consumedAt: z.string().datetime({ offset: true }).optional(),
};
export const diagnosisSchema = z.object({
  ...diagnosisFields,
  predictedObservation: z.string().min(1).optional(),
  disproofCheck: z.string().min(1).optional(),
  remedyCheck: remedyCheckSchema.optional(),
  repairChange: repairChangeSchema.optional(),
}).strict();
export const actionableDiagnosisSchema = z.object({
  ...diagnosisFields,
  predictedObservation: z.string().min(1),
  disproofCheck: z.string().min(1),
  remedyCheck: remedyCheckSchema,
  repairChange: repairChangeSchema,
}).strict().superRefine((diagnosis, context) => {
  const attempted = new Set(diagnosis.attemptedRecoveryRefs.map((ref) => `${ref.path}:${ref.sha256}`));
  const remedy = new Set(diagnosis.remedyEvidenceRefs.map((ref) => `${ref.path}:${ref.sha256}`));
  if ([...remedy].some((ref) => attempted.has(ref))) {
    context.addIssue({ code: "custom", path: ["remedyEvidenceRefs"], message: "Remedy verification must use evidence separate from the failed recovery evidence." });
  }
  if (diagnosis.repairChange.kind === "measurement-change") {
    const verification = `${diagnosis.repairChange.independentVerificationRef.path}:${diagnosis.repairChange.independentVerificationRef.sha256}`;
    if (attempted.has(verification) || remedy.has(verification)) context.addIssue({ code: "custom", path: ["repairChange", "independentVerificationRef"], message: "Measurement verification must be independent from diagnosis and remedy evidence." });
  }
});

export const importStageSchema = z.enum([
  "INGESTING", "RESEARCHING", "TRANSFORMING", "REFINING", "VALIDATING",
  "RELEASING", "VERIFYING", "REPAIRING", "WAITING_EXTERNAL", "ROLLED_BACK",
  "LIVE", "QUARANTINED",
]);
export type ImportStage = z.infer<typeof importStageSchema>;

export const importFormatSchema = z.enum(["direct-review", "blog", "visibility", "decision-set", "agent_review_required"]);
export type ImportFormat = z.infer<typeof importFormatSchema>;

export const failureClassSchema = z.enum(["deterministic", "transient", "policy"]);
export type FailureClass = z.infer<typeof failureClassSchema>;

export const importTransformationSchema = z.object({
  schemaVersion: z.literal("ImportTransformationV1"),
  format: importFormatSchema,
  title: z.string().min(1),
  primaryQuestion: z.string().min(1),
  affiliateName: z.string().optional(),
  submittedAffiliateUrl: z.string().url().optional(),
  resolvedAffiliateUrl: z.string().url().optional(),
  commercialMode: z.enum(["approved", "decommercialized", "none"]),
  removals: z.array(z.string()),
  claimRisks: z.array(z.enum(["price", "discount", "ranking", "named_comparison", "first_person_experience", "unsupported_certainty"])),
  sourceFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  inferredFields: z.array(z.string()),
}).strict();
export type ImportTransformationV1 = z.infer<typeof importTransformationSchema>;

export const pageDesignValidationSchema = z.object({
  scope: z.literal("new_or_materially_changed_public_page"),
  authority: z.discriminatedUnion("mode", [
    z.object({ mode: z.literal("identity_pilot"), init: z.literal(true), document: z.literal(true), extract: z.literal(true) }).strict(),
    z.object({ mode: z.literal("reused") }).strict(),
  ]),
  impeccable: z.object({ context: z.literal(true), shape: z.literal(true), critique: z.literal(true), audit: z.literal(true), detect: z.literal(true), polish: z.literal(true) }).strict(),
  specialists: z.object({
    emilDesignEngineering: z.enum(["passed", "not_applicable"]),
    mobileNative: z.enum(["passed", "not_applicable"]),
    appleDesign: z.enum(["passed", "not_applicable"]),
    pickUiLibrary: z.enum(["passed", "not_applicable"]),
    askSonner: z.enum(["passed", "not_applicable"]),
  }).strict(),
  notes: z.string().min(1),
}).strict().superRefine((design, context) => {
  const notes = design.notes.toLocaleLowerCase();
  if (notes.includes("unknown command") || notes.includes("not run") || notes.includes("unavailable")) {
    context.addIssue({ code: "custom", path: ["notes"], message: "Presentation evidence cannot pass when a required design check was unavailable or not run." });
  }
});

export const importPresentationValidationSchema = z.object({
  schemaVersion: z.literal("ImportPresentationValidationV1"),
  format: importFormatSchema.exclude(["agent_review_required"]),
  artifactFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  heroImageFingerprint: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  renderedRoutes: z.array(z.string().startsWith("/")).min(1),
  checks: z.object({ desktop: z.literal(true), mobile: z.literal(true), accessibility: z.literal(true), technicalSeo: z.literal(true), overflow: z.literal(true), runtimeErrors: z.literal(true) }).strict(),
  pageDesign: pageDesignValidationSchema,
  evidencePaths: z.array(z.string().min(1)).min(1),
  notes: z.string().min(1),
}).strict();

export const importPresentationReceiptSchema = z.object({
  schemaVersion: z.literal("ImportPresentationReceiptV1"),
  format: importFormatSchema.exclude(["agent_review_required"]),
  artifactFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  heroImageFingerprint: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  artifactPath: z.string().min(1),
  validationGate: z.string().min(1),
  validationReceiptFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  validation: importPresentationValidationSchema,
  evidenceFiles: z.array(z.object({ path: z.string().min(1), sha256: z.string().regex(/^[a-f0-9]{64}$/) }).strict()).min(1),
  renderedRoutes: z.array(z.string().startsWith("/")).min(1),
  presentedAt: z.string().datetime({ offset: true }),
}).strict();

export const importReleaseSchema = z.object({
  schemaVersion: z.literal("ImportReleaseV1"),
  commitSha: z.string().regex(/^[a-f0-9]{40}$/),
  deploymentId: z.string().min(1),
  canonicalUrl: z.string().url(),
  verifiedAt: z.string().datetime({ offset: true }),
  checks: z.object({
    routeOk: z.literal(true),
    contentOk: z.literal(true),
    disclosureOk: z.literal(true),
    exactCtaOk: z.literal(true),
    desktopOk: z.literal(true),
    mobileOk: z.literal(true),
    robotsOk: z.literal(true),
    sitemapOk: z.literal(true),
    browserErrorsOk: z.literal(true),
  }).strict(),
  previousDeploymentId: z.string().min(1).optional(),
  productionVerifierRef: stateEvidenceRef.optional(),
  presentationFingerprint: z.string().regex(/^[a-f0-9]{64}$/).optional(),
}).strict();
export type ImportReleaseV1 = z.infer<typeof importReleaseSchema>;

export const importCodeReviewSchema = z.object({
  schemaVersion: z.literal("ImportCodeReviewV1"),
  reviewer: z.literal("codex"),
  independent: z.literal(true),
  passed: z.literal(true),
  reviewedCommitSha: z.string().regex(/^[a-f0-9]{40}$/),
  pullRequestUrl: z.string().url(),
  evidenceUrl: z.string().url(),
  reviewedAt: z.string().datetime({ offset: true }),
}).strict();

export const importImproveSchema = z.object({
  schemaVersion: z.literal("ImportImproveV1"),
  publicationKey: z.string().regex(/^[a-f0-9]{64}$/),
  boundCommitSha: z.string().regex(/^[a-f0-9]{40}$/),
  runRef: stateEvidenceRef,
  phase: z.enum(["ASSESSING", "RESOLVING", "COMPLETE", "BLOCKED"]),
  attempt: z.number().int().nonnegative(),
  workPath: z.string().min(1).optional(),
  resultPath: z.string().min(1).optional(),
  issueKeys: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)).default([]),
  resolvedKeys: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)).default([]),
  openKeys: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)).default([]),
  handoffRefs: z.array(stateEvidenceRef).default([]),
  startedAt: z.string().datetime({ offset: true }).optional(),
  repairWorktree: z.object({ branch: z.string().regex(/^codex\/improve-[a-f0-9]{16}$/), path: z.string().min(1) }).strict().optional(),
  pendingReview: z.object({ status: z.enum(["PENDING_REVIEW", "PENDING_MERGE", "CHANGES_REQUESTED", "CLOSED_UNMERGED"]), commitSha: z.string().regex(/^[a-f0-9]{40}$/), pullRequestUrl: z.string().url(), evidenceUrl: z.string().url().optional(), reviewText: z.string().min(1).optional(),
    findings: z.array(z.object({ path: z.string().min(1), line: z.number().int().positive().nullable(), body: z.string().min(1) }).strict()).optional(), repairs: z.array(z.unknown()).min(1),
    handoffs: z.object({ retrospective: stateEvidenceRef, diagnosis: stateEvidenceRef, repair: stateEvidenceRef, architecture: stateEvidenceRef }).strict() }).strict().optional(),
  failure: z.object({ code: z.string().min(1), message: z.string().min(1), at: z.string().datetime({ offset: true }) }).strict().optional(),
  completedAt: z.string().datetime({ offset: true }).optional(),
}).strict();
export type ImportImproveV1 = z.infer<typeof importImproveSchema>;

const continuationBase = {
  idempotencyKey: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  sourceFingerprint: z.string().regex(/^[a-f0-9]{64}$/).optional(),
};
export const importContinuationSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("work"), stage: importStageSchema, workPath: z.string().min(1), resultPath: z.string().min(1), activityId: z.string().min(1).optional(), inputFingerprint: z.string().regex(/^[a-f0-9]{64}$/).optional(), ...continuationBase }).strict(),
  z.object({ kind: z.literal("repair"), stage: importStageSchema, failureCategory: importFailureCategorySchema.optional(), failureFingerprint: z.string().regex(/^[a-f0-9]{64}$/), submittedFingerprint: z.string().regex(/^[a-f0-9]{64}$/).optional(), diagnosisRequired: z.boolean(), requiredChange: z.string().min(1), ...continuationBase }).strict(),
  z.object({ kind: z.literal("wait"), resumeStage: importStageSchema, dependency: z.string().min(1), externalId: z.string().min(1).optional(), waitStartedAt: z.string().datetime({ offset: true }), lastProgressAt: z.string().datetime({ offset: true }), nextCheckAt: z.string().datetime({ offset: true }), timeoutAt: z.string().datetime({ offset: true }) }).strict(),
  z.object({ kind: z.literal("blocked"), scope: z.enum(["article", "shared"]), failureCategory: importFailureCategorySchema.optional(), cause: z.string().min(1), attemptedRecovery: z.string().min(1), resumptionRequirement: z.string().min(1) }).strict(),
  z.object({ kind: z.literal("complete"), result: z.enum(["LIVE", "QUARANTINED", "PUBLISHED_WITH_EXCEPTIONS"]), receiptPaths: z.array(z.string().min(1)).min(1) }).strict(),
]);
export type ImportContinuation = z.infer<typeof importContinuationSchema>;

const activityCriterionSchema = z.object({ id: z.string().min(1), revision: z.string().min(1) }).strict();
export const importActivityReceiptSchema = z.object({
  schemaVersion: z.literal("ImportActivityReceiptV1"),
  stage: z.enum(["REFINING", "VALIDATING"]),
  activityId: z.string().min(1),
  inputFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  criteria: z.array(activityCriterionSchema).min(1),
  dependencyRefs: z.array(stateEvidenceRef).min(1),
  resultRef: stateEvidenceRef,
  reviewer: z.string().min(1),
  executionId: z.string().min(1),
  outcome: z.enum(["accepted", "rejected", "unverified", "not-applicable"]),
  observation: z.string().min(1).optional(),
  applicabilityReason: z.string().min(1).optional(),
  completedAt: z.string().datetime({ offset: true }),
}).strict().superRefine((value, context) => {
  if (["accepted", "rejected"].includes(value.outcome) && !value.observation) context.addIssue({ code: "custom", path: ["observation"], message: "Accepted and rejected activity reviews require an observation." });
  if (value.outcome === "not-applicable" && !value.applicabilityReason) context.addIssue({ code: "custom", path: ["applicabilityReason"], message: "Inapplicability requires a reason." });
});

export const importPendingReleaseSchema = z.object({
  schemaVersion: z.literal("ImportPendingReleaseV1"),
  reviewedCommitSha: z.string().regex(/^[a-f0-9]{40}$/),
  branch: z.string().regex(/^codex\/article-import\/[a-z0-9-]{1,80}$/),
  pullRequestUrl: z.string().url().optional(),
  createdAt: z.string().datetime({ offset: true }),
  mergeCommitSha: z.string().regex(/^[a-f0-9]{40}$/).optional(),
  rollbackDeploymentId: z.string().min(1).optional(),
  rollbackCommitSha: z.string().regex(/^[a-f0-9]{40}$/).optional(),
  operations: z.object({
    commit: z.object({ reviewedCommitSha: z.string().regex(/^[a-f0-9]{40}$/) }).strict().optional(),
    push: z.object({ branch: z.string().min(1), pullRequestUrl: z.string().url() }).strict().optional(),
    review: z.object({ reviewedHeadSha: z.string().regex(/^[a-f0-9]{40}$/), evidenceUrl: z.string().url() }).strict().optional(),
    merge: z.object({ reviewedHeadSha: z.string().regex(/^[a-f0-9]{40}$/), mergeCommitSha: z.string().regex(/^[a-f0-9]{40}$/) }).strict().optional(),
    deployment: z.object({
      commitSha: z.string().regex(/^[a-f0-9]{40}$/),
      operationKey: z.string().min(1),
      productionAssignment: z.string().url().optional(),
      rollbackDeploymentId: z.string().min(1).optional(),
      rollbackCommitSha: z.string().regex(/^[a-f0-9]{40}$/).optional(),
      phase: z.enum(["prepared", "invoking", "confirmed", "held"]).optional(),
      attemptedAt: z.string().datetime({ offset: true }).optional(),
      reconciledAt: z.string().datetime({ offset: true }).optional(),
      missingEvidence: z.array(z.string().min(1)).optional(),
      deploymentId: z.string().min(1).optional(),
      url: z.string().url().optional(),
    }).strict().optional(),
    rollback: z.object({ deploymentId: z.string().min(1), restoredCommitSha: z.string().regex(/^[a-f0-9]{40}$/) }).strict().optional(),
  }).strict().optional(),
  codeReview: importCodeReviewSchema.optional(),
}).strict();

export const externalArticleImportSchema = z.object({
  schemaVersion: z.enum(["ExternalArticleImportV1", "ExternalArticleImportV2"]),
  workflowVersion: z.literal(2).optional(),
  requirementRevision: z.string().min(1).optional(),
  evidenceRefs: z.object({ research: stateEvidenceRef.optional(), transformAssessment: stateEvidenceRef.optional(), assessment: stateEvidenceRef.optional(), editorial: stateEvidenceRef.optional(), hero: stateEvidenceRef.optional(), presentation: stateEvidenceRef.optional(), production: stateEvidenceRef.optional() }).strict().optional(),
  terminalRef: stateEvidenceRef.optional(),
  sourceRef: stateEvidenceRef.optional(),
  artifactPath: z.string().min(1).optional(),
  repairStageTotals: z.record(z.string(), z.number().int().nonnegative()).optional(),
  diagnoses: z.array(diagnosisSchema).optional(),
  recoveryRefs: z.array(stateEvidenceRef).optional(),
  activityProtocolVersion: z.literal(1).optional(),
  activityReceipts: z.array(importActivityReceiptSchema).optional(),
  legacyDiagnostics: z.array(z.string()).optional(),
  importId: z.string().regex(/^article-[0-9a-f-]{36}$/),
  sourceFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  sourceFile: z.string().min(1),
  stage: importStageSchema,
  resumeStage: importStageSchema.optional(),
  blockerScope: z.enum(["article", "shared"]).optional(),
  continuation: importContinuationSchema.optional(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  stateRevision: z.string().uuid().optional(),
  sourceDeletedAt: z.string().datetime({ offset: true }).optional(),
  title: z.string().min(1),
  primaryQuestion: z.string().min(1),
  format: importFormatSchema,
  promptInjectionDetected: z.boolean(),
  unusableReason: z.string().optional(),
  transformation: importTransformationSchema.optional(),
  contentApproval: contentApprovalSchema.optional(),
  heroImage: z.object({
    schemaVersion: z.literal("ArticleHeroBindingV1"), format: importFormatSchema.exclude(["agent_review_required"]), slug: z.string().min(1),
    artifactFingerprint: z.string().regex(/^[a-f0-9]{64}$/), assetRef: stateEvidenceRef,
    inspectionRef: stateEvidenceRef, publicationRef: stateEvidenceRef, generationRef: stateEvidenceRef,
  }).strict().optional(),
  presentation: importPresentationReceiptSchema.optional(),
  pendingRelease: importPendingReleaseSchema.optional(),
  release: importReleaseSchema.optional(),
  improve: importImproveSchema.optional(),
  stageReceipts: z.array(z.object({
    stage: importStageSchema,
    status: z.enum(["started", "passed", "failed", "waiting", "quarantined"]),
    at: z.string().datetime({ offset: true }),
    message: z.string().min(1),
  }).strict()),
  strategyAttempts: z.record(z.string(), z.number().int().nonnegative()),
  nextAction: z.string().min(1),
  duplicateOf: z.string().regex(/^article-[0-9a-f-]{36}$/).optional(),
}).strict();
export type ExternalArticleImportV1 = z.infer<typeof externalArticleImportSchema>;
