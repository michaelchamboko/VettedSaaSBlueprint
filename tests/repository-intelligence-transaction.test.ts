import assert from "node:assert/strict";
import test from "node:test";
import { NeonRepositoryIntelligence } from "../src/lib/repository-intelligence/neon";
import type { IntelligenceSnapshot } from "../src/lib/repository-intelligence/graph";

const snapshot: IntelligenceSnapshot = {
  snapshotKey: "a".repeat(64), repository: "fixture", commitSha: "b".repeat(40),
  sourceManifestSha256: "c".repeat(64), graphSha256: "d".repeat(64),
  nodes: [{ id: "node-a", kind: "file", label: "a", payload: {} }],
  edges: [{ id: "edge-a", from: "node-a", to: "missing", kind: "imports", payload: {} }],
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
  const repository = new NeonRepositoryIntelligence(pool as never);

  await assert.rejects(() => repository.replaceSnapshot(snapshot), (error: unknown) => (error as { code?: string }).code === "23503");
  assert.deepEqual(calls.slice(0, 2), ["begin", "insert into"]);
  assert.ok(calls.includes("rollback"), "failed replacement must issue rollback");
  assert.ok(!calls.includes("commit"), "failed replacement must not commit");
  assert.equal(calls.at(-1), "release");
});
