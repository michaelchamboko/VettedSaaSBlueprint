import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import path from "node:path";

export type IntelligenceNode = {
  id: string;
  kind: string;
  path?: string;
  label: string;
  payload: Record<string, unknown>;
};

export type IntelligenceEdge = {
  id: string;
  from: string;
  to: string;
  kind: string;
  payload: Record<string, unknown>;
};

export type IntelligenceSnapshot = {
  snapshotKey: string;
  repository: string;
  commitSha: string;
  sourceManifestSha256: string;
  graphSha256: string;
  nodes: IntelligenceNode[];
  edges: IntelligenceEdge[];
};

type CanonicalGraph = {
  source_manifest_sha256: string;
  documents: Array<Record<string, unknown> & { id: string; path: string; title: string }>;
  sections: Array<Record<string, unknown> & { stable_uid: string; document_id: string; heading: string }>;
  claims: Array<Record<string, unknown> & { id: string; section_uid: string }>;
  directives: Array<Record<string, unknown> & { id: string; exact_text: string }>;
  relationships: Array<Record<string, unknown> & { id: string; from: string; to: string; type: string }>;
  findings: Array<Record<string, unknown> & { id: string; summary: string }>;
};

const CODE_EXTENSIONS = new Set([".cjs", ".js", ".mjs", ".ps1", ".psm1", ".py", ".ts", ".tsx"]);
const INDEXED_TEXT_EXTENSIONS = new Set([
  ...CODE_EXTENSIONS,
  ".css", ".graphql", ".html", ".json", ".md", ".mdx", ".scss", ".sh", ".sql", ".toml", ".txt", ".yaml", ".yml",
]);
const INDEXED_FILE_NAMES = new Set(["Dockerfile", "Procfile"]);
const MODULE_EXTENSIONS = ["", ".ts", ".tsx", ".js", ".mjs", ".cjs", ".py", "/index.ts", "/index.tsx", "/index.js"];

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function normalizedPath(value: string): string {
  return value.replaceAll("\\", "/");
}

function edgeId(kind: string, from: string, to: string): string {
  return `${kind}:${sha256(`${from}|${to}`).slice(0, 20)}`;
}

function committedFiles(repositoryRoot: string): Map<string, Buffer> {
  const archive = execFileSync("git", ["-C", repositoryRoot, "archive", "--format=tar", "HEAD"], { maxBuffer: 256 * 1024 * 1024 });
  const files = new Map<string, Buffer>();
  for (let offset = 0; offset + 512 <= archive.length;) {
    const header = archive.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const readField = (start: number, length: number) => header.subarray(start, start + length).toString("utf8").replace(/\0.*$/, "");
    const name = readField(0, 100);
    const prefix = readField(345, 155);
    const size = Number.parseInt(readField(124, 12).trim() || "0", 8);
    const type = readField(156, 1) || "0";
    const filePath = normalizedPath(prefix ? `${prefix}/${name}` : name);
    offset += 512;
    if (type === "0") files.set(filePath, Buffer.from(archive.subarray(offset, offset + size)));
    offset += Math.ceil(size / 512) * 512;
  }
  return files;
}

function resolveRelativeImport(sourcePath: string, specifier: string, tracked: Set<string>): string | null {
  if (!specifier.startsWith(".")) return null;
  const base = normalizedPath(path.posix.normalize(path.posix.join(path.posix.dirname(sourcePath), specifier)));
  for (const suffix of MODULE_EXTENSIONS) {
    const candidate = `${base}${suffix}`;
    if (tracked.has(candidate)) return candidate;
  }
  return null;
}

function extractImports(sourcePath: string, text: string, tracked: Set<string>): string[] {
  const matches = new Set<string>();
  const patterns = [
    /\b(?:import|export)\s+(?:[^"'\n]+?\s+from\s+)?["']([^"']+)["']/g,
    /\brequire\(\s*["']([^"']+)["']\s*\)/g,
    /\bimport\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const resolved = resolveRelativeImport(sourcePath, match[1], tracked);
      if (resolved) matches.add(resolved);
    }
  }
  return [...matches].sort();
}

