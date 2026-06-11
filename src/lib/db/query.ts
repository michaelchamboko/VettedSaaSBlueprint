import oracledb from "oracledb";
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

function mapRows(result: oracledb.Result<unknown>): Record<string, unknown>[] {
  if (!result.rows || result.rows.length === 0) return [];

  const columns = result.metaData?.map((c: oracledb.Metadata<unknown>) => c.name) ?? [];
  return result.rows.map((row: unknown) => {
    const obj: Record<string, unknown> = {};
    if (Array.isArray(row)) {
      columns.forEach((col: string, i: number) => {
        obj[col] = row[i];
      });
    }
    return obj;
  });
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
    return { rows: mapRows(result) };
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
