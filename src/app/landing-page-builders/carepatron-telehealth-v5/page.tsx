import type { Metadata } from "next";
import { StudioPage } from "@/components/landing/StudioPage";

const affiliateUrl = "https://get.carepatron.com/michaelmedium";

const config = {
  affiliateUrl,
  productName: "Carepatron",
  category: "healthcare-practice-management",
  hero: {
    kicker: "Telehealth native",
    title: "Video visits that feel like house calls.",
    lede: "HIPAA-compliant video, screen-share for education, group sessions, and automated recording consent — all inside the patient chart.",
    ctaLabel: "Launch telehealth free",
  },
  artwork: {
    src: "/generated/carepatron-v5-telehealth.png",
    alt: "Telehealth interface with video, screen share, and chart integration",
  },
  pillars: [
    { number: "01", title: "Connect", description: "Browser-based video — no patient download, waiting room, or PIN." },
    { number: "02", title: "Teach", description: "Screen-share exercises, annotate PDFs, co-browse patient portal." },
    { number: "03", title: "Document", description: "Auto-linked visit notes, consent logs, and recording metadata." },
  ],
  limitations: [
    {
      title: "Group sessions limited to 6 participants",
      description: "Larger group therapy or classes need external video tools.",
      mitigation: "Use Carepatron for 1:1 and small groups; integrate Zoom for larger cohorts.",
    },
    {
      title: "Recording storage on paid plans",
      description: "Session recordings require Professional plan; 90-day retention on Standard.",
      mitigation: "Download recordings locally if on Standard; upgrade for cloud archive.",
    },
  ],
  disclosureText: "We may earn a commission if you use this link, at no extra cost to you.",
};

export const metadata: Metadata = {
  title: "Carepatron: Telehealth That Feels Like House Calls | VettedSaaSBlueprint",
  description: "HIPAA video, screen-share education, group sessions, and auto-documentation — all in the chart.",
  robots: { index: false, follow: false },
};

export default function CarepatronV5Page() {
  return <StudioPage config={config} />;
}