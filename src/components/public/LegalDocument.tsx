import type { ReactNode } from "react";

import {
  loadPublicSiteConfig,
  PUBLIC_OPERATOR_STATEMENT,
} from "@/lib/site/public-site";

import { PublicPageShell } from "./PublicPageShell";

type LegalDocumentProps = {
  title: string;
  summary: string;
  effectiveDate: string;
  reviewDate: string;
  children: ReactNode;
  eyebrow?: string;
};

export function LegalDocument({
  title,
  summary,
  effectiveDate,
  reviewDate,
  children,
  eyebrow = "Legal and trust",
}: LegalDocumentProps) {
  const config = loadPublicSiteConfig();

  return (
    <PublicPageShell>
      <article className="legal-document mx-auto w-full max-w-4xl px-5 py-16 sm:px-8 sm:py-24">
        <header className="border-b border-[var(--public-line)] pb-10">
          <p className="public-eyebrow">{eyebrow}</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.035em] text-[var(--public-ink)] sm:text-6xl">
            {title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--public-muted)]">
            {summary}
          </p>
          <dl className="mt-8 grid gap-3 text-sm text-[var(--public-muted)] sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-[var(--public-ink)]">Effective</dt>
              <dd><time dateTime={effectiveDate}>{effectiveDate}</time></dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--public-ink)]">Next review</dt>
              <dd><time dateTime={reviewDate}>{reviewDate}</time></dd>
            </div>
          </dl>
        </header>

        <div className="legal-copy mt-12 space-y-10 text-base leading-8 text-[var(--public-muted)]">
          {children}
        </div>

        <aside className="mt-16 border-t border-[var(--public-line)] pt-8 text-sm leading-7 text-[var(--public-muted)]">
          <p className="font-semibold text-[var(--public-ink)]">Responsible operator</p>
          <p className="mt-2">{PUBLIC_OPERATOR_STATEMENT}</p>
          <p className="mt-2">
            <a className="public-text-link" href={`mailto:${config.operator.publicEmail}`}>
              {config.operator.publicEmail}
            </a>
          </p>
          <p className="mt-2">No company registration number or public telephone applies.</p>
        </aside>
      </article>
    </PublicPageShell>
  );
}
