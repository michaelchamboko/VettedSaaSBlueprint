import type { PageBlueprint } from "@/lib/schemas/contracts";

const blockedPhrases = ["#1", "best", "better than", "guaranteed", "limited time", "only today", "verified discount", "lock in this price"];

export function evaluateBlueprintForPublication(blueprint: PageBlueprint) {
  const text = JSON.stringify(blueprint).toLowerCase();
  const blocked = blockedPhrases.filter((phrase) => text.includes(phrase.toLowerCase()));
  const failures: string[] = [];

  if (blueprint.affiliate_disclosure.placement !== "above_first_cta") failures.push("Disclosure must appear above the first CTA.");
  if (!blueprint.limitations.length) failures.push("At least one honest limitation is required.");
  if (blueprint.quality_scores.evidence_score < 70) failures.push("Evidence score is below publication threshold.");
  if (blueprint.quality_scores.compliance_score < 80) failures.push("Compliance score is below publication threshold.");
  if (blocked.length) failures.push(`Blocked high-risk language: ${blocked.join(", ")}.`);

  return { publishable: failures.length === 0, failures };
}

export function requireDestinationReviewForPublication(options: { hasCurrentDestinationReview: boolean; ownerOverride: boolean }) {
  const failures: string[] = [];
  if (!options.hasCurrentDestinationReview && !options.ownerOverride) failures.push("A current purchase destination review or explicit owner override is required before first publication.");
  return { publishable: failures.length === 0, failures };
}
