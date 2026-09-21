import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { loadLandingStaticContext } from "../scripts/scan-landing-static.mjs";

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
  "editorial-v2",
];

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const draftBatchId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
type ReportScope = {
  mode: "draft" | "production";
  targetDir: string;
  count: number;
  editorialCount: number;
};

function productionReportScope(): ReportScope {
  const context = loadLandingStaticContext();
  return {
    mode: "production",
    targetDir: "src/generated/landing-pages",
    count: context.rows.length,
    editorialCount: context.rows.length + context.editorialRows.length,
  };
}

function draftReportScope(reportDir: string): ReportScope {
  return {
    mode: "draft",
    targetDir: path.join(reportDir, "drafts"),
    count: 1,
    editorialCount: 1,
  };
}

function draftGateArgs(scope: ReportScope) {
  return [
    "--quality-mode", "draft",
    "--quality-summary-file", "landing-quality-summary.json",
    "--batch-id", draftBatchId,
    "--batch-target-dir", scope.targetDir,
    "--batch-candidate-count", String(scope.count),
  ];
}

function staticReport(check: string, scannedCount: number, scope = productionReportScope()) {
  return {
    schema_version: 1,
    tool: "scan-landing-static",
    check,
    input_mode: scope.mode,
    target_dir: scope.targetDir,
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

function uniquenessReport(scannedCount: number, scope = productionReportScope()) {
  return {
    schema_version: 1,
    tool: "summarize-page-duplicates",
    input_mode: scope.mode,
    target_dir: scope.targetDir,
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

function complianceReport(scannedCount: number, scope = productionReportScope()) {
  return {
    schema_version: 1,
    tool: "summarize-compliance-risks",
    input_mode: scope.mode,
    status: "pass",
    publish_readiness: "eligible_for_conversion_review",
    target_dir: scope.targetDir,
    target: null,
    report_only: true,
    scanned_count: scannedCount,
    reason_codes: [] as string[],
    issue_arrays: {
      disclosure_issues: [],
      claim_issues: [] as Array<{ severity: string; reason_code: string }>,
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

function conversionCopyReport(scannedCount: number, scope = productionReportScope()) {
  return {
    schema_version: 1,
    tool: "summarize-conversion-copy-risks",
    input_mode: scope.mode,
    status: "pass",
    report_only: true,
    target_dir: scope.targetDir,
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

async function writePassingReports(reportDir: string, scope = productionReportScope()) {
  for (const check of staticChecks) {
    const scannedCount =
      check === "editorial-v2" ? scope.editorialCount : scope.count;
    await writeReport(reportDir, check, staticReport(check, scannedCount, scope));
  }
  await writeReport(reportDir, "uniqueness", uniquenessReport(scope.count, scope));
  await writeReport(reportDir, "compliance", complianceReport(scope.count, scope));
  await writeReport(reportDir, "conversion-copy", conversionCopyReport(scope.count, scope));
}

async function writeQualitySummary(reportDir: string, mode: "draft" | "production", scope = productionReportScope()) {
  const collectedAt = new Date().toISOString();
  await writeFile(path.join(reportDir, "landing-quality-summary.json"), `${JSON.stringify({
    schema_version: 1,
    mode,
    scope: mode === "production"
      ? { kind: "production_catalogue", target_dir: "src/generated/landing-pages" }
      : { kind: "codex_batch", batch_id: draftBatchId, target_dir: scope.targetDir, candidate_count: scope.count },
    scanner_count: 16,
    scanners: [
      ...staticChecks.map((scan) => ({ scan, report_file: `landing-scanner-${scan}.json`, collected_at: collectedAt, exit_code: 0, report_status: "pass", valid_json: true })),
      ...["uniqueness", "compliance", "conversion-copy"].map((scan) => ({ scan, report_file: `landing-scanner-${scan}.json`, collected_at: collectedAt, exit_code: 0, report_status: "pass", valid_json: true })),
    ],
  }, null, 2)}\n`);
}

function runGate(
  reportDir: string,
  extraArgs: string[] = [],
  envOverrides: Partial<NodeJS.ProcessEnv> = {},
) {
  const childEnv = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => key.toLowerCase() !== "path"),
  );
  return spawnSync(
    process.execPath,
    ["scripts/stage2-pre-review-gate.mjs", "--ci-parallel-core", "--scanner-report-dir", reportDir, ...extraArgs],
    {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...childEnv,
        ...envOverrides,
        NODE_ENV: envOverrides.NODE_ENV ?? process.env.NODE_ENV ?? "test",
        GITHUB_SHA: "test-sha",
        GITHUB_RUN_ID: "100",
        GITHUB_RUN_ATTEMPT: "1",
      },
    },
  );
}

test("CI parallel-core mode delegates all four core checks without spawning npm or claiming local passes", async () => {
  const reportDir = await mkdtemp(path.join(os.tmpdir(), "stage2-reports-"));
  try {
    const scope = draftReportScope(reportDir);
    await writePassingReports(reportDir, scope);
    await writeQualitySummary(reportDir, "draft", scope);

    const result = runGate(reportDir, draftGateArgs(scope), {
      PATH: path.join(reportDir, "no-npm-on-path"),
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    for (const order of [2, 3, 4, 6]) {
      assert.match(result.stdout, new RegExp(`\\| ${order} \\|[^\\n]*\\| delegated \\|`));
      assert.doesNotMatch(result.stdout, new RegExp(`\\| ${order} \\|[^\\n]*\\| pass \\|`));
    }
    assert.doesNotMatch(result.stdout, /prechecked|passed by required parallel CI job/i);
    assert.match(result.stdout, /not executed or evaluated by this landing job/i);
    assert.match(result.stdout, /GitHub aggregate is the release authority/i);
    assert.match(result.stdout, /High\/full confidence requires the aggregate workflow/i);
  } finally {
    await rm(reportDir, { recursive: true, force: true });
  }
});

test("Stage 2 gate accepts complete production reports without requiring Storage provenance", async () => {
  const reportDir = await mkdtemp(path.join(os.tmpdir(), "stage2-reports-"));
  try {
    await writePassingReports(reportDir);

    await writeQualitySummary(reportDir, "production");
    const result = runGate(reportDir, ["--quality-mode", "production", "--quality-summary-file", "landing-quality-summary.json"]);

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.doesNotMatch(result.stdout, /Storage provenance/i);
  } finally {
    await rm(reportDir, { recursive: true, force: true });
  }
});

test("Stage 2 gate rejects scanner reports with inconsistent summaries", async () => {
  const reportDir = await mkdtemp(path.join(os.tmpdir(), "stage2-reports-"));
  try {
    const scope = draftReportScope(reportDir);
    await writePassingReports(reportDir, scope);
    const tampered = staticReport("route", scope.count, scope);
    tampered.summary.finding_count = 1;
    await writeReport(reportDir, "route", tampered);
    await writeQualitySummary(reportDir, "draft", scope);

    const result = runGate(reportDir, draftGateArgs(scope));

    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /scanner report validation failed/i);
    assert.match(result.stdout, /summary/i);
  } finally {
    await rm(reportDir, { recursive: true, force: true });
  }
});

test("production mode rejects the legacy pending owner-approval state", async () => {
  const reportDir = await mkdtemp(path.join(os.tmpdir(), "stage2-reports-"));
  try {
    await writePassingReports(reportDir);
    const pending = complianceReport(productionReportScope().count);
    pending.publish_readiness = "pending_owner_approval";
    await writeReport(reportDir, "compliance", pending);
    await writeQualitySummary(reportDir, "production");

    const result = runGate(reportDir, ["--quality-mode", "production", "--quality-summary-file", "landing-quality-summary.json"]);

    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /not an advancing URL-to-live state/i);
  } finally {
    await rm(reportDir, { recursive: true, force: true });
  }
});

test("draft mode rejects the legacy pending owner-approval handoff", async () => {
  const reportDir = await mkdtemp(path.join(os.tmpdir(), "stage2-reports-"));
  try {
    const scope = draftReportScope(reportDir);
    await writePassingReports(reportDir, scope);
    const pending = complianceReport(scope.count, scope);
    pending.publish_readiness = "pending_owner_approval";
    await writeReport(reportDir, "compliance", pending);
    await writeQualitySummary(reportDir, "draft", scope);

    const result = runGate(reportDir, draftGateArgs(scope));

    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /not an advancing URL-to-live state/i);
  } finally {
    await rm(reportDir, { recursive: true, force: true });
  }
});

test("draft mode rejects unsupported claims even when a report marks them advisory", async () => {
  const reportDir = await mkdtemp(path.join(os.tmpdir(), "stage2-reports-"));
  try {
    const scope = draftReportScope(reportDir);
    await writePassingReports(reportDir, scope);
    const unsafe = complianceReport(scope.count, scope);
    unsafe.issue_arrays.claim_issues.push({ severity: "warning", reason_code: "unsupported_sensitive_claim" });
    unsafe.summary.finding_count = 1;
    await writeReport(reportDir, "compliance", unsafe);
    await writeQualitySummary(reportDir, "draft", scope);

    const result = runGate(reportDir, draftGateArgs(scope));

    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /unsupported_sensitive_claim/i);
  } finally {
    await rm(reportDir, { recursive: true, force: true });
  }
});

test("Stage 2 gate rejects stale consolidated-runner report metadata", async () => {
  const reportDir = await mkdtemp(path.join(os.tmpdir(), "stage2-reports-"));
  try {
    const scope = draftReportScope(reportDir);
    await writePassingReports(reportDir, scope);
    const staleAt = new Date(Date.now() - 16 * 60 * 1000).toISOString();
    await writeFile(path.join(reportDir, "landing-quality-summary.json"), `${JSON.stringify({
      schema_version: 1,
      mode: "draft",
      scope: { kind: "codex_batch", batch_id: draftBatchId, target_dir: scope.targetDir, candidate_count: scope.count },
      scanner_count: 16,
      scanners: [
        ...staticChecks.map((scan) => ({ scan, report_file: `landing-scanner-${scan}.json`, collected_at: staleAt, exit_code: 0, report_status: "pass", valid_json: true })),
        ...["uniqueness", "compliance", "conversion-copy"].map((scan) => ({ scan, report_file: `landing-scanner-${scan}.json`, collected_at: staleAt, exit_code: 0, report_status: "pass", valid_json: true })),
      ],
    }, null, 2)}\n`);

    const result = runGate(reportDir, draftGateArgs(scope));

    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /stale/i);
  } finally {
    await rm(reportDir, { recursive: true, force: true });
  }
});

test("Stage 2 gate rejects a missing consolidated scanner report", async () => {
  const reportDir = await mkdtemp(path.join(os.tmpdir(), "stage2-reports-"));
  try {
    const scope = draftReportScope(reportDir);
    await writePassingReports(reportDir, scope);
    await writeQualitySummary(reportDir, "draft", scope);
    await rm(path.join(reportDir, "landing-scanner-route.json"));

    const result = runGate(reportDir, draftGateArgs(scope));

    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /missing scanner report landing-scanner-route\.json/i);
  } finally {
    await rm(reportDir, { recursive: true, force: true });
  }
});

test("draft mode rejects placeholder compliance reason codes", async () => {
  const reportDir = await mkdtemp(path.join(os.tmpdir(), "stage2-reports-"));
  try {
    const scope = draftReportScope(reportDir);
    await writePassingReports(reportDir, scope);
    const unsafe = complianceReport(scope.count, scope);
    unsafe.reason_codes.push("placeholder_product_id");
    await writeReport(reportDir, "compliance", unsafe);
    await writeQualitySummary(reportDir, "draft", scope);

    const result = runGate(reportDir, draftGateArgs(scope));

    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /placeholder_product_id/i);
  } finally {
    await rm(reportDir, { recursive: true, force: true });
  }
});

test("draft mode rejects self-attested compliance reason codes", async () => {
  const reportDir = await mkdtemp(path.join(os.tmpdir(), "stage2-reports-"));
  try {
    const scope = draftReportScope(reportDir);
    await writePassingReports(reportDir, scope);
    const unsafe = complianceReport(scope.count, scope);
    unsafe.reason_codes.push("self_attested_owner_approval");
    await writeReport(reportDir, "compliance", unsafe);
    await writeQualitySummary(reportDir, "draft", scope);

    const result = runGate(reportDir, draftGateArgs(scope));

    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /self_attested_owner_approval/i);
  } finally {
    await rm(reportDir, { recursive: true, force: true });
  }
});
