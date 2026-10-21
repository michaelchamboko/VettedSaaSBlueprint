import { createArticleImport, executePendingImport, resumePendingImports, type ImportStageExecutor } from "../src/lib/article-import/engine";
import { createSupervisedImportExecutor } from "../src/lib/article-import/supervised-executor";

export type ImportCommand = { kind: "source"; source: string } | { kind: "resume"; importId: string } | { kind: "resume-pending" };

export function parseImportCommand(argv: string[]): ImportCommand {
  if (argv[0] === "--source" && argv[1]) return { kind: "source", source: argv[1] };
  if (argv[0] === "--resume-pending") return { kind: "resume-pending" };
  if (argv[0] === "--resume") {
    const importId = argv.slice(1).find((argument) => argument !== "--resume" && !argument.startsWith("--"));
    if (importId) return { kind: "resume", importId };
  }
  throw new Error("Use --source <file>, --resume <import-id>, or --resume-pending.");
}

export async function executeImportCommand(root: string, command: ImportCommand, executor?: ImportStageExecutor): Promise<unknown> {
  if (command.kind === "source") {
    return createArticleImport(root, command.source);
  }
  const execute = executor ?? createSupervisedImportExecutor(root);
  if (command.kind === "resume") return executePendingImport(root, command.importId, execute);
  return resumePendingImports(root, execute);
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
