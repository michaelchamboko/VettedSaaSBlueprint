import assert from "node:assert/strict";
import test from "node:test";
import { evaluatePagePublishability } from "../src/lib/pages/publication";

const safeBlueprint = {
  metadata: {
    product_id: "550e8400-e29b-41d4-a716-446655440000",
    page_type: "direct_review",
    target_keyword: "best workflow tool",
    search_intent: "commercial",
    category_slug: "workflow-tools",
    url_slug: "workflow-tools",
    title_tag: "Workflow Tool Review",
    meta_description: "A practical review.",
  },
  affiliate_disclosure: {
    short_disclosure: "We may earn a commission.",
    full_disclosure: "We may earn a commission when you click through our links.",
    placement: "above_first_cta",
  },
  hero: {
    headline: "A better workflow tool for busy teams",
    subheadline: "Built for practical evaluation.",
    primary_cta_label: "Check the offer",
    primary_cta_link_id: "550e8400-e29b-41d4-a716-446655440001",
  },
  problem_solution: { problem: "Too many tools", agitation: "Work is scattered", solution: "One place to manage it." },
  benefits: [{ benefit_title: "Benefit", benefit_description: "Works well", feature_supporting_it: "Core feature", source_reference_ids: [] }],
  limitations: [{ limitation: "Limited trial", who_it_affects: "New users", mitigation: "Try the demo first" }],
  cta_blocks: [{ placement: "hero", label: "Check the offer", supporting_text: "View the destination", affiliate_link_id: "550e8400-e29b-41d4-a716-446655440001" }],
  schema_markup: { faq_schema: {}, breadcrumb_schema: {} },
  quality_scores: { evidence_score: 80, originality_score: 80, conversion_score: 80, compliance_score: 85, readability_score: 80, seo_safety_score: 80, overall_score: 82 },
} as any;

test("publication is blocked without active link or destination review", () => {
  const result = evaluatePagePublishability(safeBlueprint, {
    hasCurrentDestinationReview: false,
    ownerOverride: false,
    affiliateLinkActive: false,
    complianceProfileComplete: true,
    programRulesReviewed: true,
    highRiskClaimsApproved: true,
  });
  assert.equal(result.publishable, false);
});

test("publication can proceed when active link, review, and compliance are present", () => {
  const result = evaluatePagePublishability(safeBlueprint, {
    hasCurrentDestinationReview: true,
    ownerOverride: false,
    affiliateLinkActive: true,
    complianceProfileComplete: true,
    programRulesReviewed: true,
    highRiskClaimsApproved: true,
  });
  assert.equal(result.publishable, true);
});
