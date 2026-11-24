import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { zstdCompressSync } from "node:zlib";
import { test } from "node:test";
import { build } from "../scripts/code-intelligence/build.ts";
import { CBM_VERSION, PROJECT, assertNoSecret, git, parseCliJson, sha256, sourceManifest, validate, writeJson } from "../scripts/code-intelligence/common.ts";

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "cbm-test-"));
  execFileSync("git", ["init", "--quiet", root]);
  git(root, ["config", "user.email", "test@example.invalid"]);
  git(root, ["config", "user.name", "Graph test"]);
  writeFileSync(path.join(root, "password.ts"), "export const passwordLength = 12;\n");
  git(root, ["add", "."]); git(root, ["commit", "--quiet", "-m", "fixture"]);
  const source = sourceManifest(root);
  const dir = path.join(root, ".codebase-memory"); mkdirSync(dir);
  const dbPath = path.join(root, "test.db");
  const db = new DatabaseSync(dbPath);
  db.exec("CREATE TABLE projects(name TEXT, root_path TEXT); CREATE TABLE nodes(id INTEGER PRIMARY KEY, project TEXT); CREATE TABLE edges(id INTEGER PRIMARY KEY, project TEXT); CREATE TABLE file_hashes(rel_path TEXT);");
  db.prepare("INSERT INTO projects VALUES (?,?)").run(PROJECT, root);
  db.exec("INSERT INTO nodes VALUES (1, 'VettedSaaSBlueprint'); INSERT INTO edges VALUES (1, 'VettedSaaSBlueprint'); INSERT INTO file_hashes VALUES ('password.ts');"); db.close();
  const bytes = readFileSync(dbPath); const compressed = zstdCompressSync(bytes);
  writeFileSync(path.join(dir, "graph.db.zst"), compressed);
  writeJson(path.join(dir, "artifact.json"), { schema_version: 2, project: PROJECT, commit: source.commit, nodes: 1, edges: 1, original_size: bytes.length, compressed_size: compressed.length });
  writeFileSync(path.join(dir, ".gitattributes"), "graph.db.zst binary\n");
  writeJson(path.join(dir, "provenance.json"), { toolVersion: CBM_VERSION, sourceSha: source.commit, sourceDigest: source.digest, hashes: Object.fromEntries(["graph.db.zst", "artifact.json", ".gitattributes"].map(f => [f, sha256(readFileSync(path.join(dir, f)))])) });
  rmSync(dbPath);
  return { root, dir, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}
test("published artifact commits do not invalidate source binding or trigger another build", () => {
  const f = fixture();
  try {
    git(f.root, ["add", ".codebase-memory"]); git(f.root, ["commit", "--quiet", "-m", "publish graph"]);
    assert.equal(validate(f.root).current, true);
    assert.equal(build(f.root).status, "unchanged");
    writeFileSync(path.join(f.root, "password.ts"), "uncommitted secret-free edit\n");
    assert.equal(build(f.root).status, "unchanged", "publication uses committed bytes only");
    git(f.root, ["add", "password.ts"]); git(f.root, ["commit", "--quiet", "-m", "change source"]);
    assert.equal(validate(f.root).current, false);
  } finally { f.cleanup(); }
});
test("validator detects corrupted compressed graph before publication", () => {
  const f = fixture(); try {
    writeFileSync(path.join(f.dir, "graph.db.zst"), "broken");
    assert.throws(() => validate(f.root), /Checksum mismatch/);
  } finally { f.cleanup(); }
});
test("validator checks actual SQLite counts even if metadata and checksum agree", () => {
  const f = fixture(); try {
    const file = path.join(f.dir, "artifact.json"); const metadata = JSON.parse(readFileSync(file, "utf8")); metadata.nodes = 2; writeJson(file, metadata);
    const provenanceFile = path.join(f.dir, "provenance.json"); const provenance = JSON.parse(readFileSync(provenanceFile, "utf8")); provenance.hashes["artifact.json"] = sha256(readFileSync(file)); writeJson(provenanceFile, provenance);
    assert.throws(() => validate(f.root), /Graph count mismatch/);
  } finally { f.cleanup(); }
});
test("MCP errors are failures even when process exit status was zero", () => {
  assert.throws(() => parseCliJson(JSON.stringify({ isError: true, content: [{ text: "paths required" }] })), /CBM tool error/);
  assert.deepEqual(parseCliJson(JSON.stringify({ isError: false, structuredContent: { nodes: 3 } })), { nodes: 3 });
});
test("credential content is rejected without excluding legitimate password modules", () => {
  const f = fixture(); try {
    assert.equal(sourceManifest(f.root).included[0].path, "password.ts");
    assert.throws(() => assertNoSecret(Buffer.from("-----BEGIN " + "PRIVATE KEY-----"), "config.ts"), /Potential credential/);
  } finally { f.cleanup(); }
});

