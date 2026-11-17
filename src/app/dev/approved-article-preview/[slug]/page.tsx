import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ReferenceComposedReviewPage } from "@/components/landing/ReferenceComposedReviewPage";
import { validateApprovedArticlePreview } from "@/lib/article-import/approved-article-preview";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Dev Preview: ${slug}`,
    robots: { index: false, follow: false },
  };
}

export default async function DevApprovedArticlePreview({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ importId?: string }>;
}) {
  const { slug } = await params;
  const { importId } = await searchParams;

  if (!importId) notFound();

  const result = validateApprovedArticlePreview(slug, importId, process.cwd());

  if (!result.ok || !result.blueprint) notFound();

  return (
    <ReferenceComposedReviewPage
      blueprint={result.blueprint}
      mode="preview"
      affiliateUrlOverride={result.affiliateUrlOverride}
    />
  );
}
