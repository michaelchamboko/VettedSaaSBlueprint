import { readdir } from "node:fs/promises";
import type { Dirent } from "node:fs";
import path from "node:path";

import { loadCodexLandingBatch } from "@/lib/codex-batches/loader";

import {
  buildCodexBatchPreviewCatalogue,
  listCodexBatchPreviewRegistryBatchIds,
  type CodexBatchBlueprintPreview,
} from "./codex-batch-previews";

export type LoadCodexBatchPreviewCatalogueOptions = {
  batchRoot?: string;
  expectedGitCommitSha?: string;
  environment?: Readonly<Record<string, string | undefined>>;
};

const UUID_V4_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;

async function listBatchIds(batchRoot: string) {
  let entries: Dirent[];
  try {
    entries = await readdir(batchRoot, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }

  return entries
    .filter((entry) => entry.isDirectory() || entry.isSymbolicLink())
    .map((entry) => entry.name)
    .filter((name) => UUID_V4_PATTERN.test(name))
    .sort();
}

export async function loadCodexBatchPreviewCatalogue(options: LoadCodexBatchPreviewCatalogueOptions = {}) {
  const batchRoot = path.resolve(options.batchRoot ?? path.join(process.cwd(), "src/generated/landing-page-batches"));
  const batchIds = await listBatchIds(batchRoot);
  const environment = options.environment ?? process.env;
  const expectedGitCommitSha = options.expectedGitCommitSha ?? environment.CODEX_BATCH_SOURCE_GIT_SHA;
  const batches = await Promise.all(batchIds.map((batchId) => loadCodexLandingBatch({
    batchRoot,
    batchId,
    expectedGitCommitSha,
    environment,
  })));
  return buildCodexBatchPreviewCatalogue(batches);
}

export async function assertCodexBatchPreviewRegistryMatchesFilesystem(options: Pick<LoadCodexBatchPreviewCatalogueOptions, "batchRoot"> = {}) {
  const batchRoot = path.resolve(options.batchRoot ?? path.join(process.cwd(), "src/generated/landing-page-batches"));
  const directoryBatchIds = await listBatchIds(batchRoot);
  const registryBatchIds = listCodexBatchPreviewRegistryBatchIds();
  if (directoryBatchIds.join("\n") !== registryBatchIds.join("\n")) {
    throw new Error("Codex preview registry batch IDs do not match committed batch directories.");
  }
}

export type { CodexBatchBlueprintPreview };
