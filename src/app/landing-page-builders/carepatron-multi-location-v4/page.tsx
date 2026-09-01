import type { Metadata } from "next";
import { StudioPage } from "@/components/landing/StudioPage";

const affiliateUrl = "https://get.carepatron.com/michaelmedium";

const config = {
  affiliateUrl,
  productName: "Carepatron",
  category: "healthcare-practice-management",
  hero: {
    kicker: "Multi-location groups",
    title: "One dashboard for every location.",
    lede: "Unified scheduling, shared providers, consolidated billing, and org-wide analytics — without the enterprise price tag.",
    ctaLabel: "Manage multi-site free",
  },
  artwork: {
    src: "/generated/carepatron-v4-multi.png",
    alt: "Multi-location dashboard with unified calendar and analytics",
  },
  pillars: [
    { number: "01", title: "Unify", description: "Single calendar view across all sites with provider filters." },
    { number: "02", title: "Analyze", description: "Revenue, utilization, and no-show trends by location or provider." },
    { number: "03", title: "Scale", description: "Add new sites in minutes — templates carry over automatically." },
  ],
  limitations: [
    {
      title: "Cross-location reporting is read-only",
      description: "Can't bulk-edit appointments across sites from the org view.",
      mitigation: "Use site-level admin for bulk changes; org view for monitoring.",
    },
    {
      title: "Provider licensing varies by state",
      description: "Telehealth across state lines needs manual license verification.",
      mitigation: "Maintain a license tracker spreadsheet; Carepatron flags expirations.",
    },
  ],
  disclosureText: "We may earn a commission if you use this link, at no extra cost to you.",
};

export const metadata: Metadata = {
  title: "Carepatron: Multi-Location Practice Management | VettedSaaSBlueprint",
  description: "Unified scheduling, billing, and analytics for group practices — without the enterprise complexity.",
  robots: { index: false, follow: false },
};

export default function CarepatronV4Page() {
  return <StudioPage config={config} />;
}