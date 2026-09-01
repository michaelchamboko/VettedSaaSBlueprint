import path from "node:path";

import { loadCodexLandingBatch } from "@/lib/codex-batches/loader";

function readOption(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const batchId = readOption("--batch-id");
  if (!batchId) throw new Error("Usage: npm run validate:codex-batch -- --batch-id <uuid> [--git-commit-sha <sha>] [--batch-root <path>]");
  const loaded = await loadCodexLandingBatch({
    batchId,
    batchRoot: path.resolve(readOption("--batch-root") ?? "src/generated/landing-page-batches"),
    expectedGitCommitSha: readOption("--git-commit-sha"),
  });
  process.stdout.write(`${JSON.stringify({
    status: "pass",
    schema_version: loaded.manifest.schema_version,
    batch_id: loaded.manifest.batch_id,
    batch_type: loaded.manifest.batch_type,
    candidate_count: loaded.pages.length,
    artifact_count: loaded.artifacts.length,
    batch_directory: loaded.batchDirectory,
    draft_directory: path.join(loaded.batchDirectory, "drafts"),
    draft_files: loaded.manifest.pages.map((page) => path.basename(page.artifact.path)),
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
