import type { Metadata } from "next";
import { StudioPage } from "@/components/landing/StudioPage";

const affiliateUrl = "https://partners.snowfire.ai/j1a8kovs1uez";

const config = {
  affiliateUrl,
  productName: "Snowfire",
  category: "website-builder",
  hero: {
    kicker: "E-commerce ready",
    title: "Product pages that convert, managed by merchandisers.",
    lede: "Connect Shopify, BigCommerce, or headless commerce — Snowfire pulls product data, renders PDPs from your design system, and lets merchandisers update content without code.",
    ctaLabel: "Connect store free",
  },
  artwork: {
    src: "/generated/snowfire-v4-ecommerce.png",
    alt: "E-commerce PDP builder with product data binding and merchandising controls",
  },
  pillars: [
    { number: "01", title: "Bind", description: "Map design system components to product fields: title, price, variants, media, metafields." },
    { number: "02", title: "Merchandise", description: "Merchandisers swap hero, update badges, reorder sections — live preview, scheduled publish." },
    { number: "03", title: "Personalize", description: "Dynamic content blocks: recently viewed, cross-sell, geo-banners — all from components." },
  ],
  limitations: [
    {
      title: "Platform API limits apply",
      description: "Shopify rate limits can slow bulk PDP updates during high-traffic events.",
      mitigation: "Use scheduled publish for flash sales; batch updates off-peak.",
    },
    {
      title: "Checkout stays on platform",
      description: "Snowfire builds PDP/collection pages; cart/checkout remains on Shopify/BigCommerce.",
      mitigation: "Design system includes cart drawer components for visual consistency.",
    },
  ],
  disclosureText: "We may earn a commission if you use this link, at no extra cost to you.",
};

export const metadata: Metadata = {
  title: "Snowfire: E-Commerce PDPs from Your Design System | VettedSaaSBlueprint",
  description: "Connect Shopify/BigCommerce — merchandisers build converting PDPs from design system components.",
  robots: { index: false, follow: false },
};

export default function SnowfireV4Page() {
  return <StudioPage config={config} />;
}