import { execFile as execFileCallback } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { ReleaseOperations, ReleaseDeployment, ReleaseGitSnapshot, FullProductionChecks } from "./release";
import type { ImportFormat } from "./contracts";

const execFile = promisify(execFileCallback);
export type ReleaseCommandRunner = (command: string, args: readonly string[]) => Promise<{ stdout: string; stderr: string }>;
export type ReleaseJsonFetcher = (url: string) => Promise<Record<string, unknown>>;

function defaultRunner(repositoryRoot: string): ReleaseCommandRunner {
  return async (command, args) => execFile(command, [...args], { cwd: repositoryRoot, windowsHide: true, maxBuffer: 2_000_000 });
}

function sha(value: string): string { return value.trim().split(/\s+/)[0] ?? ""; }
function withToken(args: readonly string[], token: string | undefined): string[] { return token ? [...args, "--token", token] : [...args]; }
async function linkedProjectId(repositoryRoot: string): Promise<string | undefined> {
  try {
    const parsed = JSON.parse(await readFile(path.join(repositoryRoot, ".vercel", "project.json"), "utf8")) as { projectId?: unknown };
    return typeof parsed.projectId === "string" && parsed.projectId.length > 0 ? parsed.projectId : undefined;
  } catch { return undefined; }
}
async function git(runner: ReleaseCommandRunner, args: readonly string[]): Promise<string> { return (await runner("git", args)).stdout.trim(); }
async function inspect(runner: ReleaseCommandRunner): Promise<ReleaseGitSnapshot> {
  const status = await git(runner, ["status", "--porcelain"]);
  const lines = status.split(/\r?\n/).filter(Boolean);
  const changedFiles: string[] = [];
  let clean = true;
  for (const line of lines) {
    if (line.length < 4) { clean = false; continue; }
    const code = line.slice(0, 2);
    if (["UU", "AA", "DD", "AU", "UA", "DU", "UD"].includes(code)) clean = false;
    const file = line.slice(3).trim();
    if (!file || file.includes("\0")) clean = false;
    else changedFiles.push(file.includes(" -> ") ? file.split(" -> ").at(-1)! : file);
  }
  const headSha = await git(runner, ["rev-parse", "HEAD"]);
  const originMainSha = await git(runner, ["rev-parse", "origin/main"]);
  let fastForwardable = false;
  try { await git(runner, ["merge-base", "--is-ancestor", "origin/main", "HEAD"]); fastForwardable = true; } catch { /* fail closed */ }
  return { clean, changedFiles, headSha, originMainSha, fastForwardable };
}

