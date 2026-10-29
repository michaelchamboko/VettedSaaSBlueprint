import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { buildRepositoryIntelligence, impactFromSnapshot } from "../src/lib/repository-intelligence/graph";

const root = process.cwd();

test("repository intelligence deterministically combines semantic and code relationships", () => {
  const first = buildRepositoryIntelligence(root);
  const second = buildRepositoryIntelligence(root);
  assert.equal(first.snapshotKey, second.snapshotKey);
  assert.ok(first.nodes.some((node) => node.kind === "document"));
  assert.ok(first.nodes.some((node) => node.kind === "section"));
  assert.ok(first.nodes.some((node) => node.kind === "file"));
  assert.ok(first.edges.some((edge) => edge.kind === "imports"));
  assert.ok(first.edges.some((edge) => edge.kind === "contains"));
  assert.ok(first.nodes.some((node) => node.id === "file:vercel.json"), "deployment configuration must be indexed");
  assert.ok(first.nodes.some((node) => node.id === "file:package.json"), "runtime configuration must be indexed");
  const tracked = new Set(execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" }).split(/\r?\n/).filter(Boolean));
  assert.ok(first.nodes.filter((node) => node.kind === "file").every((node) => node.path && tracked.has(node.path)), "commit-bound snapshots must exclude untracked files");
});

test("offline impact traversal returns a bounded, stable neighbourhood", () => {
  const snapshot = buildRepositoryIntelligence(root);
  const seed = snapshot.nodes.find((node) => node.kind === "file")!.id;
  const zero = impactFromSnapshot(snapshot, seed, 0);
  const two = impactFromSnapshot(snapshot, seed, 2);
  assert.deepEqual(zero, [{ id: seed, depth: 0 }]);
  assert.ok(two.length >= zero.length);
  assert.ok(two.every((entry) => entry.depth <= 2));
});

test("tracked repository contains no retired graph-tool paths or prose", () => {
  const banned = ["git", "nexus"].join("");
  const bannedSpaced = ["git", "nexus"].join(" ");
  const names = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { cwd: root, encoding: "utf8" })
    .split(/\r?\n/)
    .filter((file) => file && existsSync(path.join(root, file)));
  const pathMatches = names.filter((file) => file.toLowerCase().includes(banned));
  assert.deepEqual(pathMatches, []);

  const proseMatches: string[] = [];
  for (const file of names) {
    const contents = readFileSync(path.join(root, file));
    if (contents.includes(0)) continue;
    const text = contents.toString("utf8").toLowerCase();
    if (text.includes(banned) || text.includes(bannedSpaced)) proseMatches.push(file);
  }
  assert.deepEqual(proseMatches, []);
});
