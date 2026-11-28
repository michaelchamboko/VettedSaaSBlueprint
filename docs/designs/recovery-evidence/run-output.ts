import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp } from "node:fs/promises";
import path from "node:path";

export type RecoveryEvidenceRun = {
  outputDirectory: string;
  testedCheckoutRevision: string;
};

export function readTestedCheckoutRevision(): string {
  const revision = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: process.cwd(),
    encoding: "utf8",
    windowsHide: true,
  }).trim();
  if (!/^[a-f0-9]{40}$/.test(revision)) throw new Error("TESTED_CHECKOUT_REVISION_INVALID");
  return revision;
}

export async function createRecoveryEvidenceRun(issue: number): Promise<RecoveryEvidenceRun> {
  const parent = path.resolve(".scratch/recovery-evidence-runs");
  await mkdir(parent, { recursive: true });
  const outputDirectory = await mkdtemp(path.join(parent, `${issue}-`));
  const testedCheckoutRevision = readTestedCheckoutRevision();
  return { outputDirectory, testedCheckoutRevision };
}
