import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { ensureImportContentApproval, recordImportFailure, recordImportRelease, saveImport, verifyImportRelease } from "./engine";
import type { ExternalArticleImportV1, ImportFormat, ImportStage } from "./contracts";
import { fingerprintEditorialArtifact } from "../editorial/refinement";
import { requireImportPresentationBinding, verifyImportPresentationEvidence } from "./presentation";
import { readImportArtifactTarget } from "./format-validation";
import { importCodeReviewSchema } from "./contracts";

export async function recordImportCodeReview(repositoryRoot: string, record: ExternalArticleImportV1, receipt: unknown, operations: Pick<ReleaseOperations, "inspectPullRequest" | "verifyCodeReview">): Promise<ExternalArticleImportV1> {
  const codeReview = importCodeReviewSchema.parse(receipt);
  const pending = record.pendingRelease;
  if (!pending?.pullRequestUrl || codeReview.pullRequestUrl !== pending.pullRequestUrl || codeReview.reviewedCommitSha !== pending.reviewedCommitSha) throw new Error("CODE_REVIEW_BINDING_MISMATCH");
  const current = await operations.inspectPullRequest(pending.pullRequestUrl);
  if (current.headRefOid !== codeReview.reviewedCommitSha) throw new Error("CODE_REVIEW_HEAD_CHANGED");
  await operations.verifyCodeReview(codeReview.pullRequestUrl, codeReview.evidenceUrl, current.headRefOid);
  const updated = { ...record, pendingRelease: { ...pending, codeReview }, updatedAt: new Date().toISOString() };
  await saveImport(repositoryRoot, updated);
  return updated;
}

function hasCurrentCodeReview(record: ExternalArticleImportV1, head: string): boolean {
  const pending = record.pendingRelease;
  const review = importCodeReviewSchema.safeParse(pending?.codeReview);
  return review.success && review.data.reviewedCommitSha === head && head === pending?.reviewedCommitSha && review.data.pullRequestUrl === pending.pullRequestUrl;
}

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
  commit(message: string, files: readonly string[]): Promise<string>;
  preparePullRequest(reviewedCommitSha: string): Promise<{ url: string; branch: string; reviewedCommitSha: string }>;
  inspectPullRequest(url: string): Promise<{ merged: boolean; ownerApproved?: boolean; headRefOid: string; mergeCommitSha?: string }>;
  verifyCodeReview(pullRequestUrl: string, evidenceUrl: string, reviewedCommitSha: string): Promise<void>;
  checkoutMergedCommit(reviewedCommitSha: string, mergeCommitSha: string): Promise<void>;
  deploy(commitSha: string): Promise<ReleaseDeployment>;
  verifyProduction(deployment: ReleaseDeployment): Promise<FullProductionChecks>;
  rollback(deploymentId: string): Promise<{ ok: boolean; summary: string }>;
  verifyRollback(deploymentId: string, expectedCommitSha?: string): Promise<boolean>;
  fixForward?(attempt: number): Promise<boolean>;
};

