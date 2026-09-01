import type { Metadata } from "next";
import { StudioPage } from "@/components/landing/StudioPage";

const affiliateUrl = "https://free-trial.adcreative.ai/8phdnllve4xi";

const config = {
  affiliateUrl,
  productName: "AdCreative.ai",
  category: "ai-ad-creative",
  hero: {
    kicker: "Agency portfolio",
    title: "One platform for every client's creative engine.",
    lede: "Multi-brand workspaces, shared asset library, client approval workflows, and white-label reporting — built for agencies running 20+ ad accounts.",
    ctaLabel: "Manage clients free",
  },
  artwork: {
    src: "/generated/adcreative-v5-agency.png",
    alt: "Agency dashboard with multi-brand workspaces and client approval flow",
  },
  pillars: [
    { number: "01", title: "Organize", description: "Separate brand kits, workspaces, and billing per client — zero cross-contamination." },
    { number: "02", title: "Collaborate", description: "Client review links with annotated feedback, version history, and one-click approval." },
    { number: "03", title: "Report", description: "White-label performance reports with your logo, commentary, and client branding." },
  ],
  limitations: [
    {
      title: "Client seats on higher tiers",
      description: "Collaborator seats capped on Pro; unlimited on Enterprise only.",
      mitigation: "Use shareable review links for Pro clients; upgrade for full portal access.",
    },
    {
      title: "Cross-client learning is opt-in",
      description: "Anonymized performance insights across portfolio require explicit consent.",
      mitigation: "Enable in workspace settings; aggregates patterns without exposing client data.",
    },
  ],
  disclosureText: "We may earn a commission if you use this link, at no extra cost to you.",
};

export const metadata: Metadata = {
  title: "AdCreative.ai: Multi-Brand Creative Platform for Agencies | VettedSaaSBlueprint",
  description: "Multi-brand workspaces, client approval workflows, white-label reports — built for agencies at scale.",
  robots: { index: false, follow: false },
};

export default function AdCreativeV5Page() {
  return <StudioPage config={config} />;
}