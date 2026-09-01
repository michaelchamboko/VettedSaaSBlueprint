import { z } from "zod";

import { canonicalJson, presentationAxes, presentationFingerprint, sha256, type PresentationAxis } from "./fingerprint";

export const heroVariants = ["asymmetric_split", "typographic_billboard", "editorial_sidebar", "proof_led", "media_first_offset", "problem_statement_stack"] as const;
export const sectionKeys = ["problem_solution", "benefits", "proof_blocks", "how_it_works", "limitations", "objection_handling", "faq", "closing_cta"] as const;
export const sectionFamilies = ["split_editorial", "numbered_ledger", "alternating_story", "proof_strip", "decision_matrix", "process_timeline", "objection_accordion", "closing_manifesto"] as const;
export const typographyPairs = ["fraunces_manrope", "archivo_source_sans", "dm_serif_instrument_sans", "space_grotesk_dm_sans"] as const;
export const ctaVariants = ["inline_decision", "split_evidence", "full_width_close", "compact_utility"] as const;
export const motionVariants = ["quiet_stagger", "split_reveal", "media_parallax", "line_wipe", "anchored_progress"] as const;
export const mobileStrategies = ["copy_first", "media_first", "interleaved"] as const;
export const referenceRoles = ["hero_typography", "sections_cta", "motion_mobile"] as const;

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/, "Expected a lowercase SHA-256 digest.");
const relativeWebpPath = z.string().regex(/^(?!.*(?:^|\/)\.\.?\/)[a-z0-9][a-z0-9._/-]*\.webp$/, "Capture paths must be relative .webp paths.");
const normalizedCategory = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Categories and tags must be normalized lowercase slugs.");
const designDialSchema = z.object({
  design_variance: z.number().int().min(1).max(10),
  motion_intensity: z.number().int().min(1).max(10),
  visual_density: z.number().int().min(1).max(10),
}).strict();

const classificationAxisSchema = z.object({
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.string().min(1)).min(1),
}).strict();

const classificationSchema = z.object({
  overall_confidence: z.number().min(0).max(1),
  axes: z.object({
    hero: classificationAxisSchema,
    typography: classificationAxisSchema,
    section_order: classificationAxisSchema,
    section_variants: classificationAxisSchema,
    cta: classificationAxisSchema,
    motion: classificationAxisSchema,
    mobile: classificationAxisSchema,
  }).strict(),
}).strict();

const captureSchema = z.object({
  path: relativeWebpPath,
  sha256: sha256Schema,
  byte_size: z.number().int().positive(),
}).strict();

const referenceBaseSchema = z.object({
  id: z.string().regex(/^lp-ref-\d{4}$/, "Reference IDs must use the lp-ref-#### form."),
  source_url: z.string().url().refine((value) => new URL(value).protocol === "https:", "Reference source URLs must use HTTPS."),
  captured_at: z.string().datetime({ offset: true }),
  captures: z.object({ desktop: captureSchema.optional(), mobile: captureSchema.optional() }).strict(),
  usage_status: z.enum(["active", "archived", "unavailable"]),
  usage_scope: z.literal("internal_only"),
  primary_product_category: normalizedCategory,
  category_tags: z.array(normalizedCategory).min(1),
  observations: z.object({
    hero: z.object({ variant: z.enum(heroVariants), composition: z.string().min(1), alignment: z.string().min(1), media_strategy: z.string().min(1) }).strict(),
    typography: z.object({ pair: z.enum(typographyPairs), display_style: z.string().min(1), body_style: z.string().min(1), scale: z.string().min(1), weight_contrast: z.string().min(1) }).strict(),
    sections: z.array(z.object({ key: z.enum(sectionKeys), family: z.enum(sectionFamilies), composition_notes: z.string().min(1) }).strict()).min(1),
    cta: z.object({ variant: z.enum(ctaVariants), placement: z.string().min(1), label_pattern: z.string().min(1), interaction: z.string().min(1) }).strict(),
    motion: z.object({ variant: z.enum(motionVariants), triggers: z.string().min(1), intensity: z.string().min(1), reduced_motion_behavior: z.string().min(1) }).strict(),
    mobile: z.object({ strategy: z.enum(mobileStrategies), stacking: z.string().min(1), navigation: z.string().min(1), cta_behavior: z.string().min(1), overflow_behavior: z.string().min(1) }).strict(),
  }).strict(),
  supported_variant_tags: z.object({
    hero: z.array(z.enum(heroVariants)),
    typography: z.array(z.enum(typographyPairs)),
    section_variants: z.array(z.enum(sectionFamilies)),
    cta: z.array(z.enum(ctaVariants)),
    motion: z.array(z.enum(motionVariants)),
    mobile: z.array(z.enum(mobileStrategies)),
  }).strict(),
  reusable_principles: z.array(z.string().min(1)).min(1),
  prohibited_copy_notes: z.array(z.string().min(1)).min(1),
  classification: classificationSchema.optional(),
}).strict();

