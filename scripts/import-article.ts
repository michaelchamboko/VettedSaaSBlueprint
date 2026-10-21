import { createArticleImport, listPendingImports, loadImport } from "../src/lib/article-import/engine";

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

async function main(): Promise<void> {
  const command = parseImportCommand(process.argv.slice(2));
  const root = process.cwd();
  if (command.kind === "source") {
    process.stdout.write(`${JSON.stringify(await createArticleImport(root, command.source), null, 2)}\n`);
    return;
  }
  if (command.kind === "resume") {
    process.stdout.write(`${JSON.stringify(await loadImport(root, command.importId), null, 2)}\n`);
    return;
  }
  if (command.kind === "resume-pending") {
    process.stdout.write(`${JSON.stringify(await listPendingImports(root), null, 2)}\n`);
    return;
  }
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("/scripts/import-article.ts")) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
