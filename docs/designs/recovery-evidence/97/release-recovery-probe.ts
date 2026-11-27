import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { advanceImport, createArticleImport, executePendingImport, loadImport } from "../../../../src/lib/article-import/engine";
import { readImportArtifactTarget } from "../../../../src/lib/article-import/format-validation";
import { withArticleExecution } from "../../../../src/lib/article-import/preflight";
import { recoverWorkflowLease } from "../../../../src/lib/article-import/workflow-lease";
import type { ReleaseOperations } from "../../../../src/lib/article-import/release";
import { createSupervisedImportExecutor } from "../../../../src/lib/article-import/supervised-executor";
import type { ExternalArticleImportV1 } from "../../../../src/lib/article-import/contracts";
import { approveFixture, presentFixture } from "../../../../tests/fixtures/article-content-approval";
import { fixtureProbe, persistFixture, prepareCommandCheckout } from "../../../../tests/fixtures/article-command";
import { productionFixture } from "../../../../tests/fixtures/article-production-evidence";

const evidenceDirectory = path.dirname(fileURLToPath(import.meta.url));
let runOutputDirectory = evidenceDirectory;
const releaseFiles = ["src/generated/landing-pages/example.json", "src/generated/landing-pages/index.json"];
const intendedCommit = "c".repeat(40);
const rollbackCommit = "b".repeat(40);
const requiredChecks = ["routeOk", "contentOk", "disclosureOk", "exactCtaOk", "desktopOk", "mobileOk", "robotsOk", "sitemapOk", "browserErrorsOk"];
const source = "---\ntitle: Imported guide\naffiliate_name: Switcher Studio\naffiliate_url: https://start.switcherstudio.com/anme6fqvgdx9\n---\n\nSynthetic release recovery evidence.\n";

type Scenario = "lost-response" | "controller-exit" | "indeterminate";
type RemoteState = {
  calls: Array<{ number: number; intendedCommit: string; deploymentId?: string; aliasAssigned: boolean | null; outcome: string }>;
  aliasDeploymentId?: string;
  rollbackTarget: { deploymentId: string; commitSha: string };
  rollbackAttempts: number;
};

async function readRemote(file: string): Promise<RemoteState> {
  return JSON.parse(await readFile(file, "utf8"));
}

async function writeRemote(file: string, state: RemoteState) {
  await writeFile(file, JSON.stringify(state, null, 2) + "\n");
}

async function releasingRecord(root: string): Promise<ExternalArticleImportV1> {
  console.error("fixture: creating article");
  await writeFile(path.join(root, "approved-urls.md"), "- https://start.switcherstudio.com/anme6fqvgdx9\n");
  await writeFile(path.join(root, "article.md"), source);
  await mkdir(path.join(root, "src/generated/landing-pages/releases/example"), { recursive: true });
  await writeFile(path.join(root, "src/generated/landing-pages/index.json"), JSON.stringify({
    pages: [{ slug: "example", artifact: "example.json", release_receipt: "releases/example/release-receipt.json" }],
  }));
  let record = await createArticleImport(root, "article.md");
  console.error("fixture: approving content");
  record = await approveFixture(root, { ...record, stage: "REFINING" });
  const artifactBytes = await readFile(path.join(root, "src/generated/landing-pages/example.json"));
  await writeFile(path.join(root, "src/generated/landing-pages/releases/example/release-receipt.json"), JSON.stringify({
    exact_affiliate_url: "https://start.switcherstudio.com/anme6fqvgdx9",
    artifacts: { page: { path: "example.json", sha256: createHash("sha256").update(artifactBytes.toString("utf8").replace(/\r\n/g, "\n")).digest("hex") } },
  }));
  record = await advanceImport(root, record, "editorial complete");
  console.error("fixture: recording presentation");
  record = await presentFixture(root, record);
  record = await advanceImport(root, record, "presentation complete");
  console.error("fixture: release-ready");
  return persistFixture(root, {
    ...record,
    pendingRelease: {
      schemaVersion: "ImportPendingReleaseV1",
      reviewedCommitSha: intendedCommit,
      branch: "codex/article-import/example",
      pullRequestUrl: "https://github.com/example/repository/pull/1",
      createdAt: new Date().toISOString(),
      codeReview: {
        schemaVersion: "ImportCodeReviewV1", reviewer: "codex", independent: true, passed: true,
        reviewedCommitSha: intendedCommit,
        pullRequestUrl: "https://github.com/example/repository/pull/1",
        evidenceUrl: "https://github.com/example/repository/pull/1#issuecomment-review",
        reviewedAt: new Date().toISOString(),
      },
    },
  });
}

