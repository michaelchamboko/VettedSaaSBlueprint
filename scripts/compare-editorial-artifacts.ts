import { spawnSync } from "node:child_process";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { compareEditorialArtifacts, createEditorialEvidence, editorialProse, EDITORIAL_REVISION } from "../src/lib/editorial/refinement";
import { editorialExecutionSchema, evidenceReference, storeEvidence, validateEditorialExecution } from "../src/lib/article-import/workflow-evidence";

async function main() {
  const [format, beforeFile, afterFile, notesFile, receiptFile, executionManifestFile] = process.argv.slice(2);
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
  function check(value: unknown) {
    const executable = process.env.PYTHON ?? "python";
    const argv = [".agents/skills/eleanor-editorial/tools/deslop.py", "--text", editorialProse(format, value)];
    const startedAt = new Date().toISOString();
    const result = spawnSync(executable, argv, { encoding: "utf8", timeout: 120_000, maxBuffer: 16 * 1024 * 1024, windowsHide: true, env: { ...process.env, PYTHONIOENCODING: "utf-8" } });
    if (result.error || ![0, 1].includes(result.status ?? -1) || !result.stdout.includes("score ")) {
      throw new Error(`Editorial checker did not complete: ${result.error?.message ?? result.stderr}`);
    }
    return { stdout: result.stdout, stderr: result.stderr, exitCode: result.status!, executable, argv, startedAt, completedAt: new Date().toISOString() };
  }
  const beforeCheck = check(before), afterCheck = check(after);
  const evidence = createEditorialEvidence(format, before, after, await readJson(notesFile), { before: beforeCheck.stdout, after: afterCheck.stdout });
  let executionRef;
  if (executionManifestFile) {
    const manifest = await readJson(executionManifestFile);
    const editorialEvidenceRef = await storeEvidence(process.cwd(), manifest.importId, evidence);
    const checkerExecutionRef = await storeEvidence(process.cwd(), manifest.importId, {
      schemaVersion: "ExecutionEvidenceV1", kind: "command", toolVersion: EDITORIAL_REVISION,
      ...afterCheck, cwd: process.cwd(), inputRefs: [await evidenceReference(process.cwd(), afterFile), await evidenceReference(process.cwd(), ".agents/skills/eleanor-editorial/tools/deslop.py")], outputRefs: [],
    });
    const companion = editorialExecutionSchema.parse({ ...manifest, editorialEvidenceRef, checkerExecutionRef });
    executionRef = await storeEvidence(process.cwd(), manifest.importId, companion);
    await validateEditorialExecution(process.cwd(), executionRef, { importId: companion.importId, sourceFingerprint: companion.sourceFingerprint, format: companion.format, artifactPath: afterFile, requirementRevision: companion.requirementRevision });
  }
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(evidence, null, 2) + "\n", { flag: "wx" });
  console.log(`Editorial comparison recorded: ${receiptFile}; ${evidence.changedPaths.length} prose changes. Semantic review remains a human responsibility.`);
  if (executionRef) console.log(JSON.stringify({ editorialExecutionRef: executionRef }));
  else console.log("Automation requires a validated EditorialExecutionV1 companion; this comparison receipt alone cannot advance an import. Supply an execution manifest as the sixth argument.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
