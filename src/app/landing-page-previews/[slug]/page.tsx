import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EditorialV2PreviewPage } from "@/components/landing/EditorialV2PreviewPage";
import { getEditorialV2Preview, listEditorialV2PreviewSlugs } from "@/lib/generated/editorial-v2-previews";

export const dynamic = "force-static";

export function generateStaticParams() {
  return listEditorialV2PreviewSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
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
  const preview = getEditorialV2Preview(slug);
  if (!preview) notFound();
  return <EditorialV2PreviewPage preview={preview} />;
}
