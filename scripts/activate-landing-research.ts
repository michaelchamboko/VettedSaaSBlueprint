import { createNeonPool, NeonResearchControl } from "../src/lib/landing-research/neon";

function requiredArgument(name: string): string {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1]?.trim() : undefined;
  if (!value) throw new Error(`Usage requires ${name} <value>.`);
  return value;
}

function assertPattern(value: string, expression: RegExp, name: string): string {
  if (!expression.test(value)) throw new Error(`${name} is invalid.`);
  return value;
}

async function check(): Promise<void> {
  const pool = createNeonPool(process.env.LANDING_CONTROL_DATABASE_URL, "LANDING_CONTROL_DATABASE_URL");
  try {
    const control = new NeonResearchControl(pool);
    const capability = await control.freshWorkerCapability();
    process.stdout.write(`${JSON.stringify({
      status: capability ? "ready_for_explicit_apply" : "blocked",
      workerCapability: capability ? {
        bundleSha256: capability.bundle_sha256,
        expiresAt: capability.expires_at,
        sourceCommitSha: capability.source_commit_sha,
      } : null,
    })}\n`);
    if (!capability) process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

async function apply(): Promise<void> {
  const sourceCommitSha = assertPattern(requiredArgument("--source-commit"), /^[a-f0-9]{40}$/, "--source-commit");
  const bundleSha256 = assertPattern(requiredArgument("--bundle-sha256"), /^[a-f0-9]{64}$/, "--bundle-sha256");
  const pool = createNeonPool(process.env.NEON_MIGRATION_DATABASE_URL, "NEON_MIGRATION_DATABASE_URL");
  try {
    const result = await pool.query<{ activate_research_pipeline: boolean }>(
      "select landing_control_v2.activate_research_pipeline($1, $2)",
      [sourceCommitSha, bundleSha256],
    );
    if (result.rows[0]?.activate_research_pipeline !== true) throw new Error("Neon declined research activation.");
    process.stdout.write(`${JSON.stringify({ status: "activated", pipeline: "research_prep_v1" })}\n`);
  } finally {
    await pool.end();
  }
}

async function main(): Promise<void> {
  if (process.argv.includes("--apply")) await apply();
  else await check();
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Landing research activation failed."}\n`);
  process.exitCode = 1;
});
