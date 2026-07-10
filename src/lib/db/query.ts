import oracledb from "oracledb";
import type { Metadata, Result } from "oracledb";
import { getPool } from "./client";

type TaggedTemplateResult = {
  sql: string;
  binds: unknown[];
};

function parseTemplate(
  strings: TemplateStringsArray,
  values: unknown[]
): TaggedTemplateResult {
  let sql = "";
  const binds: unknown[] = [];

  for (let i = 0; i < strings.length; i++) {
    sql += strings[i];
    if (i < values.length) {
      binds.push(values[i]);
      sql += `:${binds.length}`;
    }
  }

  return { sql, binds };
}

function convertOracleSyntax(sql: string): string {
  let converted = sql;

  converted = converted.replace(/\bnow\(\)/g, "SYSTIMESTAMP");

  converted = converted.replace(
    /interval\s+'(\d+)\s+(\w+)'/g,
    (_match, value: string, unit: string) => {
      const oracleUnit = unit.toUpperCase().replace(/S$/, "");
      return `NUMTODSINTERVAL(${value}, '${oracleUnit}')`;
    }
  );

  converted = converted.replace(
    /::text\[\]/g,
    ""
  );

  return converted;
}

async function normalizeOracleValue(value: unknown): Promise<unknown> {
  if (value && typeof value === "object" && "getData" in value && typeof (value as { getData?: unknown }).getData === "function") {
    return (value as { getData: () => Promise<unknown> }).getData();
  }
  return value;
}

async function mapRows(result: Result<unknown>): Promise<Record<string, unknown>[]> {
  if (!result.rows || result.rows.length === 0) return [];

  const columns = result.metaData?.map((c: Metadata<unknown>) => c.name) ?? [];
  return Promise.all(result.rows.map(async (row: unknown) => {
    const obj: Record<string, unknown> = {};
    if (Array.isArray(row)) {
      await Promise.all(columns.map(async (col: string, i: number) => {
        obj[col] = await normalizeOracleValue(row[i]);
      }));
    }
    return obj;
  }));
}

export async function executeQuery(
  sql: string,
  binds: unknown[] = []
): Promise<{ rows: Record<string, unknown>[] }> {
  const pool = await getPool();
  const connection = await pool.getConnection();
  try {
    const converted = convertOracleSyntax(sql);
    const result = await connection.execute(converted, binds, {
      outFormat: oracledb.OUT_FORMAT_ARRAY,
      autoCommit: true,
    });
    return { rows: await mapRows(result) };
  } finally {
    await connection.close();
  }
}

export type TransactionSql = (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<{ rows: Record<string, unknown>[] }>;

export type TransactionRunner = <T>(work: (tx: TransactionSql) => Promise<T>) => Promise<T>;

export async function withTransaction<T>(work: (tx: TransactionSql) => Promise<T>): Promise<T> {
  const pool = await getPool();
  const connection = await pool.getConnection();
  const transactionalConnection = connection as typeof connection & {
    commit(): Promise<void>;
    rollback(): Promise<void>;
  };

  const tx: TransactionSql = async (strings, ...values) => {
    const { sql: query, binds } = parseTemplate(strings, values);
    const result = await connection.execute(convertOracleSyntax(query), binds, {
      outFormat: oracledb.OUT_FORMAT_ARRAY,
      autoCommit: false,
    });
    return { rows: await mapRows(result) };
  };

  try {
    const result = await work(tx);
    await transactionalConnection.commit();
    return result;
  } catch (error) {
    await transactionalConnection.rollback();
    throw error;
  } finally {
    await connection.close();
  }
}

export async function executeReturning(
  sql: string,
  binds: unknown[] = []
): Promise<{ rows: Record<string, unknown>[] }> {
  return executeQuery(sql, binds);
}

export function sql(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<{ rows: Record<string, unknown>[] }> {
  const { sql: query, binds } = parseTemplate(strings, values);
  return executeQuery(query, binds);
}
