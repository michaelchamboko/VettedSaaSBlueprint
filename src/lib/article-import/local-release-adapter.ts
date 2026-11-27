import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import type { ReleaseOperations, ReleaseDeployment, ReleaseGitSnapshot, FullProductionChecks } from "./release";
import type { ImportFormat } from "./contracts";
import { validateReleasePaths } from "./release";
import { readImportArtifactTarget } from "./format-validation";
import { assertVerifierResult, requireVerificationMode, storeProductionVerifierEvidence } from "./verification-evidence";
import { REPOSITORY_CANONICAL_ORIGIN } from "../site/public-site";
import { ImportFailure } from "./failure-routing";

export function deploymentOutcomeUncertain(code = "PROVIDER_DEPLOY_FAILED"): never {
  if (!/^[A-Z][A-Z0-9_]{2,80}$/.test(code)) code = "PROVIDER_DEPLOY_FAILED";
  throw new ImportFailure("uncertain-external-outcome", `DEPLOYMENT_OUTCOME_UNCERTAIN: ${code}`);
}

const RELEASE_OPERATION_META_KEY = "vettedArticleReleaseOperation";
const RELEASE_COMMIT_META_KEY = "vettedArticleReleaseCommit";
const spawn = createRequire(import.meta.url)("cross-spawn") as typeof import("node:child_process").spawn;
export type ReleaseCommandRunner = (command: string, args: readonly string[]) => Promise<{ stdout: string; stderr: string }>;
export type ReleaseJsonFetcher = (url: string) => Promise<Record<string, unknown>>;

export function createReleaseCommandRunner(repositoryRoot: string): ReleaseCommandRunner {
  return (command, args) => new Promise((resolve, reject) => {
    const child = spawn(command, [...args], { cwd: repositoryRoot, windowsHide: true, shell: false });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let size = 0;
    child.stdout?.on("data", (chunk: Buffer) => { size += chunk.length; if (size <= 2_000_000) stdout.push(chunk); });
    child.stderr?.on("data", (chunk: Buffer) => { size += chunk.length; if (size <= 2_000_000) stderr.push(chunk); });
    child.on("error", reject);
    child.on("close", (code) => {
      const result = { stdout: Buffer.concat(stdout).toString("utf8"), stderr: Buffer.concat(stderr).toString("utf8") };
      if (size > 2_000_000) return reject(new Error("COMMAND_OUTPUT_LIMIT"));
      if (code !== 0) return reject(new Error(`COMMAND_FAILED_${code ?? "UNKNOWN"}`));
      resolve(result);
    });
  });
}

