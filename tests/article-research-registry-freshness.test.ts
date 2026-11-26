import assert from "node:assert/strict";
import test from "node:test";

import type { ResearchRegistryCommitInput } from "../src/lib/article-import/research-registry";
import { ARTICLE_RESEARCH_MAX_FRESHNESS_MS, assertAcquisitionFreshness, isRepairableResearchRegistryCommitError } from "../src/lib/article-import/research-registry-neon";

const databaseNow = "2026-11-26T12:00:00.000Z";

function input(): ResearchRegistryCommitInput {
  const expiry = new Date(Date.parse(databaseNow) + ARTICLE_RESEARCH_MAX_FRESHNESS_MS).toISOString();
  return {
    decision: { claims: [{ action: "researched_gap" }] },
    research: { evidence: { createdAt: databaseNow, sources: [{ retrievedAt: databaseNow }] } },
    writeback: { createdAt: databaseNow, claims: [{ expiresAt: expiry }] },
  } as ResearchRegistryCommitInput;
}

test("acquisition freshness uses the database clock and the 90-day review backstop", () => {
  assert.doesNotThrow(() => assertAcquisitionFreshness(input(), databaseNow));

  for (const changed of [
    { ...input(), research: { ...input().research, evidence: { ...input().research.evidence, createdAt: "2026-11-26T12:00:00.001Z" } } },
    { ...input(), research: { ...input().research, evidence: { ...input().research.evidence, sources: [{ retrievedAt: "2026-11-26T12:00:00.001Z" }] } } },
    { ...input(), writeback: { ...input().writeback!, createdAt: "2026-11-26T12:00:00.001Z" } },
  ]) assert.throws(() => assertAcquisitionFreshness(changed as ResearchRegistryCommitInput, databaseNow), /RESEARCH_REGISTRY_ACQUISITION_TIME_INVALID/);

  for (const expiresAt of [databaseNow, new Date(Date.parse(databaseNow) + ARTICLE_RESEARCH_MAX_FRESHNESS_MS + 1).toISOString()]) {
    const changed = { ...input(), writeback: { ...input().writeback!, claims: [{ expiresAt }] } };
    assert.throws(() => assertAcquisitionFreshness(changed as ResearchRegistryCommitInput, databaseNow), /RESEARCH_REGISTRY_EXPIRY_INVALID/);
  }

  assert.equal(isRepairableResearchRegistryCommitError("RESEARCH_REGISTRY_ACQUISITION_TIME_INVALID"), true);
  assert.equal(isRepairableResearchRegistryCommitError("RESEARCH_REGISTRY_EXPIRY_INVALID"), true);
  assert.equal(isRepairableResearchRegistryCommitError("RESEARCH_REGISTRY_BINDING_WRITE_FAILED"), false);
});
