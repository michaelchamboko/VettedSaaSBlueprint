import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { z } from "zod";

import {
  type VisibilityEvidencePackV1,
  type VisibilityPageV1,
  type VisibilityPath,
  type VisibilityPublicationSummary,
  sha256,
  visibilityEvidencePackSchema,
  visibilityPageSchema,
  visibilityPathSchema,
} from "@/lib/visibility-pages/contracts";

const safeRelativeJsonPathSchema = z
  .string()
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9._/-]*\.json$/)
  .refine((value) => !value.includes("\\") && !value.split("/").some((part) => !part || part === ".."));

const manifestEntrySchema = z.object({
  id: z.string().min(1),
  path: visibilityPathSchema,
  artifact: safeRelativeJsonPathSchema,
  evidence: safeRelativeJsonPathSchema,
  artifact_sha256: z.string().regex(/^[a-f0-9]{64}$/),
  evidence_sha256: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();

const manifestSchema = z.object({
  schema_version: z.literal("VisibilityManifestV1"),
  pages: z.array(manifestEntrySchema),
}).strict();

const projectionEntrySchema = z.object({
  id: z.string().min(1),
  path: visibilityPathSchema,
  artifact_sha256: z.string().regex(/^[a-f0-9]{64}$/),
  evidence_sha256: z.string().regex(/^[a-f0-9]{64}$/),
  earliest_expires_at: z.string().datetime({ offset: true }),
  state: z.literal("LIVE"),
}).strict();

const projectionSchema = z.object({
  schema_version: z.literal("VisibilityBuildProjectionV1"),
  source_commit_sha: z.string().regex(/^[a-f0-9]{40}$/),
  pages: z.array(projectionEntrySchema),
}).strict();

export type PublishedVisibilityPage = {
  page: VisibilityPageV1;
  evidence: VisibilityEvidencePackV1;
  summary: VisibilityPublicationSummary;
};

function parseJson(file: string): unknown {
  return JSON.parse(readFileSync(file, "utf8"));
}

function resolveSafeJson(directory: string, relative: string): string {
  const target = path.resolve(directory, relative);
  const resolvedRelative = path.relative(directory, target);
  if (resolvedRelative.startsWith("..") || path.isAbsolute(resolvedRelative)) {
    throw new Error(`Unsafe visibility artifact path "${relative}".`);
  }
  return target;
}

function earliestExpiry(evidence: VisibilityEvidencePackV1, claimIds: string[]): string {
  const wanted = new Set(claimIds);
  const expiry = evidence.claims
    .filter((claim) => wanted.has(claim.id))
    .map((claim) => claim.expires_at)
    .sort()[0];
  if (!expiry) throw new Error(`No expiry found for visible claims on "${evidence.page_id}".`);
  return expiry;
}

export function loadPublishedVisibilityPagesFromDirectories(
  generatedDirectory: string,
  projectionPath: string,
): PublishedVisibilityPage[] {
  const manifestPath = path.join(generatedDirectory, "index.json");
  if (!existsSync(manifestPath) || !existsSync(projectionPath)) return [];

  const manifest = manifestSchema.parse(parseJson(manifestPath));
  const projection = projectionSchema.parse(parseJson(projectionPath));
  const projections = new Map(projection.pages.map((entry) => [entry.path, entry]));
  const seen = new Set<string>();
  const published: PublishedVisibilityPage[] = [];

  for (const entry of manifest.pages) {
    if (seen.has(entry.path)) throw new Error(`Duplicate visibility path "${entry.path}".`);
    seen.add(entry.path);
    const authority = projections.get(entry.path);
    if (!authority || authority.id !== entry.id) continue;
    if (authority.artifact_sha256 !== entry.artifact_sha256 || authority.evidence_sha256 !== entry.evidence_sha256) {
      throw new Error(`Neon projection hash mismatch for "${entry.path}".`);
    }

    const artifactPath = resolveSafeJson(generatedDirectory, entry.artifact);
    const evidencePath = resolveSafeJson(generatedDirectory, entry.evidence);
    const artifactBytes = readFileSync(artifactPath);
    const evidenceBytes = readFileSync(evidencePath);
    if (sha256(artifactBytes) !== entry.artifact_sha256 || sha256(evidenceBytes) !== entry.evidence_sha256) {
      throw new Error(`Artifact fingerprint mismatch for "${entry.path}".`);
    }
    const page = visibilityPageSchema.parse(JSON.parse(artifactBytes.toString("utf8")));
    const evidence = visibilityEvidencePackSchema.parse(JSON.parse(evidenceBytes.toString("utf8")));
    if (page.id !== entry.id || page.path !== entry.path || evidence.page_id !== page.id) {
      throw new Error(`Visibility identity mismatch for "${entry.path}".`);
    }
    const expiry = earliestExpiry(evidence, page.claim_ids);
    if (expiry !== authority.earliest_expires_at) {
      throw new Error(`Neon projection expiry mismatch for "${entry.path}".`);
    }
    published.push({
      page,
      evidence,
      summary: {
        id: page.id,
        path: page.path,
        kind: page.kind,
        title: page.title,
        description: page.description,
        modifiedAt: page.modified_at,
        earliestExpiresAt: expiry,
        relevantReviewPath: page.relevant_review_path,
        relatedPaths: page.related_paths,
      },
    });
  }
  return published;
}

const generatedDirectory = path.resolve(process.cwd(), "src/generated/visibility-pages");
const projectionPath = path.resolve(process.cwd(), ".stage2/visibility-publications.json");

let catalogue: PublishedVisibilityPage[] = [];
try {
  catalogue = loadPublishedVisibilityPagesFromDirectories(generatedDirectory, projectionPath);
} catch {
  // Visibility artifacts fail closed without touching the direct-review catalogue.
  catalogue = [];
}

export function listPublishedVisibilityPageSummaries(): VisibilityPublicationSummary[] {
  return catalogue.map((page) => page.summary);
}

export function getPublishedVisibilityPage(pathname: string): PublishedVisibilityPage | null {
  if (!visibilityPathSchema.safeParse(pathname).success) return null;
  return catalogue.find((entry) => entry.page.path === pathname) ?? null;
}

export function listPublishedVisibilityPaths(): VisibilityPath[] {
  return catalogue.map((entry) => entry.page.path);
}
