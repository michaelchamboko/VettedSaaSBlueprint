import { readFile } from "node:fs/promises";
import path from "node:path";
import { createArticleImport, executePendingImport, loadImport, saveImport, type ImportStageExecutor } from "./engine";
import type { ExternalArticleImportV1 } from "./contracts";
import { createSupervisedImportExecutor } from "./supervised-executor";
import {
  claimNextIntakeEntry,
  loadIntakeRun,
  markIntakeEntry,
  nextIntakeEntry,
  setIntakeBlocker,
  type IntakeRun,
} from "./intake";
import { invokeWorker, type WorkerOptions } from "./worker-runner";

export type DispatchOptions = WorkerOptions & {
  maxSteps?: number;
  executor?: ImportStageExecutor;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
};

function isTerminalStage(stage: string): boolean {
  return stage === "LIVE" || stage === "QUARANTINED";
}

function createDispatchingExecutor(root: string, baseExecutor: ImportStageExecutor, options?: DispatchOptions): ImportStageExecutor {
  return async (context) => {
    const first = await baseExecutor(context);
    if (!first.continuation || first.continuation.kind !== "work") return first;
    const workPath = first.continuation.workPath;
    const resultPath = first.continuation.resultPath;
    const packet = JSON.parse(await readFile(path.resolve(root, workPath), "utf8")) as Record<string, unknown>;
    if (packet.importId !== context.record.importId || packet.stage !== context.stage ||
        packet.idempotencyKey !== context.idempotencyKey || packet.sourceFingerprint !== context.record.sourceFingerprint ||
        packet.resultPath !== resultPath) throw new Error("STATE_INTEGRITY: work packet binding mismatch");
    // The local candidate renderer independently verifies the persisted work packet.
    await context.assertLease();
    await saveImport(root, first);
    await invokeWorker(root, workPath, resultPath, packet, context.leaseToken, context.assertLease, options);

    return baseExecutor({ ...context, record: first });
  };
}

export async function dispatchArticleImport(
  repositoryRoot: string,
  importId: string,
  options?: DispatchOptions,
): Promise<ExternalArticleImportV1 & { dispatchOutcome?: "STEP_LIMIT" }> {
  const baseExecutor = options?.executor ?? createSupervisedImportExecutor(repositoryRoot);
  const execute = createDispatchingExecutor(repositoryRoot, baseExecutor, options);
  const now = options?.now ?? (() => Date.now());
  const sleep = options?.sleep ?? (async (ms: number) => { await new Promise((resolve) => setTimeout(resolve, ms)); });
  const maxSteps = dispatchLimit(options);
  let current = await loadImport(repositoryRoot, importId);
  for (let step = 0; step < maxSteps; step += 1) {
    if (isTerminalStage(current.stage)) return executePendingImport(repositoryRoot, importId, execute, { rejectBusy: true });
    if (current.stage === "ROLLED_BACK" || current.continuation?.kind === "blocked") return current;
    if (current.continuation?.kind === "wait") {
      const due = Math.min(Date.parse(current.continuation.nextCheckAt), Date.parse(current.continuation.timeoutAt));
      if (now() < due) await sleep(due - now());
      if (now() < due) return current;
    }
    const previous = current;
    current = await executePendingImport(repositoryRoot, importId, execute, { rejectBusy: true });
    if (isTerminalStage(current.stage) || current.continuation?.kind === "blocked" || current.continuation?.kind === "repair" ||
        JSON.stringify(current) === JSON.stringify(previous)) return current;
  }
  return { ...current, dispatchOutcome: "STEP_LIMIT" };
}

function dispatchLimit(options?: DispatchOptions): number {
  const limit = options?.maxSteps ?? 1000;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 10000) throw new Error("INVALID_DISPATCH_LIMIT");
  return limit;
}

export async function dispatchIntakeRun(
  repositoryRoot: string,
  runId: string,
  options?: DispatchOptions,
): Promise<IntakeRun & { dispatchOutcome?: "STEP_LIMIT" }> {
  const maxSteps = dispatchLimit(options);
  for (let step = 0; step < maxSteps; step += 1) {
    const run = await claimNextIntakeEntry(repositoryRoot, runId);
    const entry = nextIntakeEntry(run);
    if (!entry) return run;
    if (!entry.importId) {
      if (!entry.capturedPath || !entry.sourceFingerprint) throw new Error("INTAKE_SOURCE_MISSING");
      const record = await createArticleImport(repositoryRoot, entry.capturedPath, undefined, entry.sourceFingerprint);
      await markIntakeEntry(repositoryRoot, run, entry.relativePath, "PROCESSING", { importId: record.importId });
      continue;
    }
    const record = await dispatchArticleImport(repositoryRoot, entry.importId, { ...options, maxSteps: 1 });
    if (record.stage === "LIVE" || record.stage === "QUARANTINED") {
      await markIntakeEntry(repositoryRoot, run, entry.relativePath, record.stage);
    } else if (record.continuation?.kind === "blocked") {
      const { scope, cause } = record.continuation;
      const blocker = { code: record.stage, stage: record.resumeStage ?? record.stage, message: cause };
      if (scope === "shared") return setIntakeBlocker(repositoryRoot, run, { ...blocker, scope });
      await markIntakeEntry(repositoryRoot, run, entry.relativePath, "BLOCKED", { blocker: { ...blocker, scope } });
    } else if (record.stage === "ROLLED_BACK" || record.continuation?.kind === "repair") {
      return loadIntakeRun(repositoryRoot, runId);
    }
  }
  const run = await loadIntakeRun(repositoryRoot, runId);
  return nextIntakeEntry(run) ? { ...run, dispatchOutcome: "STEP_LIMIT" } : run;
}
