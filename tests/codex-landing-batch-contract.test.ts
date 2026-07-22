import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, mkdtemp, mkdir, readFile, readdir, realpath, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";

import {
  loadCodexLandingBatch,
  type CodexBatchFileSystem,
} from "@/lib/codex-batches/loader";
import { buildCodexLandingBatchPacket } from "@/lib/codex-batches/packager";
import * as batchContracts from "@/lib/codex-batches/contracts";
import { DesignReferenceCatalogueV1, createDesignReference, createPresentationRecipe, sectionFamilies, sectionKeys } from "@/lib/design-references/contracts";

const IDS = {
  batch: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  product: "11111111-1111-4111-8111-111111111111",
  affiliate: "22222222-2222-4222-8222-222222222222",
  offerFolder: "33333333-3333-4333-8333-333333333333",
  destination: "44444444-4444-4444-8444-444444444444",
  programRule: "55555555-5555-4555-8555-555555555555",
  compliance: "66666666-6666-4666-8666-666666666666",
  source: "77777777-7777-4777-8777-777777777777",
  evidence: "88888888-8888-4888-8888-888888888888",
  blueprint: "99999999-9999-4999-8999-999999999999",
} as const;

const GIT_SHA = "0123456789abcdef0123456789abcdef01234567";
const SLUG = "workflow-fit-review";
const QUALITY_SCANNERS = [
  "route",
  "structure",
  "hero",
  "cta",
  "seo",
  "a11y",
  "links",
  "forms",
  "conversion",
  "responsive",
  "assets",
  "publish-readiness",
  "editorial-v2",
  "compliance",
  "uniqueness",
  "conversion-copy",
] as const;

