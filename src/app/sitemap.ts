import type { MetadataRoute } from "next";

import {
  listPublishedLandingPageSummaries,
  type PublicReviewSummary,
} from "@/lib/generated/landing-pages";
import {
  loadPublicSiteConfig,
  type PublicSiteConfig,
} from "@/lib/site/public-site";

const publicRoutes = [
  "/",
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

  return [...staticEntries, ...reviewEntries];
}

export default function sitemap(): MetadataRoute.Sitemap {
  return buildPublicSitemap(
    loadPublicSiteConfig(),
    listPublishedLandingPageSummaries(),
  );
}
