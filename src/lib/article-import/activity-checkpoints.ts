import { createHash } from "node:crypto";
import { z } from "zod";
import { evidenceReference, verifyEvidenceRef, type EvidenceRef } from "./execution-evidence";
import { externalArticleImportSchema, importActivityReceiptSchema, type ExternalArticleImportV1 } from "./contracts";
import { WORKFLOW_REVISION } from "./workflow-requirements";

const activityStages = ["REFINING", "VALIDATING"] as const;
type ActivityStage = typeof activityStages[number];

const activities: Record<ActivityStage, readonly string[]> = {
  REFINING: ["purpose-and-structure", "meaning-and-evidence", "wording-and-rhythm", "independent-review", "final-fidelity-review"],
  VALIDATING: ["design-read", "context", "shape", "critique", "audit", "detect", "polish", "desktop", "mobile", "reduced-motion", "visual-quality"],
};

const criterionSchema = z.object({ id: z.string().min(1), revision: z.string().min(1) }).strict();
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
  return externalArticleImportSchema.parse({
    ...record,
    activityReceipts: [...(record.activityReceipts ?? []), receipt],
    continuation: undefined,
    nextAction: ["accepted", "not-applicable"].includes(receipt.outcome) ? `Resume ${receipt.stage.toLowerCase()} at the earliest unfinished activity.` : `Complete ${receipt.activityId} again; the attributable ${receipt.outcome} review remains retained but does not approve the activity.`,
  });
}

export function activityAttempt(record: ExternalArticleImportV1, binding: ActivityBinding) {
  return (record.activityReceipts ?? []).filter((receipt) => receipt.stage === binding.stage && receipt.activityId === binding.id).length + 1;
}
