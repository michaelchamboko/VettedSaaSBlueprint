import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm, readdir } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { buildWorkflowFixture } from "./fixtures/article-workflow-evidence";
import { samplePageBlueprint } from "./fixtures/sample-page-blueprint";
import { fullRewriteNotes, rewriteAllProse } from "./fixtures/article-content-approval";
import { createEditorialEvidence } from "../src/lib/editorial/refinement";
import { WORKFLOW_REVISION } from "../src/lib/article-import/workflow-requirements";
import { evaluateWorkflowEvidence, readEvidence, storeEvidence, validateEditorialExecution, validateResearchEvidence, type WorkflowEvidenceRecord } from "../src/lib/article-import/workflow-evidence";
import { captureCommandExecution, evidenceReference, extractOpenCodeExecution, freezeEvidenceGraph, proseProjectionDigest, sha256, validateExecutionEvidence, withEvidenceSnapshot } from "../src/lib/article-import/execution-evidence";

const id = "article-00000000-0000-4000-8000-000000000001";
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "workflow-proof-"));
  const before = { ...samplePageBlueprint, metadata: { ...samplePageBlueprint.metadata, canonical_url: "https://example.test/example", url_slug: "example" } };
  const after = rewriteAllProse("landing", before);
  const artifactPath = "artifact.json", editorialEvidencePath = "editorial.json";
  await writeFile(path.join(root, artifactPath), JSON.stringify(after));
  await writeFile(path.join(root, editorialEvidencePath), JSON.stringify(createEditorialEvidence("landing", before, after, fullRewriteNotes, { before: "score 3/5", after: "score 5/5 CLEAN" })));
  const record: WorkflowEvidenceRecord = { importId: id, sourceFingerprint: sha256("source"), format: "direct-review", stage: "RELEASING", workflowVersion: 2, requirementRevision: WORKFLOW_REVISION, artifactPath };
  record.evidenceRefs = await buildWorkflowFixture(root, record, { format: "direct-review", artifactPath, before, after, editorialEvidencePath });
  return { root, record };
}
test("valid synthetic producer chain passes; omitted prerequisites fail closed without writes", async () => {
  const { root, record } = await fixture();
  try {
    const before = (await readdir(root, { recursive: true })).sort();
    assert.deepEqual((await evaluateWorkflowEvidence(record, { root })).diagnostics, []);
    for (const key of ["research", "assessment", "editorial", "presentation"] as const) {
      const evidenceRefs = { ...record.evidenceRefs }; delete evidenceRefs[key];
      const result = await evaluateWorkflowEvidence({ ...record, evidenceRefs }, { root });
      assert.equal(result.ok, false, key); assert.match(result.diagnostics.join(), /REQUIRED/);
    }
    assert.deepEqual((await readdir(root, { recursive: true })).sort(), before);
    await writeFile(path.join(root, record.artifactPath!), "{}");
    assert.equal((await evaluateWorkflowEvidence(record, { root })).ok, false);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("editorial rejects reordered passes and an alias pretending to be a rival family", async () => {
  const { root, record } = await fixture();
  try {
    const editorial = await readEvidence(root, record.evidenceRefs!.editorial!) as { passes: Array<{ executionRef: { path: string; sha256: string } }> };
    const reordered = structuredClone(editorial); [reordered.passes[0], reordered.passes[1]] = [reordered.passes[1], reordered.passes[0]];
    await assert.rejects(validateEditorialExecution(root, await storeEvidence(root, id, reordered), record), /PASS_ORDER/);
    const execution = await readEvidence(root, editorial.passes[3].executionRef) as object;
    const forged = await storeEvidence(root, id, { ...execution, family: "different-name" });
    await assert.rejects(validateExecutionEvidence(root, forged), /CAPABILITY_UNAVAILABLE/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("research rejects changed snapshot bytes and unsupported excerpts", async () => {
  const { root, record } = await fixture();
  try {
    const value = await readEvidence(root, record.evidenceRefs!.research!) as { sources: Array<{ snapshotRef: { path: string } }>; claims: Array<{ excerptLocations: Array<{ quote: string }> }> };
    value.claims[0].excerptLocations[0].quote = "Not present in the primary snapshot";
    await assert.rejects(validateResearchEvidence(root, await storeEvidence(root, id, value), record), /EXCERPT_MISMATCH/);
    await writeFile(path.join(root, value.sources[0].snapshotRef.path), "changed");
    await assert.rejects(validateResearchEvidence(root, record.evidenceRefs!.research!, record), /HASH_MISMATCH/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("OpenCode extraction rejects unknown versions and mismatched parent linkage", () => {
  const input = { title: "Before" }, output = { title: "After" }, packetId = sha256("packet");
  const selection = { version: "1.19.4", sessionId: "session", userMessageId: "user", assistantMessageId: "answer", packetId, pass: "test", input, output, families: { "fixture/model": "family" } };
  const raw = { info: { id: "session" }, messages: [
    { info: { id: "user", role: "user", sessionID: "session" }, parts: [{ type: "text", text: JSON.stringify({ packetId, pass: "test", prose: input, digest: proseProjectionDigest(input) }) }] },
    { info: { id: "answer", role: "assistant", sessionID: "session", parentID: "user", providerID: "fixture", modelID: "model", finish: "stop", time: { created: 1, completed: 2 } }, parts: [{ type: "text", text: JSON.stringify(output) }, { type: "reasoning", text: "private payload" }] },
  ] };
  assert.equal(JSON.stringify(extractOpenCodeExecution(raw, selection)).includes("private payload"), false);
  assert.throws(() => extractOpenCodeExecution(raw, { ...selection, version: "future" }), /UNSUPPORTED/);
  raw.messages[1].info.parentID = "someone-else";
  assert.throws(() => extractOpenCodeExecution(raw, selection), /MESSAGE_MISMATCH/);
});
test("command producer captures a real harmless local command and rejects path escapes", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "command-proof-"));
  try {
    const execution = await captureCommandExecution(root, { executable: process.execPath, argv: ["-e", "process.stdout.write('fixture-output')"], toolVersion: process.version, inputRefs: [] });
    assert.equal(execution.kind, "command");
    if (execution.kind === "command") assert.equal(execution.stdout, "fixture-output");
    await assert.rejects(evidenceReference(root, "../package.json"));
    await mkdir(path.join(root, "config"));
    await writeFile(path.join(root, "config/check.txt"), "bounded");
    const ref = await evidenceReference(root, "config/check.txt");
    assert.equal(ref.sha256, sha256(await readFile(path.join(root, ref.path))));
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("frozen historical graph survives later source edits and rejects archive tampering", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "frozen-proof-"));
  try {
    await mkdir(path.join(root, "config"));
    await writeFile(path.join(root, "config/article-workflow-capabilities.json"), "{}");
    await writeFile(path.join(root, "mutable.json"), JSON.stringify({ retained: "original" }));
    const original = await evidenceReference(root, "mutable.json");
    const envelope = await storeEvidence(root, id, { predecessor: original });
    const frozen = await freezeEvidenceGraph(root, id, [envelope]);
    await writeFile(path.join(root, "mutable.json"), JSON.stringify({ retained: "new revision" }));
    await assert.rejects(readEvidence(root, original), /HASH_MISMATCH/);
    assert.deepEqual(await withEvidenceSnapshot(frozen, () => readEvidence(root, original)), { retained: "original" });
    await writeFile(path.join(root, frozen.find((entry) => entry.path === "mutable.json")!.archiveRef.path), "tampered archive");
    await assert.rejects(withEvidenceSnapshot(frozen, () => readEvidence(root, original)), /SNAPSHOT_BYTES_CHANGED/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
