import { z } from "zod";
import type { EvidenceRef } from "./execution-evidence";
import { sha256 } from "./execution-evidence";

const hash = z.string().regex(/^[a-f0-9]{64}$/);
const nonempty = z.string().trim().min(1);
const isoDate = z.string().datetime({ offset: true });

export const researchRegistryCandidateSchema = z.object({
  claimId: z.string().uuid(),
  claimSha256: hash,
  claimText: nonempty,
  claimKind: z.enum(["factual", "opinion", "editorial"]),
  material: z.boolean(),
  claimUpdatedAt: isoDate,
  snapshotId: z.string().uuid(),
  sourceId: z.string().uuid(),
  canonicalUrl: z.string().url(),
  sourceType: nonempty,
  evidenceSha256: hash,
  retrievedAt: isoDate,
  accessOutcome: z.enum(["success", "partial", "inaccessible", "conflicting"]),
  passage: z.string().nullable(),
  locator: z.string().nullable(),
  verdict: z.enum(["SUPPORTED", "PARTIALLY_SUPPORTED", "OUTDATED", "CONTRADICTED", "UNVERIFIED"]),
  confidence: z.number().min(0).max(1),
  productContext: nonempty,
  reasoning: nonempty,
  expiresAt: isoDate,
  evidenceUpdatedAt: isoDate,
}).strict();

export type ResearchRegistryCandidate = z.infer<typeof researchRegistryCandidateSchema>;

export const researchRegistryLegacyLeadSchema = z.object({
  sourceId: z.string().uuid(),
  productId: z.string().uuid().nullable(),
  sourceUrl: z.string().url(),
  sourceType: nonempty,
  sourceHash: z.string().nullable(),
  retrievedAt: isoDate.nullable(),
  usageAllowed: z.boolean(),
  claimId: z.string().uuid().nullable(),
  claimText: z.string().nullable(),
  claimUpdatedAt: isoDate.nullable(),
}).strict();

export const researchRegistryPlanSchema = z.object({
  schemaVersion: z.literal("ResearchRegistryPlanV1"),
  importId: z.string().regex(/^article-[0-9a-f-]{36}$/),
  sourceFingerprint: hash,
  generatedAt: isoDate,
  candidates: z.array(researchRegistryCandidateSchema),
  legacyLeads: z.array(researchRegistryLegacyLeadSchema),
  planFingerprint: hash,
}).strict();

export type ResearchRegistryPlan = z.infer<typeof researchRegistryPlanSchema>;

const registryClaimDecisionSchema = z.object({
  claimId: nonempty,
  claimText: nonempty,
  material: z.boolean(),
  productContext: nonempty,
  action: z.enum(["reused_current", "researched_gap"]),
  gapReason: z.enum(["stale", "conflicting", "missing"]).optional(),
  registryMatches: z.array(z.object({
    claimId: z.string().uuid(),
    snapshotId: z.string().uuid(),
    productContext: nonempty,
  }).strict()),
  rationale: nonempty,
}).strict().superRefine((claim, context) => {
  if (claim.action === "reused_current" && (claim.gapReason || claim.registryMatches.length === 0)) {
    context.addIssue({ code: "custom", message: "Current reuse needs a registry snapshot and no gap reason." });
  }
  if (claim.action === "researched_gap" && (!claim.gapReason || claim.registryMatches.length > 0)) {
    context.addIssue({ code: "custom", message: "Gap research needs one gap reason and no reused snapshot." });
  }
});

export const researchRegistryDecisionSchema = z.object({
  schemaVersion: z.literal("ResearchRegistryDecisionV1"),
  importId: z.string().regex(/^article-[0-9a-f-]{36}$/),
  sourceFingerprint: hash,
  planFingerprint: hash,
  createdAt: isoDate,
  claims: z.array(registryClaimDecisionSchema).min(1),
}).strict();

export type ResearchRegistryDecision = z.infer<typeof researchRegistryDecisionSchema>;

