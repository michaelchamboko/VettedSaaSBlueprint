import Link from "next/link";
import { LegalTrustLinks } from "./LegalTrustLinks";

import type { EditorialV2Preview } from "@/lib/generated/editorial-v2-previews";

export function EditorialV2PreviewPage({ preview }: { preview: EditorialV2Preview }) {
  return (
    <main
      className="landing-editorial-v2 min-h-screen bg-[#0d0d0d] text-[#f2f0e9]"
      data-preview="editorial-v2"
      data-preview-slug={preview.slug}
    >
      <div className="landing-editorial-v2__frame">
        <nav className="landing-editorial-v2__nav">
          <Link className="landing-editorial-v2__wordmark" href="/" aria-label="VettedSaaSBlueprint home">
            VettedSaaSBlueprint
          </Link>
          <span className="landing-editorial-v2__nav-link">Review preview</span>
        </nav>

        <section className="landing-editorial-v2__hero">
          <div className="landing-editorial-v2__hero-copy">
            <p className="landing-editorial-v2__eyebrow">{preview.category} · editorial v2 preview</p>
            <h1>{preview.headline}</h1>
            <p className="landing-editorial-v2__answer">{preview.answer_snippet}</p>
            <p className="landing-editorial-v2__subheadline">{preview.subheadline}</p>
            <p className="landing-editorial-v2__compact-disclosure">
              <span>Paid-link note</span> {preview.short_disclosure}
            </p>
            <a
              href={preview.affiliate_url}
              rel="nofollow sponsored"
              className="landing-editorial-v2__cta flex items-center justify-between whitespace-nowrap"
            >
              <span>Check official fit</span>
              <span aria-hidden="true" className="landing-editorial-v2__cta-arrow">↗</span>
            </a>
            <p className="landing-editorial-v2__risk">{preview.risk_reversal}</p>
          </div>

          <div className="landing-editorial-v2__hero-media">
            <div className="landing-editorial-v2__fit-panel">
              <p className="landing-editorial-v2__eyebrow">Fit check</p>
              <h2>{preview.fit_panel.problem}</h2>
              <p>{preview.fit_panel.solution}</p>
            </div>
          </div>
        </section>

        <section className="landing-editorial-v2__section">
          <div className="landing-editorial-v2__section-heading">
            <p className="landing-editorial-v2__eyebrow">What to weigh</p>
            <h2>Make the fit visible before you commit.</h2>
          </div>
          <div className="landing-editorial-v2__decision-grid">
            {preview.benefits.map((benefit, index) => (
              <article className="landing-editorial-v2__decision-card" key={benefit.title}>
                <span className="landing-editorial-v2__card-index">{String(index + 1).padStart(2, "0")}</span>
                <h3>{benefit.title}</h3>
                <p>{benefit.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-editorial-v2__section">
          <div className="landing-editorial-v2__section-heading">
            <p className="landing-editorial-v2__eyebrow">Workflow</p>
            <h2>See how the product would fit the work.</h2>
          </div>
          <div className="landing-editorial-v2__steps">
            {preview.workflow.map((step) => (
              <article className="landing-editorial-v2__step" key={step.number}>
                <span className="landing-editorial-v2__card-index">{String(step.number).padStart(2, "0")}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-editorial-v2__section">
          <div className="landing-editorial-v2__section-heading">
            <p className="landing-editorial-v2__eyebrow">Boundaries</p>
            <h2>Know what to verify on the way in.</h2>
          </div>
          <div className="landing-editorial-v2__limitations">
            {preview.limitations.map((item) => (
              <article className="landing-editorial-v2__limitation" key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-editorial-v2__section">
          <div className="landing-editorial-v2__section-heading">
            <p className="landing-editorial-v2__eyebrow">Before you click</p>
            <h2>Questions that belong in the decision.</h2>
          </div>
          <div className="landing-editorial-v2__faq">
            {preview.faq.map((item) => (
              <details key={item.question}>
                <summary>{item.question}<span aria-hidden="true">+</span></summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="landing-editorial-v2__section">
          <div className="landing-editorial-v2__section-heading">
            <p className="landing-editorial-v2__eyebrow">Source notes</p>
            <h2>Start with the evidence that shaped this preview.</h2>
          </div>
          <div className="landing-editorial-v2__limitations">
            {preview.evidence_notes.map((source) => (
              <article className="landing-editorial-v2__limitation" key={source.url}>
                <h3>{source.label}</h3>
                <p>{source.note} <a href={source.url} target="_blank" rel="noreferrer">Open official source ↗</a></p>
              </article>
            ))}
          </div>
        </section>

        <footer className="landing-editorial-v2__footer">
          <div>
            <p className="landing-editorial-v2__eyebrow">Disclosure</p>
            <p className="landing-editorial-v2__full-disclosure">{preview.full_disclosure}</p>
          </div>
          <LegalTrustLinks className="landing-editorial-v2__footer-links" />
        </footer>
      </div>
    </main>
  );
}
