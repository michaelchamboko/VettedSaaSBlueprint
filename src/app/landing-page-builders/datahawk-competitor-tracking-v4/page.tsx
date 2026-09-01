import type { Metadata } from "next";
import { StudioPage } from "@/components/landing/StudioPage";

const affiliateUrl = "https://get.datahawk.co/mau0otko9lz4-o5aq3q";

const config = {
  affiliateUrl,
  productName: "DataHawk",
  category: "ecommerce-analytics",
  hero: {
    kicker: "Competitor tracking",
    title: "Watch their catalog, not just their bestseller.",
    lede: "Track new ASIN launches, bundle strategies, pricing experiments, and category expansions across your competitive set — automatically.",
    ctaLabel: "Track competitors",
  },
  artwork: {
    src: "/generated/datahawk-v4-competitor.png",
    alt: "Competitor catalog timeline with launch detection",
  },
  pillars: [
    { number: "01", title: "Detect", description: "New ASIN alerts within 24 hours of launch — title, images, price, keywords." },
    { number: "02", title: "Map", description: "Visualize competitor category coverage and whitespace opportunities." },
    { number: "03", title: "Benchmark", description: "Compare your launch velocity, review velocity, and rank velocity vs. peers." },
  ],
  limitations: [
    {
      title: "Private label blind spots",
      description: "Competitors launching under unknown brands won't be linked to their portfolio.",
      mitigation: "Monitor trademark filings and supplier lists for early signals.",
    },
    {
      title: "Bundle decomposition is heuristic",
      description: "Multi-pack and virtual bundle contents inferred, not confirmed.",
      mitigation: "Validate high-impact bundles manually before strategic decisions.",
    },
  ],
  disclosureText: "We may earn a commission if you use this link, at no extra cost to you.",
};

export const metadata: Metadata = {
  title: "DataHawk: Competitor Catalog Intelligence | VettedSaaSBlueprint",
  description: "New ASIN detection, category mapping, and launch velocity benchmarking across your competitive set.",
  robots: { index: false, follow: false },
};

export default function DataHawkV4Page() {
  return <StudioPage config={config} />;
}