export const researchRegistryWritebackSchema = z.object({
  schemaVersion: z.literal("ResearchRegistryWritebackV1"),
  importId: z.string().regex(/^article-[0-9a-f-]{36}$/),
  sourceFingerprint: hash,
  decisionSha256: hash,
  createdAt: isoDate,
  sources: z.array(z.object({ sourceId: nonempty, sourceType: nonempty, accessOutcome: z.enum(["success", "partial", "inaccessible", "conflicting"]), locator: z.string().nullable().optional() }).strict()),
  claims: z.array(z.object({
    plannedClaimId: nonempty,
    evidenceClaimId: nonempty,
    disposition: z.enum(["confirmed", "corrected", "qualified"]),
    claimKind: z.enum(["factual", "opinion", "editorial"]),
    verdict: z.enum(["SUPPORTED", "PARTIALLY_SUPPORTED", "OUTDATED", "CONTRADICTED", "UNVERIFIED"]),
    confidence: z.number().min(0).max(1),
    reasoning: nonempty,
    expiresAt: isoDate,
  }).strict()),
}).strict();
export type ResearchRegistryWriteback = z.infer<typeof researchRegistryWritebackSchema>;

export type ValidatedResearchForRegistry = {
  evidenceRef: EvidenceRef;
  evidencePath: string;
  evidenceSha256: string;
  evidence: {
    createdAt: string;
    sources: Array<{ id: string; url: string; retrievedAt: string; snapshotRef: EvidenceRef }>;
    claims: Array<{ id: string; text: string; sourceIds: string[]; excerptLocations: Array<{ sourceId: string; quote: string }> }>;
  };
  snapshotBytes: Map<string, Buffer>;
};

export type ResearchRegistryCommitInput = {
  importId: string;
  sourceFingerprint: string;
  idempotencyKey: string;
  plan: ResearchRegistryPlan;
  decision: ResearchRegistryDecision;
  writeback?: ResearchRegistryWriteback;
  writebackPath?: string;
  writebackSha256?: string;
  decisionPath: string;
  decisionSha256: string;
  research: ValidatedResearchForRegistry;
};

export type ResearchRegistryCommitResult = { bindingId: string; replayed: boolean };

export interface ArticleResearchRegistry {
  prepare(input: { importId: string; sourceFingerprint: string; sourceText: string; now: string }): Promise<ResearchRegistryPlan>;
  commit(input: ResearchRegistryCommitInput): Promise<ResearchRegistryCommitResult>;
}

function fingerprintPlan(plan: Omit<ResearchRegistryPlan, "planFingerprint">): string {
  return sha256(JSON.stringify(plan));
}

export function assertResearchRegistryPlanFingerprint(plan: ResearchRegistryPlan): void {
  const { planFingerprint, ...content } = plan;
  if (fingerprintPlan(content) !== planFingerprint) throw new Error("RESEARCH_REGISTRY_PLAN_FINGERPRINT_MISMATCH");
}

export function createResearchRegistryPlan(input: Omit<ResearchRegistryPlan, "schemaVersion" | "planFingerprint">): ResearchRegistryPlan {
  const base = { schemaVersion: "ResearchRegistryPlanV1" as const, ...input };
  return researchRegistryPlanSchema.parse({ ...base, planFingerprint: fingerprintPlan(base) });
}

export function assertRegistryDecisionBinding(plan: ResearchRegistryPlan, decision: ResearchRegistryDecision): void {
  if (decision.importId !== plan.importId || decision.sourceFingerprint !== plan.sourceFingerprint || decision.planFingerprint !== plan.planFingerprint) {
    throw new Error("RESEARCH_REGISTRY_BINDING_MISMATCH");
  }
}