async function importIdAt(root: string) {
  const entry = (await readdir(path.join(root, ".automation/article-imports")))
    .find((name) => /^article-.*\.json$/.test(name));
  if (!entry) throw new Error("Synthetic import state is missing.");
  return entry.slice(0, -5);
}

function operations(root: string, remotePath: string, scenario: Scenario, exitInsideDeploy = false): ReleaseOperations {
  return {
    preflight: async () => ({ ok: true, reasons: [] }),
    inspectGit: async () => ({ clean: true, changedFiles: releaseFiles, headSha: "a".repeat(40), originMainSha: "a".repeat(40), fastForwardable: true }),
    refreshMain: async () => ({ clean: true, changedFiles: releaseFiles, headSha: "a".repeat(40), originMainSha: "a".repeat(40), fastForwardable: true }),
    runValidation: async () => ({ ok: true, summary: "synthetic validation passed" }),
    capturePreviousDeployment: async () => ({ deploymentId: "dpl-previous", commitSha: rollbackCommit, verified: true }),
    commit: async () => intendedCommit,
    preparePullRequest: async (reviewedCommitSha) => ({ reviewedCommitSha, url: "https://github.com/example/repository/pull/1", branch: "codex/article-import/example" }),
    inspectPullRequest: async () => ({ merged: true, headRefOid: intendedCommit, mergeCommitSha: intendedCommit }),
    checkoutMergedCommit: async () => {},
    verifyCodeReview: async () => {},
    mergePullRequest: async () => ({ mergeCommitSha: intendedCommit }),
    deploy: async (commitSha) => {
      const remote = await readRemote(remotePath);
      const number = remote.calls.length + 1;
      const deploymentId = `dpl-${scenario}-${number}`;
      if (number === 1 && scenario === "indeterminate") {
        remote.calls.push({ number, intendedCommit: commitSha, aliasAssigned: null, outcome: "indeterminate" });
        await writeRemote(remotePath, remote);
        throw new Error("SYNTHETIC_REMOTE_RESULT_INDETERMINATE");
      }
      remote.calls.push({
        number, intendedCommit: commitSha, deploymentId, aliasAssigned: true,
        outcome: number === 1 ? (scenario === "controller-exit" ? "controller-exit" : "success-response-lost") : "success",
      });
      remote.aliasDeploymentId = deploymentId;
      await writeRemote(remotePath, remote);
      if (number === 1 && exitInsideDeploy) process.exit(86);
      if (number === 1 && scenario === "lost-response") throw new Error("SYNTHETIC_DEPLOYMENT_RESPONSE_LOST");
      return { deploymentId, canonicalUrl: "https://vettedsaasblueprint.online/imported-guide", commitSha };
    },
    verifyProduction: async (deployment) => {
      const record = await loadImport(root, await importIdAt(root));
      const { target } = await readImportArtifactTarget(root, record.format, record.contentApproval!.artifactPath, "example");
      return productionFixture(root, record.importId, target, deployment, record.sourceFingerprint);
    },
    rollback: async () => {
      const remote = await readRemote(remotePath);
      remote.rollbackAttempts += 1;
      await writeRemote(remotePath, remote);
      return { ok: false, summary: "synthetic rollback outcome is not verified" };
    },
    verifyRollback: async () => false,
  };
}

async function writeReleaseResult(root: string, record: ExternalArticleImportV1) {
  const continuation = record.continuation;
  if (continuation?.kind !== "work" || continuation.stage !== "RELEASING") return false;
  await mkdir(path.dirname(path.join(root, continuation.resultPath)), { recursive: true });
  await writeFile(path.join(root, continuation.resultPath), JSON.stringify({
    idempotencyKey: continuation.idempotencyKey,
    sourceFingerprint: record.sourceFingerprint,
    summary: "Synthetic release packet completed.",
    work: { stage: "RELEASING", artifactPath: "src/generated/landing-pages/example.json", changedFiles: releaseFiles, slug: "example" },
  }));
  return true;
}

async function runNormalEntryPoint(root: string, importId: string, executor: ReturnType<typeof createSupervisedImportExecutor>) {
  return withArticleExecution(
    root,
    () => executePendingImport(root, importId, executor),
    fixtureProbe(root),
    "RELEASING",
  );
}

