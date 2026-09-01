import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

// @ts-expect-error The executable is intentionally plain ESM and is exercised through its runtime exports.
import { runLandingCandidateQuality } from "../scripts/run-landing-candidate-quality.mjs";

test("agent release candidate receives all sixteen durable quality reports", async () => {
  const reportDir = await mkdtemp(
    path.join(os.tmpdir(), "landing-candidate-quality-"),
  );
  try {
    const summary = await runLandingCandidateQuality({
      artifact: "elevenlabs-ai-voice-generator.json",
      reportDir,
    });

    assert.equal(summary.status, "pass");
    assert.equal(summary.check_count, 16);
    assert.deepEqual(summary.failed_checks, []);

    const persisted = JSON.parse(
      await readFile(
        path.join(reportDir, "landing-candidate-quality-summary.json"),
        "utf8",
      ),
    ) as typeof summary;
    assert.deepEqual(persisted, summary);
  } finally {
    await rm(reportDir, { recursive: true, force: true });
  }
});

test("candidate quality rejects directory traversal instead of scanning it", async () => {
  await assert.rejects(
    () =>
      runLandingCandidateQuality({
        artifact: "../elevenlabs-ai-voice-generator.json",
      }),
    /safe JSON artifact filename/i,
  );
});
