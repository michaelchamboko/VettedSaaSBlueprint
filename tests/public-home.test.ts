import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const homeSource = readFileSync("src/app/page.tsx", "utf8");
const metadataSource = readFileSync("src/lib/site/public-site.ts", "utf8");
const motionSource = readFileSync("src/components/public/HomepageMotion.tsx", "utf8");
const blogSource = readFileSync("src/app/blog/page.tsx", "utf8");
const headerSource = readFileSync("src/components/public/PublicHeader.tsx", "utf8");
const footerSource = readFileSync("src/components/public/PublicFooter.tsx", "utf8");
const publicSiteContract = readFileSync("src/lib/site/public-site.ts", "utf8");
const shellSource = [
  "src/components/public/PublicHeader.tsx",
  "src/components/public/PublicFooter.tsx",
  "src/components/public/PublicPageShell.tsx",
]
  .map((file) => readFileSync(file, "utf8"))
  .join("\n");

test("public homepage exposes the approved editorial hub, not the owner console", () => {
  assert.match(homeSource, /VettedSaaSBlueprint/);
  assert.match(homeSource, /listPublishedLandingPageSummaries/);
  assert.match(homeSource, /No reviews are publicly approved yet/);
  assert.doesNotMatch(homeSource, /href=["']\/admin\//);
  assert.equal((homeSource.match(/<h1\b/g) ?? []).length, 1);
  assert.match(homeSource, /alternates:\s*\{ canonical: "\/" \}/);
  assert.doesNotMatch(metadataSource, /alternates:\s*\{ canonical: "\/" \}/);
  assert.match(homeSource, /Johannesburg · London · New York · Singapore · Sydney · 2026/);
  assert.match(blogSource, /PublicPageShell/);
  assert.match(blogSource, /Buyer guides for better SaaS decisions/);
});

test("homepage motion uses ScrollTrigger safely and honors reduced motion", () => {
  assert.match(motionSource, /gsap\.registerPlugin\(ScrollTrigger\)/);
  assert.match(motionSource, /prefers-reduced-motion: no-preference/);
  assert.match(motionSource, /ease: "none"/);
  assert.match(motionSource, /context\.revert\(\)/);
  assert.doesNotMatch(motionSource, /addEventListener\(["']scroll/);
});

test("public shell includes skip navigation and every legal route", () => {
  assert.match(shellSource, /Skip to content/);
  assert.match(shellSource, /tabIndex=\{-1\}/);
  for (const route of [
    "/blog",
    "/privacy",
    "/terms",
    "/contact",
    "/affiliate-disclosure",
    "/editorial-policy",
    "/paia",
    "/accessibility",
  ]) {
    assert.match(shellSource, new RegExp(`["']${route}["']`));
  }
  assert.equal((shellSource.match(/["']\/blog["']/g) ?? []).length, 2);
  assert.match(headerSource, /Reviews<\/Link>\s*<Link href="\/blog">Blog<\/Link>\s*<Link href="\/#how-we-vet">How we vet/);
  assert.match(footerSource, /const footerLinks = \[\s*\["Blog", "\/blog"\]/);
  assert.match(footerSource, /aria-label="Site, legal, and trust information"/);
  assert.match(publicSiteContract, /3 Wagner Lane, Sagewood, Johannesburg, Gauteng, South Africa/);
  assert.match(publicSiteContract, /South African sole proprietorship operating from/);
});
