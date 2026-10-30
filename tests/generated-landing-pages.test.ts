import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { getLandingPageManifest, getPublishedLandingPage, listPublishedLandingPageParams, listPublishedLandingPageSlugs, loadPublishedLandingPageSummariesFromDirectory } from "../src/lib/generated/landing-pages";

const moosendSlug = "moosend-email-marketing-automation";

async function withLandingPageFixture(
  run: (directory: string) => Promise<void>,
) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "landing-catalogue-"));
  try {
    await cp(path.resolve("src/generated/landing-pages"), directory, { recursive: true });
    await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function writeMoosendPageWithReceiptNewlines(
  directory: string,
  artifactNewline: "\n" | "\r\n",
  receiptNewline: "\n" | "\r\n",
) {
  const pagePath = path.join(directory, `${moosendSlug}.json`);
  const receiptPath = path.join(directory, "releases", moosendSlug, "release-receipt.json");
  const page = (await readFile(pagePath, "utf8")).replace(/\r\n/g, "\n");
  const receipt = JSON.parse(await readFile(receiptPath, "utf8"));
  const receiptBytes = page.replace(/\n/g, receiptNewline);
  receipt.artifacts.page.sha256 = createHash("sha256").update(receiptBytes).digest("hex");
  await writeFile(pagePath, page.replace(/\n/g, artifactNewline));
  await writeFile(receiptPath, JSON.stringify(receipt, null, 2));
}

test("verified agent releases are exposed as published slugs", () => {
  const slugs = listPublishedLandingPageSlugs();
  assert.deepEqual(slugs, [
    "how-can-content-creators-and-brands-stream-live-multi-camera-video",
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
    { slug: "how-can-content-creators-and-brands-stream-live-multi-camera-video" },
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
  assert.equal(manifest.length, 6);
  assert.equal(manifest[0]?.slug, "how-can-content-creators-and-brands-stream-live-multi-camera-video");
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

test("release fingerprints accept LF artifacts with CRLF receipts", async () => {
  await withLandingPageFixture(async (directory) => {
    await writeMoosendPageWithReceiptNewlines(directory, "\n", "\r\n");
    assert.equal(loadPublishedLandingPageSummariesFromDirectory(directory).length, 6);
  });
});

test("Moosend release fingerprints accept an LF-only checkout", async () => {
  await withLandingPageFixture(async (directory) => {
    const receiptPath = path.join(directory, "releases", moosendSlug, "release-receipt.json");
    const receipt = JSON.parse(await readFile(receiptPath, "utf8"));
    for (const reference of Object.values(receipt.artifacts) as Array<{ path: string }>) {
      const artifactPath = path.join(directory, reference.path);
      const artifact = (await readFile(artifactPath, "utf8")).replace(/\r\n/g, "\n");
      await writeFile(artifactPath, artifact);
    }
    assert.equal(loadPublishedLandingPageSummariesFromDirectory(directory).length, 6);
  });
});

test("release fingerprints accept CRLF artifacts with LF receipts", async () => {
  await withLandingPageFixture(async (directory) => {
    await writeMoosendPageWithReceiptNewlines(directory, "\r\n", "\n");
    assert.equal(loadPublishedLandingPageSummariesFromDirectory(directory).length, 6);
  });
});

test("release fingerprints reject content mutations", async () => {
  await withLandingPageFixture(async (directory) => {
    await writeMoosendPageWithReceiptNewlines(directory, "\n", "\r\n");
    const pagePath = path.join(directory, `${moosendSlug}.json`);
    const page = JSON.parse(await readFile(pagePath, "utf8"));
    page.metadata.title_tag = page.metadata.title_tag.replace("Moosend", "Moosent");
    await writeFile(pagePath, JSON.stringify(page, null, 2));
    assert.throws(
      () => loadPublishedLandingPageSummariesFromDirectory(directory),
      /Release fingerprint mismatch for page/,
    );
  });
});
