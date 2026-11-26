import { z } from "zod";
import { readFileSync } from "node:fs";
import path from "node:path";

export const articleHeroFormatSchema = z.enum(["direct-review", "blog", "visibility", "decision-set"]);
export type ArticleHeroFormat = z.infer<typeof articleHeroFormatSchema>;

const hashSchema = z.string().regex(/^[a-f0-9]{64}$/);
const safeSlugSchema = z.string().min(1).refine((value) =>
  value.split("/").every((segment) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(segment)),
"Hero slug must contain only safe route segments.");

export const articleHeroPublicationSchema = z.object({
  schemaVersion: z.literal("ArticleHeroPublicationV1"),
  format: articleHeroFormatSchema,
  slug: safeSlugSchema,
  artifactFingerprint: hashSchema,
  asset: z.object({
    filePath: z.string().regex(/^public\/(?:blog\/images|images)\/[a-z0-9-]+\.webp$/),
    publicPath: z.string().regex(/^\/(?:blog\/images|images)\/[a-z0-9-]+\.webp$/),
    sha256: hashSchema,
    width: z.number().int().min(1200),
    height: z.number().int().min(630),
    alt: z.string().trim().min(20).max(180),
  }).strict(),
}).strict();
export type ArticleHeroPublication = z.infer<typeof articleHeroPublicationSchema>;
export type ArticleHeroLookup = (format: ArticleHeroFormat, key: string) => unknown | null;

export function articleHeroKey(slug: string): string {
  return safeSlugSchema.parse(slug).split("/").join("--");
}

export function articleHeroPaths(format: ArticleHeroFormat, slug: string) {
  const key = articleHeroKey(slug);
  const fileName = `${format}-${key}-hero.webp`;
  const blog = format === "blog";
  return {
    assetFile: blog ? `public/blog/images/${key}-hero.webp` : `public/images/${fileName}`,
    publicPath: blog ? `/blog/images/${key}-hero.webp` : `/images/${fileName}`,
    publicationFile: `src/generated/article-heroes/${format}/${key}.json`,
  } as const;
}

function publishedSidecarLookup(format: ArticleHeroFormat, key: string): unknown | null {
  // Keep this prefix literal and narrow so Next traces only published hero
  // sidecars, never the repository root or .automation state.
  const file = path.join(process.cwd(), "src/generated/article-heroes", format, `${key}.json`);
  try { return JSON.parse(readFileSync(file, "utf8")); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export function loadArticleHero(
  formatInput: ArticleHeroFormat,
  slug: string,
  artifactFingerprint: string,
  lookup: ArticleHeroLookup = publishedSidecarLookup,
): ArticleHeroPublication | null {
  const format = articleHeroFormatSchema.parse(formatInput);
  const expected = articleHeroPaths(format, slug);
  const value = lookup(format, articleHeroKey(slug));
  if (value === null) return null;
  const publication = articleHeroPublicationSchema.parse(value);
  if (publication.format !== format || publication.slug !== slug) throw new Error("ARTICLE_HERO_PATH_MISMATCH");
  if (publication.artifactFingerprint !== artifactFingerprint) {
    throw new Error("ARTICLE_HERO_ARTIFACT_MISMATCH");
  }
  if (publication.asset.filePath !== expected.assetFile || publication.asset.publicPath !== expected.publicPath) {
    throw new Error("ARTICLE_HERO_PATH_MISMATCH");
  }
  // Full asset-byte verification belongs to supervised validation and release,
  // never a latency-sensitive public render path.
  return publication;
}
