import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { DirectReviewPage } from "@/components/landing/DirectReviewPage";
import { getPublishedLandingPageRecord, listPublishedLandingPageParams } from "@/lib/generated/landing-pages";
import { loadPublicSiteConfig } from "@/lib/site/public-site";
import { loadArticleHero } from "@/lib/article-heroes";
import { fingerprintEditorialArtifact } from "@/lib/editorial/refinement";

export const dynamic = "force-static";

export function generateStaticParams() {
  return listPublishedLandingPageParams();
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const published = getPublishedLandingPageRecord(slug);
  if (!published) return { title: "Page not found" };
  const { blueprint } = published;
  const config = loadPublicSiteConfig();
  const robotsValue = blueprint.metadata.robots.toLowerCase().split(",").map((value) => value.trim()).join(",");
  const canIndex = robotsValue === "index,follow";
  let canonical = `${config.canonicalOrigin}/landing-page-builders/${slug}`;
  try {
    const candidate = new URL(blueprint.metadata.canonical_url ?? "");
    if (candidate.protocol === "https:" && candidate.origin === config.canonicalOrigin) canonical = candidate.toString();
  } catch {}
  return {
    title: blueprint.metadata.title_tag,
    description: blueprint.metadata.meta_description,
    robots: { index: canIndex, follow: canIndex },
    alternates: { canonical },
  };
}

export default async function LandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const published = getPublishedLandingPageRecord(slug);
  if (!published) notFound();
  const reviewedHero = loadArticleHero("direct-review", published.blueprint.metadata.url_slug, fingerprintEditorialArtifact(published.blueprint))?.asset;
  return (
    <DirectReviewPage
      blueprint={published.blueprint}
      affiliateUrlOverride={published.exactAffiliateUrl ?? undefined}
      reviewedHero={reviewedHero}
    />
  );
}
