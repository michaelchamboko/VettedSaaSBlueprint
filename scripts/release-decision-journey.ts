import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { evidenceUpdateSchema, pageSetChangeSchema, type DeploymentReceiptV1 } from "../src/lib/automation/contracts";
import { assessAutomaticRelease } from "../src/lib/automation/release-policy";

const execFile = promisify(execFileCallback);

// `npm` and `vercel` are `.cmd` shims on Windows. Node 24 resolves them only through a
// shell: `execFile("npm", ...)` fails with `spawn npm ENOENT` and `execFile("npm.cmd", ...)`
// fails with `spawn EINVAL`. The shell is therefore enabled on Windows only, and every
// argument is quoted and validated because shell arguments are concatenated, not escaped.
export const usesShell = process.platform === "win32";
const unsafeArgument = /["`$&|<>()^%!\\\r\n]/;

export function shellArguments(args: string[]): string[] {
  if (!usesShell) return args;
  return args.map((value) => {
    if (unsafeArgument.test(value)) throw new Error(`Argument cannot be passed safely through a shell: ${value}`);
    return `"${value}"`;
  });
}

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

export async function run(command: string, args: string[]) {
  const { stdout, stderr } = await execFile(command, shellArguments(args), { cwd: process.cwd(), windowsHide: true, shell: usesShell });
  if (stderr.trim()) process.stderr.write(stderr);
  if (stdout.trim()) process.stdout.write(stdout);
  return stdout;
}

function changedPaths(status: string): string[] {
  return status.split(/\r?\n/).filter(Boolean).map((line) => {
    if (line.length < 4 || line.includes(" -> ")) throw new Error(`Unsupported Git status entry for automatic release: ${line}`);
    return line.slice(3);
  });
}

async function main() {
  const evidencePath = argument("--evidence");
  const changePath = argument("--change");
  const runId = argument("--run-id");
  if (!evidencePath || !changePath || !runId) throw new Error("Usage: --evidence <file> --change <file> --run-id <uuid> [--execute]");

  const [evidence, change, status] = await Promise.all([
    readFile(evidencePath, "utf8").then((contents) => evidenceUpdateSchema.parse(JSON.parse(contents))),
    readFile(changePath, "utf8").then((contents) => pageSetChangeSchema.parse(JSON.parse(contents))),
    run("git", ["status", "--porcelain=v1", "--untracked-files=all"]),
  ]);
  const changedFiles = changedPaths(status);
  const assessment = assessAutomaticRelease({
    changedFiles,
    evidence,
    change,
    killSwitchEnabled: process.env.AUTOMATION_KILL_SWITCH === "true",
  });
  if (!assessment.eligible) {
    console.log(JSON.stringify({ eligible: false, reasons: assessment.reasons }, null, 2));
    return;
  }
  if (!process.argv.includes("--execute")) {
    console.log(JSON.stringify({ eligible: true, execute: false, changedFiles }, null, 2));
    return;
  }

  await run("git", ["add", "--", "src/content/decision-journeys"]);
  await run("git", ["commit", "-m", `automation: update decision journey ${change.sourceFingerprint.slice(0, 12)}`]);
  for (const [command, args] of [
    ["npm", ["run", "lint"]],
    ["npm", ["run", "typecheck"]],
    ["npm", ["test"]],
    ["npm", ["run", "validate:public-site"]],
    ["npm", ["run", "build"]],
  ] as const) await run(command, [...args]);
  const commit = (await run("git", ["rev-parse", "HEAD"])).trim();
  const deploymentOutput = await run("vercel", ["deploy", "--prod", "--yes"]);
  const deploymentUrl = deploymentOutput.trim().split(/\r?\n/).filter(Boolean).at(-1);
  if (!deploymentUrl) throw new Error("Vercel did not return a deployment URL.");
  const inspection = await run("vercel", ["inspect", deploymentUrl]);
  if (!/Ready/i.test(inspection)) throw new Error("Vercel deployment is not Ready.");
  const receipt: DeploymentReceiptV1 = {
    version: 1,
    runId,
    commit,
    deploymentId: deploymentUrl,
    domain: "https://vettedsaasblueprint.online",
    verifiedAt: new Date().toISOString(),
  };
  console.log(JSON.stringify(receipt, null, 2));
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  void main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
