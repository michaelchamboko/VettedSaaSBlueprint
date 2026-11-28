import { z } from "zod";

import { sha256 } from "./execution-evidence";
import {
  canonicalResearchUrl,
  createResearchRegistryPlan,
  validateRegistryWritebackCompleteness,
  type ArticleResearchRegistry,
  type ResearchRegistryCommitInput,
  type ResearchRegistryCommitResult,
} from "./research-registry";
import {
  ARTICLE_RESEARCH_SERIALIZATION_ATTEMPTS,
  isRepairableResearchRegistryCommitError,
  researchRegistryCandidateFromRow,
  researchRegistryLegacyLeadFromRow,
  researchSearchExpressions,
} from "./research-registry-neon";

export const ARTICLE_RESEARCH_NEON_SCOPE = {
  project_id: "winter-truth-98410571",
  branch_id: "br-spring-smoke-a65esjkh",
  database_name: "neondb",
} as const;

type SqlScope = typeof ARTICLE_RESEARCH_NEON_SCOPE;
export type ArticleResearchMcpRunSql = (input: SqlScope & { sql: string; max_rows: number }) => Promise<unknown>;
export type ArticleResearchMcpRunSqlTransaction = (
  input: SqlScope & { sql_statements: string[]; max_rows: number },
) => Promise<unknown>;

export type ArticleResearchMcpExecutors = {
  runSql: ArticleResearchMcpRunSql;
  runSqlTransaction: ArticleResearchMcpRunSqlTransaction;
};

const rowSchema = z.record(z.string(), z.unknown());
const rowSetSchema = z.object({
  rows: z.array(rowSchema),
  totalRowCount: z.number().int().nonnegative(),
  truncated: z.boolean(),
  note: z.string().nullable().optional(),
}).strict();
const runSqlResultSchema = z.object({ data: rowSetSchema }).strict();
const runSqlTransactionResultSchema = z.object({ data: z.array(rowSetSchema) }).strict();

function requireCompleteRows(value: unknown, expectedRows: number): Record<string, unknown>[] {
  const parsed = rowSetSchema.safeParse(value);
  if (!parsed.success || parsed.data.truncated || parsed.data.totalRowCount !== expectedRows || parsed.data.rows.length !== expectedRows) {
    throw new Error("ARTICLE_RESEARCH_MCP_RESULT_INCOMPLETE");
  }
  return parsed.data.rows;
}

function encodedText(value: string): string {
  return `convert_from(decode('${Buffer.from(value, "utf8").toString("hex")}', 'hex'), 'utf8')`;
}

function encodedJson(value: unknown): string {
  return `${encodedText(JSON.stringify(value))}::jsonb`;
}

function prepareSql(sourceText: string): string {
  const searches = researchSearchExpressions(sourceText).map(encodedText).join(", ");
  return `select database_now, candidates, legacy_leads from article_research.prepare_import_evidence_v001(array[${searches}]::text[])`;
}

function commitPayload(input: ResearchRegistryCommitInput): unknown {
  const acquiredSourceIds = [...validateRegistryWritebackCompleteness(input.decision, input.research, input.writeback)].sort();
  return {
    importId: input.importId,
    sourceFingerprint: input.sourceFingerprint,
    idempotencyKey: input.idempotencyKey,
    planFingerprint: input.plan.planFingerprint,
    decisionPath: input.decisionPath,
    decisionSha256: input.decisionSha256,
    writebackPath: input.writebackPath ?? null,
    writebackSha256: input.writebackSha256 ?? null,
    evidencePath: input.research.evidencePath,
    evidenceSha256: input.research.evidenceSha256,
    planGeneratedAt: input.plan.generatedAt,
    researchCreatedAt: input.research.evidence.createdAt,
    writebackCreatedAt: input.writeback?.createdAt ?? null,
    plannedClaimHashes: input.decision.claims.map((claim) => sha256(claim.claimText)),
    finalClaimHashes: input.research.evidence.claims.map((claim) => sha256(claim.text)),
    acquiredSourceIds,
    candidates: input.plan.candidates.map((candidate) => ({
      claimId: candidate.claimId,
      snapshotId: candidate.snapshotId,
      productContext: candidate.productContext,
      canonicalUrl: candidate.canonicalUrl,
      evidenceSha256: candidate.evidenceSha256,
      claimUpdatedAt: candidate.claimUpdatedAt,
      evidenceUpdatedAt: candidate.evidenceUpdatedAt,
      expiresAt: candidate.expiresAt,
    })),
    decisions: input.decision.claims.map((claim) => ({
      claimId: claim.claimId,
      claimText: claim.claimText,
      material: claim.material,
      productContext: claim.productContext,
      action: claim.action,
      registryMatches: claim.registryMatches,
    })),
    writebackSources: (input.writeback?.sources ?? []).map((source) => ({
      sourceId: source.sourceId,
      sourceType: source.sourceType,
      accessOutcome: source.accessOutcome,
      locator: source.locator ?? null,
    })),
    writebackClaims: (input.writeback?.claims ?? []).map((claim) => ({
      plannedClaimId: claim.plannedClaimId,
      evidenceClaimId: claim.evidenceClaimId,
      claimKind: claim.claimKind,
      verdict: claim.verdict,
      confidence: claim.confidence,
      reasoning: claim.reasoning,
      expiresAt: claim.expiresAt,
    })),
    sources: input.research.evidence.sources.map((source) => {
      const bytes = input.research.snapshotBytes.get(source.id);
      if (!bytes) throw new Error("RESEARCH_REGISTRY_SOURCE_DECISION_MISSING");
      return {
        id: source.id,
        canonicalUrl: canonicalResearchUrl(source.url),
        retrievedAt: source.retrievedAt,
        evidenceSha256: sha256(bytes),
        passage: bytes.toString("utf8"),
      };
    }),
    evidenceClaims: input.research.evidence.claims.map((claim) => ({
      id: claim.id,
      text: claim.text,
      claimSha256: sha256(claim.text),
      sourceIds: claim.sourceIds,
    })),
  };
}

