import assert from "node:assert/strict";
import { mkdtemp, mkdir, symlink, writeFile } from "node:fs/promises";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";

import {
  DesignDirectionV1,
  DesignReferenceCatalogueV1,
  DesignReferenceV1,
  PresentationRecipeV1,
  ReferenceSelectionHistoryV1,
  createDesignReference,
  createPresentationRecipe,
} from "../src/lib/design-references/contracts";
import { differingPresentationAxes } from "../src/lib/design-references/fingerprint";
import {
  selectDesignReferences,
  validateSelectionHistory,
} from "../src/lib/design-references/selector";
import { validateDesignReferenceCatalogueDirectory } from "../scripts/validate-design-reference-catalogue";
import { codexEditorialDraftSchema } from "../src/lib/codex-batches/contracts";
import { pageBlueprintSchema } from "../src/lib/schemas/contracts";
import { samplePageBlueprint } from "./fixtures/sample-page-blueprint";

const SHA = (digit: string) => digit.repeat(64);
const execFile = promisify(execFileCallback);
const sectionKeys = [
  "problem_solution", "benefits", "proof_blocks", "how_it_works",
  "limitations", "objection_handling", "faq", "closing_cta",
] as const;
const sectionFamilies = [
  "split_editorial", "numbered_ledger", "alternating_story", "proof_strip",
  "decision_matrix", "process_timeline", "objection_accordion", "closing_manifesto",
] as const;
const sectionVariants = {
  problem_solution: "split_editorial",
  benefits: "numbered_ledger",
  proof_blocks: "alternating_story",
  how_it_works: "proof_strip",
  limitations: "decision_matrix",
  objection_handling: "process_timeline",
  faq: "objection_accordion",
  closing_cta: "closing_manifesto",
} as const satisfies PresentationRecipeV1["section_variants"];

function reference(id: number, category = "crm-tools", overrides: Record<string, unknown> = {}) {
  return createDesignReference({
    id: `lp-ref-${String(id).padStart(4, "0")}`,
    source_url: `https://reference-${id}.example.com/page`,
    captured_at: "2026-07-14T08:00:00.000Z",
    captures: {
      desktop: { path: `captures/ref-${id}-desktop.webp`, sha256: SHA(String(id % 10)), byte_size: 1024 },
      mobile: { path: `captures/ref-${id}-mobile.webp`, sha256: SHA(String((id + 1) % 10)), byte_size: 512 },
    },
    usage_status: "active",
    usage_scope: "internal_only",
    primary_product_category: category,
    category_tags: [category, "sales"],
    observations: {
      hero: { variant: "asymmetric_split", composition: "Asymmetric editorial split", alignment: "left", media_strategy: "Offset product proof" },
      typography: { pair: "fraunces_manrope", display_style: "Serif display", body_style: "Neutral sans", scale: "High contrast", weight_contrast: "Strong" },
      sections: sectionKeys.map((key, index) => ({ key, family: sectionFamilies[index], composition_notes: "Evidence and copy are intentionally separated." })),
      cta: { variant: "inline_decision", placement: "hero and close", label_pattern: "Decision verb", interaction: "Inline disclosure" },
      motion: { variant: "quiet_stagger", triggers: "Viewport entry", intensity: "Subtle", reduced_motion_behavior: "Opacity only" },
      mobile: { strategy: "copy_first", stacking: "Copy before proof", navigation: "Condensed", cta_behavior: "Sticky close", overflow_behavior: "Clip decorative media" },
    },
    supported_variant_tags: {
      hero: ["asymmetric_split"],
      typography: ["fraunces_manrope"],
      section_variants: ["split_editorial", "numbered_ledger"],
      cta: ["inline_decision"],
      motion: ["quiet_stagger"],
      mobile: ["copy_first"],
    },
    reusable_principles: ["Use hierarchy rather than copied wording."],
    prohibited_copy_notes: ["Do not reuse source copy or claims."],
    ...overrides,
  });
}

