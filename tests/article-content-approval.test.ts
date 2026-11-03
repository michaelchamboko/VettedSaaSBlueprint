import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { advanceImport, createArticleImport, ensureImportContentApproval, loadImport, recordImportFailure, resumeImport } from "../src/lib/article-import/engine";
import { approveFixture, presentFixture } from "./fixtures/article-content-approval";

async function setup() {
  const root = await mkdtemp(path.join(os.tmpdir(), "content-approval-"));
  await writeFile(path.join(root, "approved-urls.md"), "- https://start.switcherstudio.com/anme6fqvgdx9\n");
  await writeFile(path.join(root, "article.md"), "---\ntitle: Example\naffiliate_name: Example\naffiliate_url: https://start.switcherstudio.com/anme6fqvgdx9\n---\nAn article with enough text to qualify as useful source content for the import pipeline and its approval tests.");
  const initial = await createArticleImport(root, "article.md");
  // Arrange a synthetic stage boundary; advancing real work requires producer evidence.
  return { root, record: { ...initial, stage: "REFINING" as const } };
}

test("imports cannot enter presentation without the mandatory evidence chain", async () => {
  const { root, record } = await setup();
  try {
    await assert.rejects(advanceImport(root, record, "No evidence"), /WORKFLOW_EVIDENCE_INVALID/);
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
      if (target === "formatQualityPath") {
        assert.equal((await advanceImport(root, validating, "Ready to release")).stage, "REFINING");
        assert.equal((await loadImport(root, record.importId)).contentApproval, undefined);
      } else {
        await assert.rejects(advanceImport(root, validating, "Ready to release"), /WORKFLOW_EVIDENCE_INVALID/);
        assert.equal((await loadImport(root, record.importId)).stage, "VALIDATING");
      }
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

test("invalid legacy receipts remain diagnostic and reads never silently migrate them", async () => {
  const { root, record } = await setup();
  try {
    const approved = await approveFixture(root, record);
    const presented = await presentFixture(root, await advanceImport(root, approved, "Approved content"));
    const legacy = { ...presented, schemaVersion: "ExternalArticleImportV1", workflowVersion: undefined, requirementRevision: undefined, stage: "RELEASING", resumeStage: "RELEASING", presentation: { ...presented.presentation!, evidenceFiles: undefined },
      pendingRelease: { schemaVersion: "ImportPendingReleaseV1", reviewedCommitSha: "a".repeat(40), branch: "codex/article-import/example", createdAt: new Date().toISOString() },
      release: { schemaVersion: "ImportReleaseV1", commitSha: "a".repeat(40), deploymentId: "legacy-deployment", canonicalUrl: "https://vettedsaasblueprint.online/imported-guide", verifiedAt: new Date().toISOString(), checks: { routeOk: true, contentOk: true, disclosureOk: true, exactCtaOk: true, desktopOk: true, mobileOk: true, robotsOk: true, sitemapOk: true, browserErrorsOk: true } },
    };
    const statePath = path.join(root, ".automation/article-imports", `${record.importId}.json`);
    await writeFile(statePath, JSON.stringify(legacy));
    const loaded = await loadImport(root, record.importId);
    assert.equal(loaded.presentation, undefined);
    assert.deepEqual(loaded.contentApproval, approved.contentApproval);
    assert.ok(loaded.legacyDiagnostics?.includes("INVALID_LEGACY_EVIDENCE:presentation"));
    await assert.rejects(resumeImport(root, loaded), /LEGACY_UPGRADE_REQUIRED/);
    assert.equal(await readFile(statePath, "utf8"), JSON.stringify(legacy));
    await writeFile(statePath, JSON.stringify({ ...legacy, presentation: { invalid: true } }));
    assert.equal((await loadImport(root, record.importId)).presentation, undefined);
  } finally { await rm(root, { recursive: true, force: true }); }
});
