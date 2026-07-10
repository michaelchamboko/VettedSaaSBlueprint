#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { spawnSync } from "node:child_process";

import {
  buildLandingStaticReport,
  landingStaticScanModes,
  loadLandingStaticContext,
} from "./scan-landing-static.mjs";

const rawArgs = process.argv.slice(2);
const args = new Set(rawArgs);
const staticOnly = args.has("--static-only");
const ciPrechecked = args.has("--ci-prechecked");
const scannerReportDir = valueAfter("--scanner-report-dir");
const landingPagesDir = "src/generated/landing-pages";

const scannerChecks = [
  { order: 7, check: "Landing-page route validation", script: "scan:landing:route", scan: "route", type: "static" },
  { order: 7.1, check: "Landing-page structure validation", script: "scan:landing:structure", scan: "structure", type: "static" },
  { order: 7.2, check: "Hero section validation", script: "scan:landing:hero", scan: "hero", type: "static" },
  { order: 7.3, check: "CTA validation", script: "scan:landing:cta", scan: "cta", type: "static" },
  { order: 8, check: "SEO metadata scanner", script: "scan:landing:seo", scan: "seo", type: "static" },
  { order: 9, check: "Accessibility scanner", script: "scan:landing:a11y", scan: "a11y", type: "static" },
  { order: 10, check: "Link scanner", script: "scan:landing:links", scan: "links", type: "static" },
  { order: 11, check: "Form validation scanner", script: "scan:landing:forms", scan: "forms", type: "static" },
  {
    order: 12,
    check: "Compliance scanner",
    script: "scan:landing:compliance",
    scan: "compliance",
    type: "compliance",
    nodeArgs: [".agents/skills/affiliate-compliance-review/scripts/summarize-compliance-risks.mjs", landingPagesDir, "--json"],
  },
  {
    order: 12.5,
    check: "Uniqueness / duplicate content scanner",
    script: "scan:landing:uniqueness",
    scan: "uniqueness",
    type: "uniqueness",
    nodeArgs: [".agents/skills/landing-page-uniqueness-review/scripts/summarize-page-duplicates.mjs", landingPagesDir, "--json"],
  },
  { order: 13, check: "Conversion / analytics instrumentation scanner", script: "scan:landing:conversion", scan: "conversion", type: "static" },
  {
    order: 13.5,
    check: "Conversion-copy scanner",
    script: "scan:landing:conversion-copy",
    scan: "conversion-copy",
    type: "conversion-copy",
    nodeArgs: [".agents/skills/conversion-copy-review/scripts/summarize-conversion-copy-risks.mjs", landingPagesDir, "--json"],
  },
  { order: 13.75, check: "Image / asset validation", script: "scan:landing:assets", scan: "assets", type: "static" },
  { order: 14, check: "Responsive layout static scanner", script: "scan:landing:responsive", scan: "responsive", type: "static" },
  { order: 14.5, check: "Publishing-readiness scanner", script: "scan:landing:publish-readiness", scan: "publish-readiness", type: "static" },
];

function valueAfter(flag) {
  const index = rawArgs.indexOf(flag);
  if (index === -1) return null;
  const value = rawArgs[index + 1];
  return value && !value.startsWith("--") ? value : null;
}

function npmArgs(script) {
  return ["run", "--silent", script];
}

