import type { Metadata } from "next";
import { LegalDocument } from "@/components/public/LegalDocument";
import { loadPublicSiteConfig } from "@/lib/site/public-site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact VettedSaaSBlueprint about editorial corrections, privacy, accessibility, or PAIA requests.",
  alternates: { canonical: "/contact" },
  openGraph: { title: "Contact", description: "Contact VettedSaaSBlueprint about editorial corrections, privacy, accessibility, or PAIA requests.", url: "/contact" },
  robots: { index: true, follow: true },
};

export default function ContactPage() {
  const config = loadPublicSiteConfig();
  const address = config.operator.address;

  return (
    <LegalDocument
      title="Contact"
      summary="One direct channel for editorial, privacy, accessibility, and PAIA enquiries."
      effectiveDate={config.policies.effectiveDate}
      reviewDate={config.policies.reviewDate}
      eyebrow="Contact"
    >
      <section>
        <h2>Email</h2>
        <p>
          Write to <a href={`mailto:${config.operator.publicEmail}`}>{config.operator.publicEmail}</a>. Please include enough context to route an editorial correction, privacy request, accessibility report, or PAIA request correctly.
        </p>
      </section>
      <section>
        <h2>Operating address</h2>
        <address className="not-italic">
          {config.operator.tradingName}<br />
          {address.line1}<br />
          {address.suburb}<br />
          {address.city}, {address.province}<br />
          {address.country}
        </address>
      </section>
      <section>
        <h2>Contact scope</h2>
        <p>
          This is an email-only publication contact. There is no contact form, public account support desk, sales line, or payment support because VettedSaaSBlueprint does not sell products or accept payments.
        </p>
      </section>
    </LegalDocument>
  );
}
