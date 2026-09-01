#!/usr/bin/env node
import { accessSync, readFileSync } from "node:fs";

const registryPath = "src/lib/landing-workflow/registry.ts";
const requiredWorkflowFiles = [
  ".github/workflows/preview-build.yml",
  ".github/workflows/landing-production-verify.yml",
];

const source = readFileSync(registryPath, "utf8");
const stages = [...source.matchAll(/\{ id: "(t\d+_[^"]+)", command: "([^"]+)", owner: "([^"]+)", unattended: (true|false) \}/g)]
  .map((match) => ({ id: match[1], command: match[2], owner: match[3], unattended: match[4] === "true" }));
const errors = [];

for (let index = 0; index < 14; index += 1) {
  if (!stages.some((stage) => stage.id.startsWith(`t${index}_`))) errors.push(`Missing t${index} workflow stage.`);
}
for (const stage of stages) if (!stage.unattended) errors.push(`${stage.id} is not unattended.`);
for (const file of requiredWorkflowFiles) {
  try { accessSync(file); } catch { errors.push(`Missing required workflow: ${file}`); }
}

if (errors.length > 0) {
  console.error(JSON.stringify({ status: "fail", errors }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ status: "pass", stageCount: stages.length, unattendedStageCount: stages.length, workflowCount: requiredWorkflowFiles.length }, null, 2));
}
