import { Pool } from "pg";
import { buildRepositoryIntelligence } from "../src/lib/repository-intelligence/graph";
import { NeonRepositoryIntelligence } from "../src/lib/repository-intelligence/neon";

async function main(): Promise<void> {
  const snapshot = buildRepositoryIntelligence(process.cwd());
  const summary = {
    snapshotKey: snapshot.snapshotKey,
    commitSha: snapshot.commitSha,
    sourceManifestSha256: snapshot.sourceManifestSha256,
    graphSha256: snapshot.graphSha256,
    nodes: snapshot.nodes.length,
    edges: snapshot.edges.length,
  };
  if (!process.argv.includes("--apply")) {
    process.stdout.write(JSON.stringify({ status: "dry-run", ...summary }) + "\n");
    return;
  }
  const connectionString = process.env.DATABASE_URL_UNPOOLED?.trim() || process.env.REPOSITORY_INTELLIGENCE_DATABASE_URL?.trim();
  if (!connectionString) throw new Error("DATABASE_URL_UNPOOLED or REPOSITORY_INTELLIGENCE_DATABASE_URL is required with --apply.");
  const pool = new Pool({ connectionString, max: 1, ssl: { rejectUnauthorized: true } });
  try {
    await new NeonRepositoryIntelligence(pool).replaceSnapshot(snapshot);
    process.stdout.write(JSON.stringify({ status: "applied", ...summary }) + "\n");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  process.stderr.write(`Repository intelligence sync failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
