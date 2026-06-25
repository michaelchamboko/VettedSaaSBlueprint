import assert from "node:assert/strict";
import test from "node:test";
import { canPublishPage, nextPageStatus } from "../src/lib/pages/workflow";

const blueprint = {
  affiliate_disclosure: { placement: "above_first_cta" },
  limitations: [{ limitation: "Limited", who_it_affects: "Everyone", mitigation: "Review terms" }],
  quality_scores: { evidence_score: 80, compliance_score: 85 },
} as any;

test("page publish gate requires approval and destination review", () => {
  const gate = canPublishPage(blueprint, { hasCurrentDestinationReview: true, ownerOverride: false, affiliateLinkActive: true, complianceProfileComplete: true, programRulesReviewed: true, highRiskClaimsApproved: true, approved: false });
  assert.equal(gate.publishable, false);
});

test("page publish gate allows approved reviewed drafts", () => {
  const gate = canPublishPage(blueprint, { hasCurrentDestinationReview: true, ownerOverride: false, affiliateLinkActive: true, complianceProfileComplete: true, programRulesReviewed: true, highRiskClaimsApproved: true, approved: true });
  assert.equal(gate.publishable, true);
});

test("page workflow status helper maps actions", () => {
  assert.equal(nextPageStatus("approve"), "approved");
  assert.equal(nextPageStatus("publish"), "published");
});
