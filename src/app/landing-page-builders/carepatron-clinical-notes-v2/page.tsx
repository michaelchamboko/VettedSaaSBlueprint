import type { Metadata } from "next";
import { StudioPage } from "@/components/landing/StudioPage";

const affiliateUrl = "https://get.carepatron.com/michaelmedium";

const config = {
  affiliateUrl,
  productName: "Carepatron",
  category: "healthcare-practice-management",
  hero: {
    kicker: "Clinical workflow",
    title: "Notes that write themselves, almost.",
    lede: "Voice-to-text dictation, smart templates, and auto-coding turn session documentation from a chore into a byproduct of care.",
    ctaLabel: "Try Carepatron free",
  },
  artwork: {
    src: "/generated/carepatron-v2-notes.png",
    alt: "Clinical notes interface with voice dictation and smart templates",
  },
  pillars: [
    { number: "01", title: "Dictate", description: "HIPAA-compliant voice capture turns speech into structured clinical notes." },
    { number: "02", title: "Template", description: "Specialty-specific templates auto-populate codes, vitals, and care plans." },
    { number: "03", title: "Sign", description: "One-click co-signing, version history, and audit trail built in." },
  ],
  limitations: [
    {
      title: "Dictation accuracy varies by accent",
      description: "Non-native English speakers may need more editing passes.",
      mitigation: "Train the model with 10-15 minutes of sample dictation per provider.",
    },
    {
      title: "Template customization requires admin",
      description: "Clinicians can't create new templates without practice admin permissions.",
      mitigation: "Designate a template champion per specialty to iterate quickly.",
    },
  ],
  disclosureText: "We may earn a commission if you use this link, at no extra cost to you.",
};

export const metadata: Metadata = {
  title: "Carepatron: Clinical Notes That Write Themselves | VettedSaaSBlueprint",
  description: "Voice dictation, smart templates, and auto-coding for clinical documentation that keeps pace with care.",
  robots: { index: false, follow: false },
};

export default function CarepatronV2Page() {
  return <StudioPage config={config} />;
}