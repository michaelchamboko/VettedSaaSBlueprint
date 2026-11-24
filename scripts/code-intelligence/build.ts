import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { ARTIFACT_FILES, CBM_VERSION, PROJECT, assertNoSecret, cbm, git, inspectGraph, sha256, sourceManifest, validate, writeJson } from "./common.ts";

export function build(root: string) {
  const manifest = sourceManifest(root);
  const destination = path.join(root, ".codebase-memory");
  if (existsSync(path.join(destination, "provenance.json"))) {
    const previous = validate(root);
    if (previous.sourceDigest === manifest.digest) return { status: "unchanged", ...previous };
  }
  const work = path.join(root, ".artifacts", "code-intelligence");
  mkdirSync(work, { recursive: true });
  const scratch = mkdtempSync(path.join(work, "build-"));
  const checkout = mkdtempSync(path.join(tmpdir(), "cbm-source-"));
  // A separate Git checkout binds native provenance and excludes all local working bytes.
  execFileSync("git", ["clone", "--quiet", "--no-checkout", "--shared", root, checkout], { stdio: "pipe" });
  git(checkout, ["-c", "core.longpaths=true", "-c", "core.autocrlf=false", "checkout", "--quiet", "--detach", manifest.commit]);
  for (const entry of manifest.included) assertNoSecret(readFileSync(path.join(checkout, entry.path)), entry.path);
  // Generated exports are not source changes. No source files are masked here.
  writeFileSync(path.join(checkout, ".git", "info", "exclude"), ".codebase-memory/\n");
  if (!existsSync(path.join(checkout, ".cbmignore"))) throw new Error("Commit .cbmignore before generating a shareable graph");
  const output = path.join(checkout, ".codebase-memory");
  // Native import may reuse the committed baseline before reconciling this source commit.
  const started = performance.now();
  const result = cbm(["index_repository", "--repo-path", checkout, "--name", PROJECT, "--mode", "full", "--persistence", "true"], checkout);
  const durationMs = Math.round(performance.now() - started);
  const graph = inspectGraph(output, new Set(manifest.included.map(e => e.path)));
  if (graph.metadata.commit !== manifest.commit || graph.metadata.reconcile_basis !== "git-clean-head") throw new Error("Native export did not certify the clean source commit");
  writeJson(path.join(output, "provenance.json"), {
    toolVersion: CBM_VERSION, sourceSha: manifest.commit, sourceDigest: manifest.digest,
    hashes: Object.fromEntries(ARTIFACT_FILES.filter(f => f !== "provenance.json").map(f => [f, sha256(readFileSync(path.join(output, f)))])),
    durationMs, indexedFiles: graph.indexedFiles, excluded: manifest.excluded, indexResult: result,
  });
  validate(root, output);
  const coverage = cbm(["index_status", "--project", PROJECT, "--diagnostics", "full", "--format", "json"], checkout);
  writeJson(path.join(scratch, "index-status.json"), coverage);
  const candidate = path.join(scratch, "validated");
  mkdirSync(candidate);
  for (const file of ARTIFACT_FILES) copyFileSync(path.join(output, file), path.join(candidate, file));
  // Replace only after every check passes; rollback the previous directory on failure.
  const backup = path.join(scratch, "previous");
  if (existsSync(destination)) renameSync(destination, backup);
  try { renameSync(candidate, destination); }
  catch (error) { if (existsSync(backup)) renameSync(backup, destination); throw error; }
  return { status: "built", sourceSha: manifest.commit, sourceDigest: manifest.digest, durationMs, nodes: graph.nodes, edges: graph.edges, indexedFiles: graph.indexedFiles, compressedBytes: graph.compressedBytes, evidence: scratch };
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) console.log(JSON.stringify(build(process.cwd()), null, 2));


