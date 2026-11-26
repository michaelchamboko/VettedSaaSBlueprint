import { execFile as execFileCallback } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { ReleaseOperations, ReleaseDeployment, ReleaseGitSnapshot, FullProductionChecks } from "./release";
import type { ImportFormat } from "./contracts";
import { validateReleasePaths } from "./release";
import { readImportArtifactTarget } from "./format-validation";
import { assertVerifierResult, requireVerificationMode, storeProductionVerifierEvidence } from "./verification-evidence";
import { REPOSITORY_CANONICAL_ORIGIN } from "../site/public-site";

const execFile = promisify(execFileCallback);
export type ReleaseCommandRunner = (command: string, args: readonly string[]) => Promise<{ stdout: string; stderr: string }>;
export type ReleaseJsonFetcher = (url: string) => Promise<Record<string, unknown>>;

function defaultRunner(repositoryRoot: string): ReleaseCommandRunner {
  return async (command, args) => execFile(command, [...args], { cwd: repositoryRoot, windowsHide: true, maxBuffer: 2_000_000, shell: true });
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
  const status = (await runner("git", ["status", "--porcelain", "--untracked-files=all"])).stdout;
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

async function resolveReleaseArtifactPath(repositoryRoot: string, format: ImportFormat, artifactPath: string | undefined, slug: string | undefined): Promise<string> {
  if (format !== "direct-review") {
    if (!artifactPath) throw new Error("ARTIFACT_PATH_REQUIRED");
    return artifactPath;
  }
  const normalized = artifactPath?.replaceAll("\\\\", "/");
  const publicationPath = slug ? `src/generated/landing-pages/${slug}.json` : undefined;
  const candidates = [normalized, publicationPath].filter((value): value is string => Boolean(value));
  for (const candidate of candidates) {
    try {
      await readFile(path.resolve(repositoryRoot, candidate));
      // Prefer a present public projection over a private source path.
      if (candidate === publicationPath) return candidate;
      if (candidate && !candidate.includes(".automation") && !candidate.startsWith("/")) {
        // If a private source path is present, still prefer the public projection when it exists.
        if (publicationPath) {
          try { await readFile(path.resolve(repositoryRoot, publicationPath)); return publicationPath; } catch { /* use candidate */ }
        }
        return candidate;
      }
    } catch {
      // Try next candidate.
    }
  }
  if (publicationPath) return publicationPath;
  throw new Error("ARTIFACT_PATH_REQUIRED");
}

export function createLocalReleaseOperations(repositoryRoot: string, options: { runner?: ReleaseCommandRunner; fetchJson?: ReleaseJsonFetcher; format: ImportFormat; slug?: string; origin?: string; artifactPath?: string; importId?: string; sourceFingerprint?: string }): ReleaseOperations {
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
  // Production verification is pinned to the trusted repository origin; a caller-supplied
  // origin (for example a different reachable Vercel project) must never redirect release checks.
  const requestedOrigin = options.origin === undefined ? undefined : options.origin.replace(/\/+$/, "");
  if (requestedOrigin !== undefined && requestedOrigin !== REPOSITORY_CANONICAL_ORIGIN) throw new Error("ORIGIN_NOT_CANONICAL");
  const origin = REPOSITORY_CANONICAL_ORIGIN;
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
      if (options.format === "direct-review" && !options.slug && !options.artifactPath) reasons.push("DIRECT_REVIEW_SLUG_MISSING");
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
    async commit(message, files) {
      if (!files.length || validateReleasePaths(files, options.format).length) throw new Error("UNSAFE_STAGING_PATHS");
      const staged = (await git(runner, ["diff", "--cached", "--name-only"])).split(/\r?\n/).filter(Boolean);
      if (staged.some((file) => !files.includes(file))) throw new Error("UNDECLARED_STAGED_FILES");
      await runner("git", ["add", "--", ...files]);
      const actual = (await git(runner, ["diff", "--cached", "--name-only"])).split(/\r?\n/).filter(Boolean).sort();
      if (actual.join("\n") !== [...new Set(files)].sort().join("\n")) throw new Error("STAGED_FILES_MISMATCH");
      await runner("git", ["commit", "-m", message]);
      return sha(await git(runner, ["rev-parse", "HEAD"]));
    },
    async preparePullRequest(reviewedCommitSha) {
      if (!options.importId || !/^[a-z0-9-]{1,80}$/.test(options.importId)) throw new Error("SAFE_IMPORT_ID_REQUIRED");
      if (sha(await git(runner, ["rev-parse", "HEAD"])) !== reviewedCommitSha) throw new Error("REVIEWED_COMMIT_MISMATCH");
      const branch = `codex/article-import/${options.importId}`;
      await runner("git", ["push", "origin", `HEAD:refs/heads/${branch}`]);
      const existing = JSON.parse((await runner("gh", ["pr", "list", "--head", branch, "--base", "main", "--state", "all", "--json", "url,headRefOid,state"])).stdout) as Array<{ url: string; headRefOid: string; state: string }>;
      const matching = existing.find((pr) => pr.headRefOid === reviewedCommitSha && ["OPEN", "MERGED"].includes(pr.state));
      const url = matching?.url ?? (await runner("gh", ["pr", "create", "--base", "main", "--head", branch, "--title", `Publish imported article ${options.importId}`, "--body", "Publish the approved article after format validation, repository checks, and an independent current-head Codex review. A clean reviewed head is merged and deployed automatically."])).stdout.trim();
      if (!/^https:\/\/[^\s]+\/pull\/\d+$/.test(url)) throw new Error("PULL_REQUEST_URL_INVALID");
      return { url, branch, reviewedCommitSha };
    },
    async inspectPullRequest(url) {
      const identity = /^https:\/\/github\.com\/([A-Za-z0-9-]+)\/([A-Za-z0-9_.-]+)\/pull\/([1-9]\d*)$/.exec(url);
      if (!identity) throw new Error("PULL_REQUEST_URL_INVALID");
      const pr = JSON.parse((await runner("gh", ["pr", "view", url, "--json", "state,headRefOid,mergeCommit"])).stdout) as { state: "OPEN" | "CLOSED" | "MERGED"; headRefOid: string; mergeCommit?: { oid: string } };
      return { merged: pr.state === "MERGED", state: pr.state, headRefOid: pr.headRefOid, mergeCommitSha: pr.mergeCommit?.oid };
    },
    async verifyCodeReview(pullRequestUrl, evidenceUrl, reviewedCommitSha) {
      const pr = /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/pull\/([1-9]\d*)$/.exec(pullRequestUrl);
      const commentId = evidenceUrl.startsWith(`${pullRequestUrl}#issuecomment-`) ? evidenceUrl.slice(`${pullRequestUrl}#issuecomment-`.length) : "";
      if (!pr || !/^[1-9]\d*$/.test(commentId)) throw new Error("CODE_REVIEW_EVIDENCE_URL_INVALID");
      const comment = JSON.parse((await runner("gh", ["api", `repos/${pr[1]}/${pr[2]}/issues/comments/${commentId}`])).stdout) as { html_url?: string; issue_url?: string; user?: { login?: string }; body?: string };
      if (comment.html_url !== evidenceUrl || comment.issue_url !== `https://api.github.com/repos/${pr[1]}/${pr[2]}/issues/${pr[3]}`) throw new Error("CODE_REVIEW_COMMENT_MISMATCH");
      if (comment.user?.login !== "chatgpt-codex-connector[bot]") throw new Error("CODE_REVIEW_AUTHOR_INVALID");
      const markers = typeof comment.body === "string" ? [...comment.body.matchAll(/<!--\s*codex-review-state:v1\s+([\s\S]*?)\s*-->/g)] : [];
      if (markers.length !== 1) throw new Error("CODE_REVIEW_STATE_MISSING");
      const state = JSON.parse(markers[0][1]) as { code_review?: { commit_sha?: string; status?: string; has_any_findings?: boolean; has_unresolved_findings?: boolean } };
      const review = state?.code_review;
      if (review?.commit_sha !== reviewedCommitSha || review.status !== "completed" || review.has_any_findings !== false || review.has_unresolved_findings !== false) throw new Error("CODE_REVIEW_NOT_CLEAN_CURRENT_HEAD");
    },
    async mergePullRequest(pullRequestUrl, reviewedCommitSha) {
      if (!/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/pull\/[1-9]\d*$/.test(pullRequestUrl)) throw new Error("PULL_REQUEST_URL_INVALID");
      if (!/^[a-f0-9]{40}$/.test(reviewedCommitSha)) throw new Error("REVIEWED_COMMIT_INVALID");
      await runner("gh", ["pr", "merge", pullRequestUrl, "--merge", "--match-head-commit", reviewedCommitSha]);
      const merged = JSON.parse((await runner("gh", ["pr", "view", pullRequestUrl, "--json", "state,headRefOid,mergeCommit"])).stdout) as { state: string; headRefOid: string; mergeCommit?: { oid?: string } };
      if (merged.headRefOid !== reviewedCommitSha) throw new Error("PULL_REQUEST_HEAD_CHANGED");
      if (merged.state !== "MERGED" || !merged.mergeCommit?.oid) throw new Error("PULL_REQUEST_MERGE_UNVERIFIED");
      return { mergeCommitSha: merged.mergeCommit.oid };
    },
    async checkoutMergedCommit(reviewedCommitSha, mergeCommitSha) {
      if (!/^[a-f0-9]{40}$/.test(reviewedCommitSha) || !/^[a-f0-9]{40}$/.test(mergeCommitSha)) throw new Error("INVALID_MERGE_COMMIT");
      await runner("git", ["fetch", "origin", "main"]);
      await runner("git", ["merge-base", "--is-ancestor", mergeCommitSha, "origin/main"]);
      const snapshot = await inspect(runner);
      if (!snapshot.clean || snapshot.changedFiles.length) throw new Error("MERGED_RELEASE_WORKTREE_DIRTY");
      await runner("git", ["checkout", "--detach", mergeCommitSha]);
    },
    async deploy(commitSha): Promise<ReleaseDeployment> {
      const result = await runner("vercel", withToken(["deploy", "--prod", "--yes"], token));
      const url = result.stdout.match(/https:\/\/[^\s]+/)?.[0];
      if (!url) throw new Error("VERCEL_DEPLOYMENT_URL_MISSING");
      const inspected = await verifiedDeployment(url);
      if (inspected.commitSha !== commitSha) throw new Error("DEPLOYMENT_COMMIT_METADATA_MISSING_OR_MISMATCHED");
      const resolvedArtifactPath = await resolveReleaseArtifactPath(repositoryRoot, options.format, options.artifactPath, options.slug);
      const { target } = await readImportArtifactTarget(repositoryRoot, options.format, resolvedArtifactPath, options.slug);
      return { deploymentId: inspected.id, canonicalUrl: new URL(target.renderedRoutes[0], origin).href, commitSha: inspected.commitSha };
    },
    async verifyProduction(deployment): Promise<FullProductionChecks> {
      if (!options.importId) throw new Error("PRODUCTION_IMPORT_ID_REQUIRED");
      if (!options.sourceFingerprint) throw new Error("PRODUCTION_SOURCE_FINGERPRINT_REQUIRED");
      const resolvedArtifactPath = await resolveReleaseArtifactPath(repositoryRoot, options.format, options.artifactPath, options.slug);
      const { target } = await readImportArtifactTarget(repositoryRoot, options.format, resolvedArtifactPath, options.slug);
      if (deployment.canonicalUrl !== new URL(target.renderedRoutes[0], origin).href) throw new Error("DEPLOYMENT_CANONICAL_MISMATCH");
      const deploymentBefore = await verifiedDeployment(origin);
      if (deploymentBefore.id !== deployment.deploymentId || deploymentBefore.commitSha !== deployment.commitSha) throw new Error("PRODUCTION_DEPLOYMENT_MISMATCH");
      async function capture(command: string, args: string[]) {
        const output = await runner(command, args);
        const result = JSON.parse(output.stdout) as Record<string, unknown>;
        const deploymentAfter = await verifiedDeployment(origin);
        const productionVerifierRef = await storeProductionVerifierEvidence(repositoryRoot, options.importId!, {
          schemaVersion: "ImportProductionVerifierEvidenceV1", importId: options.importId!, sourceFingerprint: options.sourceFingerprint!, target, deployment,
          deploymentBefore: { ...deploymentBefore, target: "production", readyState: "READY" },
          deploymentAfter: { ...deploymentAfter, target: "production", readyState: "READY" },
          command: { command, args, stdout: output.stdout, stderr: output.stderr, exitCode: 0 }, result,
        });
        return { result, productionVerifierRef };
      }
      if (options.format !== "direct-review") {
        const script = { blog: "scripts/verify-blog-deployment.ts", visibility: "scripts/verify-visibility-deployment.ts", "decision-set": "scripts/verify-decision-set-deployment.ts" }[options.format as "blog" | "visibility" | "decision-set"];
        if (!script) throw new Error(`MISSING_FORMAT_VERIFIER:${options.format}`);
        const captured = await capture("npx", ["tsx", script, "--origin", origin, "--expected-sha", deployment.commitSha, "--slug", target.slug, "--artifact", resolvedArtifactPath]);
        const result = captured.result as { target?: unknown; ok?: boolean; passed?: boolean; browser_errors_ok?: boolean; routes?: number; viewportChecks?: number; checks?: Array<{ passed: boolean }>; screenshots?: Array<{ mode: string }>; robots_ok?: boolean; sitemap_ok?: boolean };
        if (JSON.stringify(result.target) !== JSON.stringify(target)) throw new Error("VERIFIER_TARGET_MISMATCH");
        requireVerificationMode(result, "production");
        assertVerifierResult(target, result);
        const passed = options.format === "decision-set"
          ? result.passed === true && (result.checks?.length ?? 0) > 0 && result.checks!.every((check) => check.passed === true) && result.screenshots?.some((shot) => shot.mode.startsWith("desktop")) === true && result.screenshots?.some((shot) => shot.mode.startsWith("mobile")) === true && result.robots_ok === true && result.sitemap_ok === true
          : result.ok === true && (result.routes ?? 0) > 0 && (result.viewportChecks ?? 0) >= 2;
        if (!passed) throw new Error(`FORMAT_VERIFIER_FAILED:${options.format}`);
        // These formats prohibit affiliate destinations; their owner checks apply.
        return { routeOk: true, contentOk: true, disclosureOk: true, exactCtaOk: true, desktopOk: true, mobileOk: true, robotsOk: true, sitemapOk: true, browserErrorsOk: options.format === "decision-set" ? result.browser_errors_ok === true : true, productionVerifierRef: captured.productionVerifierRef };
      }
      const captured = await capture("npm", ["run", "--silent", "landing:verify:deployment", "--", "--origin", origin, "--expected-sha", deployment.commitSha, "--slug", target.slug, "--artifact", resolvedArtifactPath]);
      const result = captured.result as { target?: unknown; status?: string; robots_ok?: boolean; sitemap_ok?: boolean; pages?: Array<{ desktop?: { httpOk?: boolean; disclosureOk?: boolean; allCtasExact?: boolean; allRevealSectionsVisible?: boolean; browserErrors?: string[] }; mobile?: { httpOk?: boolean; disclosureOk?: boolean; allCtasExact?: boolean; allRevealSectionsVisible?: boolean; browserErrors?: string[] } }> };
      if (JSON.stringify(result.target) !== JSON.stringify(target)) throw new Error("VERIFIER_TARGET_MISMATCH");
      requireVerificationMode(result, "production");
      assertVerifierResult(target, result);
      const pages = result.pages ?? [];
      const snapshots = pages.flatMap((page) => [page.desktop, page.mobile]).filter((page): page is NonNullable<typeof page> => Boolean(page));
      if (result.status !== "pass" || pages.length === 0) throw new Error("LANDING_VERIFIER_FAILED");
      return { routeOk: snapshots.every((page) => page.httpOk === true), contentOk: snapshots.every((page) => page.allRevealSectionsVisible === true), disclosureOk: snapshots.every((page) => page.disclosureOk === true), exactCtaOk: snapshots.every((page) => page.allCtasExact === true), desktopOk: pages.every((page) => page.desktop?.httpOk === true), mobileOk: pages.every((page) => page.mobile?.httpOk === true), robotsOk: result.robots_ok === true, sitemapOk: result.sitemap_ok === true, browserErrorsOk: snapshots.every((page) => (page.browserErrors?.length ?? 1) === 0), productionVerifierRef: captured.productionVerifierRef };
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
