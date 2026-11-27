import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const base = new URL("./", import.meta.url);

async function readJson(name) {
  return JSON.parse(await readFile(new URL(name, base), "utf8"));
}

function assertCompleteSequence(actual, expected, label) {
  assert.equal(actual.length, expected.length, `${label} count`);
  assert.equal(new Set(actual).size, actual.length, `${label} uniqueness`);
  assert.deepEqual([...new Set(actual)].sort((a, b) => a - b), expected, label);
}

test("issue 109 traceability accounts for every required item", async () => {
  const map = await readJson("traceability.json");

  assertCompleteSequence(
    map.prerequisiteTickets.map((entry) => entry.issue),
    Array.from({ length: 12 }, (_, index) => index + 97),
    "prerequisite tickets 97 through 108",
  );
  for (const entry of map.prerequisiteTickets) {
    assert.match(entry.issueUrl, new RegExp(`/issues/${entry.issue}$`));
    assert.ok(entry.evidencePaths.length > 0, `issue ${entry.issue} evidence`);
    assert.equal(
      new Set(entry.evidencePaths).size,
      entry.evidencePaths.length,
      `issue ${entry.issue} evidence path uniqueness`,
    );
    for (const evidencePath of entry.evidencePaths) {
      const absolutePath = fileURLToPath(new URL(evidencePath, base));
      assert.ok((await stat(absolutePath)).isFile(), `${evidencePath} resolves to a file`);
      const repositoryPath = path.relative(process.cwd(), absolutePath).replaceAll("\\", "/");
      const tracked = spawnSync("git", ["ls-files", "--error-unmatch", "--", repositoryPath], {
        cwd: process.cwd(),
        encoding: "utf8",
      });
      assert.equal(tracked.status, 0, `${evidencePath} is tracked at the integrated head`);
    }
    for (const field of ["priorEvidence", "newObservation", "unreachable", "futureAcceptance"]) {
      assert.ok(entry[field]?.trim(), `issue ${entry.issue} ${field}`);
    }
  }

  assertCompleteSequence(
    map.userStories.map((entry) => entry.story),
    Array.from({ length: 28 }, (_, index) => index + 1),
    "user stories 1 through 28",
  );
  for (const entry of map.userStories) {
    assert.ok(entry.criterion?.trim(), `story ${entry.story} criterion`);
    assert.ok(entry.evidence?.trim(), `story ${entry.story} evidence`);
    assert.ok(entry.status?.trim(), `story ${entry.story} status`);
  }

  assertCompleteSequence(
    map.testingDecisions.map((entry) => entry.decision),
    Array.from({ length: 11 }, (_, index) => index + 1),
    "testing decisions 1 through 11",
  );

  const questionTokens = map.interviewCoverage.flatMap((entry) => entry.questions);
  const coveredQuestions = new Set(questionTokens);
  assert.equal(coveredQuestions.size, questionTokens.length, "interview question token uniqueness");
  for (let number = 1; number <= 48; number += 1) {
    assert.ok(coveredQuestions.has(`Q${number}`), `Q${number} covered`);
  }
  for (const question of ["Q41a", "Q41b", "Q41c", "Original Q41"]) {
    assert.ok(coveredQuestions.has(question), `${question} covered`);
  }
  const q40 = map.interviewCoverage.find((entry) => entry.questions.includes("Q40"));
  assert.equal(q40?.status, "undecided");

  assertCompleteSequence(
    map.findings.map((entry) => entry.finding),
    Array.from({ length: 38 }, (_, index) => index + 1),
    "findings 1 through 38",
  );
  for (const entry of map.findings) {
    assert.ok(entry.futureCheck?.trim(), `finding ${entry.finding} future check`);
    assert.ok(entry.retainedArtifact?.trim(), `finding ${entry.finding} retained artifact`);
    assert.ok(entry.historicalAttribution?.trim(), `finding ${entry.finding} attribution`);
  }
});

test("issue 109 report defines a bounded future demonstration", async () => {
  const report = await readFile(new URL("reconciliation.md", base), "utf8");
  for (const heading of [
    "## Scope and authority",
    "## Reconciled result",
    "## Mechanism evidence",
    "## Traceability",
    "## Future WebCatalog demonstration",
    "### Entry conditions",
    "### Measurable checks",
    "### Retained artifacts",
    "### Permissions and explicit exclusions",
  ]) {
    assert.ok(report.includes(heading), `missing heading: ${heading}`);
  }
  assert.match(report, /Q40 remains undecided/);
  assert.match(report, /does not prove historical/);
  assert.match(report, /separate authorization/);
  assert.match(report, /primary checkout/);
  assert.match(report, /No product fix/i);
});
