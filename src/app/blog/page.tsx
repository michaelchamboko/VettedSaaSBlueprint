import Link from "next/link";
import type { Metadata } from "next";

import { PublicPageShell } from "@/components/public/PublicPageShell";

export const metadata: Metadata = {
  title: "SaaS buyer guides",
  description: "Evidence-led buyer guides for clearer SaaS decisions.",
  alternates: { canonical: "/blog" },
};

export default function BlogIndexPage() {
  return (
    <PublicPageShell>
      <section className="legal-document">
        <header>
          <p className="public-eyebrow">The buyer guide</p>
          <h1>Buyer guides for better SaaS decisions.</h1>
          <p>Evidence-led questions, practical frameworks, and transparent trade-offs are being prepared for publication.</p>
        </header>
        <div className="legal-copy">
          <section>
            <h2>The first guide is on its way.</h2>
            <p>Until then, explore the reviews that have already passed our evidence and approval checks.</p>
            <p><Link className="public-text-link" href="/#reviews">Browse approved reviews</Link></p>
          </section>
        </div>
      </section>
    </PublicPageShell>
  );
}
