import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("./", import.meta.url));

function readJson(...parts) {
  return JSON.parse(readFileSync(join(root, ...parts), "utf8"));
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
    const retainedComparison = comparisonById.get(id);
    assert.ok(result && expected && retainedComparison);
    assert.equal(retainedComparison.responsibility, expected.responsibility);
    assert.equal(retainedComparison.expectedVerdict, expected.expectedVerdict);
    assert.equal(retainedComparison.observedVerdict, result.verdict);
    const verdictAccurate = result.verdict === expected.expectedVerdict;
    assert.equal(retainedComparison.verdictAccurate, verdictAccurate);
    assert.equal(typeof retainedComparison.explanationAccurate, "boolean");
    assert.match(retainedComparison.assessment, /\S/);
    if (verdictAccurate && retainedComparison.explanationAccurate) accurate += 1;
    if (expected.expectedVerdict === "does_not_meet" && result.verdict === "meets") misses += 1;
    if (expected.expectedVerdict === "meets" && result.verdict === "does_not_meet") falseAlarms += 1;
  }
  const passed = accurate === ids.length && misses === 0 && falseAlarms === 0;
  assert.deepEqual(comparison.summary, {
    accurate,
    misses,
    falseAlarms,
    passed,
    threshold: comparison.summary.threshold,
  });
}

test("publishes six neutral reviewer packets without answer leakage", () => {
  const manifest = readJson("reviewer-manifest.json");
  assert.equal(manifest.cases.length, 6);
  assert.equal(new Set(manifest.cases.map(({ id }) => id)).size, 6);

  for (const entry of manifest.cases) {
    assert.match(entry.id, /^case-[a-z]+$/);
    assert.deepEqual(Object.keys(entry).sort(), ["id", "packet"].sort());

    const packet = readFileSync(join(root, entry.packet), "utf8");
    assert.doesNotMatch(packet, /defective|adequate|answer key|expected verdict/i);
    assert.match(packet, /meets|does_not_meet/);
    assert.match(packet, /Observed evidence/);
    assert.match(packet, /Explanation/);
  }
});
test("keeps the answer key separate and covers each responsibility twice", () => {
  const key = readJson("evaluation", "answer-key.json");
  assert.equal(key.cases.length, 6);
  assert.deepEqual(
    [...new Set(key.cases.map(({ responsibility }) => responsibility))].sort(),
    ["cta-destination", "keyboard-scroll", "rewrite-fidelity"],
  );

  for (const responsibility of ["cta-destination", "keyboard-scroll", "rewrite-fidelity"]) {
    const cases = key.cases.filter((entry) => entry.responsibility === responsibility);
    assert.equal(cases.length, 2);
    assert.deepEqual(cases.map(({ expectedVerdict }) => expectedVerdict).sort(), ["does_not_meet", "meets"]);
  }
});

test("retains rendered interaction evidence for both keyboard cases", () => {
  const key = readJson("evaluation", "answer-key.json");
  for (const entry of key.cases.filter(({ responsibility }) => responsibility === "keyboard-scroll")) {
    const packet = readFileSync(join(root, "reviewer-packets", entry.caseId, "packet.md"), "utf8");
    assert.match(packet, /interaction\.webm/);
    assert.match(packet, /interaction\.json/);

    const interaction = readJson("reviewer-packets", entry.caseId, "interaction.json");
    assert.equal(interaction.caseId, entry.caseId);
    assert.equal(interaction.steps.length >= 3, true);
    assert.equal(typeof interaction.before.scrollLeft, "number");
    assert.equal(typeof interaction.after.scrollLeft, "number");

    const video = readFileSync(join(root, "reviewer-packets", entry.caseId, "interaction.webm"));
    assert.equal(video.byteLength > 0, true);
  }
});

test("freezes six independent results before scoring and reports no misses or false alarms", () => {
  const manifest = readJson("reviewer-manifest.json");
  const results = manifest.cases.map(({ id }) => readJson("results", `${id}.json`));
  assert.equal(new Set(results.map(({ reviewerId }) => reviewerId)).size, 6);
  assert.deepEqual(new Set(results.map(({ reviewedRevision }) => reviewedRevision)), new Set(["1ce0442"]));
  for (const result of results) {
    assert.equal(result.caseId.length > 0, true);
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
