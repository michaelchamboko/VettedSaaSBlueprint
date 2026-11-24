#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildLandingStaticReport,
  landingStaticScanModes,
  loadLandingStaticContext,
} from "./scan-landing-static.mjs";
import { landingScanners } from "./landing-scanner-registry.mjs";
import { parseJsonObject as parseJson, runProcess } from "./landing-scanner-process.mjs";

// Candidate quality runs specialists in this order (distinct from the quality
// runner and Stage 2). Script paths are sourced from the shared registry.
const candidateSpecialistOrder = ["uniqueness", "compliance", "conversion-copy"];
const specialistScanners = candidateSpecialistOrder.map((scan) => {
  const registered = landingScanners.find((scanner) => scanner.scan === scan);
  return {
    check: registered.scan,
    script: registered.nodeArgs[0],
  };
});

function validateArtifactName(artifact) {
  if (
    typeof artifact !== "string" ||
    basename(artifact) !== artifact ||
    !artifact.endsWith(".json") ||
    artifact === "index.json"
  ) {
    throw new Error(
      "Candidate quality requires one safe JSON artifact filename.",
    );
  }
  return artifact;
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function runLandingCandidateQuality({
  artifact,
  targetDir = "src/generated/landing-pages",
  reportDir,
  runSpecialistProcess = runProcess,
} = {}) {
  const artifactName = validateArtifactName(artifact);
  const resolvedTargetDir = resolve(targetDir);
  const resolvedReportDir = resolve(
    reportDir ??
      `.stage2/landing-quality/candidates/${artifactName.replace(/\.json$/, "")}`,
  );
  await mkdir(resolvedReportDir, { recursive: true });

  const staticContext = loadLandingStaticContext({
    inputMode: "draft",
    targetDir: resolvedTargetDir,
    draftFiles: [artifactName],
  });
  const reports = landingStaticScanModes.map((check) =>
    buildLandingStaticReport(check, staticContext),
  );

  for (const scanner of specialistScanners) {
    const command = await runSpecialistProcess(process.execPath, [
      scanner.script,
      resolvedTargetDir,
      "--json",
      "--draft-input",
      "--target",
      artifactName,
    ]);
    const report = parseJson(command.stdout);
    reports.push(
      report ?? {
        schema_version: 1,
        tool: scanner.script,
        check: scanner.check,
        status: "error",
        error:
          command.stderr.trim() ||
          "The specialist scanner did not return valid JSON.",
      },
    );
  }

  await Promise.all(
    reports.map((report, index) =>
      writeJson(
        resolve(
          resolvedReportDir,
          `landing-scanner-${report.check ?? specialistScanners[index - landingStaticScanModes.length]?.check ?? index}.json`,
        ),
        report,
      ),
    ),
  );

  const failed = reports.filter((report) => report.status !== "pass");
  const summary = {
    schema_version: "LandingCandidateQualityV1",
    artifact: artifactName,
    target_dir: resolvedTargetDir,
    report_dir: resolvedReportDir,
    status: failed.length === 0 ? "pass" : "fail",
    check_count: reports.length,
    failed_checks: failed.map((report) => ({
      check: report.check ?? report.tool ?? "unknown",
      status: report.status ?? "invalid",
    })),
    checks: reports.map((report) => ({
      check: report.check ?? report.tool ?? "unknown",
      status: report.status ?? "invalid",
    })),
  };
  await writeJson(
    resolve(resolvedReportDir, "landing-candidate-quality-summary.json"),
    summary,
  );
  return summary;
}

function valueAfter(args, flag) {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
}

async function main() {
  const args = process.argv.slice(2);
  const summary = await runLandingCandidateQuality({
    artifact: valueAfter(args, "--artifact"),
    targetDir: valueAfter(args, "--target-dir"),
    reportDir: valueAfter(args, "--report-dir"),
  });
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (summary.status !== "pass") process.exitCode = 1;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
