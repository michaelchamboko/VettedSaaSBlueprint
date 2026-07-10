import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";

import { buildPublishedLandingArtifactsPayload, writeLandingArtifactsToDirectory, type PublishedLandingArtifactsPayload } from "../src/lib/publication/landing-artifacts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("publication artifact writer creates committed artifacts and manifest", async () => {
  const sampleBlueprint = JSON.parse(
    await readFile(path.join(__dirname, "..", "src", "generated", "landing-pages", "workflow-tools-review.json"), "utf8"),
  );
  const outputDirectory = await mkdtemp(path.join(os.tmpdir(), "landing-artifacts-"));
  try {
    const payload: PublishedLandingArtifactsPayload = {
      generated_at: new Date().toISOString(),
      index: {
        pages: [
          {
            slug: sampleBlueprint.metadata.url_slug,
            title: "Workflow Tools Review",
            artifact: "workflow-tools-review.json",
            path: "/landing-page-builders/workflow-tools-review",
            status: "published",
            publication_source: "oracle_dynamic_pages",
            published_at: "2026-06-25T00:00:00.000Z",
            current_version_id: "22222222-2222-2222-2222-222222222222",
            owner_publish_audit_id: "33333333-3333-3333-3333-333333333333",
          },
        ],
      },
      artifacts: {
        [sampleBlueprint.metadata.url_slug]: sampleBlueprint,
      },
    };

    const result = await writeLandingArtifactsToDirectory(payload, outputDirectory);

    assert.equal(result.pageCount, 1);
    assert.equal(result.outputDirectory, path.resolve(outputDirectory));
    assert.ok(result.writtenAt.length > 0);

    const manifestPath = path.join(outputDirectory, "index.json");
    const manifestRaw = await readFile(manifestPath, "utf8");
    const manifest = JSON.parse(manifestRaw);
    assert.equal(manifest.pages.length, 1);
    assert.equal(manifest.pages[0].slug, sampleBlueprint.metadata.url_slug);
    assert.equal(manifestPath, result.manifestPath);

    const artifactPath = path.join(outputDirectory, "workflow-tools-review.json");
    const artifactRaw = await readFile(artifactPath, "utf8");
    const artifact = JSON.parse(artifactRaw);
    assert.equal(artifact.metadata.url_slug, sampleBlueprint.metadata.url_slug);
  } finally {
    await rm(outputDirectory, { recursive: true, force: true });
  }
});

test("publication artifact payload builder accepts Oracle-style rows", async () => {
  const sampleBlueprint = JSON.parse(
    await readFile(path.join(__dirname, "..", "src", "generated", "landing-pages", "workflow-tools-review.json"), "utf8"),
  );

  const payload = buildPublishedLandingArtifactsPayload(
    [
      {
        PATH: "/landing-page-builders/workflow-tools-review",
        BLUEPRINT_ID: "11111111-1111-1111-1111-111111111111",
        PUBLISHED_AT: "2026-06-25T00:00:00.000Z",
        CURRENT_VERSION_ID: "22222222-2222-2222-2222-222222222222",
        AUDIT_CURRENT_VERSION_ID: "22222222-2222-2222-2222-222222222222",
        OWNER_PUBLISH_AUDIT_ID: "33333333-3333-3333-3333-333333333333",
        STRUCTURAL_JSON: JSON.stringify(sampleBlueprint),
      },
    ],
    "2026-06-25T00:00:00.000Z",
  );

  assert.equal(payload.generated_at, "2026-06-25T00:00:00.000Z");
  assert.equal(payload.index.pages.length, 1);
  assert.equal(payload.index.pages[0].slug, "workflow-tools-review");
  assert.equal(payload.index.pages[0].artifact, "workflow-tools-review.json");
  assert.equal(payload.index.pages[0].path, "/landing-page-builders/workflow-tools-review");
  assert.equal(payload.index.pages[0].publication_source, "oracle_dynamic_pages");
  assert.equal(payload.index.pages[0].current_version_id, "22222222-2222-2222-2222-222222222222");
  assert.deepEqual(payload.artifacts["workflow-tools-review"], sampleBlueprint);
});

test("publication artifact payload excludes stale and unrelated audits", async () => {
  const sampleBlueprint = JSON.parse(
    await readFile(path.join(__dirname, "..", "src", "generated", "landing-pages", "workflow-tools-review.json"), "utf8"),
  );
  const baseRow = {
    PATH: "/landing-page-builders/workflow-tools-review",
    PUBLISHED_AT: "2026-06-25T00:00:00.000Z",
    CURRENT_VERSION_ID: "22222222-2222-2222-2222-222222222222",
    OWNER_PUBLISH_AUDIT_ID: "33333333-3333-3333-3333-333333333333",
    STRUCTURAL_JSON: JSON.stringify(sampleBlueprint),
  };

  assert.equal(buildPublishedLandingArtifactsPayload([{ ...baseRow, AUDIT_CURRENT_VERSION_ID: "older-version" }]).index.pages.length, 0);
  assert.equal(buildPublishedLandingArtifactsPayload([{ ...baseRow, AUDIT_CURRENT_VERSION_ID: null }]).index.pages.length, 0);
});
