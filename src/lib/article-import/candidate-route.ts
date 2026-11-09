/**
 * Shared route and robots distinction for candidate (prepublication) direct-review
 * verification. Candidate verification visits the noindex preview route while the
 * bound publication target remains the canonical route. This module is the single
 * owner of that distinction so callers cannot disagree or accept caller-chosen
 * clean pages.
 */

const PREVIEW_PREFIX = "/landing-page-previews";

export function candidatePreviewPath(slug: string): string {
  if (typeof slug !== "string" || !/^[a-z0-9][a-z0-9-]*$/i.test(slug) || slug.includes("..") || slug.includes("/")) {
    throw new Error("CANDIDATE_SLUG_INVALID");
  }
  return `${PREVIEW_PREFIX}/${slug}`;
}

export function candidateVisitedRoutes(slug: string): string[] {
  return [candidatePreviewPath(slug)];
}

export function candidatePreviewRobotsOk(robots: string): boolean {
  return typeof robots === "string" && /\bnoindex\b/i.test(robots);
}

export function productionRobotsOk(robots: string): boolean {
  return typeof robots === "string" && /\bindex\b/i.test(robots) && !/\bnoindex\b/i.test(robots);
}

export function isCandidatePreviewPath(pathname: string, slug: string): boolean {
  return pathname === candidatePreviewPath(slug);
}