import type { BlogPost } from "./contracts";

const forbiddenAffiliateMarkers = ["partnerstack", "pscr.pt", "go.vettedsaasblueprint"];
const publishedReviewSlugs = new Set([
  "elevenlabs-ai-voice-generator",
  "moosend-email-marketing-automation",
]);

export function auditBlogPost(post: BlogPost): string[] {
  const failures: string[] = [];
  const serialized = JSON.stringify(post);
  const wordCount = post.sections
    .flatMap((section) => [
      ...section.paragraphs,
      ...(section.bullets ?? []),
      ...(section.checklist ?? []),
      section.caution ?? "",
    ])
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;

  if (wordCount < 650) failures.push(`${post.slug}: fewer than 650 practical words`);
  if (!post.canonicalPath.endsWith(post.slug)) failures.push(`${post.slug}: canonical mismatch`);
  if (post.sources.length < 3) failures.push(`${post.slug}: fewer than three sources`);
  if (!post.sources.some((source) => source.kind !== "vendor")) {
    failures.push(`${post.slug}: missing non-vendor evidence`);
  }
  if (!post.sections.some((section) => (section.checklist?.length ?? 0) >= 4)) {
    failures.push(`${post.slug}: missing actionable checklist`);
  }
  if (post.faqs.length < 3) failures.push(`${post.slug}: fewer than three FAQs`);
  if (/[\u2013\u2014]/.test(serialized)) failures.push(`${post.slug}: contains a long dash`);
  if (forbiddenAffiliateMarkers.some((marker) => serialized.toLowerCase().includes(marker))) {
    failures.push(`${post.slug}: contains a direct affiliate destination`);
  }
  for (const reviewSlug of post.relatedReviewSlugs) {
    if (!publishedReviewSlugs.has(reviewSlug)) {
      failures.push(`${post.slug}: links to unpublished review ${reviewSlug}`);
    }
  }

  return failures;
}

export function auditBlogCollection(posts: BlogPost[]): string[] {
  const failures = posts.flatMap(auditBlogPost);
  if (posts.length !== 10) failures.push("catalogue must contain exactly ten posts");

  for (const field of ["slug", "title", "buyerQuestion"] as const) {
    if (new Set(posts.map((post) => post[field])).size !== posts.length) {
      failures.push(`catalogue contains duplicate ${field} values`);
    }
  }

  const cycle = posts.map((post) => post.cyclePosition).toSorted((a, b) => a - b);
  if (cycle.join(",") !== "1,2,3,4,5,6,7,8,9,10") {
    failures.push("catalogue cycle positions must cover one through ten");
  }
  const trend = posts
    .filter((post) => post.publicationType === "trend")
    .map((post) => post.cyclePosition)
    .toSorted((a, b) => a - b);
  if (trend.join(",") !== "3,6,9") failures.push("trend posts must occupy positions 3, 6, and 9");

  return failures;
}
