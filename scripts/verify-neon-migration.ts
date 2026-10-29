import { readFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";

async function main(): Promise<void> {
  if (!process.argv.includes("--apply")) throw new Error("Refusing to apply the migration without --apply.");
  const connectionString = process.env.DATABASE_URL_UNPOOLED?.trim() || process.env.NEON_MIGRATION_DATABASE_URL?.trim();
  if (!connectionString) throw new Error("DATABASE_URL_UNPOOLED or NEON_MIGRATION_DATABASE_URL is required.");
  if (new URL(connectionString).hostname.includes("-pooler")) throw new Error("A direct, non-pooled connection is required for migrations.");
  const migration = await readFile(path.join(process.cwd(), "db", "repository-intelligence-v001.sql"), "utf8");
  const pool = new Pool({ connectionString, max: 1, ssl: { rejectUnauthorized: true } });
  try {
    await pool.query(migration);
    const result = await pool.query<{ installed: boolean }>(
      "select to_regprocedure('repository_intelligence_v1.impact(text,text,integer)') is not null as installed",
    );
    if (!result.rows[0]?.installed) throw new Error("Impact function was not installed.");
    process.stdout.write(JSON.stringify({ status: "applied", migration: "repository-intelligence-v001" }) + "\n");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  process.stderr.write(`Neon migration failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
