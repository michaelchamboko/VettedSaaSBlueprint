import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  buildCodexBatchPreviewCatalogue,
  buildCodexBatchPreviewRegistryCatalogue,
  listCodexBatchPreviewRegistryBatchIds,
  listCodexBatchPreviewSlugs,
} from "@/lib/generated/codex-batch-previews";
import {
  assertCodexBatchPreviewRegistryMatchesFilesystem,
  loadCodexBatchPreviewCatalogue,
} from "@/lib/generated/codex-batch-preview-filesystem";
import type { LoadedCodexLandingBatch } from "@/lib/codex-batches/loader";
import type { PageBlueprint } from "@/lib/schemas/contracts";

const batchId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const pageId = "99999999-9999-4999-8999-999999999999";
const slug = "workflow-fit-review";
const affiliateUrl = "https://try.elevenlabs.io/izj2b165mcsj?ref=exact";

function fakeBlueprint(targetSlug = slug) {
  return {
    metadata: {
      url_slug: targetSlug,
      title_tag: "Workflow fit review",
      meta_description: "A decision brief for workflow fit.",
      robots: "noindex,nofollow",
      design_profile: "editorial_v2",
      motion_profile: "gsap_editorial",
    },
  } as PageBlueprint;
}

function fakeBatch(targetSlug = slug): LoadedCodexLandingBatch {
  const blueprint = fakeBlueprint(targetSlug);
  return {
    manifest: {
      batch_id: batchId,
      pages: [{ page_blueprint_id: pageId, slug: targetSlug }],
    },
    productPack: { affiliate: { original_url: affiliateUrl } },
    pages: [{ manifestPage: { page_blueprint_id: pageId, slug: targetSlug }, blueprint }],
  } as LoadedCodexLandingBatch;
}

test("maps validated batch drafts to production-blueprint previews with the exact affiliate URL", () => {
  const catalogue = buildCodexBatchPreviewCatalogue([fakeBatch()]);
  const preview = catalogue.get(slug);
  assert.ok(preview);
  assert.equal(preview.kind, "blueprint");
  assert.equal(preview.batch_id, batchId);
  assert.equal(preview.page_blueprint_id, pageId);
  assert.equal(preview.affiliate_url, affiliateUrl);
  assert.equal(preview.blueprint.metadata.motion_profile, "gsap_editorial");
});

test("rejects ambiguous duplicate preview slugs across validated batches", () => {
  const other = fakeBatch();
  (other.manifest as { batch_id: string }).batch_id = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  assert.throws(() => buildCodexBatchPreviewCatalogue([fakeBatch(), other]), /duplicate.*preview slug|ambiguous.*slug/i);
});

test("validates registry UUIDs and rejects duplicate preview slugs", () => {
  const preview = {
    kind: "blueprint" as const,
    batch_id: batchId,
    page_blueprint_id: pageId,
    slug,
    affiliate_url: affiliateUrl,
    blueprint: fakeBlueprint(),
  };
  assert.throws(
    () => buildCodexBatchPreviewRegistryCatalogue({ schema_version: 1, previews: [{ ...preview, batch_id: "not-a-uuid" }] }),
    /invalid preview entry/i,
  );
  assert.throws(
    () => buildCodexBatchPreviewRegistryCatalogue({ schema_version: 1, previews: [preview, { ...preview, page_blueprint_id: "88888888-8888-4888-8888-888888888888" }] }),
    /duplicate.*preview slug|ambiguous.*slug/i,
  );
});

test("agent release candidates are available for noindex preview without pretending to be committed batches", async () => {
  assert.deepEqual(await listCodexBatchPreviewSlugs(), [
    "elevenlabs-ai-voice-generator",
    "getresponse-marketing-automation",
    "how-can-agencies-consolidate-cross-channel-ppc-data-and-lead-scoring",
    "how-can-growing-brands-automate-on-brand-email-marketing-journeys",
    "how-can-you-organize-multiple-web-apps-into-dedicated-desktop-workspaces",
  ]);
  assert.deepEqual(listCodexBatchPreviewRegistryBatchIds(), []);
  assert.deepEqual(
    await loadCodexBatchPreviewCatalogue({ batchRoot: path.join(process.cwd(), ".stage2", "missing-codex-batches") }),
    new Map(),
  );
});

test("committed UUID batch directories match the static preview registry", async () => {
  await assert.doesNotReject(() => assertCodexBatchPreviewRegistryMatchesFilesystem());
});

test("route-facing Codex preview catalogue has no filesystem or cwd dependencies", () => {
  const cataloguePath = path.join(process.cwd(), "src", "lib", "generated", "codex-batch-previews.ts");
  const source = fs.readFileSync(cataloguePath, "utf8");
  assert.doesNotMatch(source, /node:fs|node:path|process\.cwd/);
  assert.match(source, /landing-page-batches\/registry\.json/);
  const routePath = path.join(process.cwd(), "src", "app", "landing-page-previews", "[slug]", "page.tsx");
  assert.doesNotMatch(fs.readFileSync(routePath, "utf8"), /codex-batch-preview-filesystem/);
});

test("preview route remains static and noindex while using the production renderer in preview mode", () => {
  const routePath = path.join(process.cwd(), "src", "app", "landing-page-previews", "[slug]", "page.tsx");
  const source = fs.readFileSync(routePath, "utf8");
  assert.match(source, /dynamic\s*=\s*["']force-static["']/);
  assert.match(source, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/);
  assert.match(source, /DirectReviewPage/);
  assert.match(source, /mode=["']preview["']/);
  assert.match(source, /affiliateUrlOverride=/);
  assert.match(source, /EditorialV2PreviewPage/);
});

test("preview mode uses the exact destination without tracking while retaining GSAP", () => {
  const componentRoot = path.join(process.cwd(), "src", "components", "landing");
  const direct = fs.readFileSync(path.join(componentRoot, "DirectReviewPage.tsx"), "utf8");
  const editorial = fs.readFileSync(path.join(componentRoot, "EditorialReviewPage.tsx"), "utf8");
  for (const source of [direct, editorial]) {
    assert.match(source, /affiliateUrlOverride/);
    assert.match(source, /LandingPageMotion/);
    assert.doesNotMatch(source, /\/r\/affiliate/);
  }
  assert.match(direct, /mode={mode}/);
  assert.match(direct, /affiliateUrlOverride={affiliateUrlOverride}/);
});
