#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildLandingStaticReport, loadLandingStaticContext } from "./scan-landing-static.mjs";

const productionTargetDir = "src/generated/landing-pages";

export const landingQualityScanners = [
  { scan: "route", script: "scan:landing:route", kind: "static" },
  { scan: "structure", script: "scan:landing:structure", kind: "static" },
  { scan: "hero", script: "scan:landing:hero", kind: "static" },
  { scan: "cta", script: "scan:landing:cta", kind: "static" },
  { scan: "seo", script: "scan:landing:seo", kind: "static" },
  { scan: "a11y", script: "scan:landing:a11y", kind: "static" },
  { scan: "links", script: "scan:landing:links", kind: "static" },
  { scan: "forms", script: "scan:landing:forms", kind: "static" },
  { scan: "conversion", script: "scan:landing:conversion", kind: "static" },
  { scan: "responsive", script: "scan:landing:responsive", kind: "static" },
  { scan: "assets", script: "scan:landing:assets", kind: "static" },
  { scan: "publish-readiness", script: "scan:landing:publish-readiness", kind: "static" },
  { scan: "editorial-v2", script: "scan:landing:editorial-v2", kind: "static" },
  {
    scan: "compliance",
    script: "scan:landing:compliance",
    kind: "specialist",
    nodeArgs: [".agents/skills/affiliate-compliance-review/scripts/summarize-compliance-risks.mjs", "src/generated/landing-pages", "--json", "--report-only"],
  },
  {
    scan: "uniqueness",
    script: "scan:landing:uniqueness",
    kind: "specialist",
    nodeArgs: [".agents/skills/landing-page-uniqueness-review/scripts/summarize-page-duplicates.mjs", "src/generated/landing-pages", "--json", "--report-only"],
  },
  {
    scan: "conversion-copy",
    script: "scan:landing:conversion-copy",
    kind: "specialist",
    nodeArgs: [".agents/skills/conversion-copy-review/scripts/summarize-conversion-copy-risks.mjs", "src/generated/landing-pages", "--json", "--report-only"],
  },
];

function ensureMode(mode) {
  if (mode !== "draft" && mode !== "production") {
    throw new Error("Landing quality mode must be draft or production.");
  }
}

