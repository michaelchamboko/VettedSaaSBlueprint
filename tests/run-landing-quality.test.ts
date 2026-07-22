import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

async function loadRunner() {
  return import("../scripts/run-landing-quality.mjs");
}

const scanners = Array.from({ length: 16 }, (_, index) => ({
  scan: `scanner-${index + 1}`,
  script: `scan:landing:scanner-${index + 1}`,
}));

const DRAFT_BATCH_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const DRAFT_TARGET_DIR = path.resolve("src/generated/landing-page-batches", DRAFT_BATCH_ID, "drafts");

function draftTestOptions() {
  return {
    batchId: DRAFT_BATCH_ID,
    loadDraftBatchScope: async () => ({
      batchId: DRAFT_BATCH_ID,
      targetDir: DRAFT_TARGET_DIR,
      draftFiles: ["workflow-fit-review.json"],
      candidateCount: 1,
    }),
  };
}

async function makeReportDir() {
  return mkdtemp(path.join(os.tmpdir(), "landing-quality-"));
}

function scannerRunner(failingScan?: string) {
  const calls: string[] = [];
  return {
    calls,
    runScanner: async (scanner: { scan: string }) => {
      calls.push(scanner.scan);
      const failed = scanner.scan === failingScan;
      return {
        exitCode: failed ? 1 : 0,
        stdout: JSON.stringify({ scan: scanner.scan, status: failed ? "fail" : "pass" }),
        stderr: failed ? "intentional scanner failure" : "",
      };
    },
  };
}

test("landing quality requires an explicit mode", async () => {
  const { runLandingQuality } = await loadRunner();
  const reportDir = await makeReportDir();
  try {
    await assert.rejects(
      () => runLandingQuality({ reportDir, scanners, runScanner: scannerRunner().runScanner }),
      /mode must be draft or production/i,
    );
  } finally {
    await rm(reportDir, { recursive: true, force: true });
  }
});

test("draft quality fails closed without an explicit Codex batch id", async () => {
  const { runLandingQuality } = await loadRunner();
  const reportDir = await makeReportDir();
  try {
    await assert.rejects(
      () => runLandingQuality({
        mode: "draft",
        reportDir,
        scanners,
        runScanner: scannerRunner().runScanner,
        runStage2Gate: async () => ({ exitCode: 0, stdout: "Stage 2 gate passed", stderr: "" }),
      }),
      /batch id|batch-id/i,
    );
  } finally {
    await rm(reportDir, { recursive: true, force: true });
  }
});

test("draft quality targets the validated batch drafts in every specialist scanner", async () => {
  const { runLandingQuality } = await loadRunner();
  const reportDir = await makeReportDir();
  const batchId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const targetDir = path.join(reportDir, batchId, "drafts");
  const childCalls: Array<{ command: string; args: string[] }> = [];
  try {
    const result = await runLandingQuality({
      mode: "draft",
      ...draftTestOptions(),
      batchId,
      reportDir,
      loadDraftBatchScope: async () => ({
        batchId,
        targetDir,
        draftFiles: ["workflow-fit-review.json"],
        candidateCount: 1,
      }),
      loadStaticContext: () => ({
        rows: [],
        editorialRows: [],
        manifest: { pages: [] },
        routeSource: "",
        componentSource: "",
        editorialComponentSource: "",
        stylesSource: "",
        generatedSource: "",
      }),
      runSpecialistProcess: async (command: string, args: string[]) => {
        childCalls.push({ command, args });
        return { exitCode: 0, stdout: JSON.stringify({ status: "pass" }), stderr: "" };
      },
      runStage2Gate: async () => ({ exitCode: 0, stdout: "Stage 2 gate passed", stderr: "" }),
    });

    assert.equal(result.status, "fail", "empty static fixture should fail, but specialist routing must still run");
    assert.equal(childCalls.length, 3);
    assert.ok(childCalls.every((call) => call.args.includes(targetDir)));
    assert.ok(childCalls.every((call) => call.args.includes("--draft-input")));
  } finally {
    await rm(reportDir, { recursive: true, force: true });
  }
});

