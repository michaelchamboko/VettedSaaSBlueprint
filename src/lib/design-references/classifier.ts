import type { ReferenceIngestionReference } from "./ingestion";
import type { ReferenceAuditFailureReason } from "./source-registry";

type Box = { x: number; y: number; width: number; height: number };
type HeadingEvidence = Box & { text: string; font_family: string; font_size: number; font_weight: number; text_align: string };
type SectionEvidence = {
  heading: string;
  text: string;
  y: number;
  columns: number;
  item_count: number;
  has_details: boolean;
  has_cta: boolean;
  text_align: string;
};

export type DesignReferenceViewportSnapshot = {
  width: number;
  height: number;
  title: string;
  description: string;
  resolved_url: string;
  response_status: number;
  document_width: number;
  body_font_family: string;
  body_font_size: number;
  heading: HeadingEvidence | null;
  media: Array<Box & { tag: string }>;
  ctas: Array<Box & { text: string }>;
  sections: SectionEvidence[];
  navigation: { height: number; line_count: number } | null;
  animations: Array<{ duration_ms: number; properties: string[] }>;
  visible_text_length: number;
};

export type DesignReferenceClassificationInput = {
  source: { id: string; ordinal: number; name: string; source_url: string };
  captured_at: string;
  desktop: DesignReferenceViewportSnapshot;
  mobile: DesignReferenceViewportSnapshot;
  reduced_motion: { animation_count: number; visible_text_length: number };
};

export type DesignReferenceClassificationResult =
  | { status: "active"; reference: ReferenceIngestionReference }
  | { status: "unavailable"; failure_reason: ReferenceAuditFailureReason; resolved_url: string | null; response_status: number | null };

const semanticSections = [
  ["faq", /\b(faq|frequently asked|questions?|common questions)\b/i],
  ["limitations", /\b(limitations?|trade[ -]?offs?|not for|drawbacks?|cons|caveats?|who (should|is).*(not|for))\b/i],
  ["objection_handling", /\b(security|integrations?|support|compare|comparison|why choose|privacy|enterprise)\b/i],
  ["how_it_works", /\b(how it works|workflow|process|steps?|getting started|get started in)\b/i],
  ["proof_blocks", /\b(customers?|results?|stories|reviews?|trusted by|case studies|testimonials?|ratings?)\b/i],
  ["benefits", /\b(features?|benefits?|capabilities|solutions?|what you get|everything you)\b/i],
  ["closing_cta", /\b(get started|start free|try|join|book|sign up|ready to|create (your|a) free)\b/i],
  ["problem_solution", /\b(problem|challenge|solution|without|instead of|better way|stop|eliminate)\b/i],
] as const;

function sectionFamily(section: SectionEvidence) {
  if (section.has_details) return "objection_accordion" as const;
  if (section.columns >= 4) return "decision_matrix" as const;
  if (section.columns >= 3 && section.item_count >= 3) return "numbered_ledger" as const;
  if (section.item_count >= 4) return "proof_strip" as const;
  if (section.columns === 2) return "split_editorial" as const;
  if (section.item_count >= 3) return "alternating_story" as const;
  if (section.text_align === "center") return "process_timeline" as const;
  return "alternating_story" as const;
}

function classifySections(sections: SectionEvidence[]) {
  const used = new Set<string>();
  return sections.flatMap((section) => {
    const combined = `${section.heading} ${section.text}`;
    const match = semanticSections.find(([key, pattern]) => !used.has(key) && pattern.test(combined));
    if (!match) return [];
    used.add(match[0]);
    const family = sectionFamily(section);
    return [{ key: match[0], family, composition_notes: `Observed heading “${section.heading}” at y=${Math.round(section.y)} with ${section.columns} column(s) and ${section.item_count} item(s).` }];
  });
}

type CategoryScore = { primary: string; tags: string[]; scores: Record<string, number>; evidence: string[] };

