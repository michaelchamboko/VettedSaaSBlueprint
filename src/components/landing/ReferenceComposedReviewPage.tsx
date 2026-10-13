import Link from "next/link";

import type { PageBlueprint } from "@/lib/schemas/contracts";
import { getRenderableSectionOrder, shouldRenderReferenceSubheadline, type ReferenceComposedSectionKey } from "@/lib/landing/reference-composed";

import type { LandingPageRenderMode } from "./DirectReviewPage";
import { LandingPageMotion } from "./LandingPageMotion";

function affiliateUrl(linkId: string, override?: string) {
  return override ?? "#affiliate-link-unavailable";
}

function getRenderableVisual(
  visual: PageBlueprint["hero"]["visual_asset"],
  mode: LandingPageRenderMode,
) {
  if (visual?.approval_status === "approved" && visual.approved_by_owner) return visual;
  return mode === "preview" && visual?.approval_status === "draft" ? visual : null;
}

function Arrow() {
  return <span aria-hidden="true" className="landing-reference-composed__cta-arrow">↗</span>;
}

function Cta({ label, linkId, variant, override, primary = false }: {
  label: string;
  linkId: string;
  variant: NonNullable<PageBlueprint["presentation"]>["cta"];
  override?: string;
  primary?: boolean;
}) {
  return (
    <a
      className="landing-reference-composed__cta"
      data-cta-variant={variant}
      data-track={primary ? "primary-cta" : undefined}
      data-link-id={linkId}
      data-motion={primary ? "primary-cta" : undefined}
      href={affiliateUrl(linkId, override)}
      rel="nofollow sponsored"
    >
      <span className="landing-reference-composed__cta-label">{label}</span>
      <Arrow />
    </a>
  );
}

function SectionContent({ sectionKey, blueprint, affiliateUrlOverride }: {
  sectionKey: ReferenceComposedSectionKey;
  blueprint: PageBlueprint;
  affiliateUrlOverride?: string;
}) {
  const presentation = blueprint.presentation!;

  switch (sectionKey) {
    case "problem_solution":
      return <><h2>The decision in context</h2><div className="landing-reference-composed__items landing-reference-composed__prose"><p className="landing-reference-composed__entry">{blueprint.problem_solution.problem}</p><p className="landing-reference-composed__entry">{blueprint.problem_solution.agitation}</p><p className="landing-reference-composed__entry">{blueprint.problem_solution.solution}</p></div></>;
    case "benefits":
      return <><h2>What changes in the work</h2><div className="landing-reference-composed__items">{blueprint.benefits.map((benefit, index) => <article className="landing-reference-composed__entry" key={benefit.benefit_title}><span>{String(index + 1).padStart(2, "0")}</span><h3>{benefit.benefit_title}</h3><p>{benefit.benefit_description}</p><small>{benefit.feature_supporting_it}</small></article>)}</div></>;
    case "proof_blocks":
      return <><h2>Evidence to weigh</h2>{blueprint.metadata.reviewed_at ? <p>Sources reviewed <time dateTime={blueprint.metadata.reviewed_at}>{blueprint.metadata.reviewed_at.slice(0, 10)}</time>. Based on vendor documentation, not hands-on testing.</p> : null}<div className="landing-reference-composed__items">{blueprint.proof_blocks.map((proof) => <article className="landing-reference-composed__entry" key={`${proof.proof_type}-${proof.source_reference_id}`}><span>{proof.proof_type}</span><p>{proof.summary}</p><small>Confidence {Math.round(proof.confidence_score * 100)}%</small>{proof.source_url ? <a href={proof.source_url} rel="noreferrer">Read official source</a> : null}</article>)}</div></>;
    case "how_it_works":
      return <><h2>How it fits the workflow</h2><ol className="landing-reference-composed__items">{blueprint.how_it_works.map((step) => <li className="landing-reference-composed__entry" key={step.step_number}><span>{String(step.step_number).padStart(2, "0")}</span><h3>{step.title}</h3><p>{step.description}</p></li>)}</ol></>;
    case "limitations":
      return <><h2>Where it may not fit</h2><div className="landing-reference-composed__items">{blueprint.limitations.map((limitation) => <article className="landing-reference-composed__entry" key={limitation.limitation}><h3>{limitation.limitation}</h3><p><strong>Who this affects:</strong> {limitation.who_it_affects}</p><p>{limitation.mitigation}</p></article>)}</div></>;
    case "objection_handling":
      return <><h2>Common objections, answered plainly</h2><div className="landing-reference-composed__items">{blueprint.objection_handling.map((item) => <details className="landing-reference-composed__entry" key={item.objection}><summary>{item.objection}<span aria-hidden="true">+</span></summary><p>{item.response}</p></details>)}</div></>;
    case "faq":
      return <><h2>Questions before the click</h2><div className="landing-reference-composed__items">{blueprint.faq.map((item, index) => <details className="landing-reference-composed__entry" key={item.question} data-track="faq-expand" data-faq-index={index}><summary>{item.question}<span aria-hidden="true">+</span></summary><p>{item.answer}</p></details>)}</div></>;
    case "closing_cta": {
      const closing = blueprint.cta_blocks[0];
      return <><h2>{closing.supporting_text}</h2><div className="landing-reference-composed__items"><div className="landing-reference-composed__entry landing-reference-composed__closing-entry"><p>Review the destination details before committing.</p><Cta label={closing.label} linkId={closing.affiliate_link_id} variant={presentation.cta} override={affiliateUrlOverride} /></div></div></>;
    }
  }
}

