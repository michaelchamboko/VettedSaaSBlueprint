import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";

import { auditDesignReferenceRegistry } from "../src/lib/design-references/audit";
import { classifyDesignReferenceSnapshot } from "../src/lib/design-references/classifier";
import { createDesignReference, type DesignReferenceV1 } from "../src/lib/design-references/contracts";
import { compressReferenceCapture, measureReferencePage, sameRegistrableDomain } from "../src/lib/design-references/playwright-audit";
import { selectDesignReferences } from "../src/lib/design-references/selector";
import { DesignReferenceSourceRegistryV1, resetUnavailableSources } from "../src/lib/design-references/source-registry";

const source = {
  id: "lp-ref-0001",
  ordinal: 1,
  name: "Example",
  source_url: "https://example.com",
};

const viewport = (overrides: Record<string, unknown> = {}) => ({
  width: 1440,
  height: 900,
  title: "Example product workspace",
  description: "Plan projects, collaborate and ship work.",
  resolved_url: "https://example.com/",
  response_status: 200,
  document_width: 1440,
  body_font_family: "Example Sans",
  body_font_size: 16,
  heading: {
    text: "Plan work without the busywork",
    x: 96,
    y: 160,
    width: 560,
    height: 140,
    font_family: "Example Sans",
    font_size: 68,
    font_weight: 750,
    text_align: "left",
  },
  media: [{ tag: "img", x: 820, y: 130, width: 510, height: 520 }],
  ctas: [{ text: "Start free", x: 96, y: 360, width: 132, height: 44 }],
  sections: [
    { heading: "How it works", text: "Connect, configure, and publish.", y: 950, columns: 3, item_count: 3, has_details: false, has_cta: false, text_align: "left" },
    { heading: "Customer results", text: "Stories from teams using the product.", y: 1500, columns: 2, item_count: 4, has_details: false, has_cta: false, text_align: "left" },
  ],
  navigation: { height: 72, line_count: 1 },
  animations: [{ duration_ms: 600, properties: ["transform", "opacity"] }],
  visible_text_length: 900,
  ...overrides,
});

test("the supplied source registry preserves exactly 100 stable ordered IDs and URLs", async () => {
  const registryPath = path.join(process.cwd(), "docs", "design-references", "landing-pages", "sources.json");
  const registry = DesignReferenceSourceRegistryV1.parse(JSON.parse(await readFile(registryPath, "utf8")));
  assert.equal(registry.sources.length, 100);
  assert.equal(registry.sources[0].id, "lp-ref-0001");
  assert.equal(registry.sources[99].id, "lp-ref-0100");
  assert.deepEqual(registry.sources.map((item) => item.ordinal), Array.from({ length: 100 }, (_, index) => index + 1));
  assert.equal(new Set(registry.sources.map((item) => item.source_url)).size, 100);
  assert.equal(registry.sources[0].source_url, "https://www.notion.com");
  assert.equal(registry.sources[99].source_url, "https://www.producthunt.com");
});

test("classification records only section semantics supported by visible headings", () => {
  const result = classifyDesignReferenceSnapshot({
    source,
    captured_at: "2026-07-14T00:00:00.000Z",
    desktop: viewport(),
    mobile: viewport({ width: 390, height: 844, document_width: 390, media: [{ tag: "img", x: 16, y: 460, width: 358, height: 300 }] }),
    reduced_motion: { animation_count: 0, visible_text_length: 900 },
  });
  assert.equal(result.status, "active");
  if (result.status !== "active") return;
  assert.deepEqual(result.reference.observations.sections.map((section) => section.key), ["how_it_works", "proof_blocks"]);
  assert.ok(!result.reference.observations.sections.some((section) => section.key === "faq"));
  assert.ok(result.reference.classification?.axes.section_order.evidence.some((item) => item.includes("How it works")));
});

test("low-confidence or challenged pages remain unavailable without fabricated observations", () => {
  const result = classifyDesignReferenceSnapshot({
    source,
    captured_at: "2026-07-14T00:00:00.000Z",
    desktop: viewport({ title: "Just a moment", description: "", heading: null, ctas: [], sections: [], visible_text_length: 20 }),
    mobile: viewport({ width: 390, height: 844, title: "Just a moment", description: "", heading: null, ctas: [], sections: [], visible_text_length: 20 }),
    reduced_motion: { animation_count: 0, visible_text_length: 20 },
  });
  assert.deepEqual(result, {
    status: "unavailable",
    failure_reason: "bot_challenge",
    resolved_url: "https://example.com/",
    response_status: 200,
  });
});

