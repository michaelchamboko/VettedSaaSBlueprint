import { recordImportFailure, recordImportRelease, saveImport, verifyImportRelease } from "./engine";
import type { ExternalArticleImportV1, ImportFormat, ImportStage } from "./contracts";

export type FullProductionChecks = {
  routeOk: boolean;
  contentOk: boolean;
  disclosureOk: boolean;
  exactCtaOk: boolean;
  desktopOk: boolean;
  mobileOk: boolean;
  robotsOk: boolean;
  sitemapOk: boolean;
  browserErrorsOk: boolean;
};

export type ReleaseGitSnapshot = {
  clean: boolean;
  changedFiles: string[];
  headSha: string;
  originMainSha: string;
  fastForwardable: boolean;
};

export type ReleaseDeployment = {
  deploymentId: string;
  canonicalUrl: string;
  commitSha: string;
};

export type ReleaseOperations = {
  preflight(): Promise<{ ok: boolean; reasons: string[] }>;
  inspectGit(): Promise<ReleaseGitSnapshot>;
  refreshMain(): Promise<ReleaseGitSnapshot>;
  runValidation(commands: readonly string[]): Promise<{ ok: boolean; summary: string }>;
  capturePreviousDeployment(): Promise<{ deploymentId: string; commitSha: string }>;
  commit(message: string): Promise<string>;
  pushFastForward(commitSha: string): Promise<void>;
  deploy(commitSha: string): Promise<ReleaseDeployment>;
  verifyProduction(deployment: ReleaseDeployment): Promise<FullProductionChecks>;
  rollback(deploymentId: string): Promise<{ ok: boolean; summary: string }>;
  verifyRollback(deploymentId: string): Promise<boolean>;
  fixForward?(attempt: number): Promise<boolean>;
};

export type ReleaseAssessment = {
  status: "DRY_RUN" | "WAITING_EXTERNAL" | "REPAIRING" | "ROLLED_BACK" | "LIVE" | "QUARANTINED";
  reasons: string[];
  previousDeploymentId?: string;
  deploymentId?: string;
  canonicalUrl?: string;
};

const VALIDATION_COMMANDS = [
  "npm run verify:agent-workflow",
  "npm run lint",
  "npm run typecheck",
  "npm test",
  "npm run build",
  "npm run validate:public-site",
] as const;

function pathUsesAllowedRoot(file: string, roots: readonly string[]): boolean {
  const normalized = file.replaceAll("\\", "/");
  if (normalized.startsWith("/") || normalized.split("/").includes("..")) return false;
  return roots.some((root) => normalized === root || normalized.startsWith(`${root}/`));
}

export function isAllowedReleasePath(file: string, format: ImportFormat, ownerAuthorizedAffiliateUrl = false): boolean {
  const shared = ["build-pack/editorial", "build-pack/article-import"];
  const formatRoots: Record<ImportFormat, string[]> = {
    "direct-review": ["src/generated/landing-pages", "public/landing", "public/images"],
    blog: ["src/generated/blog-posts", "public/blog/images"],
    visibility: ["src/generated/visibility-pages", "public/images"],
    "decision-set": ["src/content/decision-journeys", "public/images"],
    agent_review_required: [],
  };
  if (pathUsesAllowedRoot(file, [...shared, ...formatRoots[format]])) return true;
  return ownerAuthorizedAffiliateUrl && file === "approved-urls.md";
}

export function validateReleasePaths(files: readonly string[], format: ImportFormat, ownerAuthorizedAffiliateUrl = false): string[] {
  return files.filter((file) => !isAllowedReleasePath(file, format, ownerAuthorizedAffiliateUrl));
}

function allChecksPass(checks: FullProductionChecks): boolean {
  return Object.values(checks).every((value) => value === true);
}

function productiveStage(record: ExternalArticleImportV1): ImportStage {
  return record.stage === "RELEASING" ? record.stage : record.resumeStage ?? "RELEASING";
}

