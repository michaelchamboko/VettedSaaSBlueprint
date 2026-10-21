import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { advanceImport, createArticleImport, loadImport, resumeImport } from "../src/lib/article-import/engine";
import { assessImportRelease, recordImportCodeReview, isAllowedReleasePath, validationCommandsForFormat, type FullProductionChecks, type ReleaseOperations } from "../src/lib/article-import/release";
import { createLocalReleaseOperations, type ReleaseCommandRunner } from "../src/lib/article-import/local-release-adapter";
import type { ExternalArticleImportV1 } from "../src/lib/article-import/contracts";
import { approveFixture, presentFixture } from "./fixtures/article-content-approval";
import { importArtifactTarget, readImportArtifactTarget, validateImportArtifact } from "../src/lib/article-import/format-validation";
import { createImportPresentation, requireImportPresentationBinding, verifyImportPresentationEvidence } from "../src/lib/article-import/presentation";

const checks: FullProductionChecks = { routeOk: true, contentOk: true, disclosureOk: true, exactCtaOk: true, desktopOk: true, mobileOk: true, robotsOk: true, sitemapOk: true, browserErrorsOk: true };
const source = "---\ntitle: Imported guide\naffiliate_name: Switcher Studio\naffiliate_url: https://start.switcherstudio.com/anme6fqvgdx9\n---\n\nThis is a sufficiently long article body for the release coordinator test and its deterministic validation path.\n";

async function releasingRecord(root: string): Promise<ExternalArticleImportV1> {
  await writeFile(path.join(root, "approved-urls.md"), "- https://start.switcherstudio.com/anme6fqvgdx9\n");
  await writeFile(path.join(root, "article.md"), source);
  let record = await createArticleImport(root, "article.md");
  for (let i = 0; i < 5; i += 1) {
    if (record.stage === "REFINING") record = await approveFixture(root, record);
    if (record.stage === "VALIDATING") record = await presentFixture(root, record);
    record = await advanceImport(root, record, "stage complete");
  }
  return { ...record, pendingRelease: { schemaVersion: "ImportPendingReleaseV1", reviewedCommitSha: "c".repeat(40), branch: "codex/article-import/example", pullRequestUrl: "https://github.com/example/repository/pull/1", createdAt: new Date().toISOString(), codeReview: { schemaVersion: "ImportCodeReviewV1", reviewer: "codex", independent: true, passed: true, reviewedCommitSha: "c".repeat(40), pullRequestUrl: "https://github.com/example/repository/pull/1", evidenceUrl: "https://github.com/example/repository/pull/1#issuecomment-review", reviewedAt: new Date().toISOString() } } };
}