function sha256(bytes: Uint8Array | string) {
  return createHash("sha256").update(bytes).digest("hex");
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
    .join(",")}}`;
}

function makeBlueprint() {
  return {
    metadata: {
      product_id: IDS.product,
      page_type: "direct_review",
      target_keyword: "workflow fit review",
      search_intent: "commercial investigation",
      geo_target: null,
      category_slug: "workflow-tools",
      url_slug: SLUG,
      title_tag: "Workflow fit review for a small operations team",
      meta_description: "A bounded review of the workflow decisions a small operations team should verify before visiting the official product page.",
      canonical_url: null,
      robots: "noindex,nofollow",
      motion_profile: "gsap_editorial",
      design_profile: "editorial_v2",
    },
    affiliate_disclosure: {
      short_disclosure: "We may earn a commission if you use this paid referral link.",
      full_disclosure: "VettedSaaSBlueprint may earn a commission when you visit the product through this referral link, at no added cost to you.",
      placement: "above_first_cta",
    },
    hero: {
      headline: "Can this workflow tool keep a small operations team coordinated?",
      subheadline: "Use this decision brief to inspect handoffs, recurring work, and the limits that matter before you move to the product site.",
      answer_snippet: "This page helps a small operations team decide whether the product's workflow model matches recurring handoffs, visibility needs, and setup tolerance. It focuses on what to inspect before clicking, where the fit may break down, and which questions to verify on the official product page.",
      primary_cta_label: "Inspect workflow fit",
      primary_cta_link_id: IDS.affiliate,
      risk_reversal: "Verify the current workflow and terms on the product site before deciding.",
      social_proof_summary: null,
    },
    problem_solution: {
      problem: "Recurring handoffs become hard to see across a small operations team.",
      agitation: "A tool that adds setup work without clarifying ownership can increase friction.",
      solution: "Evaluate whether the product's workflow structure matches the team's actual recurring work.",
    },
    benefits: [{
      benefit_title: "Make handoff ownership inspectable",
      benefit_description: "Check whether recurring steps, owners, and status cues match the way the team already coordinates work.",
      feature_supporting_it: "Workflow organization",
      source_reference_ids: [IDS.source],
    }],
    proof_blocks: [{
      proof_type: "vendor_documentation",
      summary: "The cited product documentation describes the workflow structure used in this decision factor.",
      source_reference_id: IDS.source,
      evidence_claim_id: IDS.evidence,
      confidence_score: 0.8,
    }],
    how_it_works: [{ step_number: 1, title: "Map one recurring handoff", description: "Compare a real recurring task with the product's workflow model." }],
    limitations: [{
      limitation: "The fit depends on setup tolerance",
      who_it_affects: "Teams that need immediate use with little configuration",
      mitigation: "Inspect setup requirements and start with one representative workflow.",
      evidence_claim_id: IDS.evidence,
    }],
    objection_handling: [{
      objection: "Will this add another layer of process?",
      response: "Compare the required setup with one existing recurring handoff before expanding use.",
      source_reference_ids: [IDS.source],
    }],
    cta_blocks: [{
      placement: "hero",
      label: "Inspect workflow fit",
      supporting_text: "Open the official product page and verify the workflow model.",
      affiliate_link_id: IDS.affiliate,
    }],
    faq: [{
      question: "What should a small team verify first?",
      answer: "Start with ownership, recurring handoffs, and the amount of setup needed for one real workflow.",
      source_reference_ids: [IDS.source],
    }],
    schema_markup: { faq_schema: {}, breadcrumb_schema: {} },
    quality_scores: {
      evidence_score: 72,
      originality_score: 90,
      conversion_score: 86,
      compliance_score: 90,
      readability_score: 88,
      seo_safety_score: 92,
      overall_score: 86,
    },
  };
}

function makeProductPack(longSummary = "Owner-provided product identity, destination notes, and cited vendor documentation form the review basis.") {
  return {
    schema_version: "ProductEvidencePackV1",
    product: {
      id: IDS.product,
      name: "Example Workflow Product",
      slug: "example-workflow-product",
      category: "Workflow management",
      website_url: "https://example.com/product",
      description: "A workflow product used to validate the batch production contract.",
      primary_audience: "Small operations teams",
    },
    references: {
      product_id: IDS.product,
      affiliate_link_id: IDS.affiliate,
      offer_folder_id: IDS.offerFolder,
      destination_review_id: IDS.destination,
      program_rule_id: IDS.programRule,
      compliance_profile_id: IDS.compliance,
      source_ids: [IDS.source],
      evidence_claim_ids: [IDS.evidence],
      page_blueprint_ids: [IDS.blueprint],
    },
    affiliate: {
      original_url: "https://try.elevenlabs.io/izj2b165mcsj?ref=exact",
      link_type: "referral",
      destination_review: {
        id: IDS.destination,
        state: "reviewed",
        checked_at: "2026-07-13T08:00:00.000Z",
        final_visible_url: "https://example.com/product",
        redirect_chain: [
          "https://try.elevenlabs.io/izj2b165mcsj?ref=exact",
          "https://example.com/product",
        ],
        usage_notes: "Preserve the original referral URL exactly; the final URL is evidence only.",
      },
    },
    offer_folder: {
      id: IDS.offerFolder,
      name: "Example Workflow Product evidence pack",
    },
    program_rules: {
      id: IDS.programRule,
      program_name: "Example Workflow Product affiliate program",
      state: "documented",
      required_disclosure: "Disclose the paid referral relationship clearly.",
      rules: [{ name: "deep_links", value: "unknown", usage_notes: "Do not invent a rule that was not supplied." }],
      unknown_reason: null,
    },
    compliance_profile: {
      id: IDS.compliance,
      required_disclosure: "Disclose the paid referral relationship clearly.",
      import_notes: "Imported as incomplete unless a matching canonical reviewed profile already exists.",
    },
    disclosures: {
      short: "We may earn a commission if you use this paid referral link.",
      full: "VettedSaaSBlueprint may earn a commission when you visit the product through this referral link, at no added cost to you.",
      placement_notes: "Short disclosure before or near the first CTA; full disclosure in the footer.",
    },
    review_basis: {
      basis: "vendor_docs",
      summary: longSummary,
      first_hand_boundary: "No hands-on product use is claimed.",
    },
    sources: [{
      id: IDS.source,
      source_type: "vendor_documentation",
      url: "https://example.com/product/docs",
      title: "Example workflow documentation",
      retrieved_at: "2026-07-13T08:00:00.000Z",
      source_sha256: "a".repeat(64),
      usage_notes: "Use only for the described workflow structure; recheck if the page changes.",
    }],
    evidence_claims: [{
      id: IDS.evidence,
      source_id: IDS.source,
      claim: "The documentation describes a configurable workflow structure.",
      claim_type: "feature_description",
      risk_level: "low",
      confidence_score: 0.8,
      allowed_wording: "Inspect whether the documented workflow structure matches the team's recurring work.",
      usage_notes: "Do not turn this into an outcome or performance claim.",
    }],
    claim_to_evidence: [{
      claim_key: "workflow_structure",
      evidence_claim_ids: [IDS.evidence],
      usage_notes: "Supports only the workflow-fit decision factor.",
    }],
    prohibited_claims: ["best workflow tool", "guaranteed productivity improvement"],
    sibling_context: [],
    proposed_buyer_decisions: [{
      page_blueprint_id: IDS.blueprint,
      slug: SLUG,
      buyer_decision: "Whether the workflow model fits recurring handoffs for a small operations team.",
    }],
  };
}

function makeIntent() {
  return {
    schema_version: 1,
    status: "pass",
    recommended_action: "new_page",
    reason_codes: [],
    target_keyword: "workflow fit review",
    search_intent: "commercial investigation",
    audience_segment: "small operations teams",
    buyer_decision: "Whether the workflow model fits recurring handoffs.",
    hard_fail_flags: [],
    downstream_blocks: [],
  };
}

function makeReviews() {
  return {
    uniqueness: {
      schema_version: 1,
      status: "pass",
      publish_readiness: "eligible_for_next_gate",
      reason_codes: [],
      hard_gate_failures: [],
      required_changes: [],
      recommended_action: "pass",
    },
    compliance: {
      schema_version: 1,
      status: "pass",
      publish_readiness: "eligible_for_conversion_review",
      reason_codes: [],
      hard_gate_failures: [],
      required_changes: [],
      recommended_action: "pass",
    },
    conversion: {
      schema_version: 1,
      status: "pass",
      publish_readiness: "eligible_for_owner_review",
      reason_codes: [],
      hard_gate_failures: [],
      required_rewrites: [],
      recommended_action: "pass",
    },
  };
}

function toJsonBytes(value: unknown, options: { bom?: boolean; crlf?: boolean } = {}) {
  let text = `${JSON.stringify(value, null, 2)}\n`;
  if (options.crlf) text = text.replace(/\n/g, "\r\n");
  if (options.bom) text = `\uFEFF${text}`;
  return Buffer.from(text, "utf8");
}

type FixtureOptions = {
  root?: string;
  batchId?: string;
  batchType?: "exemplar" | "calibration" | "production_candidate";
  pageCount?: number;
  progression?: Record<string, unknown>;
  productPack?: ReturnType<typeof makeProductPack>;
  productPackEncoding?: { bom?: boolean; crlf?: boolean };
  mutateQuality?: (quality: Record<string, unknown>) => void;
  mutateRetro?: (retro: Record<string, unknown>) => void;
  mutateManifest?: (manifest: MutableManifest) => void;
  mutateDraft?: (draft: Record<string, unknown>) => void;
};

type ArtifactReference = {
  path: string;
  byte_sha256: string;
  canonical_json_sha256: string;
};

type MutableManifest = Record<string, unknown> & {
  product_pack: ArtifactReference;
  quality: ArtifactReference;
  retro: ArtifactReference & { gate_status: string };
  progression: Record<string, unknown>;
  pages: Array<Record<string, unknown> & {
    artifact: ArtifactReference;
    intent: ArtifactReference;
    reviews: Record<string, ArtifactReference>;
    gate_statuses: Record<string, string>;
  }>;
};

async function createFixture(options: FixtureOptions = {}) {
  const root = options.root ?? await mkdtemp(path.join(os.tmpdir(), "codex-landing-batch-"));
  const batchId = options.batchId ?? IDS.batch;
  const batchDirectory = path.join(root, batchId);
  await mkdir(path.join(batchDirectory, "intents"), { recursive: true });
  await mkdir(path.join(batchDirectory, "drafts"), { recursive: true });
  await mkdir(path.join(batchDirectory, "reviews"), { recursive: true });

  const batchType = options.batchType ?? "exemplar";
  const pageCount = options.pageCount ?? 1;
  const pageDefinitions = Array.from({ length: pageCount }, (_, index) => ({
    slug: index === 0 ? SLUG : `${SLUG}-${index + 1}`,
    pageBlueprintId: index === 0
      ? IDS.blueprint
      : `99999999-9999-4999-8999-${String(999999999999 - index).padStart(12, "0")}`,
  }));
  const productPack = structuredClone(options.productPack ?? makeProductPack()) as unknown as {
    references: { page_blueprint_ids: string[] };
    proposed_buyer_decisions: Array<{
      page_blueprint_id: string;
      slug: string;
      buyer_decision: string;
    }>;
  };
  productPack.references.page_blueprint_ids = pageDefinitions.map((page) => page.pageBlueprintId);
  productPack.proposed_buyer_decisions = pageDefinitions.map((page, index) => ({
    page_blueprint_id: page.pageBlueprintId,
    slug: page.slug,
    buyer_decision: `Whether decision factor ${index + 1} fits this workflow.`,
  }));
  const reviews = makeReviews();
  const retro: Record<string, unknown> = {
    schema_version: 1,
    status: "pass",
    reason_codes: [],
    recurring_failures: [],
    skill_updates: [],
    deferred_items: [],
    next_batch_decision: "advance",
  };
  options.mutateRetro?.(retro);
  const artifacts: Record<string, Uint8Array> = {
    "product-pack.json": toJsonBytes(productPack, options.productPackEncoding),
    "retro.json": toJsonBytes(retro),
    "timing.json": toJsonBytes({
      schema_version: "CodexLandingTimingV1",
      batch_id: batchId,
      stages: [{
        name: "exemplar_generation",
        started_at: "2026-07-13T08:00:00.000Z",
        completed_at: "2026-07-13T08:00:01.000Z",
        duration_ms: 1000,
      }],
      total_duration_ms: 1000,
    }),
  };

  for (const page of pageDefinitions) {
    await mkdir(path.join(batchDirectory, "reviews", page.slug), { recursive: true });
    const draft: Record<string, unknown> = structuredClone(makeBlueprint());
    (draft.metadata as Record<string, unknown>).url_slug = page.slug;
    options.mutateDraft?.(draft);
    artifacts[`intents/${page.slug}.json`] = toJsonBytes(makeIntent());
    artifacts[`drafts/${page.slug}.json`] = toJsonBytes(draft);
    artifacts[`reviews/${page.slug}/uniqueness.json`] = toJsonBytes(reviews.uniqueness);
    artifacts[`reviews/${page.slug}/compliance.json`] = toJsonBytes(reviews.compliance);
    artifacts[`reviews/${page.slug}/conversion.json`] = toJsonBytes(reviews.conversion);
  }

  const inputArtifacts = Object.entries(artifacts)
    .map(([artifactPath, bytes]) => ({
      path: artifactPath,
      canonical_json_sha256: sha256(canonicalJson(JSON.parse(Buffer.from(bytes).toString("utf8").replace(/^\uFEFF/, "")))),
    }))
    .sort((left, right) => left.path.localeCompare(right.path));
  const quality: Record<string, unknown> = {
    schema_version: "CodexLandingBatchQualityReceiptV1",
    batch_id: batchId,
    mode: "draft",
    status: "pass",
    gate_status: "pass",
    scanners: QUALITY_SCANNERS.map((name) => ({ name, status: "pass" })),
    input_artifact_digest: sha256(canonicalJson(inputArtifacts)),
  };
  options.mutateQuality?.(quality);
  artifacts["quality.json"] = toJsonBytes(quality);

  for (const [relativePath, bytes] of Object.entries(artifacts)) {
    await writeFile(path.join(batchDirectory, ...relativePath.split("/")), bytes);
  }

  const progression = options.progression ?? (batchType === "exemplar"
    ? { stage: "exemplar" }
    : batchType === "calibration"
      ? {
          stage: "calibration",
          exemplar_batch_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          exemplar_manifest_sha256: "b".repeat(64),
          exemplar_gate_status: "pass",
          exemplar_retro_sha256: "d".repeat(64),
          exemplar_retro_status: "pass",
        }
      : {
          stage: "production_candidate",
          calibration_batch_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          calibration_manifest_sha256: "c".repeat(64),
          calibration_gate_status: "pass",
          calibration_retro_sha256: "d".repeat(64),
          calibration_retro_status: "pass",
        });

  const hashRef = (relativePath: string) => ({
    path: relativePath,
    byte_sha256: sha256(artifacts[relativePath]),
    canonical_json_sha256: sha256(canonicalJson(JSON.parse(Buffer.from(artifacts[relativePath]).toString("utf8").replace(/^\uFEFF/, "")))),
  });

  const manifest: MutableManifest = {
    schema_version: "CodexLandingBatchV1",
    batch_id: batchId,
    product_id: IDS.product,
    batch_type: batchType,
    git_commit_sha: GIT_SHA,
    created_at: "2026-07-13T08:00:02.000Z",
    product_pack: hashRef("product-pack.json"),
    quality: hashRef("quality.json"),
    progression,
    pages: pageDefinitions.map((page) => ({
      page_blueprint_id: page.pageBlueprintId,
      slug: page.slug,
      robots: "noindex,nofollow",
      motion_profile: "gsap_editorial",
      artifact: hashRef(`drafts/${page.slug}.json`),
      intent: hashRef(`intents/${page.slug}.json`),
      reviews: {
        uniqueness: hashRef(`reviews/${page.slug}/uniqueness.json`),
        compliance: hashRef(`reviews/${page.slug}/compliance.json`),
        conversion: hashRef(`reviews/${page.slug}/conversion.json`),
      },
      gate_statuses: {
        intent: "pass",
        draft: "pass",
        uniqueness: "pass",
        compliance: "pass",
        conversion: "pass",
      },
    })),
    retro: { ...hashRef("retro.json"), gate_status: "pass" },
    timing: hashRef("timing.json"),
  };
  options.mutateManifest?.(manifest);
  await writeFile(path.join(batchDirectory, "manifest.json"), toJsonBytes(manifest));
  return { root, batchId, batchDirectory, manifest, artifacts };
}

function artifactReferenceFromBytes(bytes: Uint8Array): ArtifactReference {
  const parsed = JSON.parse(Buffer.from(bytes).toString("utf8").replace(/^\uFEFF/, ""));
  return {
    path: "",
    byte_sha256: sha256(bytes),
    canonical_json_sha256: sha256(canonicalJson(parsed)),
  };
}

async function createV2Catalogue() {
  const directory = await mkdtemp(path.join(os.tmpdir(), "codex-v2-catalogue-"));
  const references = await Promise.all([1, 2, 3].map(async (number) => {
    const id = `lp-ref-${String(number).padStart(4, "0")}`;
    const desktop = await sharp({ create: { width: 8, height: 8, channels: 3, background: { r: number, g: 1, b: 1 } } }).webp().toBuffer();
    const mobile = await sharp({ create: { width: 8, height: 8, channels: 3, background: { r: 1, g: number, b: 1 } } }).webp().toBuffer();
    const captures = {
      desktop: { path: `captures/${id}/desktop.webp`, sha256: sha256(desktop), byte_size: desktop.byteLength },
      mobile: { path: `captures/${id}/mobile.webp`, sha256: sha256(mobile), byte_size: mobile.byteLength },
    };
    await mkdir(path.join(directory, "captures", id), { recursive: true });
    await writeFile(path.join(directory, captures.desktop.path), desktop);
    await writeFile(path.join(directory, captures.mobile.path), mobile);
    return createDesignReference({
      id,
      source_url: `https://reference-${number}.example.com`,
      captured_at: "2026-07-14T08:00:00.000Z",
      captures,
      usage_status: "active",
      usage_scope: "internal_only",
      primary_product_category: "workflow-tools",
      category_tags: ["workflow-tools"],
      observations: {
        hero: { variant: "asymmetric_split", composition: "Split", alignment: "left", media_strategy: "proof" },
        typography: { pair: "fraunces_manrope", display_style: "Serif", body_style: "Sans", scale: "Large", weight_contrast: "High" },
        sections: sectionKeys.map((key, index) => ({ key, family: sectionFamilies[index], composition_notes: `Section ${key}` })),
        cta: { variant: "inline_decision", placement: "hero", label_pattern: "verb", interaction: "inline" },
        motion: { variant: "quiet_stagger", triggers: "viewport", intensity: "low", reduced_motion_behavior: "static" },
        mobile: { strategy: "copy_first", stacking: "copy", navigation: "condensed", cta_behavior: "inline", overflow_behavior: "clip" },
      },
      supported_variant_tags: { hero: ["asymmetric_split"], typography: ["fraunces_manrope"], section_variants: ["split_editorial"], cta: ["inline_decision"], motion: ["quiet_stagger"], mobile: ["copy_first"] },
      reusable_principles: [`Principle ${number}`],
      prohibited_copy_notes: ["No copied source material."],
    });
  }));
  const catalogue = DesignReferenceCatalogueV1.parse({ schema_version: "DesignReferenceCatalogueV1", references });
  await mkdir(path.join(directory, "references"), { recursive: true });
  await Promise.all(references.map((reference) => writeFile(path.join(directory, "references", `${reference.id}.json`), JSON.stringify(reference))));
  await writeFile(path.join(directory, "catalogue.json"), JSON.stringify(catalogue));
  return { directory, catalogue, catalogueSha256: sha256(canonicalJson(catalogue)) };
}

