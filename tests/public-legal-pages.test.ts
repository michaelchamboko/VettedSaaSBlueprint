import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const routeFiles = {
  privacy: "src/app/privacy/page.tsx",
  terms: "src/app/terms/page.tsx",
  contact: "src/app/contact/page.tsx",
  editorial: "src/app/editorial-policy/page.tsx",
  paia: "src/app/paia/page.tsx",
  accessibility: "src/app/accessibility/page.tsx",
  affiliate: "src/app/affiliate-disclosure/page.tsx",
} as const;

function source(path: string) {
  return readFileSync(path, "utf8");
}

test("all legal and trust routes use the shared legal document", () => {
  for (const [name, path] of Object.entries(routeFiles)) {
    const page = source(path);
    assert.match(page, /LegalDocument/, `${name} should use LegalDocument`);
    assert.match(page, /loadPublicSiteConfig/, `${name} should load the fixed public profile`);
    assert.doesNotMatch(page, /GlobalSetup|example\.com|TODO|TBD|placeholder/i);
  }
});

test("all legal and trust routes have unique self-referencing metadata", () => {
  const titles = new Set<string>();
  const descriptions = new Set<string>();

  for (const [name, path] of Object.entries(routeFiles)) {
    const page = source(path);
    const route = `/${path.split("/")[2]}`;
    const title = page.match(/title:\s*"([^"]+)"/)?.[1];
    const description = page.match(/description:\s*"([^"]+)"/)?.[1];

    assert.match(page, /export const metadata: Metadata/, `${name} should export metadata`);
    assert.ok(title, `${name} should have a title`);
    assert.ok(description, `${name} should have a description`);
    assert.match(page, new RegExp(`canonical:\\s*"${route}"`), `${name} should self-canonicalize`);
    assert.match(page, new RegExp(`url:\\s*"${route}"`), `${name} should set its social URL`);
    titles.add(title);
    descriptions.add(description);
  }

  assert.equal(titles.size, Object.keys(routeFiles).length);
  assert.equal(descriptions.size, Object.keys(routeFiles).length);
});

test("privacy notice describes actual collection, processing, retention, and rights", () => {
  const page = source(routeFiles.privacy);
  for (const requirement of [
    "does not operate application-level visitor analytics",
    "event ingestion",
    "no raw IP",
    "no IP hash",
    "legitimate interests",
    "Vercel",
    "PartnerStack",
    "sets no application analytics records",
    "no nonessential analytics or advertising cookies",
    "Global Privacy Control",
    "Do Not Track",
    "access",
    "correction",
    "deletion",
    "object",
    "Information Regulator",
    "enquiries@inforegulator.org.za",
  ]) {
    assert.ok(page.includes(requirement), `privacy notice should include ${requirement}`);
  }
  assert.doesNotMatch(page, /page_view|cta_click|affiliate_click|link_error|faq_expand/);
});

test("terms clearly exclude selling, payments, and vendor responsibility", () => {
  const page = source(routeFiles.terms);
  assert.match(page, /does not sell/i);
  assert.match(page, /does not accept payments/i);
  assert.match(page, /not the vendor or seller/i);
  assert.match(page, /pricing, trials, refunds, security/i);
  assert.match(page, /South African law/i);
  assert.match(page, /Gauteng/i);
});

test("contact is email-only and has no form or phone", () => {
  const page = source(routeFiles.contact);
  assert.match(page, /mailto:/);
  assert.doesNotMatch(page, /<form|telephone|phone number/i);
});

test("PAIA page is a complete printable Section 51 private-body manual", () => {
  const page = source(routeFiles.paia);
  assert.match(page, /assertPublicLaunchReady\(config\)/);
  for (const requirement of [
    "Section 51",
    "Sole Proprietor, VettedSaaSBlueprint",
    "Information Officer, VettedSaaSBlueprint",
    "automatically available",
    "Applicable legislation",
    "Subjects and categories of records",
    "Categories of data subjects",
    "Recipient categories",
    "Cross-border",
    "Security safeguards",
    "Form 2",
    "proof of identity",
    "prescribed fees",
    "30 calendar days",
    "Grounds for refusal",
    "no internal appeal",
    "complaint",
    "court",
    "Update history",
    "https://inforegulator.org.za/paia/",
  ]) {
    assert.ok(page.toLowerCase().includes(requirement.toLowerCase()), `PAIA manual should include ${requirement}`);
  }
  assert.match(page, /print:/);
});

test("accessibility describes a target, not a certification", () => {
  const page = source(routeFiles.accessibility);
  assert.match(page, /WCAG 2\.2 Level AA/);
  assert.match(page, /target/i);
  assert.doesNotMatch(page, /certified|guarantee(?:d)? compliance/i);
});

test("affiliate compensation is disclosed without promising positive coverage", () => {
  const page = source(routeFiles.affiliate);
  assert.match(page, /at no extra cost/i);
  assert.match(page, /does not guarantee a positive review/i);
  assert.match(page, /near affiliate calls to action/i);
});