function categoryFrom(input: DesignReferenceClassificationInput): CategoryScore {
  const title = input.desktop.title.toLowerCase();
  const description = input.desktop.description.toLowerCase();
  const bodyText = input.desktop.sections.map((section) => `${section.heading} ${section.text}`).join(" ").toLowerCase();
  const sourceName = input.source.name.toLowerCase();
  const fullText = `${title} ${description} ${bodyText} ${sourceName}`;
  const sourceUrl = input.source.source_url.toLowerCase();

  const evidence: string[] = [];
  const scores: Record<string, number> = {};

  function score(category: string, pattern: RegExp, weight: number, note: string) {
    if (pattern.test(fullText)) {
      scores[category] = (scores[category] ?? 0) + weight;
      evidence.push(`${note} (weight ${weight})`);
    }
  }

  // High-specificity commerce/payments patterns
  score("commerce-payments", /\b(payment|checkout|merchant|pos |ecommerce|e-commerce|shopping cart|buy now|pay in|payment gateway|payment processing|stripe|shopify|square|shopify|paypal|braintree|adyen)\b/, 8, "Commerce/payment processing signal");
  score("commerce-payments", /\b(accept |process |online )?(payments|payment)\b/, 4, "Secondary payment signal");
  score("commerce-payments", /\b(store|shop|sell online|marketplace)\b/, 3, "Commerce storefront signal");

  // Finance/HR patterns
  score("finance-hr", /\b(bank(ing)?|payroll|hr |human resources|workforce|people ops|hiring|recruit|employee|expense|invoice|fintech)\b/, 6, "Finance/HR signal");

  // Developer-tools (requires stronger evidence)
  score("developer-tools", /\b(sdk|api(?! call)|developer platform|deploy|observability|monitoring|code |ide |framework|library|database|infrastructure as code)\b/, 6, "Developer-tools signal");
  score("developer-tools", /\b(developer|engineering team|dev |source code|github|git |deploy|hosting|serverless)\b/, 3, "Developer-tools secondary signal");

  // Comparison-media (requires editorial/review evidence)
  const isEditorialDomain = /advisor|review|best|top.*(for|of)|compared?|vs\./i.test(title) || /review|comparison|best.*software|advisor|n分析师|buying guide/i.test(fullText);
  const hasEditorialEvidence = /best products?|buying guide|top.*(for|of|in)|compare.*products|vs\.|reviewed|rating|score/i.test(fullText);
  const isAffiliateDomain = /advisor|nerdwallet|bankrate|thepointsguy|cnet|goodhousekeeping|consumer|\b(best|top)\d/i.test(sourceUrl);
  if (hasEditorialEvidence || isEditorialDomain || isAffiliateDomain) {
    score("comparison-media", /\b(review|comparison|best|top|rating|advisor|buying guide|vs\.?|versus)\b/, 8, "Comparison-media editorial evidence");
  }
  if (isAffiliateDomain) {
    score("comparison-media", /\.(com|net|org)/, 2, "Affiliate domain match");
  }

  // Analytics
  score("analytics", /\b(analytics|data platform|insights|tracking|customer data|business intelligence|data warehouse|data lake)\b/, 5, "Analytics signal");

  // Video/audio
  score("video-audio", /\b(video|audio|record|podcast|transcri(be|pt)|voice|screen recording|video creation|video editing)\b/, 5, "Video/audio signal");

  // Sales/CRM
  score("sales-crm", /\b(crm|sales|pipeline|leads?|outreach|deal|salesforce|hubspot|pipedrive)\b/, 5, "Sales/CRM signal");

  // Marketing tools
  score("marketing-tools", /\b(marketing|email campaign|seo|content marketing|campaign|newsletter|a\/b test|marketing automation)\b/, 5, "Marketing tools signal");

  // Design tools
  score("design-tools", /\b(design|creative|prototype|canvas|figma|sketch|wireframe|mockup|ui |ux |interface design)\b/, 5, "Design tools signal");

  // Productivity
  score("productivity", /\b(workspace|project|task|collaborat|notes?|calendar|workflow automation|productivity)\b/, 4, "Productivity signal");

  // Penalize comparison-media for product pages with customer reviews (not editorial)
  const isProductPage = /\b(product|feature|pricing|plans?|dashboard|integration)\b/i.test(fullText) && !/(buying guide|best.*for|comparison|reviewed|vs\.)/i.test(fullText);
  if (isProductPage && (scores["comparison-media"] ?? 0) > 0) {
    scores["comparison-media"] = Math.max(0, (scores["comparison-media"] ?? 0) - 5);
    evidence.push("Product page penalties comparison-media classification (weight -5)");
  }

  // Find best category
  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const primary = entries.length ? entries[0][0] : "saas-tools";
  const primaryScore = entries.length ? entries[0][1] : 0;
  const tagSet = new Set<string>([primary]);

  // Add adjacent tags for closely-scored categories
  for (const [category, score] of entries) {
    if (category !== primary && score >= primaryScore * 0.5 && tagSet.size < 4) {
      tagSet.add(category);
    }
  }
  // Add default generic tags
  if (tagSet.size === 1) { tagSet.add("saas-tools"); tagSet.add("software"); }
  else if (!tagSet.has("saas-tools")) tagSet.add("saas-tools");

  return { primary, tags: [...tagSet], scores, evidence };
}

