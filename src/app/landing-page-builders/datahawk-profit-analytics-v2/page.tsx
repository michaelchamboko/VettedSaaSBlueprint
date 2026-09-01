import type { Metadata } from "next";
import { StudioPage } from "@/components/landing/StudioPage";

const affiliateUrl = "https://get.datahawk.co/mau0otko9lz4-o5aq3q";

const config = {
  affiliateUrl,
  productName: "DataHawk",
  category: "ecommerce-analytics",
  hero: {
    kicker: "Profit analytics",
    title: "Know your true margin — per SKU, per day.",
    lede: "DataHawk pulls FBA fees, referral fees, ad spend, COGS, and returns into one P&L per ASIN so you kill losers and double winners.",
    ctaLabel: "See real margins",
  },
  artwork: {
    src: "/generated/datahawk-v2-profit.png",
    alt: "Per-SKU profit waterfall with fee breakdown",
  },
  pillars: [
    { number: "01", title: "Attribute", description: "Automatic fee allocation — referral, FBA, storage, ads, returns." },
    { number: "02", title: "Alert", description: "Margin drop alerts when fees spike or competitors undercut." },
    { number: "03", title: "Forecast", description: "Inventory ROI projection with seasonality and fee changes modeled." },
  ],
  limitations: [
    {
      title: "COGS requires manual input",
      description: "Landed cost per unit isn't auto-imported from suppliers or freight forwarders.",
      mitigation: "Upload CSV monthly or connect Google Sheets for live COGS sync.",
    },
    {
      title: "No cash-flow timing",
      description: "Shows accounting profit, not when cash hits your bank (Amazon reserve, payout delays).",
      mitigation: "Export to your finance tool for cash-flow modeling.",
    },
  ],
  disclosureText: "We may earn a commission if you use this link, at no extra cost to you.",
};

export const metadata: Metadata = {
  title: "DataHawk: True Profit Per SKU | VettedSaaSBlueprint",
  description: "FBA fees, referral fees, ad spend, COGS, and returns in one daily P&L per ASIN.",
  robots: { index: false, follow: false },
};

export default function DataHawkV2Page() {
  return <StudioPage config={config} />;
}