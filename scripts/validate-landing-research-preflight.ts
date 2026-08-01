import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";

import { inspectLandingResearchPreflight, type LandingResearchPreflightChecks } from "../src/lib/landing-automation/research-preflight";
import { hermesExecutorCapabilitiesSchema } from "../src/lib/landing-research/contracts";
import { createNeonPool } from "../src/lib/landing-research/neon";

const execFileAsync = promisify(execFile);

async function probeCommand(commandPath: string, capability: "hermes_product_identity" | "hermes_research"): Promise<boolean> {
  if (!commandPath || !/^[A-Za-z]:[\\/]|^\//.test(commandPath)) return false;
  try {
    const result = await execFileAsync(commandPath, ["--probe"], {
      shell: false,
      timeout: 5_000,
      maxBuffer: 64 * 1024,
      windowsHide: true,
      env: { NODE_ENV: process.env.NODE_ENV ?? "production", PATH: process.env.PATH, SystemRoot: process.env.SystemRoot },
    });
    const output = result.stdout.trim();
    if (!output || output.includes("\n")) return false;
    const parsed = hermesExecutorCapabilitiesSchema.safeParse(JSON.parse(output));
    return parsed.success && parsed.data.capability === capability;
  } catch {
    return false;
  }
}

async function probeDatabase(url: string | undefined, name: string, probeFunction: string): Promise<boolean> {
  if (!url) return false;
  try {
    const pool = createNeonPool(url, name);
    await pool.query("select 1");
    await pool.query(`select landing_control_v2.${probeFunction}()`);
    await pool.end();
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const markdown = await readFile(resolve(process.cwd(), "approved-urls.md"), "utf8");
  const checks: LandingResearchPreflightChecks = {
    LANDING_CONTROL_DATABASE_URL: await probeDatabase(process.env.LANDING_CONTROL_DATABASE_URL, "LANDING_CONTROL_DATABASE_URL", "probe_control"),
    LANDING_ORACLE_WORKER_DATABASE_URL: await probeDatabase(process.env.LANDING_ORACLE_WORKER_DATABASE_URL, "LANDING_ORACLE_WORKER_DATABASE_URL", "probe_worker"),
    HERMES_PRODUCT_IDENTITY_COMMAND: await probeCommand(process.env.HERMES_PRODUCT_IDENTITY_COMMAND ?? "", "hermes_product_identity"),
    HERMES_LANDING_RESEARCH_COMMAND: await probeCommand(process.env.HERMES_LANDING_RESEARCH_COMMAND ?? "", "hermes_research"),
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
