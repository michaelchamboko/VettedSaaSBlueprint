import type { Metadata } from "next";
import { LegalDocument } from "@/components/public/LegalDocument";
import {
  assertPublicLaunchReady,
  loadPublicSiteConfig,
} from "@/lib/site/public-site";

export const metadata: Metadata = {
  title: "PAIA manual",
  description: "The Section 51 PAIA manual for VettedSaaSBlueprint, a South African private body and sole proprietorship.",
  alternates: { canonical: "/paia" },
  openGraph: { title: "PAIA manual", description: "The Section 51 PAIA manual for VettedSaaSBlueprint, a South African private body and sole proprietorship.", url: "/paia" },
  robots: { index: true, follow: true },
};

export default function PaiaPage() {
  const config = loadPublicSiteConfig();
  assertPublicLaunchReady(config);
  const address = config.operator.address;

  return (
    <>
      <style>{`
        @media print {
          .public-header, .public-footer, .skip-link, .print\\:hidden { display: none !important; }
          .legal-document { max-width: none !important; padding: 0 !important; }
          .legal-copy { color: #111 !important; font-size: 10.5pt; line-height: 1.45; }
          .legal-copy section { break-inside: avoid-page; }
          a { color: #111 !important; text-decoration: underline; }
          @page { margin: 18mm; }
        }
      `}</style>
      <LegalDocument
        title="PAIA manual"
        summary="Section 51 manual for the VettedSaaSBlueprint private body, prepared under the Promotion of Access to Information Act 2 of 2000."
        effectiveDate={config.policies.effectiveDate}
        reviewDate={config.policies.reviewDate}
        eyebrow="Section 51 private-body manual"
      >
        <section>
          <h2>1. Identity and contact details</h2>
          <dl>
            <div><dt>Body name</dt><dd>VettedSaaSBlueprint</dd></div>
            <div><dt>Nature of body</dt><dd>South African sole proprietorship and private body</dd></div>
            <div><dt>Head designation</dt><dd>Sole Proprietor, VettedSaaSBlueprint</dd></div>
            <div><dt>Information Officer display name</dt><dd>Information Officer, VettedSaaSBlueprint</dd></div>
            <div><dt>Email</dt><dd><a href={`mailto:${config.operator.publicEmail}`}>{config.operator.publicEmail}</a></dd></div>
            <div>
              <dt>Street and submission address</dt>
              <dd>{address.line1}, {address.suburb}, {address.city}, {address.province}, {address.country}</dd>
            </div>
          </dl>
          <p>
            No company registration number, public telephone, or fax number applies. Information Officer registration confirmation is a production release prerequisite and is not self-attested by this manual.
          </p>
        </section>

        <section>
          <h2>2. Purpose, status, and availability</h2>
          <p>
            This manual helps a person identify records held by VettedSaaSBlueprint and use PAIA to request a record required for the exercise or protection of a right. It also describes personal-information processing required by section 51 of PAIA as amended by POPIA.
          </p>
          <p>
            The manual is available without charge on this website and may be requested by email for inspection. It is effective on <time dateTime={config.policies.effectiveDate}>{config.policies.effectiveDate}</time> and scheduled for review by <time dateTime={config.policies.reviewDate}>{config.policies.reviewDate}</time>. It will be updated when material recordkeeping, processing, or legal requirements change.
          </p>
        </section>

        <section>
          <h2>3. PAIA guide, forms, and help</h2>
          <p>
            The South African Information Regulator publishes the PAIA guide, the private-body manual template, Form 2, fee information, complaint Form 5, and guides in South African official languages. Obtain the current guide and official forms from <a href="https://inforegulator.org.za/paia/">https://inforegulator.org.za/paia/</a> before submitting a request.
          </p>
        </section>

        <section>
          <h2>4. Records automatically available</h2>
          <p>The following public records are automatically available without a PAIA request, subject to normal website availability:</p>
          <ul>
            <li>Published review pages and visible publication dates.</li>
            <li>Privacy, terms, affiliate disclosure, editorial, accessibility, contact, and this PAIA manual.</li>
            <li>Public navigation, robots instructions, and sitemap entries for approved public pages.</li>
          </ul>
          <p>Internal drafts, audit records, security information, credentials, and unpublished evidence are not automatically available.</p>
        </section>

        <section>
          <h2>5. Applicable legislation</h2>
          <p>Records may be held under applicable legislation, including:</p>
          <ul>
            <li>Promotion of Access to Information Act 2 of 2000.</li>
            <li>Protection of Personal Information Act 4 of 2013.</li>
            <li>Electronic Communications and Transactions Act 25 of 2002.</li>
            <li>Copyright Act 98 of 1978.</li>
            <li>Income Tax Act 58 of 1962 and Tax Administration Act 28 of 2011, to the extent applicable.</li>
            <li>Consumer Protection Act 68 of 2008, to the extent applicable to published representations.</li>
          </ul>
          <p>This list is indicative and does not imply that every statute creates every category of record for this sole proprietorship.</p>
        </section>

        <section>
          <h2>6. Subjects and categories of records</h2>
          <ul>
            <li><strong>Editorial and research:</strong> evidence sources, product notes, structured drafts, review versions, limitations, corrections, and approval records.</li>
            <li><strong>Affiliate operations:</strong> approved destination links, network records, offer evidence, and commission statements.</li>
            <li><strong>Website operations:</strong> source code, deployment records, security and error logs, configuration records, and accessibility checks.</li>
            <li><strong>Governance and compliance:</strong> policies, PAIA requests and outcomes, POPIA requests, audit logs, retention records, and Information Officer administration.</li>
            <li><strong>Communications:</strong> editorial corrections, privacy enquiries, accessibility feedback, PAIA correspondence, and vendor correspondence.</li>
            <li><strong>Financial and tax:</strong> lawful income, expense, banking, invoice, affiliate-payment, and tax-supporting records.</li>
            <li><strong>Service providers:</strong> hosting, domain, software, and professional-service agreements and correspondence.</li>
          </ul>
        </section>

        <section>
          <h2>7. POPIA processing description</h2>
          <h3>Purposes</h3>
          <p>
            Personal information may be processed to respond to enquiries and rights requests, maintain reliable affiliate links, administer service-provider and affiliate relationships, keep lawful financial and tax records, and meet legal obligations.
          </p>
          <h3>Categories of data subjects</h3>
          <ul>
            <li>Public website visitors.</li>
            <li>People who send editorial, privacy, accessibility, or PAIA enquiries.</li>
            <li>Vendor, affiliate-network, hosting, and professional-service contacts.</li>
            <li>The sole proprietor.</li>
          </ul>
          <h3>Personal-information categories</h3>
          <ul>
            <li>Names, business roles, email addresses, correspondence, and request records.</li>
            <li>Account, security, audit, financial, tax, and affiliate-payment records where lawfully required.</li>
          </ul>
          <h3>Recipient categories</h3>
          <p>
            Information may be supplied only as necessary to hosting providers such as Vercel, affiliate networks such as PartnerStack, destination vendors after a visitor chooses to click, professional advisers, regulators, or lawful authorities.
          </p>
          <h3>Cross-border flows</h3>
          <p>
            Cloud hosting, storage, affiliate networks, and destination vendors may process information outside South Africa. Transfers are limited to necessary data and are managed with contractual, technical, and organisational safeguards intended to support applicable POPIA requirements.
          </p>
          <h3>Security safeguards</h3>
          <p>
            Safeguards include access restriction, secret separation, repository review, data minimisation, retention limits, dependency and deployment checks, encryption provided by service platforms, backups where appropriate, and incident review. Safeguards are reviewed as risks and services change.
          </p>
        </section>

        <section>
          <h2>8. Form 2 request procedure</h2>
          <ol>
            <li>Download the current Form 2 from the Information Regulator PAIA page.</li>
            <li>Identify the record with enough detail for it to be located and state the right you seek to exercise or protect, why the record is required, your preferred form of access, and contact details.</li>
            <li>Provide proof of identity. A representative must also provide proof of authority to act for the requester.</li>
            <li>Email the completed request and supporting documents to <a href={`mailto:${config.operator.publicEmail}`}>{config.operator.publicEmail}</a>, or deliver them to {address.line1}, {address.suburb}, {address.city}, {address.province}, {address.country}.</li>
          </ol>
          <p>
            Do not send unnecessary identity information. VettedSaaSBlueprint may ask for proportionate verification before disclosing a record.
          </p>
        </section>

        <section>
          <h2>9. Fees and timing</h2>
          <p>
            Prescribed fees may apply under PAIA before access is provided, including a request fee where permitted and access or reproduction fees. Any required fee and payment method will be communicated using the prescribed process.
          </p>
          <p>
            A decision is ordinarily communicated within 30 calendar days after a valid request is received, subject to a lawful extension under PAIA. The outcome will state whether access is granted or refused, any fees, the form of access, and available remedies.
          </p>
        </section>

        <section>
          <h2>10. Grounds for refusal</h2>
          <p>
            Access may be refused only on a ground permitted by PAIA. Examples include mandatory protection of another person&apos;s privacy, commercial information or confidential information of a third party, safety, legally privileged material, research information, or records whose disclosure would prejudice security or lawful operations. Mandatory disclosure provisions remain applicable where the Act requires them.
          </p>
        </section>

        <section>
          <h2>11. Remedies</h2>
          <p>
            A requester dissatisfied with a private-body decision generally has no internal appeal. Subject to PAIA procedures and time limits, the requester may submit a complaint to the Information Regulator using the current complaint form or apply to a court with jurisdiction. The official PAIA page explains the complaint and court routes.
          </p>
        </section>

        <section>
          <h2>12. Manual availability and Update history</h2>
          <p>
            The current manual is available as this printable HTML page, by email request, and for inspection at the listed address by prior arrangement. No fee applies to inspect the manual itself.
          </p>
          <table>
            <thead><tr><th>Date</th><th>Version</th><th>Change</th></tr></thead>
            <tbody>
              <tr><td>{config.policies.effectiveDate}</td><td>1.0</td><td>First public Section 51 manual.</td></tr>
            </tbody>
          </table>
          <p className="print:hidden mt-6">
            Use your browser&apos;s print command to save or print a clean copy of this manual.
          </p>
        </section>
      </LegalDocument>
    </>
  );
}
