import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ReviewedArticleHero } from "../src/components/public/ReviewedArticleHero";

const asset = {
  filePath: "public/images/direct-review-example-hero.webp",
  publicPath: "/images/direct-review-example-hero.webp",
  sha256: "a".repeat(64),
  width: 1536,
  height: 1024,
  alt: "A reviewed editorial workspace arranged as a calm decision system.",
};

test("reviewed hero renders the validated publication asset with intrinsic dimensions", () => {
  const html = renderToStaticMarkup(createElement(ReviewedArticleHero, { asset }));
  assert.match(html, /<span class="reviewed-article-hero-frame" data-reviewed-article-hero="true">/);
  assert.match(html, /src="\/images\/direct-review-example-hero.webp"/);
  assert.match(html, /width="1536"/);
  assert.match(html, /height="1024"/);
  assert.match(html, new RegExp(`alt="${asset.alt}"`));
});

test("public renderer boundaries bind the whole approved artifact fingerprint", () => {
  const expectations = [
    ["src/app/landing-page-builders/[slug]/page.tsx", 'loadArticleHero("direct-review", published.blueprint.metadata.url_slug, fingerprintEditorialArtifact(published.blueprint))'],
    ["src/app/landing-page-previews/[slug]/page.tsx", 'loadArticleHero("direct-review", batchPreview.blueprint.metadata.url_slug, fingerprintEditorialArtifact(batchPreview.blueprint))'],
    ["src/app/dev/approved-article-preview/[slug]/page.tsx", 'loadArticleHero("direct-review", result.blueprint.metadata.url_slug, fingerprintEditorialArtifact(result.blueprint))'],
    ["src/app/blog/[slug]/page.tsx", 'loadArticleHero("blog", post.slug, fingerprintEditorialArtifact(post))'],
    ["src/lib/visibility-pages/route.tsx", 'loadArticleHero("visibility", record.page.path.slice(1), fingerprintEditorialArtifact(record.page))'],
    ["src/app/decision-hub/[setSlug]/page.tsx", 'loadArticleHero("decision-set", set.slug, fingerprintEditorialArtifact(set))'],
    ["src/app/solution-hub/[setSlug]/page.tsx", 'loadArticleHero("decision-set", set.slug, fingerprintEditorialArtifact(set))'],
    ["src/app/scenarios/[setSlug]/page.tsx", 'loadArticleHero("decision-set", set.slug, fingerprintEditorialArtifact(set))'],
  ] as const;

  for (const [path, binding] of expectations) assert.ok(readFileSync(path, "utf8").includes(binding), path);
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
