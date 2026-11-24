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

export type DocumentIntelligenceSnapshot = {
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

export const DOCUMENT_NODE_KINDS = ["document", "section", "claim", "directive", "finding"] as const;

export function assertDocumentSeed(nodeId: string): void {
  if (/^(?:file|code):/i.test(nodeId)) throw new Error("Code impact is retired. Use codebase-memory-mcp for code relationships.");
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function edgeId(kind: string, from: string, to: string): string {
  return `${kind}:${sha256(`${from}|${to}`).slice(0, 20)}`;
}

export function buildDocumentIntelligence(repositoryRoot: string): DocumentIntelligenceSnapshot {
  const commitSha = execFileSync("git", ["-C", repositoryRoot, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const graphBytes = execFileSync("git", ["-C", repositoryRoot, "show", `${commitSha}:docs/document-intelligence/DOCUMENT_GRAPH.json`], { maxBuffer: 32 * 1024 * 1024 });
  const graph = JSON.parse(graphBytes.toString("utf8")) as CanonicalGraph;
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
  for (const relationship of graph.relationships) {
    addEdge({ id: relationship.id, from: relationship.from, to: relationship.to, kind: relationship.type, payload: relationship });
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

export function documentImpactFromSnapshot(snapshot: DocumentIntelligenceSnapshot, seedNode: string, maximumDepth = 2): Array<{ id: string; depth: number }> {
  assertDocumentSeed(seedNode);
  const semanticNodes = new Set(snapshot.nodes.filter((node) => DOCUMENT_NODE_KINDS.some((kind) => kind === node.kind)).map((node) => node.id));
  if (!semanticNodes.has(seedNode)) return [];
  const adjacency = new Map<string, Set<string>>();
  for (const edge of snapshot.edges) {
    if (!semanticNodes.has(edge.from) || !semanticNodes.has(edge.to) || edge.kind === "imports") continue;
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
