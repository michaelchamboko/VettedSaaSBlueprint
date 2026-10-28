import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { advanceImport, approveImportContent, createArticleImport, loadImport, recordImportPresentation, resumeImport } from "../src/lib/article-import/engine";
import { assessImportRelease, recordImportCodeReview, isAllowedReleasePath, validationCommandsForFormat, assertArtifactCommercialSafety, assertPublicationAuthorityBinding, publicationAuthorityPaths, type FullProductionChecks, type ReleaseOperations } from "../src/lib/article-import/release";
import { browserErrorChecksFor, browserErrorsOkFrom } from "../scripts/verify-decision-set-deployment";
import { createLocalReleaseOperations, type ReleaseCommandRunner } from "../src/lib/article-import/local-release-adapter";
import { importPresentationValidationSchema, type ExternalArticleImportV1 } from "../src/lib/article-import/contracts";
import { approveFixture, fullRewriteNotes, presentFixture, rewriteAllProse } from "./fixtures/article-content-approval";
import { importArtifactTarget, readImportArtifactTarget, validateImportArtifact } from "../src/lib/article-import/format-validation";
import { createImportPresentation, requireImportPresentationBinding, verifyImportPresentationEvidence } from "../src/lib/article-import/presentation";
import { createEditorialEvidence, fingerprintEditorialArtifact } from "../src/lib/editorial/refinement";
import { visibilityPageSchema } from "../src/lib/visibility-pages/contracts";

const checks: FullProductionChecks = { routeOk: true, contentOk: true, disclosureOk: true, exactCtaOk: true, desktopOk: true, mobileOk: true, robotsOk: true, sitemapOk: true, browserErrorsOk: true };
const releaseFiles = ["src/generated/landing-pages/example.json", "src/generated/landing-pages/index.json"];
const source = "---\ntitle: Imported guide\naffiliate_name: Switcher Studio\naffiliate_url: https://start.switcherstudio.com/anme6fqvgdx9\n---\n\nThis is a sufficiently long article body for the release coordinator test and its deterministic validation path.\n";

test("presentation validation fails closed without complete Impeccable evidence", () => {
  const base = { schemaVersion: "ImportPresentationValidationV1", format: "blog", artifactFingerprint: "a".repeat(64), renderedRoutes: ["/blog/example"], checks: { desktop: true, mobile: true, accessibility: true, technicalSeo: true, overflow: true, runtimeErrors: true }, evidencePaths: ["build-pack/evidence.json"], notes: "Candidate proof." };
  assert.throws(() => importPresentationValidationSchema.parse(base));
  assert.throws(() => importPresentationValidationSchema.parse({ ...base, pageDesign: { scope: "new_or_materially_changed_public_page", authority: { mode: "reused" }, impeccable: { context: true, shape: true, critique: true, audit: true, detect: true, polish: false }, specialists: { emilDesignEngineering: "not_applicable", mobileNative: "not_applicable", appleDesign: "not_applicable", pickUiLibrary: "not_applicable", askSonner: "not_applicable" }, notes: "Incomplete proof." } }));
});

async function releasingRecord(root: string): Promise<ExternalArticleImportV1> {
  await writeFile(path.join(root, "approved-urls.md"), "- https://start.switcherstudio.com/anme6fqvgdx9\n");
  await writeFile(path.join(root, "article.md"), source);
  await mkdir(path.join(root, "src/generated/landing-pages/releases/example"), { recursive: true });
  await writeFile(path.join(root, "src/generated/landing-pages/index.json"), JSON.stringify({ pages: [{ slug: "example", artifact: "example.json", release_receipt: "releases/example/release-receipt.json" }] }));
  let record = await createArticleImport(root, "article.md");
  for (let i = 0; i < 5; i += 1) {
    if (record.stage === "REFINING") record = await approveFixture(root, record);
    if (record.stage === "VALIDATING") record = await presentFixture(root, record);
    record = await advanceImport(root, record, "stage complete");
  }
  // The receipt binds the approved artefact fingerprint (LF-normalised, matching the loader).
  const artifactBytes = await readFile(path.join(root, "src/generated/landing-pages/example.json"));
  await writeFile(path.join(root, "src/generated/landing-pages/releases/example/release-receipt.json"), JSON.stringify({ exact_affiliate_url: "https://start.switcherstudio.com/anme6fqvgdx9", artifacts: { page: { path: "example.json", sha256: createHash("sha256").update(artifactBytes.toString("utf8").replace(/\r\n/g, "\n")).digest("hex") } } }));
  return { ...record, pendingRelease: { schemaVersion: "ImportPendingReleaseV1", reviewedCommitSha: "c".repeat(40), branch: "codex/article-import/example", pullRequestUrl: "https://github.com/example/repository/pull/1", createdAt: new Date().toISOString(), codeReview: { schemaVersion: "ImportCodeReviewV1", reviewer: "codex", independent: true, passed: true, reviewedCommitSha: "c".repeat(40), pullRequestUrl: "https://github.com/example/repository/pull/1", evidenceUrl: "https://github.com/example/repository/pull/1#issuecomment-review", reviewedAt: new Date().toISOString() } } };
}

function operations(overrides: Partial<ReleaseOperations> = {}): ReleaseOperations {
  return {
    preflight: async () => ({ ok: true, reasons: [] }),
    inspectGit: async () => ({ clean: true, changedFiles: releaseFiles, headSha: "a".repeat(40), originMainSha: "a".repeat(40), fastForwardable: true }),
    refreshMain: async () => ({ clean: true, changedFiles: releaseFiles, headSha: "a".repeat(40), originMainSha: "a".repeat(40), fastForwardable: true }),
    runValidation: async () => ({ ok: true, summary: "all validation commands passed" }),
    capturePreviousDeployment: async () => ({ deploymentId: "dpl-previous", commitSha: "b".repeat(40), verified: true }),
    commit: async () => "c".repeat(40),
    preparePullRequest: async (reviewedCommitSha) => ({ reviewedCommitSha, url: "https://github.com/example/repository/pull/1", branch: "codex/article-import/example" }),
    inspectPullRequest: async () => ({ merged: true, headRefOid: "c".repeat(40), mergeCommitSha: "c".repeat(40) }),
    checkoutMergedCommit: async () => {},
    verifyCodeReview: async () => {},
    mergePullRequest: async () => ({ mergeCommitSha: "d".repeat(40) }),
    deploy: async (commitSha) => ({ deploymentId: "dpl-new", canonicalUrl: "https://vettedsaasblueprint.online/imported-guide", commitSha }),
    verifyProduction: async () => checks,
    rollback: async () => ({ ok: true, summary: "restored" }),
    verifyRollback: async () => true,
    ...overrides,
  };
}

async function repoBlogPost(): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(path.join(process.cwd(), "src/generated/blog-posts/posts.json"), "utf8"))[0];
}

async function approveBlogFixture(root: string, record: ExternalArticleImportV1, post: Record<string, unknown>, artifactPath: string) {
  const editorialEvidencePath = "build-pack/editorial/example-blog.json";
  const formatQualityPath = "build-pack/article-import/quality-blog.json";
  const rewritten = rewriteAllProse("blog", post);
  const evidence = createEditorialEvidence("blog", post, rewritten, fullRewriteNotes,
    { before: "score 4/5 needs a cleanse", after: "score 5/5 CLEAN" });
  for (const [file, value] of [[artifactPath, rewritten], [editorialEvidencePath, evidence], [formatQualityPath, { format: "blog", artifactFingerprint: fingerprintEditorialArtifact(rewritten), passed: true, gate: "blog:audit-post" }]] as const) {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await writeFile(path.join(root, file), JSON.stringify(value));
  }
  return approveImportContent(root, record, { artifactPath, editorialEvidencePath, formatQualityPath });
}

async function presentBlogFixture(root: string, record: ExternalArticleImportV1, post: Record<string, unknown>) {
  if (!record.contentApproval) throw new Error("Fixture content approval is required.");
  const evidencePath = "build-pack/article-import/verifier-blog.json";
  const target = importArtifactTarget("blog", post);
  await mkdir(path.dirname(path.join(root, evidencePath)), { recursive: true });
  await writeFile(path.join(root, evidencePath), JSON.stringify({ schemaVersion: "ImportVerifierEvidenceV1", target, result: { verificationMode: "candidate", origin: "http://127.0.0.1:3000", canonicalOrigin: "https://vettedsaasblueprint.online", ok: true, verifiedRoutes: target.renderedRoutes, viewportChecks: target.renderedRoutes.length * 2 } }));
  return recordImportPresentation(root, record, {
    validationGate: "fixture:rendered-layout",
    validationReceipt: {
      schemaVersion: "ImportPresentationValidationV1",
      format: record.format,
      artifactFingerprint: record.contentApproval.artifactFingerprint,
      renderedRoutes: target.renderedRoutes,
      checks: { desktop: true, mobile: true, accessibility: true, technicalSeo: true, overflow: true, runtimeErrors: true },
      pageDesign: { scope: "new_or_materially_changed_public_page", authority: { mode: "reused" }, impeccable: { context: true, shape: true, critique: true, audit: true, detect: true, polish: true }, specialists: { emilDesignEngineering: "not_applicable", mobileNative: "not_applicable", appleDesign: "not_applicable", pickUiLibrary: "not_applicable", askSonner: "not_applicable" }, notes: "The fixture models a changed page using the established design authority." },
      evidencePaths: [evidencePath],
      notes: "Mocked browser evidence for importer state tests.",
    },
  });
}

async function blogReleasingRecord(root: string): Promise<{ record: ExternalArticleImportV1; post: Record<string, unknown>; artifactPath: string; changedFiles: string[] }> {
  let post = await repoBlogPost();
  const slug = String(post.slug);
  const artifactPath = `src/generated/blog-posts/${slug}.json`;
  const changedFiles = [artifactPath, "src/generated/blog-posts/posts.json"];
  await writeFile(path.join(root, "approved-urls.md"), "- https://start.switcherstudio.com/anme6fqvgdx9\n");
  await writeFile(path.join(root, "article.md"), "# Imported workflow guide\n\nThis is a sufficiently long neutral article body for the blog release coordinator test and its deterministic validation path.\n");
  await mkdir(path.join(root, "src/generated/blog-posts"), { recursive: true });
  await writeFile(path.join(root, "src/generated/blog-posts/posts.json"), JSON.stringify([post]));
  let record: ExternalArticleImportV1 = { ...(await createArticleImport(root, "article.md")), format: "blog" as const };
  for (let i = 0; i < 5; i += 1) {
    if (record.stage === "REFINING") {
      record = await approveBlogFixture(root, record, post, artifactPath);
      post = JSON.parse(await readFile(path.join(root, artifactPath), "utf8"));
      await writeFile(path.join(root, "src/generated/blog-posts/posts.json"), JSON.stringify([post]));
    }
    if (record.stage === "VALIDATING") record = await presentBlogFixture(root, record, post);
    record = await advanceImport(root, record, "stage complete");
  }
  record = { ...record, pendingRelease: { schemaVersion: "ImportPendingReleaseV1", reviewedCommitSha: "c".repeat(40), branch: "codex/article-import/example", pullRequestUrl: "https://github.com/example/repository/pull/1", createdAt: new Date().toISOString(), codeReview: { schemaVersion: "ImportCodeReviewV1", reviewer: "codex", independent: true, passed: true, reviewedCommitSha: "c".repeat(40), pullRequestUrl: "https://github.com/example/repository/pull/1", evidenceUrl: "https://github.com/example/repository/pull/1#issuecomment-review", reviewedAt: new Date().toISOString() } } };
  return { record, post, artifactPath, changedFiles };
}