function activeCaptures(captures: ReturnType<typeof reference>["captures"]) {
  assert.ok(captures.desktop, "Active fixture requires a desktop capture.");
  assert.ok(captures.mobile, "Active fixture requires a mobile capture.");
  return { desktop: captures.desktop, mobile: captures.mobile };
}

function recipe(overrides: Record<string, unknown> = {}) {
  return createPresentationRecipe({
    hero: "asymmetric_split",
    typography: "fraunces_manrope",
    section_order: [...sectionKeys],
    section_variants: sectionVariants,
    cta: "inline_decision",
    motion: "quiet_stagger",
    mobile: "copy_first",
    design_dials: { design_variance: 7, motion_intensity: 6, visual_density: 4 },
    reference_ids: ["lp-ref-0001", "lp-ref-0002", "lp-ref-0003"],
    ...overrides,
  });
}

function catalogue(...references: ReturnType<typeof reference>[]) {
  return DesignReferenceCatalogueV1.parse({ schema_version: "DesignReferenceCatalogueV1", references });
}

test("parses a strict, digest-verified reference catalogue and rejects invalid active captures", () => {
  const valid = reference(1);
  const captures = activeCaptures(valid.captures);
  assert.equal(DesignReferenceV1.parse(valid).entry_digest, valid.entry_digest);
  assert.throws(() => DesignReferenceV1.parse({ ...valid, entry_digest: SHA("f") }), /digest/i);
  assert.throws(() => createDesignReference({ ...valid, captures: { ...valid.captures, mobile: { ...captures.mobile, byte_size: 2_000_001 } } }), /2 MB|byte/i);
  assert.throws(() => catalogue(valid, { ...reference(2), id: valid.id }), /unique/i);
});

test("computes recipe fingerprints from exactly the seven presentation axes", () => {
  const first = recipe();
  const second = recipe({ reference_ids: ["lp-ref-0003", "lp-ref-0002", "lp-ref-0001"], design_dials: { design_variance: 9, motion_intensity: 2, visual_density: 8 } });
  assert.equal(first.fingerprint, second.fingerprint);
  assert.equal(first.recipe_id, `recipe-${first.fingerprint.slice(0, 16)}`);
  assert.equal(PresentationRecipeV1.parse(first).fingerprint, first.fingerprint);
  assert.deepEqual(differingPresentationAxes(first, recipe({ cta: "compact_utility", mobile: "media_first" })), ["cta", "mobile"]);
  assert.throws(() => PresentationRecipeV1.parse({ ...first, fingerprint: SHA("0") }), /fingerprint/i);
});

test("selects three eligible references, two only when their axes cover four, and otherwise holds", () => {
  const three = catalogue(reference(1), reference(2), reference(3));
  const selected = selectDesignReferences({ catalogue: three, product_category: "crm-tools", buyer_decision: "choose a CRM" });
  assert.equal(selected.status, "selected");
  assert.equal(selected.design_direction.references.length, 3);

  const twoReferences = catalogue(
    reference(1, "crm-tools", { supported_variant_tags: { hero: ["asymmetric_split"], typography: ["fraunces_manrope"], section_variants: [], cta: [], motion: [], mobile: [] } }),
    reference(2, "crm-tools", { supported_variant_tags: { hero: [], typography: [], section_variants: ["numbered_ledger"], cta: ["split_evidence"], motion: ["line_wipe"], mobile: ["copy_first"] } }),
  );
  const two = selectDesignReferences({ catalogue: twoReferences, product_category: "crm-tools", buyer_decision: "choose a CRM" });
  assert.equal(two.status, "selected");
  assert.equal(two.design_direction.references.length, 2);

  const hold = selectDesignReferences({ catalogue: catalogue(reference(1, "crm-tools", { supported_variant_tags: { hero: ["asymmetric_split"], typography: [], section_variants: [], cta: [], motion: [], mobile: [] } }), reference(2, "crm-tools", { supported_variant_tags: { hero: [], typography: ["fraunces_manrope"], section_variants: [], cta: [], motion: [], mobile: [] } })), product_category: "crm-tools", buyer_decision: "choose a CRM" });
  assert.deepEqual(hold, { status: "hold_for_design_direction", reasons: ["Two eligible references do not cover four unique design axes."] });
});

