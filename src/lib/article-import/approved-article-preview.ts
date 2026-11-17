import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pageBlueprintSchema } from "@/lib/schemas/contracts";
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
export function validateApprovedArticlePreview(
  slug: string,
  importId: string,
  repositoryRoot: string,
): PreviewValidationResult {
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

  // 5. Stage check (must be VALIDATING or later)
  const stage = record.stage;
  const validStages = ["VALIDATING", "RELEASING", "VERIFYING", "LIVE"];
  if (typeof stage !== "string" || !validStages.includes(stage)) {
    return { ok: false, error: "INVALID_STAGE" };
  }

  // 6. Content approval check
  const contentApproval = record.contentApproval as Record<string, unknown> | undefined;
  if (!contentApproval || typeof contentApproval !== "object") {
    return { ok: false, error: "NO_CONTENT_APPROVAL" };
  }
  const artifactPath = contentApproval.artifactPath;
  const artifactFingerprint = contentApproval.artifactFingerprint;
  if (typeof artifactPath !== "string" || typeof artifactFingerprint !== "string") {
    return { ok: false, error: "INVALID_CONTENT_APPROVAL" };
  }

  // 7. Work packet check
  const continuation = record.continuation as Record<string, unknown> | undefined;
  const workPath = continuation?.workPath;
  if (typeof workPath !== "string") {
    return { ok: false, error: "NO_WORK_PACKET" };
  }
  const fullWorkPath = path.resolve(repositoryRoot, workPath);
  if (!existsSync(fullWorkPath)) {
    return { ok: false, error: "WORK_PACKET_MISSING" };
  }

  // 8. Verify artifact path matches approved public projection
  // The contentApproval artifactPath points to the private approved artifact;
  // the public projection is at src/generated/landing-pages/<slug>.json
  const publicProjectionPath = path.resolve(repositoryRoot, "src", "generated", "landing-pages", `${slug}.json`);
  if (!existsSync(publicProjectionPath)) {
    return { ok: false, error: "PUBLIC_PROJECTION_MISSING" };
  }

  // 9. SHA256 check: public projection must match contentApproval fingerprint
  const projectionBytes = readFileSync(publicProjectionPath);
  const projectionHash = createHash("sha256").update(projectionBytes).digest("hex");
  if (projectionHash !== artifactFingerprint) {
    return { ok: false, error: "ARTIFACT_FINGERPRINT_MISMATCH" };
  }

  // 10. PageBlueprintV1 schema validation
  let blueprint: PageBlueprint;
  try {
    blueprint = pageBlueprintSchema.parse(JSON.parse(projectionBytes.toString("utf8")));
  } catch {
    return { ok: false, error: "INVALID_BLUEPRINT_SCHEMA" };
  }

  // 11. Slug must match blueprint metadata
  if (blueprint.metadata.url_slug !== slug) {
    return { ok: false, error: "SLUG_MISMATCH" };
  }

  // 12. Affiliate URL from transformation (if available)
  const transformation = record.transformation as Record<string, unknown> | undefined;
  const affiliateUrl = (transformation?.resolvedAffiliateUrl as string) || undefined;

  return {
    ok: true,
    blueprint,
    affiliateUrlOverride: affiliateUrl,
  };
}
