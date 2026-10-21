import { createArticleImport, listPendingImports, loadImport } from "../src/lib/article-import/engine";

function value(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main(): Promise<void> {
  const command = process.argv[2];
  const root = process.cwd();
  if (command === "--source") {
    const source = value("--source");
    if (!source) throw new Error("--source requires a Markdown file.");
    process.stdout.write(`${JSON.stringify(await createArticleImport(root, source), null, 2)}\n`);
    return;
  }
  if (command === "--resume") {
    const importId = value("--resume");
    if (!importId) throw new Error("--resume requires an import ID.");
    process.stdout.write(`${JSON.stringify(await loadImport(root, importId), null, 2)}\n`);
    return;
  }
  if (command === "--resume-pending") {
    process.stdout.write(`${JSON.stringify(await listPendingImports(root), null, 2)}\n`);
    return;
  }
  throw new Error("Use --source <file>, --resume <import-id>, or --resume-pending.");
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
