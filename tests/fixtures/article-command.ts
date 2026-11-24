import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { executeImportCommand, type ImportCommand } from "../../scripts/import-article";
import { withImportLease, saveImport, type ImportStageExecutor } from "../../src/lib/article-import/engine";

import type { ExternalArticleImportV1 } from "../../src/lib/article-import/contracts";

export async function persistFixture(root: string, record: ExternalArticleImportV1) {
  await withImportLease(root, record.importId, () => saveImport(root, record));
  return record;
}

export async function prepareCommandCheckout(root: string) {
  if (!(await stat(path.join(root, ".git")).catch(() => undefined))) {
    await promisify(execFile)("git", ["init", "--quiet", root], { windowsHide: true });
  }
  const exclude = path.join(root, ".git/info/exclude");
  const rules = await readFile(exclude, "utf8");
  if (!rules.includes("/.automation/article-imports/")) await writeFile(exclude, rules + "\n/.automation/article-imports/\n");
  const manifest = path.join(root, "config/article-workflow-capabilities.json");
  if (await stat(manifest).catch(() => undefined)) return;
  const bytes = "Synthetic skill for command preflight.";
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const files = [];
  for (const skill of ["impeccable", "design-taste-frontend", "eleanor-editorial"]) {
    const file = `.agents/skills/${skill}/SKILL.md`;
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await writeFile(path.join(root, file), bytes);
    files.push({ path: file, sha256 });
  }
  await mkdir(path.dirname(manifest), { recursive: true });
  await writeFile(manifest, JSON.stringify({ schemaVersion: "ArticleWorkflowCapabilitiesV1", openCodeVersion: "2.2.6", modelFamilies: { "opencode-go/beam-free": "beam" }, files }));
}

export function fixtureProbe(root: string) {
  return async (tool: string) => {
    if (tool === "python") return "Python 3.13.0";
    const manifest = JSON.parse(await readFile(path.join(root, "config/article-workflow-capabilities.json"), "utf8"));
    return manifest.openCodeVersion as string;
  };
}

export async function executeFixtureCommand(root: string, command: ImportCommand, executor?: ImportStageExecutor, options?: Parameters<typeof executeImportCommand>[3]) {
  await prepareCommandCheckout(root);
  return executeImportCommand(root, command, executor, options, fixtureProbe(root));
}
