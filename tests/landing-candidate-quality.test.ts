import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
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

test("candidate quality runs specialists in exact candidate order with exact scoped arguments", async () => {
  const reportDir = await mkdtemp(path.join(os.tmpdir(), "landing-candidate-scope-"));
  const calls: Array<{ command: string; args: string[] }> = [];
  const artifact = "elevenlabs-ai-voice-generator.json";
  const expectedTargetDir = path.resolve("src/generated/landing-pages");
  try {
    await runLandingCandidateQuality({
      artifact,
      reportDir,
      runSpecialistProcess: async (command: string, args: string[]) => {
        calls.push({ command, args: [...args] });
        const script = args[0];
        const check = script.includes("uniqueness")
          ? "uniqueness"
          : script.includes("compliance")
            ? "compliance"
            : "conversion-copy";
        return { exitCode: 0, stdout: JSON.stringify({ check, status: "pass" }), stderr: "" };
      },
    });
    assert.equal(calls.length, 3);
    assert.match(calls[0].args[0], /summarize-page-duplicates\.mjs$/);
    assert.match(calls[1].args[0], /summarize-compliance-risks\.mjs$/);
    assert.match(calls[2].args[0], /summarize-conversion-copy-risks\.mjs$/);
    for (const call of calls) {
      assert.equal(call.command, process.execPath);
      assert.deepEqual(call.args, [
        call.args[0],
        expectedTargetDir,
        "--json",
        "--draft-input",
        "--target",
        artifact,
      ]);
      assert.ok(!call.args.includes("--report-only"));
      assert.ok(call.args.includes("--target"));
      assert.ok(call.args.includes(artifact));
    }
  } finally {
    await rm(reportDir, { recursive: true, force: true });
  }
});

test("candidate quality accepts a valid JSON report emitted on nonzero exit", async () => {
  const reportDir = await mkdtemp(path.join(os.tmpdir(), "landing-candidate-compat-"));
  try {
    const summary = await runLandingCandidateQuality({
      artifact: "elevenlabs-ai-voice-generator.json",
      reportDir,
      runSpecialistProcess: async (_command: string, args: string[]) => {
        const script = args[0];
        const check = script.includes("uniqueness")
          ? "uniqueness"
          : script.includes("compliance")
            ? "compliance"
            : "conversion-copy";
        return { exitCode: 1, stdout: JSON.stringify({ check, status: "pass" }), stderr: "nonzero but valid" };
      },
    });
    assert.equal(summary.status, "pass");
    assert.equal(summary.check_count, 16);
  } finally {
    await rm(reportDir, { recursive: true, force: true });
  }
});

test("candidate quality writes durable reports for all sixteen checks", async () => {
  const reportDir = await mkdtemp(path.join(os.tmpdir(), "landing-candidate-durable-"));
  try {
    const summary = await runLandingCandidateQuality({
      artifact: "elevenlabs-ai-voice-generator.json",
      reportDir,
    });
    assert.equal(summary.check_count, 16);
    const files = await readdir(reportDir);
    assert.equal(files.filter((file) => file.startsWith("landing-scanner-") && file.endsWith(".json")).length, 16);
    assert.ok(files.includes("landing-candidate-quality-summary.json"));
  } finally {
    await rm(reportDir, { recursive: true, force: true });
  }
});
