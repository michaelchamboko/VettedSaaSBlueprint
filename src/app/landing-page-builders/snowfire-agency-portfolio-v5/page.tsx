import type { Metadata } from "next";
import { StudioPage } from "@/components/landing/StudioPage";

const affiliateUrl = "https://partners.snowfire.ai/j1a8kovs1uez";

const config = {
  affiliateUrl,
  productName: "Snowfire",
  category: "website-builder",
  hero: {
    kicker: "Agency & freelancer",
    title: "Deliver design systems, not just websites.",
    lede: "Hand clients a living design system with component library, documentation, and update workflow — so your work keeps compounding value after launch.",
    ctaLabel: "Deliver systems free",
  },
  artwork: {
    src: "/generated/snowfire-v5-agency.png",
    alt: "Agency handoff with design system documentation and client update workflow",
  },
  pillars: [
    { number: "01", title: "Document", description: "Auto-generated component docs: usage, variants, accessibility, do/don't examples." },
    { number: "02", title: "Govern", description: "Client update workflow: request → review → approve → sync — audit trail included." },
    { number: "03", title: "Retain", description: "Ongoing system maintenance retainer — you evolve the system, they stay current." },
  ],
  limitations: [
    {
      title: "Client adoption needs training",
      description: "Non-technical clients need onboarding to use the update workflow effectively.",
      mitigation: "Include 2-hour training session in project scope; record for future reference.",
    },
    {
      title: "Scope creep on 'small changes'",
      description: "Clients may request component modifications outside system governance.",
      mitigation: "Define change request process; bill custom component work separately.",
    },
  ],
  disclosureText: "We may earn a commission if you use this link, at no extra cost to you.",
};

export const metadata: Metadata = {
  title: "Snowfire: Agency Handoff That Compounds Value | VettedSaaSBlueprint",
  description: "Deliver a living design system with docs, governance workflow, and retention model — not just a website.",
  robots: { index: false, follow: false },
};

export default function SnowfireV5Page() {
  return <StudioPage config={config} />;
}