async function setupScenario(scenario: Scenario) {
  console.error(`${scenario}: setup`);
  const root = await mkdtemp(path.join(os.tmpdir(), `recovery-97-${scenario}-`));
  await prepareCommandCheckout(root);
  const record = await releasingRecord(root);
  const remotePath = path.join(root, ".synthetic-release-remote.json");
  await writeRemote(remotePath, {
    calls: [],
    rollbackTarget: { deploymentId: "dpl-previous", commitSha: rollbackCommit },
    rollbackAttempts: 0,
  });
  const adapter = operations(root, remotePath, scenario);
  const packet = await runNormalEntryPoint(root, record.importId, createSupervisedImportExecutor(root, adapter));
  assert.equal(await writeReleaseResult(root, packet), true, "normal entry point should create a release packet");
  console.error(`${scenario}: packet ready`);
  return { root, remotePath, importId: record.importId };
}

async function advanceWait(root: string, record: ExternalArticleImportV1) {
  if (record.continuation?.kind !== "wait") return record;
  return persistFixture(root, {
    ...record,
    continuation: {
      ...record.continuation,
      nextCheckAt: new Date(Date.now() - 1_000).toISOString(),
      timeoutAt: new Date(Date.now() + 60_000).toISOString(),
    },
  });
}

async function driveRestart(root: string, remotePath: string, scenario: Scenario, importId: string) {
  const executor = createSupervisedImportExecutor(root, operations(root, remotePath, scenario));
  let state = await loadImport(root, importId);
  for (let turn = 0; turn < 5 && state.stage !== "LIVE"; turn += 1) {
    state = await advanceWait(root, state);
    state = await runNormalEntryPoint(root, importId, executor);
    await writeReleaseResult(root, state);
  }
  return loadImport(root, importId);
}

async function snapshot(root: string, remotePath: string, importId: string) {
  const [record, remote] = await Promise.all([loadImport(root, importId), readRemote(remotePath)]);
  return {
    stage: record.stage,
    nextAction: record.nextAction,
    deploymentIdentity: record.pendingRelease?.operations?.deployment?.deploymentId ?? null,
    intendedCommit,
    aliasAssignment: remote.aliasDeploymentId ?? null,
    rollbackTarget: remote.rollbackTarget,
    journal: record.pendingRelease ?? null,
    inferredOutstandingChecks: record.stage === "LIVE" ? [] : requiredChecks,
    outstandingChecksInference: record.stage === "LIVE"
      ? "No checks remain after the controller reaches LIVE."
      : "The record has no persisted outstanding-check list; these are the probe's required checks inferred from the non-LIVE stage.",
    remoteCallCount: remote.calls.length,
    retainedProductionProof: Boolean(record.evidenceRefs?.production && record.terminalRef),
  };
}

