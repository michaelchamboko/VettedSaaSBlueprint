import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { hasFlaggablePatternMatch } from "../scripts/scanner-negation.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nodePath = process.execPath;
const fixturePath = path.join(repoRoot, "src/generated/landing-pages/elevenlabs-ai-voice-generator.json");

const scanners = {
  compliance: {
    script: ".agents/skills/affiliate-compliance-review/scripts/summarize-compliance-risks.mjs",
    collection: (report: unknown) => (report as { issue_arrays?: { claim_issues?: unknown[] } }).issue_arrays?.claim_issues ?? [],
    fieldKey: "input_path",
  },
  conversion: {
    script: ".agents/skills/conversion-copy-review/scripts/summarize-conversion-copy-risks.mjs",
    collection: (report: unknown) => (report as { issues?: unknown[] }).issues ?? [],
    fieldKey: "field_path",
  },
  uniqueness: {
    script: ".agents/skills/landing-page-uniqueness-review/scripts/summarize-page-duplicates.mjs",
    collection: (report: unknown) => (report as { artifact_qa_issues?: unknown[] }).artifact_qa_issues ?? [],
    fieldKey: "field",
  },
};

async function baseFixture(): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(fixturePath, "utf8")) as Record<string, unknown>;
}

function faqAnswerIssues(report: unknown, scanner: (typeof scanners)[keyof typeof scanners]): unknown[] {
  return (scanner.collection(report) as Array<Record<string, unknown>>).filter(
    (item) => item[scanner.fieldKey] === "faq.0.answer",
  );
}

async function scanAnswer(name: keyof typeof scanners, answer: string) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "scanner-neg-"));
  try {
    const fixture = await baseFixture();
    const faq = fixture.faq as Array<Record<string, unknown>>;
    faq[0].answer = answer;
    await writeFile(path.join(dir, "page.json"), JSON.stringify(fixture), "utf8");
    const result = spawnSync(nodePath, [scanners[name].script, dir, "--draft-input", "--json"], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    assert.ok(result.status === 0 || result.status === 1, result.stderr || result.stdout);
    return JSON.parse(result.stdout) as unknown;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const NEGATED_CASES = [
  "Yes. Check the inboxes your readers use and review the final message before sending. A visual editor alone cannot guarantee consistent rendering.",
  "Results are not guaranteed.",
  "There is no guarantee of uptime.",
];

const FLAGGED_CASES = [
  "We guarantee consistent rendering.",
  "A visual editor alone cannot guarantee consistent rendering, but we guarantee results for every customer.",
  "Cannot guarantee X. Guaranteed results for Y.",
  "Our results are not less guaranteed.",
  "Do not avoid a guarantee.",
];

for (const scannerName of Object.keys(scanners) as Array<keyof typeof scanners>) {
  for (const answer of NEGATED_CASES) {
    test(`${scannerName}: negated guarantee is not flagged (${answer.slice(0, 40)}...)`, async () => {
      const report = await scanAnswer(scannerName, answer);
      const scanner = scanners[scannerName];
      const matches = faqAnswerIssues(report, scanner);
      assert.equal(matches.length, 0, `${scannerName} unexpectedly flagged faq.0.answer`);
    });
  }

  for (const answer of FLAGGED_CASES) {
    test(`${scannerName}: guarantee claim is flagged (${answer.slice(0, 40)}...)`, async () => {
      const report = await scanAnswer(scannerName, answer);
      const scanner = scanners[scannerName];
      const matches = faqAnswerIssues(report, scanner);
      assert.ok(matches.length > 0, `${scannerName} did not flag faq.0.answer`);
    });
  }
}

// Scanner-specific price/refund/discount retention.
test("compliance: price term remains flagged", async () => {
  const report = await scanAnswer("compliance", "The plan costs $50 per month.");
  const matches = faqAnswerIssues(report, scanners.compliance);
  assert.ok(matches.length > 0);
});

test("compliance: refund term remains flagged", async () => {
  const report = await scanAnswer("compliance", "Full refund available for all plans.");
  const matches = faqAnswerIssues(report, scanners.compliance);
  assert.ok(matches.length > 0);
});

test("compliance: discount term remains flagged", async () => {
  const report = await scanAnswer("compliance", "Get 50% off your first year.");
  const matches = faqAnswerIssues(report, scanners.compliance);
  assert.ok(matches.length > 0);
});

test("uniqueness: pricing term remains flagged", async () => {
  const answer = "Current pricing is subject to change.";
  const report = await scanAnswer("uniqueness", answer);
  const matches = faqAnswerIssues(report, scanners.uniqueness);
  assert.ok(matches.length > 0);
});

test("uniqueness: refund term remains flagged", async () => {
  const report = await scanAnswer("uniqueness", "Full refund available for all plans.");
  const matches = faqAnswerIssues(report, scanners.uniqueness);
  assert.ok(matches.length > 0);
});

test("uniqueness: discount term remains flagged", async () => {
  const answer = "A discount is available.";
  const report = await scanAnswer("uniqueness", answer);
  const matches = faqAnswerIssues(report, scanners.uniqueness);
  assert.ok(matches.length > 0);
});

test("conversion: discount wording remains flagged", async () => {
  const report = await scanAnswer("conversion", "Get 50% off your first year.");
  const matches = faqAnswerIssues(report, scanners.conversion);
  assert.ok(matches.length > 0);
});

// Non-guarantee negation does not suppress an independent guarantee.
test("compliance: unrelated negation does not suppress guarantee", async () => {
  const answer = "We never offer refunds, but performance is guaranteed.";
  const report = await scanAnswer("compliance", answer);
  const matches = faqAnswerIssues(report, scanners.compliance);
  assert.ok(matches.length > 0);
});

// Helper edge cases.
test("helper: simple negated guarantee is not flaggable", () => {
  const value = "Results are not guaranteed.";
  const pattern = /guaranteed/i;
  assert.equal(hasFlaggablePatternMatch(pattern, value), false);
});

test("helper: double-negative guarantee remains flaggable", () => {
  const value = "Do not avoid a guarantee.";
  const pattern = /guarantee/i;
  assert.equal(hasFlaggablePatternMatch(pattern, value), true);
});

test("helper: comparative negation remains flaggable", () => {
  const value = "Our results are not less guaranteed.";
  const pattern = /guaranteed/i;
  assert.equal(hasFlaggablePatternMatch(pattern, value), true);
});
