import type { Metadata } from "next";
import { StudioPage } from "@/components/landing/StudioPage";

const affiliateUrl = "https://get.carepatron.com/michaelmedium";

const config = {
  affiliateUrl,
  productName: "Carepatron",
  category: "healthcare-practice-management",
  hero: {
    kicker: "Practice management",
    title: "Run your practice, not your paperwork.",
    lede: "Carepatron unifies scheduling, notes, billing, and client portal in one calm workspace built for modern health teams.",
    ctaLabel: "Explore Carepatron",
  },
  artwork: {
    src: "/generated/carepatron-v1-workspace.png",
    alt: "Clean clinical workspace with calendar, notes, and patient flow",
  },
  pillars: [
    { number: "01", title: "Schedule", description: "Smart calendar with recurring appointments, waitlists, and automated reminders." },
    { number: "02", title: "Document", description: "SOAP notes, treatment plans, and templates that fit your workflow." },
    { number: "03", title: "Collect", description: "Integrated billing, claims, and client portal for seamless payments." },
  ],
  limitations: [
    {
      title: "Learning curve for custom workflows",
      description: "Teams with highly specific clinical workflows may need time to adapt templates.",
      mitigation: "Start with a single discipline template, then customize incrementally.",
    },
    {
      title: "Mobile app feature parity",
      description: "The mobile experience covers core tasks but not all admin functions.",
      mitigation: "Use desktop for complex billing and reporting; mobile for schedule and notes.",
    },
  ],
  disclosureText: "We may earn a commission if you use this link, at no extra cost to you.",
};

export const metadata: Metadata = {
  title: "Carepatron: Practice Management in Motion | VettedSaaSBlueprint",
  description: "A visual fit check for health teams evaluating unified scheduling, notes, billing, and client portal.",
  robots: { index: false, follow: false },
};

export default function CarepatronV1Page() {
  return <StudioPage config={config} />;
}