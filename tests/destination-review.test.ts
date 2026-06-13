import assert from "node:assert/strict";
import test from "node:test";
import { requireDestinationReviewForPublication } from "../src/lib/compliance/gate";
import { offerPurchaseDestinationReviewSchema } from "../src/lib/schemas/contracts";

test("destination review preserves the original affiliate URL", () => {
  const review = offerPurchaseDestinationReviewSchema.parse({
    offer_folder_id: "550e8400-e29b-41d4-a716-446655440000",
    affiliate_link_id: "550e8400-e29b-41d4-a716-446655440001",
    affiliate_url_checked: "https://partnerstack.com/redirect/example",
    redirect_chain: ["https://partnerstack.com/redirect/example", "https://example.com/final"],
  });
  assert.equal(review.affiliate_url_checked, "https://partnerstack.com/redirect/example");
});

test("publication is blocked without a current destination review or owner override", () => {
  const gate = requireDestinationReviewForPublication({ hasCurrentDestinationReview: false, ownerOverride: false });
  assert.equal(gate.publishable, false);
  assert.ok(gate.failures.length > 0);
});

test("owner override can bypass destination review requirement", () => {
  const gate = requireDestinationReviewForPublication({ hasCurrentDestinationReview: false, ownerOverride: true });
  assert.equal(gate.publishable, true);
});
