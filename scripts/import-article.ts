import { cleanupImportGateHandoff, createArticleImport, executePendingImport, loadImport, upgradeImportEvidence, submitActivityOwnerDecision, submitImportDiagnosis, recoverWorkflowLease, clearImportBlocker, type ImportStageExecutor } from "../src/lib/article-import/engine";
import { createDispatchingImproveExecutor, dispatchArticleImport, dispatchIntakeRun, improvePending, type DispatchOptions } from "../src/lib/article-import/dispatch";
import { evidenceReference } from "../src/lib/article-import/execution-evidence";
import { readFile } from "node:fs/promises";
import { articleExecutionStage, assertPrimaryArticleCheckout, withArticleExecution, inspectArticlePreflight, type CapabilityProbe } from "../src/lib/article-import/preflight";
import { WORKFLOW_REVISION, WORKFLOW_SEQUENCE, workflowRequirements, stageInstructions, releaseSteps, verificationSteps } from "../src/lib/article-import/workflow-requirements";
import type { ExternalArticleImportV1 } from "../src/lib/article-import/contracts";
import { createSupervisedImportExecutor } from "../src/lib/article-import/supervised-executor";
import { createArticleResearchRegistryTransport, type ArticleResearchRegistryTransport } from "../src/lib/article-import/research-registry-transport";
import { inspectImportCompletion } from "../src/lib/article-import/completion";
import { clearIntakeBlocker, clearSharedIntakeBlocker, createIntakeRun, loadIntakeRun, markIntakeEntry, nextIntakeEntry, setIntakeBlocker, upgradeIntakeRun, reconcileIntakeEntry, checkIntakeRun, claimNextIntakeEntry } from "../src/lib/article-import/intake";
import { createSupervisedImproveExecutor, type ImproveExecutor } from "../src/lib/article-import/improve-supervisor";
import { NeonArticleReviewEvidenceRegistry } from "../src/lib/article-import/review-evidence-registry-neon";
import { reviewRetentionDependencyResolver, type ArticleReviewEvidenceRegistry } from "../src/lib/article-import/review-evidence-registry";

export type ImportCommand = { kind: "recover-lease"; leaseKind: "source" | "intake" | "import" | "publication"; key: string } | { kind: "describe-workflow" | "preflight" } | { kind: "upgrade-evidence" | "cleanup"; importId: string } | { kind: "cleanup-remedy"; importId: string; file: string } | { kind: "submit-diagnosis" | "submit-owner-decision"; importId: string; file: string } | { kind: "upgrade-intake" | "check-intake"; runId: string } | { kind: "reconcile-intake-entry"; runId: string; entry: string } | { kind: "source"; source: string } | { kind: "resume"; importId: string } | { kind: "check-completion"; importId: string } | { kind: "intake"; directory?: string } | { kind: "intake-resume" | "intake-status"; runId: string } | { kind: "intake-retry"; runId: string; importId?: string; recovery?: string } | { kind: "dispatch"; importId: string } | { kind: "dispatch-intake"; runId: string };

async function importExecutionStage(root: string, importId: string): Promise<string | undefined> {
  try { return articleExecutionStage(await loadImport(root, importId)); }
  catch { return undefined; }
}

async function intakeExecutionStage(root: string, runId: string): Promise<string | undefined> {
  try {
    const entry = nextIntakeEntry(await loadIntakeRun(root, runId));
    return entry?.importId ? importExecutionStage(root, entry.importId) : undefined;
  } catch { return undefined; }
}

function pendingExecutionOptions(root: string, probe: CapabilityProbe | undefined, improveExecutor: ImproveExecutor, reviewEvidenceRegistry: ArticleReviewEvidenceRegistry) {
  return {
    rejectBusy: true,
    improveExecutor,
    cleanup: { resolveRetentionDependencies: reviewRetentionDependencyResolver(reviewEvidenceRegistry) },
    executeStage: (stage: ExternalArticleImportV1["stage"], action: () => Promise<ExternalArticleImportV1>) =>
      withArticleExecution(root, action, probe, stage),
  };
}