export function validateRegistryDecisionPlan(plan: ResearchRegistryPlan, decision: ResearchRegistryDecision, now: string): void {
  assertResearchRegistryPlanFingerprint(plan);
  assertRegistryDecisionBinding(plan, decision);
  const ids = new Set<string>();
  for (const tracked of decision.claims) {
    if (ids.has(tracked.claimId)) throw new Error("RESEARCH_REGISTRY_CLAIM_DECISION_DUPLICATE");
    ids.add(tracked.claimId);
    const related = plan.candidates.filter((candidate) => candidate.claimText === tracked.claimText && candidate.productContext === tracked.productContext);
    const retained = (candidate: ResearchRegistryCandidate) => candidate.passage !== null && sha256(Buffer.from(candidate.passage, "utf8")) === candidate.evidenceSha256;
    const current = related.filter((candidate) => retained(candidate) && candidate.verdict === "SUPPORTED" && candidate.accessOutcome === "success" && Date.parse(candidate.expiresAt) > Date.parse(now));
    const conflict = related.filter((candidate) => retained(candidate) && Date.parse(candidate.expiresAt) > Date.parse(now) && (candidate.verdict === "CONTRADICTED" || candidate.verdict === "PARTIALLY_SUPPORTED" || candidate.verdict === "UNVERIFIED" || candidate.accessOutcome === "conflicting" || candidate.accessOutcome === "partial" || candidate.accessOutcome === "inaccessible"));
    const unprovable = related.filter((candidate) => !retained(candidate));
    if (tracked.action === "reused_current") {
      if (conflict.length > 0) throw new Error("RESEARCH_REGISTRY_REUSE_CONFLICTING");
      for (const match of tracked.registryMatches) {
        if (!current.some((candidate) => candidate.claimId === match.claimId && candidate.snapshotId === match.snapshotId && candidate.productContext === match.productContext)) {
          throw new Error("RESEARCH_REGISTRY_REUSE_NOT_CURRENT");
        }
      }
      continue;
    }
    if (current.length > 0 && conflict.length === 0) throw new Error("RESEARCH_REGISTRY_GAP_ALREADY_COVERED");
    if (tracked.gapReason === "missing" && related.length > 0 && unprovable.length !== related.length) throw new Error("RESEARCH_REGISTRY_GAP_REASON_MISMATCH");
    if (tracked.gapReason === "stale" && !related.some((candidate) => candidate.verdict === "OUTDATED" || Date.parse(candidate.expiresAt) <= Date.parse(now))) throw new Error("RESEARCH_REGISTRY_GAP_REASON_MISMATCH");
    if (tracked.gapReason === "conflicting" && conflict.length === 0) throw new Error("RESEARCH_REGISTRY_GAP_REASON_MISMATCH");
  }
}

export function validateRegistryDecisionAgainstEvidence(
  plan: ResearchRegistryPlan,
  decision: ResearchRegistryDecision,
  research: ValidatedResearchForRegistry,
  now: string,
  writeback?: ResearchRegistryWriteback,
): void {
  validateRegistryDecisionPlan(plan, decision, now);
  const sources = new Map(research.evidence.sources.map((source) => [source.id, source]));
  const claimDecisions = new Map(decision.claims.map((claim) => [claim.claimId, claim]));
  if (claimDecisions.size !== decision.claims.length) throw new Error("RESEARCH_REGISTRY_CLAIM_DECISION_DUPLICATE");
  for (const source of research.evidence.sources) if (!research.snapshotBytes.has(source.id)) throw new Error("RESEARCH_REGISTRY_SOURCE_DECISION_MISSING");
  for (const claim of research.evidence.claims) {
    const mapping = writeback?.claims.find((item) => item.evidenceClaimId === claim.id);
    const tracked = claimDecisions.get(mapping?.plannedClaimId ?? claim.id);
    if (!tracked || (tracked.action === "reused_current" && tracked.claimText !== claim.text) || claim.sourceIds.some((id) => !sources.has(id))) {
      throw new Error("RESEARCH_REGISTRY_CLAIM_DECISION_MISMATCH");
    }
    if (tracked.action === "reused_current") {
      const matchedSources = new Set<string>();
      for (const match of tracked.registryMatches) {
        const candidate = plan.candidates.find((item) => item.claimId === match.claimId && item.snapshotId === match.snapshotId && item.productContext === match.productContext);
        if (!candidate || candidate.verdict !== "SUPPORTED" || candidate.accessOutcome !== "success" || Date.parse(candidate.expiresAt) <= Date.parse(now)) {
          throw new Error("RESEARCH_REGISTRY_REUSE_NOT_CURRENT");
        }
        const matchingSource = claim.sourceIds.find((id) => {
          const source = sources.get(id);
          const bytes = research.snapshotBytes.get(id);
          return source?.url === candidate.canonicalUrl && bytes && sha256(bytes) === candidate.evidenceSha256;
        });
        if (!matchingSource) throw new Error("RESEARCH_REGISTRY_REUSE_BYTES_MISMATCH");
        matchedSources.add(matchingSource);
      }
      if (tracked.material && claim.sourceIds.some((sourceId) => !matchedSources.has(sourceId))) throw new Error("RESEARCH_REGISTRY_REUSE_SOURCE_UNBOUND");
    }
  }
  for (const tracked of decision.claims) {
    const evidenceClaimId = writeback?.claims.find((item) => item.plannedClaimId === tracked.claimId)?.evidenceClaimId ?? tracked.claimId;
    if (!research.evidence.claims.some((claim) => claim.id === evidenceClaimId)) throw new Error("RESEARCH_REGISTRY_CLAIM_DECISION_MISSING");
  }
}

export function canonicalResearchUrl(value: string): string {
  const url = new URL(value);
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
  url.searchParams.sort();
  return url.toString();
}
