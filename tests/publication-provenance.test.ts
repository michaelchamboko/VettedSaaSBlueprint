import assert from "node:assert/strict";
import test from "node:test";

import { publishApprovedPageAtomically } from "../src/lib/pages/publish-transaction";
import {
  withTransaction,
  type TransactionConnection,
  type TransactionSql,
} from "../src/lib/db/query";

function fakeConnection() {
  const calls = {
    commits: 0,
    rollbacks: 0,
    closes: 0,
    executedSql: [] as string[],
    executeOptions: [] as unknown[],
  };
  const connection: TransactionConnection = {
    async execute(sql, _binds, options) {
      calls.executedSql.push(sql);
      calls.executeOptions.push(options);
      return { rows: [[1]], metaData: [{ name: "VALUE" }] };
    },
    async commit() { calls.commits += 1; },
    async rollback() { calls.rollbacks += 1; },
    async close() { calls.closes += 1; },
  };
  return { calls, connection };
}

test("transaction uses one connection, commits once, and closes on success", async () => {
  const { calls, connection } = fakeConnection();

  const value = await withTransaction(async (tx) => {
    const result = await tx`select ${1} as value from dual limit 1`;
    assert.equal(result.rows[0].value, 1);
    return "committed";
  }, async () => connection);

  assert.equal(value, "committed");
  assert.equal(calls.commits, 1);
  assert.equal(calls.rollbacks, 0);
  assert.equal(calls.closes, 1);
  assert.match(calls.executedSql[0], /FETCH FIRST 1 ROWS ONLY$/);
  assert.doesNotMatch(calls.executedSql[0], /\blimit\b/i);
  assert.equal(
    (calls.executeOptions[0] as { autoCommit?: boolean }).autoCommit,
    false,
  );
});

test("transaction rolls back and closes without committing on failure", async () => {
  const { calls, connection } = fakeConnection();

  await assert.rejects(
    () => withTransaction(async (tx) => {
      await tx`select ${1} as value from dual`;
      throw new Error("transaction work failed");
    }, async () => connection),
    /transaction work failed/,
  );

  assert.equal(calls.commits, 0);
  assert.equal(calls.rollbacks, 1);
  assert.equal(calls.closes, 1);
});

test("atomic publisher propagates audit failure so the transaction can roll back", async () => {
  const statements: string[] = [];
  const tx = (async (strings: TemplateStringsArray) => {
    const statement = strings.join("?").replace(/\s+/g, " ").trim();
    statements.push(statement);
    if (statement.includes("from page_blueprints")) return { rows: [{ ID: "blueprint", STATUS: "approved", STRUCTURAL_JSON: JSON.stringify({ metadata: { url_slug: "review" } }) }] };
    if (statement.includes("max(version_number)")) return { rows: [{ NEXT_VERSION_NUMBER: 1 }] };
    if (statement.includes("from dynamic_pages")) return { rows: [] };
    if (statement.includes("insert into audit_log")) throw new Error("audit write failed");
    return { rows: [] };
  }) as TransactionSql;

  await assert.rejects(
    () => publishApprovedPageAtomically({ blueprintId: "blueprint", productId: "product", path: "/landing-page-builders/review", complianceResult: { publishable: true }, qualityScore: 80, evidenceScore: 80 }, async (work) => work(tx)),
    /audit write failed/i,
  );
  assert.ok(statements.some((statement) => statement.includes("insert into page_versions")));
  assert.ok(statements.some((statement) => statement.includes("insert into generation_jobs")));
});
