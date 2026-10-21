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
const PRODUCTION_CHECK_KEYS = ["routeOk", "contentOk", "disclosureOk", "exactCtaOk", "desktopOk", "mobileOk", "robotsOk", "sitemapOk", "browserErrorsOk"] as const;

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
  capturePreviousDeployment(): Promise<{ deploymentId: string; commitSha: string; verified: boolean }>;
  commit(message: string): Promise<string>;
  pushFastForward(commitSha: string): Promise<{ commitSha: string; originMainSha: string; force: false }>;
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

const COMMON_VALIDATION_COMMANDS = [
  "npm run verify:agent-workflow",
  "npm run lint",
  "npm run typecheck",
  "npm test",
  "npm run build",
  "npm run validate:public-site",
] as const;
const FORMAT_VALIDATION_GATES: Partial<Record<ImportFormat, readonly string[]>> = {
  blog: ["npm run validate:public-site"],
  visibility: ["npm run validate:public-site"],
  "decision-set": ["npm run validate:public-site"],
};

export function validationCommandsForFormat(format: ImportFormat, artifactPath?: string): readonly string[] | undefined {
  const gate = format === "direct-review" && artifactPath ? [`npm run landing:quality:candidate -- --artifact ${artifactPath}`] : FORMAT_VALIDATION_GATES[format];
  if (format === "direct-review" && !artifactPath) return undefined;
  return gate ? [...gate, ...COMMON_VALIDATION_COMMANDS] : undefined;
}

function pathUsesAllowedRoot(file: string, roots: readonly string[]): boolean {
  const normalized = file.replaceAll("\\", "/");
  if (normalized.startsWith("/") || normalized.split("/").includes("..")) return false;
  return roots.some((root) => normalized === root || normalized.startsWith(`${root}/`));
}

export function isAllowedReleasePath(file: string, format: ImportFormat, _ownerAuthorizedAffiliateUrl = false): boolean {
  void _ownerAuthorizedAffiliateUrl;
  const shared = ["build-pack/editorial", "build-pack/article-import"];
  const formatRoots: Record<ImportFormat, string[]> = {
    "direct-review": ["src/generated/landing-pages", "public/landing", "public/images"],
    blog: ["src/generated/blog-posts", "public/blog/images"],
    visibility: ["src/generated/visibility-pages", "public/images"],
    "decision-set": ["src/content/decision-journeys", "public/images"],
    agent_review_required: [],
  };
  if (pathUsesAllowedRoot(file, [...shared, ...formatRoots[format]])) return true;
  return false;
}

export function validateReleasePaths(files: readonly string[], format: ImportFormat, ownerAuthorizedAffiliateUrl = false): string[] {
  return files.filter((file) => !isAllowedReleasePath(file, format, ownerAuthorizedAffiliateUrl));
}

