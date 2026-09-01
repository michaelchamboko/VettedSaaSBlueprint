import type { Metadata } from "next";
import { StudioPage } from "@/components/landing/StudioPage";

const affiliateUrl = "https://free-trial.adcreative.ai/8phdnllve4xi";

const config = {
  affiliateUrl,
  productName: "AdCreative.ai",
  category: "ai-ad-creative",
  hero: {
    kicker: "Creative analytics",
    title: "Know which creative *why* before you spend.",
    lede: "Creative Insights breaks down every element — color, copy, layout, CTA, hook — and tells you what's driving CTR, CVR, and ROAS across your account.",
    ctaLabel: "Analyze creatives free",
  },
  artwork: {
    src: "/generated/adcreative-v2-insights.png",
    alt: "Creative analytics dashboard with element-level performance breakdown",
  },
  pillars: [
    { number: "01", title: "Deconstruct", description: "AI tags every creative: background, headline, CTA, offer, format, emotion." },
    { number: "02", title: "Correlate", description: "Statistical link between creative elements and performance metrics." },
    { number: "03", title: "Prescribe", description: "Winning formulas per audience, placement, and campaign objective." },
  ],
  limitations: [
    {
      title: "Requires ad account connection",
      description: "Insights need Meta/Google/TikTok API access with sufficient spend history.",
      mitigation: "Connect accounts with 30+ days of spend; new accounts get benchmark-only insights.",
    },
    {
      title: "Correlation ≠ causation",
      description: "Element-level insights show patterns, not proven causation without controlled tests.",
      mitigation: "Use insights to form hypotheses; validate with structured A/B tests.",
    },
  ],
  disclosureText: "We may earn a commission if you use this link, at no extra cost to you.",
};

export const metadata: Metadata = {
  title: "AdCreative.ai: Creative Analytics That Explains Why | VettedSaaSBlueprint",
  description: "Element-level creative breakdown — color, copy, layout, CTA — correlated with CTR, CVR, ROAS.",
  robots: { index: false, follow: false },
};

export default function AdCreativeV2Page() {
  return <StudioPage config={config} />;
}