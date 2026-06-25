import type { PageBlueprint } from "@/lib/schemas/contracts";
import { evaluateBlueprintForPublication, evaluateComplianceStatesForPublication, requireDestinationReviewForPublication, type PublishReadinessRequirements } from "@/lib/compliance/gate";

export function evaluatePagePublishability(blueprint: PageBlueprint, options: PublishReadinessRequirements) {
  const compliance = evaluateBlueprintForPublication(blueprint);
  const destination = requireDestinationReviewForPublication(options);
  const complianceState = evaluateComplianceStatesForPublication(options);
  const failures = [...compliance.failures, ...destination.failures, ...complianceState.failures];

  if (!options.affiliateLinkActive) failures.push("Affiliate link must be active before publication.");
  return { publishable: failures.length === 0, failures };
}
