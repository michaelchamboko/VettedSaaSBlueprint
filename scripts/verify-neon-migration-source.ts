import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

async function main(): Promise<void> {
  const source = await readFile(resolve(process.cwd(), "db", "neon-landing-control-v001.sql"), "utf8");
  const match = source.match(/values \('V001', '([a-f0-9]{64})'\)/);
  if (!match) throw new Error("V001 migration checksum marker is missing.");
  const canonical = source.replaceAll(match[1], "SELF_HASH");
  const digest = createHash("sha256").update(canonical, "utf8").digest("hex");
  if (digest !== match[1]) throw new Error(`V001 migration checksum mismatch: expected ${match[1]}, computed ${digest}.`);
  for (const required of ["landing_control_v2.claim_research_stage", "landing_control_v2.complete_research_stage", "global_kill_switch", "research_prep_v1"]) {
    if (!source.includes(required)) throw new Error(`V001 migration is missing ${required}.`);
  }
  process.stdout.write(JSON.stringify({ status: "verified", migration: "V001", checksum: digest }) + "\n");
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Migration source verification failed."}\n`);
  process.exitCode = 1;
});
