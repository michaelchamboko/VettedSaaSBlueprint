import { createArticleImport, executePendingImport, type ImportStageExecutor } from "../src/lib/article-import/engine";
import type { ExternalArticleImportV1 } from "../src/lib/article-import/contracts";
import { createSupervisedImportExecutor } from "../src/lib/article-import/supervised-executor";
import { clearIntakeBlocker, clearSharedIntakeBlocker, createIntakeRun, loadIntakeRun, markIntakeEntry, nextIntakeEntry, setIntakeBlocker } from "../src/lib/article-import/intake";

export type ImportCommand = { kind: "source"; source: string } | { kind: "resume"; importId: string } | { kind: "intake"; directory?: string } | { kind: "intake-resume" | "intake-status"; runId: string } | { kind: "intake-retry"; runId: string; importId?: string };

export function parseImportCommand(argv: string[]): ImportCommand {
  if (argv[0] === "--source" && argv[1]) return { kind: "source", source: argv[1] };
  if (argv[0] === "--resume") {
    const importId = argv.slice(1).find((argument) => argument !== "--resume" && !argument.startsWith("--"));
    if (importId) return { kind: "resume", importId };
  }
  if (argv[0] === "--intake") return { kind: "intake", directory: argv[1] && !argv[1].startsWith("--") ? argv[1] : undefined };
  if (argv[0] === "--intake-resume" && argv[1]) return { kind: "intake-resume", runId: argv[1] };
  if (argv[0] === "--intake-status" && argv[1]) return { kind: "intake-status", runId: argv[1] };
  if (argv[0] === "--intake-retry" && argv[1]) return { kind: "intake-retry", runId: argv[1], importId: argv[2] };
  throw new Error("Use --source <file> or --resume <import-id>.");
}

export async function executeImportCommand(root: string, command: ImportCommand, executor?: ImportStageExecutor): Promise<unknown> {
  const execute = executor ?? createSupervisedImportExecutor(root);
  if (command.kind === "source") {
    return createArticleImport(root, command.source);
  }
  if (command.kind === "intake") return createIntakeRun(root, command.directory);
  if (command.kind === "intake-status") return loadIntakeRun(root, command.runId);
  if (command.kind === "intake-retry") {
    const run = await loadIntakeRun(root, command.runId);
    if (!command.importId && run.blocker) return clearSharedIntakeBlocker(root, run);
    if (!command.importId) throw new Error("INTAKE_RETRY_IMPORT_REQUIRED");
    const entry = run.entries.find((item) => item.importId === command.importId);
    if (!entry) throw new Error("INTAKE_IMPORT_NOT_FOUND");
    const updated = await clearIntakeBlocker(root, run, entry.relativePath);
    return { ...updated, nextEntry: updated.entries.find((item) => item.relativePath === entry.relativePath) };
  }
  if (command.kind === "intake-resume") {
    let run = await loadIntakeRun(root, command.runId);
    const entry = nextIntakeEntry(run);
    if (!entry) return run;
      if (!entry.capturedPath) return setIntakeBlocker(root, run, { scope: "shared", code: "CAPTURE_MISSING", message: `No immutable source copy was captured for ${entry.relativePath}.` });
    if (entry.status === "PROCESSING" && !entry.importId) return setIntakeBlocker(root, run, { scope: "shared", code: "PROCESSING_IMPORT_MISSING", message: `Processing entry ${entry.relativePath} has no bound import.` });
    if (entry.status === "PROCESSING" && entry.importId) {
      const imported = await executeImportCommand(root, { kind: "resume", importId: entry.importId }, executor) as ExternalArticleImportV1;
      if (imported.stage === "LIVE" || imported.stage === "QUARANTINED") {
        const terminal = await markIntakeEntry(root, run, entry.relativePath, imported.stage);
        return { ...terminal, importState: imported };
      }
      if (imported.stage === "REPAIRING" || imported.stage === "WAITING_EXTERNAL") {
        const shared = imported.blockerScope === "shared";
        if (shared) return setIntakeBlocker(root, run, { scope: "shared", code: imported.stage, stage: imported.resumeStage ?? imported.stage, message: imported.nextAction });
        const blocked = await markIntakeEntry(root, run, entry.relativePath, "BLOCKED", { blocker: { scope: "article", code: imported.stage, stage: imported.resumeStage ?? imported.stage, message: imported.nextAction } });
        return { ...blocked, importState: imported };
      }
      return { ...run, activeEntry: entry.relativePath, nextEntry: { ...entry, status: "PROCESSING", importId: entry.importId }, importState: imported };
    }
    const imported = await createArticleImport(root, entry.capturedPath);
    run = await markIntakeEntry(root, run, entry.relativePath, imported.stage === "QUARANTINED" ? "QUARANTINED" : "PROCESSING", { importId: imported.importId });
    return { ...run, nextEntry: { ...entry, importId: imported.importId, status: run.entries.find((item) => item.relativePath === entry.relativePath)?.status } };
  }
  if (command.kind === "resume") return executePendingImport(root, command.importId, execute);
  throw new Error("An explicit import ID is required to resume an article import.");
}

async function main(): Promise<void> {
  const command = parseImportCommand(process.argv.slice(2));
  process.stdout.write(`${JSON.stringify(await executeImportCommand(process.cwd(), command), null, 2)}\n`);
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("/scripts/import-article.ts")) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
