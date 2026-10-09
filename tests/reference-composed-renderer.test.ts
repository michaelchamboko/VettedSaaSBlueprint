import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import type { PageBlueprint } from "../src/lib/schemas/contracts";
import { samplePageBlueprint } from "./fixtures/sample-page-blueprint";

const root = process.cwd();
const referenceComposedPath = path.join(root, "src", "components", "landing", "ReferenceComposedReviewPage.tsx");
const helperPath = path.join(root, "src", "lib", "landing", "reference-composed.ts");
const directReviewPath = path.join(root, "src", "components", "landing", "DirectReviewPage.tsx");
const motionPath = path.join(root, "src", "components", "landing", "LandingPageMotion.tsx");
const cssPath = path.join(root, "src", "app", "globals.css");
const layoutPath = path.join(root, "src", "app", "layout.tsx");

function source(filePath: string) {
  assert.ok(fs.existsSync(filePath), `expected ${path.relative(root, filePath)} to exist`);
  return fs.readFileSync(filePath, "utf8");
}

test("reference composed dispatch is isolated from editorial and legacy renderers", () => {
  const directReview = source(directReviewPath);
  const renderer = source(referenceComposedPath);

  assert.match(directReview, /design_profile === "reference_composed_v1"/);
  assert.match(directReview, /<ReferenceComposedReviewPage/);
  assert.match(directReview, /design_profile === "editorial_v2"/);
  assert.match(directReview, /<EditorialReviewPage/);
  assert.match(renderer, /throw new Error\("reference_composed_v1 pages require a presentation recipe\."\)/);
});

test("profile selection routes all three renderers while preview inputs stay reference-only", async () => {
  const directReview = source(directReviewPath);
  const { getDirectReviewRendererKind } = await import("../src/lib/landing/reference-composed");

  assert.equal(getDirectReviewRendererKind("legacy"), "legacy");
  assert.equal(getDirectReviewRendererKind("editorial_v2"), "editorial_v2");
  assert.equal(getDirectReviewRendererKind("reference_composed_v1"), "reference_composed_v1");
  assert.doesNotMatch(directReview, /if \(mode === "preview" && !affiliateUrlOverride\)/);
  const editorialBranch = directReview.match(/design_profile === "editorial_v2"\) \{([\s\S]*?)\r?\n  \}\r?\n  if \(blueprint\.metadata\.design_profile === "reference_composed_v1"/);
  assert.ok(editorialBranch);
  assert.match(editorialBranch[1], /affiliateUrlOverride=\{affiliateUrlOverride\}/);
  assert.match(directReview, /design_profile === "reference_composed_v1"[\s\S]*?<ReferenceComposedReviewPage[\s\S]*?mode=\{mode\}[\s\S]*?affiliateUrlOverride=\{affiliateUrlOverride\}/);
  assert.match(directReview, /const affiliateUrl = affiliateUrlOverride \?\?/);
});

test("section order preserves the recipe order while skipping empty optional collections", async () => {
  source(helperPath);
  const { getRenderableSectionOrder } = await import("../src/lib/landing/reference-composed");
  const presentation = {
    recipe_id: "recipe-0123456789abcdef",
    fingerprint: "0".repeat(64),
    hero: "asymmetric_split",
    typography: "fraunces_manrope",
    section_order: ["faq", "benefits", "proof_blocks", "problem_solution", "how_it_works", "limitations", "objection_handling", "closing_cta"],
    section_variants: {
      problem_solution: "split_editorial",
      benefits: "numbered_ledger",
      proof_blocks: "alternating_story",
      how_it_works: "proof_strip",
      limitations: "decision_matrix",
      objection_handling: "process_timeline",
      faq: "objection_accordion",
      closing_cta: "closing_manifesto",
    },
    cta: "inline_decision",
    motion: "quiet_stagger",
    mobile: "copy_first",
    design_dials: { design_variance: 5, motion_intensity: 3, visual_density: 5 },
    reference_ids: ["lp-ref-0001", "lp-ref-0002"],
  } satisfies NonNullable<PageBlueprint["presentation"]>;
  const blueprint = {
    ...samplePageBlueprint,
    proof_blocks: [],
    how_it_works: [],
    objection_handling: [],
    faq: [],
    presentation,
  };

  assert.deepEqual(getRenderableSectionOrder(blueprint), ["benefits", "problem_solution", "limitations", "closing_cta"]);
});

