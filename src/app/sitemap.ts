import type { MetadataRoute } from "next";

import {
  listPublishedLandingPageSummaries,
  type PublicReviewSummary,
} from "@/lib/generated/landing-pages";
import { listPublishedVisibilityPageSummaries } from "@/lib/visibility-pages/catalogue";
import { indexableVisibilitySummaries } from "@/lib/visibility-pages/link-graph";
import type { VisibilityPublicationSummary } from "@/lib/visibility-pages/contracts";
import {
  loadPublicSiteConfig,
  type PublicSiteConfig,
} from "@/lib/site/public-site";

const publicRoutes = [
  "/",
  "/blog",
  "/privacy",
  "/terms",
  "/contact",
  "/affiliate-disclosure",
  "/editorial-policy",
  "/paia",
  "/accessibility",
] as const;

export function buildPublicSitemap(
  config: PublicSiteConfig,
  reviews: PublicReviewSummary[],
  visibility: VisibilityPublicationSummary[] = [],
): MetadataRoute.Sitemap {
  const staticEntries = publicRoutes.map<MetadataRoute.Sitemap[number]>(
    (route) => ({
      url: new URL(route, config.canonicalOrigin).toString(),
      changeFrequency: route === "/" ? "weekly" : "monthly",
      ...(route === "/" ? {} : { lastModified: config.policies.reviewDate }),
    }),
  );

  const reviewEntries = reviews.map<MetadataRoute.Sitemap[number]>((review) => ({
    url: new URL(review.path, config.canonicalOrigin).toString(),
    lastModified: review.publishedAt,
    changeFrequency: "weekly",
  }));

  const visibilityEntries = indexableVisibilitySummaries(visibility).map<MetadataRoute.Sitemap[number]>((page) => ({
    url: new URL(page.path, config.canonicalOrigin).toString(),
    lastModified: page.modifiedAt,
    changeFrequency: "weekly",
  }));

  return [...staticEntries, ...reviewEntries, ...visibilityEntries];
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function sitemap(): MetadataRoute.Sitemap {
  return buildPublicSitemap(
    loadPublicSiteConfig(),
    listPublishedLandingPageSummaries(),
    listPublishedVisibilityPageSummaries(),
  );
}