test("enforces reference reuse, combination, fingerprint, and sibling diversity history rules", () => {
  const current = recipe();
  const history = {
    active_wave: [{ draft_id: "wave-1", primary_reference_id: "lp-ref-0001", reference_ids: ["lp-ref-0001", "lp-ref-0002", "lp-ref-0003"], recipe: recipe({ hero: "proof_led" }) }],
    previous_drafts: [
      { draft_id: "old-1", primary_reference_id: "lp-ref-0002", reference_ids: ["lp-ref-0002", "lp-ref-0003"], recipe: recipe({ hero: "typographic_billboard" }) },
      { draft_id: "old-2", primary_reference_id: "lp-ref-0003", reference_ids: ["lp-ref-0001", "lp-ref-0002", "lp-ref-0003"], recipe: recipe({ hero: "editorial_sidebar" }) },
    ],
  };
  const failures = validateSelectionHistory({ history, reference_ids: current.reference_ids, primary_reference_id: "lp-ref-0001", recipe: current });
  assert.match(failures.join("\n"), /primary.*wave/i);
  assert.match(failures.join("\n"), /twice.*previous ten/i);
  assert.match(failures.join("\n"), /combination.*previous twenty/i);

  const repeatedFingerprint = validateSelectionHistory({ history: { active_wave: [], previous_drafts: [{ draft_id: "same", primary_reference_id: "lp-ref-0004", reference_ids: ["lp-ref-0004", "lp-ref-0005"], recipe: current }] }, reference_ids: ["lp-ref-0004", "lp-ref-0005", "lp-ref-0006"], primary_reference_id: "lp-ref-0006", recipe: current });
  assert.match(repeatedFingerprint.join("\n"), /fingerprint/i);
  const sibling = validateSelectionHistory({ history: { active_wave: [{ draft_id: "sibling", primary_reference_id: "lp-ref-0004", reference_ids: ["lp-ref-0004", "lp-ref-0005"], recipe: recipe({ hero: "proof_led" }) }], previous_drafts: [] }, reference_ids: ["lp-ref-0006", "lp-ref-0007", "lp-ref-0008"], primary_reference_id: "lp-ref-0006", recipe: recipe({ hero: "proof_led" }) });
  assert.match(sibling.join("\n"), /three.*axes/i);
});

test("validates a catalogue directory including capture hashes and Git LFS size guidance", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "design-reference-catalogue-"));
  await mkdir(path.join(directory, "references"));
  const valid = reference(1);
  const desktop = await sharp({ create: { width: 1440, height: 900, channels: 3, background: "#eee" } }).webp().toBuffer();
  const mobile = await sharp({ create: { width: 390, height: 844, channels: 3, background: "#eee" } }).webp().toBuffer();
  const crypto = await import("node:crypto");
  const item = createDesignReference({ ...valid, captures: {
    desktop: { path: `captures/${valid.id}/desktop.webp`, sha256: crypto.createHash("sha256").update(desktop).digest("hex"), byte_size: desktop.byteLength },
    mobile: { path: `captures/${valid.id}/mobile.webp`, sha256: crypto.createHash("sha256").update(mobile).digest("hex"), byte_size: mobile.byteLength },
  } });
  const itemCaptures = activeCaptures(item.captures);
  const catalogueValue = catalogue(item);
  await mkdir(path.join(directory, "captures", item.id), { recursive: true });
  await writeFile(path.join(directory, itemCaptures.desktop.path), desktop);
  await writeFile(path.join(directory, itemCaptures.mobile.path), mobile);
  await writeFile(path.join(directory, "references", `${item.id}.json`), JSON.stringify(item));
  await writeFile(path.join(directory, "catalogue.json"), JSON.stringify(catalogueValue));
  assert.deepEqual(await validateDesignReferenceCatalogueDirectory(directory), []);
  await writeFile(path.join(directory, itemCaptures.mobile.path), "mismatch");
  assert.match((await validateDesignReferenceCatalogueDirectory(directory)).join("\n"), /hash mismatch/i);
});