test("landing quality writes all scanner reports and a timing summary before the gate", async () => {
  const { runLandingQuality } = await loadRunner();
  const reportDir = await makeReportDir();
  const runner = scannerRunner();
    const gateCalls: Array<{ scannerReportDir: string; ciParallelCore: boolean | undefined }> = [];
  try {
    const result = await runLandingQuality({
      mode: "draft",
      ...draftTestOptions(),
      reportDir,
      scanners,
      runScanner: runner.runScanner,
      ciParallelCore: true,
      runStage2Gate: async ({ scannerReportDir, ciParallelCore }: { scannerReportDir: string; ciParallelCore?: boolean }) => {
        gateCalls.push({ scannerReportDir, ciParallelCore });
        return { exitCode: 0, stdout: "Stage 2 gate passed", stderr: "" };
      },
    });

    assert.equal(result.status, "pass");
    assert.deepEqual(runner.calls, scanners.map((scanner) => scanner.scan));
    assert.deepEqual(gateCalls, [{ scannerReportDir: reportDir, ciParallelCore: true }]);
    const files = await readdir(reportDir);
    assert.equal(files.filter((file) => file.startsWith("landing-scanner-") && file.endsWith(".json")).length, 16);
    for (const scanner of scanners) {
      const report = JSON.parse(await readFile(path.join(reportDir, `landing-scanner-${scanner.scan}.json`), "utf8"));
      assert.equal(report.status, "pass");
    }
    const summary = JSON.parse(await readFile(path.join(reportDir, "landing-quality-summary.json"), "utf8"));
    assert.equal(summary.mode, "draft");
    assert.equal(summary.scanners.length, 16);
    assert.ok(summary.scanners.every((scanner: { duration_ms: number; exit_code: number }) => scanner.duration_ms >= 0 && scanner.exit_code === 0));
  } finally {
    await rm(reportDir, { recursive: true, force: true });
  }
});

test("landing quality preserves reports and fails after every scanner when a scanner or Stage 2 report gate fails", async () => {
  const { runLandingQuality } = await loadRunner();
  const reportDir = await makeReportDir();
  const runner = scannerRunner("scanner-4");
  try {
    const result = await runLandingQuality({
      mode: "production",
      reportDir,
      scanners,
      runScanner: runner.runScanner,
      runStage2Gate: async () => ({ exitCode: 1, stdout: "missing or stale scanner report", stderr: "" }),
    });

    assert.equal(result.status, "fail");
    assert.deepEqual(runner.calls, scanners.map((scanner) => scanner.scan));
    assert.equal(result.scannerFailures.length, 1);
    assert.equal(result.scannerFailures[0].scan, "scanner-4");
    assert.equal(result.gate.exit_code, 1);
    const files = await readdir(reportDir);
    assert.equal(files.filter((file) => file.startsWith("landing-scanner-") && file.endsWith(".json")).length, 16);
    const summary = JSON.parse(await readFile(path.join(reportDir, "landing-quality-summary.json"), "utf8"));
    assert.equal(summary.mode, "production");
    assert.equal(summary.status, "fail");
    assert.match(summary.gate.stdout, /missing or stale/i);
  } finally {
    await rm(reportDir, { recursive: true, force: true });
  }
});

test("landing quality collects every report and evaluates Stage 2 after a scanner invocation rejects", async () => {
  const { runLandingQuality } = await loadRunner();
  const reportDir = await makeReportDir();
  const calls: string[] = [];
  let gateCalled = false;
  try {
    const result = await runLandingQuality({
      mode: "draft",
      ...draftTestOptions(),
      reportDir,
      scanners,
      runScanner: async (scanner: { scan: string }) => {
        calls.push(scanner.scan);
        if (scanner.scan === "scanner-4") throw new Error("scanner process could not start");
        return { exitCode: 0, stdout: JSON.stringify({ status: "pass" }), stderr: "" };
      },
      runStage2Gate: async () => {
        gateCalled = true;
        return { exitCode: 0, stdout: "Stage 2 gate passed", stderr: "" };
      },
    });

    assert.equal(result.status, "fail");
    assert.deepEqual(calls, scanners.map((scanner) => scanner.scan));
    assert.equal(gateCalled, true);
    assert.equal(result.scannerFailures.length, 1);
    const files = await readdir(reportDir);
    assert.equal(files.filter((file) => file.startsWith("landing-scanner-") && file.endsWith(".json")).length, 16);
    const failedReport = JSON.parse(await readFile(path.join(reportDir, "landing-scanner-scanner-4.json"), "utf8"));
    assert.equal(failedReport.status, "fail");
    assert.match(failedReport.issues[0].message, /could not start/i);
  } finally {
    await rm(reportDir, { recursive: true, force: true });
  }
});

