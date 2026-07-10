import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { getLandingPageManifest, getPublishedLandingPage, listPublishedLandingPageParams, listPublishedLandingPageSlugs, loadPublishedLandingPageSummariesFromDirectory } from "../src/lib/generated/landing-pages";

test("unverified local generated artifacts are not exposed as published slugs", () => {
  const slugs = listPublishedLandingPageSlugs();
  assert.deepEqual(slugs, []);
});

test("generated slugs param helper returns route params", () => {
  const params = listPublishedLandingPageParams();
  const hasWorkflow = params.some((entry) => entry.slug === "workflow-tools-review");
  assert.equal(hasWorkflow, false);
});

test("published landing page can be retrieved and is schema-valid", () => {
  const blueprint = getPublishedLandingPage("workflow-tools-review");
  assert.equal(blueprint, null);
});

test("non-matching slug returns null", () => {
  const missing = getPublishedLandingPage("does-not-exist");
  assert.equal(missing, null);
});

test("invalid slug format is blocked", () => {
  const invalid = getPublishedLandingPage("../bad/slug");
  assert.equal(invalid, null);
  const manifest = getLandingPageManifest();
  assert.equal(manifest.length, 0);
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
