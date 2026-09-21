import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";

import { parseApprovedUrls } from "../src/lib/landing-automation/approved-urls";
import { canonicalJsonDigest } from "../src/lib/landing-research/contracts";
import { createNeonPool, NeonResearchControl, type ResearchDispatchResult } from "../src/lib/landing-research/neon";

const execFileAsync = promisify(execFile);

function argumentValue(args: readonly string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

async function currentCommit(repositoryRoot: string): Promise<string> {
  const status = await execFileAsync("git", ["status", "--porcelain", "--untracked-files=no"], { cwd: repositoryRoot, shell: false, windowsHide: true, maxBuffer: 4096 });
  if (status.stdout.trim()) throw new Error("Research dispatch requires a clean tracked worktree.");
  const result = await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: repositoryRoot, shell: false, windowsHide: true, maxBuffer: 1024 });
  const commit = result.stdout.trim();
  if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error("Current Git commit could not be verified.");
  return commit;
}

export async function dispatchLandingResearch(args: readonly string[] = process.argv.slice(2)): Promise<ResearchDispatchResult> {
  const exactUrl = argumentValue(args, "--url");
  if (!exactUrl) throw new Error("Usage: npm run landing:research:prep -- --url <exact-approved-https-url>");
  const repositoryRoot = argumentValue(args, "--repository-root") ?? process.cwd();
  const markdown = await readFile(resolve(repositoryRoot, "approved-urls.md"), "utf8");
  const manifest = parseApprovedUrls(markdown);
  const entry = manifest.entries.find((candidate) => candidate.exactUrl === exactUrl);
  if (!entry) throw new Error("The exact URL is not present in approved-urls.md.");
  if (!process.env.LANDING_CONTROL_DATABASE_URL?.trim()) throw new Error("LANDING_CONTROL_DATABASE_URL is missing.");
  const sourceCommitSha = await currentCommit(repositoryRoot);
  const pool = createNeonPool(process.env.LANDING_CONTROL_DATABASE_URL, "LANDING_CONTROL_DATABASE_URL");
  const control = new NeonResearchControl(pool);
  try {
    await control.reconcileAuthorizedUrls(manifest.digest, sourceCommitSha, manifest.entries.map((candidate) => candidate.exactUrl));
    return await control.dispatch(exactUrl, manifest.digest, sourceCommitSha, canonicalJsonDigest({ exactUrl, manifestDigest: manifest.digest, sourceCommitSha }));
  } finally {
    await control.close();
  }
}

async function main(): Promise<void> {
  const result = await dispatchLandingResearch();
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (process.argv[1]?.endsWith("landing-research-prep.ts")) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown research dispatch error.";
    process.stderr.write(`landing research dispatch blocked: ${message}\n`);
    process.exitCode = 1;
  });
}
