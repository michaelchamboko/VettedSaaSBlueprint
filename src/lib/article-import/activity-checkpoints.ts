import { createHash } from "node:crypto";
import { z } from "zod";
import { evidenceReference, readEvidenceBytes, storeEvidenceBytes, verifyEvidenceRef, type EvidenceRef } from "./execution-evidence";
import { activityFindingReviewSubmissionSchema, externalArticleImportSchema, importActivityAttemptSchema, importActivityFindingReviewSchema, importActivityFindingSchema, importActivityReceiptSchema, importActivitySelectionSchema, type ExternalArticleImportV1 } from "./contracts";
import { WORKFLOW_REVISION } from "./workflow-requirements";
import { registerActivityFindingEvidence, registerActivityFindingResolutionEvidence, type ArticleReviewEvidenceRegistry } from "./review-evidence-registry";

const activityStages = ["REFINING", "VALIDATING"] as const;
type ActivityStage = typeof activityStages[number];

const activities: Record<ActivityStage, readonly string[]> = {
  REFINING: ["purpose-and-structure", "meaning-and-evidence", "wording-and-rhythm", "independent-review", "final-fidelity-review"],
  VALIDATING: ["hero-image", "design-read", "context", "shape", "detect", "desktop", "mobile", "reduced-motion", "critique", "audit", "polish", "visual-quality", "owner-verifier"],
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
    attemptId: z.string().regex(/^activity-attempt-[a-f0-9]{24}$/).optional(),
    predecessorAttemptId: z.string().regex(/^activity-attempt-[a-f0-9]{24}$/).optional(),
    stage: z.enum(activityStages),
    id: z.string().min(1),
    inputFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    criteria: z.array(criterionSchema).min(1),
    dependencyRefs: z.array(z.object({ path: z.string().min(1), sha256: z.string().regex(/^[a-f0-9]{64}$/) }).strict()).min(1),
    outputRefs: z.array(z.object({ path: z.string().min(1), sha256: z.string().regex(/^[a-f0-9]{64}$/) }).strict()).min(1).optional(),
    reviewer: z.string().min(1),
    executionId: z.string().min(1),
    outcome: z.enum(["accepted", "rejected", "unverified", "not-applicable"]),
    observation: z.string().min(1).optional(),
    applicabilityReason: z.string().min(1).optional(),
    openFindings: z.array(openFindingSchema).optional(),
    findingReviews: z.array(activityFindingReviewSubmissionSchema).optional(),
  }).strict().superRefine((value, context) => {
    if (["accepted", "rejected"].includes(value.outcome) && !value.observation) context.addIssue({ code: "custom", path: ["observation"], message: "Accepted and rejected activity reviews require an observation." });
    if (value.outcome === "accepted" && !value.outputRefs) context.addIssue({ code: "custom", path: ["outputRefs"], message: "Accepted current activity work requires concrete output evidence." });
    if (value.outcome === "not-applicable" && !value.applicabilityReason) context.addIssue({ code: "custom", path: ["applicabilityReason"], message: "Inapplicability requires a reason." });
  }),
}).strict();

