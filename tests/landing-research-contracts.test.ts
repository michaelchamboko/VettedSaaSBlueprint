import assert from "node:assert/strict";
import test from "node:test";

import {
  hermesExecutorResponseSchema,
  researchSourceSnapshotBundleSchema,
} from "@/lib/landing-research/contracts";

const base = {
  schema_version: "HermesResearchContractV1" as const,
  capability: "hermes_research" as const,
  job_id: "00000000-0000-4000-8000-000000000001",
  stage_attempt_id: "00000000-0000-4000-8000-000000000002",
  exact_url: "https://try.example.com/affiliate?ref=exact",
  url_fingerprint: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  input_digest: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  completed_at: "2026-08-01T00:00:00.000Z",
};

test("research response requires both evidence and snapshot bundle", () => {
  const parsed = hermesExecutorResponseSchema.safeParse(base);
  assert.equal(parsed.success, false);
});

test("snapshot bundle rejects aggregate byte mismatches", () => {
  const snapshot = {
    snapshot_id: "00000000-0000-4000-8000-000000000003",
    url: "https://example.com/source",
    final_url: "https://example.com/source",
    redirect_chain: [],
    status_code: 200,
    retrieved_at: "2026-08-01T00:00:00.000Z",
    expires_at: "2026-08-02T00:00:00.000Z",
    content_type: "text/plain" as const,
    content_sha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    normalized_text: "evidence",
    excerpt_sha256: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    trust_tier: "first_party" as const,
  };
  assert.equal(researchSourceSnapshotBundleSchema.safeParse({ schema_version: "ResearchSourceSnapshotBundleV1", snapshots: [snapshot], aggregate_bytes: 1 }).success, false);
  assert.equal(researchSourceSnapshotBundleSchema.safeParse({ schema_version: "ResearchSourceSnapshotBundleV1", snapshots: [snapshot], aggregate_bytes: 8 }).success, true);
});
