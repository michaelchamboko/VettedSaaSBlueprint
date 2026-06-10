import { z } from "zod";

export const productSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  website_url: z.string().url().optional().nullable(),
  partnerstack_id: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  primary_audience: z.string().optional().nullable(),
  pricing_summary: z.string().optional().nullable(),
  commission_summary: z.string().optional().nullable(),
  target_countries: z.array(z.string()).default([]),
  competitor_products: z.array(z.string()).default([]),
  seed_keywords: z.array(z.string()).default([]),
  status: z.enum(["draft", "active", "researching", "paused", "archived"]).default("draft"),
  research_priority: z.number().int().min(0).max(100).default(50),
  auto_low_risk_updates_enabled: z.boolean().default(false),
});

export const affiliateLinkSchema = z.object({
  id: z.string().uuid().optional(),
  product_id: z.string().uuid(),
  partnerstack_url: z.string().url().refine((url) => url.includes("partnerstack") || url.includes("psref"), "Store the original PartnerStack referral URL."),
  destination_url: z.string().url().optional().nullable(),
  link_type: z.string().min(1),
  geo_target: z.string().optional().nullable(),
  page_angle: z.string().optional().nullable(),
  utm_source: z.string().optional().nullable(),
  utm_medium: z.string().optional().nullable(),
  utm_campaign: z.string().optional().nullable(),
  subid_template: z.string().optional().nullable(),
  status: z.enum(["draft", "active", "disabled", "manual_review"]).default("draft"),
});

export const pageBlueprintSchema = z.object({
  metadata: z.object({
    product_id: z.string().uuid(),
    page_type: z.literal("direct_review"),
    target_keyword: z.string().min(1),
    search_intent: z.string().min(1),
    geo_target: z.string().optional().nullable(),
    category_slug: z.string().min(1),
    url_slug: z.string().min(1),
    title_tag: z.string().min(1),
    meta_description: z.string().min(1),
    canonical_url: z.string().url().optional().nullable(),
    robots: z.string().default("index,follow"),
  }),
  affiliate_disclosure: z.object({
    short_disclosure: z.string().min(1),
    full_disclosure: z.string().min(1),
    placement: z.literal("above_first_cta"),
  }),
  hero: z.object({
    headline: z.string().min(1),
    subheadline: z.string().min(1),
    primary_cta_label: z.string().min(1),
    primary_cta_link_id: z.string().uuid(),
    risk_reversal: z.string().optional().nullable(),
    social_proof_summary: z.string().optional().nullable(),
  }),
  problem_solution: z.object({ problem: z.string(), agitation: z.string(), solution: z.string() }),
  benefits: z.array(z.object({ benefit_title: z.string(), benefit_description: z.string(), feature_supporting_it: z.string(), source_reference_ids: z.array(z.string().uuid()) })).min(1),
  proof_blocks: z.array(z.object({ proof_type: z.string(), summary: z.string(), source_reference_id: z.string().uuid(), evidence_claim_id: z.string().uuid().optional().nullable(), confidence_score: z.number().min(0).max(1) })).default([]),
  how_it_works: z.array(z.object({ step_number: z.number().int(), title: z.string(), description: z.string() })).default([]),
  limitations: z.array(z.object({ limitation: z.string(), who_it_affects: z.string(), mitigation: z.string(), evidence_claim_id: z.string().uuid().optional().nullable() })).min(1),
  objection_handling: z.array(z.object({ objection: z.string(), response: z.string(), source_reference_ids: z.array(z.string().uuid()) })).default([]),
  cta_blocks: z.array(z.object({ placement: z.string(), label: z.string(), supporting_text: z.string(), affiliate_link_id: z.string().uuid() })).min(1),
  faq: z.array(z.object({ question: z.string(), answer: z.string(), source_reference_ids: z.array(z.string().uuid()) })).default([]),
  schema_markup: z.object({ faq_schema: z.record(z.any()), breadcrumb_schema: z.record(z.any()) }),
  quality_scores: z.object({ evidence_score: z.number(), originality_score: z.number(), conversion_score: z.number(), compliance_score: z.number(), readability_score: z.number(), seo_safety_score: z.number(), overall_score: z.number() }),
});

export type ProductInput = z.infer<typeof productSchema>;
export type AffiliateLinkInput = z.infer<typeof affiliateLinkSchema>;
export type PageBlueprint = z.infer<typeof pageBlueprintSchema>;
