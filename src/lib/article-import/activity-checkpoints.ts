import { createHash } from "node:crypto";
import { z } from "zod";
import { evidenceReference, verifyEvidenceRef, type EvidenceRef } from "./execution-evidence";
import { activityFindingReviewSubmissionSchema, externalArticleImportSchema, importActivityFindingReviewSchema, importActivityFindingSchema, importActivityReceiptSchema, type ExternalArticleImportV1 } from "./contracts";
import { WORKFLOW_REVISION } from "./workflow-requirements";

const activityStages = ["REFINING", "VALIDATING"] as const;
type ActivityStage = typeof activityStages[number];

const activities: Record<ActivityStage, readonly string[]> = {
  REFINING: ["purpose-and-structure", "meaning-and-evidence", "wording-and-rhythm", "independent-review", "final-fidelity-review"],
  VALIDATING: ["design-read", "context", "shape", "critique", "audit", "detect", "polish", "desktop", "mobile", "reduced-motion", "visual-quality"],
};

const criterionSchema = z.object({ id: z.string().min(1), revision: z.string().min(1) }).strict();
const openFindingSchema = z.object({
  findingId: z.string().regex(/^finding-[a-f0-9]{24}$/), criterion: criterionSchema,
  revision: z.string().regex(/^[a-f0-9]{64}$/), observation: z.string().min(1), expectedCheck: z.string().min(1),
  dependencyRefs: z.array(z.object({ path: z.string().min(1), sha256: z.string().regex(/^[a-f0-9]{64}$/) }).strict()).min(1),
  originalEvidenceRef: z.object({ path: z.string().min(1), sha256: z.string().regex(/^[a-f0-9]{64}$/) }).strict(),
  status: z.enum(["open", "owner-referral"]),
}).strip();
export const activityResultSchema = z.object({
  idempotencyKey: z.string().regex(/^[a-f0-9]{64}$/),
  sourceFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  summary: z.string().min(1),
  activity: z.object({
    stage: z.enum(activityStages),
    id: z.string().min(1),
    inputFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    criteria: z.array(criterionSchema).min(1),
    dependencyRefs: z.array(z.object({ path: z.string().min(1), sha256: z.string().regex(/^[a-f0-9]{64}$/) }).strict()).min(1),
    reviewer: z.string().min(1),
    executionId: z.string().min(1),
    outcome: z.enum(["accepted", "rejected", "unverified", "not-applicable"]),
    observation: z.string().min(1).optional(),
    applicabilityReason: z.string().min(1).optional(),
    openFindings: z.array(openFindingSchema).optional(),
    findingReviews: z.array(activityFindingReviewSubmissionSchema).optional(),
  }).strict().superRefine((value, context) => {
    if (["accepted", "rejected"].includes(value.outcome) && !value.observation) context.addIssue({ code: "custom", path: ["observation"], message: "Accepted and rejected activity reviews require an observation." });
    if (value.outcome === "not-applicable" && !value.applicabilityReason) context.addIssue({ code: "custom", path: ["applicabilityReason"], message: "Inapplicability requires a reason." });
  }),
}).strict();

export type ActivityBinding = {
  stage: ActivityStage;
  id: string;
  inputFingerprint: string;
  criteria: Array<{ id: string; revision: string }>;
  dependencyRefs: EvidenceRef[];
  openFindings?: Array<z.infer<typeof openFindingSchema>>;
};