const validateReferenceInput = (reference: z.output<typeof referenceBaseSchema>, context: z.RefinementCtx) => {
  if (new Set(reference.category_tags).size !== reference.category_tags.length) {
    context.addIssue({ code: "custom", path: ["category_tags"], message: "Category tags must be unique." });
  }
  if (new Set(reference.observations.sections.map((section) => section.key)).size !== reference.observations.sections.length) {
    context.addIssue({ code: "custom", path: ["observations", "sections"], message: "Observed section keys must be unique." });
  }
  if (reference.usage_status === "active") {
    if (!reference.captures.desktop || !reference.captures.mobile) {
      context.addIssue({ code: "custom", path: ["captures"], message: "Active references require both desktop and mobile captures." });
    }
    for (const [name, capture] of Object.entries(reference.captures)) {
      if (capture && capture.byte_size > 2_000_000) context.addIssue({ code: "custom", path: ["captures", name, "byte_size"], message: "Active captures cannot exceed 2 MB." });
    }
    if (reference.classification && reference.classification.overall_confidence < 0.75) {
      context.addIssue({ code: "custom", path: ["classification", "overall_confidence"], message: "Automated active references require at least 0.75 classification confidence." });
    }
  }
};

const referenceInputSchema = referenceBaseSchema.superRefine(validateReferenceInput);

export const DesignReferenceV1 = referenceBaseSchema.extend({ entry_digest: sha256Schema }).strict().superRefine((reference, context) => {
  validateReferenceInput(reference, context);
  const { entry_digest, ...digestInput } = reference;
  if (entry_digest !== sha256(digestInput)) {
    context.addIssue({ code: "custom", path: ["entry_digest"], message: "Reference entry digest must match the deterministic reference content." });
  }
});

export function createDesignReference(input: z.input<typeof referenceInputSchema> & { entry_digest?: string }): z.infer<typeof DesignReferenceV1> {
  const { entry_digest: _ignored, ...withoutDigest } = input;
  const parsed = referenceInputSchema.parse(withoutDigest);
  return DesignReferenceV1.parse({ ...parsed, entry_digest: sha256(parsed) });
}

export const DesignReferenceCatalogueV1 = z.object({
  schema_version: z.literal("DesignReferenceCatalogueV1"),
  references: z.array(DesignReferenceV1),
}).strict().superRefine((catalogue, context) => {
  const ids = catalogue.references.map((reference) => reference.id);
  if (new Set(ids).size !== ids.length) context.addIssue({ code: "custom", path: ["references"], message: "Catalogue reference IDs must be unique." });
  const paths = catalogue.references.flatMap((reference) => Object.values(reference.captures).flatMap((capture) => capture ? [capture.path] : []));
  if (new Set(paths).size !== paths.length) context.addIssue({ code: "custom", path: ["references"], message: "Catalogue capture paths must be unique." });
});

const sectionVariantsSchema = z.object({
  problem_solution: z.enum(sectionFamilies), benefits: z.enum(sectionFamilies), proof_blocks: z.enum(sectionFamilies), how_it_works: z.enum(sectionFamilies),
  limitations: z.enum(sectionFamilies), objection_handling: z.enum(sectionFamilies), faq: z.enum(sectionFamilies), closing_cta: z.enum(sectionFamilies),
}).strict();

const presentationBaseSchema = z.object({
  hero: z.enum(heroVariants),
  typography: z.enum(typographyPairs),
  section_order: z.array(z.enum(sectionKeys)).length(sectionKeys.length),
  section_variants: sectionVariantsSchema,
  cta: z.enum(ctaVariants),
  motion: z.enum(motionVariants),
  mobile: z.enum(mobileStrategies),
  design_dials: designDialSchema,
  reference_ids: z.array(z.string().regex(/^lp-ref-\d{4}$/)).min(2).max(3),
}).strict();

const validatePresentationInput = (recipe: z.output<typeof presentationBaseSchema>, context: z.RefinementCtx) => {
  if (new Set(recipe.section_order).size !== sectionKeys.length) context.addIssue({ code: "custom", path: ["section_order"], message: "Section order must include each controlled section key once." });
  const families = Object.values(recipe.section_variants);
  if (new Set(families).size !== sectionFamilies.length) context.addIssue({ code: "custom", path: ["section_variants"], message: "Each section key must use a unique section family." });
  if (new Set(recipe.reference_ids).size !== recipe.reference_ids.length) context.addIssue({ code: "custom", path: ["reference_ids"], message: "Recipe reference IDs must be unique." });
};

