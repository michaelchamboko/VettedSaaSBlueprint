import { Pool } from "pg";
import { NeonRepositoryIntelligence } from "../src/lib/repository-intelligence/neon";

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main(): Promise<void> {
  const nodeId = option("--node");
  const snapshotKey = option("--snapshot");
  const depth = Number(option("--depth") ?? "2");
  if (!nodeId || !snapshotKey) throw new Error("--node and --snapshot are required.");
  if (!Number.isInteger(depth) || depth < 0 || depth > 8) throw new Error("--depth must be an integer from 0 to 8.");
  const connectionString = process.env.DATABASE_URL?.trim() || process.env.REPOSITORY_INTELLIGENCE_DATABASE_URL?.trim();
  if (!connectionString) throw new Error("DATABASE_URL or REPOSITORY_INTELLIGENCE_DATABASE_URL is required.");
  const pool = new Pool({ connectionString, max: 1, ssl: { rejectUnauthorized: true } });
  try {
    const rows = await new NeonRepositoryIntelligence(pool).impact(snapshotKey, nodeId, depth);
    process.stdout.write(JSON.stringify({ snapshotKey, nodeId, depth, results: rows }, null, 2) + "\n");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  process.stderr.write(`Impact query failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