test("requires presentation only for reference-composed pages while preserving legacy and editorial contracts", () => {
  const legacy = pageBlueprintSchema.parse(samplePageBlueprint);
  assert.equal(legacy.metadata.design_profile, "legacy");
  assert.equal(legacy.presentation, undefined);
  assert.throws(() => pageBlueprintSchema.parse({ ...samplePageBlueprint, metadata: { ...samplePageBlueprint.metadata, design_profile: "reference_composed_v1" } }), /presentation/i);
  const composed = pageBlueprintSchema.parse({ ...samplePageBlueprint, metadata: { ...samplePageBlueprint.metadata, design_profile: "reference_composed_v1" }, presentation: recipe() });
  assert.equal(composed.presentation?.recipe_id, recipe().recipe_id);
  assert.throws(() => pageBlueprintSchema.parse({ ...samplePageBlueprint, presentation: recipe() }), /presentation/i);

  const editorial = codexEditorialDraftSchema.parse({ ...samplePageBlueprint, metadata: { ...samplePageBlueprint.metadata, design_profile: "editorial_v2", motion_profile: "gsap_editorial", robots: "noindex,nofollow" }, hero: { ...samplePageBlueprint.hero, answer_snippet: "one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty twenty-one twenty-two twenty-three twenty-four twenty-five twenty-six twenty-seven twenty-eight twenty-nine thirty thirty-one thirty-two thirty-three thirty-four thirty-five thirty-six thirty-seven thirty-eight thirty-nine forty" } });
  assert.equal(editorial.metadata.design_profile, "editorial_v2");
  assert.equal(codexEditorialDraftSchema.parse({ ...editorial, metadata: { ...editorial.metadata, design_profile: "reference_composed_v1" }, presentation: recipe() }).metadata.design_profile, "reference_composed_v1");
});

test("applies the 32-character no-arrow CTA boundary only to reference-composed pages", () => {
  const overlongArrowLabel = "A deliberately long CTA label ->";
  const compatibleBlueprint = (designProfile: "legacy" | "editorial_v2") => ({
    ...samplePageBlueprint,
    metadata: { ...samplePageBlueprint.metadata, design_profile: designProfile },
    hero: { ...samplePageBlueprint.hero, primary_cta_label: overlongArrowLabel },
    cta_blocks: samplePageBlueprint.cta_blocks.map((cta) => ({ ...cta, label: overlongArrowLabel })),
  });
  const referenceBlueprint = (heroLabel: string, closingLabel: string) => ({
    ...samplePageBlueprint,
    metadata: { ...samplePageBlueprint.metadata, design_profile: "reference_composed_v1" as const },
    hero: { ...samplePageBlueprint.hero, answer_snippet: "A concise buyer answer.", primary_cta_label: heroLabel },
    cta_blocks: samplePageBlueprint.cta_blocks.map((cta) => ({ ...cta, label: closingLabel })),
    presentation: recipe(),
  });

  assert.doesNotThrow(() => pageBlueprintSchema.parse(compatibleBlueprint("legacy")));
  assert.doesNotThrow(() => pageBlueprintSchema.parse(compatibleBlueprint("editorial_v2")));
  assert.throws(() => pageBlueprintSchema.parse(referenceBlueprint("x".repeat(33), "Valid closing CTA")), /hero.*primary_cta_label|32 characters/i);
  assert.throws(() => pageBlueprintSchema.parse(referenceBlueprint("Choose this →", "Valid closing CTA")), /hero.*primary_cta_label|arrow glyph/i);
  assert.throws(() => pageBlueprintSchema.parse(referenceBlueprint("Valid hero CTA", "x".repeat(33))), /cta_blocks|32 characters/i);
  assert.throws(() => pageBlueprintSchema.parse(referenceBlueprint("Valid hero CTA", "Choose this ↗")), /cta_blocks|arrow glyph/i);
  assert.doesNotThrow(() => pageBlueprintSchema.parse(referenceBlueprint("x".repeat(32), "y".repeat(32))));
});

