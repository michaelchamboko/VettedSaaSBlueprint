import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { Client } from "pg";

import { sha256 } from "../src/lib/article-import/execution-evidence";
import { exerciseMcpAdapterRoundTrip } from "./helpers/article-research-mcp-roundtrip";

const databaseUrl = process.env.ARTICLE_RESEARCH_FUNCTION_DATABASE_URL;
const disposableInstance = process.env.ARTICLE_RESEARCH_FUNCTION_TEST_INSTANCE;
const enabled = databaseUrl !== undefined && disposableInstance === "vsb-pr95-pg-1128";
const workerPassword = "disposable-article-research-worker";

function isolatedUrl(value: string): URL {
  const url = new URL(value);
  if (!['127.0.0.1', 'localhost'].includes(url.hostname)
    || url.pathname !== "/neondb"
    || decodeURIComponent(url.username) !== "pr95_test_admin") {
    throw new Error("Refusing registry-function test outside the named disposable instance.");
  }
  return url;
}

async function apply(client: Client, file: string) {
  await client.query(await readFile(path.join(process.cwd(), file), "utf8"));
}

async function commitSerializable(client: Client, payload: unknown) {
  await client.query("begin isolation level serializable");
  try {
    const result = await client.query(
      "select binding_id::text, replayed from article_research.commit_import_evidence_v001($1::jsonb)",
      [payload],
    );
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

function commitPayload(now: number) {
  const importId = `article-${randomUUID()}`;
  const claimText = `Acme ${randomUUID()} costs USD 20 monthly.`;
  const passage = `${claimText}\n`;
  const retrievedAt = new Date(now - 60_000).toISOString();
  const expiresAt = new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString();
  const sourceId = "pricing";
  const claimHash = sha256(claimText);
  return {
    importId,
    sourceFingerprint: "1".repeat(64),
    idempotencyKey: "2".repeat(64),
    planFingerprint: "3".repeat(64),
    decisionPath: "synthetic/decision.json",
    decisionSha256: "4".repeat(64),
    writebackPath: "synthetic/writeback.json",
    writebackSha256: "5".repeat(64),
    evidencePath: "synthetic/research.json",
    evidenceSha256: "6".repeat(64),
    planGeneratedAt: retrievedAt,
    researchCreatedAt: retrievedAt,
    writebackCreatedAt: retrievedAt,
    plannedClaimHashes: [claimHash],
    finalClaimHashes: [claimHash],
    acquiredSourceIds: [sourceId],
    candidates: [],
    decisions: [{
      claimId: "price", claimText, material: true, productContext: "Acme standard plan",
      action: "researched_gap", registryMatches: [],
    }],
    writebackSources: [{ sourceId, sourceType: "official_pricing", accessOutcome: "success", locator: "pricing line" }],
    writebackClaims: [{
      plannedClaimId: "price", evidenceClaimId: "price", claimKind: "factual", verdict: "SUPPORTED",
      confidence: 0.95, reasoning: "The retained line states the price.", expiresAt,
    }],
    sources: [{
      id: sourceId, canonicalUrl: `https://example.test/pricing/${randomUUID()}`,
      retrievedAt, evidenceSha256: sha256(passage), passage,
    }],
    evidenceClaims: [{ id: "price", text: claimText, claimSha256: claimHash, sourceIds: [sourceId] }],
  };
}

test("registry functions enforce worker identity and atomically write, replay, and reject mismatch", { skip: !enabled }, async () => {
  const adminUrl = isolatedUrl(databaseUrl!);
  const admin = new Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  try {
    const marker = await admin.query("select to_regclass('public.vsb_pr95_disposable_marker')::text as marker");
    if (marker.rows[0]?.marker === null) {
      const pristine = await admin.query(`select
        to_regnamespace('article_research') is null as no_schema,
        to_regclass('public.research_sources') is null as no_sources,
        not exists (select 1 from pg_roles where rolname in ('article_research_worker','article_research_intruder')) as no_roles`);
      assert.deepEqual(pristine.rows, [{ no_schema: true, no_sources: true, no_roles: true }], "Disposable database is not pristine or test-owned.");
      await admin.query("create table public.vsb_pr95_disposable_marker (marker text primary key check (marker = 'vsb-pr95-pg-1128'))");
      await admin.query("insert into public.vsb_pr95_disposable_marker values ('vsb-pr95-pg-1128')");
    } else {
      const owned = await admin.query("select marker from public.vsb_pr95_disposable_marker");
      assert.deepEqual(owned.rows, [{ marker: "vsb-pr95-pg-1128" }]);
    }
    await admin.query(`do $role$ begin
      if not exists (select 1 from pg_roles where rolname = 'article_research_worker') then
        create role article_research_worker login password '${workerPassword}';
      end if;
      if not exists (select 1 from pg_roles where rolname = 'article_research_intruder') then
        create role article_research_intruder login password 'disposable-intruder';
      end if;
    end $role$`);
    await apply(admin, "tests/fixtures/article-research-registry-postgres.sql");
    await apply(admin, "db/article-research-import-bindings-v001.sql");
    await apply(admin, "db/article-research-registry-functions-v001.sql");
    await apply(admin, "db/article-research-registry-functions-v001.sql");
    await admin.query("grant usage on schema article_research to article_research_worker, article_research_intruder");
    await admin.query("grant select, insert, update on all tables in schema article_research to article_research_worker");
    await admin.query("grant select on public.research_sources, public.evidence_claims to article_research_worker");

    await assert.rejects(
      admin.query("select * from article_research.prepare_import_evidence_v001(array['acme'])"),
      /ARTICLE_RESEARCH_OAUTH_DATABASE_IDENTITY_INVALID/,
    );

    const intruderUrl = new URL(adminUrl);
    intruderUrl.username = "article_research_intruder";
    intruderUrl.password = "disposable-intruder";
    const intruder = new Client({ connectionString: intruderUrl.toString() });
    await intruder.connect();
    try {
      await assert.rejects(
        intruder.query("select * from article_research.commit_import_evidence_v001('{}'::jsonb)"),
        /permission denied for function commit_import_evidence_v001/,
      );
    } finally { await intruder.end(); }

    const workerUrl = new URL(adminUrl);
    workerUrl.username = "article_research_worker";
    workerUrl.password = workerPassword;
    const worker = new Client({ connectionString: workerUrl.toString() });
    await worker.connect();
    try {
      const prepared = await worker.query("select * from article_research.prepare_import_evidence_v001(array['acme'])");
      assert.equal(prepared.rowCount, 1);
      assert.equal(Array.isArray(prepared.rows[0]?.candidates), true);
      assert.equal(Array.isArray(prepared.rows[0]?.legacy_leads), true);

      const clock = await worker.query("select current_timestamp as now");
      const payload = commitPayload(Date.parse(String(clock.rows[0]?.now)));
      await assert.rejects(
        worker.query("select * from article_research.commit_import_evidence_v001($1::jsonb)", [payload]),
        /RESEARCH_REGISTRY_SERIALIZABLE_REQUIRED/,
      );
      const firstResult = await commitSerializable(worker, payload);
      assert.deepEqual(firstResult.rows.map((row) => row.replayed), [false]);

      const replay = await commitSerializable(worker, payload);
      assert.deepEqual(replay.rows, [{ binding_id: firstResult.rows[0]?.binding_id, replayed: true }]);

      const beforeMismatch = await worker.query("select count(*)::int as count from article_research.import_evidence_bindings");
      await assert.rejects(
        commitSerializable(worker, { ...payload, sourceFingerprint: "9".repeat(64) }),
        /RESEARCH_REGISTRY_REPLAY_MISMATCH/,
      );
      const afterMismatch = await worker.query("select count(*)::int as count from article_research.import_evidence_bindings");
      assert.deepEqual(afterMismatch.rows, beforeMismatch.rows);

      const stored = await worker.query(
        "select count(*)::int as links from article_research.import_evidence_links where binding_id = $1::uuid",
        [firstResult.rows[0]?.binding_id],
      );
      assert.deepEqual(stored.rows, [{ links: 1 }]);

      const afterWriteback = await worker.query("select * from article_research.prepare_import_evidence_v001(array['acme'])");
      const matching = afterWriteback.rows[0]!.candidates.filter(
        (candidate: Record<string, unknown>) => candidate.claim_sha256 === payload.evidenceClaims[0]!.claimSha256,
      );
      assert.equal(matching.length, 1);
      const row = matching[0];
      const reused = {
        ...payload, importId: `article-${randomUUID()}`, sourceFingerprint: "7".repeat(64),
        idempotencyKey: "8".repeat(64), planFingerprint: "9".repeat(64), decisionSha256: "a".repeat(64),
        writebackPath: null, writebackSha256: null, writebackCreatedAt: null, acquiredSourceIds: [],
        candidates: [{ claimId: row.claim_id, snapshotId: row.snapshot_id, productContext: row.product_context,
          canonicalUrl: row.canonical_url, evidenceSha256: row.evidence_sha256,
          claimUpdatedAt: row.claim_updated_at, evidenceUpdatedAt: row.evidence_updated_at, expiresAt: row.expires_at }],
        decisions: [{ claimId: "price", claimText: payload.evidenceClaims[0]!.text, material: true,
          productContext: row.product_context, action: "reused_current",
          registryMatches: [{ claimId: row.claim_id, snapshotId: row.snapshot_id, productContext: row.product_context }] }],
        writebackSources: [], writebackClaims: [],
      };
      const reusedResult = await commitSerializable(worker, reused);
      assert.deepEqual(reusedResult.rows.map((item) => item.replayed), [false]);
      await exerciseMcpAdapterRoundTrip(worker);
    } finally { await worker.end(); }
  } finally { await admin.end(); }
});
