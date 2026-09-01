import type { Metadata } from "next";
import { StudioPage } from "@/components/landing/StudioPage";

const affiliateUrl = "https://try.elevenlabs.io/izj2b165mcsj";

const config = {
  affiliateUrl,
  productName: "ElevenLabs",
  category: "ai-voice-generation",
  hero: {
    kicker: "Long-form narration",
    title: "Chapters, not clips — 10 hours in one generation.",
    lede: "Projects workflow stitches chapters, preserves voice consistency across sessions, and exports chapterized audiobooks ready for ACX.",
    ctaLabel: "Build audiobook free",
  },
  artwork: {
    src: "/generated/elevenlabs-v2-projects.png",
    alt: "Projects interface with chapter management and voice consistency",
  },
  pillars: [
    { number: "01", title: "Structure", description: "Import manuscript, auto-split chapters, assign voices per character." },
    { number: "02", title: "Consistency", description: "Voice settings lock per character — narrator stays narrator across 50 chapters." },
    { number: "03", title: "Deliver", description: "Export MP3/FLAC per chapter with ACX-compliant loudness and metadata." },
  ],
  limitations: [
    {
      title: "Character limit per generation",
      description: "~5,000 characters per API call; long chapters need chunking.",
      mitigation: "Projects UI handles chunking automatically; API users implement retry logic.",
    },
    {
      title: "Pronunciation dictionary is manual",
      description: "No auto-detection for names, acronyms, or fictional terms.",
      mitigation: "Build a custom pronunciation dictionary in Project settings before generating.",
    },
  ],
  disclosureText: "We may earn a commission if you use this link, at no extra cost to you.",
};

export const metadata: Metadata = {
  title: "ElevenLabs: Audiobook Production at Scale | VettedSaaSBlueprint",
  description: "Projects workflow for long-form: chapter management, voice consistency, ACX-ready export.",
  robots: { index: false, follow: false },
};

export default function ElevenLabsV2Page() {
  return <StudioPage config={config} />;
}