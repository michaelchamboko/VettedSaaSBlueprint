import path from "node:path";
import { fileURLToPath } from "node:url";

import { discoverVisualCandidateBatches } from "./run-landing-visual";

function flagValue(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const candidates = await discoverVisualCandidateBatches({ batchRoot: flagValue("--batch-root"), catalogueDirectory: flagValue("--catalogue-dir") });
  process.stdout.write(`${candidates.reduce((total, batch) => total + batch.pages.length, 0)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void main().catch((error) => { process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`); process.exitCode = 1; });
}
