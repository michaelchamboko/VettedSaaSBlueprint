import type { Metadata } from "next";
import { StudioPage } from "@/components/landing/StudioPage";

const affiliateUrl = "https://get.datahawk.co/mau0otko9lz4-o5aq3q";

const config = {
  affiliateUrl,
  productName: "DataHawk",
  category: "ecommerce-analytics",
  hero: {
    kicker: "Amazon analytics",
    title: "See the keywords your competitors hide.",
    lede: "DataHawk tracks 50M+ ASINs daily — organic rank, share of voice, ad spend estimates, and review velocity — so you act on signal, not noise.",
    ctaLabel: "Explore DataHawk",
  },
  artwork: {
    src: "/generated/datahawk-v1-keywords.png",
    alt: "Keyword gap analysis showing competitor blind spots",
  },
  pillars: [
    { number: "01", title: "Discover", description: "Reverse-ASIN lookup reveals every keyword a competitor ranks for." },
    { number: "02", title: "Monitor", description: "Daily rank alerts, share-of-voice trends, and new competitor detection." },
    { number: "03", title: "Optimize", description: "Listing health score, keyword cannibalization audit, and PPC sync." },
  ],
  limitations: [
    {
      title: "Amazon-only focus",
      description: "No Walmart, Target, or Shopify marketplace data in current release.",
      mitigation: "Pair with a multi-channel tool if you sell beyond Amazon.",
    },
    {
      title: "Ad spend is modeled, not actual",
      description: "Competitor PPC estimates use proxy data — useful for direction, not exact dollars.",
      mitigation: "Treat ad spend as relative signal; validate with your own campaign data.",
    },
  ],
  disclosureText: "We may earn a commission if you use this link, at no extra cost to you.",
};

export const metadata: Metadata = {
  title: "DataHawk: Amazon Keyword Intelligence | VettedSaaSBlueprint",
  description: "Reverse-ASIN lookup, daily rank tracking, and share-of-voice for 50M+ products.",
  robots: { index: false, follow: false },
};

export default function DataHawkV1Page() {
  return <StudioPage config={config} />;
}