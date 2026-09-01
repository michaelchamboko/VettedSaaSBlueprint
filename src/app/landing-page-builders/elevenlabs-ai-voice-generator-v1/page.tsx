import type { Metadata } from "next";
import { StudioPage } from "@/components/landing/StudioPage";

const affiliateUrl = "https://try.elevenlabs.io/izj2b165mcsj";

const config = {
  affiliateUrl,
  productName: "ElevenLabs",
  category: "ai-voice-generation",
  hero: {
    kicker: "AI voice generation",
    title: "Voices that sound like they showed up.",
    lede: "ElevenLabs gives you 120+ voices, 29 languages, and voice cloning that captures breath, hesitation, and the micro-pauses that make speech human.",
    ctaLabel: "Generate free",
  },
  artwork: {
    src: "/generated/elevenlabs-v1-voices.png",
    alt: "Voice library with emotion controls and language selectors",
  },
  pillars: [
    { number: "01", title: "Choose", description: "Curated library: narrators, characters, conversational, multilingual." },
    { number: "02", title: "Direct", description: "Stability, similarity, style exaggeration — per-sentence or global." },
    { number: "03", title: "Clone", description: "1-minute sample creates a voice that reads anything in your tone." },
  ],
  limitations: [
    {
      title: "Cloning needs clean audio",
      description: "Background noise, music, or reverb degrades clone quality significantly.",
      mitigation: "Record 60 seconds in a quiet room with a decent mic; avoid processing.",
    },
    {
      title: "Commercial rights on paid plans",
      description: "Free tier is non-commercial; Creator+ required for monetized content.",
      mitigation: "Test on free, upgrade before publishing revenue-generating work.",
    },
  ],
  disclosureText: "We may earn a commission if you use this link, at no extra cost to you.",
};

export const metadata: Metadata = {
  title: "ElevenLabs: AI Voices That Sound Human | VettedSaaSBlueprint",
  description: "120+ voices, 29 languages, voice cloning, and per-sentence emotion control for creators.",
  robots: { index: false, follow: false },
};

export default function ElevenLabsV1Page() {
  return <StudioPage config={config} />;
}