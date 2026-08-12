import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function connectionEnvironment(value: string): NodeJS.ProcessEnv {
  const url = new URL(value);
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.username || !url.password) {
    throw new Error("NEON_MIGRATION_DATABASE_URL must be a complete PostgreSQL URL.");
  }
  return {
    PGHOST: url.hostname,
    PGPORT: url.port || "5432",
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: decodeURIComponent(url.pathname.slice(1)) || "postgres",
    PGSSLMODE: "require",
    PGCONNECT_TIMEOUT: "5",
    NODE_ENV: process.env.NODE_ENV ?? "production",
  };
}

async function main(): Promise<void> {
  if (!process.argv.includes("--apply")) throw new Error("Refusing to apply R001 without --apply.");
  const connection = process.env.NEON_MIGRATION_DATABASE_URL;
  if (!connection) throw new Error("NEON_MIGRATION_DATABASE_URL is missing.");
  const migration = resolve(process.cwd(), "db", "neon-landing-research-authority-r001.sql");
  await access(migration);
  await execFileAsync("psql", ["-X", "-v", "ON_ERROR_STOP=1", "--file", migration], {
    shell: false,
    windowsHide: true,
    env: { ...connectionEnvironment(connection), PATH: process.env.PATH, SystemRoot: process.env.SystemRoot },
    maxBuffer: 256 * 1024,
    timeout: 120_000,
  });
  process.stdout.write(JSON.stringify({ status: "applied", migration: "R001", schema: "landing_control_v2" }) + "\n");
}

main().catch((error: unknown) => {
  process.stderr.write(`Neon research authority migration blocked: ${error instanceof Error ? error.message : "Unknown error."}\n`);
  process.exitCode = 1;
});