function runCommand(script, options = {}) {
  if (options.prechecked && ciPrechecked) {
    return {
      status: "pass",
      command: options.commandLabel ?? `npm run ${script}`,
      failureReason: "Passed by required parallel CI job before Stage 2 report generation.",
    };
  }
  if (options.expensive && staticOnly) {
    return {
      status: "skipped",
      command: options.commandLabel ?? `npm run ${script}`,
      failureReason: "Skipped by --static-only; required in GitHub/Vercel before approval.",
    };
  }

  const result = spawnSync("npm", npmArgs(script), {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  const stdout = result.stdout?.trim() ?? "";
  const stderr = result.stderr?.trim() ?? "";
  const parsed = parseJson(stdout);

  if (result.status !== 0) {
    return {
      status: "fail",
      command: options.commandLabel ?? `npm run ${script}`,
      failureReason: summarizeFailure(script, parsed, stderr || stdout || `Command exited ${result.status}.`),
    };
  }

  return resultFromParsed(script, parsed, options.commandLabel ?? `npm run ${script}`);
}

function runNodeCommand(nodeArgs, commandLabel) {
  const result = spawnSync(process.execPath, nodeArgs, {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  const stdout = result.stdout?.trim() ?? "";
  const stderr = result.stderr?.trim() ?? "";
  const parsed = parseJson(stdout);

  if (result.status !== 0) {
    return {
      status: "fail",
      command: commandLabel,
      failureReason: summarizeFailure(commandLabel, parsed, stderr || stdout || `Command exited ${result.status}.`),
    };
  }

  return resultFromParsed(commandLabel, parsed, commandLabel);
}

function runStaticScan(script, mode, context) {
  const parsed = buildLandingStaticReport(mode, context);
  return resultFromParsed(script, parsed, `in-process ${script}`);
}

function runScannerCheck(definition, context) {
  if (scannerReportDir) return runScannerReport(definition);
  if (definition.type === "static") return runStaticScan(definition.script, definition.scan, context);
  return runNodeCommand(definition.nodeArgs, `direct node ${definition.script}`);
}

function runScannerReport(definition) {
  const filename = `landing-scanner-${definition.scan}.json`;
  const reportPath = join(scannerReportDir, filename);
  if (!existsSync(reportPath)) {
    return {
      status: "fail",
      command: `artifact: ${filename}`,
      failureReason: `scanner report validation failed: missing ${filename}.`,
    };
  }

  const parsed = parseJson(readFileSync(reportPath, "utf8"));
  const validationErrors = validateScannerReport(definition, parsed);
  if (validationErrors.length > 0) {
    return {
      status: "fail",
      command: `artifact: ${filename}`,
      failureReason: `scanner report validation failed: ${validationErrors.join("; ")}.`,
    };
  }

  return resultFromParsed(definition.script, parsed, `artifact: ${filename}`);
}

function parseJson(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function resultFromParsed(script, parsed, command) {
  if (!parsed || typeof parsed !== "object") {
    return {
      status: "fail",
      command,
      failureReason: `${script} did not emit valid JSON.`,
    };
  }

  if (parsed.status && parsed.status !== "pass") {
    return {
      status: "fail",
      command,
      failureReason: summarizeFailure(script, parsed, `${parsed.tool ?? script} reported status ${parsed.status}.`),
    };
  }

  return {
    status: "pass",
    command,
    failureReason: "",
  };
}

function validateScannerReport(definition, parsed) {
  const errors = [];
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return ["report is not a JSON object"];
  if (parsed.schema_version !== 1) errors.push("schema_version must be 1");
  if (parsed.status === "error") errors.push("status is error");
  if (!["pass", "fail"].includes(parsed.status)) errors.push("status must be pass or fail");
  if (parsed.target !== undefined && parsed.target !== null) errors.push("target must be null for full Stage 2 reports");
  if (parsed.scanned_count !== landingArtifactCount()) errors.push("scanned_count does not match current landing artifact count");

  if (definition.type === "static") validateStaticReport(definition, parsed, errors);
  else if (definition.type === "uniqueness") validateUniquenessReport(parsed, errors);
  else if (definition.type === "compliance") validateComplianceReport(parsed, errors);
  else if (definition.type === "conversion-copy") validateConversionCopyReport(parsed, errors);

  return errors;
}

function validateStaticReport(definition, parsed, errors) {
  if (parsed.tool !== "scan-landing-static") errors.push("tool must be scan-landing-static");
  if (parsed.check !== definition.scan) errors.push(`check must be ${definition.scan}`);
  if (!Array.isArray(parsed.issues)) errors.push("issues must be an array");
  if (!Array.isArray(parsed.warnings)) errors.push("warnings must be an array");
  const blockerCount = (parsed.issues ?? []).filter((item) => item?.severity !== "warning").length;
  const warningCount = (parsed.warnings ?? []).length;
  assertSummaryNumber(parsed, "blocker_count", blockerCount, errors);
  assertSummaryNumber(parsed, "warning_count", warningCount, errors);
  assertSummaryNumber(parsed, "finding_count", blockerCount + warningCount, errors);
  if (parsed.status === "pass" && blockerCount !== 0) errors.push("pass status cannot include blocker issues");
}

function validateUniquenessReport(parsed, errors) {
  if (parsed.tool !== "summarize-page-duplicates") errors.push("tool must be summarize-page-duplicates");
  if (parsed.target_dir !== landingPagesDir) errors.push(`target_dir must be ${landingPagesDir}`);
  const requiredArrays = [
    "duplicate_groups",
    "near_duplicate_groups",
    "composite_fingerprint_groups",
    "semantic_pattern_groups",
    "score_signature_groups",
    "score_delta_groups",
    "artifact_qa_issues",
  ];
  for (const key of requiredArrays) if (!Array.isArray(parsed[key])) errors.push(`${key} must be an array`);
  const findingCount =
    (parsed.duplicate_groups ?? []).length +
    (parsed.near_duplicate_groups ?? []).length +
    (parsed.semantic_pattern_groups ?? []).length +
    (parsed.score_delta_groups ?? []).length +
    (parsed.artifact_qa_issues ?? []).length;
  assertSummaryNumber(parsed, "finding_count", findingCount, errors);
  if (parsed.status === "pass" && findingCount !== 0) errors.push("pass status cannot include uniqueness findings");
}

function validateComplianceReport(parsed, errors) {
  if (parsed.tool !== "summarize-compliance-risks") errors.push("tool must be summarize-compliance-risks");
  if (parsed.target_dir !== landingPagesDir) errors.push(`target_dir must be ${landingPagesDir}`);
  const issueArrays = parsed.issue_arrays;
  const requiredIssueArrays = [
    "disclosure_issues",
    "claim_issues",
    "evidence_issues",
    "partnerstack_issues",
    "destination_issues",
    "artifact_qa_issues",
    "renderer_static_issues",
  ];
  if (!issueArrays || typeof issueArrays !== "object" || Array.isArray(issueArrays)) {
    errors.push("issue_arrays must be an object");
    return;
  }
  for (const key of requiredIssueArrays) if (!Array.isArray(issueArrays[key])) errors.push(`${key} must be an array`);
  const allIssues = Object.values(issueArrays).flat();
  const blockerCount = allIssues.filter((issue) => issue?.severity !== "warning").length;
  const findingCount = allIssues.length + (parsed.duplicate_like_risk_groups ?? []).length;
  assertSummaryNumber(parsed, "blocker_count", blockerCount, errors);
  assertSummaryNumber(parsed, "finding_count", findingCount, errors);
  if (parsed.status === "pass" && (blockerCount !== 0 || (parsed.duplicate_like_risk_groups ?? []).length !== 0)) {
    errors.push("pass status cannot include compliance blockers or duplicate-like groups");
  }
}

function validateConversionCopyReport(parsed, errors) {
  if (parsed.tool !== "summarize-conversion-copy-risks") errors.push("tool must be summarize-conversion-copy-risks");
  if (parsed.target_dir !== landingPagesDir) errors.push(`target_dir must be ${landingPagesDir}`);
  if (!Array.isArray(parsed.issues)) errors.push("issues must be an array");
  if (!Array.isArray(parsed.duplicate_groups)) errors.push("duplicate_groups must be an array");
  const issueCount = (parsed.issues ?? []).length;
  const duplicateCount = (parsed.duplicate_groups ?? []).length;
  const highSeverityCount = (parsed.issues ?? []).filter((issue) => issue?.severity === "high").length;
  assertSummaryNumber(parsed, "issue_count", issueCount, errors);
  assertSummaryNumber(parsed, "duplicate_group_count", duplicateCount, errors);
  assertSummaryNumber(parsed, "high_severity_issue_count", highSeverityCount, errors);
  assertSummaryNumber(parsed, "finding_count", issueCount + duplicateCount, errors);
  if (parsed.status === "pass" && issueCount + duplicateCount !== 0) errors.push("pass status cannot include conversion-copy findings");
}

function assertSummaryNumber(parsed, key, expected, errors) {
  if (parsed.summary?.[key] !== expected) errors.push(`summary.${key} must be ${expected}`);
}

function landingArtifactCount() {
  if (!existsSync(landingPagesDir)) return 0;
  return readdirSync(landingPagesDir).filter((file) => file.endsWith(".json") && file !== "index.json").length;
}

function validateReportDirectory() {
  if (!scannerReportDir) return [];
  if (!existsSync(scannerReportDir)) return [`scanner report directory does not exist: ${scannerReportDir}`];
  const expected = new Set(scannerChecks.map((item) => `landing-scanner-${item.scan}.json`));
  const actual = readdirSync(scannerReportDir).filter((file) => file.endsWith(".json"));
  const errors = [];
  for (const filename of expected) if (!actual.includes(filename)) errors.push(`missing scanner report ${filename}`);
  for (const filename of actual) if (!expected.has(basename(filename))) errors.push(`unexpected scanner report ${filename}`);
  return errors;
}

function summarizeFailure(script, parsed, fallback) {
  if (!parsed || typeof parsed !== "object") return fallback;
  const tool = parsed.tool ?? script;
  const status = parsed.status ?? "fail";
  const summary = parsed.summary ?? {};
  const parts = [`${tool} reported ${status}`];
  if (Number.isFinite(summary.blocker_count)) parts.push(`${summary.blocker_count} blocker(s)`);
  if (Number.isFinite(summary.finding_count)) parts.push(`${summary.finding_count} finding(s)`);
  if (Number.isFinite(summary.issue_count)) parts.push(`${summary.issue_count} issue(s)`);
  if (Number.isFinite(summary.duplicate_group_count)) parts.push(`${summary.duplicate_group_count} duplicate group(s)`);
  if (Number.isFinite(summary.high_severity_issue_count)) parts.push(`${summary.high_severity_issue_count} high-severity issue(s)`);
  if (Array.isArray(parsed.reason_codes) && parsed.reason_codes.length > 0) {
    parts.push(`reasons: ${parsed.reason_codes.slice(0, 8).join(", ")}${parsed.reason_codes.length > 8 ? ", ..." : ""}`);
  }
  if (Array.isArray(parsed.issues) && parsed.issues.length > 0) {
    parts.push(`first issue: ${parsed.issues[0].file ? `${parsed.issues[0].file} ` : ""}${parsed.issues[0].message ?? parsed.issues[0].reason_code}`);
  }
  return `${parts.join("; ")}.`;
}

function skipped(command, reason) {
  return { status: "skipped", command, failureReason: reason };
}

const reportDirectoryErrors = validateReportDirectory();
const staticContext = scannerReportDir ? null : loadLandingStaticContext();

const checks = [
  { order: 1, check: "Static task matrix validation", blocking: true, result: runNodeCommand(["scripts/validate-landing-workflow-matrix.mjs"], "direct node validate:landing:matrix") },
  { order: 2, check: "Typecheck", blocking: true, result: runCommand("typecheck", { expensive: true, prechecked: true }) },
  { order: 3, check: "Lint / static syntax validation", blocking: true, result: runCommand("lint", { expensive: true, prechecked: true }) },
  { order: 4, check: "Unit tests", blocking: true, result: runCommand("test", { expensive: true, prechecked: true }) },
  { order: 5, check: "Component tests", blocking: false, result: skipped("not configured", "No separate component-test target is configured yet; not required for High confidence until a component-test target exists.") },
  { order: 6, check: "Build validation", blocking: true, result: runCommand("build", { expensive: true, prechecked: true }) },
  ...scannerChecks.map((definition) => ({
    order: definition.order,
    check: definition.check,
    blocking: true,
    result: reportDirectoryErrors.length > 0
      ? {
          status: "fail",
          command: scannerReportDir ? `artifact: landing-scanner-${definition.scan}.json` : `npm run ${definition.script}`,
          failureReason: `scanner report validation failed: ${reportDirectoryErrors.join("; ")}.`,
        }
      : runScannerCheck(definition, staticContext),
  })),
];

if (landingStaticScanModes.length !== scannerChecks.filter((item) => item.type === "static").length) {
  checks.push({
    order: 14.6,
    check: "Static scanner registry consistency",
    blocking: true,
    result: {
      status: "fail",
      command: "static scanner registry",
      failureReason: "landingStaticScanModes and Stage 2 static scanner registry differ.",
    },
  });
}

const blockingFailures = checks.filter((item) => item.blocking && item.result.status !== "pass");
const coreOrders = new Set([1, 2, 3, 4, 6]);
const coreFailed = checks.some((item) => coreOrders.has(item.order) && item.result.status !== "pass");
const scannerFailed = checks.some((item) => item.order >= 7 && item.result.status !== "pass");
const skippedChecks = checks.filter((item) => item.result.status === "skipped");
const blockingSkippedChecks = skippedChecks.filter((item) => item.blocking);

let status = "PASS";
if (blockingFailures.length > 0) status = "FAIL";
else if (blockingSkippedChecks.length > 0) status = "CONDITIONAL PASS";

let confidence = "High";
let confidenceRationale = "All core deterministic checks and landing-page scanners passed, with no unresolved shared-state conflicts recorded.";
if (coreFailed || scannerFailed) {
  confidence = "Low";
  confidenceRationale = "At least one core deterministic check or blocking landing-page scanner failed, was skipped, or was unavailable.";
} else if (blockingSkippedChecks.length > 0) {
  confidence = "Medium";
  confidenceRationale = "Core deterministic checks passed, but blocking validation coverage is skipped or manual review remains required.";
}

const manualItems = [
  {
    item: "Owner publication approval",
    reason: "First publication and high-risk changes require audited owner approval after deterministic checks pass.",
    blocking: "Yes",
  },
  {
    item: "Specialist landing-page review loop",
    reason: "Intent, direct-review draft, uniqueness, compliance, conversion, and retro reviews remain subjective gates for publish approval.",
    blocking: "Yes",
  },
  {
    item: "Oracle/Hermes DB-backed success path",
    reason: "Data-backed checks must run only in the approved Oracle runtime after T02A and explicit approval.",
    blocking: "Yes for DB-backed approval only",
  },
];

const approvalDecision = blockingFailures.length > 0
  ? "Stop before human review."
  : blockingSkippedChecks.length > 0
    ? "Proceed with non-blocking warnings."
    : "Proceed to human review.";

function markdownEscape(value) {
  return String(value ?? "").replace(/\r?\n/g, " ").replace(/\|/g, "\\|");
}

console.log("## Stage 2 Pre-Review Gate Result");
console.log("");
console.log(`**Status:** ${status}  `);
console.log(`**Confidence:** ${confidence}  `);
console.log(`**Blocking Failures:** ${blockingFailures.length > 0 ? "Yes" : "No"}`);
console.log("");
console.log("---");
console.log("");
console.log("## Deterministic Checks");
console.log("");
console.log("| Order | Check | Command / Source | Status | Failure Reason | Blocking |");
console.log("|---:|---|---|---|---|---|");
for (const item of checks) {
  console.log(`| ${item.order} | ${markdownEscape(item.check)} | \`${markdownEscape(item.result.command)}\` | ${item.result.status} | ${markdownEscape(item.result.failureReason || "-")} | ${item.blocking ? "Yes" : "No"} |`);
}
console.log("");
console.log("---");
console.log("");
console.log("## Manual Review Items");
console.log("");
console.log("| Item | Reason Manual Review Is Required | Blocking Before Approval |");
console.log("|---|---|---|");
for (const item of manualItems) {
  console.log(`| ${markdownEscape(item.item)} | ${markdownEscape(item.reason)} | ${markdownEscape(item.blocking)} |`);
}
console.log("");
console.log("---");
console.log("");
console.log("## Confidence Rationale");
console.log("");
console.log(confidenceRationale);
console.log("");
console.log("---");
console.log("");
console.log("## Approval Decision");
console.log("");
console.log(approvalDecision);

if (status === "FAIL") process.exit(1);
