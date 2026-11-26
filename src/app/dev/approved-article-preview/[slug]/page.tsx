import type { Metadata } from "next";
import { cache } from "react";
import { fingerprintEditorialArtifact } from "@/lib/editorial/refinement";
import { DirectReviewPage } from "@/components/landing/DirectReviewPage";
import { notFound } from "next/navigation";

import { ReferenceComposedReviewPage } from "@/components/landing/ReferenceComposedReviewPage";
import { validateApprovedArticlePreview } from "@/lib/article-import/approved-article-preview";
import { loadArticleHeroForArtifact } from "@/lib/article-heroes";

export const dynamic = "force-dynamic";

type PreviewProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ importId?: string; packetPreview?: string }>;
};

const approved = cache((slug: string, id: string, scoped: boolean) =>
  validateApprovedArticlePreview(slug, id, process.cwd(), scoped ? "direct-review" : "reference"));

export async function generateMetadata({ params, searchParams }: PreviewProps): Promise<Metadata> {
  const { slug } = await params;
  const { importId, packetPreview } = await searchParams;
  const result = importId && packetPreview === "1" ? await approved(slug, importId, true) : undefined;
  return {
    title: result?.blueprint?.metadata.title_tag ?? `Dev Preview: ${slug}`,
    robots: { index: false, follow: false },
    ...(result?.blueprint && { other: { "artifact-fingerprint": fingerprintEditorialArtifact(result.blueprint) } }),
  };
}

export default async function DevApprovedArticlePreview({ params, searchParams }: PreviewProps) {
  const { slug } = await params;
  const { importId, packetPreview } = await searchParams;
  if (!importId) notFound();
  const result = await approved(slug, importId, packetPreview === "1");
  if (!result.ok || !result.blueprint) notFound();
  const reviewedHero = loadArticleHeroForArtifact("direct-review", result.blueprint.metadata.url_slug, result.blueprint)?.asset;
  if (packetPreview === "1") return <DirectReviewPage blueprint={result.blueprint} mode="preview" affiliateUrlOverride={result.affiliateUrlOverride} reviewedHero={reviewedHero} />;

  return (
    <ReferenceComposedReviewPage
      blueprint={result.blueprint}
      mode="preview"
      affiliateUrlOverride={result.affiliateUrlOverride}
      reviewedHero={reviewedHero}
    />
  );
}
