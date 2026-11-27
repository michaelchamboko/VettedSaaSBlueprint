import assert from "node:assert/strict";
import { copyFile, mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { externalArticleImportSchema, type ExternalArticleImportV1 } from "../../../../src/lib/article-import/contracts";
import {
  advanceImport,
  createArticleImport,
  ensureImportContentApproval,
  executePendingImport,
  loadImport,
} from "../../../../src/lib/article-import/engine";
import { createSupervisedImportExecutor } from "../../../../src/lib/article-import/supervised-executor";
import { approveFixture } from "../../../../tests/fixtures/article-content-approval";
import { fixtureResearchRegistry } from "../../../../tests/fixtures/article-command";

const evidenceDirectory = path.dirname(fileURLToPath(import.meta.url));
const fixtureParent = path.resolve(".scratch/recovery-106");
const investigatedRevision = "f026bca8b53aecca829262e9a27820ac6d078892";

type CrashPoint = "before-mutation" | "after-archive-copy" | "after-reference-registration";

async function fixture() {
  await mkdir(fixtureParent, { recursive: true });
  const root = await mkdtemp(path.join(fixtureParent, "case-"));
  await writeFile(path.join(root, "approved-urls.md"), "- https://example.com/affiliate\n");
  await writeFile(path.join(root, "article.md"), [
    "---",
    "title: Synthetic cleanup recovery probe",
    "affiliate_name: Example",
    "affiliate_url: https://example.com/affiliate",
    "---",
    "Synthetic source used only by issue 106 recovery evidence.",
  ].join("\n"));
  return { root, record: await createArticleImport(root, "article.md") };
}

async function dispose(root: string) {
  const relative = path.relative(fixtureParent, path.resolve(root));
  assert.ok(relative && !relative.startsWith("..") && !path.isAbsolute(relative));
  await rm(root, { recursive: true, force: true });
}

async function writeIntent(
  root: string,
  record: ExternalArticleImportV1,
  point: CrashPoint,
  originalPath: string,
  archivePath: string,
  extra: Record<string, unknown> = {},
) {
  const operationId = `cleanup:${record.importId}:INGESTING:synthetic-output`;
  const markerPath = path.join(root, "synthetic-cleanup.pending.json");
  await writeFile(markerPath, JSON.stringify({
    schemaVersion: "SyntheticCleanupIntentV1",
    operationId,
    importId: record.importId,
    passedGate: "INGESTING",
    nextGate: "RESEARCHING",
    crashPoint: point,
    originalPath,
    archivePath,
    automaticExecutionAttempts: 1,
    ...extra,
  }, null, 2));
  return { operationId, markerPath };
}

async function probeCrashPoint(point: CrashPoint) {
  const { root, record } = await fixture();
  try {
    const researching = await advanceImport(root, record, "Synthetic ingest passed.");
    const originalPath = "synthetic-output.txt";
    const archivePath = "synthetic-archive/output.txt";
    await writeFile(path.join(root, originalPath), "retained synthetic bytes\n");
    if (point !== "before-mutation") {
      await mkdir(path.dirname(path.join(root, archivePath)), { recursive: true });
      await copyFile(path.join(root, originalPath), path.join(root, archivePath));
    }
    const marker = await writeIntent(root, researching, point, originalPath, archivePath,
      point === "after-archive-copy"
        ? { dependencyClaimedDuringCleanup: originalPath }
        : point === "after-reference-registration"
          ? { claimedRegisteredReferences: [{ originalPath, archivePath }] }
          : {});

    let stageExecutorCalls = 0;
    const dispatched = await executePendingImport(root, researching.importId, async (context) => {
      stageExecutorCalls += 1;
      return context.record;
    });
    const originalBytes = await readFile(path.join(root, originalPath), "utf8");
    const archiveBytes = point === "before-mutation" ? null : await readFile(path.join(root, archivePath), "utf8");
    const markerBytes = await readFile(marker.markerPath, "utf8");

    let durableRegistrationAccepted = false;
    let durableRegistrationError = "";
    if (point === "after-reference-registration") {
      try {
        externalArticleImportSchema.parse({
          ...dispatched,
          cleanupOperation: {
            operationId: marker.operationId,
            registeredReferences: [{ originalPath, archivePath }],
          },
        });
        durableRegistrationAccepted = true;
      } catch (error) {
        durableRegistrationError = error instanceof Error ? error.message : String(error);
      }
    }

    return {
      point,
      operationIdInControllerState: null,
      cleanupCounterInControllerState: null,
      stageExecutorCalls,
      nextStage: dispatched.stage,
      originalReadable: originalBytes === "retained synthetic bytes\n",
      archiveReadable: archiveBytes === null ? null : archiveBytes === originalBytes,
      markerRetained: markerBytes.includes(marker.operationId),
      dependencyClaimedDuringCleanup: point === "after-archive-copy",
      durableRegistrationAccepted: point === "after-reference-registration" ? durableRegistrationAccepted : null,
      durableRegistrationError: point === "after-reference-registration" ? durableRegistrationError : null,
      observedLimit: point === "after-reference-registration"
        ? "The strict import schema rejects cleanupOperation; the marker's claimed registration is not a controller registration."
        : "The controller does not read the synthetic cleanup intent marker.",
    };
  } finally {
    await dispose(root);
  }
}

async function probeNormalHandoff() {
  const { root, record } = await fixture();
  try {
    const researching = await advanceImport(root, record, "Synthetic ingest passed.");
    const marker = await writeIntent(root, researching, "before-mutation", "synthetic-output.txt", "synthetic-archive/output.txt");
    await writeFile(path.join(root, "synthetic-output.txt"), "retained synthetic bytes\n");
    const executor = createSupervisedImportExecutor(root, undefined, { researchRegistry: fixtureResearchRegistry(root) });
    const result = await executePendingImport(root, researching.importId, executor);
    return {
      operationId: marker.operationId,
      nextStage: result.stage,
      continuationKind: result.continuation?.kind ?? null,
      nextGateWorkPacketCreated: result.continuation?.kind === "work",
      externalArticleWorkerCalls: 0,
      reasonExternalWorkerCallsAreZero: "The probe stopped at the controller's supervised work handoff and did not invoke a worker subprocess.",
      markerRetained: (await readFile(marker.markerPath, "utf8")).includes(marker.operationId),
    };
  } finally {
    await dispose(root);
  }
}

async function probeUnreadableDownstreamInput() {
  const { root, record } = await fixture();
  try {
    const approved = await approveFixture(root, { ...record, stage: "REFINING" });
    const validating = await advanceImport(root, approved, "Synthetic content approval passed.");
    const artifactPath = validating.contentApproval!.artifactPath;
    const archivePath = path.join("synthetic-archive", "approved.json");
    await mkdir(path.dirname(path.join(root, archivePath)), { recursive: true });
    await rename(path.join(root, artifactPath), path.join(root, archivePath));
    await writeIntent(root, validating, "after-reference-registration", artifactPath, archivePath, {
      claimedRegisteredReferences: [{ originalPath: artifactPath, archivePath }],
    });
    const checked = await ensureImportContentApproval(root, await loadImport(root, record.importId));
    let stageExecutorCalls = 0;
    const resumed = await executePendingImport(root, record.importId, async (context) => {
      stageExecutorCalls += 1;
      return context.record;
    });
    return {
      requiredInput: artifactPath,
      archivedBytesReadable: (await readFile(path.join(root, archivePath))).byteLength > 0,
      automaticArchiveDiscovery: false,
      contentApprovalRetained: Boolean(checked.contentApproval),
      stageAfterIntegrityCheck: checked.stage,
      stageAfterControllerResume: resumed.stage,
      stageExecutorCalls,
      articleAuthoringMayRepeat: checked.stage === "REFINING" && stageExecutorCalls === 1,
      externalArticleWorkerCalls: 0,
    };
  } finally {
    await dispose(root);
  }
}

async function probeUncertainFilesystemOutcome() {
  const { root, record } = await fixture();
  try {
    const researching = await advanceImport(root, record, "Synthetic ingest passed.");
    const originalPath = "synthetic-output.txt";
    const archivePath = "synthetic-archive/output.txt";
    await writeFile(path.join(root, originalPath), "original recoverable bytes\n");
    await mkdir(path.dirname(path.join(root, archivePath)), { recursive: true });
    await writeFile(path.join(root, archivePath), "different archive bytes\n");
    const marker = await writeIntent(root, researching, "after-archive-copy", originalPath, archivePath, {
      filesystemOutcome: "uncertain",
      integrityVerified: false,
    });
    let stageExecutorCalls = 0;
    const result = await executePendingImport(root, record.importId, async (context) => {
      stageExecutorCalls += 1;
      return context.record;
    });
    return {
      operationId: marker.operationId,
      originalRecoverable: (await readFile(path.join(root, originalPath), "utf8")) === "original recoverable bytes\n",
      archiveRecoverable: (await readFile(path.join(root, archivePath), "utf8")) === "different archive bytes\n",
      archiveIntegrityMatchesOriginal: false,
      stageExecutorCalls,
      nextStage: result.stage,
      dispatchHeldForReconciliation: stageExecutorCalls === 0,
      externalArticleWorkerCalls: 0,
    };
  } finally {
    await dispose(root);
  }
}

async function forceWaitDue(root: string, record: ExternalArticleImportV1) {
  assert.equal(record.continuation?.kind, "wait");
  const due = externalArticleImportSchema.parse({
    ...record,
    continuation: {
      ...record.continuation,
      nextCheckAt: new Date(Date.now() - 1_000).toISOString(),
      timeoutAt: new Date(Date.now() + 60_000).toISOString(),
    },
  });
  await writeFile(path.join(root, ".automation/article-imports", `${record.importId}.json`), JSON.stringify(due, null, 2) + "\n");
  return due;
}

async function probeRetryCounts() {
  const { root, record } = await fixture();
  try {
    let current = await advanceImport(root, record, "Synthetic ingest passed.");
    const marker = await writeIntent(root, current, "before-mutation", "synthetic-output.txt", "synthetic-archive/output.txt", {
      automaticExecutionAttempts: 0,
    });
    await writeFile(path.join(root, "synthetic-output.txt"), "retained synthetic bytes\n");
    let stageExecutorCalls = 0;
    const temporaryFailureExecutor = async () => {
      stageExecutorCalls += 1;
      const error = new Error("Synthetic pre-mutation temporary cleanup failure") as NodeJS.ErrnoException;
      error.code = "EPERM";
      throw error;
    };
    const invocations = [];
    for (let invocation = 1; invocation <= 3; invocation += 1) {
      if (current.continuation?.kind === "wait") current = await forceWaitDue(root, current);
      current = await executePendingImport(root, record.importId, temporaryFailureExecutor);
      invocations.push({
        invocation,
        stage: current.stage,
        continuationKind: current.continuation?.kind ?? null,
        transientResearchAttempts: current.strategyAttempts["transient:research"] ?? 0,
        articleRepairTotal: current.repairStageTotals?.RESEARCHING ?? 0,
        cleanupOperationAttempts: null,
      });
      current = await loadImport(root, record.importId);
    }
    return {
      operationId: marker.operationId,
      stageExecutorCalls,
      invocations,
      exhaustedAfterThree: current.stage !== "WAITING_EXTERNAL",
      verifiedCleanupRemedyRequired: false,
      markerAttemptValueAfterThree: JSON.parse(await readFile(marker.markerPath, "utf8")).automaticExecutionAttempts,
      counterMeaning: "transient:research is a stage-strategy counter, not a cleanup-operation counter.",
    };
  } finally {
    await dispose(root);
  }
}

async function probeSharedFailureStop() {
  const { root, record } = await fixture();
  try {
    await advanceImport(root, record, "Synthetic ingest passed.");
    let stageExecutorCalls = 0;
    const fail = async () => {
      stageExecutorCalls += 1;
      throw new Error("STATE_INTEGRITY: synthetic shared cleanup integrity failure");
    };
    const first = await executePendingImport(root, record.importId, fail);
    const second = await executePendingImport(root, record.importId, fail);
    return {
      firstStage: first.stage,
      firstContinuationKind: first.continuation?.kind ?? null,
      firstBlockerScope: first.continuation?.kind === "blocked" ? first.continuation.scope : null,
      secondStage: second.stage,
      stageExecutorCalls,
      immediateStopObserved: first.continuation?.kind === "blocked" && stageExecutorCalls === 1,
      cleanupOperationIdentity: null,
    };
  } finally {
    await dispose(root);
  }
}

async function main() {
  const crashPoints = [];
  for (const point of ["before-mutation", "after-archive-copy", "after-reference-registration"] as const) {
    crashPoints.push(await probeCrashPoint(point));
  }
  const observations = {
    schemaVersion: "CleanupRecoveryEvidence106V1",
    investigatedRevision,
    generatedAt: new Date().toISOString(),
    syntheticOnly: true,
    normalControllerSeam: "executePendingImport",
    expectedSource: "ADR-0004, Decision, Q44 and Q48 paragraphs",
    crashPoints,
    normalHandoff: await probeNormalHandoff(),
    unreadableDownstreamInput: await probeUnreadableDownstreamInput(),
    uncertainFilesystemOutcome: await probeUncertainFilesystemOutcome(),
    retryCounts: await probeRetryCounts(),
    sharedFailureStop: await probeSharedFailureStop(),
  };
  await writeFile(path.join(evidenceDirectory, "observations.json"), JSON.stringify(observations, null, 2) + "\n");

  if (process.argv.includes("--assert-required")) {
    assert.equal(crashPoints[0].stageExecutorCalls, 0, "durable pre-mutation cleanup intent must block next-gate dispatch");
    assert.equal(crashPoints[1].stageExecutorCalls, 0, "archive-copy interruption must reconcile before next-gate dispatch");
    assert.equal(crashPoints[2].durableRegistrationAccepted, true, "the controller must durably register cleanup references");
    assert.equal(observations.retryCounts.exhaustedAfterThree, true, "the same cleanup operation must exhaust after three total attempts");
  }

  process.stdout.write(JSON.stringify({
    ok: true,
    observations: path.join(evidenceDirectory, "observations.json"),
  }) + "\n");
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
