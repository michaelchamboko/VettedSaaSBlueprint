import { z } from "zod";

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

export const importReleaseSchema = z.object({
  schemaVersion: z.literal("ImportReleaseV1"),
  commitSha: z.string().regex(/^[a-f0-9]{40}$/),
  deploymentId: z.string().min(1),
  canonicalUrl: z.string().url(),
  verifiedAt: z.string().datetime({ offset: true }),
  checks: z.record(z.string(), z.boolean()),
  previousDeploymentId: z.string().min(1).optional(),
}).strict();
export type ImportReleaseV1 = z.infer<typeof importReleaseSchema>;

export const externalArticleImportSchema = z.object({
  schemaVersion: z.literal("ExternalArticleImportV1"),
  importId: z.string().regex(/^article-[0-9a-f-]{36}$/),
  sourceFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  sourceFile: z.string().min(1),
  stage: importStageSchema,
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  sourceDeletedAt: z.string().datetime({ offset: true }).optional(),
  title: z.string().min(1),
  primaryQuestion: z.string().min(1),
  format: importFormatSchema,
  promptInjectionDetected: z.boolean(),
  unusableReason: z.string().optional(),
  transformation: importTransformationSchema.optional(),
  release: importReleaseSchema.optional(),
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