export function ReferenceComposedReviewPage({
  blueprint,
  mode = "production",
  affiliateUrlOverride,
}: {
  blueprint: PageBlueprint;
  mode?: LandingPageRenderMode;
  affiliateUrlOverride?: string;
}) {
  if (!blueprint.presentation) {
    throw new Error("reference_composed_v1 pages require a presentation recipe.");
  }
  if (!blueprint.hero.answer_snippet?.trim()) {
    throw new Error("reference_composed_v1 pages require a hero answer snippet.");
  }

  const { presentation } = blueprint;
  const visual = getRenderableVisual(blueprint.hero.visual_asset, mode);
  const answerSnippet = blueprint.hero.answer_snippet;
  const showSubheadline = shouldRenderReferenceSubheadline(answerSnippet, blueprint.hero.subheadline);
  const sections = getRenderableSectionOrder(blueprint);

  return (
    <main
      className="landing-reference-composed"
      data-motion-root={blueprint.metadata.url_slug}
      data-design-profile="reference_composed_v1"
      data-recipe-id={presentation.recipe_id}
      data-fingerprint={presentation.fingerprint}
      data-hero-variant={presentation.hero}
      data-typography-pair={presentation.typography}
      data-cta-variant={presentation.cta}
      data-motion-variant={presentation.motion}
      data-mobile-strategy={presentation.mobile}
    >
      <div className="landing-reference-composed__frame">
        <nav className="landing-reference-composed__nav" data-motion="nav">
          <Link href="/" aria-label="VettedSaaSBlueprint home">VettedSaaSBlueprint</Link>
          <Link href="/affiliate-disclosure">Disclosure</Link>
        </nav>
        <section className="landing-reference-composed__hero">
          <div className="landing-reference-composed__hero-intro" data-motion="hero-copy">
            <p className="landing-reference-composed__eyebrow">Buyer decision brief</p>
            <h1>{blueprint.hero.headline}</h1>
            <p className="landing-reference-composed__answer">{answerSnippet}</p>
            {showSubheadline ? <p className="landing-reference-composed__subheadline">{blueprint.hero.subheadline}</p> : null}
          </div>
          <div className="landing-reference-composed__hero-media" data-motion="hero-media">
            {visual ? <figure><img src={visual.asset_url} alt={visual.alt_text} /><figcaption className="sr-only">Approved product visual</figcaption></figure> : <aside><h2>{blueprint.problem_solution.problem}</h2><p>{blueprint.problem_solution.solution}</p></aside>}
          </div>
          <div className="landing-reference-composed__hero-decision">
            <div className="landing-reference-composed__cta-cluster">
              <p className="landing-reference-composed__compact-disclosure">Paid-link note: {blueprint.affiliate_disclosure.short_disclosure}</p>
              <Cta label={blueprint.hero.primary_cta_label} linkId={blueprint.hero.primary_cta_link_id} variant={presentation.cta} override={affiliateUrlOverride} primary />
            </div>
            {blueprint.hero.risk_reversal ? <p className="landing-reference-composed__risk">{blueprint.hero.risk_reversal}</p> : null}
          </div>
        </section>
        {sections.map((sectionKey) => <section key={sectionKey} className="landing-reference-composed__section" data-section-key={sectionKey} data-section-family={presentation.section_variants[sectionKey]} data-motion="reveal"><div className="landing-reference-composed__divider" data-motion="divider" /><div className="landing-reference-composed__section-content"><SectionContent sectionKey={sectionKey} blueprint={blueprint} affiliateUrlOverride={affiliateUrlOverride} /></div></section>)}
        <footer className="landing-reference-composed__footer">
          <p>{blueprint.affiliate_disclosure.full_disclosure}</p>
          <nav aria-label="Legal and trust links"><Link href="/affiliate-disclosure">Affiliate disclosure</Link><Link href="/editorial-policy">Editorial policy</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/contact">Contact</Link></nav>
        </footer>
      </div>
      {blueprint.metadata.motion_profile === "gsap_editorial" ? <LandingPageMotion pageSlug={blueprint.metadata.url_slug} variant={presentation.motion} /> : null}
    </main>
  );
}
