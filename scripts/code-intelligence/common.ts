import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { zstdDecompressSync } from "node:zlib";

export const CBM_VERSION = "0.12.1";
export const PROJECT = "VettedSaaSBlueprint";
export const ARTIFACT_FILES = ["graph.db.zst", "artifact.json", ".gitattributes", "provenance.json"];
export const EXCLUDED_PREFIXES = [".git", ".codegraph", ".codebase-memory", ".artifacts", ".cache", ".worktrees", ".scratch", ".mece", ".opencode", ".automation", ".globalsetup-backups", "node_modules", ".next", ".vercel", "Article Intake", "build-pack/runtime", "build-pack/editorial", "gate-a-evidence", "gate-b-evidence"];
export function excluded(file: string): boolean {
  return EXCLUDED_PREFIXES.some(p => file === p || file.startsWith(p + "/")) ||
    /(^|\/)(\.env[^/]*|credentials(?:\.[^/]*)?|id_(?:rsa|ed25519|ecdsa|dsa))$/i.test(file) ||
    /\.(?:pem|key|p12|pfx|log|tsbuildinfo)$/i.test(file);
}
export function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}
export function git(root: string, args: string[]): string {
  return execFileSync("git", ["-C", root, ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}
export function sourceManifest(root: string, revision = "HEAD") {
  const commit = git(root, ["rev-parse", "--verify", `${revision}^{commit}`]).trim();
  const entries = git(root, ["ls-tree", "-rz", "--full-tree", commit]).split("\0").filter(Boolean).map(line => {
    const match = /^(\d+) (\w+) ([a-f0-9]+)\t([\s\S]+)$/.exec(line);
    if (!match) throw new Error("Malformed Git tree");
    const [, mode, type, oid, file] = match;
    if (file.split("/").some(part => part === "..") || file.includes("\\")) throw new Error("Unsafe Git path");
    return { mode, type, oid, path: file };
  });
  const included = entries.filter(e => !excluded(e.path) && ["100644", "100755"].includes(e.mode));
  return { commit, included, excluded: entries.filter(e => !included.includes(e)).map(e => e.path), digest: sha256(JSON.stringify(included)) };
}
export function assertNoSecret(bytes: Buffer, file: string): void {
  const text = bytes.toString("utf8");
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bAKIA[0-9A-Z]{16}\b|\bgh[pousr]_[A-Za-z0-9]{36,}\b/.test(text)) {
    throw new Error(`Potential credential in ${file}; graph publication stopped`);
  }
}
export function binary(): string {
  const candidate = process.env.CBM_BINARY ?? path.join(homedir(), ".local", "bin", process.platform === "win32" ? "codebase-memory-mcp.exe" : "codebase-memory-mcp");
  if (!existsSync(candidate)) throw new Error("Run node scripts/code-intelligence/install.ts first");
  const version = execFileSync(candidate, ["--version"], { encoding: "utf8" });
  if (!new RegExp(`\\b${CBM_VERSION.replaceAll(".", "\\.")}\\b`).test(version)) throw new Error("CBM version differs from pinned release");
  return candidate;
}
export function parseCliJson(text: string): Record<string, unknown> {
  const envelope = JSON.parse(text);
  if (envelope.isError) throw new Error(`CBM tool error: ${JSON.stringify(envelope.content)}`);
  const result = envelope.structuredContent ?? (envelope.content?.[0]?.text ? JSON.parse(envelope.content[0].text) : null);
  if (!result || typeof result !== "object") throw new Error("Missing CBM structured result");
  return result;
}
export function cbm(args: string[], cwd: string): Record<string, unknown> {
  return parseCliJson(execFileSync(binary(), ["cli", "--json", ...args], {
    cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: 30 * 60 * 1000,
    env: { ...process.env, CBM_WORKERS: process.env.CBM_WORKERS ?? "2" },
  }));
}
export function readJson(file: string) { return JSON.parse(readFileSync(file, "utf8")); }
export function writeJson(file: string, value: unknown) { writeFileSync(file, JSON.stringify(value, null, 2) + "\n"); }

// Inspect the actual SQLite payload, not only the adjacent self-reported metadata.
export function inspectGraph(dir: string, allowed: Set<string>) {
  const metadata = readJson(path.join(dir, "artifact.json"));
  if (metadata.schema_version !== 2 || metadata.project !== PROJECT || !/^[a-f0-9]{40}$/.test(metadata.commit)) throw new Error("Invalid CBM artifact metadata");
  const compressed = readFileSync(path.join(dir, "graph.db.zst"));
  const bytes = zstdDecompressSync(compressed, { maxOutputLength: 1024 * 1024 * 1024 });
  if (metadata.compressed_size !== compressed.length || metadata.original_size !== bytes.length) throw new Error("Artifact size mismatch");
  const scratch = mkdtempSync(path.join(tmpdir(), "cbm-validate-"));
  const file = path.join(scratch, "graph.db");
  writeFileSync(file, bytes, { mode: 0o600 });
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    if (Object.values(db.prepare("PRAGMA integrity_check").get() ?? {})[0] !== "ok") throw new Error("SQLite integrity check failed");
    if (db.prepare("PRAGMA foreign_key_check").all().length) throw new Error("Broken graph references");
    const projects = db.prepare("SELECT name, root_path FROM projects").all();
    const project = projects.find(p => p.name === PROJECT);
    if (!project || projects.some(p => p.name !== PROJECT && p.name !== `${PROJECT}::missed`)) throw new Error("Unexpected project in graph");
    const nodes = Number(db.prepare("SELECT count(*) AS n FROM nodes WHERE project = ?").get(PROJECT)?.n);
    const edges = Number(db.prepare("SELECT count(*) AS n FROM edges WHERE project = ?").get(PROJECT)?.n);
    if (!(nodes > 0 && edges > 0) || nodes !== metadata.nodes || edges !== metadata.edges) throw new Error("Graph count mismatch");
    const files = db.prepare("SELECT rel_path FROM file_hashes").all().map(row => String(row.rel_path));
    for (const rel of files) {
      if (rel.startsWith(".codebase-memory/.semantic-input/")) continue;
      if (!allowed.has(rel) || excluded(rel)) throw new Error(`Unexpected indexed file: ${rel}`);
    }
    return { nodes, edges, indexedFiles: files.filter(f => !f.startsWith(".codebase-memory/")).length, compressedBytes: compressed.length, originalBytes: bytes.length, exportRoot: String(project.root_path), metadata };
  } finally { db.close(); rmSync(scratch, { recursive: true }); }
}
export function validate(root: string, dir = path.join(root, ".codebase-memory")) {
  for (const file of ARTIFACT_FILES) if (!existsSync(path.join(dir, file))) throw new Error(`Missing graph file: ${file}`);
  const provenance = readJson(path.join(dir, "provenance.json"));
  if (provenance.toolVersion !== CBM_VERSION) throw new Error("Artifact tool version mismatch");
  const manifest = sourceManifest(root, provenance.sourceSha);
  git(root, ["merge-base", "--is-ancestor", manifest.commit, "HEAD"]);
  if (manifest.digest !== provenance.sourceDigest) throw new Error("Source digest mismatch");
  for (const file of ["graph.db.zst", "artifact.json", ".gitattributes"]) {
    if (sha256(readFileSync(path.join(dir, file))) !== provenance.hashes?.[file]) throw new Error(`Checksum mismatch: ${file}`);
  }
  const graph = inspectGraph(dir, new Set(manifest.included.map(e => e.path)));
  if (graph.metadata.commit !== manifest.commit) throw new Error("Native artifact/source commit mismatch");
  return { ...graph, sourceSha: manifest.commit, sourceDigest: manifest.digest, current: sourceManifest(root).digest === manifest.digest };
}

