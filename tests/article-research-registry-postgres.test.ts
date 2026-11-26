import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { closePool, executeQuery } from "../src/lib/db";
import { sha256 } from "../src/lib/article-import/execution-evidence";
import { createResearchRegistryPlan, type ResearchRegistryCommitInput } from "../src/lib/article-import/research-registry";
import { NeonArticleResearchRegistry } from "../src/lib/article-import/research-registry-neon";

const enabled = process.env.ARTICLE_RESEARCH_INTEGRATION === "1";

export function assertIsolatedResearchDatabaseUrl(value: string | undefined): string {
  if (!value) throw new Error("DATABASE_URL is required.");
  const url = new URL(value);
  if (!["127.0.0.1", "localhost"].includes(url.hostname) || url.pathname !== "/article_research_test") {
    throw new Error("Refusing research-registry integration test outside loopback article_research_test.");
  }
  return value;
}

test("isolated PostgreSQL registry reuses across articles and rejects stale replay", { skip: !enabled }, async () => {
  assertIsolatedResearchDatabaseUrl(process.env.DATABASE_URL);
  const migration = await readFile(path.join(process.cwd(), "db/article-research-import-bindings-v001.sql"), "utf8");
  try {
    await executeQuery(migration);
    const database = await executeQuery("select current_database() as name");
    assert.equal(database.rows[0]?.name, "article_research_test");

    const runId = randomUUID();
    const claimText = `Acme ${runId} standard costs USD 20 each month.`;
    const sourceUrl = `https://example.test/pricing/${runId}`;
    const bytes = Buffer.from(`${claimText}\n`);
    const evidenceSha256 = sha256(bytes);
    const firstImport = `article-${randomUUID()}`;
    const firstPlan = createResearchRegistryPlan({ importId: firstImport, sourceFingerprint: "1".repeat(64), generatedAt: "2026-11-26T00:00:00.000Z", candidates: [], legacyLeads: [] });
    const firstDecision = {
      schemaVersion: "ResearchRegistryDecisionV1" as const, importId: firstImport, sourceFingerprint: "1".repeat(64), planFingerprint: firstPlan.planFingerprint,
      createdAt: "2026-11-26T00:00:00.000Z", claims: [{ claimId: "price", claimText, material: true, productContext: `Acme ${runId} standard plan`, action: "researched_gap" as const, gapReason: "missing" as const, registryMatches: [], rationale: "No canonical evidence exists." }],
    };
    const decisionSha256 = sha256(JSON.stringify(firstDecision));
    const research = {
      evidenceRef: { path: "synthetic/research.json", sha256: "2".repeat(64) }, evidencePath: "synthetic/research.json", evidenceSha256: "2".repeat(64),
      evidence: { createdAt: "2026-11-26T00:00:00.000Z", sources: [{ id: "pricing", url: sourceUrl, retrievedAt: "2026-11-26T00:00:00.000Z", snapshotRef: { path: "synthetic/snapshot.txt", sha256: evidenceSha256 } }], claims: [{ id: "price", text: claimText, sourceIds: ["pricing"], excerptLocations: [{ sourceId: "pricing", quote: claimText }] }] },
      snapshotBytes: new Map([["pricing", bytes]]),
    };
    const first: ResearchRegistryCommitInput = {
      importId: firstImport, sourceFingerprint: "1".repeat(64), idempotencyKey: "3".repeat(64), plan: firstPlan, decision: firstDecision,
      decisionPath: "synthetic/decision.json", decisionSha256, writebackPath: "synthetic/writeback.json", writebackSha256: "4".repeat(64), research,
      writeback: { schemaVersion: "ResearchRegistryWritebackV1", importId: firstImport, sourceFingerprint: "1".repeat(64), decisionSha256, createdAt: "2026-11-26T00:00:00.000Z", sources: [{ sourceId: "pricing", sourceType: "official_pricing", accessOutcome: "success", locator: "pricing line" }], claims: [{ plannedClaimId: "price", evidenceClaimId: "price", disposition: "confirmed", claimKind: "factual", verdict: "SUPPORTED", confidence: 0.95, reasoning: "The retained line states the price.", expiresAt: "2026-12-26T00:00:00.000Z" }] },
    };
    const registry = new NeonArticleResearchRegistry();
    assert.equal((await registry.commit(first)).replayed, false);
    assert.equal((await new NeonArticleResearchRegistry().commit(first)).replayed, true);

    const secondImport = `article-${randomUUID()}`;
    const secondPlan = await registry.prepare({ importId: secondImport, sourceFingerprint: "5".repeat(64), sourceText: `A different guide title. Teams compare billing, exports, and setup. ${claimText} Unrelated notes follow.`, now: new Date().toISOString() });
    const scopedCandidates = secondPlan.candidates.filter((candidate) => candidate.claimSha256 === sha256(claimText) && candidate.evidenceSha256 === evidenceSha256 && candidate.productContext === `Acme ${runId} standard plan`);
    assert.equal(scopedCandidates.length, 1);

    const reused = scopedCandidates[0];
    const secondDecision = { schemaVersion: "ResearchRegistryDecisionV1" as const, importId: secondImport, sourceFingerprint: "5".repeat(64), planFingerprint: secondPlan.planFingerprint, createdAt: new Date().toISOString(), claims: [{ claimId: "price", claimText: reused.claimText, material: true, productContext: reused.productContext, action: "reused_current" as const, registryMatches: [{ claimId: reused.claimId, snapshotId: reused.snapshotId, productContext: reused.productContext }], rationale: "The exact current registry tuple and bytes cover the claim." }] };
    const second: ResearchRegistryCommitInput = { importId: secondImport, sourceFingerprint: "5".repeat(64), idempotencyKey: "6".repeat(64), plan: secondPlan, decision: secondDecision, decisionPath: "synthetic/decision-2.json", decisionSha256: sha256(JSON.stringify(secondDecision)), research: { ...research, evidenceRef: { path: "synthetic/research-2.json", sha256: "7".repeat(64) }, evidencePath: "synthetic/research-2.json", evidenceSha256: "7".repeat(64) } };

    const unverifiableSource = await executeQuery("insert into article_research.sources (canonical_url, source_type, last_checked_at) values ($1, 'official_pricing', current_timestamp) returning id", [`${sourceUrl}/unverifiable`]);
    const unverifiableSnapshot = await executeQuery("insert into article_research.source_snapshots (source_id, evidence_sha256, retrieved_at, access_outcome, passage, locator) values ($1::uuid, $2, current_timestamp, 'success', null, 'legacy row without retained bytes') returning id", [unverifiableSource.rows[0]?.id, sha256("unverifiable contradiction")]);
    await executeQuery("insert into article_research.claim_evidence (claim_id, snapshot_id, verdict, confidence, product_context, reasoning, expires_at) values ($1::uuid, $2::uuid, 'CONTRADICTED', 0.9, $3, 'A contradiction without retained bytes cannot be validated.', current_timestamp + interval '30 days')", [reused.claimId, unverifiableSnapshot.rows[0]?.id, reused.productContext]);

    assert.equal((await registry.commit(second)).replayed, false);
    const counts = await executeQuery("select (select count(*)::int from article_research.claims where claim_sha256 = $1) as claims, (select count(*)::int from article_research.source_snapshots where evidence_sha256 = $2) as snapshots, (select count(*)::int from article_research.import_evidence_bindings where import_id = any($3::text[])) as bindings", [sha256(claimText), evidenceSha256, [firstImport, secondImport]]);
    assert.deepEqual(counts.rows[0], { claims: 1, snapshots: 1, bindings: 2 });

    const changedBytesImport = `article-${randomUUID()}`;
    const changedBytesPlan = createResearchRegistryPlan({ importId: changedBytesImport, sourceFingerprint: "a".repeat(64), generatedAt: secondPlan.generatedAt, candidates: secondPlan.candidates, legacyLeads: secondPlan.legacyLeads });
    const changedBytesDecision = { ...secondDecision, importId: changedBytesImport, sourceFingerprint: "a".repeat(64), planFingerprint: changedBytesPlan.planFingerprint };
    const changedBytesInput: ResearchRegistryCommitInput = { ...second, importId: changedBytesImport, sourceFingerprint: "a".repeat(64), idempotencyKey: "b".repeat(64), plan: changedBytesPlan, decision: changedBytesDecision, decisionSha256: sha256(JSON.stringify(changedBytesDecision)) };
    await executeQuery("update article_research.source_snapshots set passage = $1 where id = $2::uuid", ["changed after lookup", reused.snapshotId]);
    await assert.rejects(registry.commit(changedBytesInput), /RESEARCH_REGISTRY_PLAN_STALE/);
    await executeQuery("update article_research.source_snapshots set passage = $1 where id = $2::uuid", [bytes.toString("utf8"), reused.snapshotId]);

    await executeQuery("update article_research.claim_evidence set expires_at = current_timestamp - interval '1 second' where claim_id = $1::uuid and snapshot_id = $2::uuid", [reused.claimId, reused.snapshotId]);
    const thirdImport = `article-${randomUUID()}`;
    const staleThird = { ...second, importId: thirdImport, idempotencyKey: "8".repeat(64), sourceFingerprint: "9".repeat(64), plan: { ...secondPlan, importId: thirdImport, sourceFingerprint: "9".repeat(64) }, decision: { ...secondDecision, importId: thirdImport, sourceFingerprint: "9".repeat(64) } };
    await assert.rejects(registry.commit(staleThird), /RESEARCH_REGISTRY_PLAN_STALE/);
  } finally {
    await closePool();
  }
});