async function runLostOrIndeterminate(scenario: "lost-response" | "indeterminate") {
  const fixture = await setupScenario(scenario);
  try {
    const executor = createSupervisedImportExecutor(fixture.root, operations(fixture.root, fixture.remotePath, scenario));
    await runNormalEntryPoint(fixture.root, fixture.importId, executor);
    console.error(`${scenario}: incident captured`);
    const afterIncident = await snapshot(fixture.root, fixture.remotePath, fixture.importId);
    await runNormalEntryPoint(fixture.root, fixture.importId, executor);
    const afterImmediateRestart = await snapshot(fixture.root, fixture.remotePath, fixture.importId);
    await driveRestart(fixture.root, fixture.remotePath, scenario, fixture.importId);
    console.error(`${scenario}: restart captured`);
    const afterDueRestart = await snapshot(fixture.root, fixture.remotePath, fixture.importId);
    return { scenario, afterIncident, afterImmediateRestart, afterDueRestart, remote: await readRemote(fixture.remotePath) };
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
}

async function runControllerExit() {
  const scenario: Scenario = "controller-exit";
  const fixture = await setupScenario(scenario);
  try {
    const child = spawnSync(process.execPath, [
      "--import", "tsx", fileURLToPath(import.meta.url), "--child-exit",
      fixture.root, fixture.remotePath, fixture.importId,
    ], { cwd: process.cwd(), encoding: "utf8" });
    assert.equal(child.status, 86, `synthetic controller exit failed: ${child.stderr}`);
    console.error("controller-exit: child stopped before local save");
    const afterExit = await snapshot(fixture.root, fixture.remotePath, fixture.importId);
    await driveRestart(fixture.root, fixture.remotePath, scenario, fixture.importId);
    const afterImmediateRestart = await snapshot(fixture.root, fixture.remotePath, fixture.importId);
    console.error("controller-exit: live lease guard captured");
    await recoverWorkflowLease(fixture.root, "import", fixture.importId);
    const afterVerifiedExitRecovery = await snapshot(fixture.root, fixture.remotePath, fixture.importId);
    await driveRestart(fixture.root, fixture.remotePath, scenario, fixture.importId);
    console.error("controller-exit: verified-exit recovery captured");
    const afterRecoveredRestart = await snapshot(fixture.root, fixture.remotePath, fixture.importId);
    return {
      scenario,
      childPid: child.pid,
      childExitCode: child.status,
      afterExit,
      afterImmediateRestart,
      afterVerifiedExitRecovery,
      afterRecoveredRestart,
      remote: await readRemote(fixture.remotePath),
    };
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
}

async function childExit(root: string, remotePath: string, importId: string) {
  const executor = createSupervisedImportExecutor(root, operations(root, remotePath, "controller-exit", true));
  await runNormalEntryPoint(root, importId, executor);
  throw new Error("Synthetic child did not exit inside deploy.");
}

async function main() {
  if (process.argv[2] === "--child-exit") {
    await childExit(process.argv[3], process.argv[4], process.argv[5]);
    return;
  }
  const assertRequired = process.argv.includes("--assert-required");
  const refreshSnapshots = process.argv.includes("--refresh-snapshots");
  if (assertRequired || !refreshSnapshots) {
    const runsDirectory = path.join(process.cwd(), ".scratch", "recovery-evidence-97-runs");
    await mkdir(runsDirectory, { recursive: true });
    runOutputDirectory = await mkdtemp(path.join(runsDirectory, "run-"));
  }
  assert.equal(assertRequired && refreshSnapshots, false, "snapshot refresh is allowed only for a complete observational run");
  const scenarios = assertRequired
    ? [await runLostOrIndeterminate("lost-response")]
    : [
      await runLostOrIndeterminate("lost-response"),
      await runControllerExit(),
      await runLostOrIndeterminate("indeterminate"),
    ];
  const observations = {
    schemaVersion: "ReleaseRecoveryEvidence97V1",
    investigatedRevision: "f026bca8b53aecca829262e9a27820ac6d078892",
    generatedAt: new Date().toISOString(),
    expected: {
      remoteCallsAfterRestart: 1,
      nextActionWhenRemoteOutcomeIsUnknown: "hold for reconciliation",
      liveRequiresRetainedProductionProof: true,
    },
    scenarios,
  };
  if (assertRequired) {
    for (const scenario of observations.scenarios) {
      assert.equal(scenario.remote.calls.length, 1, `${scenario.scenario} must not repeat deployment before reconciliation`);
      const finalSnapshot = "afterDueRestart" in scenario ? scenario.afterDueRestart : scenario.afterRecoveredRestart;
      assert.equal(finalSnapshot.stage, "LIVE", `${scenario.scenario} should resume outstanding verification`);
      assert.equal(finalSnapshot.retainedProductionProof, true, `${scenario.scenario} should retain proof before LIVE`);
    }
  }
  for (const scenario of observations.scenarios) {
    assert.ok(scenario.remote.calls.length >= 1, `${scenario.scenario} did not reach the injected remote boundary`);
    const finalSnapshot = "afterDueRestart" in scenario ? scenario.afterDueRestart : scenario.afterRecoveredRestart;
    if (finalSnapshot.stage === "LIVE") assert.equal(finalSnapshot.retainedProductionProof, true);
  }
  const observationsPath = path.join(runOutputDirectory, "observations.json");
  await writeFile(observationsPath, JSON.stringify(observations, null, 2) + "\n");
  process.stdout.write(JSON.stringify({ ok: true, observations: observationsPath, refreshedSnapshot: refreshSnapshots }) + "\n");
}

main().catch(async (error) => {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  if (process.argv.includes("--assert-required")) {
    await mkdir(runOutputDirectory, { recursive: true });
    await writeFile(path.join(runOutputDirectory, "red-output.txt"), message + "\n");
  }
  console.error(message);
  process.exitCode = 1;
});
