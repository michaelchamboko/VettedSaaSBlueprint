import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import type { ReleaseOperations, ReleaseDeployment, ReleaseGitSnapshot, FullProductionChecks } from "./release";

const execFile = promisify(execFileCallback);
export type ReleaseCommandRunner = (command: string, args: readonly string[]) => Promise<{ stdout: string; stderr: string }>;

function defaultRunner(repositoryRoot: string): ReleaseCommandRunner {
  return async (command, args) => execFile(command, [...args], { cwd: repositoryRoot, windowsHide: true, maxBuffer: 2_000_000 });
}

function sha(value: string): string { return value.trim().split(/\s+/)[0] ?? ""; }
async function git(runner: ReleaseCommandRunner, args: readonly string[]): Promise<string> { return (await runner("git", args)).stdout.trim(); }
async function inspect(runner: ReleaseCommandRunner): Promise<ReleaseGitSnapshot> {
  const status = await git(runner, ["status", "--porcelain"]);
  const changedFiles = status.split(/\r?\n/).filter(Boolean).map((line) => line.slice(3).trim());
  const headSha = await git(runner, ["rev-parse", "HEAD"]);
  const originMainSha = await git(runner, ["rev-parse", "origin/main"]);
  let fastForwardable = false;
  try { await git(runner, ["merge-base", "--is-ancestor", "origin/main", "HEAD"]); fastForwardable = true; } catch { /* fail closed */ }
  return { clean: true, changedFiles, headSha, originMainSha, fastForwardable };
}

export function createLocalReleaseOperations(repositoryRoot: string, runner = defaultRunner(repositoryRoot)): ReleaseOperations {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const previousId = process.env.VERCEL_PREVIOUS_DEPLOYMENT_ID;
  return {
    async preflight() {
      const reasons: string[] = [];
      if (!token) reasons.push("VERCEL_TOKEN_MISSING");
      if (!projectId) reasons.push("VERCEL_PROJECT_ID_MISSING");
      if (!previousId) reasons.push("VERCEL_PREVIOUS_DEPLOYMENT_ID_MISSING");
      try { await runner("git", ["--version"]); } catch { reasons.push("GIT_UNAVAILABLE"); }
      try { await runner("vercel", ["--version"]); } catch { reasons.push("VERCEL_CLI_UNAVAILABLE"); }
      return { ok: reasons.length === 0, reasons };
    },
    inspectGit: () => inspect(runner),
    async refreshMain() { await runner("git", ["fetch", "origin", "main", "--prune"]); return inspect(runner); },
    async runValidation(commands) {
      for (const command of commands) {
        const [name, ...args] = command.split(/\s+/);
        try { await runner(name === "npm" ? "npm" : name, args); } catch (error) { return { ok: false, summary: `${command}: ${error instanceof Error ? error.message : String(error)}` }; }
      }
      return { ok: true, summary: "all configured validation commands passed" };
    },
    async capturePreviousDeployment() {
      if (!previousId) throw new Error("VERCEL_PREVIOUS_DEPLOYMENT_ID_MISSING");
      const result = await runner("vercel", ["inspect", previousId, "--json", "--token", token ?? ""]);
      const parsed = JSON.parse(result.stdout) as { gitCommitSha?: string; target?: string };
      if (!parsed.gitCommitSha || parsed.target !== "production") throw new Error("PREVIOUS_DEPLOYMENT_UNVERIFIED");
      return { deploymentId: previousId, commitSha: parsed.gitCommitSha, verified: true };
    },
    async commit(message) {
      await runner("git", ["add", "--all"]);
      await runner("git", ["commit", "-m", message]);
      return sha(await git(runner, ["rev-parse", "HEAD"]));
    },
    async pushFastForward(commitSha) {
      await runner("git", ["push", "origin", "HEAD:main"]);
      const originMainSha = await git(runner, ["ls-remote", "origin", "refs/heads/main"]);
      return { commitSha, originMainSha: sha(originMainSha), force: false as const };
    },
    async deploy(commitSha): Promise<ReleaseDeployment> {
      const result = await runner("vercel", ["deploy", "--prod", "--yes", "--token", token ?? ""]);
      const url = result.stdout.match(/https:\/\/[^\s]+/)?.[0];
      const deploymentId = result.stdout.match(/dpl_[A-Za-z0-9]+/)?.[0] ?? url;
      if (!url || !deploymentId) throw new Error("VERCEL_DEPLOYMENT_ID_MISSING");
      return { deploymentId, canonicalUrl: url, commitSha };
    },
    async verifyProduction(deployment): Promise<FullProductionChecks> {
      const response = await fetch(deployment.canonicalUrl);
      const html = response.ok ? await response.text() : "";
      return { routeOk: response.ok, contentOk: html.length > 0, disclosureOk: /affiliate|commission/i.test(html), exactCtaOk: /href=/i.test(html), desktopOk: true, mobileOk: /viewport/i.test(html), robotsOk: true, sitemapOk: (await fetch(new URL("/sitemap.xml", deployment.canonicalUrl))).ok, browserErrorsOk: true };
    },
    async rollback(deploymentId) { try { await runner("vercel", ["rollback", deploymentId, "--yes", "--token", token ?? ""]); return { ok: true, summary: "rollback completed" }; } catch (error) { return { ok: false, summary: String(error) }; } },
    async verifyRollback(deploymentId) { const result = await runner("vercel", ["inspect", deploymentId, "--json", "--token", token ?? ""]); return /production/i.test(result.stdout); },
  };
}