test("validates a design direction's role and influence limits", () => {
  const refs = [reference(1), reference(2), reference(3)];
  const direction = {
    design_read: "Warm editorial proof led layout.",
    selection_rationale: "Category and axis coverage are complementary.",
    product_category: "crm-tools",
    adjacent_category_tags: ["sales"],
    references: refs.map((item, index) => ({
      reference_id: item.id,
      entry_digest: item.entry_digest,
      role: ["hero_typography", "sections_cta", "motion_mobile"][index],
      adopted_principles: [item.reusable_principles[0]],
      influenced_axes: index === 0 ? ["hero", "typography"] : index === 1 ? ["section_order", "section_variants"] : ["motion", "mobile"],
    })),
    design_dials: { design_variance: 7, motion_intensity: 6, visual_density: 4 },
    prohibited_elements: ["Copied source copy"],
    recipe_id: recipe().recipe_id,
    fingerprint: recipe().fingerprint,
  };
  assert.equal(DesignDirectionV1.parse(direction).references.length, 3);
  assert.throws(() => DesignDirectionV1.parse({ ...direction, references: [{ ...direction.references[0], influenced_axes: ["hero", "typography", "cta"] }, ...direction.references.slice(1)] }), /2|two/i);
});

test("requires both desktop and mobile captures for active references", () => {
  const valid = reference(1);
  const captures = activeCaptures(valid.captures);
  assert.throws(() => createDesignReference({ ...valid, captures: { mobile: captures.mobile } }), /desktop.*mobile|both/i);
  assert.throws(() => createDesignReference({ ...valid, captures: { desktop: captures.desktop } }), /desktop.*mobile|both/i);
});

test("keeps complementary active references even when only one matches the requested category", () => {
  const mixed = catalogue(reference(1, "crm-tools"), reference(2, "analytics"), reference(3, "commerce"));
  const result = selectDesignReferences({ catalogue: mixed, product_category: "crm-tools", buyer_decision: "choose a CRM" });
  assert.equal(result.status, "selected");
  if (result.status !== "selected") throw new Error("Expected a selected direction.");
  assert.deepEqual(result.recipe.reference_ids, ["lp-ref-0001", "lp-ref-0002", "lp-ref-0003"]);
  assert.equal(result.recipe.section_order.length, 8);
  assert.ok(result.recipe.fingerprint.length > 0);
});

test("derives section composition and fingerprints from selected catalogue observations", () => {
  const first = selectDesignReferences({
    catalogue: catalogue(reference(1), reference(2), reference(3)),
    product_category: "crm-tools",
    buyer_decision: "choose a CRM",
  });
  const changedId = (id: number) => {
    const base = reference(id, "analytics");
    const rotatedSections = base.observations.sections.map((s, i) => ({
      key: s.key as typeof sectionKeys[number],
      family: sectionFamilies[(i + 3) % sectionFamilies.length],
      composition_notes: s.composition_notes,
    }));
    return createDesignReference({
      ...base,
      primary_product_category: "analytics",
      category_tags: ["analytics", "data-tools"],
      observations: { ...base.observations, sections: rotatedSections },
    });
  };
  const second = selectDesignReferences({
    catalogue: catalogue(changedId(4), changedId(5), changedId(6)),
    product_category: "analytics",
    buyer_decision: "choose different analytics",
  });
  assert.equal(first.status, "selected");
  assert.equal(second.status, "selected");
  if (first.status !== "selected" || second.status !== "selected") throw new Error("Expected selected directions.");
  assert.deepEqual(second.recipe.section_order, [...sectionKeys]);
  assert.notDeepEqual(first.recipe.section_variants, second.recipe.section_variants);
  assert.notEqual(first.recipe.fingerprint, second.recipe.fingerprint);
});

