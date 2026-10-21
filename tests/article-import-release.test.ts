import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { advanceImport, createArticleImport, loadImport, resumeImport } from "../src/lib/article-import/engine";
import { assessImportRelease, isAllowedReleasePath, type FullProductionChecks, type ReleaseOperations } from "../src/lib/article-import/release";
import type { ExternalArticleImportV1 } from "../src/lib/article-import/contracts";

const checks: FullProductionChecks = { routeOk: true, contentOk: true, disclosureOk: true, exactCtaOk: true, desktopOk: true, mobileOk: true, robotsOk: true, sitemapOk: true, browserErrorsOk: true };
const source = "---\ntitle: Imported guide\naffiliate_name: Switcher Studio\naffiliate_url: https://start.switcherstudio.com/anme6fqvgdx9\n---\n\nThis is a sufficiently long article body for the release coordinator test and its deterministic validation path.\n";

async function releasingRecord(root: string): Promise<ExternalArticleImportV1> {
  await writeFile(path.join(root, "approved-urls.md"), "- https://start.switcherstudio.com/anme6fqvgdx9\n");
  await writeFile(path.join(root, "article.md"), source);
  let record = await createArticleImport(root, "article.md");
  for (let i = 0; i < 5; i += 1) record = await advanceImport(root, record, "stage complete");
  return record;
}

function operations(overrides: Partial<ReleaseOperations> = {}): ReleaseOperations {
  return {
    preflight: async () => ({ ok: true, reasons: [] }),
    inspectGit: async () => ({ clean: true, changedFiles: ["src/generated/landing-pages/example.json"], headSha: "a".repeat(40), originMainSha: "a".repeat(40), fastForwardable: true }),
    refreshMain: async () => ({ clean: true, changedFiles: ["src/generated/landing-pages/example.json"], headSha: "a".repeat(40), originMainSha: "a".repeat(40), fastForwardable: true }),
    runValidation: async () => ({ ok: true, summary: "all validation commands passed" }),
    capturePreviousDeployment: async () => ({ deploymentId: "dpl-previous", commitSha: "b".repeat(40) }),
    commit: async () => "c".repeat(40),
    pushFastForward: async () => undefined,
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
    const result = await assessImportRelease({ repositoryRoot: root, record, changedFiles: ["src/generated/landing-pages/example.json"], execute: true, operations: { ...operations(), preflight: async () => ({ ok: false, reasons: ["VERCEL_TOKEN_MISSING"] }) } });
    assert.equal(result.status, "WAITING_EXTERNAL");
    assert.deepEqual(result.reasons, ["VERCEL_TOKEN_MISSING"]);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("successful release records and verifies the full production receipt", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-release-"));
  try {
    const record = await releasingRecord(root);
    const result = await assessImportRelease({ repositoryRoot: root, record, changedFiles: ["src/generated/landing-pages/example.json"], execute: true, operations: operations() });
    assert.equal(result.status, "LIVE");
    assert.equal((await loadImport(root, record.importId)).stage, "LIVE");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("failed production verification rolls back and never reports LIVE", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-release-"));
  try {
    const record = await releasingRecord(root);
    let rolledBack = false;
    const result = await assessImportRelease({ repositoryRoot: root, record, changedFiles: ["src/generated/landing-pages/example.json"], execute: true, operations: operations({ verifyProduction: async () => ({ ...checks, contentOk: false }), rollback: async () => { rolledBack = true; return { ok: true, summary: "restored" }; } }) });
    assert.equal(result.status, "ROLLED_BACK");
    assert.equal(rolledBack, true);
    assert.equal((await loadImport(root, record.importId)).stage, "ROLLED_BACK");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("rollback verification failure remains fail-closed", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-release-"));
  try {
    const record = await releasingRecord(root);
    const result = await assessImportRelease({ repositoryRoot: root, record, changedFiles: ["src/generated/landing-pages/example.json"], execute: true, operations: operations({ verifyProduction: async () => ({ ...checks, mobileOk: false }), verifyRollback: async () => false }) });
    assert.equal(result.status, "ROLLED_BACK");
    assert.match(result.reasons[0], /ROLLBACK_VERIFICATION_FAILED/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("moving main waits for refresh instead of pushing a stale candidate", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-release-"));
  try {
    const record = await releasingRecord(root);
    let committed = false;
    const result = await assessImportRelease({ repositoryRoot: root, record, changedFiles: ["src/generated/landing-pages/example.json"], execute: true, operations: operations({
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
    const result = await assessImportRelease({ repositoryRoot: root, record, changedFiles: ["src/generated/landing-pages/example.json"], execute: true, operations: operations({
      verifyProduction: async () => ({ ...checks, routeOk: false }),
      rollback: async () => { throw new Error("ROLLBACK_UNAVAILABLE"); },
    }) });
    assert.equal(result.status, "ROLLED_BACK");
    assert.deepEqual(result.reasons, ["ROLLBACK_VERIFICATION_FAILED"]);
    assert.equal((await loadImport(root, record.importId)).stage, "ROLLED_BACK");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("Switcher exact allowlist entry is accepted for the authorized manifest edit", async () => {
  const manifest = await readFile(path.join(process.cwd(), "approved-urls.md"), "utf8");
  assert.match(manifest, /https:\/\/start\.switcherstudio\.com\/anme6fqvgdx9/);
  assert.equal(isAllowedReleasePath("approved-urls.md", "direct-review", true), true);
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