export function parseImportCommand(argv: string[]): ImportCommand {
  if (argv[0] === "--recover-lease" && ["source", "intake", "import", "publication"].includes(argv[1]) && argv[2] === "--key" && argv[3]) return { kind: "recover-lease", leaseKind: argv[1] as "source" | "intake" | "import" | "publication", key: argv[3] };
  if (argv[0] === "--describe-workflow") return { kind: "describe-workflow" };
  if (argv[0] === "--preflight") return { kind: "preflight" };
  if (argv[0] === "--upgrade-evidence" && argv[1]) return { kind: "upgrade-evidence", importId: argv[1] };
  if (argv[0] === "--cleanup" && argv[1]) return { kind: "cleanup", importId: argv[1] };
  if (argv[0] === "--cleanup-remedy" && argv[1] && argv[2] === "--file" && argv[3]) return { kind: "cleanup-remedy", importId: argv[1], file: argv[3] };
  if (argv[0] === "--submit-diagnosis" && argv[1] && argv[2] === "--file" && argv[3]) return { kind: "submit-diagnosis", importId: argv[1], file: argv[3] };
  if (argv[0] === "--submit-owner-decision" && argv[1] && argv[2] === "--file" && argv[3]) return { kind: "submit-owner-decision", importId: argv[1], file: argv[3] };
  if (argv[0] === "--upgrade-intake" && argv[1]) return { kind: "upgrade-intake", runId: argv[1] };
  if (argv[0] === "--check-intake" && argv[1]) return { kind: "check-intake", runId: argv[1] };
  if (argv[0] === "--reconcile-intake-entry" && argv[1] && argv[2] === "--entry" && argv[3]) return { kind: "reconcile-intake-entry", runId: argv[1], entry: argv[3] };
  if (argv[0] === "--source" && argv[1]) return { kind: "source", source: argv[1] };
  if (argv[0] === "--resume") {
    const importId = argv.slice(1).find((argument) => argument !== "--resume" && !argument.startsWith("--"));
    if (importId) return { kind: "resume", importId };
  }
  if (argv[0] === "--check-completion" && argv[1]) return { kind: "check-completion", importId: argv[1] };
  if (argv[0] === "--intake") return { kind: "intake", directory: argv[1] && !argv[1].startsWith("--") ? argv[1] : undefined };
  if (argv[0] === "--intake-resume" && argv[1]) return { kind: "intake-resume", runId: argv[1] };
  if (argv[0] === "--intake-status" && argv[1]) return { kind: "intake-status", runId: argv[1] };
  if (argv[0] === "--intake-retry" && argv[1]) return { kind: "intake-retry", runId: argv[1], importId: argv[2], ...(argv[3] === "--recovery" && argv[4] ? { recovery: argv[4] } : {}) };
  if (argv[0] === "--dispatch" && argv[1]) return { kind: "dispatch", importId: argv[1] };
  if (argv[0] === "--dispatch-intake" && argv[1]) return { kind: "dispatch-intake", runId: argv[1] };
  throw new Error("Use --source <file> or --resume <import-id>.");
}

export async function executeImportCommand(root: string, command: ImportCommand, executor?: ImportStageExecutor, dispatchOptions?: DispatchOptions, probe?: CapabilityProbe): Promise<unknown> {
  const dispatch = () => dispatchImportCommand(root, command, executor, dispatchOptions, probe);
  if (["source", "resume", "intake", "intake-resume", "dispatch", "dispatch-intake"].includes(command.kind)) {
    return withArticleExecution(root, dispatch, probe, async () => {
      if (command.kind === "resume" || command.kind === "dispatch") return importExecutionStage(root, command.importId);
      if (command.kind === "intake-resume" || command.kind === "dispatch-intake") return intakeExecutionStage(root, command.runId);
      return undefined;
    });
  }
  if (!["describe-workflow", "preflight", "check-intake", "check-completion", "intake-status"].includes(command.kind)) await assertPrimaryArticleCheckout(root);
  return dispatch();
}

export async function executeImportRunnerCommand(
  root: string,
  command: ImportCommand,
  transport: ArticleResearchRegistryTransport = createArticleResearchRegistryTransport(),
  dispatchOptions: DispatchOptions = {},
  probe?: CapabilityProbe,
): Promise<unknown> {
  try {
    return await executeImportCommand(root, command, undefined, { ...dispatchOptions, researchRegistry: transport.registry }, probe);
  } finally {
    await transport.close();
  }
}