function unavailable(input: DesignReferenceClassificationInput, failure_reason: ReferenceAuditFailureReason): DesignReferenceClassificationResult {
  return { status: "unavailable", failure_reason, resolved_url: input.desktop.resolved_url || null, response_status: input.desktop.response_status || null };
}

export function classifyDesignReferenceSnapshot(input: DesignReferenceClassificationInput): DesignReferenceClassificationResult {
  const challengeText = `${input.desktop.title} ${input.desktop.description}`;
  if (/just a moment|verify you are human|captcha|access denied|checking your browser/i.test(challengeText)) return unavailable(input, "bot_challenge");
  if (input.desktop.response_status >= 400) return unavailable(input, "http_error");
  if (/sign in|log in/i.test(input.desktop.title) && input.desktop.visible_text_length < 300) return unavailable(input, "login_required");
  if (/subscribe to continue|subscription required|paywall/i.test(challengeText)) return unavailable(input, "paywall");
  if (!input.desktop.heading || !input.mobile.heading || input.desktop.visible_text_length < 200) return unavailable(input, "insufficient_design_evidence");

  const sections = classifySections(input.desktop.sections);
  const heading = input.desktop.heading;
  const firstMedia = input.desktop.media[0];
  const firstCta = input.desktop.ctas[0];
  const hero = firstMedia && firstMedia.y < heading.y ? "media_first_offset"
    : heading.font_size >= 64 && !firstMedia ? "typographic_billboard"
      : firstMedia && firstMedia.x > heading.x + heading.width * 0.75 ? "asymmetric_split"
        : /trusted|customers?|reviews?|rated/i.test(input.desktop.sections[0]?.text ?? "") ? "proof_led"
          : heading.width < input.desktop.width * 0.42 ? "editorial_sidebar"
            : "problem_statement_stack";
  const serif = /serif|times|georgia|garamond|display/i.test(heading.font_family);
  const typography = serif ? (heading.font_weight >= 650 ? "fraunces_manrope" : "dm_serif_instrument_sans")
    : heading.font_weight >= 700 ? "archivo_source_sans" : "space_grotesk_dm_sans";
  const cta = firstCta && firstCta.width > input.desktop.width * 0.6 ? "full_width_close"
    : /trusted|customers?|reviews?|rated/i.test(input.desktop.sections[0]?.text ?? "") ? "split_evidence"
      : firstCta && firstCta.height <= 40 ? "compact_utility" : "inline_decision";
  const animatedProperties = input.desktop.animations.flatMap((animation) => animation.properties).join(" ");
  const motion = /clip-path|width/.test(animatedProperties) ? "line_wipe"
    : /scroll|progress/.test(animatedProperties) ? "anchored_progress"
      : input.desktop.animations.length >= 5 ? "split_reveal"
        : /transform/.test(animatedProperties) && input.desktop.media.length ? "media_parallax" : "quiet_stagger";
  const mobileMedia = input.mobile.media[0];
  const mobileCta = input.mobile.ctas[0];
  const mobile = mobileMedia && mobileMedia.y < input.mobile.heading.y ? "media_first"
    : mobileMedia && mobileCta && mobileMedia.y < mobileCta.y ? "interleaved" : "copy_first";

  const axes = {
    hero: { confidence: 0.9, evidence: [`H1 measured at ${Math.round(heading.x)},${Math.round(heading.y)} with ${firstMedia ? "visible media" : "no dominant media"}.`] },
    typography: { confidence: 0.86, evidence: [`Computed H1 font ${heading.font_family}, ${heading.font_size}px, weight ${heading.font_weight}; body ${input.desktop.body_font_family}.`] },
    section_order: { confidence: sections.length ? 0.82 : 0.55, evidence: sections.length ? sections.map((section) => section.composition_notes) : ["No semantic section headings met the evidence threshold."] },
    section_variants: { confidence: sections.length ? 0.8 : 0.55, evidence: sections.length ? sections.map((section) => `${section.key}:${section.family}`) : ["No section-family mapping was supported."] },
    cta: { confidence: firstCta ? 0.88 : 0.5, evidence: [firstCta ? `Primary CTA “${firstCta.text}” measured ${Math.round(firstCta.width)}×${Math.round(firstCta.height)}.` : "No visible CTA was measured."] },
    motion: { confidence: 0.8, evidence: [`Detected ${input.desktop.animations.length} normal-motion animation(s) and ${input.reduced_motion.animation_count} reduced-motion animation(s).`] },
    mobile: { confidence: 0.9, evidence: [`Mobile document width ${input.mobile.document_width}px for a ${input.mobile.width}px viewport; navigation ${input.mobile.navigation?.line_count ?? 0} line(s).`] },
  };
  const overall = Object.values(axes).reduce((sum, axis) => sum + axis.confidence, 0) / Object.keys(axes).length;
  if (overall < 0.75 || !firstCta || !sections.length) return unavailable(input, "classification_low_confidence");
  const category = categoryFrom(input);

  const reference: ReferenceIngestionReference = {
    id: input.source.id,
    source_url: input.source.source_url,
    captured_at: input.captured_at,
    usage_status: "active",
    usage_scope: "internal_only",
    primary_product_category: category.primary,
    category_tags: category.tags,
    observations: {
      hero: {
        variant: hero,
        composition: `Measured ${hero.replaceAll("_", " ")} composition around the primary heading and first-viewport media.`,
        alignment: `${heading.text_align} heading at ${Math.round(heading.x)}px with ${Math.round(heading.width)}px width.`,
        media_strategy: firstMedia ? `${firstMedia.tag} at ${Math.round(firstMedia.x)},${Math.round(firstMedia.y)} sized ${Math.round(firstMedia.width)}×${Math.round(firstMedia.height)}.` : "Typography carries the first viewport without dominant media.",
      },
      typography: {
        pair: typography,
        display_style: `Closest approved pair to computed ${heading.font_family}.`,
        body_style: `Computed body family ${input.desktop.body_font_family} at ${input.desktop.body_font_size}px.`,
        scale: `${heading.font_size}px H1 within a ${input.desktop.height}px first viewport.`,
        weight_contrast: `Display weight ${heading.font_weight} against measured body styling.`,
      },
      sections,
      cta: {
        variant: cta,
        placement: `Primary visible CTA at ${Math.round(firstCta.x)},${Math.round(firstCta.y)}.`,
        label_pattern: `Observed concise action label “${firstCta.text}”.`,
        interaction: `Measured solid interactive control sized ${Math.round(firstCta.width)}×${Math.round(firstCta.height)}.`,
      },
      motion: {
        variant: motion,
        triggers: `${input.desktop.animations.length} active browser animation(s) were measured after font readiness.`,
        intensity: `${motion.replaceAll("_", " ")} is the closest registered motion pattern.`,
        reduced_motion_behavior: `${input.reduced_motion.animation_count} animation(s) remained with reduced motion and ${input.reduced_motion.visible_text_length} visible text characters remained.`,
      },
      mobile: {
        strategy: mobile,
        stacking: `${mobile.replaceAll("_", " ")} order derived from H1, media and CTA positions.`,
        navigation: `${input.mobile.navigation?.height ?? 0}px navigation across ${input.mobile.navigation?.line_count ?? 0} line(s).`,
        cta_behavior: `Primary CTA remains in document flow at ${Math.round(mobileCta?.y ?? 0)}px.`,
        overflow_behavior: `Document width ${input.mobile.document_width}px against ${input.mobile.width}px viewport.`,
      },
    },
    supported_variant_tags: {
      hero: [hero],
      typography: [typography],
      section_variants: [...new Set(sections.map((section) => section.family))],
      cta: [cta],
      motion: [motion],
      mobile: [mobile],
    },
    reusable_principles: [
      `Use the measured ${hero.replaceAll("_", " ")} hierarchy without copying brand assets or exact geometry.`,
      `Apply the observed ${cta.replaceAll("_", " ")} decision pattern with original copy and evidence.`,
    ],
    prohibited_copy_notes: ["Do not copy branding, copy, logos, imagery, proprietary assets, exact colors, or exact layout measurements."],
    classification: { overall_confidence: Number(overall.toFixed(4)), axes },
  };
  return { status: "active", reference };
}
