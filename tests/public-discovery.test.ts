import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import robots from "../src/app/robots";
import { buildPublicSitemap } from "../src/app/sitemap";
import { loadPublicSiteConfig } from "../src/lib/site/public-site";

const readyConfig = loadPublicSiteConfig({
  PUBLIC_POLICY_EFFECTIVE_DATE: "2026-07-10",
  INFORMATION_OFFICER_REGISTRATION_CONFIRMED_AT: "2026-07-10T08:00:00.000Z",
});

test("sitemap contains the public home and every legal route", () => {
  const entries = buildPublicSitemap(readyConfig, []);
  const paths = entries.map((entry) => new URL(entry.url).pathname);

  assert.deepEqual(paths, [
    "/",
    "/privacy",
    "/terms",
    "/contact",
    "/affiliate-disclosure",
    "/editorial-policy",
    "/paia",
    "/accessibility",
    "/blog",
  ]);
  assert.ok(entries.every((entry) => entry.lastModified === undefined));
});

test("sitemap includes only review summaries supplied by the audited publication catalogue", () => {
  const entries = buildPublicSitemap(readyConfig, [
    {
      slug: "approved-review",
      path: "/landing-page-builders/approved-review",
      title: "Approved review",
      description: "An approved review.",
      categorySlug: "workflow",
      decisionCue: "A decision cue.",
      limitationCue: "A limitation cue.",
      publishedAt: "2026-07-09T12:00:00.000Z",
    },
  ]);
  const paths = entries.map((entry) => new URL(entry.url).pathname);

  assert.ok(paths.includes("/landing-page-builders/approved-review"));
  assert.ok(!paths.includes("/landing-page-builders/unapproved-review"));
  assert.ok(!paths.includes("/landing-page-builders/draft-artifact"));
  assert.ok(paths.every((path) => !path.startsWith("/admin") && !path.startsWith("/api")));

  const source = readFileSync("src/app/sitemap.ts", "utf8");
  assert.match(source, /listPublishedLandingPageSummaries\(\)/);
  assert.doesNotMatch(source, /src\/generated\/landing-pages\/index\.json/);
});

test("robots allows the public site while excluding owner and API surfaces", () => {
  const result = robots();
  const rules = Array.isArray(result.rules) ? result.rules : [result.rules];
  const disallowed = rules.flatMap((rule) => rule.disallow ?? []);

  assert.equal(result.sitemap, "https://vettedsaasblueprint.online/sitemap.xml");
  assert.ok(disallowed.includes("/admin/"));
  assert.ok(disallowed.includes("/api/"));
});

test("the public 404 uses the shared shell and provides a home link", () => {
  const source = readFileSync("src/app/not-found.tsx", "utf8");
  assert.match(source, /PublicPageShell/);
  assert.match(source, /href=["']\/["']/);
  assert.match(source, /Page not found/i);
});

test("the generated social card uses the approved brand and dimensions", () => {
  const source = readFileSync("src/app/opengraph-image.tsx", "utf8");
  assert.match(source, /VettedSaaSBlueprint/);
  assert.match(source, /Practical SaaS reviews for real buying decisions/);
  assert.match(source, /width:\s*1200/);
  assert.match(source, /height:\s*630/);
  assert.doesNotMatch(source, /https?:\/\//);
});
