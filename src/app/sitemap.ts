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
      changeFrequency: route === "/" ? "weekly" : "monthly",
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

  const blogEntries = blog.map<MetadataRoute.Sitemap[number]>((post) => ({
    url: new URL(post.canonicalPath, config.canonicalOrigin).toString(),
    lastModified: post.modifiedAt,
    changeFrequency: "monthly",
  }));

  return [...staticEntries, ...reviewEntries, ...visibilityEntries, ...blogEntries];
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function sitemap(): MetadataRoute.Sitemap {
  return buildPublicSitemap(
    loadPublicSiteConfig(),
    listPublishedLandingPageSummaries(),
    listPublishedVisibilityPageSummaries(),
    listPublishedBlogPosts(),
  );
}
