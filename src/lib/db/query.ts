import type { PoolClient, QueryResultRow } from "pg";

import { getPool } from "./client";

type TaggedTemplateResult = { sql: string; binds: unknown[] };

function parseTemplate(strings: TemplateStringsArray, values: unknown[]): TaggedTemplateResult {
  let sql = "";
  const binds: unknown[] = [];
  for (let index = 0; index < strings.length; index += 1) {
    sql += strings[index];
    if (index < values.length) {
      binds.push(values[index]);
      sql += `$${binds.length}`;
    }
  }
  return { sql, binds };
}

function normalizePlaceholders(sql: string): string {
  return sql.replace(/:(\d+)/g, (_match, index: string) => `$${index}`);
}

function rows(result: { rows: QueryResultRow[] }): Record<string, unknown>[] {
  return result.rows as Record<string, unknown>[];
}

export async function executeQuery(sql: string, binds: unknown[] = []): Promise<{ rows: Record<string, unknown>[] }> {
  return { rows: rows(await getPool().query(normalizePlaceholders(sql), binds)) };
}

export type TransactionSql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
export type TransactionRunner = <T>(work: (tx: TransactionSql) => Promise<T>) => Promise<T>;
export type TransactionConnection = Pick<PoolClient, "query" | "release">;
type TransactionConnectionFactory = () => Promise<TransactionConnection>;

export async function withTransaction<T>(work: (tx: TransactionSql) => Promise<T>, getConnection: TransactionConnectionFactory = () => getPool().connect()): Promise<T> {
  const connection = await getConnection();
  const tx: TransactionSql = async (strings, ...values) => {
    const query = parseTemplate(strings, values);
    return { rows: rows(await connection.query(query.sql, query.binds)) };
  };
  try {
    await connection.query("begin");
    const result = await work(tx);
    await connection.query("commit");
    return result;
  } catch (error) {
    await connection.query("rollback");
    throw error;
  } finally {
    connection.release();
  }
}

export const executeReturning = executeQuery;

export function sql(strings: TemplateStringsArray, ...values: unknown[]): Promise<{ rows: Record<string, unknown>[] }> {
  const query = parseTemplate(strings, values);
  return executeQuery(query.sql, query.binds);
}
