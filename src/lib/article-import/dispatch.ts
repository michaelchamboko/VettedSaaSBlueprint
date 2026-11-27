import { articleExecutionStage, withArticleExecution, type CapabilityProbe } from "./preflight";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createArticleImport, executePendingImport, loadImport, recordImportRepair, saveImport, type ImportStageExecutor } from "./engine";
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
import type { ArticleResearchRegistry } from "./research-registry";
import { createSupervisedImproveExecutor, type ImproveExecutor } from "./improve-supervisor";
import { readCurrentArticleHeroRejection } from "./hero-image";
import type { ArticleReviewEvidenceRegistry } from "./review-evidence-registry";
import { NeonArticleReviewEvidenceRegistry } from "./review-evidence-registry-neon";

export type DispatchOptions = WorkerOptions & {
  maxSteps?: number;
  executor?: ImportStageExecutor;
  capabilityProbe?: CapabilityProbe;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  researchRegistry?: ArticleResearchRegistry;
  reviewEvidenceRegistry?: ArticleReviewEvidenceRegistry;
};

function isTerminalStage(stage: string): boolean {
  return stage === "LIVE" || stage === "QUARANTINED";
}

export function improvePending(record: ExternalArticleImportV1): boolean {
  return record.stage === "LIVE" && !!record.improve && !["COMPLETE", "BLOCKED"].includes(record.improve.phase);
}

async function importExecutionStage(repositoryRoot: string, importId: string): Promise<string | undefined> {
  try { return articleExecutionStage(await loadImport(repositoryRoot, importId)); }
  catch { return undefined; }
}

async function intakeExecutionStage(repositoryRoot: string, runId: string): Promise<string | undefined> {
  try {
    const entry = nextIntakeEntry(await loadIntakeRun(repositoryRoot, runId));
    return entry?.importId ? importExecutionStage(repositoryRoot, entry.importId) : undefined;
  } catch { return undefined; }
}

function pendingExecutionOptions(repositoryRoot: string, options: DispatchOptions | undefined, improveExecutor: ImproveExecutor) {
  return {
    rejectBusy: true,
    improveExecutor,
    executeStage: (stage: ExternalArticleImportV1["stage"], action: () => Promise<ExternalArticleImportV1>) =>
      withArticleExecution(repositoryRoot, action, options?.capabilityProbe, stage),
  };
}

export function createDispatchingImproveExecutor(root: string, baseExecutor: ImproveExecutor, options?: DispatchOptions): ImproveExecutor {
  return async (context) => {
    const first = await baseExecutor(context);
    const assignment = first.improve;
    if (!assignment?.workPath || !assignment.resultPath || ["COMPLETE", "BLOCKED"].includes(assignment.phase)) return first;
    const packet = JSON.parse(await readFile(path.resolve(root, assignment.workPath), "utf8")) as Record<string, unknown>;
    if (packet.stage !== "IMPROVE" || packet.importId !== context.record.importId || packet.publicationKey !== assignment.publicationKey ||
        packet.boundCommitSha !== assignment.boundCommitSha || packet.resultPath !== assignment.resultPath) throw new Error("STATE_INTEGRITY: IMPROVE work packet binding mismatch");
    await context.assertLease();
    await saveImport(root, first);
    await invokeWorker(root, assignment.workPath, assignment.resultPath, packet, context.leaseToken, context.assertLease, options);
    return baseExecutor({ ...context, record: first, assignment });
  };
}

export function createDispatchingExecutor(root: string, baseExecutor: ImportStageExecutor, options?: DispatchOptions): ImportStageExecutor {
  return async (context) => {
    const consumeHeroRejection = async () => {
      const current = await loadImport(root, context.record.importId);
      if (context.stage !== "VALIDATING" || !current.heroImage || !current.evidenceRefs?.hero) return undefined;
      const rejection = await readCurrentArticleHeroRejection(root, { importId: current.importId, sourceFingerprint: current.sourceFingerprint,
        idempotencyKey: context.idempotencyKey, heroEvidenceRef: current.evidenceRefs.hero, binding: current.heroImage });
      if (!rejection) return undefined;
      return recordImportRepair(root, current, { strategy: context.strategy, message: "ARTICLE_HERO_VISUAL_INSPECTION_FAILED",
        verifiedHeroRejection: { decisionRef: rejection.decisionRef, heroEvidenceRef: rejection.heroEvidenceRef,
          assetRef: rejection.binding.assetRef, generationRef: rejection.binding.generationRef } });
    };
    // A controller restart may leave both the worker result and the rejection receipt.
    // Consume the generation-bound rejection before a cached result can be trusted.
    const priorRejection = await consumeHeroRejection();
    if (priorRejection) return priorRejection;
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
    if (packet.supervisedHandoff === "chatgpt-imagegen") return first;
    try {
      await invokeWorker(root, workPath, resultPath, packet, context.leaseToken, context.assertLease, options);
    } catch (error) {
      const rejected = await consumeHeroRejection();
      if (rejected) return rejected;
      throw error;
    }
    const rejected = await consumeHeroRejection();
    if (rejected) return rejected;

    return baseExecutor({ ...context, record: first });
  };
}

