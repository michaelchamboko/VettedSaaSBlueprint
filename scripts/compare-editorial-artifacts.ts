import { spawnSync } from "node:child_process";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { compareEditorialArtifacts, createEditorialEvidence, editorialProse } from "../src/lib/editorial/refinement";

async function main() {
  const [format, beforeFile, afterFile, notesFile, receiptFile] = process.argv.slice(2);
  if (!format || !beforeFile || !afterFile || !notesFile || !receiptFile) {
    throw new Error("Usage: tsx scripts/compare-editorial-artifacts.ts <decision|landing|blog|visibility> <before.json> <after.json> <notes.json> <build-pack/editorial/receipt.json>");
  }
  const outputRoot = path.resolve("build-pack/editorial");
  const output = path.resolve(receiptFile);
  const relative = path.relative(outputRoot, output);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative) || !output.endsWith(".json")) {
    throw new Error("Editorial evidence must be a JSON file under build-pack/editorial, outside public content.");
  }
  const readJson = async (file: string) => JSON.parse(await readFile(file, "utf8"));
  const before = await readJson(beforeFile);
  const after = await readJson(afterFile);
  compareEditorialArtifacts(format, before, after);
  function check(value: unknown): string {
    const result = spawnSync(process.env.PYTHON ?? "python", [".agents/skills/eleanor-editorial/tools/deslop.py", "--text", editorialProse(format, value)], { encoding: "utf8", env: { ...process.env, PYTHONIOENCODING: "utf-8" } });
    if (result.error || ![0, 1].includes(result.status ?? -1) || !result.stdout.includes("score ")) {
      throw new Error(`Editorial checker did not complete: ${result.error?.message ?? result.stderr}`);
    }
    return result.stdout;
  }
  const evidence = createEditorialEvidence(format, before, after, await readJson(notesFile), { before: check(before), after: check(after) });
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(evidence, null, 2) + "\n", { flag: "wx" });
  console.log(`Editorial comparison recorded: ${receiptFile}; ${evidence.changedPaths.length} prose changes. Semantic review remains a human responsibility.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