function v2VisualReport(catalogue: Awaited<ReturnType<typeof createV2Catalogue>>["catalogue"], catalogueSha256: string, recipe: ReturnType<typeof createPresentationRecipe>) {
  const captures = ([
    ["desktop-first-viewport", "first-viewport", 1440, 900, false, "settled", false, true], ["desktop-full-page", "full-page", 1440, 900, true, "settled", false, true],
    ["mobile-first-viewport", "first-viewport", 390, 844, false, "settled", false, true], ["mobile-full-page", "full-page", 390, 844, true, "settled", false, true],
    ["cta-320", "cta-check", 320, 844, false, "settled", false, true], ["cta-360", "cta-check", 360, 844, false, "settled", false, true],
    ["motion-initial", "motion-frame", 1440, 900, false, "initial", false, true], ["motion-hero-complete", "motion-frame", 1440, 900, false, "hero-complete", false, true],
    ["motion-mid-page", "motion-frame", 1440, 900, false, "mid-page", false, true], ["reduced-motion", "reduced-motion", 1440, 900, false, "reduced-motion", true, true],
    ["javascript-disabled", "javascript-disabled", 390, 844, false, "javascript-disabled", false, false], ["desktop-contact-sheet", "contact-sheet", 1440, 900, true, null, false, true],
    ["mobile-contact-sheet", "contact-sheet", 390, 844, true, null, false, true],
  ] as const).map(([name, kind, viewport_width, viewport_height, full_page, motion_state, reduced_motion, javascript_enabled]) => ({ name, kind, viewport_width, viewport_height, full_page, motion_state, reduced_motion, javascript_enabled, path: `${SLUG}/${name}.webp`, sha256: "d".repeat(64), byte_size: 123 }));
  return {
    schema_version: "VisualDesignReviewV1", batch_id: IDS.batch, product_id: IDS.product, page_blueprint_id: IDS.blueprint, slug: SLUG,
    intent_keyword: "workflow fit review", buyer_decision: "Whether the workflow model fits recurring handoffs.", draft_sha256: "", screenshot_set_sha256: batchContracts.visualScreenshotSetSha256(captures), catalogue_sha256: catalogueSha256, recipe_id: recipe.recipe_id, recipe_fingerprint: recipe.fingerprint,
    selected_references: catalogue.references.map((reference, index) => ({ reference_id: reference.id, entry_digest: reference.entry_digest, role: index === 0 ? "hero_typography" : index === 1 ? "sections_cta" : "motion_mobile", adopted_principles: [`Principle ${index + 1}`], influenced_axes: index === 0 ? ["hero", "typography"] : index === 1 ? ["section_variants", "cta"] : ["motion", "mobile"], desktop_capture_sha256: reference.captures.desktop!.sha256, mobile_capture_sha256: reference.captures.mobile!.sha256 })),
    brand_content_assets_not_copied: { status: "pass", notes: ["No copied material."] }, checks: Object.fromEntries(["desktop", "mobile", "cta", "overflow", "motion", "reduced_motion", "contact_sheet", "presentation_diversity"].map((name) => [name, { status: "pass", notes: ["checked"] }])), artifacts: captures,
    status: "pass", publish_readiness: "eligible_for_next_gate", reason_codes: [], required_changes: [],
  };
}

