import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Client, QueryResult } from "pg";

import { sha256 } from "../../src/lib/article-import/execution-evidence";
import type { ResearchRegistryCommitInput } from "../../src/lib/article-import/research-registry";
import { createMcpArticleResearchRegistry } from "../../src/lib/article-import/research-registry-mcp";

function resultEnvelope(result: QueryResult) {
  return { rows: result.rows, totalRowCount: result.rowCount ?? result.rows.length, truncated: false };
}

export async function exerciseMcpAdapterRoundTrip(worker: Client): Promise<void> {
  const registry = createMcpArticleResearchRegistry({
    async runSql(input) {
      assert.equal(input.max_rows, 1);
      return { data: resultEnvelope(await worker.query(input.sql)) };
    },
    async runSqlTransaction(input) {
      assert.equal(input.max_rows, 1);
      await worker.query("begin");
      try {
        const data = [];
        for (const sql of input.sql_statements) data.push(resultEnvelope(await worker.query(sql)));
        await worker.query("commit");
        return { data };
      } catch (error) {
        await worker.query("rollback");
        throw error;
      }
    },
  });

  const runId = randomUUID();
  const importId = `article-${randomUUID()}`;
  const sourceFingerprint = "a".repeat(64);
  const claimText = `mcpwire${runId.replaceAll("-", "")}`;
  const sourceUrl = `https://example.test/mcp-adapter/${runId}`;
  const plan = await registry.prepare({ importId, sourceFingerprint, sourceText: claimText, now: new Date().toISOString() });
  assert.deepEqual(plan.candidates, []);

  const decision = {
    schemaVersion: "ResearchRegistryDecisionV1" as const,
    importId,
    sourceFingerprint,
    planFingerprint: plan.planFingerprint,
    createdAt: plan.generatedAt,
    claims: [{
      claimId: "price",
      claimText,
      material: true,
      productContext: `MCP adapter ${runId}`,
      action: "researched_gap" as const,
      gapReason: "missing" as const,
      registryMatches: [],
      rationale: "The first prepare found no current registry evidence.",
    }],
  };
  const decisionSha256 = sha256(JSON.stringify(decision));
  const bytes = Buffer.from(`${claimText}\n`, "utf8");
  const expiresAt = new Date(Date.parse(plan.generatedAt) + 30 * 24 * 60 * 60 * 1000).toISOString();
  const input: ResearchRegistryCommitInput = {
    importId,
    sourceFingerprint,
    idempotencyKey: "b".repeat(64),
    plan,
    decision,
    decisionPath: "synthetic/mcp-decision.json",
    decisionSha256,
    writebackPath: "synthetic/mcp-writeback.json",
    writebackSha256: "c".repeat(64),
    writeback: {
      schemaVersion: "ResearchRegistryWritebackV1",
      importId,
      sourceFingerprint,
      decisionSha256,
      createdAt: plan.generatedAt,
      sources: [{ sourceId: "pricing", sourceType: "official_pricing", accessOutcome: "success", locator: "pricing line" }],
      claims: [{ plannedClaimId: "price", evidenceClaimId: "price", disposition: "confirmed", claimKind: "factual", verdict: "SUPPORTED", confidence: 0.95, reasoning: "The retained line states the price.", expiresAt }],
    },
    research: {
      evidenceRef: { path: "synthetic/mcp-research.json", sha256: "d".repeat(64) },
      evidencePath: "synthetic/mcp-research.json",
      evidenceSha256: "d".repeat(64),
      evidence: {
        createdAt: plan.generatedAt,
        sources: [{ id: "pricing", url: sourceUrl, retrievedAt: plan.generatedAt, snapshotRef: { path: "synthetic/mcp-snapshot.txt", sha256: sha256(bytes) } }],
        claims: [{ id: "price", text: claimText, sourceIds: ["pricing"], excerptLocations: [{ sourceId: "pricing", quote: claimText }] }],
      },
      snapshotBytes: new Map([["pricing", bytes]]),
    },
  };

  const committed = await registry.commit(input);
  assert.equal(committed.replayed, false);
  assert.deepEqual(await registry.commit(input), { bindingId: committed.bindingId, replayed: true });
  const reread = await registry.prepare({ importId: `article-${randomUUID()}`, sourceFingerprint: "e".repeat(64), sourceText: claimText, now: new Date().toISOString() });
  assert.equal(reread.candidates.some((candidate) => candidate.claimText === claimText && candidate.evidenceSha256 === sha256(bytes)), true);
}