test("uses strict numeric design dials and the specified selector defaults", () => {
  const invalidDesignDials: unknown = { ...recipe(), recipe_id: undefined, fingerprint: undefined, design_dials: { density: "airy" } };
  assert.throws(() => createPresentationRecipe(invalidDesignDials as Parameters<typeof createPresentationRecipe>[0]), /design_variance|motion_intensity|visual_density/i);
  const result = selectDesignReferences({ catalogue: catalogue(reference(1), reference(2), reference(3)), product_category: "crm-tools", buyer_decision: "choose a CRM" });
  assert.equal(result.status, "selected");
  if (result.status !== "selected") throw new Error("Expected a selected direction.");
  assert.deepEqual(result.recipe.design_dials, { design_variance: 7, motion_intensity: 6, visual_density: 4 });
});

test("captures approved catalogue observations beyond controlled variant labels", () => {
  const base = reference(1);
  assert.doesNotThrow(() => createDesignReference({
    ...base,
    observations: {
      ...base.observations,
      hero: { ...base.observations.hero, composition: "asymmetric editorial split", alignment: "left", media_strategy: "offset product proof" },
      typography: { ...base.observations.typography, display_style: "serif display", body_style: "neutral sans", scale: "high contrast", weight_contrast: "strong" },
      sections: base.observations.sections.map((section) => ({ ...section, composition_notes: "Evidence and copy are intentionally separated." })),
      cta: { ...base.observations.cta, placement: "hero and close", label_pattern: "decision verb", interaction: "inline disclosure" },
      motion: { ...base.observations.motion, triggers: "viewport entry", intensity: "subtle", reduced_motion_behavior: "opacity only" },
      mobile: { ...base.observations.mobile, stacking: "copy before proof", navigation: "condensed", cta_behavior: "sticky close", overflow_behavior: "clip decorative media" },
    },
  }));
});

test("records the approved influence traceability by reference role", () => {
  const result = selectDesignReferences({ catalogue: catalogue(reference(1), reference(2), reference(3)), product_category: "crm-tools", buyer_decision: "choose a CRM" });
  assert.equal(result.status, "selected");
  if (result.status !== "selected") throw new Error("Expected a selected direction.");
  assert.deepEqual(result.design_direction.references.map((reference) => reference.influenced_axes), [
    ["hero", "typography"], ["section_order", "cta"], ["motion", "mobile"],
  ]);
});

test("rejects duplicate history references and a primary reference outside its selection", () => {
  const validRecipe = recipe();
  assert.throws(() => ReferenceSelectionHistoryV1.parse({
    active_wave: [],
    previous_drafts: [{ draft_id: "duplicate", primary_reference_id: "lp-ref-0001", reference_ids: ["lp-ref-0001", "lp-ref-0001"], recipe: validRecipe }],
  }), /unique/i);
  assert.throws(() => ReferenceSelectionHistoryV1.parse({
    active_wave: [],
    previous_drafts: [{ draft_id: "outside", primary_reference_id: "lp-ref-0004", reference_ids: ["lp-ref-0001", "lp-ref-0002"], recipe: validRecipe }],
  }), /primary.*reference/i);
});

test("selection CLI emits a structured hold when the local catalogue captures are tampered", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "design-reference-cli-"));
  await mkdir(path.join(directory, "captures"));
  const values = [reference(1), reference(2), reference(3)];
  await writeFile(path.join(directory, "catalogue.json"), JSON.stringify(catalogue(...values)));
  const { stdout } = await execFile(process.execPath, [path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs"), "scripts/select-design-references.ts", "--catalogue", path.join(directory, "catalogue.json"), "--category", "crm-tools", "--buyer-decision", "choose a CRM"]);
  const result = JSON.parse(stdout) as { status: string; reasons?: string[] };
  assert.equal(result.status, "hold_for_design_direction");
  assert.match(result.reasons?.join("\n") ?? "", /missing|hash|capture/i);
});