export type ActivityBinding = {
  attemptId?: string;
  predecessorAttemptId?: string;
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
  const selectedOutputs = new Map<string, EvidenceRef[]>();
  const resolved: ActivityBinding[] = [];
  for (const id of activities[stage]) {
    let prerequisiteIds: string[] = [];
    if (stage === "REFINING") {
      const index = activities.REFINING.indexOf(id);
      prerequisiteIds = index > 0 ? [activities.REFINING[index - 1]] : [];
    } else {
      const browser = ["desktop", "mobile", "reduced-motion"];
      const judgments = ["critique", "audit", "polish"];
      prerequisiteIds = judgments.includes(id) ? browser : ["visual-quality", "owner-verifier"].includes(id) ? [...browser, ...judgments] : [];
    }
    const outputs = prerequisiteIds.flatMap((item) => selectedOutputs.get(item) ?? []);
    const base = stage === "REFINING"
      ? id === "purpose-and-structure" ? [artifact, assessment] : ["meaning-and-evidence", "independent-review"].includes(id) ? [artifact, research] : [artifact]
      : [artifact, renderingRef, ...(["hero-image", "visual-quality", "owner-verifier"].includes(id) ? [hero] : [])];
    const criteria = [{ id: `${stage.toLowerCase()}.${id}`, revision: WORKFLOW_REVISION }];
    const dependencyRefs = [...base, ...outputs].filter((ref): ref is EvidenceRef => Boolean(ref));
    const binding = { stage, id, criteria, dependencyRefs, inputFingerprint: digest({ stage, id, criteria, dependencyRefs }) };
    resolved.push(binding);
    for (const receipt of (record.activityReceipts ?? []).filter((item) => item.stage === stage && item.activityId === id && item.inputFingerprint === binding.inputFingerprint && item.outcome === "accepted" && (item.outputRefs?.length ?? 0) > 0).toReversed()) {
      try {
        await verifyEvidenceRef(root, receipt.resultRef);
        for (const ref of receipt.outputRefs!) await verifyEvidenceRef(root, ref);
        selectedOutputs.set(id, receipt.outputRefs!);
        break;
      } catch { /* A changed output reopens its exact producing activity. */ }
    }
  }
  return resolved;
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
      try {
        await verifyEvidenceRef(root, receipt.resultRef);
        if (receipt.outcome === "accepted" && !(receipt.outputRefs?.length)) continue;
        for (const ref of receipt.outputRefs ?? []) await verifyEvidenceRef(root, ref);
        accepted = true;
        break;
      }
      catch { /* A stale receipt stays historical but cannot approve current work. */ }
    }
    if (!accepted) return binding;
  }
  return undefined;
}

export async function acceptedArticleActivityOutputs(root: string, record: ExternalArticleImportV1, renderingRef?: EvidenceRef) {
  if (!activityStages.includes(record.stage as ActivityStage)) return [];
  const stage = record.stage as ActivityStage;
  const outputs = [];
  for (const binding of await bindings(root, record, stage, renderingRef)) {
    if ((record.activityFindings ?? []).some((finding) => finding.stage === stage && finding.activityId === binding.id && finding.status !== "resolved")) continue;
    const receipts = (record.activityReceipts ?? []).filter((receipt) => receipt.stage === stage && receipt.activityId === binding.id && receipt.inputFingerprint === binding.inputFingerprint);
    let current;
    for (const receipt of receipts.toReversed()) {
      try {
        await verifyEvidenceRef(root, receipt.resultRef);
        if (receipt.outcome === "accepted" && !(receipt.outputRefs?.length)) continue;
        for (const ref of receipt.outputRefs ?? []) await verifyEvidenceRef(root, ref);
        current = receipt;
        break;
      }
      catch { /* Ignore stale bytes and keep looking for the latest verified result. */ }
    }
    if (!current || !["accepted", "not-applicable"].includes(current.outcome)) continue;
    outputs.push({
      activityId: current.activityId,
      outcome: current.outcome,
      ...(current.observation && { observation: current.observation }),
      ...(current.applicabilityReason && { applicabilityReason: current.applicabilityReason }),
      ...(current.outputRefs && { outputRefs: current.outputRefs }),
      resultRef: current.resultRef,
    });
  }
  return outputs;
}

