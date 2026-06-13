import type { PageBlueprint } from "@/lib/schemas/contracts";
import { evaluateBlueprintForPublication, requireDestinationReviewForPublication } from "@/lib/compliance/gate";

export function evaluatePagePublishability(blueprint: PageBlueprint, options: { hasCurrentDestinationReview: boolean; ownerOverride: boolean; affiliateLinkActive: boolean }) {
  const compliance = evaluateBlueprintForPublication(blueprint);
  const destination = requireDestinationReviewForPublication(options);
  const failures = [...compliance.failures, ...destination.failures];

  if (!options.affiliateLinkActive) failures.push("Affiliate link must be active before publication.");
  return { publishable: failures.length === 0, failures };
}
