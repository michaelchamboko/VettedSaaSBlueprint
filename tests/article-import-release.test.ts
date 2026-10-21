import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { advanceImport, createArticleImport, loadImport, resumeImport } from "../src/lib/article-import/engine";
import { assessImportRelease, isAllowedReleasePath, validationCommandsForFormat, type FullProductionChecks, type ReleaseOperations } from "../src/lib/article-import/release";
import { createLocalReleaseOperations, type ReleaseCommandRunner } from "../src/lib/article-import/local-release-adapter";
import type { ExternalArticleImportV1 } from "../src/lib/article-import/contracts";
import { approveFixture } from "./fixtures/article-content-approval";

const checks: FullProductionChecks = { routeOk: true, contentOk: true, disclosureOk: true, exactCtaOk: true, desktopOk: true, mobileOk: true, robotsOk: true, sitemapOk: true, browserErrorsOk: true };
const source = "---\ntitle: Imported guide\naffiliate_name: Switcher Studio\naffiliate_url: https://start.switcherstudio.com/anme6fqvgdx9\n---\n\nThis is a sufficiently long article body for the release coordinator test and its deterministic validation path.\n";

async function releasingRecord(root: string): Promise<ExternalArticleImportV1> {
  await writeFile(path.join(root, "approved-urls.md"), "- https://start.switcherstudio.com/anme6fqvgdx9\n");
  await writeFile(path.join(root, "article.md"), source);
  let record = await createArticleImport(root, "article.md");
  for (let i = 0; i < 5; i += 1) {
    if (record.stage === "REFINING") record = await approveFixture(root, record);
    record = await advanceImport(root, record, "stage complete");
  }
  return record;
}

function operations(overrides: Partial<ReleaseOperations> = {}): ReleaseOperations {
  return {
    preflight: async () => ({ ok: true, reasons: [] }),
    inspectGit: async () => ({ clean: true, changedFiles: ["src/generated/landing-pages/example.json"], headSha: "a".repeat(40), originMainSha: "a".repeat(40), fastForwardable: true }),
    refreshMain: async () => ({ clean: true, changedFiles: ["src/generated/landing-pages/example.json"], headSha: "a".repeat(40), originMainSha: "a".repeat(40), fastForwardable: true }),
    runValidation: async () => ({ ok: true, summary: "all validation commands passed" }),
    capturePreviousDeployment: async () => ({ deploymentId: "dpl-previous", commitSha: "b".repeat(40), verified: true }),
    commit: async () => "c".repeat(40),
    pushFastForward: async (commitSha) => ({ commitSha, originMainSha: commitSha, force: false }),
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
    const record = await releasingRecord(root);
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

test("unsafe push proof waits without deployment", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-release-"));
  try {
    const record = await releasingRecord(root);
    let deployed = false;
    const result = await assessImportRelease({ repositoryRoot: root, record, changedFiles: ["src/generated/landing-pages/example.json"], execute: true, artifactPath: "src/generated/landing-pages/example.json", slug: "example", operations: operations({
      pushFastForward: async (commitSha) => ({ commitSha, originMainSha: "e".repeat(40), force: false }),
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
    const record = await releasingRecord(root);
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

test("local adapter rejects missing or mismatched Vercel commit metadata", async () => {
  const runner: ReleaseCommandRunner = async (command, args) => {
    if (command === "vercel" && args[0] === "deploy") return { stdout: "https://example.vercel.app", stderr: "" };
    if (command === "vercel" && args[0] === "inspect") return { stdout: JSON.stringify({ id: "dpl_1" }), stderr: "" };
    return { stdout: "", stderr: "" };
  };
  const operations = createLocalReleaseOperations(".", { runner, format: "direct-review", artifactPath: "a.json", slug: "a" });
  await assert.rejects(() => operations.deploy("a".repeat(40)), /DEPLOYMENT_COMMIT_METADATA_MISSING_OR_MISMATCHED/);
});

test("local adapter maps verifier evidence and rejects verifier failures", async () => {
  const runner: ReleaseCommandRunner = async (command) => {
    if (command === "npm") return { stdout: JSON.stringify({ status: "pass", robots_ok: true, sitemap_ok: true, pages: [{ desktop: { httpOk: true, disclosureOk: true, allCtasExact: true, allRevealSectionsVisible: true, browserErrors: [] }, mobile: { httpOk: true, disclosureOk: true, allCtasExact: true, allRevealSectionsVisible: true, browserErrors: [] } }] }), stderr: "" };
    return { stdout: "", stderr: "" };
  };
  const operations = createLocalReleaseOperations(".", { runner, format: "direct-review", artifactPath: "a.json", slug: "a" });
  assert.deepEqual(await operations.verifyProduction({ deploymentId: "dpl", canonicalUrl: "https://example.com", commitSha: "a".repeat(40) }), { routeOk: true, contentOk: true, disclosureOk: true, exactCtaOk: true, desktopOk: true, mobileOk: true, robotsOk: true, sitemapOk: true, browserErrorsOk: true });
  const failingRunner: ReleaseCommandRunner = async () => ({ stdout: JSON.stringify({ status: "failed" }), stderr: "" });
  await assert.rejects(() => createLocalReleaseOperations(".", { runner: failingRunner, format: "direct-review", artifactPath: "a.json", slug: "a" }).verifyProduction({ deploymentId: "dpl", canonicalUrl: "https://example.com", commitSha: "a".repeat(40) }), /LANDING_VERIFIER_FAILED/);
});

test("local adapter verifies rollback through the canonical production origin", async () => {
  const runner: ReleaseCommandRunner = async (command, args) => {
    if (command === "vercel" && args[0] === "inspect" && args[1] === "https://example.com") {
      return { stdout: JSON.stringify({ id: "dpl-known-good", gitCommitSha: "b".repeat(40), target: "production" }), stderr: "" };
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
