import { readFile } from "node:fs/promises";
import path from "node:path";

import { automationJobTypeSchema } from "../src/lib/automation/contracts";
import {
  completeLocalAutomationRun,
  failLocalAutomationRun,
  readLocalAutomationRun,
  startLocalAutomationRun,
} from "../src/lib/automation/local-store";
import { assertWorkflowPrerequisites, parseWorkflowResult } from "../src/lib/automation/workflows";
import { assertAutomationInvocation } from "../src/lib/automation/authority";

function argument(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

async function main() {
  const command = process.argv[2];
  const type = automationJobTypeSchema.parse(argument("--type"));
  const scheduledWindow = argument("--window") ?? new Date().toISOString().slice(0, 10);
  const modeArgument = argument("--mode");
  if (modeArgument !== "manual" && modeArgument !== "api") {
    throw new Error("Use --mode manual or --mode api. Scheduled execution is prohibited.");
  }
  const mode = modeArgument;
  assertAutomationInvocation({ type, scheduledWindow, mode, repositoryRoot: process.cwd() });
  const store = { root: process.cwd() };
  if (command === "start") {
    const result = await startLocalAutomationRun({ store, type, scheduledWindow });
    console.log(JSON.stringify({ status: result.created ? "started" : "existing", run: result.run }));
    return;
  }

  const runId = argument("--run-id");
  const run = await readLocalAutomationRun({ store, type, scheduledWindow });
  if (!run || run.runId !== runId) throw new Error("--run-id must identify the active run for this type and scheduled window.");
  if (command === "fail") {
    const message = argument("--message");
    if (!message) throw new Error("fail requires --message.");
    const failed = await failLocalAutomationRun({ store, run, failure: { message } });
    console.log(JSON.stringify({ status: failed.state, run: failed }));
    return;
  }
  if (command !== "complete") throw new Error("Use start, complete, or fail.");
  const inputPath = argument("--input");
  if (!inputPath) throw new Error("complete requires --input with schema-valid JSON.");
  const input = JSON.parse(await readFile(path.resolve(inputPath), "utf8")) as unknown;
  const result = parseWorkflowResult(type, input);
  await assertWorkflowPrerequisites({ store, type, scheduledWindow, result });
  const completed = await completeLocalAutomationRun({ store, run, result });
  console.log(JSON.stringify({ status: completed.state, run: completed }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