const allSectionObservations = [
  { key: "problem_solution", family: "split_editorial", composition_notes: "Observed problem framing." },
  { key: "benefits", family: "numbered_ledger", composition_notes: "Observed benefits ledger." },
  { key: "proof_blocks", family: "proof_strip", composition_notes: "Observed proof strip." },
  { key: "how_it_works", family: "process_timeline", composition_notes: "Observed process timeline." },
  { key: "limitations", family: "decision_matrix", composition_notes: "Observed decision limits." },
  { key: "objection_handling", family: "objection_accordion", composition_notes: "Observed objection handling." },
  { key: "faq", family: "alternating_story", composition_notes: "Observed question sequence." },
  { key: "closing_cta", family: "closing_manifesto", composition_notes: "Observed closing action." },
] as const;

function partialReference(id: number, sectionIndexes: number[]): DesignReferenceV1 {
  const referenceId = `lp-ref-${String(id).padStart(4, "0")}`;
  const sections = sectionIndexes.map((index) => allSectionObservations[index]);
  return createDesignReference({
    id: referenceId,
    source_url: `https://example${id}.com`,
    captured_at: "2026-07-14T00:00:00.000Z",
    captures: {
      desktop: { path: `captures/${referenceId}/desktop.webp`, sha256: "a".repeat(64), byte_size: 100 },
      mobile: { path: `captures/${referenceId}/mobile.webp`, sha256: "b".repeat(64), byte_size: 100 },
    },
    usage_status: "active",
    usage_scope: "internal_only",
    primary_product_category: "analytics",
    category_tags: ["analytics", "data-tools"],
    observations: {
      hero: { variant: "asymmetric_split", composition: "Split", alignment: "Left", media_strategy: "Right" },
      typography: { pair: "space_grotesk_dm_sans", display_style: "Geometric", body_style: "Sans", scale: "Large", weight_contrast: "800/400" },
      sections: [...sections],
      cta: { variant: "inline_decision", placement: "Hero", label_pattern: "Verb", interaction: "Solid" },
      motion: { variant: "quiet_stagger", triggers: "Load", intensity: "Quiet", reduced_motion_behavior: "Static" },
      mobile: { strategy: "copy_first", stacking: "Copy", navigation: "Compact", cta_behavior: "Inline", overflow_behavior: "Contained" },
    },
    supported_variant_tags: {
      hero: ["asymmetric_split"],
      typography: ["space_grotesk_dm_sans"],
      section_variants: sections.map((section) => section.family),
      cta: ["inline_decision"],
      motion: ["quiet_stagger"],
      mobile: ["copy_first"],
    },
    reusable_principles: ["Reuse the abstract hierarchy only."],
    prohibited_copy_notes: ["Do not copy branding or content."],
  });
}

test("selection succeeds with partial section observations and requires all seven presentation axes", () => {
  const complete = selectDesignReferences({
    catalogue: { schema_version: "DesignReferenceCatalogueV1", references: [partialReference(1, [0, 1, 2]), partialReference(2, [3, 4, 5]), partialReference(3, [6, 7])] },
    product_category: "analytics",
    buyer_decision: "choose an analytics platform",
  });
  assert.equal(complete.status, "selected");
  if (complete.status === "selected") {
    assert.equal(complete.recipe.section_order.length, 8);
    assert.ok(complete.recipe.fingerprint.length > 0);
    assert.equal(complete.design_direction.references.length, 3);
  }

  const missingAxis = selectDesignReferences({
    catalogue: { schema_version: "DesignReferenceCatalogueV1", references: [
      { ...partialReference(1, [0, 1, 2]), supported_variant_tags: { ...partialReference(1, [0, 1, 2]).supported_variant_tags, hero: [], typography: [], section_variants: [], cta: [], motion: [], mobile: [] } },
      { ...partialReference(2, [3, 4, 5]), supported_variant_tags: { ...partialReference(2, [3, 4, 5]).supported_variant_tags, hero: [], typography: [], section_variants: [], cta: [], motion: [], mobile: [] } },
      { ...partialReference(3, [6, 7]), supported_variant_tags: { ...partialReference(3, [6, 7]).supported_variant_tags, hero: [], typography: [], section_variants: [], cta: [], motion: [], mobile: [] } },
    ] },
    product_category: "analytics",
    buyer_decision: "choose an analytics platform",
  });
  assert.equal(missingAxis.status, "hold_for_design_direction");
});

