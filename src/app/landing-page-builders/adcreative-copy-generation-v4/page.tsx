import type { Metadata } from "next";
import { StudioPage } from "@/components/landing/StudioPage";

const affiliateUrl = "https://free-trial.adcreative.ai/8phdnllve4xi";

const config = {
  affiliateUrl,
  productName: "AdCreative.ai",
  category: "ai-ad-creative",
  hero: {
    kicker: "Copy that converts",
    title: "Headlines, hooks, and CTAs — written by your best performer.",
    lede: "Text AI analyzes your winning copy, learns your brand voice, and generates headlines, primary text, and CTAs for every format and audience.",
    ctaLabel: "Write copy free",
  },
  artwork: {
    src: "/generated/adcreative-v4-copy.png",
    alt: "Copy generation with brand voice, format variants, and performance scores",
  },
  pillars: [
    { number: "01", title: "Voice", description: "Upload 10 winners — AI extracts tone, structure, vocabulary, and emotional triggers." },
    { number: "02", title: "Variants", description: "Generate 20+ angles per hook: pain-point, benefit, curiosity, social proof, urgency." },
    { number: "03", title: "Score", description: "Predicted CTR per variant; auto-rank and export top 3 for testing." },
  ],
  limitations: [
    {
      title: "Brand voice needs examples",
      description: "Under 5 winning ads, voice defaults to category benchmarks.",
      mitigation: "Feed competitor copy as reference; refine as your library grows.",
    },
    {
      title: "Compliance review still manual",
      description: "AI doesn't know platform policy changes (medical claims, financial disclaimers, etc.).",
      mitigation: "Route generated copy through compliance checklist before launch.",
    },
  ],
  disclosureText: "We may earn a commission if you use this link, at no extra cost to you.",
};

export const metadata: Metadata = {
  title: "AdCreative.ai: AI Copy That Matches Your Voice | VettedSaaSBlueprint",
  description: "Brand-trained copy AI generates 20+ headline angles with predicted CTR scores per variant.",
  robots: { index: false, follow: false },
};

export default function AdCreativeV4Page() {
  return <StudioPage config={config} />;
}