export function dispatchArticleImport(repositoryRoot: string, importId: string, options?: DispatchOptions) {
  return withArticleExecution(
    repositoryRoot,
    () => runImportSteps(repositoryRoot, importId, options),
    options?.capabilityProbe,
    () => importExecutionStage(repositoryRoot, importId),
  );
}

async function runImportSteps(
  repositoryRoot: string,
  importId: string,
  options?: DispatchOptions,
): Promise<ExternalArticleImportV1 & { dispatchOutcome?: "STEP_LIMIT" }> {
  const baseExecutor = options?.executor ?? createSupervisedImportExecutor(repositoryRoot, undefined, { researchRegistry: options?.researchRegistry, reviewEvidenceRegistry: options?.reviewEvidenceRegistry ?? new NeonArticleReviewEvidenceRegistry() });
  const execute = createDispatchingExecutor(repositoryRoot, baseExecutor, options);
  const improveExecutor = createDispatchingImproveExecutor(repositoryRoot, createSupervisedImproveExecutor(repositoryRoot), options);
  const now = options?.now ?? (() => Date.now());
  const sleep = options?.sleep ?? (async (ms: number) => { await new Promise((resolve) => setTimeout(resolve, ms)); });
  const maxSteps = dispatchLimit(options);
  let current = await loadImport(repositoryRoot, importId);
  for (let step = 0; step < maxSteps; step += 1) {
    if (isTerminalStage(current.stage) && !improvePending(current)) return executePendingImport(repositoryRoot, importId, execute, pendingExecutionOptions(repositoryRoot, options, improveExecutor));
    if (current.stage === "ROLLED_BACK" || current.continuation?.kind === "blocked") return current;
    if (current.continuation?.kind === "wait") {
      const due = Math.min(Date.parse(current.continuation.nextCheckAt), Date.parse(current.continuation.timeoutAt));
      if (now() < due) await sleep(due - now());
      if (now() < due) return current;
    }
    const previous = current;
    current = await executePendingImport(repositoryRoot, importId, execute, pendingExecutionOptions(repositoryRoot, options, improveExecutor));
    if (current.improve?.pendingReview) return current;
    if ((isTerminalStage(current.stage) && !improvePending(current)) || current.continuation?.kind === "blocked" || current.continuation?.kind === "repair" ||
        JSON.stringify(current) === JSON.stringify(previous)) return current;
  }
  return { ...current, dispatchOutcome: "STEP_LIMIT" };
}

function dispatchLimit(options?: DispatchOptions): number {
  const limit = options?.maxSteps ?? 1000;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 10000) throw new Error("INVALID_DISPATCH_LIMIT");
  return limit;
}

export function dispatchIntakeRun(repositoryRoot: string, runId: string, options?: DispatchOptions) {
  return withArticleExecution(
    repositoryRoot,
    () => runIntakeSteps(repositoryRoot, runId, options),
    options?.capabilityProbe,
    () => intakeExecutionStage(repositoryRoot, runId),
  );
}

async function runIntakeSteps(
  repositoryRoot: string,
  runId: string,
  options?: DispatchOptions,
): Promise<IntakeRun & { dispatchOutcome?: "STEP_LIMIT" }> {
  const maxSteps = dispatchLimit(options);
  for (let step = 0; step < maxSteps; step += 1) {
    const { run, entry } = await claimNextIntakeEntry(repositoryRoot, runId);
    if (!entry) return run;
    if (!entry.importId) {
      if (!entry.capturedPath || !entry.sourceFingerprint) throw new Error("INTAKE_SOURCE_MISSING");
      const record = await createArticleImport(repositoryRoot, entry.capturedPath, undefined, entry.sourceFingerprint);
      await markIntakeEntry(repositoryRoot, run, entry.relativePath, "PROCESSING", { importId: record.importId });
      continue;
    }
    const record = await dispatchArticleImport(repositoryRoot, entry.importId, { ...options, maxSteps: 1 });
    if (record.improve?.pendingReview && record.improve.phase !== "BLOCKED") return loadIntakeRun(repositoryRoot, runId);
    if ((record.stage === "LIVE" && !improvePending(record)) || record.stage === "QUARANTINED") {
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
