import {
  DesignDirectionV1,
  ReferenceSelectionHistoryV1,
  createPresentationRecipe,
  sectionFamilies,
  sectionKeys,
  type DesignReferenceCatalogueV1,
  type PresentationRecipeV1,
  type ReferenceSelectionHistoryV1 as SelectionHistory,
} from "./contracts";
import { differingPresentationAxes, sha256, type PresentationAxis } from "./fingerprint";

type SelectionRequest = {
  catalogue: DesignReferenceCatalogueV1;
  product_category: string;
  adjacent_category_tags?: string[];
  buyer_decision: string;
  history?: SelectionHistory;
  now?: Date;
};

type HistoryValidationInput = {
  history: SelectionHistory;
  reference_ids: string[];
  primary_reference_id: string;
  recipe: PresentationRecipeV1;
};

function availableAxes(reference: DesignReferenceCatalogueV1["references"][number]): PresentationAxis[] {
  const axes: PresentationAxis[] = [];
  if (reference.supported_variant_tags.hero.length) axes.push("hero");
  if (reference.supported_variant_tags.typography.length) axes.push("typography");
  if (reference.observations.sections.length) axes.push("section_order");
  if (reference.supported_variant_tags.section_variants.length) axes.push("section_variants");
  if (reference.supported_variant_tags.cta.length) axes.push("cta");
  if (reference.supported_variant_tags.motion.length) axes.push("motion");
  if (reference.supported_variant_tags.mobile.length) axes.push("mobile");
  return axes;
}

function categoryScore(reference: DesignReferenceCatalogueV1["references"][number], category: string, adjacentTags: string[]): number {
  if (reference.primary_product_category === category || reference.category_tags.includes(category)) return 2;
  if (adjacentTags.some((tag) => reference.primary_product_category === tag || reference.category_tags.includes(tag))) return 1;
  return 0;
}

function variant<T>(values: readonly T[], fallback: T): T { return values[0] ?? fallback; }

type SectionVariants = PresentationRecipeV1["section_variants"];

function isStale(capturedAt: string, now: Date): boolean {
  const captured = new Date(capturedAt);
  const msPerDay = 86400 * 1000;
  return (now.getTime() - captured.getTime()) > 365 * msPerDay;
}

function isNotStale(reference: DesignReferenceCatalogueV1["references"][number], now: Date): boolean {
  return !isStale(reference.captured_at, now);
}

function sectionComposition(references: DesignReferenceCatalogueV1["references"], buyerDecision: string) {
  const sectionsReference = references[1] ?? references[0];
  const orderedReferences = [sectionsReference, ...references.filter((reference) => reference.id !== sectionsReference.id)];

  const section_order = [...sectionKeys];

  const usedFamilies = new Set<string>();
  const section_variants: SectionVariants = Object.fromEntries(section_order.map((key) => {
    const observed = orderedReferences
      .map((reference) => reference.observations.sections.find((section) => section.key === key)?.family)
      .filter((family): family is typeof sectionFamilies[number] => Boolean(family));
    const supported = references.flatMap((reference) => reference.supported_variant_tags.section_variants);
    const allFamilies = [...observed, ...supported];
    const family = allFamilies.find((candidate) => !usedFamilies.has(candidate));

    if (family) {
      usedFamilies.add(family);
      return [key, family];
    }

    const deterministicIndex = Math.abs(sha256(buyerDecision + key + references.map((r) => r.id).join("|")).charCodeAt(0)) % sectionFamilies.length;
    for (let offset = 0; offset < sectionFamilies.length; offset++) {
      const candidate = sectionFamilies[(deterministicIndex + offset) % sectionFamilies.length];
      if (!usedFamilies.has(candidate)) {
        usedFamilies.add(candidate);
        return [key, candidate];
      }
    }
    throw new Error("Unable to produce a unique approved section-family assignment.");
  })) as SectionVariants;
  return { section_order, section_variants };
}

function candidateCombinations(references: DesignReferenceCatalogueV1["references"], count: number) {
  const combinations: DesignReferenceCatalogueV1["references"][] = [];
  const visit = (start: number, selected: DesignReferenceCatalogueV1["references"]) => {
    if (selected.length === count) { combinations.push(selected); return; }
    for (let index = start; index <= references.length - (count - selected.length); index++) {
      visit(index + 1, [...selected, references[index]]);
    }
  };
  visit(0, []);
  return combinations;
}