test("audit processes ten-site waves with bounded concurrency and retains unavailable sources", async () => {
  const registryPath = path.join(process.cwd(), "docs", "design-references", "landing-pages", "sources.json");
  const original = DesignReferenceSourceRegistryV1.parse(JSON.parse(await readFile(registryPath, "utf8")));
  const registry = DesignReferenceSourceRegistryV1.parse({
    ...original,
    updated_at: "2026-07-14T12:00:00.000Z",
    sources: original.sources.map((item) => ({
      ...item,
      audit: { status: "pending", audited_at: null, attempts: 0, resolved_url: null, response_status: null, failure_reason: null },
    })),
  });
  let concurrent = 0;
  let maxConcurrent = 0;
  const committedWaves: Array<{ wave: number; active: number }> = [];
  const result = await auditDesignReferenceRegistry({
    registry,
    batch_size: 10,
    concurrency: 4,
    now: () => new Date("2026-07-14T12:00:00.000Z"),
    adapter: {
      audit: async (item) => {
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await new Promise((resolve) => setTimeout(resolve, 1));
        concurrent--;
        const challenged = item.ordinal % 10 === 0;
        return {
          desktop: viewport(challenged ? { title: "Just a moment", description: "", heading: null, ctas: [], sections: [], visible_text_length: 20, resolved_url: `${item.source_url}/` } : { resolved_url: `${item.source_url}/` }),
          mobile: viewport(challenged ? { width: 390, height: 844, title: "Just a moment", description: "", heading: null, ctas: [], sections: [], visible_text_length: 20, resolved_url: `${item.source_url}/` } : { width: 390, height: 844, document_width: 390, resolved_url: `${item.source_url}/`, media: [{ tag: "img", x: 16, y: 460, width: 358, height: 300 }] }),
          reduced_motion: { animation_count: 0, visible_text_length: challenged ? 20 : 900 },
          desktop_capture: Buffer.from(`desktop-${item.id}`),
          mobile_capture: Buffer.from(`mobile-${item.id}`),
        };
      },
      close: async () => undefined,
    },
    commit_wave: async ({ wave, active }) => { committedWaves.push({ wave, active: active.length }); },
  });
  assert.equal(maxConcurrent, 4);
  assert.deepEqual(committedWaves, Array.from({ length: 10 }, (_, index) => ({ wave: index + 1, active: 9 })));
  assert.equal(result.summary.active_count, 90);
  assert.equal(result.summary.unavailable_count, 10);
  assert.equal(result.registry.sources.filter((item) => item.audit.status === "active").length, 90);
  assert.equal(result.registry.sources[9].audit.failure_reason, "bot_challenge");
});

test("capture compression emits exact-size WebP and rejects an impossible byte limit", async () => {
  const png = await sharp({ create: { width: 1440, height: 900, channels: 4, background: "#243447" } }).png().toBuffer();
  const webp = await compressReferenceCapture(png, { width: 1440, height: 900 });
  const metadata = await sharp(webp).metadata();
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.width, 1440);
  assert.equal(metadata.height, 900);
  assert.ok(webp.byteLength <= 2_000_000);
  await assert.rejects(compressReferenceCapture(png, { width: 1440, height: 900 }, 10), /2 MB|byte limit|compress/i);
});

test("redirect validation accepts same-site canonical hosts and blocks unrelated destinations", () => {
  assert.equal(sameRegistrableDomain("https://notion.com", "https://www.notion.com/product"), true);
  assert.equal(sameRegistrableDomain("https://www.forbes.com/advisor", "https://www.forbes.com/advisor/"), true);
  assert.equal(sameRegistrableDomain("https://example.com", "https://unrelated.example.net"), false);
});

test("page measurement primes the isolated browser context for tsx helper serialization", async () => {
  const evaluations: unknown[] = [];
  const expected = viewport();
  const page = {
    evaluate: async (expression: unknown) => {
      evaluations.push(expression);
      return typeof expression === "string" ? undefined : expected;
    },
  };
  const measured = await measureReferencePage(page as never, 200);
  assert.equal(measured, expected);
  assert.match(String(evaluations[0]), /__name/);
  assert.equal(typeof evaluations[1], "function");
});

test("the repository exposes the bounded reference-audit CLI command", async () => {
  const packageJson = JSON.parse(await readFile(path.join(process.cwd(), "package.json"), "utf8"));
  assert.equal(packageJson.scripts["landing:references:audit"], "tsx scripts/audit-design-references.ts");
  const cli = await import("../scripts/audit-design-references");
  assert.equal(typeof cli.runReferenceAuditCli, "function");
});