export async function recordArticleActivity(root: string, record: ExternalArticleImportV1, resultPath: string, expected: ActivityBinding, raw: unknown, options?: { resultRef?: EvidenceRef; trustProvidedRaw?: boolean; registry?: ArticleReviewEvidenceRegistry }) {
  const bytes = options?.resultRef ? undefined : await readEvidenceBytes(root, resultPath);
  const resultRef = options?.resultRef ?? await storeEvidenceBytes(root, record.importId, bytes!);
  const retainedRaw = options?.trustProvidedRaw ? raw : JSON.parse((bytes ?? await readEvidenceBytes(root, resultRef.path)).toString("utf8"));
  const result = activityResultSchema.parse(retainedRaw);
  const submitted = result.activity;
  if (result.sourceFingerprint !== record.sourceFingerprint || submitted.stage !== expected.stage || submitted.id !== expected.id || submitted.attemptId !== expected.attemptId || submitted.predecessorAttemptId !== expected.predecessorAttemptId || submitted.inputFingerprint !== expected.inputFingerprint || JSON.stringify(submitted.criteria) !== JSON.stringify(expected.criteria) || JSON.stringify(submitted.dependencyRefs) !== JSON.stringify(expected.dependencyRefs)) throw new Error("ACTIVITY_RESULT_BINDING_MISMATCH");
  for (const ref of submitted.outputRefs ?? []) await verifyEvidenceRef(root, ref);
  const receipt = importActivityReceiptSchema.parse({
    schemaVersion: "ImportActivityReceiptV1",
    attemptId: submitted.attemptId,
    stage: submitted.stage,
    activityId: submitted.id,
    inputFingerprint: submitted.inputFingerprint,
    criteria: submitted.criteria,
    dependencyRefs: submitted.dependencyRefs,
    outputRefs: submitted.outputRefs,
    resultRef,
    reviewer: submitted.reviewer,
    executionId: submitted.executionId,
    outcome: submitted.outcome,
    observation: submitted.observation,
    applicabilityReason: submitted.applicabilityReason,
    completedAt: new Date().toISOString(),
  });
  if ((record.activityReceipts ?? []).some((existing) =>
    (existing.resultRef.path === receipt.resultRef.path && existing.resultRef.sha256 === receipt.resultRef.sha256)
    || (existing.stage === receipt.stage && existing.activityId === receipt.activityId && existing.inputFingerprint === receipt.inputFingerprint && existing.reviewer === receipt.reviewer && existing.executionId === receipt.executionId))) return record;
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
  const findingReviews = [...(record.activityFindingReviews ?? [])];
  const reviewedFindings = [...activityFindings];
  const conclusiveReviewIds: string[] = [];
  for (const submittedReview of submitted.findingReviews ?? []) {
    const review = activityFindingReviewSubmissionSchema.parse(submittedReview);
    const findingIndex = reviewedFindings.findIndex((finding) => finding.findingId === review.findingId && finding.stage === receipt.stage && finding.activityId === receipt.activityId && finding.status !== "resolved");
    if (findingIndex < 0) throw new Error("ACTIVITY_FINDING_NOT_OPEN");
    const finding = reviewedFindings[findingIndex];
    if (finding.status === "owner-referral" && review.disposition !== "owner-referral") throw new Error("ACTIVITY_OWNER_DECISION_REQUIRED");
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
    if (conclusive) conclusiveReviewIds.push(reviewId);
  }
  const wasFindingRepair = existingFindings.some((finding) => finding.stage === receipt.stage && finding.activityId === receipt.activityId && finding.status !== "resolved");
  const unsuccessfulRepair = wasFindingRepair && reviewedFindings.some((finding) => finding.stage === receipt.stage && finding.activityId === receipt.activityId && finding.status !== "resolved");
  const repairTotal = (record.repairStageTotals?.[receipt.stage] ?? 0) + (unsuccessfulRepair ? 1 : 0);
  const diagnosisRequired = unsuccessfulRepair && repairTotal >= 3;
  const updated = externalArticleImportSchema.parse({
    ...record,
    activityAttempts: (record.activityAttempts ?? []).map((attempt) => attempt.attemptId === submitted.attemptId
      ? importActivityAttemptSchema.parse({ ...attempt, status: "completed", completedAt: new Date().toISOString() })
      : attempt),
    activityReceipts: [...(record.activityReceipts ?? []), receipt],
    activityFindings: reviewedFindings,
    activityFindingReviews: findingReviews,
    repairStageTotals: unsuccessfulRepair ? { ...record.repairStageTotals, [receipt.stage]: repairTotal } : record.repairStageTotals,
    continuation: diagnosisRequired ? { kind: "blocked", scope: "article", failureCategory: "content-rejection", cause: `Three unsuccessful ${receipt.stage.toLowerCase()} repairs are retained for ${receipt.activityId}.`, attemptedRecovery: "Retained each distinct finding-bound repair review without issuing a fourth worker.", resumptionRequirement: "Record and verify a bound diagnosis and genuine remedy before another repair attempt." } : undefined,
    nextAction: diagnosisRequired ? `Diagnosis required before a fourth ${receipt.activityId} repair.` : ["accepted", "not-applicable"].includes(receipt.outcome) ? `Resume ${receipt.stage.toLowerCase()} at the earliest unfinished activity.` : `Complete ${receipt.activityId} again; the attributable ${receipt.outcome} review remains retained but does not approve the activity.`,
  });
  if (options?.registry && receipt.outcome === "rejected") {
    const finding = updated.activityFindings?.find((candidate) => candidate.findingId === findingId);
    if (finding) await registerActivityFindingEvidence(root, options.registry, updated, {
      ...finding,
      dependencyRefs: receipt.dependencyRefs,
      originalEvidenceRef: receipt.resultRef,
      reviewer: receipt.reviewer,
      executionId: receipt.executionId,
      openedAt: receipt.completedAt,
    });
  }
  if (options?.registry) {
    for (const reviewId of conclusiveReviewIds) {
      const review = updated.activityFindingReviews?.find((candidate) => candidate.reviewId === reviewId);
      const finding = review && updated.activityFindings?.find((candidate) => candidate.findingId === review.findingId);
      if (review && finding) await registerActivityFindingResolutionEvidence(root, options.registry, updated, finding, review);
    }
  }
  return updated;
}

