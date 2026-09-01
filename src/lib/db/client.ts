import oracledb from "oracledb";
import type { Pool, PoolAttributes } from "oracledb";

let pool: Pool | null = null;

function parseConnectionString(value: string): string {
  try {
    const parsed = new URL(value);
    const protocol = parsed.protocol.replace(":", "").toLowerCase();
    if (!["oracle", "oracles", "oracle+thin", "oracle+tcps"].includes(protocol)) return value;
    const host = parsed.hostname;
    if (!host) return value;
    const service = parsed.pathname.replace(/^\/+/g, "");
    const port = parsed.port ? `:${parsed.port}` : "";
    const suffix = service ? `/${service}` : "";
    return `${host}${port}${suffix}`;
  } catch {
    return value;
  }
}

function parseUrlCredentials(rawUrl: string): { user: string; password: string } {
  try {
    const parsed = new URL(rawUrl);
    return {
      user: parsed.username || "",
      password: parsed.password || "",
    };
  } catch {
    return { user: "", password: "" };
  }
}

function getOracleConfig(): PoolAttributes {
  const walletLocation =
    process.env.ORACLE_WALLET_LOCATION ??
    process.env.TNS_ADMIN;
  const rawConnectionString =
    process.env.ORACLE_CONNECTION_STRING ??
    process.env.DATABASE_URL ??
    process.env.ORACLE_SERVICE_ALIAS ??
    "";
  const connectionString = rawConnectionString ? parseConnectionString(rawConnectionString) : "";

  const user =
    process.env.ORACLE_DB_USER ??
    process.env.ORACLE_APP_USER ??
    (() => {
      const { user: userFromUrl } = parseUrlCredentials(process.env.DATABASE_URL ?? "");
      return userFromUrl || "";
    })();

  const password =
    process.env.ORACLE_DB_PASSWORD ??
    process.env.ORACLE_APP_PASSWORD ??
    (() => {
      const { password: passwordFromUrl } = parseUrlCredentials(process.env.DATABASE_URL ?? "");
      return passwordFromUrl || "";
    })();

  const serviceAlias = process.env.ORACLE_SERVICE_ALIAS;

  if (!walletLocation || !connectionString || !user || !password) {
    throw new Error(
      "Oracle connection requires ORACLE_WALLET_LOCATION (or TNS_ADMIN), ORACLE_CONNECTION_STRING (or DATABASE_URL), ORACLE_DB_USER/ORACLE_APP_USER, and ORACLE_DB_PASSWORD/ORACLE_APP_PASSWORD environment variables."
    );
  }

  return {
    user: user || undefined,
    password: password || undefined,
    connectString: serviceAlias ? serviceAlias : connectionString,
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
