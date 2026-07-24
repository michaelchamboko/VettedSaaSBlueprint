import type { PageBlueprint } from "@/lib/schemas/contracts";

export type ReferenceComposedSectionKey = NonNullable<PageBlueprint["presentation"]>["section_order"][number];
export type DirectReviewRendererKind = "legacy" | "editorial_v2" | "reference_composed_v1";

export function getDirectReviewRendererKind(designProfile: PageBlueprint["metadata"]["design_profile"]): DirectReviewRendererKind {
  return designProfile === "editorial_v2" || designProfile === "reference_composed_v1" ? designProfile : "legacy";
}

function normalizeReferenceCopy(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function shouldRenderReferenceSubheadline(answerSnippet: string, subheadline: string): boolean {
  return normalizeReferenceCopy(answerSnippet) !== normalizeReferenceCopy(subheadline);
}

export function getRenderableSectionOrder(blueprint: PageBlueprint): ReferenceComposedSectionKey[] {
  if (!blueprint.presentation) {
    throw new Error("reference_composed_v1 pages require a presentation recipe.");
  }

  return blueprint.presentation.section_order.filter((sectionKey) => {
    switch (sectionKey) {
      case "proof_blocks": return blueprint.proof_blocks.length > 0;
      case "how_it_works": return blueprint.how_it_works.length > 0;
      case "objection_handling": return blueprint.objection_handling.length > 0;
      case "faq": return blueprint.faq.length > 0;
      default: return true;
    }
  });
}
