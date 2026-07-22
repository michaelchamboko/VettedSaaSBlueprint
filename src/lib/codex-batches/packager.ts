import {
  canonicalJsonStringify,
  loadCodexLandingBatch,
  sha256Hex,
  type LoadCodexLandingBatchOptions,
} from "./loader";

export async function buildCodexLandingBatchPacket(options: LoadCodexLandingBatchOptions) {
  const loaded = await loadCodexLandingBatch(options);
  const manifestArtifact = loaded.artifacts.find((artifact) => artifact.path === "manifest.json");
  if (!manifestArtifact) throw new Error("Validated batch is missing manifest.json from its immutable artifact set.");

  const payload = {
    schema_version: "CodexLandingBatchPacketV1" as const,
    batch_id: loaded.manifest.batch_id,
    product_id: loaded.manifest.product_id,
    git_commit_sha: loaded.manifest.git_commit_sha,
    manifest_byte_sha256: manifestArtifact.byte_sha256,
    manifest_canonical_json_sha256: manifestArtifact.canonical_json_sha256,
    source_pack_byte_sha256: loaded.manifest.product_pack.byte_sha256,
    source_pack_canonical_json_sha256: loaded.manifest.product_pack.canonical_json_sha256,
    artifacts: loaded.artifacts.map((artifact) => ({
      path: artifact.path,
      byte_length: artifact.byte_length,
      byte_sha256: artifact.byte_sha256,
      canonical_json_sha256: artifact.canonical_json_sha256,
      json: artifact.json,
    })),
  };
  const packetSha256 = sha256Hex(canonicalJsonStringify(payload));
  const packet = { ...payload, packet_sha256: packetSha256 };
  const packetBytes = Buffer.from(`${canonicalJsonStringify(packet)}\n`, "utf8");

  return { loaded, packet, packet_sha256: packetSha256, packet_bytes: packetBytes };
}

export type CodexLandingBatchPacket = Awaited<ReturnType<typeof buildCodexLandingBatchPacket>>["packet"];
