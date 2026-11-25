import { createHash } from "node:crypto";
import { z } from "zod";

export const AUTOMATION_RESEARCH_CONTRACT_VERSION = "AutomationResearchContractV1" as const;

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const httpsUrlSchema = z.string().url().refine((value) => new URL(value).protocol === "https:", "HTTPS URL required.");

const automationExecutorBaseFields = {
  schema_version: z.literal(AUTOMATION_RESEARCH_CONTRACT_VERSION),
  capability: z.enum(["product_identity", "research"]),
  job_id: z.string().uuid(),
  stage_attempt_id: z.string().uuid(),
  exact_url: httpsUrlSchema,
  url_fingerprint: sha256Schema,
  input_digest: sha256Schema,
};

export const automationExecutorRequestSchema = z.object({
  ...automationExecutorBaseFields,
  product_identity: z.record(z.string(), z.unknown()).optional(),
}).strict();

export const sourceSnapshotSchema = z.object({
  snapshot_id: z.string().uuid(),
  url: httpsUrlSchema,
  final_url: httpsUrlSchema,
  redirect_chain: z.array(httpsUrlSchema).max(5),
  status_code: z.number().int().min(100).max(599),
  retrieved_at: z.string().datetime({ offset: true }),
  expires_at: z.string().datetime({ offset: true }),
  content_type: z.enum(["text/html", "text/plain"]),
  content_sha256: sha256Schema,
  normalized_text: z.string().max(512 * 1024),
  excerpt_sha256: sha256Schema,
  trust_tier: z.enum(["first_party", "program", "independent", "unknown"]),
}).strict();

export const researchSourceSnapshotBundleSchema = z.object({
  schema_version: z.literal("ResearchSourceSnapshotBundleV1"),
  snapshots: z.array(sourceSnapshotSchema).min(1).max(20),
  aggregate_bytes: z.number().int().min(1).max(8 * 1024 * 1024),
}).strict().superRefine((bundle, context) => {
  const total = bundle.snapshots.reduce((sum, snapshot) => sum + Buffer.byteLength(snapshot.normalized_text, "utf8"), 0);
  if (total !== bundle.aggregate_bytes) {
    context.addIssue({ code: "custom", path: ["aggregate_bytes"], message: "aggregate_bytes must match normalized snapshot bytes." });
  }
  const ids = bundle.snapshots.map((snapshot) => snapshot.snapshot_id);
  if (new Set(ids).size !== ids.length) {
    context.addIssue({ code: "custom", path: ["snapshots"], message: "snapshot_id values must be unique." });
  }
});

export const automationProductIdentitySchema = z.object({
  schema_version: z.literal("AutomationProductIdentityV1"),
  exact_url: httpsUrlSchema,
  url_fingerprint: sha256Schema,
  product_name: z.string().min(1).max(240),
  vendor_name: z.string().min(1).max(240),
  category: z.string().min(1).max(120),
  canonical_url: httpsUrlSchema,
  confidence: z.number().min(0.8).max(1),
  evidence_snapshot_ids: z.array(z.string().uuid()).min(1).max(20),
  limitations: z.array(z.string().min(1).max(500)).max(20),
}).strict();

export const automationResearchEvidenceSchema = z.object({
  schema_version: z.literal("AutomationResearchEvidenceV1"),
  exact_url: httpsUrlSchema,
  url_fingerprint: sha256Schema,
  claims: z.array(z.object({
    claim_key: z.string().min(1).max(120),
    claim: z.string().min(1).max(2000),
    claim_type: z.string().min(1).max(80),
    risk_level: z.enum(["low", "medium", "high", "critical"]),
    confidence: z.number().min(0).max(1),
    allowed_wording: z.string().min(1).max(2000),
    source_snapshot_ids: z.array(z.string().uuid()).min(1).max(20),
  }).strict()).min(1).max(100),
  scores: z.object({
    rubric_version: z.string().min(1).max(80),
    evidence_coverage: z.number().min(0).max(1),
    commercial_fit: z.number().min(0).max(1),
    compliance_risk: z.number().min(0).max(1),
    summary: z.string().min(1).max(2000),
  }).strict(),
  recommendations: z.array(z.string().min(1).max(1000)).max(20),
}).strict();

export const automationExecutorResponseSchema = z.object({
  ...automationExecutorBaseFields,
  product_identity: automationProductIdentitySchema.optional(),
  research_evidence: automationResearchEvidenceSchema.optional(),
  snapshots: researchSourceSnapshotBundleSchema.optional(),
  completed_at: z.string().datetime({ offset: true }),
}).strict().superRefine((response, context) => {
  if (response.capability === "product_identity" && !response.product_identity) {
    context.addIssue({ code: "custom", path: ["product_identity"], message: "Product identity output is required." });
  }
  if (response.capability === "research" && (!response.research_evidence || !response.snapshots)) {
    context.addIssue({ code: "custom", path: ["research_evidence"], message: "Research evidence and snapshots are required." });
  }
  if (response.product_identity && response.product_identity.exact_url !== response.exact_url) {
    context.addIssue({ code: "custom", path: ["product_identity", "exact_url"], message: "Product identity URL must match the job URL byte-for-byte." });
  }
  if (response.research_evidence && response.research_evidence.exact_url !== response.exact_url) {
    context.addIssue({ code: "custom", path: ["research_evidence", "exact_url"], message: "Research URL must match the job URL byte-for-byte." });
  }
});

export const automationExecutorCapabilitiesSchema = z.object({
  schema_version: z.literal("AutomationExecutorCapabilitiesV1"),
  capability: z.enum(["product_identity", "research"]),
  contract_version: z.literal(AUTOMATION_RESEARCH_CONTRACT_VERSION),
  supports: z.array(z.enum(["--probe", "stdin-json"])).min(2),
}).strict();

export type AutomationExecutorRequestV1 = z.infer<typeof automationExecutorRequestSchema>;
export type AutomationExecutorResponseV1 = z.infer<typeof automationExecutorResponseSchema>;
export type AutomationProductIdentityV1 = z.infer<typeof automationProductIdentitySchema>;
export type AutomationResearchEvidenceV1 = z.infer<typeof automationResearchEvidenceSchema>;
export type ResearchSourceSnapshotBundleV1 = z.infer<typeof researchSourceSnapshotBundleSchema>;

export function exactUrlFingerprint(exactUrl: string): string {
  return createHash("sha256").update(exactUrl, "utf8").digest("hex");
}

export function canonicalJsonDigest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}
