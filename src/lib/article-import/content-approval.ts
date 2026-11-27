import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { isDeepStrictEqual } from "node:util";

import { EDITORIAL_REVISION, canReuseEditorialEvidence, fingerprintEditorialArtifact } from "../editorial/refinement";
import { importFormatQualityGates, validateImportArtifact } from "./format-validation";
import { countVisibleArticleWords, isLongFormAffiliateArticle, isLongFormAffiliateWordCount } from "../editorial/article-visible-word-count";
import { isEvidenceSnapshotActive } from "./execution-evidence";

const hash = z.string().regex(/^[a-f0-9]{64}$/);
export const contentApprovalSchema = z.object({
  schemaVersion: z.literal("ImportContentApprovalV1"),
  artifactPath: z.string().min(1),
  format: z.enum(["direct-review", "blog", "visibility", "decision-set"]),
  schemaRevision: z.string().min(1),
  artifactFingerprint: hash,
  sourceFingerprint: hash,
  editorialRevision: z.literal(EDITORIAL_REVISION),
  editorialEvidencePath: z.string().min(1),
  editorialEvidenceFingerprint: hash,
  formatQualityPath: z.string().min(1),
  formatQualityFingerprint: hash,
  longFormAffiliate: z.object({ wordCount: z.number().int(), approvedAffiliateUrl: z.string().url() }).strict().optional(),
  approvedAt: z.string().datetime({ offset: true }),
}).strict();
export type ContentApproval = z.infer<typeof contentApprovalSchema>;
export type ApprovalFiles = { artifactPath: string; editorialEvidencePath: string; formatQualityPath: string };

const formats = { "direct-review": "landing", blog: "blog", visibility: "visibility", "decision-set": "decision" } as const;
const revisions = { "direct-review": "PageBlueprintV1", blog: "BlogPostV1", visibility: "VisibilityPageV1", "decision-set": "DecisionSetV2" } as const;

async function readCanonicalJson(root: string, file: string) {
  const canonicalRoot = await realpath(root);
  const absolute = await realpath(path.resolve(root, file));
  const relative = path.relative(canonicalRoot, absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Approval files must be inside the repository.");
  return { path: relative.replaceAll("\\", "/"), value: JSON.parse(await readFile(absolute, "utf8")) };
}

export type ApprovedArtifactSnapshot =
  | { ok: true; path: string; artifact: unknown; matches: (approval: unknown, format: string, sourceFingerprint: string, approvedAffiliateUrl?: string) => Promise<boolean> }
  | { ok: false; error: "ARTIFACT_NOT_FOUND" | "ARTIFACT_PATH_ESCAPE" | "ARTIFACT_UNREADABLE" };

export async function loadApprovedArtifact(root: string, artifactPath: string): Promise<ApprovedArtifactSnapshot> {
  let canonicalRoot: string;
  try {
    canonicalRoot = await realpath(root);
  } catch {
    return { ok: false, error: "ARTIFACT_NOT_FOUND" };
  }
  const full = path.resolve(root, artifactPath);
  let canonical: string;
  try {
    canonical = await realpath(full);
  } catch {
    return { ok: false, error: "ARTIFACT_NOT_FOUND" };
  }
  const relative = path.relative(canonicalRoot, canonical);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return { ok: false, error: "ARTIFACT_PATH_ESCAPE" };
  }
  let artifact: unknown;
  try {
    artifact = JSON.parse(await readFile(canonical, "utf8"));
  } catch {
    return { ok: false, error: "ARTIFACT_UNREADABLE" };
  }
  const relPath = relative.replaceAll("\\", "/");
  const matches = async (approval: unknown, format: string, sourceFingerprint: string, approvedAffiliateUrl?: string): Promise<boolean> => {
    const parsed = contentApprovalSchema.safeParse(approval);
    if (!parsed.success || parsed.data.format !== format || parsed.data.sourceFingerprint !== sourceFingerprint) return false;
    const expected = parsed.data;
    try {
      const current = await createApprovalForSnapshot(root, { path: relPath, artifact }, format, sourceFingerprint, expected.editorialEvidencePath, expected.formatQualityPath, approvedAffiliateUrl, !(isEvidenceSnapshotActive() && !expected.longFormAffiliate));
      return isDeepStrictEqual({ ...current, approvedAt: expected.approvedAt }, expected);
    } catch {
      return false;
    }
  };
  return { ok: true, path: relPath, artifact, matches };
}

