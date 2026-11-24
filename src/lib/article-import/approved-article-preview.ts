import { existsSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { pageBlueprintSchema } from "@/lib/schemas/contracts";
import { fingerprintEditorialArtifact } from "@/lib/editorial/refinement";
import { parseApprovedUrls } from "@/lib/affiliate/approved-urls";
import { contentApprovalMatches } from "@/lib/article-import/content-approval";
import type { PageBlueprint } from "@/lib/schemas/contracts";

/**
 * Dev-only approved-article preview. Renders a frozen approved artifact through
 * the existing ReferenceComposedReviewPage without mutating any article, receipt,
 * import, or work-packet state. Returns null (not found) in production or when
 * any validation check fails.
 */

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

export function isValidSlug(slug: string): boolean {
  return typeof slug === "string" && SLUG_PATTERN.test(slug) && !slug.includes("..") && !slug.includes("/");
}

export function isDevEnvironment(): boolean {
  return process.env.NODE_ENV === "development";
}

export interface PreviewValidationResult {
  ok: boolean;
  blueprint?: PageBlueprint;
  affiliateUrlOverride?: string;
  error?: string;
}

/**
 * Validate all inputs and return the approved blueprint, or null if any check fails.
 * No side effects: no file writes, no state mutations, no caching.
 */
export async function validateApprovedArticlePreview(
  slug: string,
  importId: string,
  repositoryRoot: string,
  renderer: "reference" | "direct-review" = "reference",
): Promise<PreviewValidationResult> {
  // 1. Dev-only guard
  if (!isDevEnvironment()) {
    return { ok: false, error: "NOT_FOUND" };
  }

  // 2. Slug validation (no traversal)
  if (!isValidSlug(slug)) {
    return { ok: false, error: "INVALID_SLUG" };
  }

  // 3. Import ID validation
  if (typeof importId !== "string" || !/^article-[0-9a-f-]{36}$/.test(importId)) {
    return { ok: false, error: "INVALID_IMPORT_ID" };
  }

  // 4. Load import record
  const importPath = path.resolve(repositoryRoot, ".automation", "article-imports", `${importId}.json`);
  if (!existsSync(importPath)) {
    return { ok: false, error: "IMPORT_NOT_FOUND" };
  }
  let record: Record<string, unknown>;
  try {
    record = JSON.parse(readFileSync(importPath, "utf8"));
  } catch {
    return { ok: false, error: "IMPORT_UNREADABLE" };
  }

  // 5. Stage check (must be exactly VALIDATING)
  if (record.stage !== "VALIDATING") {
    return { ok: false, error: "INVALID_STAGE" };
  }

  // 6. Source fingerprint check
  if (typeof record.sourceFingerprint !== "string" || !/^[a-f0-9]{64}$/.test(record.sourceFingerprint)) {
    return { ok: false, error: "INVALID_SOURCE_FINGERPRINT" };
  }

  // 7. Content approval check
  const contentApproval = record.contentApproval as Record<string, unknown> | undefined;
  if (!contentApproval || typeof contentApproval !== "object") {
    return { ok: false, error: "NO_CONTENT_APPROVAL" };
  }
  const artifactPath = contentApproval.artifactPath;
  const artifactFingerprint = contentApproval.artifactFingerprint;
  const caSourceFingerprint = contentApproval.sourceFingerprint;
  if (typeof artifactPath !== "string" || typeof artifactFingerprint !== "string" || typeof caSourceFingerprint !== "string") {
    return { ok: false, error: "INVALID_CONTENT_APPROVAL" };
  }
  if (caSourceFingerprint !== record.sourceFingerprint) {
    return { ok: false, error: "CONTENT_APPROVAL_SOURCE_MISMATCH" };
  }

  // 8. Work packet check
  const continuation = record.continuation as Record<string, unknown> | undefined;
  const workPath = continuation?.workPath;
  if (typeof workPath !== "string") {
    return { ok: false, error: "NO_WORK_PACKET" };
  }

  // 9. Canonical path containment for work packet (repo root level)
  const canonicalRoot = realpathSync(repositoryRoot);
  const fullWorkPath = path.resolve(repositoryRoot, workPath);
  let canonicalWorkPath: string;
  try {
    canonicalWorkPath = realpathSync(fullWorkPath);
  } catch {
    return { ok: false, error: "WORK_PACKET_MISSING" };
  }
  const workRelative = path.relative(canonicalRoot, canonicalWorkPath);
  if (workRelative.startsWith("..") || path.isAbsolute(workRelative)) {
    return { ok: false, error: "WORK_PACKET_PATH_ESCAPE" };
  }

  // 10. Parse work packet
  let workPacket: Record<string, unknown>;
  try {
    workPacket = JSON.parse(readFileSync(canonicalWorkPath, "utf8"));
  } catch {
    return { ok: false, error: "WORK_PACKET_UNREADABLE" };
  }
  if (workPacket.schemaVersion !== "ImportSupervisedWorkV1") {
    return { ok: false, error: "INVALID_WORK_PACKET_SCHEMA" };
  }
  // Cross-check top-level work packet fields
  if (workPacket.importId !== importId) {
    return { ok: false, error: "WORK_PACKET_IMPORT_MISMATCH" };
  }
  if (workPacket.sourceFingerprint !== record.sourceFingerprint) {
    return { ok: false, error: "WORK_PACKET_SOURCE_MISMATCH" };
  }
  if (workPacket.stage !== "VALIDATING") {
    return { ok: false, error: "WORK_PACKET_STAGE_MISMATCH" };
  }
  // Cross-check record embedded in work packet
  const wpRecord = workPacket.record as Record<string, unknown> | undefined;
  if (!wpRecord || typeof wpRecord !== "object") {
    return { ok: false, error: "WORK_PACKET_RECORD_MISSING" };
  }
  if (wpRecord.importId !== importId) {
    return { ok: false, error: "WORK_PACKET_RECORD_IMPORT_MISMATCH" };
  }
  if (wpRecord.sourceFingerprint !== record.sourceFingerprint) {
    return { ok: false, error: "WORK_PACKET_RECORD_SOURCE_MISMATCH" };
  }
  if (wpRecord.stage !== "VALIDATING") {
    return { ok: false, error: "WORK_PACKET_RECORD_STAGE_MISMATCH" };
  }
  const wpContentApproval = wpRecord.contentApproval as Record<string, unknown> | undefined;
  if (!wpContentApproval || wpContentApproval.artifactFingerprint !== artifactFingerprint) {
    return { ok: false, error: "WORK_PACKET_CONTENT_APPROVAL_MISMATCH" };
  }
  if (wpContentApproval.artifactPath !== artifactPath) {
    return { ok: false, error: "WORK_PACKET_ARTIFACT_PATH_MISMATCH" };
  }

  // 11. Canonical path containment for private artifact (repo root level)
  const fullArtifactPath = path.resolve(repositoryRoot, artifactPath);
  let canonicalArtifactPath: string;
  try {
    canonicalArtifactPath = realpathSync(fullArtifactPath);
  } catch {
    return { ok: false, error: "ARTIFACT_NOT_FOUND" };
  }
  const artifactRelative = path.relative(canonicalRoot, canonicalArtifactPath);
  if (artifactRelative.startsWith("..") || path.isAbsolute(artifactRelative)) {
    return { ok: false, error: "ARTIFACT_PATH_ESCAPE" };
  }

  // 12. Read and parse the private approved artifact
  let artifactValue: unknown;
  try {
    artifactValue = JSON.parse(readFileSync(canonicalArtifactPath, "utf8"));
  } catch {
    return { ok: false, error: "ARTIFACT_UNREADABLE" };
  }

  // 13. Semantic fingerprint check (fingerprintEditorialArtifact, not raw SHA256)
  const semanticFingerprint = fingerprintEditorialArtifact(artifactValue);
  if (semanticFingerprint !== artifactFingerprint) {
    return { ok: false, error: "ARTIFACT_FINGERPRINT_MISMATCH" };
  }

  // 14. PageBlueprintV1 schema validation
  let blueprint: PageBlueprint;
  try {
    blueprint = pageBlueprintSchema.parse(artifactValue);
  } catch {
    return { ok: false, error: "INVALID_BLUEPRINT_SCHEMA" };
  }

  // 15. Renderer prerequisites: presentation recipe and answer snippet
  if (renderer === "reference" && !blueprint.presentation) {
    return { ok: false, error: "MISSING_PRESENTATION_RECIPE" };
  }
  if (renderer === "reference" && !blueprint.hero.answer_snippet?.trim()) {
    return { ok: false, error: "MISSING_ANSWER_SNIPPET" };
  }

  // 16. Slug must match blueprint metadata
  if (blueprint.metadata.url_slug !== slug) {
    return { ok: false, error: "SLUG_MISMATCH" };
  }

  // 17. Affiliate URL verification through approved-urls.md
  const transformation = record.transformation as Record<string, unknown> | undefined;
  const resolvedUrl = transformation?.resolvedAffiliateUrl;
  if (typeof resolvedUrl !== "string") {
    return { ok: false, error: "NO_RESOLVED_AFFILIATE_URL" };
  }
  const allowlistPath = path.resolve(repositoryRoot, "approved-urls.md");
  if (!existsSync(allowlistPath)) {
    return { ok: false, error: "APPROVED_URLS_MISSING" };
  }
  const allowlist = parseApprovedUrls(readFileSync(allowlistPath, "utf8"));
  const urlAllowed = allowlist.entries.some((e) => e.exactUrl === resolvedUrl);
  if (!urlAllowed) {
    return { ok: false, error: "UNAPPROVED_AFFILIATE_URL" };
  }

  // 18. Read-only content approval/evidence validation
  const approvalValid = await contentApprovalMatches(repositoryRoot, contentApproval, "direct-review", record.sourceFingerprint as string, artifactPath as string);
  if (!approvalValid) {
    return { ok: false, error: "CONTENT_APPROVAL_EVIDENCE_INVALID" };
  }

  return {
    ok: true,
    blueprint,
    affiliateUrlOverride: resolvedUrl,
  };
}
