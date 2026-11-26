import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ReviewedArticleHero } from "../src/components/public/ReviewedArticleHero";
import { fingerprintArticleHeroRendererArtifact, loadArticleHeroForArtifact, articleHeroPaths, type ArticleHeroFormat } from "../src/lib/article-heroes";
import { getPublishedBlogPost, listPublishedBlogPostParams } from "../src/lib/blog/catalogue";
import { listDecisionSets } from "../src/lib/decision-journey/sets";
import { samplePageBlueprint } from "./fixtures/sample-page-blueprint";

const asset = {
  filePath: "public/images/direct-review-example-hero.webp",
  publicPath: "/images/direct-review-example-hero.webp",
  sha256: "a".repeat(64),
  width: 1536,
  height: 1024,
  alt: "A reviewed editorial workspace arranged as a calm decision system.",
};
const visibility = {
  schema_version: "VisibilityPageV1",
  id: "voice-guide",
  path: "/guides/how-to-evaluate-ai-voice-quality",
  kind: "guide",
  cluster_id: "ai_voice",
  title: "How to evaluate AI voice quality",
  description: "A practical guide to comparing AI voice quality before selecting a production workflow.",
  modified_at: "2026-10-21T00:00:00Z",
  hero: { eyebrow: "Guide", headline: "Evaluate AI voice quality", summary: "Compare pronunciation, pacing, consistency, and editing controls against the work you need to publish." },
  claim_ids: [],
  relevant_review_path: "/landing-page-builders/elevenlabs-ai-voice-generator",
  related_paths: ["/ai-voice-generators"],
  blocks: [{ type: "prose", paragraphs: ["Compare the same script across tools, then record pronunciation errors, editing time, and export constraints before choosing a workflow."] }],
};

test("reviewed hero renders the validated publication asset with intrinsic dimensions", () => {
  const html = renderToStaticMarkup(createElement(ReviewedArticleHero, { asset }));
  assert.match(html, /<span class="reviewed-article-hero-frame" data-reviewed-article-hero="true">/);
  assert.match(html, /src="\/images\/direct-review-example-hero.webp"/);
  assert.match(html, /width="1536"/);
  assert.match(html, /height="1024"/);
  assert.match(html, new RegExp(`alt="${asset.alt}"`));
});

test("public and candidate renderer boundaries use schema-canonical hero identity", () => {
  const expectations = [
    ["src/app/landing-page-builders/[slug]/page.tsx", 'loadArticleHeroForArtifact("direct-review", published.blueprint.metadata.url_slug, published.blueprint)'],
    ["src/app/landing-page-previews/[slug]/page.tsx", 'loadArticleHeroForArtifact("direct-review", batchPreview.blueprint.metadata.url_slug, batchPreview.blueprint)'],
    ["src/app/dev/approved-article-preview/[slug]/page.tsx", 'loadArticleHeroForArtifact("direct-review", result.blueprint.metadata.url_slug, result.blueprint)'],
    ["src/app/blog/[slug]/page.tsx", 'loadArticleHeroForArtifact("blog", post.slug, post)'],
    ["src/lib/visibility-pages/route.tsx", 'loadArticleHeroForArtifact("visibility", record.page.path.slice(1), record.page)'],
    ["src/app/decision-hub/[setSlug]/page.tsx", 'loadArticleHeroForArtifact("decision-set", set.slug, set)'],
    ["src/app/solution-hub/[setSlug]/page.tsx", 'loadArticleHeroForArtifact("decision-set", set.slug, set)'],
    ["src/app/scenarios/[setSlug]/page.tsx", 'loadArticleHeroForArtifact("decision-set", set.slug, set)'],
  ] as const;

  for (const [path, binding] of expectations) assert.ok(readFileSync(path, "utf8").includes(binding), path);
});

function reverseObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reverseObjectKeys);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).reverse().map(([key, item]) => [key, reverseObjectKeys(item)]));
}

