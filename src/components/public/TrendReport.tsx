import Link from "next/link";

import {
  loadPublicSiteConfig,
} from "@/lib/site/public-site";
import {
  trendReports,
  type EvidenceTier,
  type TrendReport as TrendReportContract,
  type TrendSource,
} from "@/lib/trends/trend-reports";
import { TrendReportMotion } from "./TrendReportMotion";

type Props = {
  report: TrendReportContract;
};

const tierPresentation: Record<EvidenceTier, { label: string; confirmed: boolean }> = {
  "primary-source": { label: "Primary source", confirmed: true },
  "third-party-reported": { label: "Reported", confirmed: false },
  "vendor-claim": { label: "Vendor claim", confirmed: false },
  forecast: { label: "Estimate", confirmed: false },
};

const sourceKindLabels: Record<TrendSource["kind"], string> = {
  "primary-document": "Primary document",
  "vendor-announcement": "Vendor announcement",
  "news-report": "News report",
  "industry-analysis": "Industry analysis",
  "vendor-blog": "Vendor blog",
  "consultancy-report": "Consultancy report",
};

function formatDate(value: string): string {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function TrendReport({ report }: Props) {
  const config = loadPublicSiteConfig();
  const index = trendReports.findIndex((item) => item.slug === report.slug);
  const previous = index > 0 ? trendReports[index - 1] : undefined;
  const next = report.nextPath ? trendReports.find((item) => item.canonicalPath === report.nextPath) : undefined;
  const sourceRefs = new Map(report.sources.map((source, position) => [source.id, { source, number: position + 1 }]));

  return (
    <article className="journey-page" data-trend-motion-root>
      <TrendReportMotion />
      <header className="journey-hero">
        <p className="public-eyebrow">Trend report</p>
        <h1>{report.title}</h1>
        <p className="journey-hero-summary">{report.summary}</p>
        <p className="journey-context">
          Observed on <time dateTime={report.observedOn}>{formatDate(report.observedOn)}</time>. Every finding below
          names its source and how strongly that source supports it.
        </p>
      </header>

      <section className="journey-blocks" aria-label="Report">
        {report.sections.map((section, sectionIndex) => (
          <article key={section.heading} className="journey-block" data-trend-motion="block">
            <h2>{section.heading}</h2>
            {section.paragraphs.map((paragraph, paragraphIndex) => (
              <p key={`${report.slug}-s${sectionIndex}-p${paragraphIndex}`}>{paragraph}</p>
            ))}
            {section.bullets ? (
              <ul>
                {section.bullets.map((item, bulletIndex) => (
                  <li key={`${report.slug}-s${sectionIndex}-b${bulletIndex}`}>{item}</li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
      </section>

      <section className="journey-card" aria-label="Evidence findings">
        <h2>What the evidence supports</h2>
        <p>
          A solid tag means the claim sits in the named document itself. An outlined tag means the claim is reported
          elsewhere, asserted by a vendor, or estimated.
        </p>
        <div className="journey-evidence-list">
          {report.findings.map((finding) => (
            <div key={finding.claim} className="journey-evidence" data-trend-motion="finding">
              <div className="journey-evidence-header">
                <span
                  className={`trend-tier${tierPresentation[finding.tier].confirmed ? " trend-tier--confirmed" : ""}`}
                  aria-label={`Evidence tier: ${tierPresentation[finding.tier].label}`}
                >
                  {tierPresentation[finding.tier].label}
                </span>
                <p>{finding.claim}</p>
              </div>
              <ul className="journey-sources">
                {finding.sourceIds.map((id) => {
                  const ref = sourceRefs.get(id);
                  if (!ref) return null;
                  return (
                    <li key={id}>
                      <a className="public-text-link" href={`#s${ref.number}`}>
                        {"S" + ref.number}
                      </a>
                      {" "}
                      — {ref.source.publisher}, {sourceKindLabels[ref.source.kind]}
                      {ref.source.publishedAt ? ` (published ${formatDate(ref.source.publishedAt)})` : " (undated)"}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="journey-card" aria-labelledby="trend-reviews-title" data-trend-motion="close">
        <h2 id="trend-reviews-title">Where this meets a vetted decision</h2>
        <p>
          These links lead to VettedSaaSBlueprint review pages that carry authorized affiliate destinations. If you
          sign up through them we may earn a commission at no extra cost to you, and the commission never decides what
          we publish. <Link className="public-text-link" href="/affiliate-disclosure">Full disclosure</Link>.
        </p>
        <div className="trend-review-grid">
          {report.relatedReviews.map((review) => (
            <article key={review.reviewPath} className="trend-review-card">
              <p className="trend-review-program">{review.program}</p>
              <h3>{review.stage}</h3>
              <p>{review.fitLine}</p>
              <Link className="text-link" href={review.reviewPath}>
                Read the vetted review <span aria-hidden="true">→</span>
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="journey-block" aria-labelledby="trend-sources-title" id="sources" data-trend-motion="close">
        <h2 id="trend-sources-title">Sources</h2>
        <ol className="journey-sources">
          {report.sources.map((source, position) => (
            <li key={source.id} id={`s${position + 1}`}>
              <strong>{"S" + (position + 1)}</strong>{" "}
              <a className="public-text-link" href={source.url} rel="noopener">{source.title}</a>
              {" — "}
              {source.publisher}
              {", "}
              {sourceKindLabels[source.kind]}
              {source.publishedAt ? `, published ${formatDate(source.publishedAt)}` : ""}
              {`, accessed ${formatDate(source.accessedAt)}`}.
              {source.note ? ` ${source.note}` : ""}
            </li>
          ))}
        </ol>
      </section>

      <aside className="journey-disclosure" aria-label="Evidence boundaries" data-trend-motion="close">
        <h2>Evidence boundaries</h2>
        <ul>
          {report.boundaries.map((item, itemIndex) => (
            <li key={`${report.slug}-x${itemIndex}`}>{item}</li>
          ))}
        </ul>
        <p>
          This is a trend brief from {config.brandName}, not a verified product review. Corrections:{" "}
          <a className="public-text-link" href={`mailto:${config.operator.publicEmail}`}>
            {config.operator.publicEmail}
          </a>
          . See also <Link className="public-text-link" href="/editorial-policy">editorial policy</Link> and{" "}
          <Link className="public-text-link" href="/affiliate-disclosure">affiliate disclosure</Link>.
        </p>
      </aside>

      <nav className="journey-nav" aria-label="Trend reports" data-trend-motion="close">
        {previous ? (
          <Link href={previous.canonicalPath} className="journey-nav-link">
            ← {previous.navLabel}
          </Link>
        ) : (
          <span className="journey-nav-spacer" />
        )}
        {next ? (
          <Link href={next.canonicalPath} className="journey-nav-link">
            {next.navLabel} →
          </Link>
        ) : (
          <Link href="/decision-hub" className="journey-nav-link">
            Decision Hub →
          </Link>
        )}
      </nav>
    </article>
  );
}