type AxesCoverage = { axes: Set<PresentationAxis>; sectionCount: number; hasCta: boolean };

function axisCoverage(reference: DesignReferenceCatalogueV1["references"][number]): AxesCoverage {
  const axes = new Set(availableAxes(reference));
  return {
    axes,
    sectionCount: reference.observations.sections.length,
    hasCta: reference.supported_variant_tags.cta.length > 0,
  };
}

function collectiveAxes(references: DesignReferenceCatalogueV1["references"]): Set<PresentationAxis> {
  const combined = new Set<PresentationAxis>();
  for (const reference of references) {
    for (const axis of availableAxes(reference)) combined.add(axis);
  }
  return combined;
}

function createRecipe(references: DesignReferenceCatalogueV1["references"], buyerDecision: string): PresentationRecipeV1 {
  const primary = references[0];
  const composition = sectionComposition(references, buyerDecision);
  return createPresentationRecipe({
    hero: variant(primary.supported_variant_tags.hero, primary.observations.hero.variant),
    typography: variant(primary.supported_variant_tags.typography, primary.observations.typography.pair),
    ...composition,
    cta: variant(references[1]?.supported_variant_tags.cta ?? [], primary.observations.cta.variant),
    motion: variant(references[2]?.supported_variant_tags.motion ?? primary.supported_variant_tags.motion, primary.observations.motion.variant),
    mobile: variant(references[2]?.supported_variant_tags.mobile ?? primary.supported_variant_tags.mobile, primary.observations.mobile.strategy),
    design_dials: { design_variance: 7, motion_intensity: 6, visual_density: 4 },
    reference_ids: references.map((reference) => reference.id),
  });
}

function createDirection(references: DesignReferenceCatalogueV1["references"], productCategory: string, adjacentCategoryTags: string[], buyerDecision: string, recipe: PresentationRecipeV1) {
  const roleAxes: PresentationAxis[][] = references.length === 2
    ? [["hero", "typography"], ["section_order", "cta"]]
    : [["hero", "typography"], ["section_order", "cta"], ["motion", "mobile"]];
  return DesignDirectionV1.parse({
    design_read: "Reference-composed editorial direction with distinct evidence-led hierarchy.",
    selection_rationale: `Selected for category fit, complementary presentation axes, and novelty for ${buyerDecision}.`,
    product_category: productCategory,
    adjacent_category_tags: adjacentCategoryTags,
    references: references.map((reference, index) => ({
      reference_id: reference.id,
      entry_digest: reference.entry_digest,
      role: index === 0 ? "hero_typography" : index === 1 ? "sections_cta" : "motion_mobile",
      adopted_principles: [reference.reusable_principles[0]],
      influenced_axes: roleAxes[index],
    })),
    design_dials: recipe.design_dials,
    prohibited_elements: references.flatMap((reference) => reference.prohibited_copy_notes),
    recipe_id: recipe.recipe_id,
    fingerprint: recipe.fingerprint,
  });
}

export function validateSelectionHistory(input: HistoryValidationInput): string[] {
  const history = ReferenceSelectionHistoryV1.parse(input.history);
  const errors: string[] = [];
  if (history.active_wave.some((draft) => draft.primary_reference_id === input.primary_reference_id)) {
    errors.push("A reference may have one primary use per active ten-page wave.");
  }
  const previousTen = history.previous_drafts.slice(-10);
  for (const referenceId of input.reference_ids) {
    if (previousTen.reduce((count, draft) => count + (draft.reference_ids.includes(referenceId) ? 1 : 0), 0) >= 2) {
      errors.push(`Reference ${referenceId} would be used more than twice across the previous ten drafts.`);
    }
  }
  const combination = [...input.reference_ids].sort().join("|");
  if (history.previous_drafts.slice(-20).some((draft) => [...draft.reference_ids].sort().join("|") === combination)) {
    errors.push("The reference combination repeats one used across the previous twenty drafts.");
  }
  if (history.previous_drafts.some((draft) => draft.recipe.fingerprint === input.recipe.fingerprint)) {
    errors.push("The presentation fingerprint exactly matches a historical draft.");
  }
  if (history.active_wave.some((draft) => differingPresentationAxes(draft.recipe, input.recipe).length < 3)) {
    errors.push("Active-wave siblings must differ by at least three presentation axes.");
  }
  return errors;
}

