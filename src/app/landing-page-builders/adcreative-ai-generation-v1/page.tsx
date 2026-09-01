import type { Metadata } from "next";
import { StudioPage } from "@/components/landing/StudioPage";

const affiliateUrl = "https://free-trial.adcreative.ai/8phdnllve4xi";

const config = {
  affiliateUrl,
  productName: "AdCreative.ai",
  category: "ai-ad-creative",
  hero: {
    kicker: "AI ad creative",
    title: "Creative that converts, generated in seconds.",
    lede: "AdCreative.ai trains on your brand, your winners, and 100M+ high-performing ads to generate conversion-optimized creatives for Meta, Google, and TikTok.",
    ctaLabel: "Generate creatives free",
  },
  artwork: {
    src: "/generated/adcreative-v1-generation.png",
    alt: "Ad generation interface with brand kit, format selector, and preview",
  },
  pillars: [
    { number: "01", title: "Brand", description: "Upload logo, colors, fonts, and winning ads — AI learns your visual language." },
    { number: "02", title: "Generate", description: "Select format, input hook, get 50+ variations ranked by predicted CTR." },
    { number: "03", title: "Iterate", description: "One-click variants, background swap, copy rewrite, and A/B test export." },
  ],
  limitations: [
    {
      title: "Brand training needs volume",
      description: "Under 50 historical ads, predictions rely more on general benchmarks than your data.",
      mitigation: "Upload competitor ads as reference; predictions improve as you run campaigns.",
    },
    {
      title: "Video generation is beta",
      description: "Static and carousel are production-ready; video UGC-style is early access.",
      mitigation: "Use static for core campaigns; test video as experimental budget slice.",
    },
  ],
  disclosureText: "We may earn a commission if you use this link, at no extra cost to you.",
};

export const metadata: Metadata = {
  title: "AdCreative.ai: Conversion-Optimized Ad Generation | VettedSaaSBlueprint",
  description: "Brand-trained AI generates 50+ ad variations ranked by predicted CTR for Meta, Google, TikTok.",
  robots: { index: false, follow: false },
};

export default function AdCreativeV1Page() {
  return <StudioPage config={config} />;
}