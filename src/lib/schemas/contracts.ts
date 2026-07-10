import { z } from "zod";

function isApprovedAffiliateUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    const approvedExactHosts = new Set([
      "aff.flowith.io",
      "get.cloudtalk.io",
      "grow.amplemarket.com",
      "join.rankprompt.com",
      "partners.browse.ai",
      "try.elevenlabs.io",
      "try.landingi.com",
      "try.leadpages.com",
      "trymoo.moosend.com",
    ]);
    return (
      host === "partnerstack.com" || host.endsWith(".partnerstack.com") ||
      host === "psref.com" || host.endsWith(".psref.com") ||
      approvedExactHosts.has(host)
    );
  } catch {
    return false;
  }
}

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
  partnerstack_url: z.string().url().refine(
    (url) => isApprovedAffiliateUrl(url),
    "Store the original approved referral URL from an allowlisted affiliate domain.",
  ),
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

export const offerFolderSchema = z.object({
  id: z.string().uuid().optional(),
  product_id: z.string().uuid(),
  affiliate_link_id: z.string().uuid(),
  name: z.string().min(1),
  status: z.enum(["active", "paused", "archived"]).default("active"),
});

export const partnerstackProgramResourceSchema = z.object({
  id: z.string().uuid().optional(),
  offer_folder_id: z.string().uuid(),
  resource_type: z.enum(["pdf", "image", "link", "video", "note"]),
  title: z.string().min(1),
  source_url: z.string().url().optional().nullable(),
  storage_url: z.string().url().optional().nullable(),
  notes: z.string().optional().nullable(),
  analysis_status: z.enum(["pending", "analyzing", "draft", "approved", "rejected"]).default("pending"),
  owner_review_status: z.enum(["pending", "approved", "rejected"]).default("pending"),
});

export const offerPurchaseDestinationReviewSchema = z.object({
  id: z.string().uuid().optional(),
  offer_folder_id: z.string().uuid(),
  affiliate_link_id: z.string().uuid(),
  affiliate_url_checked: z.string().url(),
  final_visible_destination_url: z.string().url().optional().nullable(),
  redirect_chain: z.array(z.string()).default([]),
  message_match_notes: z.string().optional().nullable(),
  cta_language: z.string().optional().nullable(),
  offer_promise: z.string().optional().nullable(),
  pricing_trial_guarantee_claims: z.string().optional().nullable(),
  trust_cues: z.string().optional().nullable(),
  friction_notes: z.string().optional().nullable(),
  visual_affinity_profile: z.string().optional().nullable(),
  compliance_warnings: z.string().optional().nullable(),
  conversion_continuity_score: z.number().min(0).max(100).default(0),
  reviewed_by_owner: z.boolean().default(false),
  owner_override: z.boolean().default(false),
});

export const researchSourceSchema = z.object({
  id: z.string().uuid().optional(),
  product_id: z.string().uuid().optional().nullable(),
  source_type: z.string().min(1),
  source_url: z.string().url(),
  source_title: z.string().optional().nullable(),
  source_hash: z.string().optional().nullable(),
  usage_allowed: z.boolean().default(false),
  robots_policy: z.string().optional().nullable(),
  summary: z.string().optional().nullable(),
  confidence_score: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const evidenceClaimSchema = z.object({
  id: z.string().uuid().optional(),
  product_id: z.string().uuid().optional().nullable(),
  page_id: z.string().uuid().optional().nullable(),
  source_id: z.string().uuid().optional().nullable(),
  claim_text: z.string().min(1),
  claim_type: z.string().min(1),
  risk_level: z.string().min(1),
  extracted_quote: z.string().optional().nullable(),
  source_summary: z.string().optional().nullable(),
  confidence_score: z.number().min(0).max(1),
  usage_allowed: z.boolean().default(false),
});

const generatedVisualAssetSchema = z.object({
  asset_type: z.literal("codex_generated_image"),
  asset_url: z.string().min(1).regex(/^\/[A-Za-z0-9/_\-.]+$/, "Use a versioned local public asset path."),
  alt_text: z.string().min(1),
  prompt_summary: z.string().min(1),
  generation_tool: z.literal("codex_image_generation"),
  approval_status: z.enum(["draft", "approved", "rejected"]).default("draft"),
  approved_by_owner: z.boolean().default(false),
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
    motion_profile: z.enum(["static", "gsap_editorial"]).default("static"),
    design_profile: z.enum(["legacy", "editorial_v2"]).default("legacy"),
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
    answer_snippet: z.string().min(1).optional().nullable(),
    visual_asset: generatedVisualAssetSchema.optional().nullable(),
  }),
  problem_solution: z.object({ problem: z.string(), agitation: z.string(), solution: z.string() }),
  benefits: z.array(z.object({
    benefit_title: z.string(),
    benefit_description: z.string(),
    feature_supporting_it: z.string(),
    source_reference_ids: z.array(z.string().uuid()),
    visual_asset: generatedVisualAssetSchema.optional().nullable(),
  })).min(1),
  proof_blocks: z.array(z.object({ proof_type: z.string(), summary: z.string(), source_reference_id: z.string().uuid(), evidence_claim_id: z.string().uuid().optional().nullable(), confidence_score: z.number().min(0).max(1) })).default([]),
  how_it_works: z.array(z.object({ step_number: z.number().int(), title: z.string(), description: z.string() })).default([]),
  limitations: z.array(z.object({ limitation: z.string(), who_it_affects: z.string(), mitigation: z.string(), evidence_claim_id: z.string().uuid().optional().nullable() })).min(1),
  objection_handling: z.array(z.object({ objection: z.string(), response: z.string(), source_reference_ids: z.array(z.string().uuid()) })).default([]),
  cta_blocks: z.array(z.object({ placement: z.string(), label: z.string(), supporting_text: z.string(), affiliate_link_id: z.string().uuid() })).min(1),
  faq: z.array(z.object({ question: z.string(), answer: z.string(), source_reference_ids: z.array(z.string().uuid()) })).default([]),
  schema_markup: z.object({
    faq_schema: z.record(z.string(), z.any()),
    breadcrumb_schema: z.record(z.string(), z.any()),
  }),
  quality_scores: z.object({ evidence_score: z.number(), originality_score: z.number(), conversion_score: z.number(), compliance_score: z.number(), readability_score: z.number(), seo_safety_score: z.number(), overall_score: z.number() }),
});

export type ProductInput = z.infer<typeof productSchema>;
export type AffiliateLinkInput = z.infer<typeof affiliateLinkSchema>;
export type OfferFolderInput = z.infer<typeof offerFolderSchema>;
export type PartnerstackProgramResourceInput = z.infer<typeof partnerstackProgramResourceSchema>;
export type OfferPurchaseDestinationReviewInput = z.infer<typeof offerPurchaseDestinationReviewSchema>;
export type ResearchSourceInput = z.infer<typeof researchSourceSchema>;
export type EvidenceClaimInput = z.infer<typeof evidenceClaimSchema>;
export type PageBlueprint = z.infer<typeof pageBlueprintSchema>;