test("dry-run rejects disallowed files without executing release operations", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-release-"));
  try {
    const record = await releasingRecord(root);
    let executed = false;
    const result = await assessImportRelease({ repositoryRoot: root, record, changedFiles: ["src/app/api/unsafe.ts"], operations: { ...operations(), preflight: async () => { executed = true; return { ok: true, reasons: [] }; } } });
    assert.equal(result.status, "DRY_RUN");
    assert.match(result.reasons[0], /DISALLOWED_RELEASE_PATHS/);
    assert.equal(executed, true);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("missing release credentials waits for the heartbeat", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-release-"));
  try {
    const record = await releasingRecord(root);
    const result = await assessImportRelease({ repositoryRoot: root, record, changedFiles: releaseFiles, execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example", operations: { ...operations(), preflight: async () => ({ ok: false, reasons: ["VERCEL_TOKEN_MISSING"] }) } });
    assert.equal(result.status, "WAITING_EXTERNAL");
    assert.deepEqual(result.reasons, ["VERCEL_TOKEN_MISSING"]);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("successful release records and verifies the full production receipt", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-release-"));
  try {
    const record = await releasingRecord(root);
    const result = await assessImportRelease({ repositoryRoot: root, record, changedFiles: releaseFiles, execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example", operations: operations() });
    assert.equal(result.status, "LIVE");
    assert.equal((await loadImport(root, record.importId)).stage, "LIVE");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("failed production verification rolls back and never reports LIVE", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-release-"));
  try {
    const record = await releasingRecord(root);
    let rolledBack = false;
    const result = await assessImportRelease({ repositoryRoot: root, record, changedFiles: releaseFiles, execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example", operations: operations({ verifyProduction: async () => ({ ...checks, contentOk: false }), rollback: async () => { rolledBack = true; return { ok: true, summary: "restored" }; } }) });
    assert.equal(result.status, "ROLLED_BACK");
    assert.equal(rolledBack, true);
    assert.equal((await loadImport(root, record.importId)).stage, "ROLLED_BACK");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("a retry keeps the original known-good deployment as its rollback target", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-release-"));
  try {
    const record = await releasingRecord(root);
    const rollbackTargets: string[] = [];
    let captureCount = 0;
    const releaseOperations = operations({
      capturePreviousDeployment: async () => ({ deploymentId: captureCount++ === 0 ? "dpl-known-good" : "dpl-failed-retry", commitSha: "b".repeat(40), verified: true }),
      verifyProduction: async () => ({ ...checks, contentOk: false }),
      rollback: async (deploymentId) => { rollbackTargets.push(deploymentId); return { ok: true, summary: "restored" }; },
    });
    const first = await assessImportRelease({ repositoryRoot: root, record, changedFiles: releaseFiles, execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example", operations: releaseOperations });
    assert.equal(first.status, "ROLLED_BACK");
    const retryRecord = await loadImport(root, record.importId);
    const second = await assessImportRelease({ repositoryRoot: root, record: retryRecord, changedFiles: releaseFiles, execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example", operations: releaseOperations });
    assert.equal(second.status, "ROLLED_BACK");
    assert.deepEqual(rollbackTargets, ["dpl-known-good", "dpl-known-good"]);
    assert.equal(captureCount, 1);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("rollback verification failure remains fail-closed", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-release-"));
  try {
    const record = await releasingRecord(root);
    const result = await assessImportRelease({ repositoryRoot: root, record, changedFiles: releaseFiles, execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example", operations: operations({ verifyProduction: async () => ({ ...checks, mobileOk: false }), verifyRollback: async () => false }) });
    assert.equal(result.status, "WAITING_EXTERNAL");
    assert.match(result.reasons[0], /ROLLBACK_VERIFICATION_FAILED/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("moving main waits for refresh instead of pushing a stale candidate", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-release-"));
  try {
    const record = { ...await releasingRecord(root), pendingRelease: undefined };
    let committed = false;
    const result = await assessImportRelease({ repositoryRoot: root, record, changedFiles: releaseFiles, execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example", operations: operations({
      refreshMain: async () => ({ clean: true, changedFiles: releaseFiles, headSha: "b".repeat(40), originMainSha: "b".repeat(40), fastForwardable: true }),
      commit: async () => { committed = true; return "c".repeat(40); },
    }) });
    assert.equal(result.status, "WAITING_EXTERNAL");
    assert.deepEqual(result.reasons, ["MAIN_MOVED"]);
    assert.equal(committed, false);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("kill switch is an intentional hard stop", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-release-"));
  try {
    const record = await releasingRecord(root);
    let preflighted = false;
    const result = await assessImportRelease({ repositoryRoot: root, record, changedFiles: releaseFiles, execute: true, killSwitchEnabled: true, operations: operations({ preflight: async () => { preflighted = true; return { ok: true, reasons: [] }; } }) });
    assert.equal(result.status, "WAITING_EXTERNAL");
    assert.deepEqual(result.reasons, ["AUTOMATION_KILL_SWITCH_ENABLED"]);
    assert.equal(preflighted, false);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("failed rollback stays rolled back when the rollback adapter throws", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-release-"));
  try {
    const record = await releasingRecord(root);
    const result = await assessImportRelease({ repositoryRoot: root, record, changedFiles: releaseFiles, execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example", operations: operations({
      verifyProduction: async () => ({ ...checks, routeOk: false }),
      rollback: async () => { throw new Error("ROLLBACK_UNAVAILABLE"); },
    }) });
    assert.equal(result.status, "WAITING_EXTERNAL");
    assert.deepEqual(result.reasons, ["ROLLBACK_VERIFICATION_FAILED"]);
    assert.equal((await loadImport(root, record.importId)).stage, "WAITING_EXTERNAL");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("deployment commit mismatch rolls back before returning", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-release-"));
  try {
    const record = await releasingRecord(root);
    let rollbackCount = 0;
    const result = await assessImportRelease({ repositoryRoot: root, record, changedFiles: releaseFiles, execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example", operations: operations({
      deploy: async () => ({ deploymentId: "dpl-wrong", canonicalUrl: "https://vettedsaasblueprint.online/imported-guide", commitSha: "d".repeat(40) }),
      rollback: async () => { rollbackCount += 1; return { ok: true, summary: "restored" }; },
    }) });
    assert.equal(result.status, "ROLLED_BACK");
    assert.equal(rollbackCount, 1);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("incomplete production checks roll back and never reach LIVE", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-release-"));
  try {
    const record = await releasingRecord(root);
    const result = await assessImportRelease({ repositoryRoot: root, record, changedFiles: releaseFiles, execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example", operations: operations({ verifyProduction: async () => ({ routeOk: true } as unknown as FullProductionChecks) }) });
    assert.equal(result.status, "ROLLED_BACK");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("receipt failure after deployment rolls back exactly once", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-release-"));
  try {
    const record = await releasingRecord(root);
    let rollbackCount = 0;
    const result = await assessImportRelease({ repositoryRoot: root, record, changedFiles: releaseFiles, execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example", operations: operations({
      verifyProduction: async () => checks,
      deploy: async (commitSha) => ({ deploymentId: "dpl-new", canonicalUrl: "not-a-url", commitSha }),
      rollback: async () => { rollbackCount += 1; return { ok: true, summary: "restored" }; },
    }) });
    assert.equal(result.status, "ROLLED_BACK");
    assert.equal(rollbackCount, 1);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("an unverified merge commit waits without deployment", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-release-"));
  try {
    const record = await releasingRecord(root);
    let deployed = false;
    const result = await assessImportRelease({ repositoryRoot: root, record, changedFiles: releaseFiles, execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example", operations: operations({
      checkoutMergedCommit: async () => { throw new Error("MERGE_NOT_ON_MAIN"); },
      deploy: async (commitSha) => { deployed = true; return { deploymentId: "dpl-new", canonicalUrl: "https://vettedsaasblueprint.online/imported-guide", commitSha }; },
    }) });
    assert.equal(result.status, "WAITING_EXTERNAL");
    assert.equal(deployed, false);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("unverified prior deployment waits before commit", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-release-"));
  try {
    const record = await releasingRecord(root);
    const result = await assessImportRelease({ repositoryRoot: root, record, changedFiles: releaseFiles, execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example", operations: operations({ capturePreviousDeployment: async () => ({ deploymentId: "dpl-previous", commitSha: "b".repeat(40), verified: false }) }) });
    assert.equal(result.status, "WAITING_EXTERNAL");
    assert.deepEqual(result.reasons, ["PREVIOUS_DEPLOYMENT_UNVERIFIED"]);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("approved URL edits are never automatically allowed", async () => {
  assert.equal(isAllowedReleasePath("approved-urls.md", "direct-review", true), false);
});

test("agent-review-required format fails closed without a format gate", async () => {
  assert.equal(validationCommandsForFormat("agent_review_required"), undefined);
});

test("direct-review binds slug, artifact path, and changed file exactly", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-release-"));
  try {
    const record = await releasingRecord(root);
    const base = { repositoryRoot: root, record, execute: true, operations: operations() };
    const mismatch = await assessImportRelease({ ...base, slug: "other", artifactPath: "src/generated/landing-pages/example.json", changedFiles: releaseFiles });
    assert.match(mismatch.reasons.join(" "), /DIRECT_REVIEW_ARTIFACT_MISMATCH/);
    const missing = await assessImportRelease({ ...base, slug: "example", artifactPath: "src/generated/landing-pages/example.json", changedFiles: ["src/generated/landing-pages/other.json"] });
    assert.match(missing.reasons.join(" "), /DIRECT_REVIEW_ARTIFACT_NOT_CHANGED/);
    const traversal = await assessImportRelease({ ...base, slug: "../example", artifactPath: "../src/generated/landing-pages/example.json", changedFiles: ["../src/generated/landing-pages/example.json"] });
    assert.match(traversal.reasons.join(" "), /DIRECT_REVIEW_ARTIFACT_MISMATCH/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("direct-review rejects a declared artifact absent from the inspected worktree", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-release-"));
  try {
    const record = { ...await releasingRecord(root), pendingRelease: undefined };
    const result = await assessImportRelease({
      repositoryRoot: root,
      record,
      execute: true,
      slug: "example",
      artifactPath: "src/generated/landing-pages/example.json",
      changedFiles: releaseFiles,
      operations: operations({
        inspectGit: async () => ({ clean: true, changedFiles: ["src/generated/landing-pages/other.json"], headSha: "a".repeat(40), originMainSha: "a".repeat(40), fastForwardable: true }),
      }),
    });
    assert.equal(result.status, "REPAIRING");
    assert.match(result.reasons.join(" "), /DECLARED_CHANGED_FILES_MISMATCH/);
    assert.match(result.reasons.join(" "), /DIRECT_REVIEW_ARTIFACT_NOT_IN_WORKTREE/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("direct-review validation uses the exact artifact basename after identity binding", () => {
  assert.deepEqual(validationCommandsForFormat("direct-review", "src/generated/landing-pages/example.json")?.[0], "npm run landing:quality:candidate -- --artifact example.json");
});

test("Switcher exact allowlist entry remains in the separately reviewed manifest", async () => {
  const manifest = await readFile(path.join(process.cwd(), "approved-urls.md"), "utf8");
  assert.match(manifest, /https:\/\/start\.switcherstudio\.com\/anme6fqvgdx9/);
  assert.equal(isAllowedReleasePath("approved-urls.md", "direct-review", true), false);
});

test("rolled back imports resume at their recorded productive stage", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-release-"));
  try {
    const record = await releasingRecord(root);
    const failed = { ...record, stage: "ROLLED_BACK" as const, resumeStage: "RELEASING" as const, nextAction: "retry" };
    const resumed = await resumeImport(root, failed);
    assert.equal(resumed.stage, "RELEASING");
    assert.match(resumed.stageReceipts.at(-1)?.message ?? "", /Resumed/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("local adapter reports conflicts and unrelated dirty files truthfully", async () => {
  const calls: string[] = [];
  const runner: ReleaseCommandRunner = async (command, args) => {
    calls.push(`${command} ${args.join(" ")}`);
    if (command === "git" && args[0] === "status") return { stdout: "UU src/app/page.tsx\n M src/generated/landing-pages/a.json\n", stderr: "" };
    if (command === "git" && args[0] === "rev-parse") return { stdout: "a".repeat(40), stderr: "" };
    if (command === "git" && args[0] === "merge-base") return { stdout: "", stderr: "" };
    return { stdout: "", stderr: "" };
  };
  const snapshot = await createLocalReleaseOperations(".", { runner, format: "direct-review", artifactPath: "src/generated/landing-pages/a.json", slug: "a" }).inspectGit();
  assert.equal(snapshot.clean, false);
  assert.deepEqual(snapshot.changedFiles, ["src/app/page.tsx", "src/generated/landing-pages/a.json"]);
  assert.ok(calls.some((call) => call.includes("status --porcelain")));
});

test("local adapter requires direct-review slug and artifact before execution", async () => {
  const runner: ReleaseCommandRunner = async () => ({ stdout: "", stderr: "" });
  const result = await createLocalReleaseOperations(".", { runner, format: "direct-review" }).preflight();
  assert.ok(result.reasons.includes("DIRECT_REVIEW_SLUG_MISSING"));
  assert.ok(result.reasons.includes("DIRECT_REVIEW_ARTIFACT_MISSING"));
});

test("local adapter accepts linked project and authenticated CLI without env credentials", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-release-linked-"));
  try {
    await mkdir(path.join(root, ".vercel"), { recursive: true });
    await writeFile(path.join(root, ".vercel", "project.json"), JSON.stringify({ projectId: "prj_linked" }));
    const runner: ReleaseCommandRunner = async (command, args) => {
      if (command === "vercel" && args[0] === "inspect") return { stdout: JSON.stringify({ id: "dpl_current", gitCommitSha: "a".repeat(40), target: "production", readyState: "READY" }), stderr: "" };
      if (command === "vercel" && args[0] === "whoami") return { stdout: "owner", stderr: "" };
      return { stdout: "", stderr: "" };
    };
    const result = await createLocalReleaseOperations(root, { runner, fetchJson: async () => ({ commitSha: "a".repeat(40), environment: "production" }), format: "direct-review", artifactPath: "src/generated/landing-pages/a.json", slug: "a" }).preflight();
    assert.deepEqual(result, { ok: true, reasons: [] });
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("local adapter resolves the current production deployment from the canonical origin", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-release-origin-"));
  try {
    const calls: string[][] = [];
    const runner: ReleaseCommandRunner = async (command, args) => {
      calls.push([command, ...args]);
      if (command === "vercel" && args[0] === "inspect") return { stdout: JSON.stringify({ id: "dpl_current", gitCommitSha: "b".repeat(40), target: "production", readyState: "READY" }), stderr: "" };
      return { stdout: "owner", stderr: "" };
    };
    const operations = createLocalReleaseOperations(root, { runner, fetchJson: async () => ({ commitSha: "b".repeat(40), environment: "production" }), format: "direct-review", artifactPath: "a.json", slug: "a", origin: "https://vettedsaasblueprint.online" });
    const previous = await operations.capturePreviousDeployment();
    assert.deepEqual(previous, { deploymentId: "dpl_current", commitSha: "b".repeat(40), verified: true });
    assert.deepEqual(calls.find((call) => call[0] === "vercel" && call[1] === "inspect"), ["vercel", "inspect", "https://vettedsaasblueprint.online", "--json"]);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("local adapter falls back to the deployment API commit when inspect omits gitCommitSha", async () => {
  const runner: ReleaseCommandRunner = async (command, args) => {
    if (command === "vercel" && args[0] === "inspect") return { stdout: JSON.stringify({ id: "dpl_current", target: "production", readyState: "READY" }), stderr: "" };
    return { stdout: "owner", stderr: "" };
  };
  const operations = createLocalReleaseOperations(".", { runner, fetchJson: async () => ({ commitSha: "d".repeat(40), environment: "production" }), format: "direct-review", artifactPath: "a.json", slug: "a" });
  assert.deepEqual(await operations.capturePreviousDeployment(), { deploymentId: "dpl_current", commitSha: "d".repeat(40), verified: true });
});

test("local adapter rejects disagreement between inspect and deployment API commit", async () => {
  const runner: ReleaseCommandRunner = async (command, args) => command === "vercel" && args[0] === "inspect"
    ? { stdout: JSON.stringify({ id: "dpl_current", gitCommitSha: "a".repeat(40), target: "production", readyState: "READY" }), stderr: "" }
    : { stdout: "owner", stderr: "" };
  const operations = createLocalReleaseOperations(".", { runner, fetchJson: async () => ({ commitSha: "b".repeat(40), environment: "production" }), format: "direct-review", artifactPath: "a.json", slug: "a" });
  await assert.rejects(() => operations.capturePreviousDeployment(), /DEPLOYMENT_COMMIT_METADATA_MISMATCHED/);
});

test("local adapter fails closed when deployment API is unavailable", async () => {
  const runner: ReleaseCommandRunner = async (command, args) => command === "vercel" && args[0] === "inspect"
    ? { stdout: JSON.stringify({ id: "dpl_current", target: "production", readyState: "READY" }), stderr: "" }
    : { stdout: "owner", stderr: "" };
  const operations = createLocalReleaseOperations(".", { runner, fetchJson: async () => { throw new Error("endpoint unavailable"); }, format: "direct-review", artifactPath: "a.json", slug: "a" });
  await assert.rejects(() => operations.capturePreviousDeployment(), /endpoint unavailable/);
});

test("local adapter rejects an unverified deployment identity before reading commit metadata", async () => {
  const runner: ReleaseCommandRunner = async (command, args) => {
    if (command === "vercel" && args[0] === "deploy") return { stdout: "https://example.vercel.app", stderr: "" };
    if (command === "vercel" && args[0] === "inspect") return { stdout: JSON.stringify({ id: "dpl_1" }), stderr: "" };
    return { stdout: "", stderr: "" };
  };
  const operations = createLocalReleaseOperations(".", { runner, format: "direct-review", artifactPath: "a.json", slug: "a" });
  await assert.rejects(() => operations.deploy("a".repeat(40)), /DEPLOYMENT_IDENTITY_UNVERIFIED/);
});

test("local adapter maps verifier evidence and rejects verifier failures", async () => {
  const artifactPath = "src/generated/landing-pages/elevenlabs-ai-voice-generator.json";
  const { target } = await readImportArtifactTarget(".", "direct-review", artifactPath);
  const snapshot = { httpOk: true, disclosureOk: true, allCtasExact: true, allRevealSectionsVisible: true, browserErrors: [] };
  const evidence = { target, verificationMode: "production", origin: "https://vettedsaasblueprint.online", canonicalOrigin: "https://vettedsaasblueprint.online", status: "pass", robots_ok: true, sitemap_ok: true, pages: [{ path: target.renderedRoutes[0], desktop: snapshot, mobile: snapshot }] };
  const runner: ReleaseCommandRunner = async () => ({ stdout: JSON.stringify(evidence), stderr: "" });
  const options = { runner, format: "direct-review" as const, artifactPath, slug: target.slug };
  const deployment = { deploymentId: "dpl", canonicalUrl: new URL(target.renderedRoutes[0], "https://vettedsaasblueprint.online").href, commitSha: "a".repeat(40) };
  assert.deepEqual(await createLocalReleaseOperations(".", options).verifyProduction(deployment), checks);
  const failingRunner: ReleaseCommandRunner = async () => ({ stdout: JSON.stringify({ ...evidence, status: "failed" }), stderr: "" });
  await assert.rejects(() => createLocalReleaseOperations(".", { ...options, runner: failingRunner }).verifyProduction(deployment));
});

test("local adapter verifies rollback through the canonical production origin", async () => {
  const runner: ReleaseCommandRunner = async (command, args) => {
    if (command === "vercel" && args[0] === "inspect" && args[1] === "https://vettedsaasblueprint.online") {
      return { stdout: JSON.stringify({ id: "dpl-known-good", gitCommitSha: "b".repeat(40), target: "production", readyState: "READY" }), stderr: "" };
    }
    return { stdout: "", stderr: "" };
  };
  const operations = createLocalReleaseOperations(".", { runner, fetchJson: async () => ({ commitSha: "b".repeat(40), environment: "production" }), format: "direct-review", artifactPath: "a.json", slug: "a", origin: "https://vettedsaasblueprint.online" });
  assert.equal(await operations.verifyRollback("dpl-known-good", "b".repeat(40)), true);
  assert.equal(await operations.verifyRollback("dpl-known-good", "c".repeat(40)), false);
});

test("local adapter rejects rollback when canonical origin still points to the failed deployment", async () => {
  const runner: ReleaseCommandRunner = async (command, args) => {
    if (command === "vercel" && args[0] === "inspect" && args[1] === "https://vettedsaasblueprint.online") {
      return { stdout: JSON.stringify({ id: "dpl-failed", gitCommitSha: "c".repeat(40), target: "production", readyState: "READY" }), stderr: "" };
    }
    return { stdout: "", stderr: "" };
  };
  const operations = createLocalReleaseOperations(".", { runner, fetchJson: async () => ({ commitSha: "c".repeat(40), environment: "production" }), format: "direct-review", artifactPath: "a.json", slug: "a", origin: "https://vettedsaasblueprint.online" });
  assert.equal(await operations.verifyRollback("dpl-known-good", "b".repeat(40)), false);
});

test("each content format invokes its own schema instead of accepting public-site configuration", () => {
  for (const format of ["direct-review", "blog", "visibility", "decision-set"] as const) {
    assert.throws(() => validateImportArtifact(format, { canonicalOrigin: "https://example.com" }));
    assert.ok(validationCommandsForFormat(format, "src/generated/example.json")?.some((command) => format === "direct-review" ? command.includes("landing:quality:candidate") : command.includes(`validate-article-artifact.ts ${format}`)));
  }
});

test("neutral production formats use their owner verifier without affiliate CTA evidence", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-format-targets-"));
  try { for (const [format, script] of [["blog", "scripts/verify-blog-deployment.ts"], ["visibility", "scripts/verify-visibility-deployment.ts"], ["decision-set", "scripts/verify-decision-set-deployment.ts"]] as const) {
    const artifact = await formatFixture(format);
    await writeFile(path.join(root, "example.json"), JSON.stringify(artifact));
    const target = importArtifactTarget(format, artifact);
    const evidence = format === "decision-set" ? { target, passed: true, browser_errors_ok: true, checks: [{ passed: true }], screenshots: target.renderedRoutes.flatMap((route) => [{ route, mode: "desktop: first-screen" }, { route, mode: "mobile-reduced-motion: first-screen" }]), robots_ok: true, sitemap_ok: true } : { target, ok: true, routes: target.renderedRoutes.length, verifiedRoutes: target.renderedRoutes, viewportChecks: target.renderedRoutes.length * 2 };
    const calls: readonly string[][] = [];
    const runner: ReleaseCommandRunner = async (_command, args) => { (calls as string[][]).push([...args]); return { stdout: JSON.stringify({ ...evidence, verificationMode: "production", origin: "https://vettedsaasblueprint.online", canonicalOrigin: "https://vettedsaasblueprint.online" }), stderr: "" }; };
    const adapter = createLocalReleaseOperations(root, { format, slug: target.slug, artifactPath: "example.json", runner });
    const deployment = { commitSha: "a".repeat(40), deploymentId: "dpl", canonicalUrl: new URL(target.renderedRoutes[0], "https://vettedsaasblueprint.online").href };
    assert.deepEqual(await adapter.verifyProduction(deployment), checks);
    assert.equal(calls[0][1], script);
    const failing = createLocalReleaseOperations(root, { format, slug: target.slug, artifactPath: "example.json", runner: async () => ({ stdout: "{}", stderr: "" }) });
    await assert.rejects(() => failing.verifyProduction(deployment), /VERIFIER_TARGET_MISMATCH/);
  } } finally { await rm(root, { recursive: true, force: true }); }
});

async function formatFixture(format: "direct-review" | "blog" | "visibility" | "decision-set"): Promise<unknown> {
  if (format === "direct-review") return JSON.parse(await readFile("src/generated/landing-pages/elevenlabs-ai-voice-generator.json", "utf8"));
  if (format === "blog") return JSON.parse(await readFile("src/generated/blog-posts/posts.json", "utf8"))[0];
  if (format === "decision-set") return JSON.parse(await readFile("src/content/decision-journeys/sets/governed-ai-client-work-preparation.json", "utf8"));
  return { schema_version: "VisibilityPageV1", id: "voice-guide", path: "/ai-voice-generators", kind: "category_hub", cluster_id: "ai_voice", title: "Voice generators", description: "Compare voice workflows.", modified_at: "2026-10-21T00:00:00Z", hero: { eyebrow: "Guide", headline: "Voice generators", summary: "Compare voice workflows." }, claim_ids: [], relevant_review_path: "/reviews/example", related_paths: ["/guides/how-to-evaluate-ai-voice-quality"], blocks: [{ type: "prose", paragraphs: ["Compare workflows."] }] };
}

test("all formats reject a caller slug or verifier route that differs from the approved artifact", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-identity-"));
  try {
    for (const format of ["direct-review", "blog", "visibility", "decision-set"] as const) {
      const artifact = await formatFixture(format);
      await writeFile(path.join(root, "artifact.json"), JSON.stringify(artifact));
      const target = importArtifactTarget(format, artifact);
      await assert.rejects(() => readImportArtifactTarget(root, format, "artifact.json", "different-page"), /ARTIFACT_SLUG_MISMATCH/);
      const runner: ReleaseCommandRunner = async () => ({ stdout: JSON.stringify({ target: { ...target, renderedRoutes: ["/different-page"] } }), stderr: "" });
      const adapter = createLocalReleaseOperations(root, { format, artifactPath: "artifact.json", slug: target.slug, runner });
      const deployment = { deploymentId: "dpl", commitSha: "a".repeat(40), canonicalUrl: new URL(target.renderedRoutes[0], "https://vettedsaasblueprint.online").href };
      await assert.rejects(() => adapter.verifyProduction({ ...deployment, canonicalUrl: "https://vettedsaasblueprint.online/different-page" }), /DEPLOYMENT_CANONICAL_MISMATCH/);
      await assert.rejects(() => adapter.verifyProduction(deployment), /VERIFIER_TARGET_MISMATCH/);
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("presentation requires existing owner receipt files and rejects file tampering", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-evidence-"));
  try {
    const record = await releasingRecord(root);
    const input = { validationGate: "fixture", validationReceipt: record.presentation!.validation };
    const validating = { ...record, stage: "VALIDATING" as const };
    await assert.rejects(() => createImportPresentation(root, validating, { ...input, validationReceipt: { ...input.validationReceipt, evidencePaths: ["missing.json"] } }), /ENOENT/);
    await assert.rejects(() => createImportPresentation(root, validating, { ...input, validationReceipt: { ...input.validationReceipt, evidencePaths: [path.join(process.cwd(), "package.json")] } }), /OUTSIDE_REPOSITORY/);
    const file = path.join(root, record.presentation!.evidenceFiles[0].path);
    const bytes = await readFile(file, "utf8");
    await writeFile(file, `${bytes}\n`);
    await assert.rejects(() => verifyImportPresentationEvidence(root, record), /PRESENTATION_EVIDENCE_CHANGED/);
    const changed = JSON.parse(bytes);
    changed.result.status = "failed";
    await writeFile(file, JSON.stringify(changed));
    await assert.rejects(() => createImportPresentation(root, validating, input));
    changed.result.status = "pass";
    changed.target.artifactFingerprint = "f".repeat(64);
    await writeFile(file, JSON.stringify(changed));
    await assert.rejects(() => createImportPresentation(root, validating, input), /VERIFIER_TARGET_MISMATCH/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("disallowed paths and caller artifact identity errors are deterministic repairs", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-deterministic-"));
  try {
    const record = await releasingRecord(root);
    let preflightCalls = 0;
    const ops = operations({ preflight: async () => { preflightCalls += 1; throw new Error("must not inspect infrastructure"); } });
    const result = await assessImportRelease({ repositoryRoot: root, record, changedFiles: ["src/app/page.tsx"], artifactPath: "src/generated/landing-pages/example.json", slug: "wrong", execute: true, operations: ops });
    assert.equal(result.status, "REPAIRING");
    assert.equal(preflightCalls, 0);
    const saved = await loadImport(root, record.importId);
    assert.equal(saved.strategyAttempts.release, 1);
    assert.equal(saved.strategyAttempts["transient:release"], undefined);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("closed unmerged pull requests are replaced rather than reused", async () => {
  const calls: string[][] = [];
  const runner: ReleaseCommandRunner = async (command, args) => {
    calls.push([command, ...args]);
    if (command === "git" && args[0] === "rev-parse") return { stdout: "c".repeat(40), stderr: "" };
    if (command === "gh" && args[1] === "list") return { stdout: JSON.stringify([{ url: "https://github.com/example/repository/pull/1", headRefOid: "c".repeat(40), state: "CLOSED" }]), stderr: "" };
    if (command === "gh" && args[1] === "create") return { stdout: "https://github.com/example/repository/pull/2", stderr: "" };
    return { stdout: "", stderr: "" };
  };
  const result = await createLocalReleaseOperations(".", { runner, format: "blog", importId: "article-example" }).preparePullRequest("c".repeat(40));
  assert.equal(result.url, "https://github.com/example/repository/pull/2");
  assert.equal(calls.filter((call) => call[0] === "gh" && call[2] === "create").length, 1);
});

test("commit stages only declared paths and rejects unrelated staged files", async () => {
  const declared = ["src/generated/landing-pages/example.json"];
  const calls: string[][] = [];
  let added = false;
  const runner: ReleaseCommandRunner = async (command, args) => {
    calls.push([command, ...args]);
    if (args[0] === "add") added = true;
    return { stdout: args[0] === "diff" ? added ? declared.join("\n") : "" : "a".repeat(40), stderr: "" };
  };
  await createLocalReleaseOperations(".", { format: "direct-review", runner }).commit("publish article", declared);
  assert.deepEqual(calls.find((call) => call[1] === "add"), ["git", "add", "--", ...declared]);
  const unsafe = createLocalReleaseOperations(".", { format: "direct-review", runner: async () => ({ stdout: "src/app/page.tsx", stderr: "" }) });
  await assert.rejects(() => unsafe.commit("publish article", declared), /UNDECLARED_STAGED_FILES/);
});

test("external preflight and Git exceptions persist WAITING_EXTERNAL", async () => {
  for (const operation of ["preflight", "inspectGit", "refreshMain", "capturePreviousDeployment"] as const) {
    const root = await mkdtemp(path.join(os.tmpdir(), "article-release-external-"));
    try {
      const record = await releasingRecord(root);
      const result = await assessImportRelease({ repositoryRoot: root, record, changedFiles: releaseFiles, execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example", operations: operations({ [operation]: async () => { throw new Error("NETWORK_UNAVAILABLE"); } }) });
      assert.equal(result.status, "WAITING_EXTERNAL");
      assert.equal((await loadImport(root, record.importId)).stage, "WAITING_EXTERNAL");
    } finally { await rm(root, { recursive: true, force: true }); }
  }
});

test("presentation binds approved content and the released canonical route", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-release-binding-"));
  try {
    const record = await releasingRecord(root);
    await assessImportRelease({ repositoryRoot: root, record, changedFiles: releaseFiles, execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example", operations: operations() });
    const live = await loadImport(root, record.importId);
    assert.equal(live.stage, "LIVE");
    assert.doesNotThrow(() => requireImportPresentationBinding(live));
    assert.throws(() => requireImportPresentationBinding({ ...live, presentation: undefined }));
    assert.throws(() => requireImportPresentationBinding({ ...live, presentation: { ...live.presentation!, artifactFingerprint: "f".repeat(64) } }), /PRESENTATION_CONTENT_MISMATCH/);
    assert.throws(() => requireImportPresentationBinding({ ...live, release: { ...live.release!, canonicalUrl: "https://example.com/wrong-route" } }), /PRESENTATION_RELEASE_MISMATCH/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("first release creates a PR and waits without deploying or consuming retries", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-release-pr-"));
  try {
    const record = { ...await releasingRecord(root), pendingRelease: undefined };
    let deployed = false;
    const result = await assessImportRelease({ repositoryRoot: root, record, changedFiles: releaseFiles, execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example", operations: operations({ preparePullRequest: async (reviewedCommitSha) => ({ reviewedCommitSha, url: "https://github.com/example/repository/pull/1", branch: "codex/article-import/" + record.importId }), deploy: async () => { deployed = true; throw new Error("must wait"); } }) });
    assert.equal(result.status, "WAITING_EXTERNAL");
    assert.equal(result.reasons[0], "CURRENT_HEAD_CODEX_REVIEW_REQUIRED");
    assert.equal(deployed, false);
    const waiting = await loadImport(root, record.importId);
    assert.equal(waiting.pendingRelease?.reviewedCommitSha, "c".repeat(40));
    assert.deepEqual(waiting.strategyAttempts, record.strategyAttempts);
    assert.deepEqual(waiting.presentation, record.presentation);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("PR creation failure resumes from the prepared commit without recommitting", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-release-prepared-"));
  try {
    const record = { ...await releasingRecord(root), pendingRelease: undefined };
    let commits = 0;
    const base = { repositoryRoot: root, changedFiles: releaseFiles, execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example" };
    const interrupted = await assessImportRelease({ ...base, record, operations: operations({
      commit: async () => { commits += 1; return "c".repeat(40); },
      preparePullRequest: async () => { throw new Error("network interrupted"); },
    }) });
    assert.equal(interrupted.status, "WAITING_EXTERNAL");
    const saved = await loadImport(root, record.importId);
    assert.equal(saved.pendingRelease?.reviewedCommitSha, "c".repeat(40));
    assert.equal(saved.pendingRelease?.pullRequestUrl, undefined);

    const resumed = await resumeImport(root, saved);
    const waiting = await assessImportRelease({ ...base, record: resumed, operations: operations({
      inspectGit: async () => ({ clean: true, changedFiles: [], headSha: "c".repeat(40), originMainSha: "a".repeat(40), fastForwardable: true }),
      refreshMain: async () => ({ clean: true, changedFiles: [], headSha: "c".repeat(40), originMainSha: "a".repeat(40), fastForwardable: true }),
      commit: async () => { throw new Error("must not recommit"); },
      preparePullRequest: async (reviewedCommitSha) => ({ reviewedCommitSha, url: "https://github.com/example/repository/pull/2", branch: "codex/article-import/" + record.importId }),
      inspectPullRequest: async () => ({ merged: false, headRefOid: "c".repeat(40) }),
    }) });
    assert.equal(waiting.reasons[0], "CURRENT_HEAD_CODEX_REVIEW_REQUIRED");
    assert.equal(commits, 1);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("a clean current-head review auto-merges without recommitting and deploys the merge commit", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-release-merge-"));
  try {
    const record = await releasingRecord(root);
    const base = { repositoryRoot: root, record, changedFiles: releaseFiles, execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example" };
    let deployedSha = "";
    let merged = false;
    const live = await assessImportRelease({ ...base, operations: operations({
      inspectPullRequest: async () => ({ merged: false, headRefOid: "c".repeat(40) }),
      commit: async () => { throw new Error("must not recommit"); },
      mergePullRequest: async (_url, reviewedCommitSha) => { assert.equal(reviewedCommitSha, "c".repeat(40)); merged = true; return { mergeCommitSha: "d".repeat(40) }; },
      deploy: async (commitSha) => { deployedSha = commitSha; return { deploymentId: "dpl-merged", commitSha, canonicalUrl: "https://vettedsaasblueprint.online/imported-guide" }; },
    }) });
    assert.equal(live.status, "LIVE");
    assert.equal(merged, true);
    assert.equal(deployedSha, "d".repeat(40));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("merged release validates both before merge and after checkout of the merge commit", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-release-merge-validation-"));
  try {
    const record = await releasingRecord(root);
    let validations = 0;
    const result = await assessImportRelease({ repositoryRoot: root, record, changedFiles: releaseFiles, execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example", operations: operations({ runValidation: async () => { validations += 1; return { ok: true, summary: "passed" }; } }) });
    assert.equal(result.status, "LIVE");
    assert.equal(validations, 2);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("release requires a clean current-head review before automatic merge", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-code-review-"));
  try {
    const prepared = await releasingRecord(root);
    const record = { ...prepared, pendingRelease: { ...prepared.pendingRelease!, codeReview: undefined } };
    const receipt = prepared.pendingRelease!.codeReview!;
    await assert.rejects(() => recordImportCodeReview(root, record, { ...receipt, pullRequestUrl: "https://github.com/example/repository/pull/2" }, operations()), /BINDING_MISMATCH/);
    await assert.rejects(() => recordImportCodeReview(root, record, receipt, operations({ inspectPullRequest: async () => ({ merged: false, headRefOid: "e".repeat(40) }) })), /HEAD_CHANGED/);
    const reviewed = await recordImportCodeReview(root, record, receipt, operations());
    assert.deepEqual((await loadImport(root, record.importId)).pendingRelease?.codeReview, receipt);
    let merged = false;
    const waiting = await assessImportRelease({ repositoryRoot: root, record, changedFiles: releaseFiles, execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example", operations: operations({
      inspectPullRequest: async () => ({ merged: false, headRefOid: "c".repeat(40) }),
      mergePullRequest: async () => { merged = true; return { mergeCommitSha: "d".repeat(40) }; },
    }) });
    assert.equal(waiting.reasons[0], "CURRENT_HEAD_CODEX_REVIEW_REQUIRED");
    assert.equal(merged, false);
    const base = { repositoryRoot: root, record: reviewed, changedFiles: releaseFiles, execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example" };
    const live = await assessImportRelease({ ...base, operations: operations({ inspectPullRequest: async () => ({ merged: false, headRefOid: "c".repeat(40) }) }) });
    assert.equal(live.status, "LIVE");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("code review receipts require the exact live Codex comment and clean current-head state", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-review-evidence-"));
  try {
    const record = await releasingRecord(root);
    const receipt = { ...record.pendingRelease!.codeReview!, evidenceUrl: "https://github.com/example/repository/pull/1#issuecomment-123" };
    const clean = { commit_sha: receipt.reviewedCommitSha, status: "completed", has_any_findings: false, has_unresolved_findings: false };
    const body = (review: Record<string, unknown>) => "<!-- codex-review-state:v1 " + JSON.stringify({ code_review: review }) + " -->";
    const comment = { html_url: receipt.evidenceUrl, issue_url: "https://api.github.com/repos/example/repository/issues/1", user: { login: "chatgpt-codex-connector[bot]" }, body: body(clean) };
    let liveComment = comment;
    const runner: ReleaseCommandRunner = async (command, args) => {
      assert.equal(command, "gh");
      assert.deepEqual(args, ["api", "repos/example/repository/issues/comments/123"]);
      return { stdout: JSON.stringify(liveComment), stderr: "" };
    };
    const ops = operations({ verifyCodeReview: createLocalReleaseOperations(root, { format: "blog", runner }).verifyCodeReview });
    for (const evidenceUrl of ["https://example.com/review", receipt.pullRequestUrl + "#issuecomment-fake", receipt.pullRequestUrl + "#pullrequestreview-123", "https://github.com/example/repository/pull/2#issuecomment-123"]) {
      await assert.rejects(() => recordImportCodeReview(root, record, { ...receipt, evidenceUrl }, ops), /EVIDENCE_URL_INVALID/);
    }
    for (const invalid of [
      { ...comment, html_url: receipt.pullRequestUrl + "#issuecomment-456" },
      { ...comment, issue_url: "https://api.github.com/repos/example/repository/issues/2" },
      { ...comment, user: { login: "owner" } },
      { ...comment, body: "@codex review" },
      { ...comment, body: "Review passed. No findings." },
      { ...comment, body: body({ ...clean, commit_sha: "d".repeat(40) }) },
      { ...comment, body: body({ ...clean, status: "in_progress" }) },
      { ...comment, body: body({ ...clean, has_any_findings: true }) },
      { ...comment, body: body({ ...clean, has_unresolved_findings: true }) },
      { ...comment, body: body({ ...clean, has_unresolved_findings: null }) },
    ]) {
      liveComment = invalid;
      await assert.rejects(() => recordImportCodeReview(root, record, receipt, ops), /CODE_REVIEW_/);
    }
    liveComment = comment;
    const reviewed = await recordImportCodeReview(root, record, receipt, ops);
    assert.deepEqual(reviewed.pendingRelease?.codeReview, receipt);
    assert.deepEqual((await loadImport(root, record.importId)).pendingRelease?.codeReview, receipt);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("changed PR head invalidates the stored review without deploying", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-code-review-stale-"));
  try {
    const record = await releasingRecord(root);
    const result = await assessImportRelease({ repositoryRoot: root, record, changedFiles: releaseFiles, execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example", operations: operations({
      inspectPullRequest: async () => ({ merged: true, headRefOid: "e".repeat(40), mergeCommitSha: "f".repeat(40) }),
      deploy: async () => { throw new Error("must not deploy"); },
    }) });
    assert.equal(result.reasons[0], "PULL_REQUEST_HEAD_CHANGED");
    assert.equal((await loadImport(root, record.importId)).pendingRelease?.codeReview, undefined);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("local PR adapter pushes only the import branch and reuses the exact reviewed PR", async () => {
  const calls: string[][] = [];
  const runner: ReleaseCommandRunner = async (command, args) => {
    calls.push([command, ...args]);
    if (command === "git" && args[0] === "rev-parse") return { stdout: "c".repeat(40), stderr: "" };
    if (command === "gh") return { stdout: JSON.stringify([{ url: "https://github.com/example/repository/pull/1", headRefOid: "c".repeat(40), state: "OPEN" }]), stderr: "" };
    return { stdout: "", stderr: "" };
  };
  const result = await createLocalReleaseOperations(".", { runner, format: "blog", importId: "article-example" }).preparePullRequest("c".repeat(40));
  assert.equal(result.branch, "codex/article-import/article-example");
  assert.deepEqual(calls.find((call) => call[1] === "push"), ["git", "push", "origin", "HEAD:refs/heads/codex/article-import/article-example"]);
  assert.equal(calls.some((call) => call.includes("create")), false);
});

test("deploy rejection after a production side effect restores and verifies the previous deployment", async () => {
  for (const restored of [true, false]) {
    const root = await mkdtemp(path.join(os.tmpdir(), "article-partial-deploy-"));
    try {
      const record = await releasingRecord(root);
      const calls: string[] = [];
      const result = await assessImportRelease({ repositoryRoot: root, record, changedFiles: releaseFiles, execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example", operations: operations({
        deploy: async () => { calls.push("production-changed"); throw new Error("DEPLOYMENT_COMMIT_ENDPOINT_UNVERIFIED"); },
        verifyProduction: async () => { throw new Error("must not verify a rejected deploy"); },
        rollback: async (id) => { calls.push(`rollback:${id}`); return { ok: true, summary: "rollback requested" }; },
        verifyRollback: async (id, commit) => { calls.push(`verify:${id}:${commit}`); return restored; },
      }) });
      assert.deepEqual(calls, ["production-changed", "rollback:dpl-previous", `verify:dpl-previous:${"b".repeat(40)}`]);
      assert.equal(result.status, restored ? "ROLLED_BACK" : "WAITING_EXTERNAL");
      assert.deepEqual(result.reasons, ["DEPLOYMENT_COMMIT_ENDPOINT_UNVERIFIED", ...(restored ? [] : ["ROLLBACK_VERIFICATION_FAILED"])]);
      const persisted = await loadImport(root, record.importId);
      assert.equal(persisted.stage, result.status);
      assert.equal(persisted.resumeStage, "RELEASING");
      assert.equal(persisted.release, undefined);
    } finally { await rm(root, { recursive: true, force: true }); }
  }
});
test("the local adapter merges only the exact reviewed head and verifies the merge commit", async () => {
  const head = "c".repeat(40);
  const merge = "d".repeat(40);
  const calls: Array<[string, readonly string[]]> = [];
  const runner: ReleaseCommandRunner = async (command, args) => {
    calls.push([command, args]);
    if (args[1] === "view") return { stdout: JSON.stringify({ state: "MERGED", headRefOid: head, mergeCommit: { oid: merge } }), stderr: "" };
    return { stdout: "", stderr: "" };
  };
  const result = await createLocalReleaseOperations(".", { format: "blog", runner }).mergePullRequest("https://github.com/repository-owner/VettedSaaSBlueprint/pull/28", head);
  assert.equal(result.mergeCommitSha, merge);
  assert.deepEqual(calls[0], ["gh", ["pr", "merge", "https://github.com/repository-owner/VettedSaaSBlueprint/pull/28", "--merge", "--match-head-commit", head]]);
});

test("owner inspection rejects malformed or non-GitHub PR URLs before execution", async () => {
  const runner: ReleaseCommandRunner = async () => { throw new Error("must not invoke GitHub"); };
  const operations = createLocalReleaseOperations(".", { format: "blog", runner });
  for (const url of ["https://example.com/owner/repo/pull/1", "https://github.com/owner/repo/pull/0", "https://github.com/owner/repo/pull/1?owner=other", "https://github.com/owner/repo/pull/1#fragment", "--repo=other/repo"]) {
    await assert.rejects(operations.inspectPullRequest(url), /PULL_REQUEST_URL_INVALID/);
  }
});

test("local adapter pins release verification to the canonical production origin", () => {
  const runner: ReleaseCommandRunner = async () => ({ stdout: "", stderr: "" });
  assert.throws(() => createLocalReleaseOperations(".", { format: "blog", runner, origin: "https://example.com" }), /ORIGIN_NOT_CANONICAL/);
  assert.throws(() => createLocalReleaseOperations(".", { format: "blog", runner, origin: "https://vettedsaasblueprint.online/evil" }), /ORIGIN_NOT_CANONICAL/);
  assert.throws(() => createLocalReleaseOperations(".", { format: "blog", runner, origin: "http://vettedsaasblueprint.online" }), /ORIGIN_NOT_CANONICAL/);
  assert.doesNotThrow(() => createLocalReleaseOperations(".", { format: "blog", runner }));
  assert.doesNotThrow(() => createLocalReleaseOperations(".", { format: "blog", runner, origin: "https://vettedsaasblueprint.online" }));
  assert.doesNotThrow(() => createLocalReleaseOperations(".", { format: "blog", runner, origin: "https://vettedsaasblueprint.online/" }));
});

test("publication authority files accompany every publishable format", () => {
  assert.deepEqual(publicationAuthorityPaths("direct-review"), ["src/generated/landing-pages/index.json"]);
  assert.deepEqual(publicationAuthorityPaths("blog"), ["src/generated/blog-posts/posts.json"]);
  assert.deepEqual(publicationAuthorityPaths("visibility"), ["src/generated/visibility-pages/index.json", "src/generated/visibility-pages/publications.json"]);
  assert.deepEqual(publicationAuthorityPaths("decision-set"), []);
  assert.deepEqual(publicationAuthorityPaths("agent_review_required"), []);
});

test("release execution fails when the publication authority file is missing from the declared changes", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-authority-declared-"));
  try {
    const record = await releasingRecord(root);
    const result = await assessImportRelease({ repositoryRoot: root, record, changedFiles: ["src/generated/landing-pages/example.json"], execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example", operations: operations() });
    assert.equal(result.status, "REPAIRING");
    assert.ok(result.reasons.includes("PUBLICATION_AUTHORITY_NOT_IN_RELEASE:src/generated/landing-pages/index.json"));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("release execution fails when the publication authority file is absent from the inspected worktree", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-authority-worktree-"));
  try {
    const record = { ...await releasingRecord(root), pendingRelease: undefined };
    const result = await assessImportRelease({ repositoryRoot: root, record, changedFiles: releaseFiles, execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example", operations: operations({
      inspectGit: async () => ({ clean: true, changedFiles: ["src/generated/landing-pages/example.json"], headSha: "a".repeat(40), originMainSha: "a".repeat(40), fastForwardable: true }),
    }) });
    assert.equal(result.status, "REPAIRING");
    assert.ok(result.reasons.includes("PUBLICATION_AUTHORITY_NOT_IN_WORKTREE:src/generated/landing-pages/index.json"));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("decision-set release is not blocked by an unrelated catalogue prerequisite", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-decision-set-authority-"));
  try {
    const base = await releasingRecord(root);
    // The sets artifact itself is the publication authority (listDecisionSets scans the
    // directory); catalogue.json only feeds the unsuffixed hub pages.
    const artifactPath = "src/content/decision-journeys/sets/example-set.json";
    const record: ExternalArticleImportV1 = {
      ...base,
      format: "decision-set",
      contentApproval: base.contentApproval ? { ...base.contentApproval, artifactPath } : base.contentApproval,
    };
    const result = await assessImportRelease({ repositoryRoot: root, record, changedFiles: [artifactPath], artifactPath, operations: operations() });
    assert.equal(result.status, "DRY_RUN");
    assert.ok(!result.reasons.some((reason) => reason.startsWith("PUBLICATION_AUTHORITY_NOT_IN_RELEASE")), result.reasons.join("; "));
    assert.ok(!result.reasons.includes("ARTIFACT_NOT_IN_RELEASE"), result.reasons.join("; "));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("commercial safety rejects decommercialized artifacts and unapproved affiliate destinations", () => {
  const record = (transformation: Record<string, unknown>) => ({ transformation } as unknown as ExternalArticleImportV1);
  const resolvedUrl = "https://start.switcherstudio.com/anme6fqvgdx9";
  assert.throws(() => assertArtifactCommercialSafety(record({ commercialMode: "decommercialized", resolvedAffiliateUrl: resolvedUrl }), "direct-review", { title: "Example" }), /DECOMMERCIALIZED_INPUT_CANNOT_PUBLISH_DIRECT_REVIEW/);
  assert.throws(() => assertArtifactCommercialSafety(record({ commercialMode: "decommercialized", submittedAffiliateUrl: resolvedUrl }), "blog", { blocks: [{ affiliate_url: resolvedUrl }] }), /DECOMMERCIALIZED_ARTIFACT_RETAINS_AFFILIATE_DESTINATION/);
  assert.throws(() => assertArtifactCommercialSafety(record({ commercialMode: "decommercialized", submittedAffiliateUrl: "https://partner.example/deal" }), "visibility", { description: "Try https://partner.example/deal today." }), /DECOMMERCIALIZED_ARTIFACT_RETAINS_SUBMITTED_AFFILIATE_URL/);
  assert.throws(() => assertArtifactCommercialSafety(record({ commercialMode: "approved", resolvedAffiliateUrl: resolvedUrl }), "blog", { destination_url: resolvedUrl }), /NON_DIRECT_REVIEW_ARTIFACT_RETAINS_AFFILIATE_DESTINATION/);
  const approved = record({ commercialMode: "approved", resolvedAffiliateUrl: resolvedUrl });
  assert.throws(() => assertArtifactCommercialSafety(approved, "direct-review", { affiliate_links: [{ affiliate_link_id: "switcher", destination_url: "https://alternate.example/deal" }] }), /ARTIFACT_AFFILIATE_DESTINATION_NOT_RESOLVED_URL/);
  assert.throws(() => assertArtifactCommercialSafety(approved, "direct-review", { affiliate_links: [{ affiliate_link_id: "switcher", destination_url: resolvedUrl }], hero: { primary_cta_link_id: "missing-link" } }), /AFFILIATE_CTA_DESTINATION_UNBOUND/);
  assert.throws(() => assertArtifactCommercialSafety(approved, "direct-review", { affiliate_links: [{ affiliate_link_id: "switcher", destination_url: resolvedUrl }], cta_blocks: [{ affiliate_link_id: "missing-link" }] }), /AFFILIATE_CTA_DESTINATION_UNBOUND/);
  assert.doesNotThrow(() => assertArtifactCommercialSafety(approved, "direct-review", { affiliate_links: [{ affiliate_link_id: "switcher", destination_url: resolvedUrl }], hero: { primary_cta_link_id: "switcher" }, cta_blocks: [{ affiliate_link_id: "switcher" }] }));
  assert.doesNotThrow(() => assertArtifactCommercialSafety(record({ commercialMode: "none" }), "blog", { title: "Neutral guide" }));
  // A neutral (mode-"none") import must not be able to select the commercial direct-review format.
  assert.throws(() => assertArtifactCommercialSafety(record({ commercialMode: "none" }), "direct-review", { title: "Example" }), /DIRECT_REVIEW_REQUIRES_APPROVED_COMMERCIAL_MODE/);
  assert.throws(() => assertArtifactCommercialSafety(record({ commercialMode: "approved" }), "direct-review", { title: "Example" }), /DIRECT_REVIEW_REQUIRES_RESOLVED_AFFILIATE_URL/);
});

test("release execution fails when a decommercialized input would publish as a direct review", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-decommercialized-release-"));
  try {
    const base = await releasingRecord(root);
    const record = { ...base, transformation: { ...base.transformation, commercialMode: "decommercialized" as const } };
    const result = await assessImportRelease({ repositoryRoot: root, record, changedFiles: releaseFiles, execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example", operations: operations() });
    assert.equal(result.status, "REPAIRING");
    assert.ok(result.reasons.includes("DECOMMERCIALIZED_INPUT_CANNOT_PUBLISH_DIRECT_REVIEW"));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("release execution fails when a mode-none import would publish as a direct review", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-mode-none-release-"));
  try {
    const base = await releasingRecord(root);
    const record = { ...base, transformation: { ...base.transformation, commercialMode: "none" as const, resolvedAffiliateUrl: undefined, submittedAffiliateUrl: undefined } };
    const result = await assessImportRelease({ repositoryRoot: root, record, changedFiles: releaseFiles, execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example", operations: operations() });
    assert.equal(result.status, "REPAIRING");
    assert.ok(result.reasons.includes("DIRECT_REVIEW_REQUIRES_APPROVED_COMMERCIAL_MODE"));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("release rebinds the affiliate receipt on the merged checkout before deploying", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-merged-rebinding-"));
  let deployments = 0;
  try {
    const record = await releasingRecord(root);
    const result = await assessImportRelease({
      repositoryRoot: root, record, changedFiles: releaseFiles, execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example",
      operations: operations({
        // After the reviewed head merged, another commit changed the receipt to a
        // different globally allowlisted URL — the merged checkout must not deploy it.
        checkoutMergedCommit: async () => { await writeFile(path.join(root, "src/generated/landing-pages/releases/example/release-receipt.json"), JSON.stringify({ exact_affiliate_url: "https://trymoo.moosend.com/michaelmedium" })); },
        deploy: async (commitSha) => { deployments += 1; return { deploymentId: "dpl-new", canonicalUrl: "https://vettedsaasblueprint.online/imported-guide", commitSha }; },
      }),
    });
    assert.equal(result.status, "REPAIRING");
    assert.ok(result.reasons.includes("RELEASE_RECEIPT_AFFILIATE_URL_MISMATCH"));
    assert.equal(deployments, 0);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("publication authority binding fails closed on blog mismatches and no-ops for other formats", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-authority-binding-"));
  const post = await repoBlogPost();
  const slug = String(post.slug);
  const artifactPath = `src/generated/blog-posts/${slug}.json`;
  try {
    await mkdir(path.join(root, "src/generated/blog-posts"), { recursive: true });
    await writeFile(path.join(root, artifactPath), JSON.stringify(post));
    // Formats outside blog/visibility are bound elsewhere and stay no-ops.
    await assertPublicationAuthorityBinding(root, "direct-review", undefined);
    await assertPublicationAuthorityBinding(root, "decision-set", undefined);
    await assertPublicationAuthorityBinding(root, "agent_review_required", undefined);
    // Matching authority entry passes.
    await writeFile(path.join(root, "src/generated/blog-posts/posts.json"), JSON.stringify([post]));
    await assertPublicationAuthorityBinding(root, "blog", artifactPath);
    // Missing, duplicate, and diverging entries all fail closed.
    await writeFile(path.join(root, "src/generated/blog-posts/posts.json"), JSON.stringify([]));
    await assert.rejects(() => assertPublicationAuthorityBinding(root, "blog", artifactPath), new RegExp(`BLOG_AUTHORITY_ENTRY_MISSING:${slug}`));
    await writeFile(path.join(root, "src/generated/blog-posts/posts.json"), JSON.stringify([post, post]));
    await assert.rejects(() => assertPublicationAuthorityBinding(root, "blog", artifactPath), /BLOG_AUTHORITY_DUPLICATE_SLUG/);
    const diverged = { ...post, cyclePosition: post.cyclePosition === 1 ? 2 : 1 };
    await writeFile(path.join(root, "src/generated/blog-posts/posts.json"), JSON.stringify([diverged]));
    await assert.rejects(() => assertPublicationAuthorityBinding(root, "blog", artifactPath), /BLOG_AUTHORITY_ARTIFACT_MISMATCH/);
    // Unreadable or unsafe artifact inputs fail closed too.
    await rm(path.join(root, "src/generated/blog-posts/posts.json"));
    await assert.rejects(() => assertPublicationAuthorityBinding(root, "blog", artifactPath), /BLOG_AUTHORITY_UNREADABLE/);
    await assert.rejects(() => assertPublicationAuthorityBinding(root, "blog", undefined), /PUBLICATION_AUTHORITY_ARTIFACT_MISSING/);
    await assert.rejects(() => assertPublicationAuthorityBinding(root, "blog", "../outside.json"), /PUBLICATION_AUTHORITY_ARTIFACT_MISSING/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("publication authority binding fails closed on visibility mismatches", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-visibility-binding-"));
  const generatedDirectory = path.join(root, "src/generated/visibility-pages");
  const route = "/guides/how-to-evaluate-ai-voice-quality";
  const expiresAt = new Date(Date.now() + 86400000).toISOString();
  const page = { schema_version: "VisibilityPageV1", id: "voice-guide", path: route, kind: "guide", cluster_id: "ai_voice", title: "Voice quality guide", description: "Evaluate voice quality.", modified_at: new Date().toISOString(), hero: { eyebrow: "Guide", headline: "Evaluate voice quality", summary: "Compare samples." }, claim_ids: ["sample"], relevant_review_path: "/landing-page-builders/elevenlabs-ai-voice-generator", related_paths: ["/ai-voice-generators"], blocks: [{ type: "prose", paragraphs: ["Compare samples."] }] };
  const evidence = { schema_version: "VisibilityEvidencePackV1", page_id: page.id, sources: [{ id: "source", url: "https://example.com/voice", source_hash: "a".repeat(64), retrieved_at: new Date().toISOString(), review_by: expiresAt, usage_allowed: true }], claims: [{ id: "sample", source_id: "source", allowed_wording: "Compare samples.", risk_level: "low", expires_at: expiresAt }] };
  const entry = { id: page.id, path: route, artifact: "guide.json", evidence: "evidence.json", artifact_sha256: createHash("sha256").update(JSON.stringify(page)).digest("hex"), evidence_sha256: createHash("sha256").update(JSON.stringify(evidence)).digest("hex") };
  const projection = { schema_version: "VisibilityBuildProjectionV1", source_commit_sha: "b".repeat(40), pages: [{ id: entry.id, path: entry.path, artifact_sha256: entry.artifact_sha256, evidence_sha256: entry.evidence_sha256, earliest_expires_at: expiresAt, state: "LIVE" }] };
  const artifactPath = "src/generated/visibility-pages/guide.json";
  try {
    await mkdir(generatedDirectory, { recursive: true });
    await writeFile(path.join(generatedDirectory, "guide.json"), JSON.stringify(page));
    await writeFile(path.join(generatedDirectory, "evidence.json"), JSON.stringify(evidence));
    await writeFile(path.join(generatedDirectory, "index.json"), JSON.stringify({ schema_version: "VisibilityManifestV1", pages: [entry] }));
    await writeFile(path.join(generatedDirectory, "publications.json"), JSON.stringify(projection));
    // A manifest whose authority matches the approved artifact passes.
    await assertPublicationAuthorityBinding(root, "visibility", artifactPath);
    // A diverging approved artifact (same path, different content) fails closed.
    const approved = visibilityPageSchema.parse(page);
    await writeFile(path.join(generatedDirectory, "other-page.json"), JSON.stringify({ ...approved, description: `${approved.description} Updated.` }));
    await assert.rejects(() => assertPublicationAuthorityBinding(root, "visibility", "src/generated/visibility-pages/other-page.json"), /VISIBILITY_AUTHORITY_ARTIFACT_MISMATCH/);
    // A missing authority entry and an unreadable manifest fail closed.
    await writeFile(path.join(generatedDirectory, "index.json"), JSON.stringify({ schema_version: "VisibilityManifestV1", pages: [] }));
    await writeFile(path.join(generatedDirectory, "publications.json"), JSON.stringify({ ...projection, pages: [] }));
    await assert.rejects(() => assertPublicationAuthorityBinding(root, "visibility", artifactPath), new RegExp(`VISIBILITY_AUTHORITY_ENTRY_MISSING:${route}`));
    await writeFile(path.join(generatedDirectory, "index.json"), "not-json");
    await assert.rejects(() => assertPublicationAuthorityBinding(root, "visibility", artifactPath), /VISIBILITY_AUTHORITY_INVALID/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("merged checkout rebinds blog publication authority before deploying", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-blog-authority-"));
  let deployments = 0;
  try {
    const { record, post, artifactPath, changedFiles } = await blogReleasingRecord(root);
    const postsPath = path.join(root, "src/generated/blog-posts/posts.json");
    const result = await assessImportRelease({
      repositoryRoot: root, record, changedFiles, execute: true, artifactPath, slug: String(post.slug),
      operations: operations({
        inspectGit: async () => ({ clean: true, changedFiles, headSha: "a".repeat(40), originMainSha: "a".repeat(40), fastForwardable: true }),
        refreshMain: async () => ({ clean: true, changedFiles, headSha: "a".repeat(40), originMainSha: "a".repeat(40), fastForwardable: true }),
        // After review, a concurrent main change replaced the authority entry with
        // different content under the approved slug — the merged checkout must not deploy it.
        checkoutMergedCommit: async () => {
          const posts = JSON.parse(await readFile(postsPath, "utf8")) as Array<Record<string, unknown>>;
          await writeFile(postsPath, JSON.stringify(posts.map((entry) => entry.slug === post.slug ? { ...entry, cyclePosition: post.cyclePosition === 1 ? 2 : 1 } : entry)));
        },
        deploy: async (commitSha) => { deployments += 1; return { deploymentId: "dpl-new", canonicalUrl: "https://vettedsaasblueprint.online/imported-guide", commitSha }; },
      }),
    });
    assert.equal(result.status, "REPAIRING");
    assert.ok(result.reasons.includes("BLOG_AUTHORITY_ARTIFACT_MISMATCH"));
    assert.equal(deployments, 0);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("a matching blog authority release still deploys to LIVE", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-blog-release-"));
  try {
    const { record, post, artifactPath, changedFiles } = await blogReleasingRecord(root);
    const result = await assessImportRelease({
      repositoryRoot: root, record, changedFiles, execute: true, artifactPath, slug: String(post.slug),
      operations: operations({
        inspectGit: async () => ({ clean: true, changedFiles, headSha: "a".repeat(40), originMainSha: "a".repeat(40), fastForwardable: true }),
        refreshMain: async () => ({ clean: true, changedFiles, headSha: "a".repeat(40), originMainSha: "a".repeat(40), fastForwardable: true }),
        deploy: async (commitSha) => ({ deploymentId: "dpl-new", canonicalUrl: `https://vettedsaasblueprint.online${post.canonicalPath}`, commitSha }),
      }),
    });
    assert.equal(result.status, "LIVE");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("an uncaught decision-page exception fails production browser verification", () => {
  const clean = browserErrorChecksFor({ route: "/decision/example", profile: "desktop", consoleErrors: [], pageErrors: [] });
  const withPageError = browserErrorChecksFor({ route: "/decision/example", profile: "desktop", consoleErrors: [], pageErrors: ["Uncaught TypeError: x is not a function"] });
  const withConsoleError = browserErrorChecksFor({ route: "/decision/example", profile: "mobile", consoleErrors: ["Failed to load resource"], pageErrors: [] });
  assert.equal(browserErrorsOkFrom(clean), true);
  assert.equal(browserErrorsOkFrom(withPageError), false);
  assert.equal(browserErrorsOkFrom(withConsoleError), false);
  assert.equal(browserErrorsOkFrom([]), false);
  assert.equal(withPageError.some((check) => check.name.endsWith("uncaught page errors") && check.passed === false), true);
  assert.equal(withPageError.some((check) => check.name.endsWith("console errors") && check.passed === true), true);
});

test("commercial safety rejects affiliate URLs hidden in generic non-direct-review URL fields", () => {
  const resolvedUrl = "https://start.switcherstudio.com/anme6fqvgdx9";
  const blogRecord = { transformation: { commercialMode: "approved", resolvedAffiliateUrl: resolvedUrl, submittedAffiliateUrl: resolvedUrl } } as unknown as ExternalArticleImportV1;
  assert.throws(() => assertArtifactCommercialSafety(blogRecord, "blog", { title: "Post", sources: [{ url: resolvedUrl, label: "Product documentation" }] }), /NON_DIRECT_REVIEW_ARTIFACT_RETAINS_AFFILIATE_URL/);
  assert.throws(() => assertArtifactCommercialSafety(blogRecord, "visibility", { title: "Page", references: [{ href: `https://example.org/redirect?to=${resolvedUrl}` }] }), /NON_DIRECT_REVIEW_ARTIFACT_RETAINS_AFFILIATE_URL/);
  assert.doesNotThrow(() => assertArtifactCommercialSafety(blogRecord, "blog", { title: "Post", sources: [{ url: "https://example.com/documentation", label: "Docs" }] }));
});

test("direct-review release binds the manifest-selected receipt URL to the resolved affiliate URL", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-receipt-binding-"));
  try {
    const base = await releasingRecord(root);
    // A different globally allowlisted URL B in the receipt for an import resolved to URL A.
    await writeFile(path.join(root, "src/generated/landing-pages/releases/example/release-receipt.json"), JSON.stringify({ exact_affiliate_url: "https://trymoo.moosend.com/michaelmedium" }));
    const result = await assessImportRelease({ repositoryRoot: root, record: base, changedFiles: releaseFiles, execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example", operations: operations() });
    assert.equal(result.status, "REPAIRING");
    assert.ok(result.reasons.includes("RELEASE_RECEIPT_AFFILIATE_URL_MISMATCH"));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("direct-review release fails when the manifest has no receipt entry for the slug", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-receipt-missing-"));
  try {
    const base = await releasingRecord(root);
    await writeFile(path.join(root, "src/generated/landing-pages/index.json"), JSON.stringify({ pages: [{ slug: "other-page", release_receipt: "releases/other-page/release-receipt.json" }] }));
    const result = await assessImportRelease({ repositoryRoot: root, record: base, changedFiles: releaseFiles, execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example", operations: operations() });
    assert.equal(result.status, "REPAIRING");
    assert.ok(result.reasons.includes("RELEASE_MANIFEST_ENTRY_MISSING:example"));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("direct-review release rejects an unsafe receipt path escaping the catalogue", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-receipt-unsafe-"));
  try {
    const base = await releasingRecord(root);
    await writeFile(path.join(root, "src/generated/landing-pages/index.json"), JSON.stringify({ pages: [{ slug: "example", release_receipt: "../../evil/receipt.json" }] }));
    const result = await assessImportRelease({ repositoryRoot: root, record: base, changedFiles: releaseFiles, execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example", operations: operations() });
    assert.equal(result.status, "REPAIRING");
    assert.ok(result.reasons.includes("RELEASE_RECEIPT_PATH_INVALID"));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("direct-review release binds the manifest artefact to the approved blueprint", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-manifest-artefact-"));
  try {
    const base = await releasingRecord(root);
    // Another valid same-slug blueprint exists; the manifest must not point at it.
    const artifactBytes = await readFile(path.join(root, "src/generated/landing-pages/example.json"));
    await writeFile(path.join(root, "src/generated/landing-pages/other-valid.json"), artifactBytes);
    await writeFile(path.join(root, "src/generated/landing-pages/index.json"), JSON.stringify({ pages: [{ slug: "example", artifact: "other-valid.json", release_receipt: "releases/example/release-receipt.json" }] }));
    const result = await assessImportRelease({ repositoryRoot: root, record: base, changedFiles: releaseFiles, execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example", operations: operations() });
    assert.equal(result.status, "REPAIRING");
    assert.ok(result.reasons.includes("RELEASE_MANIFEST_ARTIFACT_MISMATCH"));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("direct-review release rejects duplicate manifest entries for the approved slug", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-manifest-duplicate-"));
  try {
    const base = await releasingRecord(root);
    // The loader's pages.set serves the LAST same-slug entry, so a later duplicate must fail
    // the binding even when the first entry is the approved one.
    const artifactBytes = await readFile(path.join(root, "src/generated/landing-pages/example.json"));
    await writeFile(path.join(root, "src/generated/landing-pages/other-valid.json"), artifactBytes);
    await writeFile(path.join(root, "src/generated/landing-pages/index.json"), JSON.stringify({ pages: [
      { slug: "example", artifact: "example.json", release_receipt: "releases/example/release-receipt.json" },
      { slug: "example", artifact: "other-valid.json", release_receipt: "releases/example/release-receipt.json" },
    ] }));
    const result = await assessImportRelease({ repositoryRoot: root, record: base, changedFiles: releaseFiles, execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example", operations: operations() });
    assert.equal(result.status, "REPAIRING");
    assert.ok(result.reasons.includes("RELEASE_MANIFEST_DUPLICATE_SLUG"));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("direct-review release rejects a receipt page path that differs from the manifest artefact", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-receipt-page-path-"));
  try {
    const base = await releasingRecord(root);
    const receiptPath = path.join(root, "src/generated/landing-pages/releases/example/release-receipt.json");
    const receipt = JSON.parse(await readFile(receiptPath, "utf8"));
    await writeFile(receiptPath, JSON.stringify({ ...receipt, artifacts: { ...receipt.artifacts, page: { ...receipt.artifacts.page, path: "other-valid.json" } } }));
    const result = await assessImportRelease({ repositoryRoot: root, record: base, changedFiles: releaseFiles, execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example", operations: operations() });
    assert.equal(result.status, "REPAIRING");
    assert.ok(result.reasons.includes("RELEASE_RECEIPT_ARTIFACT_PATH_MISMATCH"));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("direct-review release rejects a receipt page fingerprint that does not match the approved artefact", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-receipt-fingerprint-"));
  try {
    const base = await releasingRecord(root);
    const receiptPath = path.join(root, "src/generated/landing-pages/releases/example/release-receipt.json");
    const receipt = JSON.parse(await readFile(receiptPath, "utf8"));
    await writeFile(receiptPath, JSON.stringify({ ...receipt, artifacts: { ...receipt.artifacts, page: { ...receipt.artifacts.page, sha256: "0".repeat(64) } } }));
    const result = await assessImportRelease({ repositoryRoot: root, record: base, changedFiles: releaseFiles, execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example", operations: operations() });
    assert.equal(result.status, "REPAIRING");
    assert.ok(result.reasons.includes("RELEASE_RECEIPT_ARTIFACT_FINGERPRINT_MISMATCH"));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("release re-verifies the merged-checkout artefact fingerprint before deploying", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-merged-artefact-"));
  let deployments = 0;
  try {
    const record = await releasingRecord(root);
    const result = await assessImportRelease({
      repositoryRoot: root, record, changedFiles: releaseFiles, execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example",
      operations: operations({
        // After the reviewed head merged, another commit changed the approved artefact content.
        checkoutMergedCommit: async () => {
          const swapped = { ...JSON.parse(await readFile(path.join(root, "src/generated/landing-pages/example.json"), "utf8")), title: "Swapped after review" };
          await writeFile(path.join(root, "src/generated/landing-pages/example.json"), JSON.stringify(swapped));
        },
        deploy: async (commitSha) => { deployments += 1; return { deploymentId: "dpl-new", canonicalUrl: "https://vettedsaasblueprint.online/imported-guide", commitSha }; },
      }),
    });
    assert.equal(result.status, "REPAIRING");
    assert.ok(result.reasons.includes("RELEASE_RECEIPT_ARTIFACT_FINGERPRINT_MISMATCH"));
    assert.equal(deployments, 0);
  } finally { await rm(root, { recursive: true, force: true }); }
});
