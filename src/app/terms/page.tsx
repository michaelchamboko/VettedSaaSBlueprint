import { LegalDocument } from "@/components/public/LegalDocument";
import { loadPublicSiteConfig } from "@/lib/site/public-site";

export default function TermsPage() {
  const config = loadPublicSiteConfig();

  return (
    <LegalDocument
      title="Terms of use"
      summary="The terms that apply when you read or use VettedSaaSBlueprint."
      effectiveDate={config.policies.effectiveDate}
      reviewDate={config.policies.reviewDate}
    >
      <section>
        <h2>Informational publication</h2>
        <p>
          VettedSaaSBlueprint publishes independent informational reviews. It is not the vendor or seller of reviewed software, does not sell software or services, does not accept payments, and does not form any purchase or subscription contract between you and a vendor.
        </p>
      </section>

      <section>
        <h2>Vendor terms control</h2>
        <p>
          A software vendor controls its own pricing, trials, refunds, security, availability, support, integrations, and contract terms. Check the vendor&apos;s current terms and privacy information before making a decision. VettedSaaSBlueprint cannot approve, cancel, refund, or service a vendor transaction.
        </p>
      </section>

      <section>
        <h2>Evidence and freshness</h2>
        <p>
          Reviews are based on identified evidence available at the time of editorial approval. Software changes quickly. A review may become incomplete after publication, and no statement should replace your own due diligence or professional advice.
        </p>
      </section>

      <section>
        <h2>Acceptable use</h2>
        <p>
          You may use the public site for lawful research. You may not disrupt the service, bypass access controls, introduce malicious code, scrape at a rate that harms availability, misrepresent site content, or use the publication to infringe another person&apos;s rights.
        </p>
      </section>

      <section>
        <h2>Intellectual property</h2>
        <p>
          Original editorial content, design, and branding remain the property of VettedSaaSBlueprint or their respective licensors. Vendor names, marks, and product materials belong to their owners. Limited quotation and linking remain subject to applicable law.
        </p>
      </section>

      <section>
        <h2>Third-party links and affiliate relationships</h2>
        <p>
          External links lead to third-party sites VettedSaaSBlueprint does not control. Some are affiliate links that may earn a commission at no extra cost to you. Affiliate compensation does not guarantee favourable coverage and does not transfer vendor responsibility to VettedSaaSBlueprint.
        </p>
      </section>

      <section>
        <h2>Warranties and liability</h2>
        <p>
          To the maximum extent permitted by applicable law, the site is provided as available without warranties that information will always be complete, current, or suitable for a particular decision. Liability is limited only to the extent lawfully permitted, and nothing in these terms excludes liability that South African law does not allow to be excluded.
        </p>
      </section>

      <section>
        <h2>Changes, severability, and governing law</h2>
        <p>
          These terms may be updated when the publication or applicable requirements change. If one provision is unenforceable, the remaining provisions continue to apply. These terms are governed by South African law, and lawful disputes are subject to courts with jurisdiction in Gauteng, South Africa.
        </p>
      </section>
    </LegalDocument>
  );
}