function parseProductionChecks(value: unknown): FullProductionChecks | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const candidate = value as Record<string, unknown>;
  if (Object.keys(candidate).sort().join(",") !== [...PRODUCTION_CHECK_KEYS].sort().join(",")) return undefined;
  if (PRODUCTION_CHECK_KEYS.some((key) => candidate[key] !== true)) return undefined;
  return candidate as FullProductionChecks;
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
  artifactPath?: string;
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

  const validationCommands = validationCommandsForFormat(input.record.format, input.artifactPath);
  if (!validationCommands) {
    const updated = await recordImportFailure(input.repositoryRoot, input.record, { strategy: "release", classification: "deterministic", message: `No configured validation gate for ${input.record.format}.` });
    return { status: updated.stage === "QUARANTINED" ? "QUARANTINED" : "REPAIRING", reasons: ["MISSING_FORMAT_VALIDATION_GATE"] };
  }
  const validation = await input.operations.runValidation(validationCommands);
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
  if (!previous.verified) {
    const updated = await recordImportFailure(input.repositoryRoot, input.record, { strategy: "release", classification: "transient", message: "No verified known-good production deployment is available for rollback." });
    return { status: updated.stage === "QUARANTINED" ? "QUARANTINED" : "WAITING_EXTERNAL", reasons: ["PREVIOUS_DEPLOYMENT_UNVERIFIED"] };
  }
  let deploymentStarted = false;
  try {
    const commitSha = await input.operations.commit(input.commitMessage ?? `publish imported article ${input.record.importId}`);
    const pushProof = await input.operations.pushFastForward(commitSha);
    if (pushProof.commitSha !== commitSha || pushProof.originMainSha !== commitSha || pushProof.force !== false) throw new Error("UNSAFE_PUSH_PROOF");
    const deployment = await input.operations.deploy(commitSha);
    deploymentStarted = true;
    if (deployment.commitSha !== commitSha) {
      throw new Error("DEPLOYMENT_COMMIT_MISMATCH");
    }
    let checks: FullProductionChecks | undefined;
    let verificationFailure: string | undefined;
    try {
      checks = parseProductionChecks(await input.operations.verifyProduction(deployment));
      if (!checks) verificationFailure = "INCOMPLETE_PRODUCTION_CHECKS";
    } catch (error) {
      verificationFailure = error instanceof Error ? error.message : String(error);
    }
    if (verificationFailure || !checks) {
      let restored = false;
      try {
        const rollback = await input.operations.rollback(previous.deploymentId);
        restored = rollback.ok && await input.operations.verifyRollback(previous.deploymentId);
      } catch {
        restored = false;
      }
      const recoveryStage = restored ? "ROLLED_BACK" as const : "WAITING_EXTERNAL" as const;
      const rolledBack = { ...input.record, stage: recoveryStage, resumeStage: productiveStage(input.record), updatedAt: new Date().toISOString(), nextAction: restored ? "Repair the failed release layer and retry once." : "Production recovery failed; heartbeat must retry rollback verification.", stageReceipts: [...input.record.stageReceipts, { stage: recoveryStage, status: restored ? "failed" as const : "waiting" as const, at: new Date().toISOString(), message: restored ? `New deployment failed verification (${verificationFailure}); previous deployment restored.` : `New deployment failed verification (${verificationFailure}); rollback did not verify.` }] };
      await saveImport(input.repositoryRoot, rolledBack);
      if (!restored) return { status: "WAITING_EXTERNAL", reasons: ["ROLLBACK_VERIFICATION_FAILED"], previousDeploymentId: previous.deploymentId, deploymentId: deployment.deploymentId };
      if (input.operations.fixForward && await input.operations.fixForward(1)) return { status: "ROLLED_BACK", reasons: ["FIX_FORWARD_REQUIRED"], previousDeploymentId: previous.deploymentId, deploymentId: deployment.deploymentId };
      return { status: "ROLLED_BACK", reasons: ["PRODUCTION_CHECK_FAILED"], previousDeploymentId: previous.deploymentId, deploymentId: deployment.deploymentId };
    }
    const withReceipt = await recordImportRelease(input.repositoryRoot, input.record, { schemaVersion: "ImportReleaseV1", commitSha, deploymentId: deployment.deploymentId, canonicalUrl: deployment.canonicalUrl, verifiedAt: new Date().toISOString(), checks, previousDeploymentId: previous.deploymentId });
    await verifyImportRelease(input.repositoryRoot, withReceipt);
    return { status: "LIVE", reasons: [], previousDeploymentId: previous.deploymentId, deploymentId: deployment.deploymentId, canonicalUrl: deployment.canonicalUrl };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!deploymentStarted) {
      const updated = await recordImportFailure(input.repositoryRoot, input.record, { strategy: "release", classification: "transient", message });
      return { status: updated.stage === "QUARANTINED" ? "QUARANTINED" : "WAITING_EXTERNAL", reasons: [message] };
    }
    let restored = false;
    try {
      const rollback = await input.operations.rollback(previous.deploymentId);
      restored = rollback.ok && await input.operations.verifyRollback(previous.deploymentId);
    } catch { restored = false; }
    const recoveryStage = restored ? "ROLLED_BACK" as const : "WAITING_EXTERNAL" as const;
    const updated = { ...input.record, stage: recoveryStage, resumeStage: productiveStage(input.record), updatedAt: new Date().toISOString(), nextAction: restored ? "Repair the failed release layer and retry once." : "Production recovery failed; heartbeat must retry rollback verification.", stageReceipts: [...input.record.stageReceipts, { stage: recoveryStage, status: restored ? "failed" as const : "waiting" as const, at: new Date().toISOString(), message: restored ? `${message}; previous deployment restored.` : `${message}; rollback did not verify.` }] };
    await saveImport(input.repositoryRoot, updated);
    return { status: recoveryStage, reasons: [message, ...(restored ? [] : ["ROLLBACK_VERIFICATION_FAILED"])], previousDeploymentId: previous.deploymentId };
  }
}

export { COMMON_VALIDATION_COMMANDS };
