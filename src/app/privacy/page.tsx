import type { Metadata } from "next";
import { LegalDocument } from "@/components/public/LegalDocument";
import { loadPublicSiteConfig, PUBLIC_OPERATOR_STATEMENT } from "@/lib/site/public-site";

export const metadata: Metadata = {
  title: "Privacy notice",
  description: "How VettedSaaSBlueprint handles personal information, privacy choices, retention, and POPIA rights.",
  alternates: { canonical: "/privacy" },
  openGraph: { title: "Privacy notice", description: "How VettedSaaSBlueprint handles personal information, privacy choices, retention, and POPIA rights.", url: "/privacy" },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  const config = loadPublicSiteConfig();

  return (
    <LegalDocument
      title="Privacy notice"
      summary="How this independent review publication handles personal information and privacy choices."
      effectiveDate={config.policies.effectiveDate}
      reviewDate={config.policies.reviewDate}
    >
      <section>
        <h2>Who is responsible</h2>
        <p>{PUBLIC_OPERATOR_STATEMENT} VettedSaaSBlueprint is the responsible party for the personal information processing described in this notice.</p>
      </section>

      <section>
        <h2>Information this site may process</h2>
        <p>
          This static publication does not operate application-level visitor analytics, event ingestion, account registration, or a private administration area. It does not store visitor click events, user-agent data, or raw IP addresses.
        </p>
        <p>
          The application stores no raw IP address and no IP hash. It does not use fingerprinting, advertising pixels, remarketing, profiling, newsletter capture, or public account registration.
        </p>
      </section>

      <section>
        <h2>Purposes and lawful basis</h2>
        <p>
          VettedSaaSBlueprint processes personal information only when you choose to contact it, exercise a privacy right, or otherwise provide information directly. The lawful basis and retention period depend on that specific interaction.
        </p>
      </section>

      <section>
        <h2>Hosting, storage, and destinations</h2>
        <p>
          Vercel hosts the website and may process network, security, and operational metadata under its own infrastructure duties. If you follow an affiliate link, PartnerStack and the destination software vendor process the separate visit under their own privacy terms.
        </p>
      </section>

      <section>
        <h2>Retention and privacy signals</h2>
        <p>
          The site sets no application analytics records. Network providers may still process operational metadata needed to deliver and protect the website under their own policies. Because public pages do not run application tracking, Global Privacy Control and Do Not Track signals do not change any application-level analytics behavior.
        </p>
      </section>

      <section>
        <h2>Cookies</h2>
        <p>
          Public pages set no nonessential analytics or advertising cookies.
        </p>
      </section>

      <section>
        <h2>International processing and safeguards</h2>
        <p>
          Vercel, PartnerStack, or a vendor destination may process information outside South Africa. VettedSaaSBlueprint limits the information it controls and uses service-provider safeguards intended to support confidentiality, integrity, availability, and applicable POPIA cross-border requirements.
        </p>
      </section>

      <section>
        <h2>Your POPIA rights</h2>
        <p>
          Where applicable, you may request access to your personal information, correction of inaccurate information, deletion where lawful, or object to processing based on legitimate interests. You may also ask for details about the information held and lodge a complaint with the South African Information Regulator.
        </p>
        <p>
          Send a privacy request to <a href={`mailto:${config.operator.publicEmail}`}>{config.operator.publicEmail}</a>. The Information Regulator provides complaint guidance at <a href="https://inforegulator.org.za/">inforegulator.org.za</a> and receives general enquiries at <a href="mailto:enquiries@inforegulator.org.za">enquiries@inforegulator.org.za</a>.
        </p>
      </section>

      <section>
        <h2>Security and children</h2>
        <p>
          Reasonable technical and organisational safeguards are used to protect the limited information processed. This publication is intended for business software research and is not directed at children. VettedSaaSBlueprint does not knowingly collect children&apos;s personal information through public forms because no public forms exist.
        </p>
      </section>
    </LegalDocument>
  );
}
