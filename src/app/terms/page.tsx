import type { Metadata } from "next";
import { LegalDocument } from "@/components/public/LegalDocument";
import { LegalSections, type LegalSection } from "@/components/public/LegalSections";
import { loadPublicSiteConfig } from "@/lib/site/public-site";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "Terms for using VettedSaaSBlueprint, including editorial limitations, affiliate links, and vendor responsibility.",
  alternates: { canonical: "/terms" },
  openGraph: { title: "Terms of use", description: "Terms for using VettedSaaSBlueprint, including editorial limitations, affiliate links, and vendor responsibility.", url: "/terms" },
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  const config = loadPublicSiteConfig();
  const sections = [
    ["Informational publication", <p key="publication">VettedSaaSBlueprint publishes independent informational reviews. It is not the vendor or seller of reviewed software, does not sell software or services, does not accept payments, and does not form any purchase or subscription contract between you and a vendor.</p>],
    ["Vendor terms control", <p key="vendor">A software vendor controls its own pricing, trials, refunds, security, availability, support, integrations, and contract terms. Check the vendor&apos;s current terms and privacy information before making a decision. VettedSaaSBlueprint cannot approve, cancel, refund, or service a vendor transaction.</p>],
    ["Evidence and freshness", <p key="evidence">Reviews are based on identified evidence available at the time of editorial approval. Software changes quickly. A review may become incomplete after publication, and no statement should replace your own due diligence or professional advice.</p>],
    ["Acceptable use", <p key="acceptable-use">You may use the public site for lawful research. You may not disrupt the service, bypass access controls, introduce malicious code, scrape at a rate that harms availability, misrepresent site content, or use the publication to infringe another person&apos;s rights.</p>],
    ["Intellectual property", <p key="property">Original editorial content, design, and branding remain the property of VettedSaaSBlueprint or their respective licensors. Vendor names, marks, and product materials belong to their owners. Limited quotation and linking remain subject to applicable law.</p>],
    ["Third-party links and affiliate relationships", <p key="links">External links lead to third-party sites VettedSaaSBlueprint does not control. Some are affiliate links that may earn a commission at no extra cost to you. Affiliate compensation does not guarantee favourable coverage and does not transfer vendor responsibility to VettedSaaSBlueprint.</p>],
    ["Warranties and liability", <p key="liability">To the maximum extent permitted by applicable law, the site is provided as available without warranties that information will always be complete, current, or suitable for a particular decision. Liability is limited only to the extent lawfully permitted, and nothing in these terms excludes liability that South African law does not allow to be excluded.</p>],
    ["Changes, severability, and governing law", <p key="law">These terms may be updated when the publication or applicable requirements change. If one provision is unenforceable, the remaining provisions continue to apply. These terms are governed by South African law, and lawful disputes are subject to courts with jurisdiction in Gauteng, South Africa.</p>],
  ] satisfies LegalSection[];

  return (
    <LegalDocument
      title="Terms of use"
      summary="The terms that apply when you read or use VettedSaaSBlueprint."
      effectiveDate={config.policies.effectiveDate}
      reviewDate={config.policies.reviewDate}
    >
      <LegalSections sections={sections} />
    </LegalDocument>
  );
}