export type ReleaseAssessment = {
  status: "DRY_RUN" | "WAITING_EXTERNAL" | "REPAIRING" | "REFINING" | "ROLLED_BACK" | "LIVE" | "QUARANTINED";
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
export function validationCommandsForFormat(format: ImportFormat, artifactPath?: string): readonly string[] | undefined {
  if (!artifactPath || !/^[a-zA-Z0-9_./-]+$/.test(artifactPath) || artifactPath.split("/").includes("..") || artifactPath.startsWith("/")) return undefined;
  const basename = artifactPath?.replaceAll("\\", "/").split("/").at(-1);
  const gate = format === "direct-review" && basename ? [`npm run landing:quality:candidate -- --artifact ${basename}`] : format !== "agent_review_required" ? [`npx tsx scripts/validate-article-artifact.ts ${format} ${artifactPath}`] : undefined;
  return gate ? [...gate, ...COMMON_VALIDATION_COMMANDS] : undefined;
}

function pathUsesAllowedRoot(file: string, roots: readonly string[]): boolean {
  const normalized = file.replaceAll("\\", "/");
  if (normalized.startsWith("/") || normalized.split("/").includes("..")) return false;
  return roots.some((root) => normalized === root || normalized.startsWith(`${root}/`));
}

function normalizedPathSet(files: readonly string[]): string[] {
  return [...new Set(files.map((file) => file.replaceAll("\\", "/")))].sort();
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

/** Publication authority files that must accompany the approved artifact in every release commit. */
export function publicationAuthorityPaths(format: ImportFormat): readonly string[] {
  switch (format) {
    case "direct-review": return ["src/generated/landing-pages/index.json"];
    case "blog": return ["src/generated/blog-posts/posts.json"];
    case "visibility": return ["src/generated/visibility-pages/index.json", "src/generated/visibility-pages/publications.json"];
    case "decision-set": return ["src/content/decision-journeys/catalogue.json"];
    case "agent_review_required": return [];
  }
}

const AFFILIATE_DESTINATION_KEYS = new Set(["destination_url", "affiliate_url", "final_visible_destination_url", "approved_destinations"]);

export function collectAffiliateDestinationUrls(value: unknown, collected: string[] = []): string[] {
  if (Array.isArray(value)) { for (const item of value) collectAffiliateDestinationUrls(item, collected); return collected; }
  if (!value || typeof value !== "object") return collected;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (AFFILIATE_DESTINATION_KEYS.has(key)) {
      if (typeof child === "string" && child.trim()) collected.push(child.trim());
      else if (Array.isArray(child)) { for (const item of child) if (typeof item === "string" && item.trim()) collected.push(item.trim()); }
      else collectAffiliateDestinationUrls(child, collected);
    } else collectAffiliateDestinationUrls(child, collected);
  }
  return collected;
}

/** Enforces the import's resolved commercial mode on an artifact before it can publish. */
export function assertArtifactCommercialSafety(record: ExternalArticleImportV1, format: ImportFormat, artifact: unknown): void {
  const mode = record.transformation?.commercialMode ?? "none";
  const resolved = record.transformation?.resolvedAffiliateUrl;
  const submitted = record.transformation?.submittedAffiliateUrl;
  const destinations = [...new Set(collectAffiliateDestinationUrls(artifact))];
  const serialized = JSON.stringify(artifact ?? "");
  if (mode === "decommercialized") {
    if (format === "direct-review") throw new Error("DECOMMERCIALIZED_INPUT_CANNOT_PUBLISH_DIRECT_REVIEW");
    if (destinations.length) throw new Error("DECOMMERCIALIZED_ARTIFACT_RETAINS_AFFILIATE_DESTINATION");
    if (submitted && serialized.includes(submitted)) throw new Error("DECOMMERCIALIZED_ARTIFACT_RETAINS_SUBMITTED_AFFILIATE_URL");
    return;
  }
  if (format !== "direct-review") {
    if (destinations.length) throw new Error("NON_DIRECT_REVIEW_ARTIFACT_RETAINS_AFFILIATE_DESTINATION");
    // Generic URL fields (e.g. BlogPostV1 sources[].url) can smuggle the affiliate
    // destination past the named-key collector above.
    for (const url of [submitted, resolved]) {
      if (url && serialized.includes(url)) throw new Error("NON_DIRECT_REVIEW_ARTIFACT_RETAINS_AFFILIATE_URL");
    }
    return;
  }
  // Direct-review is the commercial format. A mode-"none" (neutral) import that
  // selects it would publish a receipt CTA URL the source never supplied, so it
  // must fail here exactly as the decommercialized case does above.
  if (mode !== "approved") throw new Error("DIRECT_REVIEW_REQUIRES_APPROVED_COMMERCIAL_MODE");
  if (!resolved) throw new Error("DIRECT_REVIEW_REQUIRES_RESOLVED_AFFILIATE_URL");
  for (const destination of destinations) {
    if (!resolved || destination !== resolved) throw new Error("ARTIFACT_AFFILIATE_DESTINATION_NOT_RESOLVED_URL");
  }
  const blueprint = artifact as { affiliate_links?: Array<{ affiliate_link_id?: string; destination_url?: string | null }>; hero?: { primary_cta_link_id?: string }; cta_blocks?: Array<{ affiliate_link_id?: string }> };
  const links = Array.isArray(blueprint.affiliate_links) ? blueprint.affiliate_links : [];
  if (!links.length) return;
  const byId = new Map(links.map((link) => [String(link.affiliate_link_id ?? ""), link.destination_url]));
  const referenced = [blueprint.hero?.primary_cta_link_id, ...(Array.isArray(blueprint.cta_blocks) ? blueprint.cta_blocks : []).map((block) => block.affiliate_link_id)].filter((id): id is string => typeof id === "string" && id.length > 0);
  for (const id of referenced) {
    const destination = byId.get(id);
    if (typeof destination !== "string" || !resolved || destination !== resolved) throw new Error("AFFILIATE_CTA_DESTINATION_UNBOUND");
  }
}

function safeCatalogueReceiptPath(directory: string, relativePath: string): string {
  if (!relativePath.endsWith(".json") || relativePath.includes("\\") || relativePath.split("/").some((segment) => !segment || segment === "..")) {
    throw new Error("RELEASE_RECEIPT_PATH_INVALID");
  }
  const candidate = path.resolve(directory, relativePath);
  const relative = path.relative(directory, candidate);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("RELEASE_RECEIPT_PATH_INVALID");
  return candidate;
}

/**
 * Binds an approved direct-review release to the manifest-selected receipt. The public CTA URL
 * served from production is the receipt's exact_affiliate_url, not anything in the blueprint
 * (PageBlueprint carries no affiliate_links), so the receipt must name the record's resolved
 * affiliate URL — otherwise an allowlisted URL B could ship for an import resolved to URL A.
 * The manifest artifact and the receipt page fingerprint must also match the approved
 * `<slug>.json` blueprint on disk: otherwise an authority-file change could deploy unapproved
 * content under the approved slug while the URL binding alone still passes.
 */
export async function assertReleaseReceiptAffiliateBinding(repositoryRoot: string, slug: string, record: ExternalArticleImportV1): Promise<void> {
  const transformation = record.transformation;
  if (record.format !== "direct-review" || transformation?.commercialMode !== "approved") return;
  const resolved = transformation.resolvedAffiliateUrl;
  if (!resolved) throw new Error("RELEASE_RECEIPT_AFFILIATE_URL_MISMATCH");
  const catalogueDirectory = path.resolve(repositoryRoot, "src/generated/landing-pages");
  let manifest: { pages?: Array<{ slug?: unknown; release_receipt?: unknown; artifact?: unknown }> };
  try {
    manifest = JSON.parse(await readFile(path.join(catalogueDirectory, "index.json"), "utf8"));
  } catch { throw new Error(`RELEASE_MANIFEST_ENTRY_MISSING:${slug}`); }
  const entry = (manifest.pages ?? []).find((page) => page.slug === slug);
  if (!entry || typeof entry.release_receipt !== "string") throw new Error(`RELEASE_MANIFEST_ENTRY_MISSING:${slug}`);
  let receipt: { exact_affiliate_url?: unknown; artifacts?: { page?: { path?: unknown; sha256?: unknown } } };
  try {
    receipt = JSON.parse(await readFile(safeCatalogueReceiptPath(catalogueDirectory, entry.release_receipt), "utf8"));
  } catch (error) {
    if (error instanceof Error && error.message === "RELEASE_RECEIPT_PATH_INVALID") throw error;
    throw new Error("RELEASE_RECEIPT_UNREADABLE");
  }
  if (receipt.exact_affiliate_url !== resolved) throw new Error("RELEASE_RECEIPT_AFFILIATE_URL_MISMATCH");
  const expectedArtifact = `${slug}.json`;
  if (typeof entry.artifact !== "string" || entry.artifact !== expectedArtifact) throw new Error("RELEASE_MANIFEST_ARTIFACT_MISMATCH");
  const receiptPage = receipt.artifacts?.page;
  if (!receiptPage || typeof receiptPage.path !== "string" || receiptPage.path !== entry.artifact) throw new Error("RELEASE_RECEIPT_ARTIFACT_PATH_MISMATCH");
  if (typeof receiptPage.sha256 !== "string") throw new Error("RELEASE_RECEIPT_ARTIFACT_FINGERPRINT_MISMATCH");
  let artifactBytes: Buffer;
  try {
    artifactBytes = await readFile(safeCatalogueReceiptPath(catalogueDirectory, expectedArtifact));
  } catch { throw new Error("RELEASE_RECEIPT_ARTIFACT_FINGERPRINT_MISMATCH"); }
  const artifactText = artifactBytes.toString("utf8");
  const acceptedFingerprints = new Set([
    createHash("sha256").update(artifactBytes).digest("hex"),
    createHash("sha256").update(artifactText.replace(/\r\n/g, "\n")).digest("hex"),
    createHash("sha256").update(artifactText.replace(/\r\n/g, "\n").replace(/\n/g, "\r\n")).digest("hex"),
  ]);
  if (!acceptedFingerprints.has(receiptPage.sha256)) throw new Error("RELEASE_RECEIPT_ARTIFACT_FINGERPRINT_MISMATCH");
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
  slug?: string;
  operations: ReleaseOperations;
  commitMessage?: string;
}): Promise<ReleaseAssessment> {
  const reasons: string[] = [];
  const disallowed = validateReleasePaths(input.changedFiles, input.record.format, input.ownerAuthorizedAffiliateUrl === true);
  if (disallowed.length) reasons.push(`DISALLOWED_RELEASE_PATHS:${disallowed.join(",")}`);
  if (input.execute && input.record.contentApproval) {
    try {
      if (input.artifactPath?.replaceAll("\\", "/") !== input.record.contentApproval.artifactPath) throw new Error("ARTIFACT_PATH_MISMATCH");
      const { target, artifact } = await readImportArtifactTarget(input.repositoryRoot, input.record.format, input.record.contentApproval.artifactPath, input.slug);
      input.slug = target.slug;
      assertArtifactCommercialSafety(input.record, input.record.format, artifact);
      await assertReleaseReceiptAffiliateBinding(input.repositoryRoot, target.slug, input.record);
    } catch (error) { reasons.push(error instanceof Error ? error.message : String(error)); }
  }
  if (input.record.format === "direct-review") {
    if (!input.slug) reasons.push("DIRECT_REVIEW_SLUG_REQUIRED");
    const expected = input.slug ? `src/generated/landing-pages/${input.slug}.json` : undefined;
    const normalizedArtifact = input.artifactPath?.replaceAll("\\", "/");
    if (!expected || normalizedArtifact !== expected || normalizedArtifact.startsWith("/") || normalizedArtifact.split("/").includes("..")) reasons.push("DIRECT_REVIEW_ARTIFACT_MISMATCH");
    if (expected && !input.changedFiles.map((file) => file.replaceAll("\\", "/")).includes(expected)) reasons.push("DIRECT_REVIEW_ARTIFACT_NOT_CHANGED");
  }
  // Every publishable format ships its approved artifact plus its publication authority files.
  if (input.record.format !== "agent_review_required") {
    const declared = normalizedPathSet(input.changedFiles);
    const approvedArtifact = input.record.contentApproval?.artifactPath?.replaceAll("\\", "/") ?? input.artifactPath?.replaceAll("\\", "/");
    if (input.record.format !== "direct-review" && approvedArtifact && !declared.includes(approvedArtifact)) reasons.push("ARTIFACT_NOT_IN_RELEASE");
    for (const authority of publicationAuthorityPaths(input.record.format)) {
      if (!declared.includes(authority)) reasons.push(`PUBLICATION_AUTHORITY_NOT_IN_RELEASE:${authority}`);
    }
  }
  if (input.killSwitchEnabled) {
    return { status: "WAITING_EXTERNAL", reasons: ["AUTOMATION_KILL_SWITCH_ENABLED"] };
  }
  if (input.execute && reasons.length) {
    const updated = await recordImportFailure(input.repositoryRoot, input.record, { strategy: "release", classification: "deterministic", message: reasons.join("; ") });
    return { status: updated.stage === "QUARANTINED" ? "QUARANTINED" : "REPAIRING", reasons };
  }
  try {
    const preflight = await input.operations.preflight();
    if (!preflight.ok) reasons.push(...preflight.reasons);
    if (reasons.length || !input.execute) {
      if (input.execute) await recordImportFailure(input.repositoryRoot, input.record, { strategy: "release", classification: "transient", message: reasons.join("; ") });
      return { status: input.execute ? "WAITING_EXTERNAL" : "DRY_RUN", reasons };
    }

  const validationCommands = validationCommandsForFormat(input.record.format, input.artifactPath);
  const approved = await ensureImportContentApproval(input.repositoryRoot, input.record, input.artifactPath);
  if (!approved.contentApproval) return { status: "REFINING", reasons: ["CONTENT_APPROVAL_INVALID"] };
  if (!validationCommands) {
    const updated = await recordImportFailure(input.repositoryRoot, input.record, { strategy: "release", classification: "deterministic", message: `No configured validation gate for ${input.record.format}.` });
    return { status: updated.stage === "QUARANTINED" ? "QUARANTINED" : "REPAIRING", reasons: ["MISSING_FORMAT_VALIDATION_GATE"] };
  }
  const validation = await input.operations.runValidation(validationCommands);
  if (!validation.ok) {
    const updated = await recordImportFailure(input.repositoryRoot, input.record, { strategy: "release", classification: "deterministic", message: validation.summary });
    return { status: updated.stage === "QUARANTINED" ? "QUARANTINED" : "REPAIRING", reasons: [validation.summary] };
  }
  input.record = approved;
  try { await verifyImportPresentationEvidence(input.repositoryRoot, input.record); }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const updated = await recordImportFailure(input.repositoryRoot, input.record, { strategy: "release", classification: "deterministic", message });
    return { status: updated.stage === "QUARANTINED" ? "QUARANTINED" : "REPAIRING", reasons: [message] };
  }
  const presentation = input.record.presentation!;

  const initialGit = await input.operations.inspectGit();
  const inspectedFiles = normalizedPathSet(initialGit.changedFiles);
  const declaredFiles = normalizedPathSet(input.changedFiles);
  const gitReasons: string[] = [];
  if (!initialGit.clean || validateReleasePaths(inspectedFiles, input.record.format, input.ownerAuthorizedAffiliateUrl === true).length) gitReasons.push("WORKTREE_NOT_RELEASE_SAFE");
  if (!input.record.pendingRelease && inspectedFiles.join("\n") !== declaredFiles.join("\n")) gitReasons.push("DECLARED_CHANGED_FILES_MISMATCH");
  if (!input.record.pendingRelease && input.record.format === "direct-review" && input.slug) {
    const expected = `src/generated/landing-pages/${input.slug}.json`;
    if (!inspectedFiles.includes(expected)) gitReasons.push("DIRECT_REVIEW_ARTIFACT_NOT_IN_WORKTREE");
  }
  if (!input.record.pendingRelease && input.record.format !== "agent_review_required") {
    if (input.record.format !== "direct-review") {
      const approvedArtifact = input.record.contentApproval?.artifactPath?.replaceAll("\\", "/") ?? input.artifactPath?.replaceAll("\\", "/");
      if (approvedArtifact && !inspectedFiles.includes(approvedArtifact)) gitReasons.push("ARTIFACT_NOT_IN_WORKTREE");
    }
    for (const authority of publicationAuthorityPaths(input.record.format)) {
      if (!inspectedFiles.includes(authority)) gitReasons.push(`PUBLICATION_AUTHORITY_NOT_IN_WORKTREE:${authority}`);
    }
  }
  if (gitReasons.length) {
    const updated = await recordImportFailure(input.repositoryRoot, input.record, { strategy: "release", classification: "deterministic", message: `The inspected worktree does not match the declared import release: ${gitReasons.join(",")}.` });
    return { status: updated.stage === "QUARANTINED" ? "QUARANTINED" : "REPAIRING", reasons: gitReasons };
  }

  const refreshed = await input.operations.refreshMain();
  if (!input.record.pendingRelease && (!refreshed.fastForwardable || refreshed.originMainSha !== initialGit.originMainSha)) {
    const updated = await recordImportFailure(input.repositoryRoot, input.record, { strategy: "release", classification: "transient", message: "main moved during release preparation; refresh and regenerate the candidate." });
    return { status: updated.stage === "QUARANTINED" ? "QUARANTINED" : "WAITING_EXTERNAL", reasons: ["MAIN_MOVED"] };
  }

  const storedRollback = input.record.pendingRelease?.rollbackDeploymentId && input.record.pendingRelease.rollbackCommitSha
    ? { deploymentId: input.record.pendingRelease.rollbackDeploymentId, commitSha: input.record.pendingRelease.rollbackCommitSha, verified: true }
    : undefined;
  const previous = storedRollback ?? await input.operations.capturePreviousDeployment();
  if (!previous.verified) {
    const updated = await recordImportFailure(input.repositoryRoot, input.record, { strategy: "release", classification: "transient", message: "No verified known-good production deployment is available for rollback." });
    return { status: updated.stage === "QUARANTINED" ? "QUARANTINED" : "WAITING_EXTERNAL", reasons: ["PREVIOUS_DEPLOYMENT_UNVERIFIED"] };
  }
  let deploymentStarted = false;
  const rechecked = await ensureImportContentApproval(input.repositoryRoot, input.record, input.artifactPath);
  if (!rechecked.contentApproval) return { status: "REFINING", reasons: ["CONTENT_APPROVAL_INVALID"] };
  try {
    let pendingRelease = input.record.pendingRelease;
    if (!pendingRelease) {
      const reviewedCommitSha = await input.operations.commit(input.commitMessage ?? ("publish imported article " + input.record.importId), declaredFiles);
      pendingRelease = { schemaVersion: "ImportPendingReleaseV1", reviewedCommitSha, branch: "codex/article-import/" + input.record.importId, createdAt: new Date().toISOString(), rollbackDeploymentId: previous.deploymentId, rollbackCommitSha: previous.commitSha };
      input.record = { ...input.record, pendingRelease };
      await saveImport(input.repositoryRoot, input.record);
    } else if (!pendingRelease.rollbackDeploymentId || !pendingRelease.rollbackCommitSha) {
      pendingRelease = { ...pendingRelease, rollbackDeploymentId: previous.deploymentId, rollbackCommitSha: previous.commitSha };
      input.record = { ...input.record, pendingRelease };
      await saveImport(input.repositoryRoot, input.record);
    }
    if (!pendingRelease.pullRequestUrl) {
      const pullRequest = await input.operations.preparePullRequest(pendingRelease.reviewedCommitSha);
      if (pullRequest.reviewedCommitSha !== pendingRelease.reviewedCommitSha || pullRequest.branch !== pendingRelease.branch) throw new Error("PULL_REQUEST_COMMIT_MISMATCH");
      pendingRelease = { ...pendingRelease, pullRequestUrl: pullRequest.url };
      input.record = { ...input.record, pendingRelease };
      await saveImport(input.repositoryRoot, input.record);
      return await waitForCodeReview(input.repositoryRoot, input.record);
    }
    const pullRequest = await input.operations.inspectPullRequest(pendingRelease.pullRequestUrl);
    if (pullRequest.headRefOid !== pendingRelease.reviewedCommitSha) return await waitForCodeReview(input.repositoryRoot, input.record, "PULL_REQUEST_HEAD_CHANGED");
    if (!hasCurrentCodeReview(input.record, pullRequest.headRefOid)) return await waitForCodeReview(input.repositoryRoot, input.record);
    await input.operations.verifyCodeReview(pendingRelease.pullRequestUrl, pendingRelease.codeReview!.evidenceUrl, pullRequest.headRefOid);
    if (!pullRequest.merged || pullRequest.ownerApproved !== true) return await waitForOwnerMerge(input.repositoryRoot, input.record);
    if (!pullRequest.mergeCommitSha) throw new Error("MERGE_COMMIT_MISSING");
    const commitSha = pullRequest.mergeCommitSha;
    await input.operations.checkoutMergedCommit(pendingRelease.reviewedCommitSha, commitSha);
    const mergedValidation = await input.operations.runValidation(validationCommands);
    if (!mergedValidation.ok) {
      const updated = await recordImportFailure(input.repositoryRoot, input.record, { strategy: "release", classification: "deterministic", message: `Merged commit validation failed: ${mergedValidation.summary}` });
      return { status: updated.stage === "QUARANTINED" ? "QUARANTINED" : "REPAIRING", reasons: [mergedValidation.summary] };
    }
    // The pre-PR binding only covered the worktree; another commit could change the
    // receipt after review, so rebind it on the merged checkout that actually deploys.
    try {
      await assertReleaseReceiptAffiliateBinding(input.repositoryRoot, input.slug ?? "", input.record);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const updated = await recordImportFailure(input.repositoryRoot, input.record, { strategy: "release", classification: "deterministic", message: `Merged checkout receipt binding failed: ${message}` });
      return { status: updated.stage === "QUARANTINED" ? "QUARANTINED" : "REPAIRING", reasons: [message] };
    }
    const mergedApproval = await ensureImportContentApproval(input.repositoryRoot, input.record, input.artifactPath);
    if (!mergedApproval.contentApproval) return { status: "REFINING", reasons: ["CONTENT_APPROVAL_INVALID"] };
    requireImportPresentationBinding(mergedApproval);
    pendingRelease = { ...pendingRelease, mergeCommitSha: commitSha };
    input.record = { ...input.record, pendingRelease };
    await saveImport(input.repositoryRoot, input.record);
    // The adapter can fail after its production side effect, so every attempt needs rollback.
    deploymentStarted = true;
    const deployment = await input.operations.deploy(commitSha);
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
        restored = rollback.ok && await input.operations.verifyRollback(previous.deploymentId, previous.commitSha);
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
    const withReceipt = await recordImportRelease(input.repositoryRoot, input.record, { schemaVersion: "ImportReleaseV1", commitSha, deploymentId: deployment.deploymentId, canonicalUrl: deployment.canonicalUrl, verifiedAt: new Date().toISOString(), checks, previousDeploymentId: previous.deploymentId, presentationFingerprint: fingerprintEditorialArtifact(presentation) });
    requireImportPresentationBinding(withReceipt);
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
      restored = rollback.ok && await input.operations.verifyRollback(previous.deploymentId, previous.commitSha);
    } catch { restored = false; }
    const recoveryStage = restored ? "ROLLED_BACK" as const : "WAITING_EXTERNAL" as const;
    const updated = { ...input.record, stage: recoveryStage, resumeStage: productiveStage(input.record), updatedAt: new Date().toISOString(), nextAction: restored ? "Repair the failed release layer and retry once." : "Production recovery failed; heartbeat must retry rollback verification.", stageReceipts: [...input.record.stageReceipts, { stage: recoveryStage, status: restored ? "failed" as const : "waiting" as const, at: new Date().toISOString(), message: restored ? `${message}; previous deployment restored.` : `${message}; rollback did not verify.` }] };
    await saveImport(input.repositoryRoot, updated);
    return { status: recoveryStage, reasons: [message, ...(restored ? [] : ["ROLLBACK_VERIFICATION_FAILED"])], previousDeploymentId: previous.deploymentId };
  }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await recordImportFailure(input.repositoryRoot, input.record, { strategy: "release", classification: "transient", message });
    return { status: "WAITING_EXTERNAL", reasons: [message] };
  }
}