test("targeted retry resets only selected unavailable failure reasons", async () => {
  const registryPath = path.join(process.cwd(), "docs", "design-references", "landing-pages", "sources.json");
  const original = DesignReferenceSourceRegistryV1.parse(JSON.parse(await readFile(registryPath, "utf8")));
  const seeded = DesignReferenceSourceRegistryV1.parse({
    ...original,
    updated_at: "2026-07-14T00:00:00.000Z",
    sources: original.sources.map((item, index) => index === 0
      ? { ...item, audit: { status: "unavailable", audited_at: "2026-07-14T00:00:00.000Z", attempts: 1, resolved_url: null, response_status: null, failure_reason: "capture_invalid" } }
      : index === 1
        ? { ...item, audit: { status: "unavailable", audited_at: "2026-07-14T00:00:00.000Z", attempts: 1, resolved_url: "https://other.example", response_status: 302, failure_reason: "cross_domain_redirect" } }
        : item),
  });
  const retried = resetUnavailableSources(seeded, ["capture_invalid"]);
  assert.equal(retried.sources[0].audit.status, "pending");
  assert.equal(retried.sources[1].audit.status, "unavailable");
  assert.equal(retried.sources[1].audit.failure_reason, "cross_domain_redirect");
});

test("category classification: SaaS product page with customer reviews is not comparison-media", () => {
  const saasResult = classifyDesignReferenceSnapshot({
    source: { id: "lp-ref-test1", ordinal: 101, name: "DataDog", source_url: "https://datadoghq.com" },
    captured_at: "2026-07-14T00:00:00.000Z",
    desktop: {
      width: 1440, height: 900,
      title: "Cloud Monitoring as a Service",
      description: "Monitor your infrastructure and applications with Datadog.",
      resolved_url: "https://datadoghq.com/", response_status: 200, document_width: 1440,
      body_font_family: "Sans", body_font_size: 16,
      heading: { text: "Monitor Everything", x: 96, y: 160, width: 560, height: 140, font_family: "Sans", font_size: 64, font_weight: 700, text_align: "left" },
      media: [{ tag: "img", x: 820, y: 130, width: 510, height: 520 }],
      ctas: [{ text: "Start Free", x: 96, y: 360, width: 132, height: 44 }],
      sections: [
        { heading: "Customer Results", text: "See how teams use Datadog to improve uptime.", y: 950, columns: 2, item_count: 4, has_details: false, has_cta: false, text_align: "left" },
        { heading: "Features", text: "Dashboards, alerts, traces.", y: 1500, columns: 3, item_count: 6, has_details: false, has_cta: false, text_align: "left" },
        { heading: "Integrations", text: "Connect your stack.", y: 2200, columns: 2, item_count: 8, has_details: false, has_cta: false, text_align: "left" },
      ],
      navigation: { height: 72, line_count: 1 },
      animations: [{ duration_ms: 600, properties: ["transform", "opacity"] }],
      visible_text_length: 900,
    },
    mobile: {
      width: 390, height: 844, title: "Cloud Monitoring as a Service", description: "Monitor your infrastructure.",
      resolved_url: "https://datadoghq.com/", response_status: 200, document_width: 390,
      body_font_family: "Sans", body_font_size: 16,
      heading: { text: "Monitor Everything", x: 16, y: 100, width: 358, height: 100, font_family: "Sans", font_size: 32, font_weight: 700, text_align: "left" },
      media: [{ tag: "img", x: 16, y: 460, width: 358, height: 300 }],
      ctas: [{ text: "Start Free", x: 16, y: 400, width: 132, height: 44 }],
      sections: [
        { heading: "Customer Results", text: "See how teams use Datadog.", y: 700, columns: 1, item_count: 4, has_details: false, has_cta: false, text_align: "left" },
      ],
      navigation: null, animations: [], visible_text_length: 500,
    },
    reduced_motion: { animation_count: 0, visible_text_length: 900 },
  });
  assert.equal(saasResult.status, "active");
  if (saasResult.status === "active") {
    assert.notEqual(saasResult.reference.primary_product_category, "comparison-media");
  }
});