test("stale exclusion blocks references older than 365 days from selection", () => {
  const now = new Date("2026-07-14T12:00:00.000Z");
  const fresh1 = reference(1, "crm-tools", { captured_at: "2026-07-13T00:00:00.000Z" });
  const stale1 = reference(2, "crm-tools", { captured_at: "2025-01-01T00:00:00.000Z" });
  const stale2 = reference(7, "crm-tools", { captured_at: "2025-01-01T00:00:00.000Z" });
  const stale3 = reference(8, "crm-tools", { captured_at: "2025-01-01T00:00:00.000Z" });
  const boundary = reference(3, "crm-tools", { captured_at: "2025-07-14T12:00:00.000Z" });

  const fresh = selectDesignReferences({ catalogue: catalogue(fresh1, reference(4), reference(5)), product_category: "crm-tools", buyer_decision: "choose a CRM", now });
  assert.equal(fresh.status, "selected");

  const staleHold = selectDesignReferences({ catalogue: catalogue(fresh1, stale1, reference(9)), product_category: "crm-tools", buyer_decision: "choose a CRM", now });
  assert.equal(staleHold.status, "selected");

  const onlyStale = selectDesignReferences({ catalogue: catalogue(stale1, stale2, stale3), product_category: "crm-tools", buyer_decision: "choose a CRM", now });
  assert.deepEqual(onlyStale, { status: "hold_for_design_direction", reasons: ["Category coverage exists only in stale references (>365 days old)."] });

  const exactly365 = selectDesignReferences({ catalogue: catalogue(boundary, reference(4), reference(5)), product_category: "crm-tools", buyer_decision: "choose a CRM", now });
  assert.equal(exactly365.status, "selected");
});

test("stale exclusion boundary: just over 365 days causes hold for stale refs", () => {
  const now = new Date("2026-07-14T12:00:00.000Z");
  const justOver1 = reference(1, "crm-tools", { captured_at: "2025-07-13T12:00:00.001Z" });
  const justOver2 = reference(2, "crm-tools", { captured_at: "2025-07-13T12:00:00.001Z" });
  const justOver3 = reference(4, "crm-tools", { captured_at: "2025-07-13T12:00:00.001Z" });
  const allStale = selectDesignReferences({ catalogue: catalogue(justOver1, justOver2, justOver3), product_category: "crm-tools", buyer_decision: "choose a CRM", now });
  assert.equal(allStale.status, "hold_for_design_direction");
});

test("stale exclusion boundary: exactly 365 days is still eligible", () => {
  const now = new Date("2026-07-14T12:00:00.000Z");
  const exact = reference(1, "crm-tools", { captured_at: "2025-07-14T12:00:00.000Z" });
  const result = selectDesignReferences({ catalogue: catalogue(exact, reference(2), reference(3)), product_category: "crm-tools", buyer_decision: "choose a CRM", now });
  assert.equal(result.status, "selected");
});

test("catalogue validation rejects capture symlinks even when their target is in the root", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "design-reference-symlink-"));
  await mkdir(path.join(directory, "captures"));
  const crypto = await import("node:crypto");
  const bytes = "desktop";
  const original = reference(1);
  const originalCaptures = activeCaptures(original.captures);
  const valid = createDesignReference({ ...original, captures: {
    desktop: { ...originalCaptures.desktop, sha256: crypto.createHash("sha256").update(bytes).digest("hex"), byte_size: bytes.length },
    mobile: { ...originalCaptures.mobile, sha256: crypto.createHash("sha256").update(bytes).digest("hex"), byte_size: bytes.length },
  } });
  const validCaptures = activeCaptures(valid.captures);
  await writeFile(path.join(directory, validCaptures.desktop.path), bytes);
  try {
    await symlink(path.join(directory, validCaptures.desktop.path), path.join(directory, validCaptures.mobile.path), "file");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EPERM") { t.skip("Windows symlink privilege is unavailable in this environment."); return; }
    throw error;
  }
  await writeFile(path.join(directory, "catalogue.json"), JSON.stringify(catalogue(valid)));
  assert.match((await validateDesignReferenceCatalogueDirectory(directory)).join("\n"), /symlink/i);
});
