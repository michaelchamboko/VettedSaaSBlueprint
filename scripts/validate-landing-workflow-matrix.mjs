#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from "node:fs";

const registryPath = "src/lib/landing-workflow/registry.ts";
const workflowDirectory = ".github/workflows";
const expectedStages = ["decide", "evidence", "quality", "release"];

const source = readFileSync(registryPath, "utf8");
const stages = [...source.matchAll(/\{ id: "([^"]+)", command: "([^"]+)", owner: "([^"]+)" \}/g)]
  .map((match) => ({ id: match[1], command: match[2], owner: match[3] }));
const errors = [];

const stageIds = stages.map((stage) => stage.id);
if (JSON.stringify(stageIds) !== JSON.stringify(expectedStages)) {
  errors.push(`Expected workflow stages ${expectedStages.join(", ")}; received ${stageIds.join(", ") || "none"}.`);
}
for (const stage of stages) {
  if (stage.owner !== "Supervised agent") errors.push(`${stage.id} owner is ${stage.owner}.`);
}
if (existsSync(workflowDirectory)) {
  const workflowFiles = readdirSync(workflowDirectory).filter((entry) => /\.(?:ya?ml)$/i.test(entry));
  if (workflowFiles.length > 0) {
    errors.push(`${workflowDirectory} must not contain hosted-runner workflows: ${workflowFiles.join(", ")}.`);
  }
}

if (errors.length > 0) {
  console.error(JSON.stringify({ status: "fail", errors }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ status: "pass", stageCount: stages.length, stageIds }, null, 2));
}
