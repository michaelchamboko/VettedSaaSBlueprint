import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("./", import.meta.url));

function readJson(...parts) {
  return JSON.parse(readFileSync(join(root, ...parts), "utf8"));
}

function gitBlobAt(revision, path) {
  return execFileSync("git", ["rev-parse", `${revision}:${path}`], { encoding: "utf8" }).trim();
}

function verifyEvaluation(manifest, key, comparison, results) {
  const resultById = new Map(results.map((result) => [result.caseId, result]));
  const keyById = new Map(key.cases.map((entry) => [entry.caseId, entry]));
  const comparisonById = new Map(comparison.results.map((entry) => [entry.caseId, entry]));
  const ids = manifest.cases.map(({ id }) => id);
  assert.deepEqual([...resultById.keys()].sort(), [...ids].sort());
  assert.deepEqual([...keyById.keys()].sort(), [...ids].sort());
  assert.deepEqual([...comparisonById.keys()].sort(), [...ids].sort());

  let accurate = 0;
  let misses = 0;
  let falseAlarms = 0;
  for (const id of ids) {
    const result = resultById.get(id);
    const expected = keyById.get(id);
    const retained = comparisonById.get(id);
    assert.equal(retained.expectedVerdict, expected.expectedVerdict);
    assert.equal(retained.observedVerdict, result.verdict);
    const verdictAccurate = result.verdict === expected.expectedVerdict;
    assert.equal(retained.verdictAccurate, verdictAccurate);
    assert.equal(typeof retained.explanationAccurate, "boolean");
    assert.match(retained.assessment, /\S/);
    if (verdictAccurate && retained.explanationAccurate) accurate += 1;
    if (expected.expectedVerdict === "does_not_meet" && result.verdict === "meets") misses += 1;
    if (expected.expectedVerdict === "meets" && result.verdict === "does_not_meet") falseAlarms += 1;
  }
  assert.deepEqual(comparison.summary, {
    accurate,
    misses,
    falseAlarms,
    passed: accurate === ids.length && misses === 0 && falseAlarms === 0,
    threshold: "6/6 accurate verdicts with evidence-matching explanations",
  });
}

test("binds six neutral packets and the reviewer configuration to the examined revision", () => {
  const manifest = readJson("reviewer-manifest.json");
  const config = readJson("reviewer-config.json");
  assert.equal(manifest.examinedRevision, "cf0012f0b8d0795e9717ca427bc8bad4ce41ed2e");
  assert.equal(config.examinedRevision, manifest.examinedRevision);
  assert.equal(config.route.provider, "native-codex-subagent");
  assert.equal(config.route.paidExternalService, false);
  assert.equal(manifest.cases.length, 6);
  assert.equal(new Set(manifest.cases.map(({ id }) => id)).size, 6);
  for (const entry of manifest.cases) {
    assert.deepEqual(Object.keys(entry).sort(), ["id", "packet"]);
    const packet = readFileSync(join(root, entry.packet), "utf8");
    assert.doesNotMatch(packet, /defective|adequate|answer key|expected verdict|pair mapping/i);
    assert.match(packet, /Observed evidence/);
    assert.match(packet, /meets|does_not_meet/);
    assert.match(packet, /Explanation/);
  }
});

test("freezes three unchanged pairs with exact criteria and evidence objects", () => {
  const bindings = readJson("evaluation", "evidence-bindings.json");
  const key = readJson("evaluation", "answer-key.json");
  assert.equal(bindings.examinedRevision, "cf0012f0b8d0795e9717ca427bc8bad4ce41ed2e");
  assert.equal(bindings.sourceEvidenceRevision, "bebb4fe644b3d97e9a21f46a6e06938ed35684cb");
  assert.equal(bindings.cases.length, 6);
  for (const entry of bindings.cases) {
    assert.match(entry.criterion.heading, /\S/);
    assert.match(entry.criterion.stableId, /^D0[456]-S-[0-9a-f]+$/);
    assert.equal(gitBlobAt(bindings.sourceEvidenceRevision, entry.sourcePacket), entry.sourcePacketBlob);
    for (const artifact of Object.values(entry.interaction ?? {})) {
      assert.equal(gitBlobAt(bindings.sourceEvidenceRevision, artifact.path), artifact.blob);
    }
  }
  for (const responsibility of ["cta-destination", "rewrite-fidelity", "keyboard-scroll"]) {
    const pair = key.cases.filter((entry) => entry.responsibility === responsibility);
    assert.equal(pair.length, 2);
    assert.deepEqual(pair.map(({ expectedVerdict }) => expectedVerdict).sort(), ["does_not_meet", "meets"]);
  }
});

test("retains six genuine independent results and accurate miss accounting", () => {
  const manifest = readJson("reviewer-manifest.json");
  const results = manifest.cases.map(({ id }) => readJson("results", `${id}.json`));
  assert.equal(new Set(results.map(({ reviewerId }) => reviewerId)).size, 6);
  assert.deepEqual(new Set(results.map(({ reviewedRevision }) => reviewedRevision)), new Set([manifest.examinedRevision]));
  for (const result of results) {
    assert.equal(result.route, "native-codex-subagent");
    assert.equal(result.genuineIndependentJudgment, true);
    assert.match(result.observedEvidence, /\S/);
    assert.match(result.explanation, /\S/);
    assert.match(result.rawResponse, /\S/);
    assert.match(result.verdict, /^(meets|does_not_meet)$/);
  }

  const key = readJson("evaluation", "answer-key.json");
  const comparison = readJson("evaluation", "comparison.json");
  verifyEvaluation(manifest, key, comparison, results);

  const mutated = structuredClone(results);
  mutated[0].verdict = mutated[0].verdict === "meets" ? "does_not_meet" : "meets";
  assert.throws(() => verifyEvaluation(manifest, key, comparison, mutated));
});
