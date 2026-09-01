import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DirectReviewPage } from "@/components/landing/DirectReviewPage";
import { EditorialV2PreviewPage } from "@/components/landing/EditorialV2PreviewPage";
import { getCodexBatchPreview, listCodexBatchPreviewSlugs } from "@/lib/generated/codex-batch-previews";
import { getEditorialV2Preview, listEditorialV2PreviewSlugs } from "@/lib/generated/editorial-v2-previews";

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
    };
  }
  const preview = getEditorialV2Preview(slug);
  if (!preview) return { title: "Preview not found", robots: { index: false, follow: false } };

  return {
    title: preview.title_tag,
    description: preview.meta_description,
    robots: { index: false, follow: false },
  };
}

export default async function LandingPagePreview({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const batchPreview = await getCodexBatchPreview(slug);
  if (batchPreview) {
    return (
      <DirectReviewPage
        blueprint={batchPreview.blueprint}
        analyticsEnabled={false}
        mode="preview"
        affiliateUrlOverride={batchPreview.affiliate_url}
      />
    );
  }
  const preview = getEditorialV2Preview(slug);
  if (!preview) notFound();
  return <EditorialV2PreviewPage preview={preview} />;
}
