import { blogPostSchema } from "../blog/contracts";
import { auditBlogPost } from "../blog/quality";
import { decisionSetV2Schema } from "../decision-journey/sets";
import { pageBlueprintSchema } from "../schemas/contracts";
import { visibilityPageSchema } from "../visibility-pages/contracts";
import type { ImportFormat } from "./contracts";
import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { fingerprintEditorialArtifact } from "../editorial/refinement";

export const importFormatQualityGates = { "direct-review": "landing:quality:candidate", blog: "blog:audit-post", visibility: "visibility:page-schema", "decision-set": "decision-set:v2-schema" } as const;

export function importArtifactTarget(format: ImportFormat, artifact: unknown) {
  const renderedRoutes = validateImportArtifact(format, artifact);
  const value = artifact as { slug?: string; metadata?: { url_slug: string } };
  const slug = format === "direct-review" ? value.metadata!.url_slug : format === "visibility" ? renderedRoutes[0].slice(1) : value.slug!;
  return { format, slug, artifactFingerprint: fingerprintEditorialArtifact(artifact), renderedRoutes };
}

export async function readImportArtifactTarget(root: string, format: ImportFormat, artifactPath: string, requestedSlug?: string) {
  const repository = await realpath(root);
  const absolute = await realpath(path.resolve(repository, artifactPath));
  const relative = path.relative(repository, absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("ARTIFACT_PATH_MISMATCH");
  const artifact = JSON.parse(await readFile(absolute, "utf8"));
  const target = importArtifactTarget(format, artifact);
  if (requestedSlug !== undefined && requestedSlug !== target.slug) throw new Error("ARTIFACT_SLUG_MISMATCH");
  return { artifact, target };
}

/** Content rules remain owned by each publishing format. */
export function validateImportArtifact(format: ImportFormat, artifact: unknown): string[] {
  switch (format) {
    case "direct-review": {
      const canonical = pageBlueprintSchema.parse(artifact).metadata.canonical_url;
      if (!canonical) throw new Error("DIRECT_REVIEW_CANONICAL_REQUIRED");
      return [new URL(canonical).pathname];
    }
    case "blog": {
      const post = blogPostSchema.parse(artifact);
      const failures = auditBlogPost(post);
      if (failures.length) throw new Error(failures.join("; "));
      return [post.canonicalPath];
    }
    case "visibility": return [visibilityPageSchema.parse(artifact).path];
    case "decision-set": return Object.values(decisionSetV2Schema.parse(artifact).pages).map((page) => page.canonicalPath);
    default: throw new Error(`MISSING_FORMAT_VALIDATOR:${format}`);
  }
}
