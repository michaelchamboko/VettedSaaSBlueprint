import { createHash } from "node:crypto";

import { externalArticleImportSchema, importStageAttemptSchema, importStageSelectionSchema, type ExternalArticleImportV1 } from "./contracts";
import { readEvidenceBytes, storeEvidenceBytes, type EvidenceRef } from "./execution-evidence";

function digest(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export type ResearchPlanAttempt = NonNullable<ExternalArticleImportV1["stageAttempts"]>[number];

export function prepareResearchPlanAttempt(record: ExternalArticleImportV1, input: {
  directory: string;
  idempotencyKey: string;
  inputFingerprint: string;
  leaseOwnerToken: string;
}) {
  const attempts = record.stageAttempts ?? [];
  const currentRepairTotal = record.repairStageTotals?.RESEARCHING ?? 0;
  const active = attempts.find((attempt) => attempt.operation === "research-plan" && attempt.status === "active");
  if (active && active.inputFingerprint === input.inputFingerprint && active.repairTotalAtIssue === currentRepairTotal) return { record, attempt: active };

  const sequence = attempts.filter((attempt) => attempt.operation === "research-plan").length + 1;
  const predecessor = active ?? attempts.filter((attempt) => attempt.operation === "research-plan").sort((left, right) => right.sequence - left.sequence)[0];
  const reason = !predecessor ? "initial" : predecessor.inputFingerprint === input.inputFingerprint ? "intentional-repair" : "dependency-change";
  const suffix = sequence === 1 ? "" : `.attempt-${sequence}`;
  const attempt = importStageAttemptSchema.parse({
    schemaVersion: "ImportStageAttemptV1",
    attemptId: `stage-attempt-${digest({ importId: record.importId, operation: "research-plan", sequence, inputFingerprint: input.inputFingerprint }).slice(0, 24)}`,
    stage: "RESEARCHING",
    operation: "research-plan",
    sequence,
    inputFingerprint: input.inputFingerprint,
    idempotencyKey: input.idempotencyKey,
    workPath: `${input.directory}/${input.idempotencyKey}.research-plan${suffix}.work.json`,
    resultPath: `${input.directory}/${input.idempotencyKey}.research-plan${suffix}.result.json`,
    predecessorAttemptId: predecessor?.attemptId,
    reason,
    status: "active",
    repairTotalAtIssue: currentRepairTotal,
    issuingLeaseOwnerToken: input.leaseOwnerToken,
    issuedAt: new Date().toISOString(),
  });
  const updatedAttempts = attempts.map((item) => item.status === "active" && item.operation === "research-plan" ? importStageAttemptSchema.parse({ ...item, status: "superseded" }) : item);
  return { record: externalArticleImportSchema.parse({ ...record, stageAttempts: [...updatedAttempts, attempt] }), attempt };
}

export async function reconcileLateResearchPlanResults(root: string, record: ExternalArticleImportV1, current: ResearchPlanAttempt, input: {
  replacementDelivered: boolean;
  validate: (raw: unknown, candidate: ResearchPlanAttempt) => Promise<{ parsed: unknown; decisionRef: EvidenceRef }>;
}) {
  let updated = record;
  for (const candidate of (record.stageAttempts ?? []).filter((attempt) => attempt.operation === "research-plan" && attempt.status === "superseded" && attempt.attemptId !== current.attemptId).sort((left, right) => left.sequence - right.sequence)) {
    let resultRef: EvidenceRef;
    let raw: unknown;
    try {
      const bytes = await readEvidenceBytes(root, candidate.resultPath);
      resultRef = await storeEvidenceBytes(root, record.importId, bytes);
      try { raw = JSON.parse(bytes.toString("utf8")); } catch { raw = undefined; }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT" || (error instanceof Error && error.message === "EVIDENCE_FILE_INVALID")) continue;
      throw error;
    }
    if ((updated.stageSelections ?? []).some((selection) => selection.candidateAttemptId === candidate.attemptId && selection.replacementAttemptId === current.attemptId && selection.comparedInputFingerprint === current.inputFingerprint && selection.candidateResultRef.sha256 === resultRef.sha256)) continue;

    let decision: "selected" | "historical" = "historical";
    let reason: "eligible-current-inputs-and-validation" | "replacement-delivered" | "dependencies-changed" | "invalid-result" | "validation-ambiguous" = "invalid-result";
    let validator: "passed" | "failed" | "not-run" = "failed";
    let parsed: unknown;
    let decisionRef: EvidenceRef | undefined;
    if (candidate.inputFingerprint !== current.inputFingerprint) {
      reason = "dependencies-changed";
      validator = "not-run";
    } else {
      try {
        const validated = await input.validate(raw, candidate);
        parsed = validated.parsed;
        decisionRef = validated.decisionRef;
        validator = "passed";
        reason = input.replacementDelivered ? "replacement-delivered" : "eligible-current-inputs-and-validation";
        decision = input.replacementDelivered ? "historical" : "selected";
      } catch (error) {
        if (["EACCES", "EPERM", "EBUSY", "ENOSPC"].includes((error as NodeJS.ErrnoException).code ?? "")) throw error;
      }
    }
    const selection = importStageSelectionSchema.parse({
      schemaVersion: "ImportStageSelectionV1",
      selectionId: `stage-selection-${digest({ candidateAttemptId: candidate.attemptId, replacementAttemptId: current.attemptId, resultRef }).slice(0, 24)}`,
      stage: "RESEARCHING",
      operation: "research-plan",
      candidateAttemptId: candidate.attemptId,
      replacementAttemptId: current.attemptId,
      candidateResultRef: resultRef,
      candidateDecisionRef: decisionRef,
      comparedInputFingerprint: current.inputFingerprint,
      decision,
      reason,
      validator,
      independentReview: "not-applicable",
      selectedAt: new Date().toISOString(),
    });
    updated = externalArticleImportSchema.parse({ ...updated, stageSelections: [...(updated.stageSelections ?? []), selection] });
    if (decision === "selected") {
      updated = externalArticleImportSchema.parse({
        ...updated,
        stageAttempts: (updated.stageAttempts ?? []).map((attempt) => attempt.attemptId === current.attemptId ? importStageAttemptSchema.parse({ ...attempt, status: "superseded" }) : attempt),
      });
      return { record: updated, selected: { raw: parsed, attempt: candidate, resultRef, decisionRef: decisionRef! } };
    }
  }
  return { record: updated, selected: undefined };
}

export function completeResearchPlanAttempt(record: ExternalArticleImportV1, attemptId: string, refs: { resultRef: EvidenceRef; decisionRef: EvidenceRef }) {
  return externalArticleImportSchema.parse({
    ...record,
    stageAttempts: (record.stageAttempts ?? []).map((attempt) => attempt.attemptId === attemptId ? importStageAttemptSchema.parse({ ...attempt, ...refs, status: "completed", completedAt: new Date().toISOString() }) : attempt),
  });
}
