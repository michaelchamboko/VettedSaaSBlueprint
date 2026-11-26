import Link from "next/link";
import { LegalTrustLinks } from "./LegalTrustLinks";

import type { PageBlueprint } from "@/lib/schemas/contracts";

import type { LandingPageRenderMode } from "./DirectReviewPage";
import { LandingPageMotion } from "./LandingPageMotion";
import { ReviewedArticleHero, type ReviewedArticleHeroAsset } from "@/components/public/ReviewedArticleHero";

export function EditorialReviewPage({
  blueprint,
  mode = "production",
  affiliateUrlOverride,
  reviewedHero,
}: {
  blueprint: PageBlueprint;
  mode?: LandingPageRenderMode;
  affiliateUrlOverride?: string;
  reviewedHero?: ReviewedArticleHeroAsset | null;
}) {
  const approvedHeroVisual =
    blueprint.hero.visual_asset?.approval_status === "approved" && blueprint.hero.visual_asset.approved_by_owner
      ? blueprint.hero.visual_asset
      : null;
  const answerSnippet = blueprint.hero.answer_snippet ?? blueprint.hero.subheadline;
  const affiliateUrl = affiliateUrlOverride ?? "#affiliate-link-unavailable";

  return (
    <main
      className="landing-editorial-v2 min-h-screen bg-[#0d0d0d] text-[#f2f0e9]"
      data-motion-root={blueprint.metadata.url_slug}
      data-motion-profile={blueprint.metadata.motion_profile}
    >
      <div className="landing-editorial-v2__frame">
        <nav className="landing-editorial-v2__nav" data-motion="nav">
          <Link className="landing-editorial-v2__wordmark" href="/" aria-label="VettedSaaSBlueprint home">
            VettedSaaSBlueprint
          </Link>
          <Link className="landing-editorial-v2__nav-link" href="/affiliate-disclosure">
            Disclosure
          </Link>
        </nav>

        <section className="landing-editorial-v2__hero" data-motion="hero-copy">
          <div className="landing-editorial-v2__hero-copy">
            <p className="landing-editorial-v2__eyebrow">Buyer decision brief</p>
            <h1>{blueprint.hero.headline}</h1>
            <p className="landing-editorial-v2__answer">{answerSnippet}</p>
            <p className="landing-editorial-v2__subheadline">{blueprint.hero.subheadline}</p>
            <p className="landing-editorial-v2__compact-disclosure">
              <span>Paid-link note</span> {blueprint.affiliate_disclosure.short_disclosure}
            </p>
            <a
              href={affiliateUrl}
              rel="nofollow sponsored"
              data-track="primary-cta"
              data-link-id={blueprint.hero.primary_cta_link_id}
              data-motion="primary-cta"
              className="landing-editorial-v2__cta flex items-center justify-between whitespace-nowrap"
            >
              <span>{blueprint.hero.primary_cta_label}</span>
              <span aria-hidden="true" className="landing-editorial-v2__cta-arrow">↗</span>
            </a>
            {blueprint.hero.risk_reversal ? <p className="landing-editorial-v2__risk">{blueprint.hero.risk_reversal}</p> : null}
          </div>

          <div className="landing-editorial-v2__hero-media" data-motion="hero-media">
            {reviewedHero ? (
              <figure><ReviewedArticleHero asset={reviewedHero} /></figure>
            ) : approvedHeroVisual ? (
              <figure>
                <img src={approvedHeroVisual.asset_url} alt={approvedHeroVisual.alt_text} />
                <figcaption>{approvedHeroVisual.prompt_summary}</figcaption>
              </figure>
            ) : (
              <div className="landing-editorial-v2__fit-panel">
                <p className="landing-editorial-v2__eyebrow">Fit check</p>
                <h2>{blueprint.problem_solution.problem}</h2>
                <p>{blueprint.problem_solution.solution}</p>
              </div>
            )}
          </div>
        </section>

        <section className="landing-editorial-v2__section" data-motion="reveal">
          <div className="landing-editorial-v2__section-heading">
            <p className="landing-editorial-v2__eyebrow">What to weigh</p>
            <h2>Make the fit visible before you commit.</h2>
          </div>
          <div className="landing-editorial-v2__decision-grid">
            {blueprint.benefits.map((benefit, index) => (
              <article className="landing-editorial-v2__decision-card" key={benefit.benefit_title} data-motion="benefit-card">
                <span className="landing-editorial-v2__card-index">{String(index + 1).padStart(2, "0")}</span>
                <h3>{benefit.benefit_title}</h3>
                <p>{benefit.benefit_description}</p>
              </article>
            ))}
          </div>
        </section>

        {blueprint.how_it_works.length > 0 ? (
          <section className="landing-editorial-v2__section" data-motion="reveal">
            <div className="landing-editorial-v2__section-heading">
              <p className="landing-editorial-v2__eyebrow">Workflow</p>
              <h2>See how the product would fit the work.</h2>
            </div>
            <div className="landing-editorial-v2__steps">
              {blueprint.how_it_works.map((step) => (
                <article className="landing-editorial-v2__step" key={step.step_number}>
                  <span className="landing-editorial-v2__card-index">{String(step.step_number).padStart(2, "0")}</span>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="landing-editorial-v2__section" data-motion="reveal">
          <div className="landing-editorial-v2__section-heading">
            <p className="landing-editorial-v2__eyebrow">Boundaries</p>
            <h2>Know what to verify on the way in.</h2>
          </div>
          <div className="landing-editorial-v2__limitations">
            {blueprint.limitations.map((item) => (
              <article className="landing-editorial-v2__limitation" key={item.limitation}>
                <h3>{item.limitation}</h3>
                <p>{item.mitigation}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-editorial-v2__section" data-motion="reveal">
          <div className="landing-editorial-v2__section-heading">
            <p className="landing-editorial-v2__eyebrow">Before you click</p>
            <h2>Questions that belong in the decision.</h2>
          </div>
          <div className="landing-editorial-v2__faq">
            {blueprint.faq.map((item, faqIndex) => (
              <details key={item.question} data-track="faq-expand" data-faq-index={faqIndex}>
                <summary>{item.question}<span aria-hidden="true">+</span></summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <footer className="landing-editorial-v2__footer">
          <div>
            <p className="landing-editorial-v2__eyebrow">Disclosure</p>
            <p className="landing-editorial-v2__full-disclosure">{blueprint.affiliate_disclosure.full_disclosure}</p>
          </div>
          <LegalTrustLinks className="landing-editorial-v2__footer-links" />
        </footer>
      </div>

      {blueprint.metadata.motion_profile === "gsap_editorial" ? <LandingPageMotion pageSlug={blueprint.metadata.url_slug} /> : null}
    </main>
  );
}
