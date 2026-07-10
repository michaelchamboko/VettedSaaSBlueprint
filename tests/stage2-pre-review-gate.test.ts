import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const staticChecks = [
  "route",
  "structure",
  "hero",
  "cta",
  "seo",
  "a11y",
  "links",
  "forms",
  "conversion",
  "responsive",
  "assets",
  "publish-readiness",
];

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const landingPagesDir = path.join(repoRoot, "src", "generated", "landing-pages");

async function landingArtifactCount() {
  const files = await readdir(landingPagesDir).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  return files.filter((file) => file.endsWith(".json") && file !== "index.json").length;
}

function staticReport(check: string, scannedCount: number) {
  return {
    schema_version: 1,
    tool: "scan-landing-static",
    check,
    status: "pass",
    scanned_count: scannedCount,
    issues: [],
    warnings: [],
    summary: {
      blocker_count: 0,
      warning_count: 0,
      finding_count: 0,
    },
  };
}

function uniquenessReport(scannedCount: number) {
  return {
    schema_version: 1,
    tool: "summarize-page-duplicates",
    target_dir: "src/generated/landing-pages",
    target: null,
    status: "pass",
    report_only: true,
    scanned_count: scannedCount,
    thresholds: {
      short_field_token_similarity: 0.8,
      composite_visible_page_similarity: 0.72,
      score_delta_max: 5,
    },
    duplicate_groups: [],
    near_duplicate_groups: [],
    composite_fingerprint_groups: [],
    semantic_pattern_groups: [],
    score_signature_groups: [],
    score_delta_groups: [],
    artifact_qa_issues: [],
    summary: {
      duplicate_group_count: 0,
      near_duplicate_group_count: 0,
      composite_fingerprint_group_count: 0,
      semantic_pattern_group_count: 0,
      score_signature_group_count: 0,
      score_delta_group_count: 0,
      artifact_issue_count: 0,
      finding_count: 0,
    },
  };
}

function complianceReport(scannedCount: number) {
  return {
    schema_version: 1,
    tool: "summarize-compliance-risks",
    status: "pass",
    publish_readiness: "eligible_for_conversion_review",
    target_dir: "src/generated/landing-pages",
    target: null,
    report_only: true,
    scanned_count: scannedCount,
    reason_codes: [],
    issue_arrays: {
      disclosure_issues: [],
      claim_issues: [],
      evidence_issues: [],
      partnerstack_issues: [],
      destination_issues: [],
      artifact_qa_issues: [],
      renderer_static_issues: [],
    },
    duplicate_like_risk_groups: [],
    files: [],
    summary: {
      disclosure_issue_count: 0,
      claim_issue_count: 0,
      evidence_issue_count: 0,
      partnerstack_issue_count: 0,
      destination_issue_count: 0,
      artifact_qa_issue_count: 0,
      renderer_static_issue_count: 0,
      duplicate_like_group_count: 0,
      blocker_count: 0,
      finding_count: 0,
    },
  };
}

function conversionCopyReport(scannedCount: number) {
  return {
    schema_version: 1,
    tool: "summarize-conversion-copy-risks",
    status: "pass",
    report_only: true,
    target_dir: "src/generated/landing-pages",
    target: null,
    scanned_count: scannedCount,
    summary: {
      issue_count: 0,
      duplicate_group_count: 0,
      high_severity_issue_count: 0,
      finding_count: 0,
    },
    duplicate_groups: [],
    issues: [],
  };
}

async function writeReport(reportDir: string, scan: string, report: unknown) {
  await writeFile(path.join(reportDir, `landing-scanner-${scan}.json`), `${JSON.stringify(report, null, 2)}\n`);
}

async function writePassingReports(reportDir: string) {
  const scannedCount = await landingArtifactCount();
  for (const check of staticChecks) {
    await writeReport(reportDir, check, staticReport(check, scannedCount));
  }
  await writeReport(reportDir, "uniqueness", uniquenessReport(scannedCount));
  await writeReport(reportDir, "compliance", complianceReport(scannedCount));
  await writeReport(reportDir, "conversion-copy", conversionCopyReport(scannedCount));
}

function runGate(reportDir: string) {
  return spawnSync(
    process.execPath,
    ["scripts/stage2-pre-review-gate.mjs", "--ci-prechecked", "--scanner-report-dir", reportDir],
    {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        GITHUB_SHA: "test-sha",
        GITHUB_RUN_ID: "100",
        GITHUB_RUN_ATTEMPT: "1",
      },
    },
  );
}

test("Stage 2 gate can consume complete scanner reports without rerunning scanners", async () => {
  const reportDir = await mkdtemp(path.join(os.tmpdir(), "stage2-reports-"));
  try {
    await writePassingReports(reportDir);

    const result = runGate(reportDir);

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /Stage 2 Pre-Review Gate Result/);
    assert.match(result.stdout, /artifact: landing-scanner-route\.json/);
    assert.doesNotMatch(result.stdout, /npm run scan:landing:route/);
  } finally {
    await rm(reportDir, { recursive: true, force: true });
  }
});

test("Stage 2 gate rejects scanner reports with inconsistent summaries", async () => {
  const reportDir = await mkdtemp(path.join(os.tmpdir(), "stage2-reports-"));
  try {
    await writePassingReports(reportDir);
    const tampered = staticReport("route", await landingArtifactCount());
    tampered.summary.finding_count = 1;
    await writeReport(reportDir, "route", tampered);

    const result = runGate(reportDir);

    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /scanner report validation failed/i);
    assert.match(result.stdout, /summary/i);
  } finally {
    await rm(reportDir, { recursive: true, force: true });
  }
});
