import type { Metadata } from "next";
import { StudioPage } from "@/components/landing/StudioPage";

const affiliateUrl = "https://free-trial.adcreative.ai/8phdnllve4xi";

const config = {
  affiliateUrl,
  productName: "AdCreative.ai",
  category: "ai-ad-creative",
  hero: {
    kicker: "Product photography",
    title: "Studio shots without the studio.",
    lede: "Upload a product photo on white — AI generates lifestyle scenes, model placements, and seasonal variations with consistent lighting and shadows.",
    ctaLabel: "Generate product shots",
  },
  artwork: {
    src: "/generated/adcreative-v3-product.png",
    alt: "Product photography AI with lifestyle scenes and consistent lighting",
  },
  pillars: [
    { number: "01", title: "Place", description: "Choose scene: kitchen, outdoors, office, lifestyle — AI matches perspective and lighting." },
    { number: "02", title: "Style", description: "Seasonal themes, brand color accents, text overlays, and aspect ratios for every placement." },
    { number: "03", title: "Scale", description: "Generate 100+ variations from one source image — batch export for catalog." },
  ],
  limitations: [
    {
      title: "Source image quality gates output",
      description: "Low-res, busy backgrounds, or inconsistent lighting produce artifacts.",
      mitigation: "Use 1000px+ white-background product shots; batch process for consistency.",
    },
    {
      title: "Complex reflections need review",
      description: "Glass, metal, and transparent materials may show rendering artifacts.",
      mitigation: "Flag reflective SKUs for manual touch-up; use matte shots where possible.",
    },
  ],
  disclosureText: "We may earn a commission if you use this link, at no extra cost to you.",
};

export const metadata: Metadata = {
  title: "AdCreative.ai: AI Product Photography at Scale | VettedSaaSBlueprint",
  description: "One white-background photo → 100+ lifestyle scenes with consistent lighting for catalog and ads.",
  robots: { index: false, follow: false },
};

export default function AdCreativeV3Page() {
  return <StudioPage config={config} />;
}