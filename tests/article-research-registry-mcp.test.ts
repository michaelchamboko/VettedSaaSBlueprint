import assert from "node:assert/strict";
import test from "node:test";

import type { ResearchRegistryCommitInput } from "../src/lib/article-import/research-registry";
import {
  ARTICLE_RESEARCH_NEON_SCOPE,
  createMcpArticleResearchRegistry,
  type ArticleResearchMcpRunSql,
  type ArticleResearchMcpRunSqlTransaction,
} from "../src/lib/article-import/research-registry-mcp";

const prepareInput = {
  importId: "article-11111111-1111-4111-8111-111111111111",
  sourceFingerprint: "a".repeat(64),
  sourceText: "O'Reilly café",
  now: "2026-11-28T00:00:00.000Z",
};

function unusedTransaction(): ArticleResearchMcpRunSqlTransaction {
  return async () => { throw new Error("unexpected transaction"); };
}

test("MCP prepare uses fixed scope, UTF-8 hex input, and one complete aggregate row", async () => {
  let request: Parameters<ArticleResearchMcpRunSql>[0] | undefined;
  const registry = createMcpArticleResearchRegistry({
    async runSql(input) {
      request = input;
      return { data: { rows: [{ database_now: prepareInput.now, candidates: [], legacy_leads: [] }], totalRowCount: 1, truncated: false } };
    },
    runSqlTransaction: unusedTransaction(),
  });
  const plan = await registry.prepare(prepareInput);
  assert.deepEqual(request && {
    project_id: request.project_id,
    branch_id: request.branch_id,
    database_name: request.database_name,
    max_rows: request.max_rows,
  }, { ...ARTICLE_RESEARCH_NEON_SCOPE, max_rows: 1 });
  assert.match(request?.sql ?? "", /^select database_now, candidates, legacy_leads from article_research\.prepare_import_evidence_v001\(/);
  assert.doesNotMatch(request?.sql ?? "", /O'Reilly|café/);
  assert.equal(plan.generatedAt, prepareInput.now);
  assert.deepEqual(plan.candidates, []);
  assert.deepEqual(plan.legacyLeads, []);
});

test("MCP prepare fails closed on truncated, mismatched, or malformed connector rows", async (t) => {
  const results = [
    { data: { rows: [{ database_now: prepareInput.now, candidates: [], legacy_leads: [] }], totalRowCount: 1, truncated: true } },
    { data: { rows: [], totalRowCount: 1, truncated: false } },
    { data: { rows: [{ database_now: prepareInput.now, candidates: [] }], totalRowCount: 1, truncated: false } },
  ];
  for (const [index, result] of results.entries()) await t.test(String(index), async () => {
    const registry = createMcpArticleResearchRegistry({ runSql: async () => result, runSqlTransaction: unusedTransaction() });
    await assert.rejects(registry.prepare(prepareInput), /CAPABILITY_UNAVAILABLE: article research registry read failed: ARTICLE_RESEARCH_MCP_RESULT_/);
  });
});

function commitInput(): ResearchRegistryCommitInput {
  return {
    importId: prepareInput.importId,
    sourceFingerprint: prepareInput.sourceFingerprint,
    idempotencyKey: "b".repeat(64),
    plan: { planFingerprint: "c".repeat(64), generatedAt: prepareInput.now, candidates: [] } as ResearchRegistryCommitInput["plan"],
    decision: {
      claims: [{ claimId: "claim-1", claimText: "Claim", material: false, productContext: "general", action: "reused_current", registryMatches: [{ claimId: "11111111-1111-4111-8111-111111111111", snapshotId: "22222222-2222-4222-8222-222222222222", productContext: "general" }], rationale: "Current evidence" }],
    } as ResearchRegistryCommitInput["decision"],
    decisionPath: "decision.json",
    decisionSha256: "d".repeat(64),
    research: {
      evidenceRef: { kind: "file", path: "evidence.json" },
      evidencePath: "evidence.json",
      evidenceSha256: "e".repeat(64),
      evidence: {
        createdAt: prepareInput.now,
        sources: [{ id: "source-1", url: "https://example.com/source", retrievedAt: prepareInput.now, snapshotRef: { kind: "file", path: "snapshot.txt" } }],
        claims: [{ id: "claim-1", text: "Claim", sourceIds: ["source-1"], excerptLocations: [{ sourceId: "source-1", quote: "Claim" }] }],
      },
      snapshotBytes: new Map([["source-1", Buffer.from("retained bytes", "utf8")]]),
    },
  };
}

test("MCP commit uses one serializable transaction and preserves replay result", async () => {
  let request: Parameters<ArticleResearchMcpRunSqlTransaction>[0] | undefined;
  const registry = createMcpArticleResearchRegistry({
    runSql: async () => { throw new Error("unexpected query"); },
    async runSqlTransaction(input) {
      request = input;
      return { data: [
        { rows: [], totalRowCount: 0, truncated: false },
        { rows: [{ binding_id: "33333333-3333-4333-8333-333333333333", replayed: true }], totalRowCount: 1, truncated: false },
      ] };
    },
  });
  assert.deepEqual(await registry.commit(commitInput()), { bindingId: "33333333-3333-4333-8333-333333333333", replayed: true });
  assert.deepEqual(request && { ...request, sql_statements: undefined }, { ...ARTICLE_RESEARCH_NEON_SCOPE, max_rows: 1, sql_statements: undefined });
  assert.equal(request?.sql_statements[0], "set transaction isolation level serializable");
  assert.match(request?.sql_statements[1] ?? "", /^select binding_id::text as binding_id, replayed from article_research\.commit_import_evidence_v001\(convert_from\(decode\('[a-f0-9]+'/);
  assert.doesNotMatch(request?.sql_statements[1] ?? "", /article-11111111|example\.com|retained bytes/);
  const payloadHex = request?.sql_statements[1]?.match(/decode\('([a-f0-9]+)'/)?.[1];
  const payload = JSON.parse(Buffer.from(payloadHex ?? "", "hex").toString("utf8"));
  assert.equal(payload.planGeneratedAt, prepareInput.now);
  assert.equal(payload.sources[0].canonicalUrl, "https://example.com/source");
  assert.equal(payload.sources[0].passage, "retained bytes");
  assert.deepEqual(payload.acquiredSourceIds, []);
});

test("MCP commit retries SQLSTATE 40001 only and rejects incomplete transaction results", async () => {
  let attempts = 0;
  const registry = createMcpArticleResearchRegistry({
    runSql: async () => { throw new Error("unexpected query"); },
    async runSqlTransaction() {
      attempts += 1;
      if (attempts < 3) throw Object.assign(new Error("serialization failure"), { code: "40001" });
      return { data: [
        { rows: [], totalRowCount: 0, truncated: false },
        { rows: [{ binding_id: "33333333-3333-4333-8333-333333333333", replayed: false }], totalRowCount: 1, truncated: false },
      ] };
    },
  });
  assert.equal((await registry.commit(commitInput())).replayed, false);
  assert.equal(attempts, 3);

  const incomplete = createMcpArticleResearchRegistry({
    runSql: async () => { throw new Error("unexpected query"); },
    runSqlTransaction: async () => ({ data: [
      { rows: [], totalRowCount: 0, truncated: false },
      { rows: [], totalRowCount: 1, truncated: true },
    ] }),
  });
  await assert.rejects(incomplete.commit(commitInput()), /CAPABILITY_UNAVAILABLE: article research registry write failed: ARTICLE_RESEARCH_MCP_RESULT_INCOMPLETE/);
});

test("MCP commit preserves canonical repairable outcomes without connector details", async () => {
  const registry = createMcpArticleResearchRegistry({
    runSql: async () => { throw new Error("unexpected query"); },
    runSqlTransaction: async () => { throw new Error("Neon request failed: RESEARCH_REGISTRY_PLAN_STALE payload omitted"); },
  });
  await assert.rejects(registry.commit(commitInput()), (error: Error) => {
    assert.equal(error.message, "RESEARCH_REGISTRY_PLAN_STALE");
    assert.doesNotMatch(error.message, /Neon|payload/);
    return true;
  });
});
