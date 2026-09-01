import type { Metadata } from "next";
import { StudioPage } from "@/components/landing/StudioPage";

const affiliateUrl = "https://partners.snowfire.ai/j1a8kovs1uez";

const config = {
  affiliateUrl,
  productName: "Snowfire",
  category: "website-builder",
  hero: {
    kicker: "Developer experience",
    title: "Your design system, as code you own.",
    lede: "Snowfire exports clean React/Next.js components with TypeScript types, Storybook stories, and CSS variables — sync to Git, version with your app.",
    ctaLabel: "Export components free",
  },
  artwork: {
    src: "/generated/snowfire-v3-developer.png",
    alt: "Developer export with React components, TypeScript types, and Storybook",
  },
  pillars: [
    { number: "01", title: "Sync", description: "Bidirectional: design in Snowfire → code in repo → changes in code reflect back." },
    { number: "02", title: "Type", description: "Full TypeScript definitions for tokens, component props, and variant configs." },
    { number: "03", title: "Extend", description: "Compose Snowfire primitives with your custom React — no vendor lock-in." },
  ],
  limitations: [
    {
      title: "Sync requires CI/CD setup",
      description: "Automatic sync needs GitHub Actions or similar; manual export always available.",
      mitigation: "Add provided workflow file; first sync in 10 minutes.",
    },
    {
      title: "Advanced animations need custom code",
      description: "Complex GSAP/Framer animations exceed component prop model.",
      mitigation: "Use Snowfire for structure; wrap with custom animation components.",
    },
  ],
  disclosureText: "We may earn a commission if you use this link, at no extra cost to you.",
};

export const metadata: Metadata = {
  title: "Snowfire: Design System as Code for Developers | VettedSaaSBlueprint",
  description: "Export React/Next.js components with TypeScript, Storybook, CSS variables — bidirectional Git sync.",
  robots: { index: false, follow: false },
};

export default function SnowfireV3Page() {
  return <StudioPage config={config} />;
}