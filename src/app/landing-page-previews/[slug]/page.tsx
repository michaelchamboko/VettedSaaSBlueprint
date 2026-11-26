import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DirectReviewPage } from "@/components/landing/DirectReviewPage";
import { EditorialV2PreviewPage } from "@/components/landing/EditorialV2PreviewPage";
import { getCodexBatchPreview, listCodexBatchPreviewSlugs } from "@/lib/generated/codex-batch-previews";
import { getEditorialV2Preview, listEditorialV2PreviewSlugs } from "@/lib/generated/editorial-v2-previews";
import { fingerprintEditorialArtifact } from "@/lib/editorial/refinement";
import { loadArticleHero } from "@/lib/article-heroes";

export const dynamic = "force-static";

export async function generateStaticParams() {
  const slugs = new Set([...listEditorialV2PreviewSlugs(), ...(await listCodexBatchPreviewSlugs())]);
  return [...slugs].sort().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const batchPreview = await getCodexBatchPreview(slug);
  if (batchPreview) {
    return {
      title: batchPreview.blueprint.metadata.title_tag,
      description: batchPreview.blueprint.metadata.meta_description,
      robots: { index: false, follow: false },
      other: { "artifact-fingerprint": fingerprintEditorialArtifact(batchPreview.blueprint) },
    };
  }
  const preview = getEditorialV2Preview(slug);
  if (!preview) return { title: "Preview not found", robots: { index: false, follow: false } };

  return {
    title: preview.title_tag,
    description: preview.meta_description,
    robots: { index: false, follow: false },
    other: { "artifact-fingerprint": fingerprintEditorialArtifact(preview as unknown) },
  };
}

export default async function LandingPagePreview({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const batchPreview = await getCodexBatchPreview(slug);
  if (batchPreview) {
    const reviewedHero = loadArticleHero("direct-review", batchPreview.blueprint.metadata.url_slug, fingerprintEditorialArtifact(batchPreview.blueprint))?.asset;
    return (
      <DirectReviewPage
        blueprint={batchPreview.blueprint}
        mode="preview"
        affiliateUrlOverride={batchPreview.affiliate_url}
        reviewedHero={reviewedHero}
      />
    );
  }
  const preview = getEditorialV2Preview(slug);
  if (!preview) notFound();
  return <EditorialV2PreviewPage preview={preview} />;
}
