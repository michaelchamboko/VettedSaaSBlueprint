import type { Metadata } from "next";
import { StudioPage } from "@/components/landing/StudioPage";

const affiliateUrl = "https://partners.snowfire.ai/j1a8kovs1uez";

const config = {
  affiliateUrl,
  productName: "Snowfire",
  category: "website-builder",
  hero: {
    kicker: "Marketing velocity",
    title: "Launch campaigns in hours, not sprints.",
    lede: "Marketing teams build landing pages, microsites, and campaign funnels directly in Snowfire — no dev tickets, no CMS fights, full brand compliance.",
    ctaLabel: "Launch campaign free",
  },
  artwork: {
    src: "/generated/snowfire-v2-marketing.png",
    alt: "Marketing campaign builder with page variants, A/B tests, and analytics",
  },
  pillars: [
    { number: "01", title: "Assemble", description: "Drag components from your design system — pre-approved, on-brand, responsive." },
    { number: "02", title: "Test", description: "Native A/B testing: hero variants, CTA copy, form length — statistical significance built in." },
    { number: "03", title: "Ship", description: "One-click publish to subdomain, custom domain, or edge network — zero deploy pipeline." },
  ],
  limitations: [
    {
      title: "Design system maturity required",
      description: "If components don't exist, marketers can't build — they wait on design/dev.",
      mitigation: "Invest in component library first; treat as product, not project.",
    },
    {
      title: "Complex logic needs dev handoff",
      description: "Dynamic pricing, user-state content, integrations require code components.",
      mitigation: "Define component contracts; dev builds logic, marketing assembles.",
    },
  ],
  disclosureText: "We may earn a commission if you use this link, at no extra cost to you.",
};

export const metadata: Metadata = {
  title: "Snowfire: Marketing Velocity Without Dev Tickets | VettedSaaSBlueprint",
  description: "Marketing teams build landing pages, A/B test, and ship from design system — no dev tickets required.",
  robots: { index: false, follow: false },
};

export default function SnowfireV2Page() {
  return <StudioPage config={config} />;
}