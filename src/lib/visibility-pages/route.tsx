import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { VisibilityPage } from "@/components/visibility/VisibilityPage";
import { VisibilityStructuredData } from "@/components/visibility/VisibilityStructuredData";
import { VisibilityUnderReviewPage } from "@/components/visibility/VisibilityUnderReviewPage";
import { getPublishedVisibilityPage } from "@/lib/visibility-pages/catalogue";
import type { VisibilityPath } from "@/lib/visibility-pages/contracts";
import { isVisibilityPageIndexable } from "@/lib/visibility-pages/runtime-expiry";
import { loadPublicSiteConfig } from "@/lib/site/public-site";
import { loadArticleHeroForArtifact } from "@/lib/article-heroes";

function getRoute(path: VisibilityPath) {
  const record = getPublishedVisibilityPage(path);
  if (!record) notFound();
  return { record, config: loadPublicSiteConfig() };
}

export function metadataForPublishedVisibilityPage(path: VisibilityPath): Metadata {
  const { record, config } = getRoute(path);
  const indexable = isVisibilityPageIndexable(record.summary);
  const canonical = new URL(record.summary.path, config.canonicalOrigin).toString();
  if (!indexable) {
    return { title: "Guide under review", robots: { index: false, follow: false }, alternates: { canonical } };
  }
  return {
    title: record.summary.title,
    description: record.summary.description,
    robots: { index: true, follow: true },
    alternates: { canonical },
    openGraph: { title: record.summary.title, description: record.summary.description, url: canonical },
    twitter: { card: "summary_large_image", title: record.summary.title, description: record.summary.description },
  };
}

export function renderPublishedVisibilityPage(path: VisibilityPath) {
  const { record, config } = getRoute(path);
  if (!isVisibilityPageIndexable(record.summary)) return <VisibilityUnderReviewPage />;
  const reviewedHero = loadArticleHeroForArtifact("visibility", record.page.path.slice(1), record.page)?.asset;
  return (
    <>
      <VisibilityStructuredData origin={config.canonicalOrigin} summary={record.summary} />
      <VisibilityPage page={record.page} reviewedHero={reviewedHero} />
    </>
  );
}
