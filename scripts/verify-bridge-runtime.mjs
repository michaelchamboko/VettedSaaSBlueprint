import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const intelligenceRoot = path.join(repositoryRoot, 'docs', 'document-intelligence');
const bridgeRoot = path.join(intelligenceRoot, 'gitnexus-bridge');
const graph = JSON.parse(await fs.readFile(path.join(intelligenceRoot, 'DOCUMENT_GRAPH.json'), 'utf8'));

const identifier = (value) => {
  let result = value.replace(/[^A-Za-z0-9_]/g, '_');
  if (/^[0-9]/.test(result)) result = `_${result}`;
  return result;
};

const expectedNodes = new Map();
for (const section of graph.sections) expectedNodes.set(identifier(`section_${section.stable_uid}`), section.stable_uid);
for (const claim of graph.claims) expectedNodes.set(identifier(`claim_${claim.id}`), claim.id);
for (const directive of graph.directives) expectedNodes.set(identifier(`directive_${directive.id}`), directive.id);

const actualNodes = new Map();
for (const file of await fs.readdir(path.join(bridgeRoot, 'nodes'))) {
  if (!file.endsWith('.mjs')) continue;
  const bridgeModule = await import(pathToFileURL(path.join(bridgeRoot, 'nodes', file)).href);
  for (const [name, fn] of Object.entries(bridgeModule)) {
    if (typeof fn !== 'function') throw new Error(`Non-function node export: ${file}:${name}`);
    actualNodes.set(name, fn());
  }
}

const expectedNodeNames = [...expectedNodes.keys()].sort();
const actualNodeNames = [...actualNodes.keys()].sort();
if (JSON.stringify(expectedNodeNames) !== JSON.stringify(actualNodeNames)) throw new Error('Bridge node export set differs from canonical graph.');
for (const [name, expectedValue] of expectedNodes) {
  if (actualNodes.get(name) !== expectedValue) throw new Error(`Bridge node value mismatch: ${name}`);
}

const edgeById = new Map(graph.relationships.map((edge) => [edge.id, edge]));
const observedEdges = new Map();
for (const file of await fs.readdir(path.join(bridgeRoot, 'relationships'))) {
  if (!file.endsWith('.mjs')) continue;
  const bridgeModule = await import(pathToFileURL(path.join(bridgeRoot, 'relationships', file)).href);
  for (const [name, fn] of Object.entries(bridgeModule)) {
    if (typeof fn !== 'function') throw new Error(`Non-function relationship export: ${file}:${name}`);
    const value = fn();
    const expectedName = identifier(`relation_${value.id}`);
    if (name !== expectedName) throw new Error(`Relationship export name mismatch: ${file}:${name}`);
    const expected = edgeById.get(value.id);
    if (!expected) throw new Error(`Unexpected relationship export: ${value.id}`);
    if (value.type !== expected.type || value.classification !== expected.classification || value.resolutionState !== expected.resolution_state || value.from !== expected.from || value.to !== expected.to) {
      throw new Error(`Relationship value mismatch: ${value.id}`);
    }
    observedEdges.set(value.id, value);
  }
}

const expectedEdgeIds = [...edgeById.keys()].sort();
const observedEdgeIds = [...observedEdges.keys()].sort();
if (JSON.stringify(expectedEdgeIds) !== JSON.stringify(observedEdgeIds)) throw new Error('Bridge relationship export set differs from canonical graph.');

process.stdout.write(`${JSON.stringify({
  nodeExports: actualNodes.size,
  relationExports: observedEdges.size,
  endpointCallsExpected: graph.relationships.length * 2,
  status: 'pass',
})}\n`);
