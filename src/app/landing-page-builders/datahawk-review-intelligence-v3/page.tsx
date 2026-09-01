import type { Metadata } from "next";
import { StudioPage } from "@/components/landing/StudioPage";

const affiliateUrl = "https://get.datahawk.co/mau0otko9lz4-o5aq3q";

const config = {
  affiliateUrl,
  productName: "DataHawk",
  category: "ecommerce-analytics",
  hero: {
    kicker: "Review intelligence",
    title: "Turn reviews into product roadmap.",
    lede: "Semantic analysis of 1M+ reviews extracts feature requests, defect patterns, and sentiment shifts — before they hit your return rate.",
    ctaLabel: "Analyze reviews free",
  },
  artwork: {
    src: "/generated/datahawk-v3-reviews.png",
    alt: "Review sentiment clusters with feature request extraction",
  },
  pillars: [
    { number: "01", title: "Cluster", description: "NLP groups reviews by theme: durability, sizing, packaging, shipping." },
    { number: "02", title: "Trend", description: "Week-over-week sentiment delta per cluster with anomaly detection." },
    { number: "03", title: "Act", description: "Auto-generate QA tickets, listing updates, and supplier feedback." },
  ],
  limitations: [
    {
      title: "English-only analysis",
      description: "Non-English reviews (ES, FR, DE, JP, IT) are translated then analyzed — nuance loss possible.",
      mitigation: "Flag critical markets for native-speaker review quarterly.",
    },
    {
      title: "Verified purchase filter is coarse",
      description: "Can't distinguish verified buyers from incentivized reviewers reliably.",
      mitigation: "Cross-reference with order data for high-stakes decisions.",
    },
  ],
  disclosureText: "We may earn a commission if you use this link, at no extra cost to you.",
};

export const metadata: Metadata = {
  title: "DataHawk: Review Intelligence for Product Teams | VettedSaaSBlueprint",
  description: "Semantic analysis of 1M+ reviews extracts feature requests, defect patterns, and sentiment shifts.",
  robots: { index: false, follow: false },
};

export default function DataHawkV3Page() {
  return <StudioPage config={config} />;
}