import { createArticleImport, executePendingImport, upgradeImportEvidence, submitImportDiagnosis, recoverWorkflowLease, clearImportBlocker, type ImportStageExecutor } from "../src/lib/article-import/engine";
import { evidenceReference } from "../src/lib/article-import/execution-evidence";
import { readFile } from "node:fs/promises";
import { assertPrimaryArticleCheckout, assertArticleCapabilities, inspectArticlePreflight, type CapabilityProbe } from "../src/lib/article-import/preflight";
import { WORKFLOW_REVISION, WORKFLOW_SEQUENCE, workflowRequirements, stageInstructions } from "../src/lib/article-import/workflow-requirements";
import type { ExternalArticleImportV1 } from "../src/lib/article-import/contracts";
import { createSupervisedImportExecutor } from "../src/lib/article-import/supervised-executor";
import { inspectImportCompletion } from "../src/lib/article-import/completion";
import { clearIntakeBlocker, clearSharedIntakeBlocker, createIntakeRun, loadIntakeRun, markIntakeEntry, nextIntakeEntry, setIntakeBlocker, upgradeIntakeRun, reconcileIntakeEntry, checkIntakeRun, claimNextIntakeEntry } from "../src/lib/article-import/intake";

export type ImportCommand = { kind: "recover-lease"; leaseKind: "source" | "intake" | "import"; key: string } | { kind: "describe-workflow" | "preflight" } | { kind: "upgrade-evidence"; importId: string } | { kind: "submit-diagnosis"; importId: string; file: string } | { kind: "upgrade-intake" | "check-intake"; runId: string } | { kind: "reconcile-intake-entry"; runId: string; entry: string } | { kind: "source"; source: string } | { kind: "resume"; importId: string } | { kind: "check-completion"; importId: string } | { kind: "intake"; directory?: string } | { kind: "intake-resume" | "intake-status"; runId: string } | { kind: "intake-retry"; runId: string; importId?: string; recovery?: string };

export function parseImportCommand(argv: string[]): ImportCommand {
  if (argv[0] === "--recover-lease" && ["source", "intake", "import"].includes(argv[1]) && argv[2] === "--key" && argv[3]) return { kind: "recover-lease", leaseKind: argv[1] as "source" | "intake" | "import", key: argv[3] };
  if (argv[0] === "--describe-workflow") return { kind: "describe-workflow" };
  if (argv[0] === "--preflight") return { kind: "preflight" };
  if (argv[0] === "--upgrade-evidence" && argv[1]) return { kind: "upgrade-evidence", importId: argv[1] };
  if (argv[0] === "--submit-diagnosis" && argv[1] && argv[2] === "--file" && argv[3]) return { kind: "submit-diagnosis", importId: argv[1], file: argv[3] };
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
  throw new Error("Use --source <file> or --resume <import-id>.");
}

