import type { PageBlueprint } from "@/lib/schemas/contracts";

export type PageBlueprintReferences = {
  sourceIds: Set<string>;
  evidenceIds: Set<string>;
};

type ReferenceBearingPageBlueprint = Pick<
  PageBlueprint,
  "benefits" | "proof_blocks" | "limitations" | "objection_handling" | "faq"
>;

export function collectPageBlueprintReferences(blueprint: ReferenceBearingPageBlueprint): PageBlueprintReferences {
  const sourceIds = new Set<string>();
  const evidenceIds = new Set<string>();

  for (const benefit of blueprint.benefits ?? []) {
    for (const sourceId of benefit.source_reference_ids ?? []) sourceIds.add(sourceId);
  }
  for (const proof of blueprint.proof_blocks ?? []) {
    sourceIds.add(proof.source_reference_id);
    if (proof.evidence_claim_id) evidenceIds.add(proof.evidence_claim_id);
  }
  for (const limitation of blueprint.limitations ?? []) {
    if (limitation.evidence_claim_id) evidenceIds.add(limitation.evidence_claim_id);
  }
  for (const objection of blueprint.objection_handling ?? []) {
    for (const sourceId of objection.source_reference_ids ?? []) sourceIds.add(sourceId);
  }
  for (const faq of blueprint.faq ?? []) {
    for (const sourceId of faq.source_reference_ids ?? []) sourceIds.add(sourceId);
  }

  return { sourceIds, evidenceIds };
}