type V2TraceFixture = {
  page_blueprint_id: string;
  slug: string;
  draft_canonical_sha256: string;
  recipe_id: string;
  recipe_fingerprint: string;
  catalogue_sha256: string;
  selected_references: ReturnType<typeof v2VisualReport>["selected_references"];
};

async function createV2Fixture(mutateTrace?: (trace: V2TraceFixture) => void) {
  const catalogue = await createV2Catalogue();
  const fixture = await createFixture();
  const recipe = createPresentationRecipe({
    hero: "asymmetric_split", typography: "fraunces_manrope", section_order: [...sectionKeys],
    section_variants: {
      problem_solution: "split_editorial", benefits: "numbered_ledger", proof_blocks: "alternating_story", how_it_works: "proof_strip",
      limitations: "decision_matrix", objection_handling: "process_timeline", faq: "objection_accordion", closing_cta: "closing_manifesto",
    },
    cta: "inline_decision", motion: "quiet_stagger", mobile: "copy_first",
    design_dials: { design_variance: 7, motion_intensity: 6, visual_density: 4 },
    reference_ids: catalogue.catalogue.references.map((reference) => reference.id),
  });
  const direction = {
    design_read: "A composed workflow-review direction.", selection_rationale: "Each reference owns two complementary presentation axes.", product_category: "workflow-tools", adjacent_category_tags: [],
    references: catalogue.catalogue.references.map((reference, index) => ({ reference_id: reference.id, entry_digest: reference.entry_digest, role: index === 0 ? "hero_typography" : index === 1 ? "sections_cta" : "motion_mobile", adopted_principles: [`Principle ${index + 1}`], influenced_axes: index === 0 ? ["hero", "typography"] : index === 1 ? ["section_variants", "cta"] : ["motion", "mobile"] })),
    design_dials: recipe.design_dials, prohibited_elements: ["Copied branding or source copy."], recipe_id: recipe.recipe_id, fingerprint: recipe.fingerprint,
  };
  const draft = makeBlueprint();
  draft.metadata.design_profile = "reference_composed_v1";
  Object.assign(draft, { presentation: recipe });
  const buyerDecision = "Whether decision factor 1 fits this workflow.";
  const intent = { ...makeIntent(), buyer_decision: buyerDecision, design_direction: direction };
  const visual = v2VisualReport(catalogue.catalogue, catalogue.catalogueSha256, recipe);
  const trace: V2TraceFixture = { page_blueprint_id: IDS.blueprint, slug: SLUG, draft_canonical_sha256: "", recipe_id: recipe.recipe_id, recipe_fingerprint: recipe.fingerprint, catalogue_sha256: catalogue.catalogueSha256, selected_references: structuredClone(visual.selected_references) };
  const reviews = makeReviews();
  const write = async (relativePath: string, value: unknown) => writeFile(path.join(fixture.batchDirectory, ...relativePath.split("/")), toJsonBytes(value));
  await write(`drafts/${SLUG}.json`, draft);
  const draftBytes = await readFile(path.join(fixture.batchDirectory, "drafts", `${SLUG}.json`));
  trace.draft_canonical_sha256 = artifactReferenceFromBytes(draftBytes).canonical_json_sha256;
  visual.draft_sha256 = trace.draft_canonical_sha256;
  visual.buyer_decision = buyerDecision;
  mutateTrace?.(trace);
  await write(`intents/${SLUG}.json`, intent);
  await write(`reviews/${SLUG}/uniqueness.json`, { ...reviews.uniqueness, schema_version: "codexUniquenessReviewV2", design_trace: trace });
  await write(`reviews/${SLUG}/compliance.json`, { ...reviews.compliance, schema_version: "codexComplianceReviewV2", design_trace: trace });
  await write(`reviews/${SLUG}/conversion.json`, { ...reviews.conversion, schema_version: "codexConversionReviewV2", design_trace: trace });
  await write(`reviews/${SLUG}/visual.json`, visual);

  const manifest = fixture.manifest;
  const reference = async (relativePath: string) => {
    const bytes = await readFile(path.join(fixture.batchDirectory, ...relativePath.split("/")));
    return { ...artifactReferenceFromBytes(bytes), path: relativePath };
  };
  manifest.schema_version = "CodexLandingBatchV2";
  const page = manifest.pages[0]!;
  page.artifact = await reference(`drafts/${SLUG}.json`);
  page.intent = await reference(`intents/${SLUG}.json`);
  page.reviews.uniqueness = await reference(`reviews/${SLUG}/uniqueness.json`);
  page.reviews.compliance = await reference(`reviews/${SLUG}/compliance.json`);
  page.reviews.conversion = await reference(`reviews/${SLUG}/conversion.json`);
  page.reviews.visual = await reference(`reviews/${SLUG}/visual.json`);
  page.gate_statuses.visual = "pass";
  const inputPaths = ["product-pack.json", "retro.json", "timing.json", `intents/${SLUG}.json`, `drafts/${SLUG}.json`, `reviews/${SLUG}/uniqueness.json`, `reviews/${SLUG}/compliance.json`, `reviews/${SLUG}/conversion.json`, `reviews/${SLUG}/visual.json`];
  const digestInputs = await Promise.all(inputPaths.map(async (artifactPath) => ({ path: artifactPath, canonical_json_sha256: (await reference(artifactPath)).canonical_json_sha256 })));
  const quality = JSON.parse(await readFile(path.join(fixture.batchDirectory, "quality.json"), "utf8"));
  quality.input_artifact_digest = sha256(canonicalJson(digestInputs.sort((left, right) => left.path.localeCompare(right.path))));
  await write("quality.json", quality);
  manifest.quality = await reference("quality.json");
  await write("manifest.json", manifest);
  return { fixture, catalogue };
}