async function createApprovalForSnapshot(
  root: string,
  loaded: { path: string; artifact: unknown },
  formatInput: string,
  sourceFingerprint: string,
  editorialEvidencePath: string,
  formatQualityPath: string,
  approvedAffiliateUrl?: string,
  enforceLongFormAffiliate = true,
): Promise<ContentApproval> {
  if (!Object.hasOwn(formats, formatInput)) throw new Error("A supported content format is required.");
  const format = formatInput as ContentApproval["format"];
  const artifact = loaded.artifact;
  const editorial = await readCanonicalJson(root, editorialEvidencePath);
  const quality = await readCanonicalJson(root, formatQualityPath);
  if (!canReuseEditorialEvidence(editorial.value, formats[format], artifact)) {
    throw new Error("Full-article SlopMonster evidence does not approve the current artifact.");
  }
  const artifactFingerprint = fingerprintEditorialArtifact(artifact);
  validateImportArtifact(format, artifact);
  let longFormAffiliate;
  if (enforceLongFormAffiliate && isLongFormAffiliateArticle({ format, approvedAffiliateUrl })) {
    const { wordCount } = countVisibleArticleWords("direct-review", artifact);
    if (!isLongFormAffiliateWordCount(wordCount)) throw new Error(`LONG_FORM_AFFILIATE_WORD_COUNT:${wordCount}`);
    longFormAffiliate = { wordCount, approvedAffiliateUrl: approvedAffiliateUrl! };
  }
  z.object({ format: z.literal(format), artifactFingerprint: z.literal(artifactFingerprint), passed: z.literal(true), gate: z.literal(importFormatQualityGates[format]) }).passthrough().parse(quality.value);
  return contentApprovalSchema.parse({
    schemaVersion: "ImportContentApprovalV1", artifactPath: loaded.path, format, schemaRevision: revisions[format],
    artifactFingerprint, sourceFingerprint, editorialRevision: EDITORIAL_REVISION,
    editorialEvidencePath: editorial.path, editorialEvidenceFingerprint: fingerprintEditorialArtifact(editorial.value),
    formatQualityPath: quality.path, formatQualityFingerprint: fingerprintEditorialArtifact(quality.value), ...(longFormAffiliate && { longFormAffiliate }), approvedAt: new Date().toISOString(),
  });
}

export async function createContentApproval(root: string, input: ApprovalFiles & { format: string; sourceFingerprint: string; approvedAffiliateUrl?: string }): Promise<ContentApproval> {
  const loaded = await loadApprovedArtifact(root, input.artifactPath);
  if (!loaded.ok) throw new Error(loaded.error);
  return createApprovalForSnapshot(root, loaded, input.format, input.sourceFingerprint, input.editorialEvidencePath, input.formatQualityPath, input.approvedAffiliateUrl);
}

export async function formatQualityApprovalMatches(root: string, approval: unknown, format: string, sourceFingerprint: string): Promise<boolean> {
  const parsed = contentApprovalSchema.safeParse(approval);
  if (!parsed.success || parsed.data.format !== format || parsed.data.sourceFingerprint !== sourceFingerprint) return false;
  try {
    const quality = await readCanonicalJson(root, parsed.data.formatQualityPath);
    z.object({
      format: z.literal(parsed.data.format),
      artifactFingerprint: z.literal(parsed.data.artifactFingerprint),
      passed: z.literal(true),
      gate: z.literal(importFormatQualityGates[parsed.data.format]),
    }).passthrough().parse(quality.value);
    return quality.path === parsed.data.formatQualityPath
      && fingerprintEditorialArtifact(quality.value) === parsed.data.formatQualityFingerprint;
  } catch {
    return false;
  }
}

export async function resolveContentApproval(root: string, approval: unknown, format: string, sourceFingerprint: string, artifactPath?: string, approvedAffiliateUrl?: string): Promise<{ ok: true; artifact: unknown } | { ok: false }> {
  const parsed = contentApprovalSchema.safeParse(approval);
  if (!parsed.success || parsed.data.format !== format || parsed.data.sourceFingerprint !== sourceFingerprint) return { ok: false };
  const loadPath = artifactPath ?? parsed.data.artifactPath;
  const loaded = await loadApprovedArtifact(root, loadPath);
  if (!loaded.ok) return { ok: false };
  const valid = await loaded.matches(approval, format, sourceFingerprint, approvedAffiliateUrl);
  if (!valid) return { ok: false };
  return { ok: true, artifact: loaded.artifact };
}

export async function contentApprovalMatches(root: string, approval: unknown, format: string, sourceFingerprint: string, artifactPath?: string, approvedAffiliateUrl?: string): Promise<boolean> {
  const resolved = await resolveContentApproval(root, approval, format, sourceFingerprint, artifactPath, approvedAffiliateUrl);
  return resolved.ok;
}
