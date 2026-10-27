import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";

export const automationJobTypeSchema = z.enum([
  "research",
  "editorial_brief",
  "optimise",
  "watchdog",
  "release",
]);

export const automationOutcomeSchema = z.enum([
  "changed",
  "no_change",
  "partial",
  "conflicting",
  "blocked",
]);

export const automationRunStateSchema = z.enum(["running", "completed", "failed", "blocked"]);
export const contentDepthSchema = z.enum(["standard", "detailed", "complex"]);
export const visualOpportunitySchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["decision-map", "criteria-grid", "evidence-diagram", "conditional-path", "comparison-panel", "annotated-screenshot"]),
  purpose: z.string().min(1),
  sourceReferences: z.array(z.string().min(1)).min(1),
  assetProvenance: z.string().min(1),
}).strict();

export const automationRunSchema = z.object({
  version: z.literal(1),
  runId: z.string().uuid(),
  type: automationJobTypeSchema,
  scheduledWindow: z.string().min(1),
  idempotencyKey: z.string().min(1),
  state: automationRunStateSchema,
  attempts: z.number().int().min(0).max(3),
  maxAttempts: z.literal(3),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  resultReference: z.string().min(1).nullable(),
  failureFingerprint: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
}).strict();

const evidenceUpdateV1Schema = z.object({
  version: z.literal(1),
  outcome: automationOutcomeSchema,
  sourceFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  sourceReferences: z.array(z.string().min(1)).min(1),
  reviewedAt: z.string().datetime(),
  summary: z.string().min(1),
}).strict();

export const evidenceUpdateV2Schema = evidenceUpdateV1Schema.omit({ version: true }).extend({
  version: z.literal(2),
  decision: z.object({
    audience: z.string().min(1),
    question: z.string().min(1),
    importance: contentDepthSchema,
    rationale: z.string().min(1),
    criteria: z.array(z.string().min(1)).min(1),
    evidenceGaps: z.array(z.string().min(1)),
    contradictions: z.array(z.string().min(1)),
    visualOpportunities: z.array(visualOpportunitySchema),
  }).strict(),
}).strict();

export const evidenceUpdateSchema = z.discriminatedUnion("version", [evidenceUpdateV1Schema, evidenceUpdateV2Schema]);

const editorialBriefV1Schema = z.object({
  version: z.literal(1),
  runId: z.string().uuid(),
  evidenceOutcome: automationOutcomeSchema,
  workItems: z.array(z.object({
    id: z.string().min(1),
    priority: z.number().int().min(0).max(100),
    reason: z.string().min(1),
    requiresReview: z.boolean(),
  }).strict()),
}).strict();

const pageBlueprintSchema = z.object({
  path: z.enum(["/decision-hub", "/solution-hub", "/scenarios"]),
  contentDepth: contentDepthSchema,
  targetWords: z.object({ min: z.number().int().positive(), max: z.number().int().positive() }).refine((value) => value.max >= value.min, "targetWords max must be at least min"),
  compositionFamily: z.string().min(1),
  catalogueReferences: z.array(z.string().min(1)).min(2),
  sections: z.array(z.object({
    id: z.string().min(1),
    directAnswer: z.string().min(1),
    explanation: z.string().min(1),
    evidenceFocus: z.string().min(1),
    uncertainty: z.string().min(1),
    visualOpportunityId: z.string().min(1).nullable(),
  }).strict()).min(1),
  motion: z.object({
    purpose: z.string().min(1),
    majorPatterns: z.array(z.string().min(1)).min(1).max(3),
    mobileTreatment: z.string().min(1),
    reducedMotionTreatment: z.string().min(1),
  }).strict(),
}).strict();

export const editorialBriefV2Schema = editorialBriefV1Schema.omit({ version: true }).extend({
  version: z.literal(2),
  evidencePacketVersion: z.literal(2),
  blueprints: z.array(pageBlueprintSchema).length(3),
}).strict();

export const editorialBriefSchema = z.discriminatedUnion("version", [editorialBriefV1Schema, editorialBriefV2Schema]);

