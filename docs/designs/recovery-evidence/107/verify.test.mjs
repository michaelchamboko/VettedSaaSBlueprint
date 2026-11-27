import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("./", import.meta.url));

function readJson(...parts) {
  return JSON.parse(readFileSync(join(root, ...parts), "utf8"));
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

  const comparison = readJson("evaluation", "comparison.json");
  assert.equal(comparison.results.length, 6);
  assert.equal(comparison.summary.accurate, 6);
  assert.equal(comparison.summary.misses, 0);
  assert.equal(comparison.summary.falseAlarms, 0);
  assert.equal(comparison.summary.passed, true);
  for (const result of comparison.results) {
    assert.equal(result.verdictAccurate, true);
    assert.equal(result.explanationAccurate, true);
  }
});

