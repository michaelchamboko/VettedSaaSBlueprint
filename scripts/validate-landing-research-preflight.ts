import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { inspectLandingResearchPreflight, type LandingResearchPreflightChecks } from "../src/lib/landing-automation/research-preflight";
import { createNeonPool, NeonResearchControl } from "../src/lib/landing-research/neon";

async function probeControl(url: string | undefined): Promise<{ control: boolean; workerCapability: boolean }> {
  if (!url) return { control: false, workerCapability: false };
  try {
    const pool = createNeonPool(url, "LANDING_CONTROL_DATABASE_URL");
    await pool.query("select 1");
    const probe = await pool.query<{ probe_control: boolean }>("select landing_control_v2.probe_control()");
    const control = probe.rows[0]?.probe_control === true;
    const client = new NeonResearchControl(pool);
    const capability = await client.freshWorkerCapability();
    await pool.end();
    return { control, workerCapability: capability !== null };
  } catch {
    return { control: false, workerCapability: false };
  }
}

async function main(): Promise<void> {
  const markdown = await readFile(resolve(process.cwd(), "approved-urls.md"), "utf8");
  const authority = await probeControl(process.env.LANDING_CONTROL_DATABASE_URL);
  const checks: LandingResearchPreflightChecks = {
    LANDING_CONTROL_DATABASE_URL: authority.control,
    WORKER_CAPABILITY: authority.workerCapability,
  };
  const result = inspectLandingResearchPreflight(markdown, process.env, checks);

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.status === "blocked") process.exitCode = 1;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown research preflight error.";
  process.stderr.write(`landing research preflight failed: ${message}\n`);
  process.exitCode = 1;
});
