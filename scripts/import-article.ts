import { createArticleImport, executePendingImport, type ImportStageExecutor } from "../src/lib/article-import/engine";
import { createSupervisedImportExecutor } from "../src/lib/article-import/supervised-executor";
import { createIntakeRun, loadIntakeRun, markIntakeEntry, nextIntakeEntry } from "../src/lib/article-import/intake";

export type ImportCommand = { kind: "source"; source: string } | { kind: "resume"; importId: string } | { kind: "intake"; directory?: string } | { kind: "intake-resume" | "intake-status"; runId: string };

export function parseImportCommand(argv: string[]): ImportCommand {
  if (argv[0] === "--source" && argv[1]) return { kind: "source", source: argv[1] };
  if (argv[0] === "--resume") {
    const importId = argv.slice(1).find((argument) => argument !== "--resume" && !argument.startsWith("--"));
    if (importId) return { kind: "resume", importId };
  }
  if (argv[0] === "--intake") return { kind: "intake", directory: argv[1] && !argv[1].startsWith("--") ? argv[1] : undefined };
  if (argv[0] === "--intake-resume" && argv[1]) return { kind: "intake-resume", runId: argv[1] };
  if (argv[0] === "--intake-status" && argv[1]) return { kind: "intake-status", runId: argv[1] };
  throw new Error("Use --source <file> or --resume <import-id>.");
}

export async function executeImportCommand(root: string, command: ImportCommand, executor?: ImportStageExecutor): Promise<unknown> {
  if (command.kind === "source") {
    return createArticleImport(root, command.source);
  }
  if (command.kind === "intake") return createIntakeRun(root, command.directory);
  if (command.kind === "intake-status") return loadIntakeRun(root, command.runId);
  if (command.kind === "intake-resume") {
    let run = await loadIntakeRun(root, command.runId);
    const entry = nextIntakeEntry(run);
    if (!entry) return run;
    if (!entry.capturedPath) return markIntakeEntry(root, run, entry.relativePath, "BLOCKED", { reason: "No immutable source copy was captured." });
    const imported = await createArticleImport(root, entry.capturedPath);
    run = await markIntakeEntry(root, run, entry.relativePath, imported.stage === "QUARANTINED" ? "QUARANTINED" : "PROCESSING", { importId: imported.importId });
    return { ...run, nextEntry: { ...entry, importId: imported.importId, status: run.entries.find((item) => item.relativePath === entry.relativePath)?.status } };
  }
  const execute = executor ?? createSupervisedImportExecutor(root);
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