function parseJson(value) {
  if (!value?.trim()) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function failureReport(scanner, result) {
  return {
    schema_version: 1,
    tool: "landing-quality-runner",
    check: scanner.scan,
    status: "fail",
    reason_codes: ["scanner_did_not_emit_valid_json"],
    issues: [
      {
        severity: "blocker",
        reason_code: "scanner_did_not_emit_valid_json",
        message: `${scanner.script} exited ${result.exitCode} without a valid JSON report.${result.stderr ? ` ${result.stderr}` : ""}`,
      },
    ],
    warnings: [],
    summary: { blocker_count: 1, warning_count: 0, finding_count: 1 },
  };
}

function writeJson(filePath, value) {
  return writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function commandResult(command, args) {
  return new Promise((resolveCommand) => {
    let settled = false;
    let child;
    let stdout = "";
    let stderr = "";
    const finish = (result) => {
      if (settled) return;
      settled = true;
      resolveCommand(result);
    };
    try {
      child = spawn(command, args, { cwd: process.cwd() });
      child.stdout?.on("data", (chunk) => { stdout += chunk; });
      child.stderr?.on("data", (chunk) => { stderr += chunk; });
      child.once("error", (error) => finish({ exitCode: 1, stdout, stderr: `${stderr}${error.message}` }));
      child.once("close", (code) => finish({ exitCode: code ?? 1, stdout, stderr }));
    } catch (error) {
      finish({ exitCode: 1, stdout, stderr: error instanceof Error ? error.message : String(error) });
    }
  });
}

async function defaultRunScanner(scanner, staticContext, staticContextError, runSpecialistProcess) {
  if (scanner.kind === "static") {
    if (staticContextError) {
      return {
        exitCode: 1,
        stdout: "",
        stderr: staticContextError,
      };
    }
    return {
      exitCode: 0,
      stdout: JSON.stringify(buildLandingStaticReport(scanner.scan, staticContext)),
      stderr: "",
    };
  }
  if (scanner.kind === "specialist") return runSpecialistProcess(process.execPath, scanner.nodeArgs);
  return { exitCode: 1, stdout: "", stderr: `Unknown landing quality scanner kind for ${scanner.scan}.` };
}

export function stage2GateArgs({ scannerReportDir, mode, summaryFile, scope, ciParallelCore = false }) {
  const args = [
    "scripts/stage2-pre-review-gate.mjs",
    "--scanner-report-dir",
    scannerReportDir,
    "--quality-mode",
    mode,
    "--quality-summary-file",
    summaryFile,
  ];
  if (ciParallelCore) args.push("--ci-parallel-core");
  if (mode === "draft") {
    args.push(
      "--batch-id",
      scope.batch_id,
      "--batch-target-dir",
      scope.target_dir,
      "--batch-candidate-count",
      String(scope.candidate_count),
    );
  }
  return args;
}

async function defaultRunStage2Gate(context) {
  return commandResult(process.execPath, stage2GateArgs(context));
}

async function collectScanner(scanner, { reportDir, runScanner, startedAt }) {
  const scannerStartedAt = new Date().toISOString();
  const start = performance.now();
  let command;
  try {
    command = await runScanner(scanner);
  } catch (error) {
    command = {
      exitCode: 1,
      stdout: "",
      stderr: error instanceof Error ? error.message : String(error),
    };
  }
  const durationMs = Math.round(performance.now() - start);
  const parsed = parseJson(command.stdout);
  const report = parsed ?? failureReport(scanner, command);
  const reportFile = `landing-scanner-${scanner.scan}.json`;
  await writeJson(resolve(reportDir, reportFile), report);
  const failed = command.exitCode !== 0 || report.status !== "pass";
  return {
    scan: scanner.scan,
    script: scanner.script,
    report_file: reportFile,
    started_at: scannerStartedAt,
    collected_at: new Date().toISOString(),
    duration_ms: durationMs,
    exit_code: command.exitCode,
    report_status: report.status ?? "invalid",
    valid_json: parsed !== null,
    failed,
    run_started_at: startedAt,
  };
}

function createSummary({ mode, scope, reportDir, startedAt, scanners, gate }) {
  const scannerFailures = scanners.filter((scanner) => scanner.failed);
  const gateFailed = gate?.exit_code !== 0;
  return {
    schema_version: 1,
    mode,
    scope,
    report_dir: reportDir,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    scanner_count: scanners.length,
    scanner_failure_count: scannerFailures.length,
    scanners,
    gate: gate ?? { status: "pending", exit_code: null, duration_ms: null, stdout: "", stderr: "" },
    status: scannerFailures.length === 0 && !gateFailed ? "pass" : "fail",
  };
}

async function defaultLoadDraftBatchScope({ batchId, batchRoot, expectedGitCommitSha }) {
  const args = ["--import", "tsx", "scripts/validate-codex-landing-batch.ts", "--batch-id", batchId];
  if (batchRoot) args.push("--batch-root", batchRoot);
  if (expectedGitCommitSha) args.push("--git-commit-sha", expectedGitCommitSha);
  const result = await commandResult(process.execPath, args);
  const parsed = parseJson(result.stdout);
  if (result.exitCode !== 0 || parsed?.status !== "pass") {
    throw new Error(`Codex batch validation failed before draft scanning.${result.stderr ? ` ${result.stderr.trim()}` : ""}`);
  }
  return {
    batchId: parsed.batch_id,
    targetDir: parsed.draft_directory,
    draftFiles: parsed.draft_files,
    candidateCount: parsed.candidate_count,
  };
}

function normalizeDraftScope(scope, requestedBatchId) {
  if (!scope || scope.batchId !== requestedBatchId) throw new Error("Validated draft scope batch ID does not match --batch-id.");
  if (typeof scope.targetDir !== "string" || !scope.targetDir.trim()) throw new Error("Validated draft scope has no draft target directory.");
  if (!Array.isArray(scope.draftFiles) || scope.draftFiles.length === 0) throw new Error("Validated draft scope has no manifest-referenced draft files.");
  if (!Number.isInteger(scope.candidateCount) || scope.candidateCount !== scope.draftFiles.length) {
    throw new Error("Validated draft scope candidate count does not match its manifest-referenced draft files.");
  }
  return {
    kind: "codex_batch",
    batch_id: requestedBatchId,
    target_dir: resolve(scope.targetDir),
    candidate_count: scope.candidateCount,
    draft_files: [...scope.draftFiles].sort(),
  };
}

function scannersForScope(scanners, mode, scope) {
  if (mode !== "draft") return scanners;
  return scanners.map((scanner) => {
    if (scanner.kind !== "specialist") return scanner;
    return {
      ...scanner,
      nodeArgs: [scanner.nodeArgs[0], scope.target_dir, "--json", "--report-only", "--draft-input"],
    };
  });
}

export async function runLandingQuality({
  mode,
  batchId,
  batchRoot,
  expectedGitCommitSha,
  ciParallelCore = false,
  reportDir = ".stage2/landing-quality",
  scanners = landingQualityScanners,
  runScanner,
  runSpecialistProcess = commandResult,
  runStage2Gate = defaultRunStage2Gate,
  loadStaticContext = loadLandingStaticContext,
  loadDraftBatchScope = defaultLoadDraftBatchScope,
} = {}) {
  ensureMode(mode);
  if (mode === "draft" && !batchId) throw new Error("Draft landing quality requires an explicit Codex --batch-id.");
  if (!Array.isArray(scanners) || scanners.length !== 16) {
    throw new Error("Landing quality must run exactly 16 registered scanners.");
  }

  const resolvedReportDir = resolve(reportDir);
  const startedAt = new Date().toISOString();
  await mkdir(resolvedReportDir, { recursive: true });
  const scope = mode === "draft"
    ? normalizeDraftScope(await loadDraftBatchScope({ batchId, batchRoot, expectedGitCommitSha }), batchId)
    : { kind: "production_catalogue", target_dir: productionTargetDir };
  const scopedScanners = scannersForScope(scanners, mode, scope);
  let staticContext = null;
  let staticContextError = null;
  if (!runScanner && scopedScanners.some((scanner) => scanner.kind === "static")) {
    try {
      staticContext = loadStaticContext(mode === "draft"
        ? { inputMode: "draft", targetDir: scope.target_dir, draftFiles: scope.draft_files }
        : { inputMode: "production" });
    } catch (error) {
      staticContextError = error instanceof Error ? error.message : String(error);
    }
  }
  const executeScanner = runScanner ?? ((scanner) => defaultRunScanner(scanner, staticContext, staticContextError, runSpecialistProcess));
  const collectedScanners = await Promise.all(
    scopedScanners.map((scanner) => collectScanner(scanner, { reportDir: resolvedReportDir, runScanner: executeScanner, startedAt })),
  );

  const summaryPath = resolve(resolvedReportDir, "landing-quality-summary.json");
  await writeJson(summaryPath, createSummary({ mode, scope, reportDir: resolvedReportDir, startedAt, scanners: collectedScanners }));

  const gateStart = performance.now();
  const gateResult = await runStage2Gate({
    scannerReportDir: resolvedReportDir,
    mode,
    summaryFile: "landing-quality-summary.json",
    scope,
    ciParallelCore,
  });
  const gate = {
    status: gateResult.exitCode === 0 ? "pass" : "fail",
    exit_code: gateResult.exitCode,
    duration_ms: Math.round(performance.now() - gateStart),
    stdout: gateResult.stdout ?? "",
    stderr: gateResult.stderr ?? "",
  };
  const summary = createSummary({ mode, scope, reportDir: resolvedReportDir, startedAt, scanners: collectedScanners, gate });
  await writeJson(summaryPath, summary);

  return {
    status: summary.status,
    scannerFailures: collectedScanners.filter((scanner) => scanner.failed),
    gate,
    reportDir: resolvedReportDir,
    summary,
  };
}

function valueAfter(args, flag) {
  const index = args.indexOf(flag);
  return index === -1 ? null : args[index + 1] ?? null;
}

async function main() {
  const args = process.argv.slice(2);
  const result = await runLandingQuality({
    mode: valueAfter(args, "--mode"),
    batchId: valueAfter(args, "--batch-id") ?? undefined,
    batchRoot: valueAfter(args, "--batch-root") ?? undefined,
    expectedGitCommitSha: valueAfter(args, "--git-commit-sha") ?? undefined,
    ciParallelCore: args.includes("--ci-parallel-core"),
    reportDir: valueAfter(args, "--report-dir") ?? undefined,
  });
  console.log(JSON.stringify({
    status: result.status,
    mode: result.summary.mode,
    report_dir: result.reportDir,
    scanner_failure_count: result.scannerFailures.length,
    gate: result.gate,
    timing: {
      scanners_ms: result.summary.scanners.reduce((total, scanner) => total + scanner.duration_ms, 0),
      gate_ms: result.gate.duration_ms,
    },
  }, null, 2));
  if (result.status !== "pass") process.exitCode = 1;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