export function prepareActivityAttempt(record: ExternalArticleImportV1, binding: ActivityBinding, input: { directory: string; idempotencyKey: string; leaseOwnerToken: string }) {
  const attempts = record.activityAttempts ?? [];
  const active = attempts.find((attempt) => attempt.stage === binding.stage && attempt.activityId === binding.id && attempt.inputFingerprint === binding.inputFingerprint && attempt.status === "active");
  if (active) {
    return { record, binding: { ...binding, attemptId: active.attemptId, predecessorAttemptId: active.predecessorAttemptId }, attempt: active };
  }
  const related = attempts.filter((attempt) => attempt.stage === binding.stage && attempt.activityId === binding.id);
  const predecessor = related.at(-1);
  const sequence = Math.max(0, ...related.map((attempt) => attempt.sequence)) + 1;
  const attemptId = `activity-attempt-${digest({ importId: record.importId, stage: binding.stage, activityId: binding.id, sequence, inputFingerprint: binding.inputFingerprint }).slice(0, 24)}`;
  const legacyContinuation = record.continuation?.kind === "work" && record.continuation.activityId === binding.id && record.continuation.inputFingerprint === binding.inputFingerprint && record.continuation.idempotencyKey ? record.continuation : undefined;
  const legacy = attempts.length === 0 && legacyContinuation;
  const idempotencyKey = legacy ? legacy.idempotencyKey! : input.idempotencyKey;
  const workPath = legacy ? legacy.workPath : `${input.directory}/${idempotencyKey}.${binding.id}.${sequence}.work.json`;
  const resultPath = legacy ? legacy.resultPath : `${input.directory}/${idempotencyKey}.${binding.id}.${sequence}.result.json`;
  const predecessorReceipt = predecessor && (record.activityReceipts ?? []).find((receipt) => receipt.attemptId === predecessor.attemptId);
  const reason = legacy ? "legacy-adoption" : !predecessor ? "initial" : predecessor.inputFingerprint === binding.inputFingerprint && ["rejected", "unverified"].includes(predecessorReceipt?.outcome ?? "") ? "intentional-repair" : "dependency-change";
  const attempt = importActivityAttemptSchema.parse({
    schemaVersion: "ImportActivityAttemptV1", attemptId, stage: binding.stage, activityId: binding.id, sequence,
    inputFingerprint: binding.inputFingerprint, criteria: binding.criteria, dependencyRefs: binding.dependencyRefs, idempotencyKey,
    workPath, resultPath, predecessorAttemptId: predecessor?.attemptId, reason, status: "active",
    issuingLeaseOwnerToken: input.leaseOwnerToken, issuedAt: new Date().toISOString(),
  });
  const updatedAttempts = attempts.map((item) => item.attemptId === predecessor?.attemptId ? importActivityAttemptSchema.parse({ ...item, status: "superseded" }) : item);
  const updated = externalArticleImportSchema.parse({ ...record, activityAttempts: [...updatedAttempts, attempt] });
  return { record: updated, binding: { ...binding, attemptId, predecessorAttemptId: predecessor?.attemptId }, attempt };
}

