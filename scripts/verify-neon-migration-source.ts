import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

function inspectMigrationSource(source: string): { digest: string; expected: string } {
  const normalized = source.replace(/\r\n?/g, "\n");
  const match = normalized.match(/values \('V001', '([a-f0-9]{64})'\)/);
  if (!match) throw new Error("V001 migration checksum marker is missing.");
  const canonical = normalized.replaceAll(match[1], "SELF_HASH");
  return {
    digest: createHash("sha256").update(canonical, "utf8").digest("hex"),
    expected: match[1],
  };
}

export function computeMigrationSourceChecksum(source: string): string {
  return inspectMigrationSource(source).digest;
}

async function main(): Promise<void> {
  const source = await readFile(resolve(process.cwd(), "db", "neon-landing-control-v001.sql"), "utf8");
  const { digest, expected } = inspectMigrationSource(source);
  if (digest !== expected) throw new Error(`V001 migration checksum mismatch: expected ${expected}, computed ${digest}.`);
  for (const required of ["landing_control_v2.claim_research_stage", "landing_control_v2.complete_research_stage", "global_kill_switch", "research_prep_v1"]) {
    if (!source.includes(required)) throw new Error(`V001 migration is missing ${required}.`);
  }
  process.stdout.write(JSON.stringify({ status: "verified", migration: "V001", checksum: digest }) + "\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : "Migration source verification failed."}\n`);
    process.exitCode = 1;
  });
}