test("category classification: genuine editorial comparison page remains comparison-media", () => {
  const editorialResult = classifyDesignReferenceSnapshot({
    source: { id: "lp-ref-test2", ordinal: 102, name: "NerdWallet", source_url: "https://nerdwallet.com/credit-cards" },
    captured_at: "2026-07-14T00:00:00.000Z",
    desktop: {
      width: 1440, height: 900,
      title: "Best Credit Cards of 2026: Compare Top Rewards Cards",
      description: "Compare the best credit cards and find the right one for you. Expert reviews and ratings.",
      resolved_url: "https://nerdwallet.com/credit-cards", response_status: 200, document_width: 1440,
      body_font_family: "Serif", body_font_size: 18,
      heading: { text: "Best Credit Cards of 2026", x: 96, y: 160, width: 700, height: 120, font_family: "Serif", font_size: 52, font_weight: 700, text_align: "center" },
      media: [{ tag: "img", x: 370, y: 320, width: 700, height: 400 }],
      ctas: [{ text: "Compare Cards", x: 600, y: 760, width: 200, height: 48 }],
      sections: [
        { heading: "Compare Top Cards", text: "Side-by-side comparison of the best credit cards.", y: 950, columns: 3, item_count: 6, has_details: false, has_cta: true, text_align: "left" },
        { heading: "How We Rate", text: "Our expert methodology.", y: 1600, columns: 2, item_count: 3, has_details: false, has_cta: false, text_align: "left" },
        { heading: "Buying Guide", text: "How to choose the right card.", y: 2300, columns: 1, item_count: 5, has_details: false, has_cta: false, text_align: "left" },
      ],
      navigation: { height: 72, line_count: 1 },
      animations: [{ duration_ms: 400, properties: ["opacity"] }],
      visible_text_length: 1200,
    },
    mobile: {
      width: 390, height: 844, title: "Best Credit Cards of 2026", description: "Compare the best credit cards.",
      resolved_url: "https://nerdwallet.com/credit-cards", response_status: 200, document_width: 390,
      body_font_family: "Serif", body_font_size: 18,
      heading: { text: "Best Credit Cards of 2026", x: 16, y: 100, width: 358, height: 100, font_family: "Serif", font_size: 28, font_weight: 700, text_align: "center" },
      media: [{ tag: "img", x: 16, y: 240, width: 358, height: 250 }],
      ctas: [{ text: "Compare Cards", x: 100, y: 520, width: 190, height: 48 }],
      sections: [
        { heading: "Compare Top Cards", text: "Side-by-side comparison.", y: 620, columns: 1, item_count: 6, has_details: false, has_cta: true, text_align: "left" },
      ],
      navigation: null, animations: [], visible_text_length: 800,
    },
    reduced_motion: { animation_count: 0, visible_text_length: 1200 },
  });
  assert.equal(editorialResult.status, "active");
  if (editorialResult.status === "active") {
    assert.equal(editorialResult.reference.primary_product_category, "comparison-media");
  }
});

test("category classification: brand or domain name alone cannot force commerce, finance-hr, or comparison-media when visible evidence points elsewhere", () => {
  // Mercury is in knownFinanceHr, Magento is in knownCommerce, Forbes is in knownEditorial.
  // None of those brand tokens appear in any evidence-derived category regex, so the only
  // signal that can push the primary category toward finance-hr / commerce-payments /
  // comparison-media is the hard-coded brand-list weighting. The page copy deliberately
  // exposes only a single weak developer-tools signal ("dev ") and no finance-hr, commerce,
  // or editorial/comparison evidence, and avoids the isProductPage tokens so the brand
  // category is not neutralized by the product-page penalty. With the brand list removed,
  // developer-tools (3) must win; with the brand list present, the brand category (4-5)
  // overrides the evidence.
  const developerSignals = {
    title: "Home",
    description: "Lightweight dev environment for solo builders.",
    sections: [
      { heading: "How it works", text: "Connect, configure, and publish.", y: 950, columns: 3, item_count: 3, has_details: false, has_cta: false, text_align: "left" },
      { heading: "Customer results", text: "Stories from teams using the platform.", y: 1500, columns: 2, item_count: 4, has_details: false, has_cta: false, text_align: "left" },
    ],
    visible_text_length: 600,
  };
  const mobile = viewport({ width: 390, height: 844, document_width: 390, media: [{ tag: "img", x: 16, y: 460, width: 358, height: 300 }], visible_text_length: 500 });

  const mercuryResult = classifyDesignReferenceSnapshot({
    source: { id: "lp-ref-test-mercury", ordinal: 901, name: "Mercury", source_url: "https://mercury.com" },
    captured_at: "2026-07-14T00:00:00.000Z",
    desktop: viewport(developerSignals),
    mobile,
    reduced_motion: { animation_count: 0, visible_text_length: 600 },
  });
  assert.equal(mercuryResult.status, "active");
  if (mercuryResult.status === "active") {
    assert.notEqual(
      mercuryResult.reference.primary_product_category,
      "finance-hr",
      "Mercury brand list must not force finance-hr classification when developer evidence is present.",
    );
  }

  const magentoResult = classifyDesignReferenceSnapshot({
    source: { id: "lp-ref-test-magento", ordinal: 902, name: "Magento", source_url: "https://magento.com" },
    captured_at: "2026-07-14T00:00:00.000Z",
    desktop: viewport({ ...developerSignals }),
    mobile,
    reduced_motion: { animation_count: 0, visible_text_length: 600 },
  });
  assert.equal(magentoResult.status, "active");
  if (magentoResult.status === "active") {
    assert.notEqual(
      magentoResult.reference.primary_product_category,
      "commerce-payments",
      "Magento brand list must not force commerce-payments classification when developer evidence is present.",
    );
  }

  const forbesResult = classifyDesignReferenceSnapshot({
    source: { id: "lp-ref-test-forbes", ordinal: 903, name: "Forbes", source_url: "https://forbes.com" },
    captured_at: "2026-07-14T00:00:00.000Z",
    desktop: viewport({ ...developerSignals }),
    mobile,
    reduced_motion: { animation_count: 0, visible_text_length: 600 },
  });
  assert.equal(forbesResult.status, "active");
  if (forbesResult.status === "active") {
    assert.notEqual(
      forbesResult.reference.primary_product_category,
      "comparison-media",
      "Forbes brand list must not force comparison-media classification when developer evidence is present.",
    );
  }
});

