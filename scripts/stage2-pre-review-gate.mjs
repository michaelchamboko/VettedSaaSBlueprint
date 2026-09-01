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
const ciParallelCore = args.has("--ci-parallel-core");
const scannerReportDir = valueAfter("--scanner-report-dir");
const qualityMode = valueAfter("--quality-mode");
const qualitySummaryFile = valueAfter("--quality-summary-file");
const batchId = valueAfter("--batch-id");
const batchTargetDir = valueAfter("--batch-target-dir");
const batchCandidateCountValue = valueAfter("--batch-candidate-count");
const batchCandidateCount = batchCandidateCountValue === null ? null : Number(batchCandidateCountValue);
const landingPagesDir = "src/generated/landing-pages";
const maxQualityReportAgeMs = 15 * 60 * 1000;
const effectiveQualityMode = qualityMode ?? "production";
let cachedLandingCatalogueCounts = null;

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
  { order: 14.55, check: "Editorial v2 design-profile scanner", script: "scan:landing:editorial-v2", scan: "editorial-v2", type: "static" },
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
  if (options.parallelCore && ciParallelCore) {
    return {
      status: "delegated",
      command: options.commandLabel ?? `npm run ${script}`,
      failureReason: "Delegated to an enforced sibling workflow job; not executed or evaluated by this landing job. The GitHub aggregate is the release authority.",
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
  const nodeArgs = effectiveQualityMode === "draft"
    ? [definition.nodeArgs[0], batchTargetDir, "--json", "--draft-input"]
    : definition.nodeArgs;
  return runNodeCommand(nodeArgs, `direct node ${definition.script}`);
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
  if (parsed.scanned_count !== expectedScannedCount(definition)) errors.push("scanned_count does not match the authoritative landing scope");
  if (parsed.input_mode !== effectiveQualityMode) errors.push(`input_mode must be ${effectiveQualityMode}`);
  if (parsed.target_dir !== expectedTargetDir()) errors.push(`target_dir must be ${expectedTargetDir()}`);

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
  const reasonCodes = [
    ...(Array.isArray(parsed.reason_codes) ? parsed.reason_codes : []),
    ...allIssues.map((issue) => issue?.reason_code),
  ].filter((reasonCode) => typeof reasonCode === "string");
  const unsafeReasonCode = reasonCodes.find((reasonCode) => /^(?:placeholder|self_attested|unsupported_)/.test(reasonCode));
  if (unsafeReasonCode) errors.push(`compliance report includes blocking draft/production reason ${unsafeReasonCode}`);
  const legacyOwnerHandoffState = ["pending", "owner", "approval"].join("_");
  if (parsed.publish_readiness === legacyOwnerHandoffState) {
    errors.push("pending owner approval is not an advancing URL-to-live state");
  }
}

function validateConversionCopyReport(parsed, errors) {
  if (parsed.tool !== "summarize-conversion-copy-risks") errors.push("tool must be summarize-conversion-copy-risks");
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

function landingCatalogueCounts() {
  if (cachedLandingCatalogueCounts) return cachedLandingCatalogueCounts;
  const context = loadLandingStaticContext();
  cachedLandingCatalogueCounts = {
    production: context.rows.length,
    editorialV2: context.rows.length + context.editorialRows.length,
  };
  return cachedLandingCatalogueCounts;
}

function expectedScannedCount(definition) {
  if (effectiveQualityMode === "draft") return batchCandidateCount;
  const counts = landingCatalogueCounts();
  return definition.scan === "editorial-v2" ? counts.editorialV2 : counts.production;
}

function expectedTargetDir() {
  return effectiveQualityMode === "draft" ? batchTargetDir : landingPagesDir;
}

function validateBatchScopeArgs() {
  if (effectiveQualityMode !== "draft") return [];
  const errors = [];
  if (!batchId) errors.push("draft quality mode requires --batch-id");
  if (!batchTargetDir) errors.push("draft quality mode requires --batch-target-dir");
  if (!Number.isInteger(batchCandidateCount) || batchCandidateCount < 1 || batchCandidateCount > 10) {
    errors.push("draft quality mode requires --batch-candidate-count between 1 and 10");
  }
  return errors;
}

function validateReportDirectory() {
  if (!scannerReportDir) return [];
  if (!existsSync(scannerReportDir)) return [`scanner report directory does not exist: ${scannerReportDir}`];
  const expected = new Set(scannerChecks.map((item) => `landing-scanner-${item.scan}.json`));
  if (qualityMode || qualitySummaryFile) expected.add(qualitySummaryFile ?? "landing-quality-summary.json");
  const actual = readdirSync(scannerReportDir).filter((file) => file.endsWith(".json"));
  const errors = [];
  for (const filename of expected) if (!actual.includes(filename)) errors.push(`missing scanner report ${filename}`);
  for (const filename of actual) if (!expected.has(basename(filename))) errors.push(`unexpected scanner report ${filename}`);
  return errors;
}

function validateProductionCatalogue() {
  if (effectiveQualityMode !== "production") return [];
  try {
    landingCatalogueCounts();
    return [];
  } catch (error) {
    return [`production catalogue provenance validation failed: ${error instanceof Error ? error.message : String(error)}`];
  }
}

function validateQualitySummary() {
  if (!qualityMode && !qualitySummaryFile) return [];
  const errors = [];
  if (!scannerReportDir) return ["consolidated runner metadata requires --scanner-report-dir"];
  if (!qualityMode || !qualitySummaryFile) return ["consolidated runner metadata requires both --quality-mode and --quality-summary-file"];
  if (!["draft", "production"].includes(qualityMode)) return ["quality mode must be draft or production"];
  if (basename(qualitySummaryFile) !== qualitySummaryFile) return ["quality summary file must be a filename in the scanner report directory"];

  const summaryPath = join(scannerReportDir, qualitySummaryFile);
  if (!existsSync(summaryPath)) return [`missing consolidated runner summary ${qualitySummaryFile}`];
  const summary = parseJson(readFileSync(summaryPath, "utf8"));
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) return ["consolidated runner summary is not a JSON object"];
  if (summary.schema_version !== 1) errors.push("consolidated runner summary schema_version must be 1");
  if (summary.mode !== qualityMode) errors.push(`consolidated runner summary mode must be ${qualityMode}`);
  if (qualityMode === "draft") {
    if (summary.scope?.kind !== "codex_batch") errors.push("consolidated runner summary scope.kind must be codex_batch");
    if (summary.scope?.batch_id !== batchId) errors.push("consolidated runner summary batch_id does not match --batch-id");
    if (summary.scope?.target_dir !== batchTargetDir) errors.push("consolidated runner summary target_dir does not match --batch-target-dir");
    if (summary.scope?.candidate_count !== batchCandidateCount) errors.push("consolidated runner summary candidate_count does not match --batch-candidate-count");
  } else if (summary.scope?.kind !== "production_catalogue" || summary.scope?.target_dir !== landingPagesDir) {
    errors.push("consolidated runner summary must identify the production catalogue scope");
  }
  if (summary.scanner_count !== scannerChecks.length) errors.push(`consolidated runner summary scanner_count must be ${scannerChecks.length}`);
  if (!Array.isArray(summary.scanners)) return [...errors, "consolidated runner summary scanners must be an array"];

  const byScan = new Map();
  for (const scanner of summary.scanners) {
    if (!scanner || typeof scanner !== "object") {
      errors.push("consolidated runner summary contains an invalid scanner record");
      continue;
    }
    if (byScan.has(scanner.scan)) errors.push(`consolidated runner summary has duplicate scanner ${scanner.scan}`);
    byScan.set(scanner.scan, scanner);
  }
  for (const definition of scannerChecks) {
    const scanner = byScan.get(definition.scan);
    if (!scanner) {
      errors.push(`consolidated runner summary is missing scanner ${definition.scan}`);
      continue;
    }
    if (scanner.report_file !== `landing-scanner-${definition.scan}.json`) errors.push(`consolidated runner summary report filename is invalid for ${definition.scan}`);
    if (scanner.exit_code !== 0) errors.push(`consolidated runner summary records a non-zero exit for ${definition.scan}`);
    if (scanner.report_status !== "pass") errors.push(`consolidated runner summary records a non-pass report for ${definition.scan}`);
    if (scanner.valid_json !== true) errors.push(`consolidated runner summary records invalid JSON for ${definition.scan}`);
    const collectedAt = Date.parse(scanner.collected_at);
    if (!Number.isFinite(collectedAt)) errors.push(`consolidated runner summary has no collection timestamp for ${definition.scan}`);
    else if (Date.now() - collectedAt > maxQualityReportAgeMs) errors.push(`consolidated runner summary is stale for ${definition.scan}`);
  }
  if (byScan.size !== scannerChecks.length) errors.push(`consolidated runner summary must contain exactly ${scannerChecks.length} scanners`);
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

let staticContext = null;
let staticContextError = null;
if (!scannerReportDir) {
  try {
    staticContext = loadLandingStaticContext(effectiveQualityMode === "draft"
      ? {
          inputMode: "draft",
          targetDir: batchTargetDir,
          draftFiles: readdirSync(batchTargetDir).filter((file) => file.endsWith(".json") && file !== "index.json"),
        }
      : { inputMode: "production" });
  } catch (error) {
    staticContextError = error instanceof Error ? error.message : String(error);
  }
}
const reportDirectoryErrors = [
  ...validateBatchScopeArgs(),
  ...validateReportDirectory(),
  ...validateQualitySummary(),
  ...validateProductionCatalogue(),
  ...(staticContextError ? [`static scanner context failed to load: ${staticContextError}`] : []),
];

const checks = [
  { order: 1, check: "Static task matrix validation", blocking: true, result: runNodeCommand(["scripts/validate-landing-workflow-matrix.mjs"], "direct node validate:landing:matrix") },
  { order: 2, check: "Typecheck", blocking: !ciParallelCore, result: runCommand("typecheck", { expensive: true, parallelCore: true }) },
  { order: 3, check: "Lint / static syntax validation", blocking: !ciParallelCore, result: runCommand("lint", { expensive: true, parallelCore: true }) },
  { order: 4, check: "Unit tests", blocking: !ciParallelCore, result: runCommand("test", { expensive: true, parallelCore: true }) },
  { order: 5, check: "Component tests", blocking: false, result: skipped("not configured", "No separate component-test target is configured yet.") },
  { order: 6, check: "Build validation", blocking: !ciParallelCore, result: runCommand("build", { expensive: true, parallelCore: true }) },
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
const coreFailed = checks.some((item) => coreOrders.has(item.order) && !["pass", "delegated"].includes(item.result.status));
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
} else if (ciParallelCore) {
  confidence = "Scoped";
  confidenceRationale = "This landing job evaluated only the landing workflow and scanner evidence. Typecheck, lint, tests, and build are delegated to enforced sibling jobs and were not evaluated here. High/full confidence requires the aggregate workflow to pass.";
} else if (blockingSkippedChecks.length > 0) {
  confidence = "Medium";
  confidenceRationale = "Core deterministic checks passed, but blocking validation coverage is still unavailable.";
}

const automaticHandoffs = [
  {
    item: "Failed deterministic check",
    action: "Return the exact failure to its owning page field or release layer, apply the bounded repair, and rerun only the failed gate.",
    advancing: "No",
  },
  {
    item: "Passing quality packet",
    action: "Record matching fingerprints as eligible_for_release and continue directly to the Vercel preview.",
    advancing: "Yes",
  },
  {
    item: "External synchronization unavailable",
    action: "Record synchronization as pending or not_configured and continue the agent-led Git/Vercel release.",
    advancing: "Yes",
  },
];

const approvalDecision = blockingFailures.length > 0
  ? "Return each failed check to its automatic repair route."
  : blockingSkippedChecks.length > 0
    ? "Run the required validation from a clean worktree, then resume this same release."
    : "eligible_for_release: continue to Vercel preview and production verification.";

function markdownEscape(value) {
  return String(value ?? "").replace(/\r?\n/g, " ").replace(/\|/g, "\\|");
}

console.log("## Stage 2 Automatic Quality Gate Result");
console.log("");
console.log(`**Status:** ${status}  `);
console.log(`**Confidence:** ${confidence}  `);
console.log(`**Blocking Failures:** ${blockingFailures.length > 0 ? "Yes" : "No"}`);
if (ciParallelCore) console.log("**Authority:** Landing checks only; the GitHub aggregate is the release authority.");
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
console.log("## Automatic Handoff");
console.log("");
console.log("| Condition | Next Action | Can Advance |");
console.log("|---|---|---|");
for (const item of automaticHandoffs) {
  console.log(`| ${markdownEscape(item.item)} | ${markdownEscape(item.action)} | ${markdownEscape(item.advancing)} |`);
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
console.log("## Release Decision");
console.log("");
console.log(approvalDecision);

if (status === "FAIL") process.exit(1);
