import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { getLandingPageManifest, getPublishedLandingPage, listPublishedLandingPageParams, listPublishedLandingPageSlugs, loadPublishedLandingPageSummariesFromDirectory } from "../src/lib/generated/landing-pages";

test("verified agent releases are exposed as published slugs", () => {
  const slugs = listPublishedLandingPageSlugs();
  assert.deepEqual(slugs, [
    "how-can-agencies-consolidate-cross-channel-ppc-data-and-lead-scoring",
    "how-can-you-organize-multiple-web-apps-into-dedicated-desktop-workspaces",
    "how-can-growing-brands-automate-on-brand-email-marketing-journeys",
    "elevenlabs-ai-voice-generator",
    "moosend-email-marketing-automation",
  ]);
});

test("generated slugs param helper returns route params", () => {
  const params = listPublishedLandingPageParams();
  assert.deepEqual(params, [
    { slug: "how-can-agencies-consolidate-cross-channel-ppc-data-and-lead-scoring" },
    { slug: "how-can-you-organize-multiple-web-apps-into-dedicated-desktop-workspaces" },
    { slug: "how-can-growing-brands-automate-on-brand-email-marketing-journeys" },
    { slug: "elevenlabs-ai-voice-generator" },
    { slug: "moosend-email-marketing-automation" },
  ]);
});

test("published landing page can be retrieved and is schema-valid", () => {
  const blueprint = getPublishedLandingPage("elevenlabs-ai-voice-generator");
  assert.equal(blueprint?.metadata.url_slug, "elevenlabs-ai-voice-generator");
});

test("non-matching slug returns null", () => {
  const missing = getPublishedLandingPage("does-not-exist");
  assert.equal(missing, null);
});

test("invalid slug format is blocked", () => {
  const invalid = getPublishedLandingPage("../bad/slug");
  assert.equal(invalid, null);
  const manifest = getLandingPageManifest();
  assert.equal(manifest.length, 5);
  assert.equal(manifest[0]?.slug, "how-can-agencies-consolidate-cross-channel-ppc-data-and-lead-scoring");
});

test("missing generated manifest is a valid empty public catalogue", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "empty-landing-catalogue-"));
  try {
    assert.deepEqual(loadPublishedLandingPageSummariesFromDirectory(directory), []);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("manifest entries without audited publication provenance are rejected", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "invalid-landing-catalogue-"));
  try {
    await writeFile(path.join(directory, "index.json"), JSON.stringify({ pages: [{ slug: "draft", title: "Draft", artifact: "draft.json", path: "/landing-page-builders/draft", status: "published" }] }));
    assert.throws(() => loadPublishedLandingPageSummariesFromDirectory(directory), /publication_source|published_at|current_version_id|owner_publish_audit_id/i);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