test("exports a manifest union that recognizes Batch V2 without changing the V1 schema", () => {
  const manifestUnion = batchContracts.codexLandingBatchManifestSchema;
  assert.equal(batchContracts.codexLandingBatchV1Schema.safeParse({ schema_version: "CodexLandingBatchV2" }).success, false);
  assert.equal(manifestUnion.safeParse({ schema_version: "CodexLandingBatchV2" }).success, false, "The initial RED assertion documents that V2 has not been implemented yet.");
});

test("accepts a non-advancing design-direction hold while rejecting it for a passing intent", () => {
  const held = {
    schema_version: 1,
    status: "fail",
    recommended_action: "hold_for_design_direction",
    reason_codes: ["insufficient_reference_coverage"],
    target_keyword: "workflow fit review",
    search_intent: "commercial investigation",
    audience_segment: "small operations teams",
    buyer_decision: "Whether the workflow model fits recurring handoffs.",
    hard_fail_flags: ["design_direction_missing"],
    downstream_blocks: ["design_direction"],
  };
  const schema = batchContracts.codexIntentBriefSchema;
  assert.equal(schema.safeParse(held).success, true);
  assert.equal(schema.safeParse({ ...held, status: "pass", hard_fail_flags: [], downstream_blocks: [] }).success, false);
});

test("VisualDesignReviewV1 preserves the complete reference trace and every required capture state", () => {
  const reference = (id: string, role: "hero_typography" | "sections_cta" | "motion_mobile", axes: string[]) => ({
    reference_id: id,
    entry_digest: "a".repeat(64),
    role,
    adopted_principles: [`Use ${role} hierarchy.`],
    influenced_axes: axes,
    desktop_capture_sha256: "b".repeat(64),
    mobile_capture_sha256: "c".repeat(64),
  });
  const captures = ([
    ["desktop-first-viewport", "first-viewport", 1440, 900, false, "settled", false, true], ["desktop-full-page", "full-page", 1440, 900, true, "settled", false, true],
    ["mobile-first-viewport", "first-viewport", 390, 844, false, "settled", false, true], ["mobile-full-page", "full-page", 390, 844, true, "settled", false, true],
    ["cta-320", "cta-check", 320, 844, false, "settled", false, true], ["cta-360", "cta-check", 360, 844, false, "settled", false, true],
    ["motion-initial", "motion-frame", 1440, 900, false, "initial", false, true], ["motion-hero-complete", "motion-frame", 1440, 900, false, "hero-complete", false, true],
    ["motion-mid-page", "motion-frame", 1440, 900, false, "mid-page", false, true], ["reduced-motion", "reduced-motion", 1440, 900, false, "reduced-motion", true, true],
    ["javascript-disabled", "javascript-disabled", 390, 844, false, "javascript-disabled", false, false], ["desktop-contact-sheet", "contact-sheet", 1440, 900, true, null, false, true],
    ["mobile-contact-sheet", "contact-sheet", 390, 844, true, null, false, true],
  ] as const).map(([name, kind, width, height, fullPage, motionState, reducedMotion, javascriptEnabled]) => ({ name, kind, viewport_width: width, viewport_height: height, full_page: fullPage, motion_state: motionState, reduced_motion: reducedMotion, javascript_enabled: javascriptEnabled, path: `${SLUG}/${name}.webp`, sha256: "d".repeat(64), byte_size: 123 }));
  const screenshotSetSha256 = batchContracts.visualScreenshotSetSha256;
  const report = {
    schema_version: "VisualDesignReviewV1", batch_id: IDS.batch, product_id: IDS.product, page_blueprint_id: IDS.blueprint, slug: SLUG,
    intent_keyword: "workflow fit review", buyer_decision: "Whether the workflow model fits recurring handoffs.", draft_sha256: "e".repeat(64), screenshot_set_sha256: screenshotSetSha256(captures), catalogue_sha256: "a".repeat(64), recipe_id: "recipe-aaaaaaaaaaaaaaaa", recipe_fingerprint: "a".repeat(64),
    selected_references: [reference("lp-ref-0001", "hero_typography", ["hero", "typography"]), reference("lp-ref-0002", "sections_cta", ["section_variants", "cta"]), reference("lp-ref-0003", "motion_mobile", ["motion", "mobile"])],
    brand_content_assets_not_copied: { status: "pass", notes: ["No copied branding, content, or assets."] },
    checks: Object.fromEntries(["desktop", "mobile", "cta", "overflow", "motion", "reduced_motion", "contact_sheet", "presentation_diversity"].map((name) => [name, { status: "pass", notes: ["checked"] }])),
    artifacts: captures, status: "pass", publish_readiness: "eligible_for_next_gate", reason_codes: [], required_changes: [],
  };
  assert.equal(screenshotSetSha256([...captures].reverse()), report.screenshot_set_sha256);
  assert.equal(batchContracts.visualDesignReviewV1Schema.safeParse(report).success, true);
  assert.equal(batchContracts.visualDesignReviewV1Schema.safeParse({ ...report, artifacts: captures.filter((capture) => capture.name !== "javascript-disabled") }).success, false);
  assert.equal(batchContracts.visualDesignReviewV1Schema.safeParse({ ...report, screenshot_set_sha256: "f".repeat(64) }).success, false);
});

