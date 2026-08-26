import type { Metadata } from "next";
import { LegalDocument } from "@/components/public/LegalDocument";
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

  return (
    <LegalDocument
      title="Affiliate disclosure"
      summary="How referral commissions support the publication without deciding its conclusions."
      effectiveDate={config.policies.effectiveDate}
      reviewDate={config.policies.reviewDate}
    >
      <section>
        <h2>How commissions work</h2>
        <p>
          VettedSaaSBlueprint may earn a commission if you follow an affiliate link and later sign up or buy from the destination vendor, at no extra cost to you. The vendor or affiliate network tracks and administers that separate relationship.
        </p>
      </section>
      <section>
        <h2>Editorial independence</h2>
        <p>
          Compensation does not guarantee a positive review, ranking, recommendation, or publication. Claims still require evidence, limitations remain visible, and the owner must approve a page before it becomes public.
        </p>
      </section>
      <section>
        <h2>Disclosure placement</h2>
        <p>
          Individual review pages keep a plain-language disclosure before or near affiliate calls to action. Affiliate links use sponsored relationship markup and preserve the approved destination and tracking parameters.
        </p>
      </section>
      <section>
        <h2>Vendor responsibility</h2>
        <p>
          VettedSaaSBlueprint does not sell the reviewed product or control its pricing, trial, refund, security, support, or contract terms. Confirm those details directly with the vendor before deciding.
        </p>
      </section>
    </LegalDocument>
  );
}