function sha(value: string): string { return value.trim().split(/\s+/)[0] ?? ""; }
function withToken(args: readonly string[], token: string | undefined): string[] { return token ? [...args, "--token", token] : [...args]; }
async function linkedProject(repositoryRoot: string): Promise<{ projectId?: string; orgId?: string }> {
  try {
    const parsed = JSON.parse(await readFile(path.join(repositoryRoot, ".vercel", "project.json"), "utf8")) as { projectId?: unknown; orgId?: unknown };
    return {
      ...(typeof parsed.projectId === "string" && parsed.projectId.length > 0 && { projectId: parsed.projectId }),
      ...(typeof parsed.orgId === "string" && parsed.orgId.length > 0 && { orgId: parsed.orgId }),
    };
  } catch { return {}; }
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

export function createLocalReleaseOperations(repositoryRoot: string, options: { runner?: ReleaseCommandRunner; fetchJson?: ReleaseJsonFetcher; providerRead?: ReleaseJsonFetcher; projectId?: string; teamId?: string; format: ImportFormat; slug?: string; origin?: string; artifactPath?: string; importId?: string; sourceFingerprint?: string }): ReleaseOperations {
  const runner = options.runner ?? createReleaseCommandRunner(repositoryRoot);
  const defaultFetchJson: ReleaseJsonFetcher = async (url) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    const value: unknown = await response.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("INVALID_JSON_OBJECT");
    return value as Record<string, unknown>;
  };
  const fetchJson = options.fetchJson ?? defaultFetchJson;
  const token = process.env.VERCEL_TOKEN;
  const linked = linkedProject(repositoryRoot);
  const projectId = linked.then((value) => options.projectId ?? process.env.VERCEL_PROJECT_ID ?? value.projectId);
  const teamId = linked.then((value) => options.teamId ?? process.env.VERCEL_ORG_ID ?? value.orgId);
  const previousId = process.env.VERCEL_PREVIOUS_DEPLOYMENT_ID;
  // Production verification is pinned to the trusted repository origin; a caller-supplied
  // origin (for example a different reachable Vercel project) must never redirect release checks.
  const requestedOrigin = options.origin === undefined ? undefined : options.origin.replace(/\/+$/, "");
  if (requestedOrigin !== undefined && requestedOrigin !== REPOSITORY_CANONICAL_ORIGIN) throw new Error("ORIGIN_NOT_CANONICAL");
  const origin = REPOSITORY_CANONICAL_ORIGIN;
  const deploymentApi = `${origin.replace(/\/$/, "")}/api/deployment`;
  function providerTarget(target: string): string {
    try { return new URL(target).hostname; } catch { return target; }
  }
  async function providerPath(pathname: string, query: Record<string, string>): Promise<string> {
    const params = new URLSearchParams(query);
    const team = await teamId;
    if (team) params.set("teamId", team);
    return `${pathname}?${params.toString()}`;
  }
  async function providerJson(endpoint: string, failureCode: string): Promise<Record<string, unknown>> {
    try {
      const parsed: unknown = options.providerRead ? await options.providerRead(endpoint) : JSON.parse((await runner("vercel", withToken(["api", endpoint], token))).stdout);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid");
      return parsed as Record<string, unknown>;
    } catch { throw new Error(failureCode); }
  }
  type ProviderDeployment = { id: string; projectId: string; target: "production"; readyState: "READY"; operationKey?: string; claimedCommitSha?: string; gitCommitSha?: string };
  async function readProviderDeployment(target: string): Promise<ProviderDeployment> {
    const expectedProjectId = await projectId;
    if (!expectedProjectId) throw new Error("VERCEL_PROJECT_ID_MISSING");
    const endpoint = await providerPath(`/v13/deployments/${encodeURIComponent(providerTarget(target))}`, { withGitRepoInfo: "true" });
    const value = await providerJson(endpoint, "PROVIDER_DEPLOYMENT_READ_FAILED");
    if (typeof value.id !== "string" || value.projectId !== expectedProjectId || value.target !== "production" || value.readyState !== "READY") throw new Error("DEPLOYMENT_IDENTITY_UNVERIFIED");
    const meta = value.meta && typeof value.meta === "object" && !Array.isArray(value.meta) ? value.meta as Record<string, unknown> : {};
    const gitSource = value.gitSource && typeof value.gitSource === "object" && !Array.isArray(value.gitSource) ? value.gitSource as Record<string, unknown> : {};
    const gitCommitSha = typeof gitSource.sha === "string" ? gitSource.sha : undefined;
    const claimedCommitSha = typeof meta[RELEASE_COMMIT_META_KEY] === "string" ? meta[RELEASE_COMMIT_META_KEY] : undefined;
    if ((gitCommitSha && !/^[a-f0-9]{40}$/.test(gitCommitSha)) || (claimedCommitSha && !/^[a-f0-9]{40}$/.test(claimedCommitSha))) throw new Error("DEPLOYMENT_COMMIT_METADATA_INVALID");
    if (gitCommitSha && claimedCommitSha && gitCommitSha !== claimedCommitSha) throw new Error("DEPLOYMENT_COMMIT_METADATA_MISMATCHED");
    return {
      id: value.id, projectId: expectedProjectId, target: "production", readyState: "READY",
      ...(typeof meta[RELEASE_OPERATION_META_KEY] === "string" && { operationKey: meta[RELEASE_OPERATION_META_KEY] }),
      ...(claimedCommitSha && { claimedCommitSha }), ...(gitCommitSha && { gitCommitSha }),
    };
  }
  async function canonicalDeployment(): Promise<{ id: string; target: "production"; readyState: "READY"; commitSha: string }> {
    const expectedProjectId = await projectId;
    if (!expectedProjectId) throw new Error("VERCEL_PROJECT_ID_MISSING");
    const hostname = new URL(origin).hostname;
    const provider = await readProviderDeployment(hostname);
    const aliasEndpoint = await providerPath(`/v4/aliases/${encodeURIComponent(hostname)}`, { projectId: expectedProjectId });
    const alias = await providerJson(aliasEndpoint, "PROVIDER_ALIAS_READ_FAILED");
    if (alias.deploymentId !== provider.id) throw new Error("DEPLOYMENT_ALIAS_IDENTITY_UNVERIFIED");
    let served: Record<string, unknown>;
    try { served = await fetchJson(deploymentApi); } catch { throw new Error("DEPLOYMENT_COMMIT_ENDPOINT_UNAVAILABLE"); }
    if (typeof served.commitSha !== "string" || !/^[a-f0-9]{40}$/.test(served.commitSha) || served.environment !== "production") throw new Error("DEPLOYMENT_COMMIT_ENDPOINT_UNVERIFIED");
    if (provider.gitCommitSha && provider.gitCommitSha !== served.commitSha) throw new Error("DEPLOYMENT_COMMIT_METADATA_MISMATCHED");
    if (provider.claimedCommitSha && provider.claimedCommitSha !== served.commitSha) throw new Error("DEPLOYMENT_COMMIT_METADATA_MISMATCHED");
    return { id: provider.id, target: "production", readyState: "READY", commitSha: served.commitSha };
  }
  async function operationDeployments(operationKey: string): Promise<string[]> {
    const expectedProjectId = await projectId;
    if (!expectedProjectId) throw new Error("VERCEL_PROJECT_ID_MISSING");
    const endpoint = await providerPath("/v6/deployments", { projectId: expectedProjectId, target: "production", [`meta-${RELEASE_OPERATION_META_KEY}`]: operationKey, limit: "100" });
    const parsed = await providerJson(endpoint, "DEPLOYMENT_OPERATION_LOOKUP_FAILED");
    const deployments = Array.isArray(parsed.deployments) ? parsed.deployments : undefined;
    const pagination = parsed.pagination && typeof parsed.pagination === "object" && !Array.isArray(parsed.pagination) ? parsed.pagination as Record<string, unknown> : undefined;
    if (!deployments || !pagination || pagination.next !== null) throw new Error("DEPLOYMENT_OPERATION_LOOKUP_INCOMPLETE");
    return deployments.map((deployment) => {
      if (!deployment || typeof deployment !== "object") throw new Error("DEPLOYMENT_OPERATION_LOOKUP_INVALID");
      const item = deployment as { uid?: unknown; id?: unknown; url?: unknown };
      const identity = [item.uid, item.id, item.url].find((value): value is string => typeof value === "string" && value.length > 0);
      if (!identity) throw new Error("DEPLOYMENT_OPERATION_LOOKUP_INVALID");
      return identity;
    });
  }
  return {
    async preflight() {
      const reasons: string[] = [];
      if (!await projectId) reasons.push("VERCEL_PROJECT_ID_MISSING");
      try { await runner("vercel", withToken(["whoami"], token)); } catch { reasons.push("VERCEL_AUTH_MISSING"); }
      try {
        await canonicalDeployment();
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
      const parsed = await canonicalDeployment();
      if (previousId && parsed.id !== previousId) throw new Error("PREVIOUS_DEPLOYMENT_ID_MISMATCH");
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
    async reconcileDeployment(intent) {
      if (intent.productionAssignment !== origin) return { status: "inconsistent", missingEvidence: ["PRODUCTION_ASSIGNMENT_MISMATCH"] };
      try {
        const legacyOperationKey = `deployment:${intent.commitSha}`;
        if (intent.operationKey === legacyOperationKey) {
          if (!intent.recordedDeployment?.deploymentId) {
            return { status: "inconsistent", missingEvidence: ["LEGACY_DEPLOYMENT_IDENTITY_MISSING"] };
          }
          const recorded = await readProviderDeployment(intent.recordedDeployment.deploymentId);
          const assigned = await canonicalDeployment();
          if (recorded.id !== intent.recordedDeployment.deploymentId || (recorded.gitCommitSha ?? recorded.claimedCommitSha) !== intent.commitSha
            || assigned.id !== recorded.id || assigned.commitSha !== intent.commitSha) {
            return { status: "inconsistent", missingEvidence: ["LEGACY_PROVIDER_IDENTITY_MISMATCH"] };
          }
          const resolvedArtifactPath = await resolveReleaseArtifactPath(repositoryRoot, options.format, options.artifactPath, options.slug);
          const { target } = await readImportArtifactTarget(repositoryRoot, options.format, resolvedArtifactPath, options.slug);
          return {
            status: "confirmed",
            productionAssignment: origin,
            deployment: { deploymentId: recorded.id, canonicalUrl: new URL(target.renderedRoutes[0], origin).href, commitSha: intent.commitSha },
          };
        }
        const candidates = await operationDeployments(intent.operationKey);
        if (candidates.length > 1) return { status: "inconsistent", missingEvidence: ["DUPLICATE_OPERATION_DEPLOYMENTS"] };
        const assigned = await canonicalDeployment();
        if (candidates.length === 1) {
          const candidate = await readProviderDeployment(candidates[0]);
          if (candidate.operationKey !== intent.operationKey || candidate.claimedCommitSha !== intent.commitSha
            || (candidate.gitCommitSha && candidate.gitCommitSha !== intent.commitSha)
            || assigned.id !== candidate.id || assigned.commitSha !== intent.commitSha) {
            return { status: "inconsistent", missingEvidence: ["PROVIDER_IDENTITY_MISMATCH"] };
          }
          const resolvedArtifactPath = await resolveReleaseArtifactPath(repositoryRoot, options.format, options.artifactPath, options.slug);
          const { target } = await readImportArtifactTarget(repositoryRoot, options.format, resolvedArtifactPath, options.slug);
          return {
            status: "confirmed",
            productionAssignment: origin,
            deployment: { deploymentId: candidate.id, canonicalUrl: new URL(target.renderedRoutes[0], origin).href, commitSha: intent.commitSha },
          };
        }
        if (assigned.id === intent.rollbackTarget.deploymentId && assigned.commitSha === intent.rollbackTarget.commitSha) {
          return { status: "not-found", evidence: ["ROLLBACK_TARGET_CONFIRMED"] };
        }
        if (assigned.commitSha === intent.commitSha) {
          return { status: "inconsistent", missingEvidence: ["PRODUCTION_ALIAS_COMMIT_WITHOUT_OPERATION"] };
        }
        return { status: "inconsistent", missingEvidence: ["PRODUCTION_ALIAS_UNKNOWN"] };
      } catch (error) {
        const code = error instanceof Error && /^[A-Z][A-Z0-9_]{2,80}$/.test(error.message) ? error.message : "PROVIDER_RECONCILIATION_FAILED";
        return { status: "indeterminate", missingEvidence: [`provider deployment or production alias lookup failed (${code})`] };
      }
    },
    async deploy(commitSha, operationKey): Promise<ReleaseDeployment> {
      let result;
      try {
        result = await runner("vercel", withToken(["deploy", "--prod", "--yes", "--meta", `${RELEASE_OPERATION_META_KEY}=${operationKey}`, "--meta", `${RELEASE_COMMIT_META_KEY}=${commitSha}`], token));
      } catch {
        deploymentOutcomeUncertain();
      }
      const url = result.stdout.match(/https:\/\/[^\s]+/)?.[0];
      if (!url) throw new Error("VERCEL_DEPLOYMENT_URL_MISSING");
      const inspected = await readProviderDeployment(url);
      const assigned = await canonicalDeployment();
      if (inspected.operationKey !== operationKey || inspected.claimedCommitSha !== commitSha || (inspected.gitCommitSha && inspected.gitCommitSha !== commitSha)
        || assigned.id !== inspected.id || assigned.commitSha !== commitSha) throw new Error("DEPLOYMENT_COMMIT_METADATA_MISSING_OR_MISMATCHED");
      const resolvedArtifactPath = await resolveReleaseArtifactPath(repositoryRoot, options.format, options.artifactPath, options.slug);
      const { target } = await readImportArtifactTarget(repositoryRoot, options.format, resolvedArtifactPath, options.slug);
      return { deploymentId: inspected.id, canonicalUrl: new URL(target.renderedRoutes[0], origin).href, commitSha };
    },
    async verifyProduction(deployment): Promise<FullProductionChecks> {
      if (!options.importId) throw new Error("PRODUCTION_IMPORT_ID_REQUIRED");
      if (!options.sourceFingerprint) throw new Error("PRODUCTION_SOURCE_FINGERPRINT_REQUIRED");
      const resolvedArtifactPath = await resolveReleaseArtifactPath(repositoryRoot, options.format, options.artifactPath, options.slug);
      const { target } = await readImportArtifactTarget(repositoryRoot, options.format, resolvedArtifactPath, options.slug);
      if (deployment.canonicalUrl !== new URL(target.renderedRoutes[0], origin).href) throw new Error("DEPLOYMENT_CANONICAL_MISMATCH");
      const deploymentBefore = await canonicalDeployment();
      if (deploymentBefore.id !== deployment.deploymentId || deploymentBefore.commitSha !== deployment.commitSha) throw new Error("PRODUCTION_DEPLOYMENT_MISMATCH");
      async function capture(command: string, args: string[]) {
        const output = await runner(command, args);
        const result = JSON.parse(output.stdout) as Record<string, unknown>;
        const deploymentAfter = await canonicalDeployment();
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
    async rollback(deploymentId) { try { await runner("vercel", withToken(["rollback", deploymentId, "--yes"], token)); return { ok: true, summary: "rollback completed" }; } catch { return { ok: false, summary: "PROVIDER_ROLLBACK_FAILED" }; } },
    async verifyRollback(deploymentId, expectedCommitSha) {
      try {
        const parsed = await canonicalDeployment();
        return parsed.id === deploymentId && (!expectedCommitSha || parsed.commitSha === expectedCommitSha);
      } catch { return false; }
    },
  };
}
