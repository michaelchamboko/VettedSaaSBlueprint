import type { Metadata } from "next";
import { StudioPage } from "@/components/landing/StudioPage";

const affiliateUrl = "https://try.elevenlabs.io/izj2b165mcsj";

const config = {
  affiliateUrl,
  productName: "ElevenLabs",
  category: "ai-voice-generation",
  hero: {
    kicker: "Dubbing & localization",
    title: "Same voice, 29 languages — lip-synced.",
    lede: "Upload video, ElevenLabs translates, clones the original speaker's voice in each language, and re-times to match lip movements.",
    ctaLabel: "Dub a video free",
  },
  artwork: {
    src: "/generated/elevenlabs-v3-dubbing.png",
    alt: "Dubbing studio with timeline, voice cloning per language, and lip sync",
  },
  pillars: [
    { number: "01", title: "Translate", description: "Context-aware translation preserves tone, idioms, and brand terminology." },
    { number: "02", title: "Clone", description: "Source speaker's voice recreated in each target language with accent control." },
    { number: "03", title: "Sync", description: "Automatic lip-sync alignment with manual override for tricky phonemes." },
  ],
  limitations: [
    {
      title: "Lip-sync quality varies by language",
      description: "Languages with very different phoneme timing (e.g., Japanese ↔ English) need more manual correction.",
      mitigation: "Budget 20% extra review time for high phonetic-distance language pairs.",
    },
    {
      title: "Background audio separation required",
      description: "Music, SFX, or overlapping speakers break the pipeline.",
      mitigation: "Provide clean dialogue stems; use stem separation tools for mixed audio.",
    },
  ],
  disclosureText: "We may earn a commission if you use this link, at no extra cost to you.",
};

export const metadata: Metadata = {
  title: "ElevenLabs: AI Dubbing That Matches Lips | VettedSaaSBlueprint",
  description: "Video translation with voice cloning in 29 languages and automatic lip-sync alignment.",
  robots: { index: false, follow: false },
};

export default function ElevenLabsV3Page() {
  return <StudioPage config={config} />;
}