test("canonical renderer identity survives shuffled keys and schema defaults across all four formats", () => {
  const blog = getPublishedBlogPost(listPublishedBlogPostParams()[0]!.slug)!;
  const decisionSet = listDecisionSets()[0]!;
  const cases = [
    ["direct-review", samplePageBlueprint],
    ["blog", blog],
    ["visibility", visibility],
    ["decision-set", decisionSet],
  ] as const;
  for (const [format, artifact] of cases) {
    assert.equal(fingerprintArticleHeroRendererArtifact(format, reverseObjectKeys(artifact)), fingerprintArticleHeroRendererArtifact(format, artifact), format);
  }
  const withoutDefault = structuredClone(visibility) as Record<string, unknown>;
  delete withoutDefault.claim_ids;
  assert.equal(fingerprintArticleHeroRendererArtifact("visibility", withoutDefault), fingerprintArticleHeroRendererArtifact("visibility", visibility));
  const directWithoutDefaults = structuredClone(samplePageBlueprint) as Record<string, unknown>;
  const metadata = directWithoutDefaults.metadata as Record<string, unknown>;
  for (const key of ["robots", "motion_profile", "design_profile"]) delete metadata[key];
  for (const key of ["proof_blocks", "how_it_works", "objection_handling", "faq"]) delete directWithoutDefaults[key];
  const directWithCanonicalDefaults = { ...samplePageBlueprint, metadata: { ...samplePageBlueprint.metadata, robots: "index,follow", motion_profile: "static", design_profile: "legacy" }, proof_blocks: [], how_it_works: [], objection_handling: [], faq: [] };
  assert.equal(fingerprintArticleHeroRendererArtifact("direct-review", directWithoutDefaults), fingerprintArticleHeroRendererArtifact("direct-review", directWithCanonicalDefaults));
});

test("raw approval identity stays separate while stale prose fails at each renderer boundary", () => {
  const blog = getPublishedBlogPost(listPublishedBlogPostParams()[0]!.slug)!;
  const decisionSet = listDecisionSets()[0]!;
  const cases: Array<[ArticleHeroFormat, string, unknown, unknown]> = [
    ["direct-review", samplePageBlueprint.metadata.url_slug, samplePageBlueprint, { ...samplePageBlueprint, hero: { ...samplePageBlueprint.hero, headline: `X${samplePageBlueprint.hero.headline.slice(1)}` } }],
    ["blog", blog.slug, blog, { ...blog, answerSummary: `X${blog.answerSummary.slice(1)}` }],
    ["visibility", visibility.path.slice(1), visibility, { ...visibility, hero: { ...visibility.hero, summary: `X${visibility.hero.summary.slice(1)}` } }],
    ["decision-set", decisionSet.slug, decisionSet, { ...decisionSet, userProblem: `${decisionSet.userProblem} Updated.` }],
  ];
  for (const [format, slug, artifact, stale] of cases) {
    const rendererFingerprint = fingerprintArticleHeroRendererArtifact(format, artifact);
    const paths = articleHeroPaths(format, slug);
    const sidecar = { schemaVersion: "ArticleHeroPublicationV1", format, slug, artifactFingerprint: "f".repeat(64), rendererFingerprint,
      asset: { filePath: paths.assetFile, publicPath: paths.publicPath, sha256: "a".repeat(64), width: 1600, height: 900, alt: "Reviewed evidence-led editorial decision workspace illustration." } };
    assert.equal(loadArticleHeroForArtifact(format, slug, reverseObjectKeys(artifact), () => sidecar)?.artifactFingerprint, "f".repeat(64), format);
    assert.throws(() => loadArticleHeroForArtifact(format, slug, stale, () => sidecar), /ARTICLE_HERO_ARTIFACT_MISMATCH/, format);
  }
});

test("developer approval route exercises the candidate renderer with its bound sidecar", () => {
  const source = readFileSync("src/app/dev/approved-article-preview/[slug]/page.tsx", "utf8");
  assert.match(source, /packetPreview === "1"/);
  assert.match(source, /<DirectReviewPage[\s\S]*reviewedHero=\{reviewedHero\}/);
});

test("reviewed hero motion has a reduced-motion alternative", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  assert.match(css, /@keyframes reviewed-article-hero-enter/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*animation: none; clip-path: none; transform: none/);
});
