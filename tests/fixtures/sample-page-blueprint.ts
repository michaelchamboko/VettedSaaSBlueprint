import { pageBlueprintSchema } from "../../src/lib/schemas/contracts";

export const samplePageBlueprint = pageBlueprintSchema.parse({
  metadata: {
    product_id: "550e8400-e29b-41d4-a716-446655440000",
    page_type: "direct_review",
    target_keyword: "productivity workflow tool",
    search_intent: "commercial",
    category_slug: "workflow-tools",
    url_slug: "workflow-tools-review",
    title_tag: "Workflow Tools Review",
    meta_description: "A practical workflow-tools review for careful buyers.",
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
  problem_solution: {
    problem: "Too many disconnected tools",
    agitation: "Work gets scattered across systems.",
    solution: "Evaluate one practical workflow before committing.",
  },
  benefits: [{
    benefit_title: "A clearer workflow",
    benefit_description: "Keeps the evaluation focused on fit.",
    feature_supporting_it: "Structured workflow",
    source_reference_ids: [],
  }],
  limitations: [{
    limitation: "Limited trial information",
    who_it_affects: "New buyers",
    mitigation: "Confirm the current vendor terms first.",
  }],
  cta_blocks: [{
    placement: "hero",
    label: "Check the offer",
    supporting_text: "View the approved destination.",
    affiliate_link_id: "550e8400-e29b-41d4-a716-446655440001",
  }],
  schema_markup: { faq_schema: {}, breadcrumb_schema: {} },
  quality_scores: {
    evidence_score: 80,
    originality_score: 80,
    conversion_score: 80,
    compliance_score: 85,
    readability_score: 80,
    seo_safety_score: 80,
    overall_score: 82,
  },
});