export function selectDesignReferences(request: SelectionRequest):
  | { status: "selected"; design_direction: ReturnType<typeof createDirection>; recipe: PresentationRecipeV1 }
  | { status: "hold_for_design_direction"; reasons: string[] } {
  const adjacentTags = request.adjacent_category_tags ?? [];
  const selectionTime = request.now ?? new Date();

  const eligible = request.catalogue.references
    .filter((reference) => reference.usage_status === "active" && Boolean(reference.captures.desktop && reference.captures.mobile))
    .filter((reference) => isNotStale(reference, selectionTime));
  if (eligible.length < 2) {
    const staleMatch = !eligible.some(() => true) && request.catalogue.references.some(
      (r) => r.usage_status === "active" && isStale(r.captured_at, selectionTime) && categoryScore(r, request.product_category, adjacentTags) > 0
    );
    if (staleMatch) {
      return { status: "hold_for_design_direction", reasons: ["Category coverage exists only in stale references (>365 days old)."] };
    }
    return { status: "hold_for_design_direction", reasons: ["Fewer than two active non-stale references have complete captures."] };
  }
  if (!eligible.some((reference) => categoryScore(reference, request.product_category, adjacentTags) > 0)) {
    return { status: "hold_for_design_direction", reasons: ["No active non-stale reference matches the product category or adjacent tags."] };
  }
  const targetCount = Math.min(3, eligible.length);
  const recentDrafts = request.history?.previous_drafts.slice(-10) ?? [];
  const ordered = [...eligible].sort((left, right) => {
    const categoryDifference = categoryScore(right, request.product_category, adjacentTags) - categoryScore(left, request.product_category, adjacentTags);
    if (categoryDifference) return categoryDifference;
    const noveltyDifference = recentDrafts.filter((draft) => draft.reference_ids.includes(left.id)).length - recentDrafts.filter((draft) => draft.reference_ids.includes(right.id)).length;
    if (noveltyDifference) return noveltyDifference;
    return left.id.localeCompare(right.id);
  });
  const combinations = candidateCombinations(ordered, targetCount)
    .filter((combination) => categoryScore(combination[0], request.product_category, adjacentTags) > 0)
    .filter((combination) => {
      const axes = collectiveAxes(combination);
      if (axes.size < 7) return false;
      const secRef = combination[1] ?? combination[0];
      const secCoverage = axisCoverage(secRef);
      return secCoverage.sectionCount >= 1 && secCoverage.hasCta;
    })
    .filter((combination) => targetCount !== 2 || collectiveAxes(combination).size >= 4);
  if (targetCount === 2 && combinations.length === 0) {
    return { status: "hold_for_design_direction", reasons: ["Two eligible references do not cover four unique design axes."] };
  }
  if (combinations.length === 0) {
    return { status: "hold_for_design_direction", reasons: ["No eligible combination covers all seven presentation axes with a sections/CTA reference."] };
  }
  let firstHistoryErrors: string[] = [];
  for (const selected of combinations) {
    let recipe: PresentationRecipeV1;
    try { recipe = createRecipe(selected, request.buyer_decision); } catch { continue; }
    const historyErrors = request.history ? validateSelectionHistory({ history: request.history, reference_ids: recipe.reference_ids, primary_reference_id: selected[0].id, recipe }) : [];
    if (historyErrors.length) { if (!firstHistoryErrors.length) firstHistoryErrors = historyErrors; continue; }
    const design_direction = createDirection(selected, request.product_category, adjacentTags, request.buyer_decision, recipe);
    return { status: "selected", design_direction, recipe };
  }
  return { status: "hold_for_design_direction", reasons: firstHistoryErrors.length ? firstHistoryErrors : ["Selected references cannot produce a complete unique presentation recipe."] };
}
