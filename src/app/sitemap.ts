import type { MetadataRoute } from "next";

import { listPublishedBlogPosts } from "@/lib/blog/catalogue";
import type { BlogPost } from "@/lib/blog/contracts";
import {
  listPublishedLandingPageSummaries,
  type PublicReviewSummary,
} from "@/lib/generated/landing-pages";
import { listPublishedVisibilityPageSummaries } from "@/lib/visibility-pages/catalogue";
import { indexableVisibilitySummaries } from "@/lib/visibility-pages/link-graph";
import type { VisibilityPublicationSummary } from "@/lib/visibility-pages/contracts";
import { listDecisionSets } from "@/lib/decision-journey/sets";
import { localizationPaths } from "@/lib/decision-journey/video-localization";
import { trendReports } from "@/lib/trends/trend-reports";
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
  "/blog",
  "/decision-hub",
  "/solution-hub",
  "/scenarios",
] as const;

export function buildPublicSitemap(
  config: PublicSiteConfig,
  reviews: PublicReviewSummary[],
  visibility: VisibilityPublicationSummary[] = [],
  blog: BlogPost[] = [],
): MetadataRoute.Sitemap {
  const staticEntries = publicRoutes.map<MetadataRoute.Sitemap[number]>(
    (route) => ({
      url: new URL(route, config.canonicalOrigin).toString(),
      changeFrequency: ["/", "/decision-hub", "/solution-hub", "/scenarios"].includes(route) ? "weekly" : "monthly",
    }),
  );

  const discoveryEntries = [
    ...localizationPaths,
    ...trendReports.map((report) => report.canonicalPath),
  ].map<MetadataRoute.Sitemap[number]>((route) => ({
    url: new URL(route, config.canonicalOrigin).toString(),
    changeFrequency: "weekly",
  }));

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

  const blogEntries = blog.map<MetadataRoute.Sitemap[number]>((post) => ({
    url: new URL(post.canonicalPath, config.canonicalOrigin).toString(),
    lastModified: post.modifiedAt,
    changeFrequency: "monthly",
  }));

  return [...staticEntries, ...discoveryEntries, ...reviewEntries, ...visibilityEntries, ...blogEntries];
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function sitemap(): MetadataRoute.Sitemap {
  const config = loadPublicSiteConfig();
  const base = buildPublicSitemap(
    config,
    listPublishedLandingPageSummaries(),
    listPublishedVisibilityPageSummaries(),
    listPublishedBlogPosts(),
  );
  const decisionSetEntries = listDecisionSets().flatMap((set) => [set.pages.decisionHub, set.pages.solutionHub, set.pages.scenario].map((page) => ({ url: new URL(page.canonicalPath, config.canonicalOrigin).toString(), lastModified: set.publishedAt, changeFrequency: "weekly" as const })));
  return [...base, ...decisionSetEntries];
}
