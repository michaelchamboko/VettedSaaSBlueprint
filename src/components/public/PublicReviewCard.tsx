import Link from "next/link";

import type { PublicReviewSummary } from "@/lib/generated/landing-pages";

export function PublicReviewCard({ review, index }: { review: PublicReviewSummary; index: number }) {
  return (
    <article className="review-card" data-home-motion="review-card">
      <div className="review-card__index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</div>
      <div className="review-card__body">
        <p className="eyebrow">{review.categorySlug.replaceAll("-", " ")}</p>
        <h3><Link href={review.path}>{review.title}</Link></h3>
        <p className="review-card__description">{review.description}</p>
        <dl className="review-card__signals">
          <div><dt>Decision cue</dt><dd>{review.decisionCue}</dd></div>
          <div><dt>Know first</dt><dd>{review.limitationCue}</dd></div>
        </dl>
        <Link className="text-link" href={review.path}>Read review <span aria-hidden="true">↗</span></Link>
      </div>
    </article>
  );
}
