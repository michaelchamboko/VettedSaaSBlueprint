import oracledb from "oracledb";
import type { Pool, PoolAttributes } from "oracledb";

let pool: Pool | null = null;

function getOracleConfig(): PoolAttributes {
  const walletLocation = process.env.ORACLE_WALLET_LOCATION;
  const connectionString = process.env.ORACLE_CONNECTION_STRING;
  const user = process.env.ORACLE_DB_USER;
  const password = process.env.ORACLE_DB_PASSWORD;

  if (!walletLocation || !connectionString) {
    throw new Error(
      "Oracle connection requires ORACLE_WALLET_LOCATION and ORACLE_CONNECTION_STRING environment variables."
    );
  }

  return {
    user,
    password,
    connectString: connectionString,
    walletLocation,
    poolMin: 1,
    poolMax: 5,
    poolIncrement: 1,
    poolTimeout: 60,
  };
}

export async function getPool(): Promise<Pool> {
  if (pool) return pool;

  const config = getOracleConfig();
  pool = await oracledb.createPool(config);
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.close(0);
    pool = null;
  }
}
