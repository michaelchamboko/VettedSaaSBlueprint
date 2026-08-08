import type { VisibilityPublicationSummary } from "@/lib/visibility-pages/contracts";

export type VisibilityFreshness = "fresh" | "under_review";

export function visibilityFreshness(
  summary: Pick<VisibilityPublicationSummary, "earliestExpiresAt">,
  now = new Date(),
): VisibilityFreshness {
  const expiresAt = Date.parse(summary.earliestExpiresAt);
  if (!Number.isFinite(expiresAt) || now.getTime() >= expiresAt) {
    return "under_review";
  }
  return "fresh";
}

export function isVisibilityPageIndexable(
  summary: Pick<VisibilityPublicationSummary, "earliestExpiresAt">,
  now = new Date(),
): boolean {
  return visibilityFreshness(summary, now) === "fresh";
}