export async function reconcileLateActivityResults(root: string, record: ExternalArticleImportV1, current: ActivityBinding, options?: { replacementDelivered?: boolean; registry?: ArticleReviewEvidenceRegistry }) {
  if (!current.attemptId) return { record, selected: false };
  let updated = record;
  const candidates = (record.activityAttempts ?? [])
    .filter((attempt) => attempt.stage === current.stage && attempt.activityId === current.id && attempt.status === "superseded" && attempt.attemptId !== current.attemptId)
    .sort((left, right) => left.sequence - right.sequence);
  for (const candidate of candidates) {
    let candidateResultRef: EvidenceRef;
    let raw: unknown;
    try {
      const bytes = await readEvidenceBytes(root, candidate.resultPath);
      candidateResultRef = await storeEvidenceBytes(root, record.importId, bytes);
      try { raw = JSON.parse(bytes.toString("utf8")); }
      catch { raw = undefined; }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
      if (error instanceof Error && error.message === "EVIDENCE_FILE_INVALID") continue;
      throw error;
    }
    const priorReceiptRefs = (updated.activityReceipts ?? []).filter((receipt) => receipt.attemptId === candidate.attemptId).map((receipt) => receipt.resultRef);
    if (priorReceiptRefs.some((ref) => ref.sha256 === candidateResultRef.sha256)) continue;
    if ((updated.activitySelections ?? []).some((selection) => selection.candidateAttemptId === candidate.attemptId && selection.replacementAttemptId === current.attemptId && selection.comparedInputFingerprint === current.inputFingerprint && selection.candidateResultRef.sha256 === candidateResultRef.sha256)) continue;

    const openFindingIds = (current.openFindings ?? []).map((finding) => finding.findingId);
    let decision: "selected" | "historical" = "historical";
    let reason: "eligible-current-dependencies-and-review" | "dependencies-changed" | "invalid-result" | "open-findings-unresolved" | "independent-review-required" | "non-approving-result" | "replacement-delivered" = "invalid-result";
    let validator: "passed" | "failed" | "not-run" = "failed";
    let independentReview: "passed" | "failed" | "not-run" = "not-run";
    let parsed: z.infer<typeof activityResultSchema> | undefined;
    if (candidate.inputFingerprint !== current.inputFingerprint || JSON.stringify(candidate.dependencyRefs) !== JSON.stringify(current.dependencyRefs)) {
      reason = "dependencies-changed";
      validator = "not-run";
    } else {
      const result = activityResultSchema.safeParse(raw);
      if (result.success) {
        parsed = result.data;
        const submitted = parsed.activity;
        const bindingMatches = parsed.idempotencyKey === candidate.idempotencyKey && parsed.sourceFingerprint === updated.sourceFingerprint && submitted.stage === current.stage && submitted.id === current.id && submitted.attemptId === candidate.attemptId && submitted.predecessorAttemptId === candidate.predecessorAttemptId && submitted.inputFingerprint === current.inputFingerprint && JSON.stringify(submitted.criteria) === JSON.stringify(current.criteria) && JSON.stringify(submitted.dependencyRefs) === JSON.stringify(current.dependencyRefs);
        if (bindingMatches) {
          validator = "passed";
          const reviewedFindingIds = new Set((submitted.findingReviews ?? []).map((review) => review.findingId));
          const conclusiveFindingIds = new Set((submitted.findingReviews ?? []).filter((review) => ["verified-repair", "appropriate-removal", "evidenced-dismissal"].includes(review.disposition)).map((review) => review.findingId));
          if (!["accepted", "not-applicable"].includes(submitted.outcome)) {
            reason = "non-approving-result";
            independentReview = "failed";
          } else if (openFindingIds.some((findingId) => !reviewedFindingIds.has(findingId) || !conclusiveFindingIds.has(findingId))) {
            reason = "open-findings-unresolved";
            independentReview = "failed";
          } else {
            const priorReceipts = (updated.activityReceipts ?? []).filter((receipt) => receipt.attemptId === candidate.attemptId);
            const independent = priorReceipts.length > 0 && priorReceipts.every((receipt) => receipt.reviewer !== submitted.reviewer && receipt.executionId !== submitted.executionId);
            if (!independent) {
              reason = "independent-review-required";
              independentReview = "failed";
            } else {
              reason = "eligible-current-dependencies-and-review";
              independentReview = "passed";
              decision = "selected";
            }
          }
        }
      }
    }
    if (options?.replacementDelivered && decision === "selected") {
      decision = "historical";
      reason = "replacement-delivered";
    }
    const selection = importActivitySelectionSchema.parse({
      schemaVersion: "ImportActivitySelectionV1",
      selectionId: `activity-selection-${digest({ candidateAttemptId: candidate.attemptId, replacementAttemptId: current.attemptId, candidateResultRef }).slice(0, 24)}`,
      stage: current.stage, activityId: current.id, candidateAttemptId: candidate.attemptId, replacementAttemptId: current.attemptId,
      candidateResultRef, comparedInputFingerprint: current.inputFingerprint, openFindingIds, decision, reason, validator, independentReview,
      selectedAt: new Date().toISOString(),
    });
    if (decision === "selected" && parsed) {
      let accepted: ExternalArticleImportV1;
      try {
        accepted = await recordArticleActivity(root, updated, candidateResultRef.path, { ...current, attemptId: candidate.attemptId, predecessorAttemptId: candidate.predecessorAttemptId }, parsed, { resultRef: candidateResultRef, registry: options?.registry });
      } catch (error) {
        if (["EACCES", "EPERM", "EBUSY", "ENOSPC"].includes((error as NodeJS.ErrnoException).code ?? "") || (error instanceof Error && /CAPABILITY|registry|database|postgres|PGlite/i.test(error.message))) throw error;
        const rejectedSelection = importActivitySelectionSchema.parse({ ...selection, decision: "historical", reason: "invalid-result", validator: "failed", independentReview: "failed" });
        updated = externalArticleImportSchema.parse({ ...updated, activitySelections: [...(updated.activitySelections ?? []), rejectedSelection] });
        continue;
      }
      updated = externalArticleImportSchema.parse({
        ...accepted,
        activityAttempts: (accepted.activityAttempts ?? []).map((attempt) => attempt.attemptId === current.attemptId ? importActivityAttemptSchema.parse({ ...attempt, status: "superseded" }) : attempt),
        activitySelections: [...(accepted.activitySelections ?? []), selection],
      });
      return { record: updated, selected: true };
    }
    updated = externalArticleImportSchema.parse({ ...updated, activitySelections: [...(updated.activitySelections ?? []), selection] });
  }
  return { record: updated, selected: false };
}