test("category classification: commerce page mentioning API is not developer-tools", () => {
  const commerceResult = classifyDesignReferenceSnapshot({
    source: { id: "lp-ref-test3", ordinal: 103, name: "Shopify", source_url: "https://shopify.com" },
    captured_at: "2026-07-14T00:00:00.000Z",
    desktop: {
      width: 1440, height: 900,
      title: "Start Your Online Store Today",
      description: "Build your ecommerce store with Shopify. Start selling online with powerful tools and APIs.",
      resolved_url: "https://shopify.com/", response_status: 200, document_width: 1440,
      body_font_family: "Sans", body_font_size: 16,
      heading: { text: "Sell Online with Shopify", x: 96, y: 160, width: 500, height: 120, font_family: "Sans", font_size: 56, font_weight: 700, text_align: "left" },
      media: [{ tag: "img", x: 700, y: 140, width: 600, height: 480 }],
      ctas: [{ text: "Start Free Trial", x: 96, y: 380, width: 200, height: 48 }],
      sections: [
        { heading: "Features", text: "Everything you need to sell online including payment processing.", y: 900, columns: 3, item_count: 9, has_details: false, has_cta: false, text_align: "center" },
        { heading: "Customer Stories", text: "See how brands grow with Shopify.", y: 1600, columns: 2, item_count: 4, has_details: false, has_cta: false, text_align: "left" },
        { heading: "Pricing", text: "Start with a free trial.", y: 2300, columns: 1, item_count: 3, has_details: false, has_cta: true, text_align: "center" },
      ],
      navigation: { height: 72, line_count: 1 },
      animations: [{ duration_ms: 600, properties: ["transform", "opacity"] }],
      visible_text_length: 800,
    },
    mobile: {
      width: 390, height: 844, title: "Start Your Online Store Today", description: "Build your ecommerce store.",
      resolved_url: "https://shopify.com/", response_status: 200, document_width: 390,
      body_font_family: "Sans", body_font_size: 16,
      heading: { text: "Sell Online with Shopify", x: 16, y: 100, width: 358, height: 80, font_family: "Sans", font_size: 32, font_weight: 700, text_align: "left" },
      media: [{ tag: "img", x: 16, y: 400, width: 358, height: 280 }],
      ctas: [{ text: "Start Free Trial", x: 16, y: 340, width: 200, height: 48 }],
      sections: [
        { heading: "Features", text: "Everything you need to sell online.", y: 700, columns: 1, item_count: 9, has_details: false, has_cta: false, text_align: "center" },
      ],
      navigation: null, animations: [], visible_text_length: 500,
    },
    reduced_motion: { animation_count: 0, visible_text_length: 800 },
  });
  assert.equal(commerceResult.status, "active");
  if (commerceResult.status === "active") {
    assert.notEqual(commerceResult.reference.primary_product_category, "developer-tools");
  }
});
