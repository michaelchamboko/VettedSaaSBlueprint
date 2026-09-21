import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { PublicPageShell } from "@/components/public/PublicPageShell";
import { TrendReport } from "@/components/public/TrendReport";
import { getTrendReport, listTrendReportParams } from "@/lib/trends/trend-reports";
import { loadPublicSiteConfig } from "@/lib/site/public-site";

export const dynamic = "force-static";

export function generateStaticParams() {
  return listTrendReportParams();
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const report = getTrendReport(slug);
  if (!report) return { title: "Page not found" };
  const config = loadPublicSiteConfig();
  return {
    title: report.cardTitle,
    description: report.description,
    alternates: {
      canonical: new URL(report.canonicalPath, config.canonicalOrigin).toString(),
    },
  };
}

export default async function TrendReportPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const report = getTrendReport(slug);
  if (!report) notFound();

  return (
    <PublicPageShell>
      <TrendReport report={report} />
    </PublicPageShell>
  );
}