test("whitespace-only answer differences do not duplicate the reference hero copy", async () => {
  const renderer = source(referenceComposedPath);
  const { shouldRenderReferenceSubheadline } = await import("../src/lib/landing/reference-composed");

  assert.equal(shouldRenderReferenceSubheadline("A concise buyer answer.", "  A   concise\nbuyer answer.  "), false);
  assert.equal(shouldRenderReferenceSubheadline("A concise buyer answer.", "A distinct supporting point."), true);
  assert.match(renderer, /shouldRenderReferenceSubheadline\(answerSnippet, blueprint\.hero\.subheadline\)/);
});

test("renderer exposes every controlled recipe axis and four local font pairs", () => {
  const renderer = source(referenceComposedPath);
  const css = source(cssPath);
  for (const value of [
    "data-design-profile", "data-recipe-id", "data-fingerprint", "data-hero-variant", "data-typography-pair", "data-cta-variant", "data-motion-variant", "data-mobile-strategy",
  ]) assert.match(renderer, new RegExp(value));
  for (const value of [
    "fraunces_manrope", "archivo_source_sans", "dm_serif_instrument_sans", "space_grotesk_dm_sans",
  ]) assert.match(css, new RegExp(value));
});

test("all hero and section-family compositions have distinct selectors", () => {
  const css = source(cssPath);
  for (const value of [
    "asymmetric_split", "typographic_billboard", "editorial_sidebar", "proof_led", "media_first_offset", "problem_statement_stack",
    "split_editorial", "numbered_ledger", "alternating_story", "proof_strip", "decision_matrix", "process_timeline", "objection_accordion", "closing_manifesto",
  ]) assert.match(css, new RegExp(`data-(?:hero-variant|section-family)="${value}"`));
});

test("CTA and responsive styles prohibit sticky, fixed, gradients, and overlap", () => {
  const css = source(cssPath);
  const scoped = css.slice(css.indexOf(".landing-reference-composed"));
  assert.match(scoped, /white-space:\s*nowrap/);
  assert.match(scoped, /@media \(max-width: 767px\)/);
  assert.match(scoped, /@media \(max-width: 360px\)/);
  assert.match(scoped, /@media \(max-width: 320px\)/);
  assert.doesNotMatch(scoped, /position:\s*(?:fixed|sticky)/);
  assert.doesNotMatch(scoped, /gradient/i);
});

