import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { pageBlueprintSchema } from "@/lib/schemas/contracts";
import { sql } from "@/lib/db";

export type PublishedLandingArtifactIndexEntry = {
  slug: string;
  title: string;
  artifact: string;
  path: string;
  status: "published";
  publication_source: "generated_pages";
  published_at: string;
  current_version_id: string;
  owner_publish_audit_id: string;
};

export type PublishedLandingArtifactsPayload = {
  generated_at: string;
  index: {
    pages: PublishedLandingArtifactIndexEntry[];
  };
  artifacts: Record<string, unknown>;
};

export type WrittenLandingArtifactsResult = {
  outputDirectory: string;
  manifestPath: string;
  pageCount: number;
  writtenAt: string;
};

type PublishedLandingArtifactRow = Record<string, unknown>;

function normalizeArtifactName(slug: string) {
  return `${slug}.json`;
}

function validateSafeArtifactFileName(fileName: string) {
  const safe = path.basename(fileName);
  if (safe !== fileName || safe.includes("..") || safe.includes("/") || safe.includes("\\")) {
    throw new Error(`Unsafe artifact file name "${fileName}".`);
  }
  return safe;
}

function getPublishedArtifactFromPayload(payload: PublishedLandingArtifactsPayload, slug: string) {
  const key = normalizeArtifactName(slug);
  const artifact = payload.artifacts[slug] ?? payload.artifacts[key] ?? payload.artifacts[path.basename(key, ".json")];
  if (!artifact) return null;
  return pageBlueprintSchema.parse(artifact);
}

function getRowValue(row: PublishedLandingArtifactRow, key: string) {
  return row[key] ?? row[key.toUpperCase()];
}

function parseStructuralJson(value: unknown) {
  if (typeof value === "string") return JSON.parse(value);
  return value;
}

function requiredString(row: PublishedLandingArtifactRow, key: string) {
  const value = getRowValue(row, key);
  if (value instanceof Date) return value.toISOString();
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function buildPublishedLandingArtifactsPayload(
  rows: PublishedLandingArtifactRow[],
  generatedAt = new Date().toISOString(),
): PublishedLandingArtifactsPayload {
  const indexEntries: PublishedLandingArtifactIndexEntry[] = [];
  const artifacts: Record<string, unknown> = {};

  for (const row of rows) {
    const publishedAt = requiredString(row, "published_at");
    const currentVersionId = requiredString(row, "current_version_id");
    const auditCurrentVersionId = requiredString(row, "audit_current_version_id");
    const ownerPublishAuditId = requiredString(row, "owner_publish_audit_id");
    if (!publishedAt || !currentVersionId || !ownerPublishAuditId || auditCurrentVersionId !== currentVersionId) continue;
    const parsed = pageBlueprintSchema.parse(parseStructuralJson(getRowValue(row, "structural_json")));
    const slug = parsed.metadata.url_slug;
    const artifactName = normalizeArtifactName(slug);

    const title = parsed.metadata.target_keyword;
    const rowPath = getRowValue(row, "path");
    const pagePath = typeof rowPath === "string" && rowPath.length > 0 ? rowPath : `/landing-page-builders/${slug}`;

    indexEntries.push({
      slug,
      title,
      artifact: artifactName,
      path: pagePath,
      status: "published",
      publication_source: "generated_pages",
      published_at: publishedAt,
      current_version_id: currentVersionId,
      owner_publish_audit_id: ownerPublishAuditId,
    });
    artifacts[slug] = parsed;
  }

  return {
    generated_at: generatedAt,
    index: {
      pages: indexEntries,
    },
    artifacts,
  };
}

export async function fetchPublishedLandingArtifactsFromDb(): Promise<PublishedLandingArtifactsPayload> {
  const { rows } = await sql`
    select dp.path,
           dp.published_at,
           dp.current_version_id,
           pb.id as blueprint_id,
           pv.structural_copy as structural_json,
           json_value(al.after_state, '$.current_version_id') as audit_current_version_id,
           al.id as owner_publish_audit_id
    from dynamic_pages dp
    join page_blueprints pb on pb.id = dp.blueprint_id and pb.status = 'approved'
    join page_versions pv on pv.id = dp.current_version_id
                         and pv.blueprint_id = pb.id
                         and pv.published_at = dp.published_at
    join (
      select id, entity_id, after_state,
             row_number() over (
               partition by entity_id, json_value(after_state, '$.current_version_id')
               order by created_at desc, id desc
             ) as audit_rank
      from audit_log
      where action = 'publish_page'
    ) al on al.entity_id = dp.id
        and al.audit_rank = 1
        and json_value(al.after_state, '$.page_id') = dp.id
        and json_value(al.after_state, '$.blueprint_id') = pb.id
        and json_value(al.after_state, '$.current_version_id') = dp.current_version_id
    where dp.status = 'published'
    order by dp.updated_at desc
  `;

  return buildPublishedLandingArtifactsPayload(rows);
}

export async function writeLandingArtifactsToDirectory(
  payload: PublishedLandingArtifactsPayload,
  outputDirectory: string,
): Promise<WrittenLandingArtifactsResult> {
  const normalizedOutputDir = path.resolve(outputDirectory);
  await mkdir(normalizedOutputDir, { recursive: true });

  const pages = payload.index.pages.filter((entry) => entry.status === "published");
  const writtenAt = new Date().toISOString();

  for (const page of pages) {
    const artifactName = validateSafeArtifactFileName(page.artifact);
    const blueprint = getPublishedArtifactFromPayload(payload, page.slug);
    if (!blueprint) {
      throw new Error(`Missing blueprint for artifact "${artifactName}" (slug "${page.slug}").`);
    }

    const targetPath = path.join(normalizedOutputDir, artifactName);
    await writeFile(targetPath, JSON.stringify(blueprint, null, 2), "utf8");
  }

  const manifestPath = path.join(normalizedOutputDir, "index.json");
  await writeFile(
    manifestPath,
    JSON.stringify({
      generated_at: writtenAt,
      pages: pages.map((entry) => ({
        slug: entry.slug,
        title: entry.title,
        artifact: path.basename(entry.artifact),
        path: entry.path,
        status: entry.status,
        publication_source: entry.publication_source,
        published_at: entry.published_at,
        current_version_id: entry.current_version_id,
        owner_publish_audit_id: entry.owner_publish_audit_id,
      })),
    }),
    "utf8",
  );

  return {
    outputDirectory: normalizedOutputDir,
    manifestPath,
    pageCount: pages.length,
    writtenAt,
  };
}
