import assert from "node:assert/strict";
import test from "node:test";
import { NeonDocumentIntelligence } from "../src/lib/repository-intelligence/neon";
import type { DocumentIntelligenceSnapshot } from "../src/lib/repository-intelligence/graph";

const snapshot: DocumentIntelligenceSnapshot = {
  snapshotKey: "a".repeat(64), repository: "fixture", commitSha: "b".repeat(40),
  sourceManifestSha256: "c".repeat(64), graphSha256: "d".repeat(64),
  nodes: [{ id: "node-a", kind: "document", label: "a", payload: {} }],
  edges: [{ id: "edge-a", from: "node-a", to: "missing", kind: "contains", payload: {} }],
};

test("replaceSnapshot rolls back a failed replacement and never commits partial writes", async () => {
  const calls: string[] = [];
  const client = {
    async query(sql: string) {
      calls.push(sql.trim().split(/\s+/).slice(0, 2).join(" "));
      if (sql.includes("insert into repository_intelligence_v1.edges")) {
        const error = Object.assign(new Error("insert or update on table edges violates foreign key constraint"), { code: "23503" });
        throw error;
      }
      return { rows: [] };
    },
    release() { calls.push("release"); },
  };
  const pool = { connect: async () => client };
  const repository = new NeonDocumentIntelligence(pool as never);

  await assert.rejects(() => repository.replaceSnapshot(snapshot), (error: unknown) => (error as { code?: string }).code === "23503");
  assert.deepEqual(calls.slice(0, 2), ["begin", "insert into"]);
  assert.ok(calls.includes("rollback"), "failed replacement must issue rollback");
  assert.ok(!calls.includes("commit"), "failed replacement must not commit");
  assert.equal(calls.at(-1), "release");
});

test("replacement rejects code snapshots before acquiring a database connection", async () => {
  const repository = new NeonDocumentIntelligence({ connect: async () => { throw new Error("must not connect"); } } as never);
  await assert.rejects(() => repository.replaceSnapshot({ ...snapshot, nodes: [{ id: "file:a", kind: "file", label: "a", payload: {} }] }), /Only document intelligence/);
  await assert.rejects(() => repository.replaceSnapshot({ ...snapshot, edges: [{ ...snapshot.edges[0], kind: "imports" }] }), /Only document intelligence/);
});

test("document impact rejects code seeds and invalid depth before querying", async () => {
  const repository = new NeonDocumentIntelligence({ query: async () => { throw new Error("must not query"); } } as never);
  await assert.rejects(() => repository.documentImpact("snapshot", "file:a", 2), /Code impact is retired/);
  await assert.rejects(() => repository.documentImpact("snapshot", "code:a", 2), /Code impact is retired/);
  await assert.rejects(() => repository.documentImpact("snapshot", "doc-a", 9), /Depth must/);
});

test("SQL document traversal excludes code bridges in a mixed historical snapshot", async () => {
  // SQLite executes the recursive query after adapting PostgreSQL array/cast syntax.
  // This exercises traversal semantics; live PostgreSQL verification is separate.
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(":memory:");
  try {
    db.exec(`attach database ':memory:' as repository_intelligence_v1;
      create table repository_intelligence_v1.nodes (snapshot_key text, node_id text, node_kind text, path text, label text);
      create table repository_intelligence_v1.edges (snapshot_key text, from_node_id text, to_node_id text, edge_kind text);
      insert into repository_intelligence_v1.nodes values
        ('old','doc-a','document',null,'A'), ('old','section-a','section',null,'Section A'),
        ('old','file:a','file','src/a.ts','A code'), ('old','doc-b','document',null,'B'),
        ('other','other-doc','document',null,'Other');
      insert into repository_intelligence_v1.edges values
        ('old','doc-a','section-a','contains'), ('old','section-a','file:a','references'),
        ('old','file:a','doc-b','references'), ('old','doc-a','doc-b','imports'),
        ('other','doc-a','other-doc','contains');`);
    const repository = new NeonDocumentIntelligence({
      async query(sql: string, values: [string, string, number, string[]]) {
        const portableSql = sql.replace('node_kind = any($4::text[])', 'node_kind in (select value from json_each($4))').replace('::integer', '');
        return { rows: db.prepare(portableSql).all({ $1: values[0], $2: values[1], $3: values[2], $4: JSON.stringify(values[3]) }).map((row) => ({ ...row })) };
      },
    } as never);
    assert.deepEqual(await repository.documentImpact("old", "doc-a", 8), [
      { node_id: "doc-a", node_kind: "document", path: null, label: "A", depth: 0 },
      { node_id: "section-a", node_kind: "section", path: null, label: "Section A", depth: 1 },
    ]);
    assert.equal((await repository.documentImpact("old", "doc-a", 0)).length, 1);
    assert.deepEqual(await repository.documentImpact("missing", "doc-a", 8), []);
    assert.equal(db.prepare("select count(*) as count from repository_intelligence_v1.nodes where node_kind = 'file'").get()?.count, 1);
  } finally {
    db.close();
  }
});


test("replacement commits through one acquired client and releases it", async () => {
  const statements: string[] = [];
  const client = {
    async query(sql: string) { statements.push(sql.trim()); return { rows: [] }; },
    release() { statements.push("release"); },
  };
  const repository = new NeonDocumentIntelligence({ connect: async () => client } as never);
  await repository.replaceSnapshot(snapshot);
  assert.equal(statements[0], "begin");
  assert.deepEqual(statements.slice(-2), ["commit", "release"]);
  assert.ok(!statements.includes("rollback"));
});
