import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { verifyReadinessLedger } from "../scripts/verify-article-recovery-readiness.mjs";

test("issue 123 readiness ledger is complete and fails closed on missing proof", async () => {
  const result = await verifyReadinessLedger({ root: process.cwd() });

  assert.deepEqual(result.counts, {
    findings: 38,
    stories: 28,
    testingDecisions: 11,
    interviewQuestions: 52,
  });
  assert.equal(result.q40Disposition, "open-owner-decision");
  assert.equal(result.blindedJudgments.total, 6);
  assert.equal(result.browser.viewports.includes("390x844"), true);
  assert.equal(result.browser.viewports.includes("320x800"), true);
  assert.deepEqual(result.mutationScopes, ["asset", "content", "renderer", "rule", "style"]);
  assert.ok(result.missingProof.length > 0, "known missing proof must remain visible");
  assert.ok(result.missingProof.some((entry) => /positive content-depth control/i.test(entry)));
  assert.ok(result.missingProof.some((entry) => /ImageGen original PNG/i.test(entry)));
  assert.ok(result.missingProof.some((entry) => /finding 36.*normal-controller rejection/i.test(entry)));
});

test("strict verifier rejects a tampered readiness disposition", async () => {
  const root = process.cwd();
  const directory = await mkdtemp(path.join(os.tmpdir(), "readiness-ledger-tamper-"));
  try {
    const source = path.join(root, "docs/designs/recovery-evidence/123/readiness-ledger.json");
    const ledger = JSON.parse(await readFile(source, "utf8"));
    ledger.interviewQuestions.find((row) => row.id === "Q40").disposition = "passed";
    const ledgerPath = path.join(directory, "readiness-ledger.json");
    await writeFile(ledgerPath, JSON.stringify(ledger));
    await assert.rejects(verifyReadinessLedger({ root, ledgerPath }), /open-owner-decision|ledger digest/);
    const cli = spawnSync(process.execPath, ["scripts/verify-article-recovery-readiness.mjs", "--ledger", ledgerPath], { cwd: root, encoding: "utf8" });
    assert.notEqual(cli.status, 0, "CLI must exit nonzero for tampered evidence");
    assert.match(`${cli.stderr}${cli.stdout}`, /open-owner-decision|ledger digest/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