export { COMMON_VALIDATION_COMMANDS };

async function waitForCodeReview(repositoryRoot: string, record: ExternalArticleImportV1, reason = "CURRENT_HEAD_CODEX_REVIEW_REQUIRED"): Promise<ReleaseAssessment> {
  const pending = record.pendingRelease;
  if (!pending?.pullRequestUrl) throw new Error("PULL_REQUEST_URL_MISSING");
  const at = new Date().toISOString();
  await saveImport(repositoryRoot, { ...record, pendingRelease: { ...pending, codeReview: undefined }, stage: "WAITING_EXTERNAL", resumeStage: "RELEASING", updatedAt: at,
    nextAction: "Record a passed independent Codex review of the current PR head before owner merge: " + pending.pullRequestUrl,
    stageReceipts: [...record.stageReceipts, { stage: "WAITING_EXTERNAL", status: "waiting", at, message: reason + ": " + pending.pullRequestUrl }],
  });
  return { status: "WAITING_EXTERNAL", reasons: [reason, pending.pullRequestUrl] };
}

async function waitForOwnerMerge(repositoryRoot: string, record: ExternalArticleImportV1): Promise<ReleaseAssessment> {
  const pullRequestUrl = record.pendingRelease?.pullRequestUrl;
  if (!pullRequestUrl) throw new Error("PULL_REQUEST_URL_MISSING");
  const at = new Date().toISOString();
  await saveImport(repositoryRoot, { ...record, stage: "WAITING_EXTERNAL", resumeStage: "RELEASING", updatedAt: at, nextAction: "Owner review and merge required: " + pullRequestUrl, stageReceipts: [...record.stageReceipts, { stage: "WAITING_EXTERNAL", status: "waiting", at, message: "Owner approval required: " + pullRequestUrl }] });
  return { status: "WAITING_EXTERNAL", reasons: ["OWNER_PR_MERGE_REQUIRED", pullRequestUrl] };
}
