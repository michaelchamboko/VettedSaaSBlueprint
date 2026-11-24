import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ARTIFACT_FILES, PROJECT, cbm, validate } from "./common.ts";
const root = process.cwd();
const graph = validate(root);
const originals = new Map(ARTIFACT_FILES.map(file => [file, readFileSync(path.join(root, ".codebase-memory", file))]));
const started = performance.now();
try {
  const result = cbm(["index_repository", "--repo-path", root, "--name", PROJECT, "--mode", "full", "--persistence", "false"], root);
  console.log(JSON.stringify({ status: "loaded", publishedSource: graph.sourceSha, publishedCurrent: graph.current, durationMs: Math.round(performance.now() - started), result }, null, 2));
} finally {
  // CBM rewrites existing exports even with persistence=false. Keep published bytes intact.
  for (const [file, bytes] of originals) writeFileSync(path.join(root, ".codebase-memory", file), bytes);
}
