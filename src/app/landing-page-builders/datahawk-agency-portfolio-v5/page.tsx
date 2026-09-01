import type { Metadata } from "next";
import { StudioPage } from "@/components/landing/StudioPage";

const affiliateUrl = "https://get.datahawk.co/mau0otko9lz4-o5aq3q";

const config = {
  affiliateUrl,
  productName: "DataHawk",
  category: "ecommerce-analytics",
  hero: {
    kicker: "Agency & portfolio",
    title: "One dashboard for every brand you manage.",
    lede: "Multi-account rollup, white-label reporting, client portal, and team permissions — built for agencies running 10+ Amazon accounts.",
    ctaLabel: "Manage portfolio free",
  },
  artwork: {
    src: "/generated/datahawk-v5-agency.png",
    alt: "Multi-account agency dashboard with white-label reports",
  },
  pillars: [
    { number: "01", title: "Rollup", description: "Consolidated P&L, inventory health, and ad performance across all accounts." },
    { number: "02", title: "Report", description: "Scheduled white-label PDFs with your logo, commentary, and client branding." },
    { number: "03", title: "Delegate", description: "Role-based access: analyst, manager, client — each sees only their slice." },
  ],
  limitations: [
    {
      title: "Client portal on Enterprise only",
      description: "Self-serve client login requires custom contract and setup fee.",
      mitigation: "Use scheduled email reports for Standard/Pro clients; upgrade for portal.",
    },
    {
      title: "Cross-account budget pacing is manual",
      description: "No shared budget pool with auto-reallocation across client accounts.",
      mitigation: "Set monthly caps per account; review pacing weekly in team sync.",
    },
  ],
  disclosureText: "We may earn a commission if you use this link, at no extra cost to you.",
};

export const metadata: Metadata = {
  title: "DataHawk: Multi-Account Amazon Portfolio Management | VettedSaaSBlueprint",
  description: "Consolidated P&L, white-label reports, client portal, and team permissions for agencies.",
  robots: { index: false, follow: false },
};

export default function DataHawkV5Page() {
  return <StudioPage config={config} />;
}