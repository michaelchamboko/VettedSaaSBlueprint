import { Pool } from "pg";

let pool: Pool | null = null;

function getDatabaseUrl(): string {
  const value = process.env.DATABASE_URL?.trim();
  if (!value) throw new Error("DATABASE_URL is required for persistent application data.");
  return value;
}

export function getPool(): Pool {
  if (!pool) pool = new Pool({ connectionString: getDatabaseUrl(), max: 5 });
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
