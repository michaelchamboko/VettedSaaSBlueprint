import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

function inspectMigrationSource(source: string): { digest: string; expected: string } {
  const normalized = source.replace(/\r\n?/g, "\n");
  const match = normalized.match(/values \('R001', '([a-f0-9]{64}|SELF_HASH)'\)/);
  if (!match) throw new Error("R001 migration checksum marker is missing.");
  const canonical = normalized.replaceAll(match[1], "SELF_HASH");
  return { digest: createHash("sha256").update(canonical, "utf8").digest("hex"), expected: match[1] };
}

export function computeResearchAuthorityMigrationChecksum(source: string): string {
  return inspectMigrationSource(source).digest;
}

async function main(): Promise<void> {
  const source = await readFile(resolve(process.cwd(), "db", "neon-landing-research-authority-r001.sql"), "utf8");
  const { digest, expected } = inspectMigrationSource(source);
  if (expected !== digest) throw new Error(`R001 migration checksum mismatch: expected ${expected}, computed ${digest}.`);
  for (const required of ["register_worker_capability", "inspect_fresh_worker_capability", "activate_research_pipeline", "deactivate_research_pipeline", "landing_research_worker_role"]) {
    if (!source.includes(required)) throw new Error(`R001 migration is missing ${required}.`);
  }
  if (source.includes("grant select on landing_control_v2.worker_capabilities")) {
    throw new Error("R001 must not grant direct worker capability table access.");
  }
  process.stdout.write(JSON.stringify({ status: "verified", migration: "R001", checksum: digest }) + "\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : "Research authority migration source verification failed."}\n`);
    process.exitCode = 1;
  });
}
