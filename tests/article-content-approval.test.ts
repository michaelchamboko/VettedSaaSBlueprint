import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { advanceImport, createArticleImport, ensureImportContentApproval, ensureImportPresentation, loadImport, recordImportFailure, resumeImport } from "../src/lib/article-import/engine";
import { approveFixture, presentFixture, validPageDesignReceipt } from "./fixtures/article-content-approval";
import { recordArticlePresentation } from "../scripts/record-article-presentation";

async function setup() {
  const root = await mkdtemp(path.join(os.tmpdir(), "content-approval-"));
  await writeFile(path.join(root, "approved-urls.md"), "- https://start.switcherstudio.com/anme6fqvgdx9\n");
  await writeFile(path.join(root, "article.md"), "---\ntitle: Example\naffiliate_name: Example\naffiliate_url: https://start.switcherstudio.com/anme6fqvgdx9\n---\nAn article with enough text to qualify as useful source content for the import pipeline and its approval tests.");
  let record = await createArticleImport(root, "article.md");
  for (let i = 0; i < 3; i++) record = await advanceImport(root, record, "Stage completed.");
  return { root, record };
}

test("legacy imports cannot enter presentation without content approval", async () => {
  const { root, record } = await setup();
  try {
    assert.equal((await advanceImport(root, record, "No evidence")).stage, "REFINING");
    assert.equal((await resumeImport(root, { ...record, stage: "RELEASING" })).stage, "REFINING");
  } finally { await rm(root, { recursive: true, force: true }); }
});

for (const target of ["artifactPath", "editorialEvidencePath", "formatQualityPath"] as const) {
  test(`tampering with ${target} returns to refinement`, async () => {
    const { root, record } = await setup();
    try {
      const approved = await approveFixture(root, record);
      const validating = await advanceImport(root, approved, "Approved content");
      assert.equal(validating.stage, "VALIDATING");
      const file = path.join(root, approved.contentApproval![target]);
      const value = JSON.parse(await readFile(file, "utf8"));
      if (target === "artifactPath") value.hero.headline = "Changed wording that has not been reviewed";
      else if (target === "editorialEvidencePath") value.semanticNotes = "Changed review notes after content approval.";
      else value.gate = "another-gate";
      await writeFile(file, JSON.stringify(value));
      const checked = await advanceImport(root, validating, "Ready to release");
      assert.equal(checked.stage, "REFINING");
      assert.equal((await loadImport(root, record.importId)).contentApproval, undefined);
    } finally { await rm(root, { recursive: true, force: true }); }
  });
}

test("presentation repair preserves approval, but source identity and artifact substitution do not", async () => {
  const { root, record } = await setup();
  try {
    const approved = await approveFixture(root, record);
    const validating = await advanceImport(root, approved, "Approved content");
    const repair = await recordImportFailure(root, validating, { strategy: "validate", classification: "deterministic", message: "Mobile layout repair required." });
    const resumed = await resumeImport(root, repair);
    assert.equal(resumed.stage, "VALIDATING");
    assert.deepEqual(resumed.contentApproval, approved.contentApproval);
    assert.equal((await ensureImportContentApproval(root, { ...resumed, sourceFingerprint: "a".repeat(64) })).stage, "REFINING");
    await writeFile(path.join(root, "replacement.json"), await readFile(path.join(root, approved.contentApproval!.artifactPath)));
    assert.equal((await ensureImportContentApproval(root, resumed, "replacement.json")).stage, "REFINING");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("legacy presentation loads as absent and migrates without losing content approval", async () => {
  const { root, record } = await setup();
  try {
    const approved = await approveFixture(root, record);
    const presented = await presentFixture(root, await advanceImport(root, approved, "Approved content"));
    const legacy = { ...presented, stage: "RELEASING", resumeStage: "RELEASING", presentation: { ...presented.presentation!, evidenceFiles: undefined },
      pendingRelease: { schemaVersion: "ImportPendingReleaseV1", reviewedCommitSha: "a".repeat(40), branch: "codex/article-import/example", createdAt: new Date().toISOString() },
      release: { schemaVersion: "ImportReleaseV1", commitSha: "a".repeat(40), deploymentId: "legacy-deployment", canonicalUrl: "https://vettedsaasblueprint.online/imported-guide", verifiedAt: new Date().toISOString(), checks: { routeOk: true, contentOk: true, disclosureOk: true, exactCtaOk: true, desktopOk: true, mobileOk: true, robotsOk: true, sitemapOk: true, browserErrorsOk: true } },
    };
    const statePath = path.join(root, ".automation/article-imports", `${record.importId}.json`);
    await writeFile(statePath, JSON.stringify(legacy));
    const loaded = await loadImport(root, record.importId);
    assert.equal(loaded.presentation, undefined);
    assert.deepEqual(loaded.contentApproval, approved.contentApproval);
    const validating = await ensureImportPresentation(root, loaded);
    assert.equal(validating.stage, "VALIDATING");
    assert.equal(validating.pendingRelease, undefined);
    assert.equal(validating.release, undefined);
    assert.equal(validating.resumeStage, undefined);
    await writeFile(statePath, JSON.stringify(legacy));
    const designReceiptPath = path.join(root, "build-pack/article-import/page-design.json");
    await writeFile(designReceiptPath, JSON.stringify(validPageDesignReceipt));
    const migrated = await recordArticlePresentation(root, record.importId, "build-pack/article-import/verifier.json", designReceiptPath);
    assert.equal(migrated.stage, "RELEASING");
    assert.equal((await loadImport(root, record.importId)).stage, "RELEASING");
    assert.equal(migrated.presentation?.evidenceFiles.length, 1);
    assert.equal(migrated.pendingRelease, undefined);
    assert.equal(migrated.release, undefined);
    assert.deepEqual(migrated.contentApproval, approved.contentApproval);
    await writeFile(statePath, JSON.stringify({ ...legacy, presentation: { invalid: true } }));
    assert.equal((await loadImport(root, record.importId)).presentation, undefined);
  } finally { await rm(root, { recursive: true, force: true }); }
});
