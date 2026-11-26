import assert from "node:assert/strict";
import test from "node:test";

import {
  assertLongFormAffiliateAssessment,
  assertLongFormAffiliateReview,
  longFormAffiliateAssessmentSchema,
  longFormAffiliateReviewSchema,
} from "../src/lib/article-import/long-form-affiliate";

const destination = "https://affiliate.example.test/approved";
const artifact = {
  hero: { headline: "Fit passage for this buyer", subheadline: "Reason passage with evidence" },
  limitations: [{ limitation: "Alternative passage for constrained buyers" }],
  cta_blocks: [{ supporting_text: "Next-step passage at the approved destination" }],
};
const visiblePaths = ["hero.headline", "hero.subheadline", "limitations.0.limitation", "cta_blocks.0.supporting_text"];
const cite = (artifactPath: string, quote: string) => ({ artifactPath, quote, explanation: "This passage answers the decision question directly." });

test("eligible assessment binds the five-field brief, count, artifact and approved destination", () => {
  const assessment = longFormAffiliateAssessmentSchema.parse({
    artifactFingerprint: "a".repeat(64), wordCount: 2050, approvedAffiliateUrl: destination,
    brief: { reader: "A specific buyer", purchaseDecision: "Whether the product fits", strongestEvidencedAdvantage: "A supported advantage", disqualifyingCondition: "A meaningful constraint", affiliateNextStep: "Verify fit at the approved destination" },
    lengthStatus: "pass",
    draftingFeedback: "The complete draft is inside the approved range.",
  });
  assert.doesNotThrow(() => assertLongFormAffiliateAssessment(assessment, {
    artifactFingerprint: "a".repeat(64), wordCount: 2050, approvedAffiliateUrl: destination,
  }));
  assert.throws(() => assertLongFormAffiliateAssessment({ ...assessment, wordCount: 1799 }, {
    artifactFingerprint: "a".repeat(64), wordCount: 2050, approvedAffiliateUrl: destination,
  }), /LONG_FORM_AFFILIATE_COUNT_MISMATCH/);
  assert.doesNotThrow(() => assertLongFormAffiliateAssessment({ ...assessment, wordCount: 1799, lengthStatus: "needs-expansion", draftingFeedback: "Add a buyer question supported by retained evidence." }, {
    artifactFingerprint: "a".repeat(64), wordCount: 1799, approvedAffiliateUrl: destination,
  }));
});

test("independent review cites visible passages and rejects stale fingerprints, misleading destinations and unresolved findings", () => {
  const review = longFormAffiliateReviewSchema.parse({
    artifactFingerprint: "b".repeat(64), wordCount: 2050, approvedAffiliateUrl: destination,
    passages: {
      fit: cite("hero.headline", artifact.hero.headline),
      rationale: cite("hero.subheadline", artifact.hero.subheadline),
      alternative: cite("limitations.0.limitation", artifact.limitations[0].limitation),
      nextStep: cite("cta_blocks.0.supporting_text", artifact.cta_blocks[0].supporting_text),
    },
    checks: { padding: "pass", unsupportedClaims: "pass", misleadingCta: "pass", unresolvedObjections: "pass" }, findings: [],
  });
  const expected = { artifactFingerprint: "b".repeat(64), wordCount: 2050, approvedAffiliateUrl: destination };
  assert.doesNotThrow(() => assertLongFormAffiliateReview(review, artifact, visiblePaths, expected));
  assert.throws(() => assertLongFormAffiliateReview({ ...review, approvedAffiliateUrl: "https://wrong.example.test" }, artifact, visiblePaths, expected), /LONG_FORM_AFFILIATE_DESTINATION_MISMATCH/);
  assert.throws(() => assertLongFormAffiliateReview({ ...review, findings: [{ category: "padding", description: "Filler remains.", artifactPath: "hero.headline", quote: artifact.hero.headline, disposition: "unresolved" }] }, artifact, visiblePaths, expected), /LONG_FORM_AFFILIATE_UNRESOLVED_FINDING/);
  assert.throws(() => assertLongFormAffiliateReview({ ...review, checks: { ...review.checks, unsupportedClaims: "fail" } }, artifact, visiblePaths, expected), /LONG_FORM_AFFILIATE_REVIEW_FAILED/);
  assert.throws(() => assertLongFormAffiliateReview({ ...review, checks: { ...review.checks, misleadingCta: "insufficient-evidence" } }, artifact, visiblePaths, expected), /LONG_FORM_AFFILIATE_REVIEW_FAILED/);
});
