import type { Metadata } from "next";
import { StudioPage } from "@/components/landing/StudioPage";

const affiliateUrl = "https://partners.snowfire.ai/j1a8kovs1uez";

const config = {
  affiliateUrl,
  productName: "Snowfire",
  category: "website-builder",
  hero: {
    kicker: "Design system builder",
    title: "Components that scale, not pages that break.",
    lede: "Snowfire lets you build a design system — tokens, components, patterns — then assemble pages that inherit updates automatically. Change a token, update 500 pages.",
    ctaLabel: "Build system free",
  },
  artwork: {
    src: "/generated/snowfire-v1-system.png",
    alt: "Design system interface with tokens, components, and page instances",
  },
  pillars: [
    { number: "01", title: "Tokenize", description: "Color, spacing, typography, radius, shadow — defined once as semantic tokens." },
    { number: "02", title: "Componentize", description: "Build atoms → molecules → organisms with variant props and responsive logic." },
    { number: "03", title: "Synchronize", description: "Pages consume components; token changes propagate instantly across the site." },
  ],
  limitations: [
    {
      title: "Learning curve for token thinking",
      description: "Teams used to page builders need mindset shift to component architecture.",
      mitigation: "Start with a pilot project: rebuild one section as components first.",
    },
    {
      title: "Custom code escape hatches limited",
      description: "Can't inject arbitrary React/JS into component slots — by design.",
      mitigation: "Use code components for complex logic; keep design system pure for UI.",
    },
  ],
  disclosureText: "We may earn a commission if you use this link, at no extra cost to you.",
};

export const metadata: Metadata = {
  title: "Snowfire: Design System Website Builder | VettedSaaSBlueprint",
  description: "Tokens, components, patterns — build once, propagate everywhere. Change a token, update 500 pages.",
  robots: { index: false, follow: false },
};

export default function SnowfireV1Page() {
  return <StudioPage config={config} />;
}