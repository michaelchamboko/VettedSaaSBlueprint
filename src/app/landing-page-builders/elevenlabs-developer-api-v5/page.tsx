import type { Metadata } from "next";
import { StudioPage } from "@/components/landing/StudioPage";

const affiliateUrl = "https://try.elevenlabs.io/izj2b165mcsj";

const config = {
  affiliateUrl,
  productName: "ElevenLabs",
  category: "ai-voice-generation",
  hero: {
    kicker: "Developer API",
    title: "Stream TTS in 400ms — any voice, any language.",
    lede: "WebSocket streaming, per-chunk latency under 100ms, voice settings as query params, and SDKs for Python, Node, React, and React Native.",
    ctaLabel: "Read API docs",
  },
  artwork: {
    src: "/generated/elevenlabs-v5-api.png",
    alt: "API playground with streaming audio, voice params, and code snippets",
  },
  pillars: [
    { number: "01", title: "Stream", description: "WebSocket TTS with chunked audio — play before generation finishes." },
    { number: "02", title: "Control", description: "stability, similarity_boost, style, speaker_boost — all real-time adjustable." },
    { number: "03", title: "Integrate", description: "Official SDKs, OpenAPI spec, webhook events, and usage analytics." },
  ],
  limitations: [
    {
      title: "Rate limits on streaming",
      description: "Concurrent streams capped by plan; burst handling needs queueing.",
      mitigation: "Implement client-side queue with exponential backoff for high-volume apps.",
    },
    {
      title: "No SSML support",
      description: "Prosody control via API params only — no markup for fine-grained control.",
      mitigation: "Use style exaggeration + stability for macro control; accept limits.",
    },
  ],
  disclosureText: "We may earn a commission if you use this link, at no extra cost to you.",
};

export const metadata: Metadata = {
  title: "ElevenLabs: Streaming TTS API for Developers | VettedSaaSBlueprint",
  description: "WebSocket streaming, 400ms first-byte, real-time voice params, SDKs for Python/Node/React.",
  robots: { index: false, follow: false },
};

export default function ElevenLabsV5Page() {
  return <StudioPage config={config} />;
}