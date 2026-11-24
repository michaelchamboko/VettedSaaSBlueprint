import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { buildDocumentIntelligence, documentImpactFromSnapshot } from "../src/lib/repository-intelligence/graph";

const root = process.cwd();

test("document intelligence is deterministic and excludes application files and imports", () => {
  const first = buildDocumentIntelligence(root);
  const second = buildDocumentIntelligence(root);
  assert.deepEqual(first, second);
  assert.ok(first.nodes.some((node) => node.kind === "document"));
  assert.ok(first.nodes.some((node) => node.kind === "section"));
  assert.ok(first.nodes.every((node) => ["document", "section", "claim", "directive", "finding"].includes(node.kind)));
  assert.ok(!first.nodes.some((node) => node.id.startsWith("file:")));
  assert.ok(!first.edges.some((edge) => edge.kind === "imports"));
  assert.ok(first.edges.some((edge) => edge.kind === "contains"));
  const canonical = JSON.parse(execFileSync("git", ["show", "HEAD:docs/document-intelligence/DOCUMENT_GRAPH.json"], { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }));
  const section = canonical.sections[0];
  assert.ok(documentImpactFromSnapshot(first, section.stable_uid, 1).some((entry) => entry.id === section.document_id && entry.depth === 1));
  assert.deepEqual(documentImpactFromSnapshot(first, section.stable_uid, 0), [{ id: section.stable_uid, depth: 0 }]);
});

test("document traversal cannot use legacy code nodes as a bridge", () => {
  const nodes = [
    { id: "doc-a", kind: "document" }, { id: "section-a", kind: "section" },
    { id: "file:src/code.ts", kind: "file" }, { id: "doc-b", kind: "document" },
  ].map((node) => ({ ...node, label: node.id, payload: {} }));
  const edges = [
    { from: "doc-a", to: "section-a", kind: "contains" },
    { from: "section-a", to: "file:src/code.ts", kind: "references" },
    { from: "file:src/code.ts", to: "doc-b", kind: "references" },
    { from: "doc-a", to: "doc-b", kind: "imports" },
  ].map((edge, index) => ({ ...edge, id: String(index), payload: {} }));
  const snapshot = { snapshotKey: "", repository: "fixture", commitSha: "", sourceManifestSha256: "", graphSha256: "", nodes, edges };
  assert.deepEqual(documentImpactFromSnapshot(snapshot, "doc-a", 8), [{ id: "doc-a", depth: 0 }, { id: "section-a", depth: 1 }]);
  assert.throws(() => documentImpactFromSnapshot(snapshot, "file:src/code.ts"), /Code impact is retired/);
  assert.throws(() => documentImpactFromSnapshot(snapshot, "code:any"), /Code impact is retired/);
  assert.deepEqual(documentImpactFromSnapshot(snapshot, "unknown"), []);
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
