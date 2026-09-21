import assert from "node:assert/strict";
import test from "node:test";

import {
  VISIBILITY_PAGE_PATHS,
  type VisibilityPublicationSummary,
  assertNoAffiliateUrl,
  visibilityEvidencePackSchema,
  visibilityPageSchema,
} from "@/lib/visibility-pages/contracts";
import { calculateEmailMarketingCost } from "@/lib/visibility-pages/calculator";
import { visibilityFreshness } from "@/lib/visibility-pages/runtime-expiry";
import { indexableVisibilitySummaries } from "@/lib/visibility-pages/link-graph";

test("the visibility catalogue has the approved ten canonical paths", () => {
  assert.equal(VISIBILITY_PAGE_PATHS.length, 10);
  assert.deepEqual(new Set(VISIBILITY_PAGE_PATHS).size, 10);
  assert.ok(VISIBILITY_PAGE_PATHS.every((path) => !path.endsWith("/")));
});

test("calculator clamps unsafe inputs and defines zero denominators", () => {
  const result = calculateEmailMarketingCost({
    monthlyFee: -1,
    setupFee: Number.NaN,
    monthlyContacts: 0,
    monthlySends: 0,
    monthlyOverage: Number.POSITIVE_INFINITY,
  });
  assert.deepEqual(result, { annualTotal: 0, monthlyAverage: 0, costPerContact: null, costPerThousandSends: null });
});

test("expiry fails closed at the exact timestamp", () => {
  const summary = { earliestExpiresAt: "2026-08-08T12:00:00.000Z" };
  assert.equal(visibilityFreshness(summary, new Date("2026-08-08T11:59:59.999Z")), "fresh");
  assert.equal(visibilityFreshness(summary, new Date("2026-08-08T12:00:00.000Z")), "under_review");
});

test("discovery omits a page at its expiry boundary", () => {
  const summaries: VisibilityPublicationSummary[] = [{
    id: "guide",
    path: "/guides/how-to-evaluate-ai-voice-quality" as const,
    kind: "guide" as const,
    title: "Guide",
    description: "Description",
    modifiedAt: "2026-08-08T00:00:00.000Z",
    earliestExpiresAt: "2026-08-08T12:00:00.000Z",
    relevantReviewPath: "/landing-page-builders/elevenlabs-ai-voice-generator",
    relatedPaths: ["/ai-voice-generators"],
  }];
  assert.equal(indexableVisibilitySummaries(summaries, new Date("2026-08-08T12:00:00.000Z")).length, 0);
});

test("visibility content rejects raw markup and affiliate destinations", () => {
  assert.throws(() => assertNoAffiliateUrl("https://example.com/affiliate-redirect"));
  assert.ok(!visibilityPageSchema.safeParse({
    schema_version: "VisibilityPageV1",
    id: "safe-page",
    path: "/ai-voice-generators",
    kind: "category_hub",
    cluster_id: "ai_voice",
    title: "Safe title",
    description: "Safe description",
    modified_at: "2026-08-08T00:00:00.000Z",
    hero: { eyebrow: "Guide", headline: "<unsafe>", summary: "Summary" },
    claim_ids: [],
    relevant_review_path: "/landing-page-builders/elevenlabs-ai-voice-generator",
    related_paths: ["/guides/how-to-evaluate-ai-voice-quality"],
    blocks: [{ type: "prose", paragraphs: ["Safe text"] }],
  }).success);
  assert.ok(!visibilityEvidencePackSchema.safeParse({
    schema_version: "VisibilityEvidencePackV1",
    page_id: "safe-page",
    sources: [{ id: "source", url: "https://example.com", source_hash: "0".repeat(64), retrieved_at: "2026-08-08T00:00:00.000Z", review_by: "2026-08-09T00:00:00.000Z", usage_allowed: true }],
    claims: [{ id: "claim", source_id: "source", allowed_wording: "Allowed", risk_level: "low", expires_at: "2020-01-01T00:00:00.000Z" }],
  }).success);
});