function isSerializationFailure(error: unknown): boolean {
  return error instanceof Error
    && ((error as Error & { code?: string }).code === "40001" || /\b40001\b/.test(error.message));
}

function repairableCommitCode(error: unknown): string | undefined {
  if (!(error instanceof Error)) return undefined;
  return error.message.match(/\b(RESEARCH_REGISTRY_(?:PLAN_STALE|ACQUISITION_TIME_INVALID|EXPIRY_INVALID))\b/)?.[1];
}

async function commitWithRetry(
  runSqlTransaction: ArticleResearchMcpRunSqlTransaction,
  input: ResearchRegistryCommitInput,
): Promise<ResearchRegistryCommitResult> {
  const sql = `select binding_id::text as binding_id, replayed from article_research.commit_import_evidence_v001(${encodedJson(commitPayload(input))})`;
  for (let attempt = 0; attempt < ARTICLE_RESEARCH_SERIALIZATION_ATTEMPTS; attempt += 1) {
    try {
      const raw = await runSqlTransaction({
        ...ARTICLE_RESEARCH_NEON_SCOPE,
        sql_statements: ["set transaction isolation level serializable", sql],
        max_rows: 1,
      });
      const parsed = runSqlTransactionResultSchema.safeParse(raw);
      if (!parsed.success || parsed.data.data.length !== 2) throw new Error("ARTICLE_RESEARCH_MCP_RESULT_INCOMPLETE");
      requireCompleteRows(parsed.data.data[0], 0);
      const row = requireCompleteRows(parsed.data.data[1], 1)[0];
      if (typeof row.binding_id !== "string" || typeof row.replayed !== "boolean") throw new Error("ARTICLE_RESEARCH_MCP_RESULT_INVALID");
      return { bindingId: row.binding_id, replayed: row.replayed };
    } catch (error) {
      if (!isSerializationFailure(error)) throw error;
      if (attempt === ARTICLE_RESEARCH_SERIALIZATION_ATTEMPTS - 1) throw new Error("RESEARCH_REGISTRY_SERIALIZATION_RETRY_EXHAUSTED");
    }
  }
  throw new Error("RESEARCH_REGISTRY_SERIALIZATION_RETRY_EXHAUSTED");
}

export function createMcpArticleResearchRegistry(executors: ArticleResearchMcpExecutors): ArticleResearchRegistry {
  return {
    async prepare(input) {
      try {
        const raw = await executors.runSql({ ...ARTICLE_RESEARCH_NEON_SCOPE, sql: prepareSql(input.sourceText), max_rows: 1 });
        const parsed = runSqlResultSchema.safeParse(raw);
        if (!parsed.success) throw new Error("ARTICLE_RESEARCH_MCP_RESULT_INVALID");
        const row = requireCompleteRows(parsed.data.data, 1)[0];
        if (!Array.isArray(row.candidates) || !Array.isArray(row.legacy_leads)) throw new Error("ARTICLE_RESEARCH_MCP_RESULT_INVALID");
        const generatedAt = row.database_now instanceof Date ? row.database_now.toISOString() : String(row.database_now);
        return createResearchRegistryPlan({
          importId: input.importId,
          sourceFingerprint: input.sourceFingerprint,
          generatedAt,
          candidates: row.candidates.map((candidate) => researchRegistryCandidateFromRow(rowSchema.parse(candidate))),
          legacyLeads: row.legacy_leads.map((lead) => researchRegistryLegacyLeadFromRow(rowSchema.parse(lead))),
        });
      } catch (error) {
        const message = error instanceof Error && error.message.startsWith("ARTICLE_RESEARCH_") ? error.message : "ARTICLE_RESEARCH_MCP_REQUEST_FAILED";
        throw new Error(`CAPABILITY_UNAVAILABLE: article research registry read failed: ${message}`);
      }
    },
    async commit(input) {
      try {
        return await commitWithRetry(executors.runSqlTransaction, input);
      } catch (error) {
        if (error instanceof Error && error.message === "RESEARCH_REGISTRY_SERIALIZATION_RETRY_EXHAUSTED") throw error;
        const repairable = repairableCommitCode(error);
        if (repairable && isRepairableResearchRegistryCommitError(repairable)) throw new Error(repairable);
        const message = error instanceof Error && /^(ARTICLE_RESEARCH_|RESEARCH_REGISTRY_)/.test(error.message)
          ? error.message
          : "ARTICLE_RESEARCH_MCP_REQUEST_FAILED";
        throw new Error(`CAPABILITY_UNAVAILABLE: article research registry write failed: ${message}`);
      }
    },
  };
}
