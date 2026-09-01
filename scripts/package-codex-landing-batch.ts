import path from "node:path";

import { packageCodexLandingBatch } from "@/lib/codex-batches/cli-packager";

function readOption(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const batchId = readOption("--batch-id");
  if (!batchId) throw new Error("Usage: npm run package:codex-batch -- --batch-id <uuid> [--git-commit-sha <sha>] [--batch-root <path>] [--output-root <path>]");
  const result = await packageCodexLandingBatch({
    batchId,
    batchRoot: path.resolve(readOption("--batch-root") ?? "src/generated/landing-page-batches"),
    outputRoot: path.resolve(readOption("--output-root") ?? ".stage2/codex-batches"),
    expectedGitCommitSha: readOption("--git-commit-sha"),
  });
  process.stdout.write(`${JSON.stringify({ status: "pass", ...result }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
