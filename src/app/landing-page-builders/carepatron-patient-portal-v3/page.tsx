import type { Metadata } from "next";
import { StudioPage } from "@/components/landing/StudioPage";

const affiliateUrl = "https://get.carepatron.com/michaelmedium";

const config = {
  affiliateUrl,
  productName: "Carepatron",
  category: "healthcare-practice-management",
  hero: {
    kicker: "Patient experience",
    title: "A portal patients actually use.",
    lede: "Self-scheduling, secure messaging, intake forms, and payment — all in a branded portal that feels like your practice, not a vendor.",
    ctaLabel: "See the patient portal",
  },
  artwork: {
    src: "/generated/carepatron-v3-portal.png",
    alt: "Patient portal with self-scheduling, messaging, and intake forms",
  },
  pillars: [
    { number: "01", title: "Book", description: "Real-time availability, insurance capture, and automated confirmation." },
    { number: "02", title: "Prepare", description: "Digital intake, consent, and history forms completed before arrival." },
    { number: "03", title: "Pay", description: "Stored cards, payment plans, and invoice history — zero phone tag." },
  ],
  limitations: [
    {
      title: "Portal adoption needs staff buy-in",
      description: "Patients won't use it if front desk keeps offering phone scheduling.",
      mitigation: "Run a 2-week portal-only scheduling trial; measure no-show rate drop.",
    },
    {
      title: "Custom branding on higher tiers",
      description: "Full white-label domain and design require Professional plan or above.",
      mitigation: "Start on Standard; upgrade when portal volume justifies the brand investment.",
    },
  ],
  disclosureText: "We may earn a commission if you use this link, at no extra cost to you.",
};

export const metadata: Metadata = {
  title: "Carepatron: Patient Portal That Feels Like Your Practice | VettedSaaSBlueprint",
  description: "Self-scheduling, intake, messaging, and payments in a branded portal patients actually adopt.",
  robots: { index: false, follow: false },
};

export default function CarepatronV3Page() {
  return <StudioPage config={config} />;
}