export async function executeImportCommand(root: string, command: ImportCommand, executor?: ImportStageExecutor, probe?: CapabilityProbe): Promise<unknown> {
  const readOnly = ["describe-workflow", "preflight", "check-intake", "check-completion", "intake-status"].includes(command.kind);
  if (!readOnly) await assertPrimaryArticleCheckout(root);
  if (["source", "resume", "intake", "intake-resume"].includes(command.kind)) await assertArticleCapabilities(root, probe);

  if (command.kind === "recover-lease") return recoverWorkflowLease(root, command.leaseKind, command.key);
  if (command.kind === "describe-workflow") return { requirementRevision: WORKFLOW_REVISION, sequence: WORKFLOW_SEQUENCE, requirements: workflowRequirements, instructions: stageInstructions };
  if (command.kind === "preflight") return inspectArticlePreflight(root, probe);
  if (command.kind === "check-intake") return checkIntakeRun(root, command.runId);
  if (command.kind === "upgrade-evidence") return upgradeImportEvidence(root, command.importId);
  if (command.kind === "upgrade-intake") return upgradeIntakeRun(root, command.runId);
  if (command.kind === "reconcile-intake-entry") return reconcileIntakeEntry(root, command.runId, command.entry);
  if (command.kind === "submit-diagnosis") return submitImportDiagnosis(root, command.importId, JSON.parse(await readFile(command.file, "utf8")));
  const execute = executor ?? createSupervisedImportExecutor(root);
  if (command.kind === "source") {
    return createArticleImport(root, command.source);
  }
  if (command.kind === "check-completion") return inspectImportCompletion(root, command.importId);
  if (command.kind === "intake") return createIntakeRun(root, command.directory);
  if (command.kind === "intake-status") return loadIntakeRun(root, command.runId);
  if (command.kind === "intake-retry") {
    const run = await loadIntakeRun(root, command.runId);
    if (!command.importId) throw new Error("INTAKE_RETRY_IMPORT_REQUIRED");
    const entry = run.entries.find((item) => item.importId === command.importId);
    if (!entry) throw new Error("INTAKE_IMPORT_NOT_FOUND");
    if (!command.recovery) throw new Error("INTAKE_RECOVERY_EVIDENCE_REQUIRED");
    await clearImportBlocker(root, command.importId, await evidenceReference(root, command.recovery));
    // Import lease is released before intake mutation; the snapshot is reloaded by the mutator.
    if (run.blocker) return clearSharedIntakeBlocker(root, run);
    const updated = await clearIntakeBlocker(root, run, entry.relativePath);
    return { ...updated, nextEntry: updated.entries.find((item) => item.relativePath === entry.relativePath) };
  }
  if (command.kind === "intake-resume") {
    const check = await checkIntakeRun(root, command.runId);
    if (!check.ok) throw new Error(`INTAKE_TERMINAL_PROOF_INVALID: ${JSON.stringify(check)}`);
    let run = await claimNextIntakeEntry(root, command.runId);
    const entry = nextIntakeEntry(run);
    if (!entry) return run;
      if (!entry.capturedPath) return setIntakeBlocker(root, run, { scope: "shared", code: "CAPTURE_MISSING", message: `No immutable source copy was captured for ${entry.relativePath}.` });
    if (entry.status === "PROCESSING" && entry.importId) {
      const imported = await executeImportCommand(root, { kind: "resume", importId: entry.importId }, executor, probe) as ExternalArticleImportV1;
      if (imported.stage === "LIVE" || imported.stage === "QUARANTINED") {
        const terminal = await markIntakeEntry(root, run, entry.relativePath, imported.stage);
        return { ...terminal, importState: imported };
      }
      if (imported.blockerScope === "shared") return setIntakeBlocker(root, run, { scope: "shared", code: imported.stage, stage: imported.resumeStage ?? imported.stage, message: imported.nextAction });
      if (imported.continuation?.kind === "blocked" && imported.continuation.scope === "article") {
        const blocked = await markIntakeEntry(root, run, entry.relativePath, "BLOCKED", { blocker: { scope: "article", code: imported.stage, stage: imported.resumeStage ?? imported.stage, message: imported.nextAction } });
        return { ...blocked, importState: imported };
      }
      return { ...run, activeEntry: entry.relativePath, nextEntry: { ...entry, status: "PROCESSING", importId: entry.importId }, importState: imported };
    }
    const imported = await createArticleImport(root, entry.capturedPath);
    run = await markIntakeEntry(root, run, entry.relativePath, imported.stage === "QUARANTINED" ? "QUARANTINED" : "PROCESSING", { importId: imported.importId });
    return { ...run, nextEntry: { ...entry, importId: imported.importId, status: run.entries.find((item) => item.relativePath === entry.relativePath)?.status } };
  }
  if (command.kind === "resume") return executePendingImport(root, command.importId, execute, "reject");
  throw new Error("An explicit import ID is required to resume an article import.");
}

async function main(): Promise<void> {
  const command = parseImportCommand(process.argv.slice(2));
  const result = await executeImportCommand(process.cwd(), command);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
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