test("Batch V2 requires a supplied validated catalogue and rejects stale catalogue records", async () => {
  const { fixture, catalogue } = await createV2Fixture();
  await assert.rejects(
    loadCodexLandingBatch({ batchRoot: fixture.root, batchId: fixture.batchId, expectedGitCommitSha: GIT_SHA, environment: {} }),
    /catalogue/i,
  );
  const loaded = await loadCodexLandingBatch({ batchRoot: fixture.root, batchId: fixture.batchId, expectedGitCommitSha: GIT_SHA, environment: {}, catalogueDirectory: catalogue.directory });
  assert.equal(loaded.manifest.schema_version, "CodexLandingBatchV2");

  const staleCatalogue = JSON.parse(await readFile(path.join(catalogue.directory, "catalogue.json"), "utf8"));
  staleCatalogue.references[0].captures.desktop.sha256 = "f".repeat(64);
  await writeFile(path.join(catalogue.directory, "catalogue.json"), JSON.stringify(staleCatalogue));
  await assert.rejects(
    loadCodexLandingBatch({ batchRoot: fixture.root, batchId: fixture.batchId, expectedGitCommitSha: GIT_SHA, environment: {}, catalogueDirectory: catalogue.directory }),
    /catalogue|capture|digest/i,
  );

  const staleTrace = await createV2Fixture((trace) => {
    trace.selected_references[0]!.desktop_capture_sha256 = "0".repeat(64);
  });
  await assert.rejects(
    loadCodexLandingBatch({ batchRoot: staleTrace.fixture.root, batchId: staleTrace.fixture.batchId, expectedGitCommitSha: GIT_SHA, environment: {}, catalogueDirectory: staleTrace.catalogue.directory }),
    /design trace|trace.*match/i,
  );
});

test("loads a complete exemplar from exact bytes and reads every JSON artifact once", async () => {
  const fixture = await createFixture();
  const reads = new Map<string, number>();
  const fileSystem: CodexBatchFileSystem = {
    readFile: async (filePath) => {
      reads.set(filePath, (reads.get(filePath) ?? 0) + 1);
      return readFile(filePath);
    },
    realpath,
    readdir: (directory) => readdir(directory, { withFileTypes: true }),
    lstat,
  };

  const loaded = await loadCodexLandingBatch({
    batchRoot: fixture.root,
    batchId: IDS.batch,
    expectedGitCommitSha: GIT_SHA,
    environment: {},
    fileSystem,
  });

  assert.equal(loaded.manifest.batch_id, IDS.batch);
  assert.equal(loaded.productPack.affiliate.original_url, "https://try.elevenlabs.io/izj2b165mcsj?ref=exact");
  assert.equal(loaded.pages[0]?.blueprint.metadata.motion_profile, "gsap_editorial");
  assert.equal(loaded.quality.status, "pass");
  assert.equal(loaded.artifacts.length, 10);
  assert.deepEqual([...reads.values()], Array(10).fill(1));
});

test("rejects contradictory, incomplete, and stale quality receipts", async () => {
  const failed = await createFixture({
    mutateQuality: (quality) => {
      (quality.scanners as Array<{ name: string; status: string }>)[0]!.status = "fail";
      quality.status = "fail";
      quality.gate_status = "fail";
    },
  });
  const failedLoaded = await loadCodexLandingBatch({
    batchRoot: failed.root,
    batchId: failed.batchId,
    expectedGitCommitSha: GIT_SHA,
    environment: {},
  });
  assert.equal(failedLoaded.quality.status, "fail");

  const contradictory = await createFixture({
    mutateQuality: (quality) => {
      (quality.scanners as Array<{ name: string; status: string }>)[0]!.status = "fail";
    },
  });
  await assert.rejects(
    loadCodexLandingBatch({ batchRoot: contradictory.root, batchId: contradictory.batchId, expectedGitCommitSha: GIT_SHA, environment: {} }),
    /quality.*receipt|scanner.*status|status.*scanner/i,
  );

  const missingScanner = await createFixture({
    mutateQuality: (quality) => {
      quality.scanners = (quality.scanners as unknown[]).slice(1);
    },
  });
  await assert.rejects(
    loadCodexLandingBatch({ batchRoot: missingScanner.root, batchId: missingScanner.batchId, expectedGitCommitSha: GIT_SHA, environment: {} }),
    /quality.*receipt|scanner/i,
  );

  const stale = await createFixture();
  const staleDraft = makeBlueprint();
  staleDraft.hero.headline = "A changed draft must invalidate its original quality receipt.";
  const staleDraftBytes = toJsonBytes(staleDraft);
  const staleDraftReference = artifactReferenceFromBytes(staleDraftBytes);
  staleDraftReference.path = `drafts/${SLUG}.json`;
  stale.manifest.pages[0]!.artifact = staleDraftReference;
  await writeFile(path.join(stale.batchDirectory, "drafts", `${SLUG}.json`), staleDraftBytes);
  await writeFile(path.join(stale.batchDirectory, "manifest.json"), toJsonBytes(stale.manifest));
  await assert.rejects(
    loadCodexLandingBatch({ batchRoot: stale.root, batchId: stale.batchId, expectedGitCommitSha: GIT_SHA, environment: {} }),
    /quality.*digest|input.*artifact.*digest/i,
  );
});

test("uses the default generated-batch root and routes all runtime filesystem access through the injected adapter", async () => {
  const fixture = await createFixture();
  const defaultRoot = path.join(process.cwd(), "src", "generated", "landing-page-batches");
  const calls = {
    readFile: 0,
    realpath: [] as string[],
    readdir: 0,
    lstat: 0,
  };
  const mapDefaultPathToFixture = (filePath: string) => {
    const relativePath = path.relative(defaultRoot, filePath);
    const isInsideDefaultRoot = relativePath === ""
      || (!relativePath.startsWith(`..${path.sep}`) && relativePath !== ".." && !path.isAbsolute(relativePath));
    return isInsideDefaultRoot ? path.join(fixture.root, relativePath) : filePath;
  };
  const fileSystem = {
    readFile: async (filePath: string) => {
      calls.readFile += 1;
      return readFile(filePath);
    },
    realpath: async (filePath: string) => {
      calls.realpath.push(filePath);
      return realpath(mapDefaultPathToFixture(filePath));
    },
    readdir: async (directory: string) => {
      calls.readdir += 1;
      return readdir(directory, { withFileTypes: true });
    },
    lstat: async (filePath: string) => {
      calls.lstat += 1;
      return lstat(filePath);
    },
  };

  const loaded = await loadCodexLandingBatch({
    batchId: IDS.batch,
    expectedGitCommitSha: GIT_SHA,
    environment: {},
    fileSystem,
  });

  assert.equal(loaded.batchDirectory, fixture.batchDirectory);
  assert.deepEqual(calls.realpath.slice(0, 2), [defaultRoot, path.join(defaultRoot, IDS.batch)]);
  assert.equal(calls.readFile, 10);
  assert.ok(calls.readdir > 0, "expected exact-workspace traversal to use the injected readdir");
  assert.ok(calls.lstat > 0, "expected exact-workspace traversal to use the injected lstat");
});

