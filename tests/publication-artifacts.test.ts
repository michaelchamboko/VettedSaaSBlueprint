import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";

import { getArtifactPrPlan, parseGitHubRemote } from "../hermes/worker";
import { writeLandingArtifactsToDirectory, type PublishedLandingArtifactsPayload, type WrittenLandingArtifactsResult } from "../src/lib/publication/landing-artifacts";

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

test("artifact PR plan stays disabled unless explicitly enabled", () => {
  const result: WrittenLandingArtifactsResult = {
    outputDirectory: path.join("repo", "src", "generated", "landing-pages"),
    manifestPath: path.join("repo", "src", "generated", "landing-pages", "index.json"),
    pageCount: 1,
    writtenAt: new Date().toISOString(),
  };

  const plan = getArtifactPrPlan(result, {}, path.resolve("repo"));

  assert.equal(plan.ready, false);
  assert.equal(plan.reason, "LANDING_ARTIFACT_CREATE_PR is not true");
});

test("artifact PR plan rejects outputs outside the repository", () => {
  const repoDir = path.resolve("repo");
  const result: WrittenLandingArtifactsResult = {
    outputDirectory: path.resolve("outside-artifacts"),
    manifestPath: path.resolve("outside-artifacts", "index.json"),
    pageCount: 1,
    writtenAt: new Date().toISOString(),
  };

  const plan = getArtifactPrPlan(result, { LANDING_ARTIFACT_CREATE_PR: "true", LANDING_ARTIFACT_REPO_DIR: repoDir }, repoDir);

  assert.equal(plan.ready, false);
  assert.equal(plan.reason, "artifact output directory is outside repository");
});

test("artifact PR helper parses GitHub remotes without requiring gh", () => {
  assert.deepEqual(parseGitHubRemote("git@github.com:michaelchamboko/VettedSaaSBlueprint.git"), {
    owner: "michaelchamboko",
    repo: "VettedSaaSBlueprint",
  });
  assert.deepEqual(parseGitHubRemote("https://github.com/michaelchamboko/VettedSaaSBlueprint.git"), {
    owner: "michaelchamboko",
    repo: "VettedSaaSBlueprint",
  });
  assert.equal(parseGitHubRemote("https://example.com/michaelchamboko/VettedSaaSBlueprint.git"), null);
});
