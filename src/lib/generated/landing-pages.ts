import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

import { pageBlueprintSchema, type PageBlueprint } from "@/lib/schemas/contracts";

const pageSlugSchema = z.string().regex(/^[a-z0-9-]+$/);
const manifestPageSchema = z.object({
  slug: pageSlugSchema,
  title: z.string().min(1),
  artifact: z.string().min(1),
  path: z.string().regex(/^\/landing-page-builders\/[a-z0-9-]+$/),
  status: z.literal("published"),
  publication_source: z.literal("oracle_dynamic_pages"),
  published_at: z.string().datetime(),
  current_version_id: z.string().min(1),
  owner_publish_audit_id: z.string().min(1),
});
const landingPageManifestSchema = z.object({
  generated_at: z.string().optional(),
  pages: z.array(manifestPageSchema),
});

type ManifestPage = z.infer<typeof manifestPageSchema>;
export type PublicReviewSummary = {
  slug: string;
  path: string;
  title: string;
  description: string;
  categorySlug: string;
  decisionCue: string;
  limitationCue: string;
  publishedAt: string;
};

type Catalogue = { manifest: ManifestPage[]; blueprints: Map<string, PageBlueprint>; summaries: PublicReviewSummary[] };
const generatedLandingPagesDirectory = path.resolve(process.cwd(), "src/generated/landing-pages");

function parseJsonFile<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function resolveArtifactPath(directory: string, artifactNameOrPath: string) {
  const safeName = artifactNameOrPath.trim();
  const candidate = path.resolve(directory, safeName.endsWith(".json") ? safeName : `${safeName}.json`);
  const relative = path.relative(directory, candidate);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`Unsafe artifact path "${safeName}"`);
  return candidate;
}

function loadCatalogue(directory: string): Catalogue {
  const manifestPath = path.join(directory, "index.json");
  if (!existsSync(manifestPath)) return { manifest: [], blueprints: new Map(), summaries: [] };
  const manifest = landingPageManifestSchema.parse(parseJsonFile(manifestPath)).pages;
  const blueprints = new Map<string, PageBlueprint>();
  const summaries: PublicReviewSummary[] = [];

  for (const entry of manifest) {
    const artifactPath = resolveArtifactPath(directory, entry.artifact);
    if (!existsSync(artifactPath)) throw new Error(`Missing generated landing artifact "${entry.artifact}".`);
    const blueprint = pageBlueprintSchema.parse(parseJsonFile<unknown>(artifactPath));
    if (blueprint.metadata.url_slug !== entry.slug || entry.path !== `/landing-page-builders/${entry.slug}`) {
      throw new Error(`Manifest and artifact identity mismatch for "${entry.slug}".`);
    }
    blueprints.set(entry.slug, blueprint);
    summaries.push({
      slug: entry.slug,
      path: entry.path,
      title: blueprint.metadata.title_tag,
      description: blueprint.metadata.meta_description,
      categorySlug: blueprint.metadata.category_slug,
      decisionCue: blueprint.hero.subheadline,
      limitationCue: blueprint.limitations[0].limitation,
      publishedAt: entry.published_at,
    });
  }
  return { manifest, blueprints, summaries };
}

export function loadPublishedLandingPageSummariesFromDirectory(directory: string): PublicReviewSummary[] {
  return loadCatalogue(path.resolve(directory)).summaries;
}

let catalogue: Catalogue;
try {
  catalogue = loadCatalogue(generatedLandingPagesDirectory);
} catch {
  // Candidate or legacy artifacts never become public without complete Oracle publication provenance.
  catalogue = { manifest: [], blueprints: new Map(), summaries: [] };
}

export function listPublishedLandingPageSlugs() { return [...catalogue.blueprints.keys()]; }
export function listPublishedLandingPageParams(): Array<{ slug: string }> { return listPublishedLandingPageSlugs().map((slug) => ({ slug })); }
export function getPublishedLandingPage(slug: string): PageBlueprint | null {
  if (!pageSlugSchema.safeParse(slug).success) return null;
  return catalogue.blueprints.get(slug) ?? null;
}
export function getLandingPageManifest(): ManifestPage[] { return [...catalogue.manifest]; }
export function listPublishedLandingPageSummaries(): PublicReviewSummary[] { return [...catalogue.summaries]; }
