import Link from "next/link";
import type { Metadata } from "next";
import type { CSSProperties } from "react";

import { HomepageMotion } from "@/components/public/HomepageMotion";
import { PublicPageShell } from "@/components/public/PublicPageShell";
import { PublicReviewCard } from "@/components/public/PublicReviewCard";
import { listPublishedLandingPageSummaries } from "@/lib/generated/landing-pages";
import { getStudioCategories } from "@/lib/studio-catalogue";

const vettingPrinciples = [
  ["Evidence before adjectives", "Claims need a traceable source. If the evidence is thin, the wording stays modest."],
  ["Fit over popularity", "We focus on the buyer, workflow, and constraint a product serves, not a generic score."],
  ["Limits stay visible", "Important tradeoffs sit beside the recommendation, not in fine print at the bottom."],
  ["Human approval", "Every public review passes evidence, compliance, and owner checks before it appears here."],
] as const;

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function Home() {
  const reviews = listPublishedLandingPageSummaries();
  const studioCategories = getStudioCategories();

  return (
    <PublicPageShell>
      <div data-home-motion-root>
        <section className="home-hero" data-home-motion="hero">
          <div className="home-hero__edition" data-home-motion="hero-support">
            <span>Independent review journal</span><span>Johannesburg · London · New York · Singapore · Sydney · 2026</span>
          </div>
          <h1 aria-label="Software decisions, vetted with receipts">
            <span className="hero-line-mask"><span data-home-motion="hero-line">Software decisions,</span></span>
            <span className="hero-line-mask hero-line-mask--offset"><span data-home-motion="hero-line"><em>vetted</em> with receipts.</span></span>
          </h1>
          <div className="home-hero__support" data-home-motion="hero-support">
            <p>Practical SaaS reviews built from verifiable evidence, clear limitations, and the question that matters: is this right for your actual workflow?</p>
            <Link className="primary-link" href="#reviews">Browse approved reviews <span aria-hidden="true">↓</span></Link>
          </div>
          <div className="home-hero__mark" aria-hidden="true" data-home-motion="hero-mark">VSB<br />/01</div>
        </section>

        <aside className="affiliate-ribbon" aria-label="Affiliate relationship" data-home-motion="reveal">
          <strong>Our relationship, plainly stated.</strong>
          <p>Some links are affiliate links. We may earn a commission if you buy, at no extra cost to you. Payment never determines what we publish.</p>
          <Link href="/affiliate-disclosure">Read the full disclosure</Link>
        </aside>

        <section className="home-section review-catalogue" id="reviews" aria-labelledby="reviews-title">
          <div className="section-heading" data-home-motion="reveal">
            <p className="eyebrow">The approved file</p>
            <h2 id="reviews-title">Reviews ready for scrutiny.</h2>
            <p>Only reviews with completed evidence, passing quality gates, and a verified release receipt appear in this catalogue.</p>
          </div>
          {reviews.length > 0 ? (
            <div className="review-list">{reviews.map((review, index) => <PublicReviewCard key={review.slug} review={review} index={index} />)}</div>
          ) : (
            <div className="empty-review-state" data-home-motion="review-card">
              <span aria-hidden="true">00</span>
              <p>No reviews are publicly approved yet. VettedSaaSBlueprint publishes a review only after evidence, compliance, and owner checks are complete.</p>
            </div>
          )}
        </section>

        <section className="home-section studio-catalogue" id="studio" aria-labelledby="studio-title">
          <div className="section-heading" data-home-motion="reveal">
            <p className="eyebrow">The field guide</p>
            <h2 id="studio-title">Choose a category. Find a sharper angle.</h2>
            <p>Twenty-five short, image-led briefs organised by the decision each product helps a team make.</p>
          </div>
          <div className="studio-category-list">
            {studioCategories.map((category) => (
              <article className="studio-category" key={category.slug} data-home-motion="review-card" style={{ "--studio-accent": category.accent } as CSSProperties}>
                <div><p className="eyebrow">{category.label}</p><h3>{category.productName}</h3><p>{category.description}</p></div>
                <nav aria-label={`${category.productName} briefs`}>
                  {category.pages.map((page) => <Link key={page.slug} href={page.path}>{page.variant.label}<span aria-hidden="true">↗</span></Link>)}
                </nav>
              </article>
            ))}
          </div>
        </section>

        <section className="home-section vetting-section" id="how-we-vet" aria-labelledby="vetting-title">
          <div className="section-heading section-heading--compact" data-home-motion="reveal">
            <p className="eyebrow">How we vet</p>
            <h2 id="vetting-title">A review should make a decision clearer, not louder.</h2>
          </div>
          <ol className="vetting-list">
            {vettingPrinciples.map(([title, description], index) => (
              <li key={title} data-home-motion="reveal">
                <span>{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{description}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="editorial-callout" data-home-motion="reveal">
          <p className="eyebrow">The compact</p>
          <h2>Independent judgment.<br />Visible incentives.</h2>
          <p>Our editorial policy explains how evidence, affiliate relationships, corrections, and review approval work together.</p>
          <div><Link className="primary-link primary-link--dark" href="/editorial-policy">Read our editorial policy <span aria-hidden="true">↗</span></Link><Link className="text-link text-link--dark" href="/affiliate-disclosure">Affiliate disclosure</Link></div>
        </section>
      </div>
      <HomepageMotion />
    </PublicPageShell>
  );
}
