import type { Metadata } from "next";
import { StudioPage } from "@/components/landing/StudioPage";

const affiliateUrl = "https://try.elevenlabs.io/izj2b165mcsj";

const config = {
  affiliateUrl,
  productName: "ElevenLabs",
  category: "ai-voice-generation",
  hero: {
    kicker: "Conversational AI",
    title: "Voice agents that handle real calls.",
    lede: "Build phone agents that answer FAQs, qualify leads, book appointments, and transfer to humans — with sub-500ms latency and interrupt handling.",
    ctaLabel: "Build voice agent",
  },
  artwork: {
    src: "/generated/elevenlabs-v4-conversational.png",
    alt: "Conversational AI builder with call flow, latency metrics, and interrupt handling",
  },
  pillars: [
    { number: "01", title: "Design", description: "Visual flow builder: prompts, tools, knowledge base, and escalation rules." },
    { number: "02", title: "Test", description: "Simulate calls, measure latency, tune interruption sensitivity, evaluate outcomes." },
    { number: "03", title: "Deploy", description: "SIP trunk, Twilio, or web widget — one-click deploy with analytics dashboard." },
  ],
  limitations: [
    {
      title: "Phone numbers require BYOC",
      description: "Bring your own carrier (Twilio, SignalWire, Telnyx) for PSTN connectivity.",
      mitigation: "Provision numbers in your Twilio account; ElevenLabs handles the voice layer.",
    },
    {
      title: "Complex logic needs webhooks",
      description: "Multi-step workflows (CRM lookup, calendar booking) require external functions.",
      mitigation: "Use ElevenLabs tools to call your API endpoints; keep logic in your stack.",
    },
  ],
  disclosureText: "We may earn a commission if you use this link, at no extra cost to you.",
};

export const metadata: Metadata = {
  title: "ElevenLabs: Conversational Voice Agents | VettedSaaSBlueprint",
  description: "Phone agents with sub-500ms latency, interrupt handling, visual flow builder, and BYOC telephony.",
  robots: { index: false, follow: false },
};

export default function ElevenLabsV4Page() {
  return <StudioPage config={config} />;
}