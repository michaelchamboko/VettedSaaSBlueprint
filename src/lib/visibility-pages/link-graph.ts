import type { VisibilityPublicationSummary } from "@/lib/visibility-pages/contracts";
import { isVisibilityPageIndexable } from "@/lib/visibility-pages/runtime-expiry";

export function indexableVisibilitySummaries(
  summaries: VisibilityPublicationSummary[],
  now = new Date(),
): VisibilityPublicationSummary[] {
  return summaries.filter((summary) => isVisibilityPageIndexable(summary, now));
}

export function relatedVisibilitySummaries(
  summaries: VisibilityPublicationSummary[],
  reviewPath: string,
  now = new Date(),
): VisibilityPublicationSummary[] {
  return indexableVisibilitySummaries(summaries, now)
    .filter((summary) => summary.relevantReviewPath === reviewPath);
}