async function dispatchImportCommand(root: string, command: ImportCommand, executor?: ImportStageExecutor, dispatchOptions?: DispatchOptions, probe?: CapabilityProbe): Promise<unknown> {
  if (command.kind === "recover-lease") return recoverWorkflowLease(root, command.leaseKind, command.key);
  if (command.kind === "describe-workflow") return { requirementRevision: WORKFLOW_REVISION, sequence: WORKFLOW_SEQUENCE, requirements: workflowRequirements, instructions: stageInstructions, releaseSteps, verificationSteps };
  if (command.kind === "preflight") return inspectArticlePreflight(root, probe);
  if (command.kind === "check-intake") return checkIntakeRun(root, command.runId);
  if (command.kind === "upgrade-evidence") return upgradeImportEvidence(root, command.importId);
  if (command.kind === "upgrade-intake") return upgradeIntakeRun(root, command.runId);
  if (command.kind === "reconcile-intake-entry") return reconcileIntakeEntry(root, command.runId, command.entry);
  if (command.kind === "submit-diagnosis") return submitImportDiagnosis(root, command.importId, JSON.parse(await readFile(command.file, "utf8")));
  if (command.kind === "submit-owner-decision") return submitActivityOwnerDecision(root, command.importId, JSON.parse(await readFile(command.file, "utf8")));
  const reviewEvidenceRegistry = dispatchOptions?.reviewEvidenceRegistry ?? new NeonArticleReviewEvidenceRegistry();
  if (command.kind === "cleanup") return cleanupImportGateHandoff(root, command.importId, { resolveRetentionDependencies: reviewRetentionDependencyResolver(reviewEvidenceRegistry) });
  if (command.kind === "cleanup-remedy") return cleanupImportGateHandoff(root, command.importId, {
    resolveRetentionDependencies: reviewRetentionDependencyResolver(reviewEvidenceRegistry),
    remedyRef: await evidenceReference(root, command.file),
  });
  const execute = executor ?? dispatchOptions?.executor ?? createSupervisedImportExecutor(root, undefined, {
    researchRegistry: dispatchOptions?.researchRegistry,
    reviewEvidenceRegistry,
  });
  const improveExecutor = createDispatchingImproveExecutor(root, createSupervisedImproveExecutor(root), dispatchOptions);
  const resumeAfterGateCleanup = async (importId: string) => {
    const before = await loadImport(root, importId);
    let imported = await executePendingImport(root, importId, execute, pendingExecutionOptions(root, probe, improveExecutor, reviewEvidenceRegistry));
    const beforeCleanup = before.gateHandoffs?.at(-1)?.cleanup;
    const afterCleanup = imported.gateHandoffs?.at(-1)?.cleanup;
    if (imported.stage === before.stage && afterCleanup?.status === "verified" && JSON.stringify(afterCleanup) !== JSON.stringify(beforeCleanup)) {
      imported = await executePendingImport(root, importId, execute, pendingExecutionOptions(root, probe, improveExecutor, reviewEvidenceRegistry));
    }
    return imported;
  };
  const continueImprove = async (imported: ExternalArticleImportV1, importId: string) => {
    for (let step = 0; improvePending(imported) && !imported.improve?.pendingReview && step < 3; step += 1) {
      const prior = imported.stateRevision;
      imported = await executePendingImport(root, importId, execute, pendingExecutionOptions(root, probe, improveExecutor, reviewEvidenceRegistry));
      if (imported.stateRevision === prior) throw new Error("IMPROVE_NO_PROGRESS");
    }
    return imported;
  };
  if (command.kind === "source") {
    return createArticleImport(root, command.source);
  }
  if (command.kind === "check-completion") return inspectImportCompletion(root, command.importId);
  if (command.kind === "intake") return createIntakeRun(root, command.directory);
  if (command.kind === "intake-status") return loadIntakeRun(root, command.runId);
  if (command.kind === "dispatch") return dispatchArticleImport(root, command.importId, { ...dispatchOptions, executor: execute, reviewEvidenceRegistry, capabilityProbe: probe ?? dispatchOptions?.capabilityProbe });
  if (command.kind === "dispatch-intake") return dispatchIntakeRun(root, command.runId, { ...dispatchOptions, executor: execute, reviewEvidenceRegistry, capabilityProbe: probe ?? dispatchOptions?.capabilityProbe });
  if (command.kind === "intake-retry") {
    const run = await loadIntakeRun(root, command.runId);
    if (!command.importId) throw new Error("INTAKE_RETRY_IMPORT_REQUIRED");
    const entry = run.entries.find((item) => item.importId === command.importId);
    if (!entry) throw new Error("INTAKE_IMPORT_NOT_FOUND");
    if (run.blocker && run.activeEntry !== entry.relativePath) throw new Error("INTAKE_BLOCKER_IMPORT_MISMATCH");
    if (!command.recovery) throw new Error("INTAKE_RECOVERY_EVIDENCE_REQUIRED");
    await clearImportBlocker(root, command.importId, await evidenceReference(root, command.recovery));
    // Import lease is released before intake mutation; the snapshot is reloaded by the mutator.
    if (run.blocker) return clearSharedIntakeBlocker(root, run, entry.relativePath, command.importId);
    const updated = await clearIntakeBlocker(root, run, entry.relativePath);
    return { ...updated, nextEntry: updated.entries.find((item) => item.relativePath === entry.relativePath) };
  }
  if (command.kind === "intake-resume") {
    const { run, entry } = await claimNextIntakeEntry(root, command.runId);
    if (!entry) return run;
    if (!entry.capturedPath || !entry.sourceFingerprint) return setIntakeBlocker(root, run, { scope: "shared", code: "CAPTURE_MISSING", message: `No immutable source copy was captured for ${entry.relativePath}.` });
    if (entry.status === "PROCESSING" && entry.importId) {
      let imported = await resumeAfterGateCleanup(entry.importId);
      imported = await continueImprove(imported, entry.importId);
      if ((imported.stage === "LIVE" && !improvePending(imported)) || imported.stage === "QUARANTINED") {
        const terminal = await markIntakeEntry(root, run, entry.relativePath, imported.stage);
        return { ...terminal, importState: imported };
      }
      if (imported.blockerScope === "shared") return setIntakeBlocker(root, run, { scope: "shared", code: imported.stage, stage: imported.resumeStage ?? imported.stage, message: imported.nextAction });
      if (imported.continuation?.kind === "blocked" && imported.continuation.scope === "article") {
        const blocked = await markIntakeEntry(root, run, entry.relativePath, "BLOCKED", { blocker: { scope: "article", code: imported.stage, stage: imported.resumeStage ?? imported.stage, message: imported.nextAction } });
        return { ...blocked, importState: imported };
      }
      return { ...run, activeEntry: entry.relativePath, nextEntry: entry, importState: imported };
    }
    const imported = await createArticleImport(root, entry.capturedPath, undefined, entry.sourceFingerprint);
    const saved = await markIntakeEntry(root, run, entry.relativePath, imported.stage === "QUARANTINED" ? "QUARANTINED" : "PROCESSING", { importId: imported.importId });
    return { ...saved, nextEntry: saved.entries.find((item) => item.relativePath === entry.relativePath) };
  }
  if (command.kind === "resume") {
    const imported = await resumeAfterGateCleanup(command.importId);
    return continueImprove(imported, command.importId);
  }
  throw new Error("An explicit import ID is required to resume an article import.");
}

async function main(): Promise<void> {
  const command = parseImportCommand(process.argv.slice(2));
  const result = await executeImportRunnerCommand(process.cwd(), command);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (command.kind === "dispatch") {
    const record = result as ExternalArticleImportV1;
    process.exitCode = record.continuation?.kind === "blocked" ? 20 : ["LIVE", "QUARANTINED"].includes(record.stage) ? 0 : 10;
  }
  if (command.kind === "dispatch-intake") {
    const run = result as Awaited<ReturnType<typeof dispatchIntakeRun>>;
    process.exitCode = run.blocker ? 20 : run.outcome === "OPEN" ? 10 : 0;
  }
  if (command.kind === "check-completion") process.exitCode = ({ COMPLETE: 0, WORK: 10, REPAIR: 10, WAIT: 10, BLOCKED: 20 } as Record<string, number>)[(result as { status: string }).status] ?? 30;
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("/scripts/import-article.ts")) {
  const command = (() => {
    try { return parseImportCommand(process.argv.slice(2)); } catch { return undefined; }
  })();
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = command?.kind === "check-completion" ? 30 : 1;
  });
}