test("motion variants are root-scoped, reduced-motion safe, and cleanup GSAP context", () => {
  const motion = source(motionPath);
  for (const value of ["quiet_stagger", "split_reveal", "media_parallax", "line_wipe", "anchored_progress"]) assert.match(motion, new RegExp(value));
  assert.match(motion, /prefers-reduced-motion: reduce/);
  assert.match(motion, /gsap\.context/);
  assert.match(motion, /context\.revert\(\)/);
  assert.match(motion, /root\.querySelector/);
  assert.doesNotMatch(motion, /window\.addEventListener\(["']scroll/);
});

test("reference renderer uses the approved font, concise hero, and private visual metadata", () => {
  const renderer = source(referenceComposedPath);
  const css = source(cssPath);
  const layout = source(layoutPath);

  assert.match(layout, /@fontsource\/archivo-black\/latin-400\.css/);
  assert.match(css, /--font-reference-archivo-black:\s*"Archivo Black"/);
  assert.match(renderer, /showSubheadline/);
  assert.match(renderer, /throw new Error\("reference_composed_v1 pages require a hero answer snippet\."\)/);
  assert.match(renderer, /figcaption className="sr-only"/);
  assert.doesNotMatch(renderer, />Fit assessment</);
  const referenceRules = css.match(/[^{}]*\.landing-reference-composed[^{}]*\{[^{}]*\}/g) ?? [];
  assert.ok(referenceRules.length > 0);
  assert.doesNotMatch(referenceRules.join("\n"), /writing-mode:\s*vertical-rl/);
  assert.match(css, /font-size:\s*clamp\(62px, 10vw, 112px\)/);
});

test("reference previews can render a draft visual without treating it as production-approved", () => {
  const renderer = source(referenceComposedPath);

  assert.match(renderer, /mode === "preview" && visual\?\.approval_status === "draft"/);
  assert.match(renderer, /visual\?\.approval_status === "approved" && visual\.approved_by_owner/);
});

test("all 64 section-key and family combinations use the shared entry composition", () => {
  const renderer = source(referenceComposedPath);
  const css = source(cssPath);
  const sectionKeys = [
    "problem_solution", "benefits", "proof_blocks", "how_it_works",
    "limitations", "objection_handling", "faq", "closing_cta",
  ] as const;
  const sectionFamilies = [
    "split_editorial", "numbered_ledger", "alternating_story", "proof_strip",
    "decision_matrix", "process_timeline", "objection_accordion", "closing_manifesto",
  ] as const;
  const caseBoundaries = [...sectionKeys, "END"];
  const sectionSegments = new Map(sectionKeys.map((sectionKey, index) => {
    const start = renderer.indexOf(`case "${sectionKey}"`);
    const end = caseBoundaries[index + 1] === "END" ? renderer.indexOf("\n  }\n}\n\nexport function", start) : renderer.indexOf(`case "${caseBoundaries[index + 1]}"`, start);
    return [sectionKey, renderer.slice(start, end)] as const;
  }));
  const matrix = sectionKeys.flatMap((sectionKey) => sectionFamilies.map((family) => ({ sectionKey, family })));

  assert.equal(matrix.length, 64);
  for (const { sectionKey, family } of matrix) {
    assert.match(sectionSegments.get(sectionKey) ?? "", /landing-reference-composed__entry/, `${sectionKey} must emit shared entries for ${family}`);
    assert.match(css, new RegExp(`data-section-family="${family}"\\] \\.landing-reference-composed__entry`), `${family} must materially style entries from ${sectionKey}`);
  }
  assert.doesNotMatch(css, /data-section-family="[^"]+"\][^{\n]*(?:article|li|details)/);
});

test("interleaved mobile strategy explicitly orders intro, media, and decision content", () => {
  const renderer = source(referenceComposedPath);
  const css = source(cssPath);
  const scoped = css.slice(css.indexOf(".landing-reference-composed"));

  for (const className of ["hero-intro", "hero-media", "hero-decision"]) assert.match(renderer, new RegExp(className));
  assert.match(scoped, /data-mobile-strategy="interleaved"[^}]*\{[^}]*display:\s*grid[^}]*\}/);
  assert.match(scoped, /data-mobile-strategy="interleaved"[^}]*hero-intro[^}]*\{[^}]*order:\s*1/);
  assert.match(scoped, /data-mobile-strategy="interleaved"[^}]*hero-media[^}]*\{[^}]*order:\s*2/);
  assert.match(scoped, /data-mobile-strategy="interleaved"[^}]*hero-decision[^}]*\{[^}]*order:\s*3/);
});

test("proof strips and 320px CTAs preserve content and icon integrity", () => {
  const css = source(cssPath);
  const scoped = css.slice(css.indexOf(".landing-reference-composed"));

  assert.match(scoped, /data-section-family="proof_strip"[^}]*scroll-snap-type:\s*x mandatory/);
  assert.match(scoped, /landing-reference-composed__cta\s*\{[^}]*max-width:\s*100%[^}]*min-width:\s*0/);
  assert.match(scoped, /landing-reference-composed__cta-label\s*\{[^}]*flex:\s*1 1 auto[^}]*min-width:\s*0/);
  const labelRule = scoped.match(/\.landing-reference-composed__cta-label\s*\{([^}]*)\}/);
  assert.ok(labelRule);
  assert.doesNotMatch(labelRule[1], /overflow:\s*hidden|text-overflow:\s*ellipsis/);
  assert.match(labelRule[1], /white-space:\s*nowrap/);
  assert.match(scoped, /@media \(max-width: 320px\)\s*\{[\s\S]*?landing-reference-composed__cta\s*\{[^}]*width:\s*100%/);
  assert.doesNotMatch(scoped, /@media \(max-width: 320px\)[\s\S]*?landing-reference-composed__cta-arrow\s*\{[^}]*display:\s*none/);
});
