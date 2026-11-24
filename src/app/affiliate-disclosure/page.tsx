import type { Metadata } from "next";
import { LegalDocument } from "@/components/public/LegalDocument";
import { LegalSections, type LegalSection } from "@/components/public/LegalSections";
import { loadPublicSiteConfig } from "@/lib/site/public-site";

export const metadata: Metadata = {
  title: "Affiliate disclosure",
  description: "How affiliate commissions support VettedSaaSBlueprint while preserving evidence-led editorial independence.",
  alternates: { canonical: "/affiliate-disclosure" },
  openGraph: { title: "Affiliate disclosure", description: "How affiliate commissions support VettedSaaSBlueprint while preserving evidence-led editorial independence.", url: "/affiliate-disclosure" },
  robots: { index: true, follow: true },
};

export default function AffiliateDisclosurePage() {
  const config = loadPublicSiteConfig();
  const sections = [
    ["How commissions work", <p key="commissions">VettedSaaSBlueprint may earn a commission if you follow an affiliate link and later sign up or buy from the destination vendor, at no extra cost to you. The vendor or affiliate network tracks and administers that separate relationship.</p>],
    ["Editorial independence", <p key="independence">Compensation does not guarantee a positive review, ranking, recommendation, or publication. Claims still require evidence, limitations remain visible, and the owner must approve a page before it becomes public.</p>],
    ["Disclosure placement", <p key="placement">Individual review pages keep a plain-language disclosure before or near affiliate calls to action. Affiliate links use sponsored relationship markup and preserve the approved destination and tracking parameters.</p>],
    ["Vendor responsibility", <p key="vendor">VettedSaaSBlueprint does not sell the reviewed product or control its pricing, trial, refund, security, support, or contract terms. Confirm those details directly with the vendor before deciding.</p>],
  ] satisfies LegalSection[];

  return (
    <LegalDocument
      title="Affiliate disclosure"
      summary="How referral commissions support the publication without deciding its conclusions."
      effectiveDate={config.policies.effectiveDate}
      reviewDate={config.policies.reviewDate}
    >
      <LegalSections sections={sections} />
    </LegalDocument>
  );
}