export function buildRepositoryIntelligence(repositoryRoot: string): IntelligenceSnapshot {
  const committed = committedFiles(repositoryRoot);
  const graphBytes = committed.get("docs/document-intelligence/DOCUMENT_GRAPH.json");
  if (!graphBytes) throw new Error("Committed document graph is missing");
  const graph = JSON.parse(graphBytes.toString("utf8")) as CanonicalGraph;
  const commitSha = execFileSync("git", ["-C", repositoryRoot, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const trackedFiles = [...committed.keys()].sort();
  const tracked = new Set(trackedFiles);
  const nodes = new Map<string, IntelligenceNode>();
  const edges = new Map<string, IntelligenceEdge>();

  const addNode = (node: IntelligenceNode) => nodes.set(node.id, node);
  const addEdge = (edge: IntelligenceEdge) => {
    if (nodes.has(edge.from) && nodes.has(edge.to)) edges.set(edge.id, edge);
  };

  for (const document of graph.documents) {
    addNode({ id: document.id, kind: "document", path: document.path, label: document.title, payload: document });
  }
  for (const section of graph.sections) {
    addNode({ id: section.stable_uid, kind: "section", label: section.heading, payload: section });
    addEdge({ id: edgeId("contains", section.document_id, section.stable_uid), from: section.document_id, to: section.stable_uid, kind: "contains", payload: {} });
  }
  for (const claim of graph.claims) {
    addNode({ id: claim.id, kind: "claim", label: String(claim.exact_text ?? claim.id).slice(0, 160), payload: claim });
    addEdge({ id: edgeId("contains", claim.section_uid, claim.id), from: claim.section_uid, to: claim.id, kind: "contains", payload: {} });
  }
  for (const directive of graph.directives) {
    addNode({ id: directive.id, kind: "directive", label: directive.exact_text.slice(0, 160), payload: directive });
  }
  for (const finding of graph.findings) {
    addNode({ id: finding.id, kind: "finding", label: finding.summary, payload: finding });
  }
  const sourceTexts = new Map<string, string>();
  const indexedTextFiles = trackedFiles.filter((file) => INDEXED_TEXT_EXTENSIONS.has(path.extname(file).toLowerCase()) || INDEXED_FILE_NAMES.has(path.basename(file)));
  for (const file of indexedTextFiles) {
    const text = committed.get(file)!.toString("utf8");
    sourceTexts.set(file, text);
    addNode({ id: `file:${file}`, kind: "file", path: file, label: file, payload: { sha256: sha256(text) } });
  }
  for (const relationship of graph.relationships) {
    addEdge({ id: relationship.id, from: relationship.from, to: relationship.to, kind: relationship.type, payload: relationship });
  }
  for (const file of indexedTextFiles) {
    const text = sourceTexts.get(file)!;
    if (CODE_EXTENSIONS.has(path.extname(file))) {
      for (const imported of extractImports(file, text, tracked)) {
        addEdge({ id: edgeId("imports", `file:${file}`, `file:${imported}`), from: `file:${file}`, to: `file:${imported}`, kind: "imports", payload: {} });
      }
    }
    for (const match of text.matchAll(/\bD(?:0[1-9]|1[01])-S-[0-9a-f]{12}\b/g)) {
      addEdge({ id: edgeId("references", `file:${file}`, match[0]), from: `file:${file}`, to: match[0], kind: "references", payload: {} });
    }
  }

  const orderedNodes = [...nodes.values()].sort((a, b) => a.id.localeCompare(b.id));
  const orderedEdges = [...edges.values()].sort((a, b) => a.id.localeCompare(b.id));
  const graphSha256 = sha256(graphBytes);
  const repository = path.basename(repositoryRoot);
  const snapshotKey = sha256(JSON.stringify({
    repository,
    commitSha,
    sourceManifestSha256: graph.source_manifest_sha256,
    graphSha256,
    nodes: orderedNodes,
    edges: orderedEdges,
  }));
  return { snapshotKey, repository, commitSha, sourceManifestSha256: graph.source_manifest_sha256, graphSha256, nodes: orderedNodes, edges: orderedEdges };
}

export function impactFromSnapshot(snapshot: IntelligenceSnapshot, seedNode: string, maximumDepth = 2): Array<{ id: string; depth: number }> {
  if (!snapshot.nodes.some((node) => node.id === seedNode)) return [];
  const adjacency = new Map<string, Set<string>>();
  for (const edge of snapshot.edges) {
    if (!adjacency.has(edge.from)) adjacency.set(edge.from, new Set());
    if (!adjacency.has(edge.to)) adjacency.set(edge.to, new Set());
    adjacency.get(edge.from)!.add(edge.to);
    adjacency.get(edge.to)!.add(edge.from);
  }
  const depth = new Map<string, number>([[seedNode, 0]]);
  const queue = [seedNode];
  while (queue.length) {
    const current = queue.shift()!;
    const currentDepth = depth.get(current)!;
    if (currentDepth >= Math.max(0, Math.min(maximumDepth, 8))) continue;
    for (const adjacent of [...(adjacency.get(current) ?? [])].sort()) {
      if (!depth.has(adjacent)) {
        depth.set(adjacent, currentDepth + 1);
        queue.push(adjacent);
      }
    }
  }
  return [...depth].map(([id, value]) => ({ id, depth: value })).sort((a, b) => a.depth - b.depth || a.id.localeCompare(b.id));
}