function digest(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function currentRef(root: string, ref: EvidenceRef | undefined) {
  return ref ? evidenceReference(root, ref.path) : undefined;
}

async function bindings(root: string, record: ExternalArticleImportV1, stage: ActivityStage, renderingRef?: EvidenceRef): Promise<ActivityBinding[]> {
  const artifactPath = stage === "REFINING" ? record.artifactPath : record.contentApproval?.artifactPath;
  if (!artifactPath) return [];
  const artifact = await evidenceReference(root, artifactPath);
  const assessment = await currentRef(root, record.evidenceRefs?.assessment);
  const research = await currentRef(root, record.evidenceRefs?.research);
  const hero = await currentRef(root, record.evidenceRefs?.hero);
  const dependencies = (id: string): EvidenceRef[] => {
    if (stage === "REFINING") {
      if (id === "purpose-and-structure") return [artifact, assessment].filter((ref): ref is EvidenceRef => Boolean(ref));
      if (["meaning-and-evidence", "independent-review"].includes(id)) return [artifact, research].filter((ref): ref is EvidenceRef => Boolean(ref));
      return [artifact];
    }
    return [artifact, renderingRef, ...(id === "visual-quality" ? [hero] : [])].filter((ref): ref is EvidenceRef => Boolean(ref));
  };
  return activities[stage].map((id) => {
    const criteria = [{ id: `${stage.toLowerCase()}.${id}`, revision: WORKFLOW_REVISION }];
    const dependencyRefs = dependencies(id);
    return { stage, id, criteria, dependencyRefs, inputFingerprint: digest({ stage, id, criteria, dependencyRefs }) };
  });
}

export async function nextArticleActivity(root: string, record: ExternalArticleImportV1, renderingRef?: EvidenceRef): Promise<ActivityBinding | undefined> {
  if (!activityStages.includes(record.stage as ActivityStage)) return undefined;
  const stage = record.stage as ActivityStage;
  for (const binding of await bindings(root, record, stage, renderingRef)) {
    const openFindings = (record.activityFindings ?? []).filter((finding) => finding.stage === stage && finding.activityId === binding.id && finding.status !== "resolved");
    if (openFindings.length > 0) return { ...binding, openFindings: openFindings.map((finding) => openFindingSchema.parse(finding)) };
    const candidates = (record.activityReceipts ?? []).filter((receipt) => receipt.stage === stage && receipt.activityId === binding.id && ["accepted", "not-applicable"].includes(receipt.outcome) && receipt.inputFingerprint === binding.inputFingerprint);
    let accepted = false;
    for (const receipt of candidates) {
      try { await verifyEvidenceRef(root, receipt.resultRef); accepted = true; break; }
      catch { /* A stale receipt stays historical but cannot approve current work. */ }
    }
    if (!accepted) return binding;
  }
  return undefined;
}

export async function recordArticleActivity(root: string, record: ExternalArticleImportV1, resultPath: string, expected: ActivityBinding, raw: unknown) {
  const result = activityResultSchema.parse(raw);
  const submitted = result.activity;
  if (result.sourceFingerprint !== record.sourceFingerprint || submitted.stage !== expected.stage || submitted.id !== expected.id || submitted.inputFingerprint !== expected.inputFingerprint || JSON.stringify(submitted.criteria) !== JSON.stringify(expected.criteria) || JSON.stringify(submitted.dependencyRefs) !== JSON.stringify(expected.dependencyRefs)) throw new Error("ACTIVITY_RESULT_BINDING_MISMATCH");
  const receipt = importActivityReceiptSchema.parse({
    schemaVersion: "ImportActivityReceiptV1",
    stage: submitted.stage,
    activityId: submitted.id,
    inputFingerprint: submitted.inputFingerprint,
    criteria: submitted.criteria,
    dependencyRefs: submitted.dependencyRefs,
    resultRef: await evidenceReference(root, resultPath),
    reviewer: submitted.reviewer,
    executionId: submitted.executionId,
    outcome: submitted.outcome,
    observation: submitted.observation,
    applicabilityReason: submitted.applicabilityReason,
    completedAt: new Date().toISOString(),
  });
  const findingId = `finding-${digest({ stage: receipt.stage, activityId: receipt.activityId, criterion: receipt.criteria[0], revision: receipt.inputFingerprint, observation: receipt.observation }).slice(0, 24)}`;
  const existingFindings = record.activityFindings ?? [];
  const activityFindings = receipt.outcome !== "rejected" || existingFindings.some((finding) => finding.findingId === findingId)
    ? existingFindings
    : [...existingFindings, importActivityFindingSchema.parse({
      schemaVersion: "ImportActivityFindingV1",
      findingId,
      stage: receipt.stage,
      activityId: receipt.activityId,
      criterion: receipt.criteria[0],
      revision: receipt.inputFingerprint,
      observation: receipt.observation,
      expectedCheck: `Recheck ${receipt.criteria[0].id} at ${receipt.criteria[0].revision} against the changed activity inputs.`,
      dependencyRefs: receipt.dependencyRefs,
      originalEvidenceRef: receipt.resultRef,
      reviewer: receipt.reviewer,
      executionId: receipt.executionId,
      status: "open",
      openedAt: receipt.completedAt,
    })];
  const resultRef = receipt.resultRef;
  const findingReviews = [...(record.activityFindingReviews ?? [])];
  const reviewedFindings = [...activityFindings];
  for (const submittedReview of submitted.findingReviews ?? []) {
    const review = activityFindingReviewSubmissionSchema.parse(submittedReview);
    const findingIndex = reviewedFindings.findIndex((finding) => finding.findingId === review.findingId && finding.stage === receipt.stage && finding.activityId === receipt.activityId && finding.status !== "resolved");
    if (findingIndex < 0) throw new Error("ACTIVITY_FINDING_NOT_OPEN");
    const finding = reviewedFindings[findingIndex];
    if (review.expectedCheck !== finding.expectedCheck) throw new Error("ACTIVITY_FINDING_EXPECTED_CHECK_MISMATCH");
    if (receipt.reviewer === finding.reviewer || receipt.executionId === finding.executionId) throw new Error("ACTIVITY_FINDING_REVIEW_NOT_INDEPENDENT");
    await verifyEvidenceRef(root, finding.originalEvidenceRef);
    for (const ref of [...review.evidenceRefs, ...(review.changedInputRefs ?? []), ...(review.regressionChecks ?? []).flatMap((check) => check.evidenceRefs)]) await verifyEvidenceRef(root, ref);
    if (review.changedInputRefs) {
      for (const changed of review.changedInputRefs) {
        const before = finding.dependencyRefs.find((ref) => ref.path === changed.path);
        const current = expected.dependencyRefs.find((ref) => ref.path === changed.path);
        if (!before || !current || current.sha256 !== changed.sha256 || before.sha256 === current.sha256) throw new Error("ACTIVITY_FINDING_CHANGED_INPUT_MISMATCH");
      }
    }
    const conclusive = ["verified-repair", "appropriate-removal", "evidenced-dismissal"].includes(review.disposition);
    if (conclusive && !["accepted", "not-applicable"].includes(receipt.outcome)) throw new Error("ACTIVITY_FINDING_REVIEW_NOT_APPROVED");
    if (review.disposition === "appropriate-removal" && receipt.outcome !== "not-applicable") throw new Error("ACTIVITY_FINDING_REMOVAL_NOT_APPLICABLE");
    if (["verified-repair", "evidenced-dismissal"].includes(review.disposition) && receipt.outcome !== "accepted") throw new Error("ACTIVITY_FINDING_RESOLUTION_NOT_ACCEPTED");
    if (conclusive && review.regressionChecks?.some((check) => check.outcome !== "passed")) throw new Error("ACTIVITY_FINDING_REGRESSION_NOT_PASSED");
    const reviewedAt = new Date().toISOString();
    const reviewId = `finding-review-${digest({ findingId: finding.findingId, reviewer: receipt.reviewer, executionId: receipt.executionId, resultRef }).slice(0, 24)}`;
    findingReviews.push(importActivityFindingReviewSchema.parse({ schemaVersion: "ImportActivityFindingReviewV1", reviewId, ...review, inputFingerprint: receipt.inputFingerprint, resultRef, reviewer: receipt.reviewer, executionId: receipt.executionId, reviewedAt }));
    reviewedFindings[findingIndex] = importActivityFindingSchema.parse({ ...finding, status: conclusive ? "resolved" : review.disposition === "owner-referral" ? "owner-referral" : "open", ...(conclusive && { resolutionReviewId: reviewId, resolvedAt: reviewedAt }) });
  }
  return externalArticleImportSchema.parse({
    ...record,
    activityReceipts: [...(record.activityReceipts ?? []), receipt],
    activityFindings: reviewedFindings,
    activityFindingReviews: findingReviews,
    continuation: undefined,
    nextAction: ["accepted", "not-applicable"].includes(receipt.outcome) ? `Resume ${receipt.stage.toLowerCase()} at the earliest unfinished activity.` : `Complete ${receipt.activityId} again; the attributable ${receipt.outcome} review remains retained but does not approve the activity.`,
  });
}

export function activityAttempt(record: ExternalArticleImportV1, binding: ActivityBinding) {
  return (record.activityReceipts ?? []).filter((receipt) => receipt.stage === binding.stage && receipt.activityId === binding.id).length + 1;
}