test("keeps byte hashes distinct from canonical JSON digests for BOM, CRLF, and files over 32KB", async () => {
  const fixture = await createFixture({
    productPack: makeProductPack("x".repeat(34_000)),
    productPackEncoding: { bom: true, crlf: true },
  });
  const loaded = await loadCodexLandingBatch({
    batchRoot: fixture.root,
    batchId: IDS.batch,
    expectedGitCommitSha: GIT_SHA,
    environment: {},
  });
  const productArtifact = loaded.artifacts.find((artifact) => artifact.path === "product-pack.json");
  assert.ok(productArtifact);
  assert.ok(productArtifact.byte_length > 32_000);
  assert.notEqual(productArtifact.byte_sha256, productArtifact.canonical_json_sha256);
  assert.equal(productArtifact.byte_sha256, fixture.manifest.product_pack.byte_sha256);
});

test("fails closed on a referenced byte-hash mismatch", async () => {
  const fixture = await createFixture({
    mutateManifest: (manifest) => { manifest.pages[0].artifact.byte_sha256 = "f".repeat(64); },
  });
  await assert.rejects(
    loadCodexLandingBatch({ batchRoot: fixture.root, batchId: IDS.batch, expectedGitCommitSha: GIT_SHA, environment: {} }),
    /byte hash mismatch/i,
  );
});

test("rejects traversal, backslashes, drive paths, and duplicate referenced paths", async () => {
  for (const unsafePath of ["../escape.json", "drafts\\escape.json", "C:/escape.json", "//server/share.json", "drafts/../escape.json", "drafts/\u0000.json"]) {
    const fixture = await createFixture({
      mutateManifest: (manifest) => { manifest.pages[0].artifact.path = unsafePath; },
    });
    await assert.rejects(
      loadCodexLandingBatch({ batchRoot: fixture.root, batchId: IDS.batch, expectedGitCommitSha: GIT_SHA, environment: {} }),
      /path|relative|safe|NUL|reference/i,
      unsafePath,
    );
  }

  const duplicate = await createFixture({
    mutateManifest: (manifest) => { manifest.pages[0].intent = { ...manifest.pages[0].artifact }; },
  });
  await assert.rejects(
    loadCodexLandingBatch({ batchRoot: duplicate.root, batchId: IDS.batch, expectedGitCommitSha: GIT_SHA, environment: {} }),
    /duplicate.*path|path.*duplicate/i,
  );
});

test("rejects an artifact symlink that resolves outside the batch root", async (t) => {
  const fixture = await createFixture();
  const outside = path.join(fixture.root, "outside.json");
  await writeFile(outside, toJsonBytes(makeBlueprint()));
  const draftPath = path.join(fixture.batchDirectory, "drafts", `${SLUG}.json`);
  try {
    await writeFile(draftPath, "");
    await import("node:fs/promises").then(({ unlink }) => unlink(draftPath));
    await symlink(outside, draftPath, "file");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EPERM") {
      t.skip("Windows symlink privilege is unavailable in this environment.");
      return;
    }
    throw error;
  }
  await assert.rejects(
    loadCodexLandingBatch({ batchRoot: fixture.root, batchId: IDS.batch, expectedGitCommitSha: GIT_SHA, environment: {} }),
    /outside.*batch|escapes.*batch|symlink/i,
  );
});

test("deterministically rejects an escaping symlink even when Windows cannot create one", async () => {
  const fixture = await createFixture();
  const draftPath = path.join(fixture.batchDirectory, "drafts", `${SLUG}.json`);
  const outsidePath = path.join(fixture.root, "outside.json");
  const fileSystem: CodexBatchFileSystem = {
    readFile,
    realpath: async (filePath) => path.normalize(filePath) === path.normalize(draftPath)
      ? outsidePath
      : realpath(filePath),
    readdir: (directory) => readdir(directory, { withFileTypes: true }),
    lstat,
  };
  await assert.rejects(
    loadCodexLandingBatch({
      batchRoot: fixture.root,
      batchId: IDS.batch,
      expectedGitCommitSha: GIT_SHA,
      environment: {},
      fileSystem,
    }),
    /outside.*batch|escapes.*batch|symlink/i,
  );
});

test("rejects raw generated owner, publication, link, compliance, and asset approval claims before schema stripping", async () => {
  for (const [field, value] of [
    ["owner_approved", true],
    ["publication_status", "published"],
    ["active_link_state", "active"],
    ["compliance_approved", true],
    ["asset_approved", true],
  ] as const) {
    const fixture = await createFixture({
      mutateDraft: (draft) => { draft.generated_assertion = { [field]: value }; },
    });
    await assert.rejects(
      loadCodexLandingBatch({ batchRoot: fixture.root, batchId: IDS.batch, expectedGitCommitSha: GIT_SHA, environment: {} }),
      /self-attest|forbidden generated state|approval|publication|active link/i,
      field,
    );
  }
});

test("treats the manifest Git SHA as a source baseline instead of an impossible self-containing deployment SHA", async () => {
  const fixture = await createFixture();
  const loaded = await loadCodexLandingBatch({
    batchRoot: fixture.root,
    batchId: IDS.batch,
    environment: {
      VERCEL_GIT_COMMIT_SHA: "f".repeat(40),
      GITHUB_SHA: "e".repeat(40),
    },
  });
  assert.equal(loaded.manifest.git_commit_sha, GIT_SHA);

  await assert.rejects(
    loadCodexLandingBatch({
      batchRoot: fixture.root,
      batchId: IDS.batch,
      expectedGitCommitSha: "f".repeat(40),
      environment: {},
    }),
    /source.*commit|manifest.*commit/i,
  );
});

test("rejects unreferenced files so the versioned batch workspace is exact", async () => {
  const fixture = await createFixture();
  await writeFile(path.join(fixture.batchDirectory, "drafts", "stale-unreferenced.json"), toJsonBytes(makeBlueprint()));
  await assert.rejects(
    loadCodexLandingBatch({ batchRoot: fixture.root, batchId: IDS.batch, expectedGitCommitSha: GIT_SHA, environment: {} }),
    /unexpected|unreferenced|workspace/i,
  );
});

test("requires exactly three candidates in a calibration wave", async () => {
  const fixture = await createFixture({ batchType: "calibration" });
  await assert.rejects(
    loadCodexLandingBatch({ batchRoot: fixture.root, batchId: IDS.batch, expectedGitCommitSha: GIT_SHA, environment: {} }),
    /exactly three|calibration.*three/i,
  );
});

