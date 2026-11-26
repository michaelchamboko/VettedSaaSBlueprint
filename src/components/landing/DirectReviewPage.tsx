import type { PageBlueprint } from "@/lib/schemas/contracts";
import Link from "next/link";
import { AffiliateDisclosure } from "./AffiliateDisclosure";
import { EditorialReviewPage } from "./EditorialReviewPage";
import { LandingPageMotion } from "./LandingPageMotion";
import { ReferenceComposedReviewPage } from "./ReferenceComposedReviewPage";
import { ReviewedArticleHero, type ReviewedArticleHeroAsset } from "@/components/public/ReviewedArticleHero";

export type LandingPageRenderMode = "production" | "preview";

export function DirectReviewPage({
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
  if (blueprint.metadata.design_profile === "editorial_v2") {
    return <EditorialReviewPage blueprint={blueprint} affiliateUrlOverride={affiliateUrlOverride} reviewedHero={reviewedHero} />;
  }
  if (blueprint.metadata.design_profile === "reference_composed_v1") {
    return (
      <ReferenceComposedReviewPage
        blueprint={blueprint}
        mode={mode}
        affiliateUrlOverride={affiliateUrlOverride}
        reviewedHero={reviewedHero}
      />
    );
  }

  const approvedHeroVisual =
    blueprint.hero.visual_asset?.approval_status === "approved" && blueprint.hero.visual_asset.approved_by_owner
      ? blueprint.hero.visual_asset
      : null;

  const affiliateUrl = affiliateUrlOverride ?? "#affiliate-link-unavailable";

  return (
    <main
      className="min-h-screen bg-[#08111f] text-white"
      data-motion-root={blueprint.metadata.url_slug}
      data-motion-profile={blueprint.metadata.motion_profile}
    >
      <section className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-8 md:px-8 md:py-14">
        <nav className="flex items-center justify-between text-sm text-slate-300" data-motion="nav">
          <Link className="font-semibold text-white" href="/">VettedSaaSBlueprint</Link>
          <Link className="rounded-full border border-white/15 px-4 py-2" href="/affiliate-disclosure">Disclosure</Link>
        </nav>
        <div className="grid gap-8 md:grid-cols-[1.1fr_.9fr] md:items-center">
          <div className="space-y-5" data-motion="hero-copy">
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">{blueprint.hero.headline}</h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-300">{blueprint.hero.subheadline}</p>
            <AffiliateDisclosure blueprint={blueprint} />
            <a
              href={affiliateUrl}
              rel="nofollow sponsored"
              data-track="primary-cta"
              data-link-id={blueprint.hero.primary_cta_link_id}
              data-motion="primary-cta"
              className="inline-flex min-h-12 items-center rounded-full bg-[var(--accent)] px-6 font-bold text-slate-950"
            >
              {blueprint.hero.primary_cta_label}
            </a>
            {blueprint.hero.risk_reversal ? <p className="text-sm text-slate-400">{blueprint.hero.risk_reversal}</p> : null}
          </div>
          {reviewedHero ? (
            <figure className="overflow-hidden rounded-[2rem] border border-white/15 bg-white/8 shadow-2xl" data-motion="hero-media">
              <ReviewedArticleHero asset={reviewedHero} />
            </figure>
          ) : approvedHeroVisual ? (
            <figure className="overflow-hidden rounded-[2rem] border border-white/15 bg-white/8 shadow-2xl" data-motion="hero-media">
              <img
                src={approvedHeroVisual.asset_url}
                alt={approvedHeroVisual.alt_text}
                className="aspect-[4/3] w-full object-cover"
              />
              <figcaption className="sr-only">{approvedHeroVisual.prompt_summary}</figcaption>
            </figure>
          ) : (
            <div className="rounded-[2rem] border border-white/15 bg-white/8 p-6 shadow-2xl">
              <p className="text-sm uppercase tracking-[.2em] text-[var(--accent)]">Research-backed fit</p>
              <h2 className="mt-4 text-2xl font-semibold">{blueprint.problem_solution.problem}</h2>
              <p className="mt-4 text-slate-300">{blueprint.problem_solution.solution}</p>
            </div>
          )}
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-10 md:grid-cols-[1.15fr_.85fr] md:px-8">
        {blueprint.benefits.map((benefit) => {
          const approvedBenefitVisual =
            benefit.visual_asset?.approval_status === "approved" && benefit.visual_asset.approved_by_owner
              ? benefit.visual_asset
              : null;

          return (
            <article key={benefit.benefit_title} className="rounded-3xl border border-white/12 bg-white/6 p-5" data-motion="benefit-card">
              {approvedBenefitVisual ? (
                <img
                  src={approvedBenefitVisual.asset_url}
                  alt={approvedBenefitVisual.alt_text}
                  className="mb-5 aspect-square w-full rounded-2xl object-cover"
                  data-motion="benefit-media"
                />
              ) : null}
              <h3 className="font-semibold">{benefit.benefit_title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-300">{benefit.benefit_description}</p>
            </article>
          );
        })}
      </section>
      {blueprint.how_it_works.length > 0 ? (
        <section className="mx-auto max-w-6xl px-5 py-10 md:px-8" data-motion="reveal">
          <h2 className="text-3xl font-bold">How the workflow moves</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {blueprint.how_it_works.map((step) => (
              <article key={step.step_number} className="rounded-3xl border border-white/12 bg-white/6 p-5" data-motion="reveal">
                <p className="text-sm font-semibold text-[var(--accent)]">{String(step.step_number).padStart(2, "0")}</p>
                <h3 className="mt-4 font-semibold">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">{step.description}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
      <section className="mx-auto max-w-6xl px-5 py-10 md:px-8" data-motion="reveal">
        <h2 className="text-3xl font-bold">Limitations to know</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {blueprint.limitations.map((item) => (
            <article key={item.limitation} className="rounded-3xl border border-white/12 bg-white/6 p-5" data-motion="reveal">
              <h3 className="font-semibold">{item.limitation}</h3>
              <p className="mt-2 text-sm text-slate-300">{item.mitigation}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 py-10 md:px-8" data-motion="reveal">
        <h2 className="text-3xl font-bold">Questions before you click</h2>
        <div className="mt-5 space-y-3">
          {blueprint.faq.map((item, faqIndex) => (
            <details
              key={item.question}
              className="rounded-2xl border border-white/12 bg-white/6 p-5"
              data-track="faq-expand"
              data-faq-index={faqIndex}
              data-motion="reveal"
            >
              <summary className="cursor-pointer font-semibold">{item.question}</summary>
              <p className="mt-3 text-slate-300">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
      {blueprint.metadata.motion_profile === "gsap_editorial" ? <LandingPageMotion pageSlug={blueprint.metadata.url_slug} /> : null}
      <footer className="mx-auto flex max-w-6xl flex-wrap gap-x-6 gap-y-2 border-t border-white/10 px-5 py-8 text-sm text-slate-400 md:px-8">
        <Link href="/">Home</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/affiliate-disclosure">Affiliate disclosure</Link>
        <Link href="/contact">Contact</Link>
      </footer>
    </main>
  );
}