export const pageSetChangeSchema = z.object({
  version: z.literal(1),
  paths: z.array(z.enum(["/decision-hub", "/solution-hub", "/scenarios"])).min(1),
  sourceFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  contentOnly: z.boolean(),
  requiresReview: z.boolean(),
}).strict();

export const validationReceiptSchema = z.object({
  version: z.literal(1),
  runId: z.string().uuid(),
  passed: z.boolean(),
  checks: z.array(z.object({ name: z.string().min(1), passed: z.boolean(), detail: z.string().min(1) }).strict()),
  createdAt: z.string().datetime(),
}).strict();

export const productionQualityReceiptV2Schema = validationReceiptSchema.omit({ version: true, checks: true }).extend({
  version: z.literal(2),
  checks: z.array(z.object({
    name: z.string().min(1),
    passed: z.boolean(),
    detail: z.string().min(1),
    category: z.enum(["production", "content", "evidence", "visual", "motion", "accessibility"]),
  }).strict()).min(1),
  screenshots: z.array(z.object({ route: z.string().min(1), viewport: z.string().min(1), mode: z.string().min(1), path: z.string().min(1) }).strict()),
}).strict();

export const deploymentConcernSchema = z.object({
  id: z.string().min(1),
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  severity: z.enum(["P0", "P1", "P2", "P3"]),
  category: z.enum(["production", "content", "evidence", "visual", "motion", "accessibility", "release"]),
  summary: z.string().min(1),
  affectedRoutes: z.array(z.string().startsWith("/")).min(1),
  firstSeenAt: z.string().datetime(),
  lastSeenAt: z.string().datetime(),
  occurrences: z.number().int().positive(),
  status: z.enum(["open", "fixed_forward", "rolled_back", "resolved"]),
  evidenceReferences: z.array(z.string().min(1)).min(1),
}).strict();

export const braintrustEvalSuggestionSchema = z.object({
  concernFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  name: z.string().min(1),
  datasetCase: z.string().min(1),
  expectedOutcome: z.string().min(1),
  scorer: z.string().min(1),
  baselineEvidence: z.string().min(1),
  passingThreshold: z.string().min(1),
  nextRunComparison: z.string().min(1),
}).strict();

export const deploymentConcernReportSchema = z.object({
  schemaVersion: z.literal("DeploymentConcernReportV1"),
  windowStart: z.string().datetime(),
  windowEnd: z.string().datetime(),
  productionOutcome: z.enum(["deployed_and_verified", "fixed_forward_and_verified", "rolled_back_to_verified"]),
  concerns: z.array(deploymentConcernSchema),
  braintrustStatus: z.enum(["integration_available", "suggestions_only"]),
  braintrustEvalSuggestions: z.array(braintrustEvalSuggestionSchema),
  createdAt: z.string().datetime(),
}).strict();

export const watchdogReceiptSchema = z.discriminatedUnion("version", [validationReceiptSchema, productionQualityReceiptV2Schema]);

export const deploymentReceiptSchema = z.object({
  version: z.literal(1),
  runId: z.string().uuid(),
  commit: z.string().regex(/^[a-f0-9]{40}$/),
  deploymentId: z.string().min(1),
  domain: z.string().url(),
  verifiedAt: z.string().datetime(),
}).strict();

export type AutomationJobType = z.infer<typeof automationJobTypeSchema>;
export type AutomationOutcomeV1 = z.infer<typeof automationOutcomeSchema>;
export type AutomationRunV1 = z.infer<typeof automationRunSchema>;
export type EvidenceUpdateV1 = z.infer<typeof evidenceUpdateSchema>;
export type EditorialBriefV1 = z.infer<typeof editorialBriefSchema>;
export type PageSetChangeV1 = z.infer<typeof pageSetChangeSchema>;
export type ValidationReceiptV1 = z.infer<typeof validationReceiptSchema>;
export type ProductionQualityReceiptV2 = z.infer<typeof productionQualityReceiptV2Schema>;
export type DeploymentConcernReportV1 = z.infer<typeof deploymentConcernReportSchema>;
export type DeploymentReceiptV1 = z.infer<typeof deploymentReceiptSchema>;

export function fingerprintAutomation(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

export function createRunId(): string {
  return randomUUID();
}
