import type { PageBlueprint } from "@/lib/schemas/contracts";
import { evaluatePagePublishability } from "./publication";

export function canPublishPage(blueprint: PageBlueprint, options: { hasCurrentDestinationReview: boolean; ownerOverride: boolean; affiliateLinkActive: boolean; approved: boolean }) {
  const gate = evaluatePagePublishability(blueprint, options);
  if (!options.approved) gate.failures.push("Page version must be approved before publishing.");
  return { publishable: gate.publishable && options.approved, failures: gate.failures };
}

export function nextPageStatus(action: "approve" | "publish" | "pause" | "noindex") {
  if (action === "approve") return "approved" as const;
  if (action === "publish") return "published" as const;
  if (action === "pause") return "paused" as const;
  return "noindex" as const;
}