export async function assessImportRelease(input: {
  repositoryRoot: string;
  record: ExternalArticleImportV1;
  changedFiles: readonly string[];
  ownerAuthorizedAffiliateUrl?: boolean;
  killSwitchEnabled?: boolean;
  execute?: boolean;
  operations: ReleaseOperations;
  commitMessage?: string;
}): Promise<ReleaseAssessment> {
  const reasons: string[] = [];
  const disallowed = validateReleasePaths(input.changedFiles, input.record.format, input.ownerAuthorizedAffiliateUrl === true);
  if (disallowed.length) reasons.push(`DISALLOWED_RELEASE_PATHS:${disallowed.join(",")}`);
  if (input.killSwitchEnabled) {
    return { status: "WAITING_EXTERNAL", reasons: ["AUTOMATION_KILL_SWITCH_ENABLED"] };
  }
  const preflight = await input.operations.preflight();
  if (!preflight.ok) reasons.push(...preflight.reasons);
  if (reasons.length || !input.execute) {
    return { status: input.execute ? "WAITING_EXTERNAL" : "DRY_RUN", reasons };
  }

  const validation = await input.operations.runValidation(VALIDATION_COMMANDS);
  if (!validation.ok) {
    const updated = await recordImportFailure(input.repositoryRoot, input.record, { strategy: "release", classification: "deterministic", message: validation.summary });
    return { status: updated.stage === "QUARANTINED" ? "QUARANTINED" : "REPAIRING", reasons: [validation.summary] };
  }

  const initialGit = await input.operations.inspectGit();
  if (!initialGit.clean || validateReleasePaths(initialGit.changedFiles, input.record.format, input.ownerAuthorizedAffiliateUrl === true).length) {
    const updated = await recordImportFailure(input.repositoryRoot, input.record, { strategy: "release", classification: "deterministic", message: "The worktree contains changes outside the import release allowlist." });
    return { status: updated.stage === "QUARANTINED" ? "QUARANTINED" : "REPAIRING", reasons: ["WORKTREE_NOT_RELEASE_SAFE"] };
  }

  const refreshed = await input.operations.refreshMain();
  if (!refreshed.fastForwardable || refreshed.originMainSha !== initialGit.originMainSha) {
    const updated = await recordImportFailure(input.repositoryRoot, input.record, { strategy: "release", classification: "transient", message: "main moved during release preparation; refresh and regenerate the candidate." });
    return { status: updated.stage === "QUARANTINED" ? "QUARANTINED" : "WAITING_EXTERNAL", reasons: ["MAIN_MOVED"] };
  }

  const previous = await input.operations.capturePreviousDeployment();
  try {
    const commitSha = await input.operations.commit(input.commitMessage ?? `publish imported article ${input.record.importId}`);
    await input.operations.pushFastForward(commitSha);
    const deployment = await input.operations.deploy(commitSha);
    const checks = await input.operations.verifyProduction(deployment);
    if (deployment.commitSha !== commitSha) {
      throw new Error("DEPLOYMENT_COMMIT_MISMATCH");
    }
    if (!allChecksPass(checks)) {
      let restored = false;
      try {
        const rollback = await input.operations.rollback(previous.deploymentId);
        restored = rollback.ok && await input.operations.verifyRollback(previous.deploymentId);
      } catch {
        restored = false;
      }
      const rolledBack = { ...input.record, stage: "ROLLED_BACK" as const, resumeStage: productiveStage(input.record), updatedAt: new Date().toISOString(), nextAction: restored ? "Repair the failed release layer and retry once." : "Production recovery failed; preserve the prior receipt and wait for external repair.", stageReceipts: [...input.record.stageReceipts, { stage: "ROLLED_BACK" as const, status: "failed" as const, at: new Date().toISOString(), message: restored ? "New deployment failed verification; previous deployment restored." : "New deployment failed verification and rollback did not verify." }] };
      await saveImport(input.repositoryRoot, rolledBack);
      if (!restored) return { status: "ROLLED_BACK", reasons: ["ROLLBACK_VERIFICATION_FAILED"], previousDeploymentId: previous.deploymentId, deploymentId: deployment.deploymentId };
      if (input.operations.fixForward && await input.operations.fixForward(1)) return { status: "ROLLED_BACK", reasons: ["FIX_FORWARD_REQUIRED"], previousDeploymentId: previous.deploymentId, deploymentId: deployment.deploymentId };
      return { status: "ROLLED_BACK", reasons: ["PRODUCTION_CHECK_FAILED"], previousDeploymentId: previous.deploymentId, deploymentId: deployment.deploymentId };
    }
    const withReceipt = await recordImportRelease(input.repositoryRoot, input.record, { schemaVersion: "ImportReleaseV1", commitSha, deploymentId: deployment.deploymentId, canonicalUrl: deployment.canonicalUrl, verifiedAt: new Date().toISOString(), checks, previousDeploymentId: previous.deploymentId });
    await verifyImportRelease(input.repositoryRoot, withReceipt);
    return { status: "LIVE", reasons: [], previousDeploymentId: previous.deploymentId, deploymentId: deployment.deploymentId, canonicalUrl: deployment.canonicalUrl };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const updated = await recordImportFailure(input.repositoryRoot, input.record, { strategy: "release", classification: "transient", message });
    return { status: updated.stage === "QUARANTINED" ? "QUARANTINED" : "WAITING_EXTERNAL", reasons: [message] };
  }
}

export { VALIDATION_COMMANDS };