function operations(overrides: Partial<ReleaseOperations> = {}): ReleaseOperations {
  return {
    preflight: async () => ({ ok: true, reasons: [] }),
    inspectGit: async () => ({ clean: true, changedFiles: ["src/generated/landing-pages/example.json"], headSha: "a".repeat(40), originMainSha: "a".repeat(40), fastForwardable: true }),
    refreshMain: async () => ({ clean: true, changedFiles: ["src/generated/landing-pages/example.json"], headSha: "a".repeat(40), originMainSha: "a".repeat(40), fastForwardable: true }),
    runValidation: async () => ({ ok: true, summary: "all validation commands passed" }),
    capturePreviousDeployment: async () => ({ deploymentId: "dpl-previous", commitSha: "b".repeat(40), verified: true }),
    commit: async () => "c".repeat(40),
    preparePullRequest: async (reviewedCommitSha) => ({ reviewedCommitSha, url: "https://github.com/example/repository/pull/1", branch: "codex/article-import/example" }),
    inspectPullRequest: async () => ({ merged: true, headRefOid: "c".repeat(40), mergeCommitSha: "c".repeat(40) }),
    checkoutMergedCommit: async () => {},
    verifyCodeReview: async () => {},
    deploy: async (commitSha) => ({ deploymentId: "dpl-new", canonicalUrl: "https://vettedsaasblueprint.online/imported-guide", commitSha }),
    verifyProduction: async () => checks,
    rollback: async () => ({ ok: true, summary: "restored" }),
    verifyRollback: async () => true,
    ...overrides,
  };
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
    const result = await assessImportRelease({ repositoryRoot: root, record, changedFiles: ["src/generated/landing-pages/example.json"], execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example", operations: { ...operations(), preflight: async () => ({ ok: false, reasons: ["VERCEL_TOKEN_MISSING"] }) } });
    assert.equal(result.status, "WAITING_EXTERNAL");
    assert.deepEqual(result.reasons, ["VERCEL_TOKEN_MISSING"]);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("successful release records and verifies the full production receipt", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-release-"));
  try {
    const record = await releasingRecord(root);
    const result = await assessImportRelease({ repositoryRoot: root, record, changedFiles: ["src/generated/landing-pages/example.json"], execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example", operations: operations() });
    assert.equal(result.status, "LIVE");
    assert.equal((await loadImport(root, record.importId)).stage, "LIVE");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("failed production verification rolls back and never reports LIVE", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-release-"));
  try {
    const record = await releasingRecord(root);
    let rolledBack = false;
    const result = await assessImportRelease({ repositoryRoot: root, record, changedFiles: ["src/generated/landing-pages/example.json"], execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example", operations: operations({ verifyProduction: async () => ({ ...checks, contentOk: false }), rollback: async () => { rolledBack = true; return { ok: true, summary: "restored" }; } }) });
    assert.equal(result.status, "ROLLED_BACK");
    assert.equal(rolledBack, true);
    assert.equal((await loadImport(root, record.importId)).stage, "ROLLED_BACK");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("rollback verification failure remains fail-closed", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-release-"));
  try {
    const record = await releasingRecord(root);
    const result = await assessImportRelease({ repositoryRoot: root, record, changedFiles: ["src/generated/landing-pages/example.json"], execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example", operations: operations({ verifyProduction: async () => ({ ...checks, mobileOk: false }), verifyRollback: async () => false }) });
    assert.equal(result.status, "WAITING_EXTERNAL");
    assert.match(result.reasons[0], /ROLLBACK_VERIFICATION_FAILED/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("moving main waits for refresh instead of pushing a stale candidate", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-release-"));
  try {
    const record = { ...await releasingRecord(root), pendingRelease: undefined };
    let committed = false;
    const result = await assessImportRelease({ repositoryRoot: root, record, changedFiles: ["src/generated/landing-pages/example.json"], execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example", operations: operations({
      refreshMain: async () => ({ clean: true, changedFiles: ["src/generated/landing-pages/example.json"], headSha: "b".repeat(40), originMainSha: "b".repeat(40), fastForwardable: true }),
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
    const result = await assessImportRelease({ repositoryRoot: root, record, changedFiles: ["src/generated/landing-pages/example.json"], execute: true, killSwitchEnabled: true, operations: operations({ preflight: async () => { preflighted = true; return { ok: true, reasons: [] }; } }) });
    assert.equal(result.status, "WAITING_EXTERNAL");
    assert.deepEqual(result.reasons, ["AUTOMATION_KILL_SWITCH_ENABLED"]);
    assert.equal(preflighted, false);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("failed rollback stays rolled back when the rollback adapter throws", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-release-"));
  try {
    const record = await releasingRecord(root);
    const result = await assessImportRelease({ repositoryRoot: root, record, changedFiles: ["src/generated/landing-pages/example.json"], execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example", operations: operations({
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
    const result = await assessImportRelease({ repositoryRoot: root, record, changedFiles: ["src/generated/landing-pages/example.json"], execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example", operations: operations({
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
    const result = await assessImportRelease({ repositoryRoot: root, record, changedFiles: ["src/generated/landing-pages/example.json"], execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example", operations: operations({ verifyProduction: async () => ({ routeOk: true } as unknown as FullProductionChecks) }) });
    assert.equal(result.status, "ROLLED_BACK");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("receipt failure after deployment rolls back exactly once", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-release-"));
  try {
    const record = await releasingRecord(root);
    let rollbackCount = 0;
    const result = await assessImportRelease({ repositoryRoot: root, record, changedFiles: ["src/generated/landing-pages/example.json"], execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example", operations: operations({
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
    const result = await assessImportRelease({ repositoryRoot: root, record, changedFiles: ["src/generated/landing-pages/example.json"], execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example", operations: operations({
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
    const result = await assessImportRelease({ repositoryRoot: root, record, changedFiles: ["src/generated/landing-pages/example.json"], execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example", operations: operations({ capturePreviousDeployment: async () => ({ deploymentId: "dpl-previous", commitSha: "b".repeat(40), verified: false }) }) });
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
    const mismatch = await assessImportRelease({ ...base, slug: "other", artifactPath: "src/generated/landing-pages/example.json", changedFiles: ["src/generated/landing-pages/example.json"] });
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
      changedFiles: ["src/generated/landing-pages/example.json"],
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
    const operations = createLocalReleaseOperations(root, { runner, fetchJson: async () => ({ commitSha: "b".repeat(40), environment: "production" }), format: "direct-review", artifactPath: "a.json", slug: "a", origin: "https://example.com" });
    const previous = await operations.capturePreviousDeployment();
    assert.deepEqual(previous, { deploymentId: "dpl_current", commitSha: "b".repeat(40), verified: true });
    assert.deepEqual(calls.find((call) => call[0] === "vercel" && call[1] === "inspect"), ["vercel", "inspect", "https://example.com", "--json"]);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("local adapter falls back to the deployment API commit when inspect omits gitCommitSha", async () => {
  const runner: ReleaseCommandRunner = async (command, args) => {
    if (command === "vercel" && args[0] === "inspect") return { stdout: JSON.stringify({ id: "dpl_current", target: "production", readyState: "READY" }), stderr: "" };
    return { stdout: "owner", stderr: "" };
  };
  const operations = createLocalReleaseOperations(".", { runner, fetchJson: async () => ({ commitSha: "d".repeat(40), environment: "production" }), format: "direct-review", artifactPath: "a.json", slug: "a", origin: "https://example.com" });
  assert.deepEqual(await operations.capturePreviousDeployment(), { deploymentId: "dpl_current", commitSha: "d".repeat(40), verified: true });
});

test("local adapter rejects disagreement between inspect and deployment API commit", async () => {
  const runner: ReleaseCommandRunner = async (command, args) => command === "vercel" && args[0] === "inspect"
    ? { stdout: JSON.stringify({ id: "dpl_current", gitCommitSha: "a".repeat(40), target: "production", readyState: "READY" }), stderr: "" }
    : { stdout: "owner", stderr: "" };
  const operations = createLocalReleaseOperations(".", { runner, fetchJson: async () => ({ commitSha: "b".repeat(40), environment: "production" }), format: "direct-review", artifactPath: "a.json", slug: "a", origin: "https://example.com" });
  await assert.rejects(() => operations.capturePreviousDeployment(), /DEPLOYMENT_COMMIT_METADATA_MISMATCHED/);
});

test("local adapter fails closed when deployment API is unavailable", async () => {
  const runner: ReleaseCommandRunner = async (command, args) => command === "vercel" && args[0] === "inspect"
    ? { stdout: JSON.stringify({ id: "dpl_current", target: "production", readyState: "READY" }), stderr: "" }
    : { stdout: "owner", stderr: "" };
  const operations = createLocalReleaseOperations(".", { runner, fetchJson: async () => { throw new Error("endpoint unavailable"); }, format: "direct-review", artifactPath: "a.json", slug: "a", origin: "https://example.com" });
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
    if (command === "vercel" && args[0] === "inspect" && args[1] === "https://example.com") {
      return { stdout: JSON.stringify({ id: "dpl-known-good", gitCommitSha: "b".repeat(40), target: "production", readyState: "READY" }), stderr: "" };
    }
    return { stdout: "", stderr: "" };
  };
  const operations = createLocalReleaseOperations(".", { runner, fetchJson: async () => ({ commitSha: "b".repeat(40), environment: "production" }), format: "direct-review", artifactPath: "a.json", slug: "a", origin: "https://example.com" });
  assert.equal(await operations.verifyRollback("dpl-known-good", "b".repeat(40)), true);
  assert.equal(await operations.verifyRollback("dpl-known-good", "c".repeat(40)), false);
});

test("local adapter rejects rollback when canonical origin still points to the failed deployment", async () => {
  const runner: ReleaseCommandRunner = async (command, args) => {
    if (command === "vercel" && args[0] === "inspect" && args[1] === "https://example.com") {
      return { stdout: JSON.stringify({ id: "dpl-failed", gitCommitSha: "c".repeat(40), target: "production", readyState: "READY" }), stderr: "" };
    }
    return { stdout: "", stderr: "" };
  };
  const operations = createLocalReleaseOperations(".", { runner, fetchJson: async () => ({ commitSha: "c".repeat(40), environment: "production" }), format: "direct-review", artifactPath: "a.json", slug: "a", origin: "https://example.com" });
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
  try { for (const [format, script] of [["blog", "scripts/verify-blog-deployment.ts"], ["visibility", "scripts/verify-visibility-deployment.ts"], ["decision-set", "scripts/verify-decision-journey-production.ts"]] as const) {
    const artifact = await formatFixture(format);
    await writeFile(path.join(root, "example.json"), JSON.stringify(artifact));
    const target = importArtifactTarget(format, artifact);
    const evidence = format === "decision-set" ? { target, passed: true, checks: [{ passed: true }], screenshots: target.renderedRoutes.flatMap((route) => [{ route, mode: "desktop: first-screen" }, { route, mode: "mobile-reduced-motion: first-screen" }]), robots_ok: true, sitemap_ok: true } : { target, ok: true, routes: target.renderedRoutes.length, verifiedRoutes: target.renderedRoutes, viewportChecks: target.renderedRoutes.length * 2 };
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
      const result = await assessImportRelease({ repositoryRoot: root, record, changedFiles: ["src/generated/landing-pages/example.json"], execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example", operations: operations({ [operation]: async () => { throw new Error("NETWORK_UNAVAILABLE"); } }) });
      assert.equal(result.status, "WAITING_EXTERNAL");
      assert.equal((await loadImport(root, record.importId)).stage, "WAITING_EXTERNAL");
    } finally { await rm(root, { recursive: true, force: true }); }
  }
});

test("presentation binds approved content and the released canonical route", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-release-binding-"));
  try {
    const record = await releasingRecord(root);
    await assessImportRelease({ repositoryRoot: root, record, changedFiles: ["src/generated/landing-pages/example.json"], execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example", operations: operations() });
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
    const result = await assessImportRelease({ repositoryRoot: root, record, changedFiles: ["src/generated/landing-pages/example.json"], execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example", operations: operations({ preparePullRequest: async (reviewedCommitSha) => ({ reviewedCommitSha, url: "https://github.com/example/repository/pull/1", branch: "codex/article-import/" + record.importId }), deploy: async () => { deployed = true; throw new Error("must wait"); } }) });
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
    const base = { repositoryRoot: root, changedFiles: ["src/generated/landing-pages/example.json"], execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example" };
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
test("unmerged PR resumes without committing again; merged PR deploys the exact merge commit", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-release-merge-"));
  try {
    const record = await releasingRecord(root);
    const base = { repositoryRoot: root, record, changedFiles: ["src/generated/landing-pages/example.json"], execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example" };
    const waiting = await assessImportRelease({ ...base, operations: operations({ inspectPullRequest: async () => ({ merged: false, headRefOid: "c".repeat(40) }), commit: async () => { throw new Error("must not recommit"); } }) });
    assert.equal(waiting.reasons[0], "OWNER_PR_MERGE_REQUIRED");
    let deployedSha = "";
    const live = await assessImportRelease({ ...base, operations: operations({ inspectPullRequest: async () => ({ merged: true, headRefOid: "c".repeat(40), mergeCommitSha: "d".repeat(40) }), deploy: async (commitSha) => { deployedSha = commitSha; return { deploymentId: "dpl-merged", commitSha, canonicalUrl: "https://vettedsaasblueprint.online/imported-guide" }; } }) });
    assert.equal(live.status, "LIVE");
    assert.equal(deployedSha, "d".repeat(40));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("merged PR waits for a passed independent current-head Codex receipt", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-code-review-"));
  try {
    const prepared = await releasingRecord(root);
    const record = { ...prepared, pendingRelease: { ...prepared.pendingRelease!, codeReview: undefined } };
    let deployed = false;
    const base = { repositoryRoot: root, record, changedFiles: ["src/generated/landing-pages/example.json"], execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example" };
    const result = await assessImportRelease({ ...base, operations: operations({ deploy: async () => { deployed = true; throw new Error("must wait"); } }) });
    assert.equal(result.reasons[0], "CURRENT_HEAD_CODEX_REVIEW_REQUIRED");
    assert.equal(deployed, false);
    const waiting = await loadImport(root, record.importId);
    assert.deepEqual(waiting.strategyAttempts, record.strategyAttempts);
    const receipt = prepared.pendingRelease!.codeReview!;
    await assert.rejects(() => recordImportCodeReview(root, waiting, { ...receipt, passed: false }, operations()));
    await assert.rejects(() => recordImportCodeReview(root, waiting, { ...receipt, pullRequestUrl: "https://github.com/example/repository/pull/2" }, operations()), /BINDING_MISMATCH/);
    await assert.rejects(() => recordImportCodeReview(root, waiting, receipt, operations({ inspectPullRequest: async () => ({ merged: false, headRefOid: "e".repeat(40) }) })), /HEAD_CHANGED/);
    const reviewed = await recordImportCodeReview(root, waiting, receipt, operations());
    assert.deepEqual((await loadImport(root, record.importId)).pendingRelease?.codeReview, receipt);
    const resumed = await resumeImport(root, reviewed);
    const live = await assessImportRelease({ ...base, record: resumed, operations: operations() });
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

test("release revalidates stored review evidence before deploying", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-review-recheck-"));
  try {
    const record = await releasingRecord(root);
    let deployed = false;
    const result = await assessImportRelease({ repositoryRoot: root, record, changedFiles: ["src/generated/landing-pages/example.json"], execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example", operations: operations({
      verifyCodeReview: async () => { throw new Error("CODE_REVIEW_NOT_CLEAN_CURRENT_HEAD"); },
      deploy: async () => { deployed = true; throw new Error("must not deploy"); },
    }) });
    assert.equal(result.status, "WAITING_EXTERNAL");
    assert.equal(result.reasons[0], "CODE_REVIEW_NOT_CLEAN_CURRENT_HEAD");
    assert.equal(deployed, false);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("changed PR head invalidates the stored review without deploying", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-code-review-stale-"));
  try {
    const record = await releasingRecord(root);
    const result = await assessImportRelease({ repositoryRoot: root, record, changedFiles: ["src/generated/landing-pages/example.json"], execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example", operations: operations({
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
