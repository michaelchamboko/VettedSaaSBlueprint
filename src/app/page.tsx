import Link from "next/link";
import type { Metadata } from "next";

import { HomepageMotion } from "@/components/public/HomepageMotion";
import { PublicPageShell } from "@/components/public/PublicPageShell";
import { PublicReviewCard } from "@/components/public/PublicReviewCard";
import { StudioCategoryGallery } from "@/components/public/StudioCategoryGallery";
import { listPublishedLandingPageSummaries } from "@/lib/generated/landing-pages";
import { getStudioCategories } from "@/lib/studio-catalogue";
import { listDecisionSets } from "@/lib/decision-journey/sets";
import { localizationPages } from "@/lib/decision-journey/video-localization";
import { trendReports } from "@/lib/trends/trend-reports";

const vettingPrinciples = [
  ["Evidence before adjectives", "Claims need a traceable source. If the evidence is thin, the wording stays modest."],
  ["Fit over popularity", "We focus on the buyer, workflow, and constraint a product serves, not a generic score."],
  ["Limits stay visible", "Important tradeoffs sit beside the recommendation, not in fine print at the bottom."],
  ["Human approval", "Every public review passes evidence, compliance, and owner checks before it appears here."],
] as const;

const decisionGuides = [
  ["Decision guide", "Understand the team’s constraints before looking at any software approach.", "/decision-hub"],
  ["Solution guide", "Use the same criteria to compare approaches conditionally, not to chase a universal winner.", "/solution-hub"],
  ["Worked scenario", "Apply the framework to a five-person team without a technical administrator.", "/scenarios"],
] as const;

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function Home() {
  const reviews = listPublishedLandingPageSummaries();
  const studioCategories = getStudioCategories();
  const decisionSets = listDecisionSets();

  return (
    <PublicPageShell>
      <div data-home-motion-root>
        <section className="home-hero" data-home-motion="hero">
          <div className="home-hero__edition" data-home-motion="hero-support">
            <span>Independent review journal</span><span>Johannesburg · 2026</span>
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

        <section className="home-section decision-guide-catalogue" aria-labelledby="decision-guides-title">
          <div className="section-heading" data-home-motion="reveal">
            <p className="eyebrow">Decision guides</p>
            <h2 id="decision-guides-title">Start with the situation, not a vendor list.</h2>
            <p>A connected, source-bound path for a five-person team choosing software without a technical administrator.</p>
          </div>
          <div className="decision-guide-catalogue__grid">
            {decisionGuides.map(([title, description, href], index) => (
              <article key={href} data-home-motion="review-card">
                <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <h3>{title}</h3><p>{description}</p><Link href={href}>Open guide <span aria-hidden="true">→</span></Link>
              </article>
            ))}
          </div>
        </section>

        {decisionSets.map((set) => (
          <section className="home-section decision-guide-catalogue" aria-labelledby={`decision-set-${set.slug}`} key={set.slug}>
            <div className="section-heading" data-home-motion="reveal">
              <p className="eyebrow">New evidence-led decision set · {set.evidenceState} evidence</p>
              <h2 id={`decision-set-${set.slug}`}>{set.title}</h2>
              <p>{set.userProblem}</p>
            </div>
            <div className="decision-guide-catalogue__grid">
              {[["Decision guide", set.pages.decisionHub.canonicalPath], ["Solution guide", set.pages.solutionHub.canonicalPath], ["Worked scenario", set.pages.scenario.canonicalPath]].map(([title, href], index) => (
                <article key={href} data-home-motion="review-card"><span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{set.pages[index === 0 ? "decisionHub" : index === 1 ? "solutionHub" : "scenario"].decisionContext}</p><Link href={href}>Open guide <span aria-hidden="true">→</span></Link></article>
              ))}
            </div>
          </section>
        ))}

        <section className="home-section" aria-labelledby="latest-guides-title">
          <div className="section-heading" data-home-motion="reveal">
            <p className="eyebrow">Latest evidence-led guides</p>
            <h2 id="latest-guides-title">Questions worth working through.</h2>
            <p>Use the connected localization journey and current trend reports to frame a better software decision.</p>
          </div>
          <div className="studio-category-list">
            <div className="studio-category" data-home-motion="reveal">
              <div>
                <p className="eyebrow">Video localization</p>
                <h3>One connected journey from question to pilot.</h3>
                <p>Start with audience fit, compare workable routes, then test the workflow against a real tutorial.</p>
              </div>
              <nav aria-label="Video localization guides">
                {localizationPages.map((page) => <Link key={page.path} href={page.path}>{page.type}<span aria-hidden="true">↗</span></Link>)}
              </nav>
            </div>
            <div className="studio-category" data-home-motion="reveal">
              <div>
                <p className="eyebrow">Trend reports</p>
                <h3>Context for the next software conversation.</h3>
                <p>Read the evidence, boundaries, and buyer questions behind the current SaaS shifts.</p>
              </div>
              <nav aria-label="Trend reports">
                {trendReports.map((report) => <Link key={report.canonicalPath} href={report.canonicalPath}>{report.navLabel}<span aria-hidden="true">↗</span></Link>)}
              </nav>
            </div>
          </div>
        </section>

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
          <StudioCategoryGallery categories={studioCategories} />
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
