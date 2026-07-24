import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  buildCodexLandingBatchPacket,
} from "./packager";
import type { LoadCodexLandingBatchOptions } from "./loader";

export type PackageCodexLandingBatchOptions = LoadCodexLandingBatchOptions & {
  outputRoot?: string;
};

export type PackagedCodexLandingBatch = {
  batch_id: string;
  output_path: string;
  packet_sha256: string;
  artifact_count: number;
};

export async function packageCodexLandingBatch(options: PackageCodexLandingBatchOptions): Promise<PackagedCodexLandingBatch> {
  const built = await buildCodexLandingBatchPacket(options);
  const outputRoot = path.resolve(options.outputRoot ?? path.join(process.cwd(), ".stage2/codex-batches"));
  const outputDirectory = path.join(outputRoot, built.loaded.manifest.batch_id);
  const outputPath = path.join(outputDirectory, "batch-packet.json");
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(outputPath, built.packet_bytes);

  return {
    batch_id: built.loaded.manifest.batch_id,
    output_path: outputPath,
    packet_sha256: built.packet_sha256,
    artifact_count: built.loaded.artifacts.length,
  };
}