test("default Stage 2 gate arguments explicitly delegate core checks without claiming prechecks", async () => {
  const { stage2GateArgs } = await loadRunner();
  const args = stage2GateArgs({
    scannerReportDir: ".stage2/landing-quality/production",
    mode: "production",
    summaryFile: "landing-quality-summary.json",
    scope: { kind: "production_catalogue", target_dir: "src/generated/landing-pages" },
    ciParallelCore: true,
  });

  assert.ok(!args.includes("--ci-prechecked"));
  assert.ok(args.includes("--ci-parallel-core"));
  assert.equal(args[0], "scripts/stage2-pre-review-gate.mjs");
  assert.deepEqual(args.slice(0, 6), [
    "scripts/stage2-pre-review-gate.mjs",
    "--scanner-report-dir",
    ".stage2/landing-quality/production",
    "--quality-mode",
    "production",
    "--quality-summary-file",
  ]);
});

test("default landing quality preserves specialist reports when production provenance fails closed", async () => {
  const { landingQualityScanners, runLandingQuality } = await loadRunner();
  assert.equal(landingQualityScanners.filter((scanner: { kind: string }) => scanner.kind === "static").length, 13);
  assert.equal(landingQualityScanners.filter((scanner: { kind: string }) => scanner.kind === "specialist").length, 3);

  const reportDir = await makeReportDir();
  const childCalls: Array<{ command: string; args: string[] }> = [];
  try {
    const result = await runLandingQuality({
      mode: "production",
      reportDir,
      runSpecialistProcess: async (command: string, args: string[]) => {
        childCalls.push({ command, args });
        return { exitCode: 0, stdout: JSON.stringify({ status: "pass" }), stderr: "" };
      },
      runStage2Gate: async () => ({ exitCode: 0, stdout: "Stage 2 gate passed", stderr: "" }),
    });

    assert.equal(result.status, "fail");
    assert.equal(childCalls.length, 3);
    assert.ok(childCalls.every((call) => call.command === process.execPath));
    assert.ok(childCalls.every((call) => !call.args.includes("npm")));
    assert.ok(childCalls.every((call) => call.args.includes("src/generated/landing-pages")));
    assert.ok(childCalls.every((call) => !call.args.some((arg) => arg.includes("\\\\"))));
  } finally {
    await rm(reportDir, { recursive: true, force: true });
  }
});

test("landing quality preserves all reports when the shared static context cannot load", async () => {
  const { landingQualityScanners, runLandingQuality } = await loadRunner();
  const reportDir = await makeReportDir();
  let contextLoads = 0;
  let specialistCalls = 0;
  let gateCalled = false;

  try {
    const result = await runLandingQuality({
      mode: "production",
      reportDir,
      loadStaticContext: () => {
        contextLoads += 1;
        throw new Error("invalid provenance catalogue");
      },
      runSpecialistProcess: async () => {
        specialistCalls += 1;
        return { exitCode: 0, stdout: JSON.stringify({ status: "pass" }), stderr: "" };
      },
      runStage2Gate: async () => {
        gateCalled = true;
        return { exitCode: 1, stdout: "static reports failed closed", stderr: "" };
      },
    });

    assert.equal(contextLoads, 1);
    assert.equal(specialistCalls, 3);
    assert.equal(gateCalled, true);
    assert.equal(result.status, "fail");
    assert.equal(result.scannerFailures.length, 13);

    const files = await readdir(reportDir);
    assert.equal(files.filter((file) => file.startsWith("landing-scanner-") && file.endsWith(".json")).length, 16);
    const routeReport = JSON.parse(await readFile(path.join(reportDir, "landing-scanner-route.json"), "utf8"));
    assert.equal(routeReport.status, "fail");
    assert.match(routeReport.issues[0].message, /invalid provenance catalogue/i);

    const specialistNames = landingQualityScanners.filter((scanner: { kind: string }) => scanner.kind === "specialist");
    for (const scanner of specialistNames) {
      const report = JSON.parse(await readFile(path.join(reportDir, `landing-scanner-${scanner.scan}.json`), "utf8"));
      assert.equal(report.status, "pass");
    }
  } finally {
    await rm(reportDir, { recursive: true, force: true });
  }
});