export function createLocalReleaseOperations(repositoryRoot: string, options: { runner?: ReleaseCommandRunner; fetchJson?: ReleaseJsonFetcher; format: ImportFormat; slug?: string; origin?: string; artifactPath?: string }): ReleaseOperations {
  const runner = options.runner ?? defaultRunner(repositoryRoot);
  const defaultFetchJson: ReleaseJsonFetcher = async (url) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    const value: unknown = await response.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("INVALID_JSON_OBJECT");
    return value as Record<string, unknown>;
  };
  const fetchJson = options.fetchJson ?? defaultFetchJson;
  const token = process.env.VERCEL_TOKEN;
  const configuredProjectId = process.env.VERCEL_PROJECT_ID;
  const previousId = process.env.VERCEL_PREVIOUS_DEPLOYMENT_ID;
  const origin = options.origin ?? "https://vettedsaasblueprint.online";
  const deploymentApi = `${origin.replace(/\/$/, "")}/api/deployment`;
  const inspectArgs = (target: string) => withToken(["inspect", target, "--json"], token);
  async function verifiedDeployment(target: string): Promise<{ id: string; target: string; readyState: string; commitSha: string }> {
    const inspected = JSON.parse((await runner("vercel", inspectArgs(target))).stdout) as { id?: unknown; target?: unknown; readyState?: unknown; gitCommitSha?: unknown };
    if (typeof inspected.id !== "string" || inspected.target !== "production" || inspected.readyState !== "READY") throw new Error("DEPLOYMENT_IDENTITY_UNVERIFIED");
    const api = await fetchJson(deploymentApi);
    if (typeof api.commitSha !== "string" || api.environment !== "production") throw new Error("DEPLOYMENT_COMMIT_ENDPOINT_UNVERIFIED");
    if (typeof inspected.gitCommitSha === "string" && inspected.gitCommitSha !== api.commitSha) throw new Error("DEPLOYMENT_COMMIT_METADATA_MISMATCHED");
    return { id: inspected.id, target: "production", readyState: "READY", commitSha: typeof inspected.gitCommitSha === "string" ? inspected.gitCommitSha : api.commitSha };
  }
  return {
    async preflight() {
      const reasons: string[] = [];
      const projectId = configuredProjectId ?? await linkedProjectId(repositoryRoot);
      if (!projectId) reasons.push("VERCEL_PROJECT_ID_MISSING");
      try { await runner("vercel", withToken(["whoami"], token)); } catch { reasons.push("VERCEL_AUTH_MISSING"); }
      try {
        await verifiedDeployment(previousId ?? origin);
      } catch { reasons.push("PREVIOUS_DEPLOYMENT_UNVERIFIED"); }
      if (options.format === "direct-review" && !options.slug) reasons.push("DIRECT_REVIEW_SLUG_MISSING");
      if (options.format === "direct-review" && !options.artifactPath) reasons.push("DIRECT_REVIEW_ARTIFACT_MISSING");
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
      const target = previousId ?? origin;
      const parsed = await verifiedDeployment(target);
      return { deploymentId: parsed.id, commitSha: parsed.commitSha, verified: true };
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
      const result = await runner("vercel", withToken(["deploy", "--prod", "--yes"], token));
      const url = result.stdout.match(/https:\/\/[^\s]+/)?.[0];
      if (!url) throw new Error("VERCEL_DEPLOYMENT_URL_MISSING");
      const inspected = await verifiedDeployment(url);
      if (inspected.commitSha !== commitSha) throw new Error("DEPLOYMENT_COMMIT_METADATA_MISSING_OR_MISMATCHED");
      return { deploymentId: inspected.id, canonicalUrl: url, commitSha: inspected.commitSha };
    },
    async verifyProduction(deployment): Promise<FullProductionChecks> {
      if (options.format !== "direct-review" || !options.slug) throw new Error(`MISSING_FORMAT_VERIFIER:${options.format}`);
      const result = JSON.parse((await runner("npm", ["run", "landing:verify:deployment", "--", "--origin", options.origin ?? "https://vettedsaasblueprint.online", "--expected-sha", deployment.commitSha, "--slug", options.slug])).stdout) as { status?: string; robots_ok?: boolean; sitemap_ok?: boolean; pages?: Array<{ desktop?: { httpOk?: boolean; disclosureOk?: boolean; allCtasExact?: boolean; allRevealSectionsVisible?: boolean; browserErrors?: string[] }; mobile?: { httpOk?: boolean; disclosureOk?: boolean; allCtasExact?: boolean; allRevealSectionsVisible?: boolean; browserErrors?: string[] } }> };
      const pages = result.pages ?? [];
      const snapshots = pages.flatMap((page) => [page.desktop, page.mobile]).filter((page): page is NonNullable<typeof page> => Boolean(page));
      if (result.status !== "pass" || pages.length === 0) throw new Error("LANDING_VERIFIER_FAILED");
      return { routeOk: snapshots.every((page) => page.httpOk === true), contentOk: snapshots.every((page) => page.allRevealSectionsVisible === true), disclosureOk: snapshots.every((page) => page.disclosureOk === true), exactCtaOk: snapshots.every((page) => page.allCtasExact === true), desktopOk: pages.every((page) => page.desktop?.httpOk === true), mobileOk: pages.every((page) => page.mobile?.httpOk === true), robotsOk: result.robots_ok === true, sitemapOk: result.sitemap_ok === true, browserErrorsOk: snapshots.every((page) => (page.browserErrors?.length ?? 1) === 0) };
    },
    async rollback(deploymentId) { try { await runner("vercel", withToken(["rollback", deploymentId, "--yes"], token)); return { ok: true, summary: "rollback completed" }; } catch (error) { return { ok: false, summary: String(error) }; } },
    async verifyRollback(deploymentId, expectedCommitSha) {
      try {
        const parsed = await verifiedDeployment(origin);
        return parsed.id === deploymentId && (!expectedCommitSha || parsed.commitSha === expectedCommitSha);
      } catch { return false; }
    },
  };
}