const presentationInputSchema = presentationBaseSchema.superRefine(validatePresentationInput);

export const PresentationRecipeV1 = presentationBaseSchema.extend({ recipe_id: z.string().regex(/^recipe-[a-f0-9]{16}$/), fingerprint: sha256Schema }).strict().superRefine((recipe, context) => {
  validatePresentationInput(recipe, context);
  const expected = presentationFingerprint(recipe);
  if (recipe.fingerprint !== expected) context.addIssue({ code: "custom", path: ["fingerprint"], message: "Recipe fingerprint must match the seven presentation axes." });
  if (recipe.recipe_id !== `recipe-${expected.slice(0, 16)}`) context.addIssue({ code: "custom", path: ["recipe_id"], message: "Recipe ID must be derived from its fingerprint." });
});

export function createPresentationRecipe(input: z.input<typeof presentationInputSchema> & { recipe_id?: string; fingerprint?: string }): z.infer<typeof PresentationRecipeV1> {
  const { recipe_id: _ignoredId, fingerprint: _ignoredFingerprint, ...withoutDerivedFields } = input;
  const parsed = presentationInputSchema.parse(withoutDerivedFields);
  const fingerprint = presentationFingerprint(parsed);
  return PresentationRecipeV1.parse({ ...parsed, fingerprint, recipe_id: `recipe-${fingerprint.slice(0, 16)}` });
}

const selectedReferenceSchema = z.object({
  reference_id: z.string().regex(/^lp-ref-\d{4}$/),
  entry_digest: sha256Schema,
  role: z.enum(referenceRoles),
  adopted_principles: z.array(z.string().min(1)).min(1),
  influenced_axes: z.array(z.enum(presentationAxes)).min(1).max(2),
}).strict();

export const DesignDirectionV1 = z.object({
  design_read: z.string().min(1),
  selection_rationale: z.string().min(1),
  product_category: normalizedCategory,
  adjacent_category_tags: z.array(normalizedCategory),
  references: z.array(selectedReferenceSchema).min(2).max(3),
  design_dials: designDialSchema,
  prohibited_elements: z.array(z.string().min(1)).min(1),
  recipe_id: z.string().regex(/^recipe-[a-f0-9]{16}$/),
  fingerprint: sha256Schema,
}).strict().superRefine((direction, context) => {
  if (new Set(direction.references.map((reference) => reference.reference_id)).size !== direction.references.length) context.addIssue({ code: "custom", path: ["references"], message: "Selected reference IDs must be unique." });
  if (direction.references.some((reference) => new Set(reference.influenced_axes).size !== reference.influenced_axes.length)) context.addIssue({ code: "custom", path: ["references"], message: "A reference cannot repeat an influenced axis." });
  if (direction.references.length === 2) {
    const axes = new Set(direction.references.flatMap((reference) => reference.influenced_axes));
    if (axes.size < 4) context.addIssue({ code: "custom", path: ["references"], message: "Two-reference directions must cover at least four unique design axes." });
  }
  if (direction.recipe_id !== `recipe-${direction.fingerprint.slice(0, 16)}`) context.addIssue({ code: "custom", path: ["recipe_id"], message: "Design direction recipe ID must match its fingerprint." });
});

const historyDraftSchema = z.object({
  draft_id: z.string().min(1),
  primary_reference_id: z.string().regex(/^lp-ref-\d{4}$/),
  reference_ids: z.array(z.string().regex(/^lp-ref-\d{4}$/)).min(2).max(3),
  recipe: PresentationRecipeV1,
}).strict().superRefine((draft, context) => {
  if (new Set(draft.reference_ids).size !== draft.reference_ids.length) {
    context.addIssue({ code: "custom", path: ["reference_ids"], message: "History draft reference IDs must be unique." });
  }
  if (!draft.reference_ids.includes(draft.primary_reference_id)) {
    context.addIssue({ code: "custom", path: ["primary_reference_id"], message: "History draft primary reference must belong to reference_ids." });
  }
});

export const ReferenceSelectionHistoryV1 = z.object({
  active_wave: z.array(historyDraftSchema).max(10),
  previous_drafts: z.array(historyDraftSchema),
}).strict();

export type DesignReferenceV1 = z.infer<typeof DesignReferenceV1>;
export type DesignReferenceCatalogueV1 = z.infer<typeof DesignReferenceCatalogueV1>;
export type DesignDirectionV1 = z.infer<typeof DesignDirectionV1>;
export type PresentationRecipeV1 = z.infer<typeof PresentationRecipeV1>;
export type ReferenceSelectionHistoryV1 = z.infer<typeof ReferenceSelectionHistoryV1>;
export type { PresentationAxis };

export function stableEntryDigest(value: unknown): string {
  return sha256(JSON.parse(canonicalJson(value)));
}
