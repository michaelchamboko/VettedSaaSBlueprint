#!/usr/bin/env node
import { readFileSync } from "node:fs";

const docPath = "build-pack/23-landing-page-workflow-performance-optimization.md";

const requiredIds = [
  "LP-T09-BRIEF-01",
  "LP-T09-STRUCTURE-01",
  "LP-T09-HERO-01",
  "LP-T09-CTA-01",
  "LP-T09-SEO-01",
  "LP-T09-COMPLIANCE-01",
  "LP-T09-UNIQUENESS-01",
  "LP-T09-INSTRUMENTATION-01",
  "LP-T09-RESPONSIVE-01",
  "LP-T09-A11Y-01",
  "LP-T09-ASSET-01",
  "LP-T09-PUBLISH-01",
  "LP-T09-PRESHIP-01",
];

const requiredColumns = [
  "Micro-task ID",
  "Scope",
  "Single Responsibility",
  "Validation Check",
  "Planned Commit Boundary",
  "Dependencies",
  "Pass Criteria",
];

function parseRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function fail(message, details = {}) {
  console.error(JSON.stringify({ status: "fail", message, ...details }, null, 2));
  process.exit(1);
}

const doc = readFileSync(docPath, "utf8");
const lines = doc.split(/\r?\n/);
const headerLine = lines.find((line) => line.includes("| Micro-task ID | Scope |"));
if (!headerLine) fail("Micro-task matrix header not found.", { docPath });

const header = parseRow(headerLine);
if (header.join("|") !== requiredColumns.join("|")) {
  fail("Micro-task matrix header does not match required columns.", { expected: requiredColumns, actual: header });
}

const rows = lines
  .filter((line) => /^\|\s*LP-T09-[A-Z0-9-]+\s*\|/.test(line))
  .map(parseRow)
  .filter((row) => row.length === requiredColumns.length);

const byId = new Map(rows.map((row) => [row[0], row]));
const missingIds = requiredIds.filter((id) => !byId.has(id));
if (missingIds.length > 0) fail("Required micro-task rows are missing.", { missingIds });

const duplicateIds = rows
  .map((row) => row[0])
  .filter((id, index, ids) => ids.indexOf(id) !== index);
if (duplicateIds.length > 0) fail("Duplicate micro-task IDs found.", { duplicateIds });

const rowIssues = [];
for (const id of requiredIds) {
  const row = byId.get(id);
  if (row.length !== requiredColumns.length) rowIssues.push({ id, issue: "wrong_column_count", actual: row.length });
  const [microTaskId, scope, responsibility, validation, commitBoundary, dependencies, passCriteria] = row;
  if (!microTaskId || !scope || !responsibility || !validation || !commitBoundary || !dependencies || !passCriteria) {
    rowIssues.push({ id, issue: "empty_required_cell" });
  }
  if (!validation.includes("npm run")) rowIssues.push({ id, issue: "validation_check_must_reference_npm_run", validation });
  if (!/^`commit: lp-t09-[a-z0-9-]+`$/.test(commitBoundary)) {
    rowIssues.push({ id, issue: "commit_boundary_not_auditable", commitBoundary });
  }
}

if (rowIssues.length > 0) fail("Micro-task matrix has invalid rows.", { rowIssues });

const executionContextHeader = lines.find((line) => line.includes("| Micro-task ID | Execution Context |"));
if (!executionContextHeader) fail("Micro-task execution context table not found.", { docPath });

const contextRows = lines
  .filter((line) => /^\|\s*LP-T09-[A-Z0-9-]+\s*\|\s*[^|]+\s*\|/.test(line))
  .map(parseRow)
  .filter((row) => row.length === 2);
const contextById = new Map(contextRows.map((row) => [row[0], row[1]]));
const missingContexts = requiredIds.filter((id) => !contextById.has(id) || !contextById.get(id));
if (missingContexts.length > 0) fail("Micro-task execution contexts are missing.", { missingContexts });

console.log(JSON.stringify({
  status: "pass",
  docPath,
  rowCount: rows.length,
  executionContextCount: contextRows.length,
  requiredRowCount: requiredIds.length,
}, null, 2));