test("enforces exemplar, calibration, and production-candidate progression", async () => {
  const invalidCalibration = await createFixture({
    batchType: "calibration",
    mutateManifest: (manifest) => { manifest.progression.exemplar_gate_status = "fail"; },
  });
  await assert.rejects(
    loadCodexLandingBatch({ batchRoot: invalidCalibration.root, batchId: IDS.batch, expectedGitCommitSha: GIT_SHA, environment: {} }),
    /passing exemplar|exemplar.*pass|progression/i,
  );

  const invalidProduction = await createFixture({
    batchType: "production_candidate",
    mutateManifest: (manifest) => { delete manifest.progression.calibration_retro_sha256; },
  });
  await assert.rejects(
    loadCodexLandingBatch({ batchRoot: invalidProduction.root, batchId: IDS.batch, expectedGitCommitSha: GIT_SHA, environment: {} }),
    /calibration.*retro|progression/i,
  );
});

test("calibration progression requires the referenced exemplar retro to actually pass", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "codex-landing-exemplar-retro-"));
  const exemplarId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const exemplar = await createFixture({
    root,
    batchId: exemplarId,
    batchType: "exemplar",
    mutateRetro: (retro) => { retro.status = "fail"; },
    mutateManifest: (manifest) => { manifest.retro.gate_status = "fail"; },
  });
  const exemplarManifest = JSON.parse(await readFile(path.join(exemplar.batchDirectory, "manifest.json"), "utf8"));
  const exemplarRetro = JSON.parse(await readFile(path.join(exemplar.batchDirectory, "retro.json"), "utf8"));
  const calibration = await createFixture({
    root,
    batchType: "calibration",
    pageCount: 3,
    progression: {
      stage: "calibration",
      exemplar_batch_id: exemplarId,
      exemplar_manifest_sha256: sha256(canonicalJson(exemplarManifest)),
      exemplar_gate_status: "pass",
      exemplar_retro_sha256: sha256(canonicalJson(exemplarRetro)),
      exemplar_retro_status: "pass",
    },
  });

  await assert.rejects(
    loadCodexLandingBatch({ batchRoot: root, batchId: calibration.batchId, expectedGitCommitSha: GIT_SHA, environment: {} }),
    /exemplar.*retro.*pass/i,
  );
});

test("loads and verifies the actual exemplar to calibration to production predecessor chain", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "codex-landing-progression-"));
  const exemplarId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const calibrationId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  const artifactCanonicalSha = async (filePath: string) => {
    const value = JSON.parse(await readFile(filePath, "utf8"));
    return sha256(canonicalJson(value));
  };

  const exemplar = await createFixture({ root, batchId: exemplarId, batchType: "exemplar", pageCount: 1 });
  const exemplarManifestSha = await artifactCanonicalSha(path.join(exemplar.batchDirectory, "manifest.json"));
  const exemplarRetroSha = await artifactCanonicalSha(path.join(exemplar.batchDirectory, "retro.json"));
  const calibration = await createFixture({
    root,
    batchId: calibrationId,
    batchType: "calibration",
    pageCount: 3,
    progression: {
      stage: "calibration",
      exemplar_batch_id: exemplarId,
      exemplar_manifest_sha256: exemplarManifestSha,
      exemplar_gate_status: "pass",
      exemplar_retro_sha256: exemplarRetroSha,
      exemplar_retro_status: "pass",
    },
  });
  const calibrationManifestSha = await artifactCanonicalSha(path.join(calibration.batchDirectory, "manifest.json"));
  const calibrationRetroSha = await artifactCanonicalSha(path.join(calibration.batchDirectory, "retro.json"));
  const production = await createFixture({
    root,
    batchId: IDS.batch,
    batchType: "production_candidate",
    pageCount: 2,
    progression: {
      stage: "production_candidate",
      calibration_batch_id: calibrationId,
      calibration_manifest_sha256: calibrationManifestSha,
      calibration_gate_status: "pass",
      calibration_retro_sha256: calibrationRetroSha,
      calibration_retro_status: "pass",
    },
  });

  const loaded = await loadCodexLandingBatch({
    batchRoot: root,
    batchId: production.batchId,
    expectedGitCommitSha: GIT_SHA,
    environment: {},
  });
  assert.equal(loaded.manifest.batch_type, "production_candidate");
  assert.equal(loaded.pages.length, 2);
});

test("accepts explicit unknown program rules without turning the pack into approval", async () => {
  const pack = makeProductPack();
  const programRules = pack.program_rules as {
    state: "documented" | "unknown";
    required_disclosure: string | null;
    rules: Array<{ name: string; value: "allowed" | "disallowed" | "unknown"; usage_notes: string }>;
    unknown_reason: string | null;
  };
  programRules.state = "unknown";
  programRules.required_disclosure = null;
  programRules.rules = [];
  programRules.unknown_reason = "The operator has not supplied the current program terms.";
  const fixture = await createFixture({ productPack: pack });
  const loaded = await loadCodexLandingBatch({
    batchRoot: fixture.root,
    batchId: IDS.batch,
    expectedGitCommitSha: GIT_SHA,
    environment: {},
  });
  assert.equal(loaded.productPack.program_rules.state, "unknown");
});

test("builds a deterministic immutable packet without approval or publication state", async () => {
  const fixture = await createFixture();
  const first = await buildCodexLandingBatchPacket({
    batchRoot: fixture.root,
    batchId: IDS.batch,
    expectedGitCommitSha: GIT_SHA,
    environment: {},
  });
  const second = await buildCodexLandingBatchPacket({
    batchRoot: fixture.root,
    batchId: IDS.batch,
    expectedGitCommitSha: GIT_SHA,
    environment: {},
  });

  assert.equal(first.packet_sha256, second.packet_sha256);
  assert.deepEqual(first.packet_bytes, second.packet_bytes);
  const packetText = first.packet_bytes.toString("utf8");
  const packet = JSON.parse(packetText);
  assert.equal(packet.schema_version, "CodexLandingBatchPacketV1");
  assert.equal(packet.batch_id, IDS.batch);
  assert.equal(packet.artifacts.length, 10);
  assert.doesNotMatch(packetText, /owner_approved|publication_status|active_link_state|compliance_approved|asset_approved/);
});

test("keeps the server packet builder free of CLI filesystem packaging", async () => {
  const packagerSource = await readFile(path.join(process.cwd(), "src", "lib", "codex-batches", "packager.ts"), "utf8");
  assert.doesNotMatch(packagerSource, /node:fs\/promises|node:path|packageCodexLandingBatch|process\.cwd/);

  const cliPackagerSource = await readFile(path.join(process.cwd(), "src", "lib", "codex-batches", "cli-packager.ts"), "utf8");
  assert.match(cliPackagerSource, /node:fs\/promises/);
  assert.match(cliPackagerSource, /buildCodexLandingBatchPacket/);

  const cliScriptSource = await readFile(path.join(process.cwd(), "scripts", "package-codex-landing-batch.ts"), "utf8");
  assert.match(cliScriptSource, /cli-packager/);
});
