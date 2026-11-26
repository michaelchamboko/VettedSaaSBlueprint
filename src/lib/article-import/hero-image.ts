import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

import sharp from "sharp";
import { z } from "zod";

import { articleHeroFormatSchema, articleHeroPaths, articleHeroPublicationSchema, fingerprintArticleHeroRendererArtifact, type ArticleHeroFormat } from "../article-heroes";
import { fingerprintEditorialArtifact } from "../editorial/refinement";
import { evidenceRefSchema, hashSchema, readEvidence, readVerifiedEvidenceBytes, sha256, storeEvidence, storeEvidenceBytes, verifyEvidenceRef, type EvidenceRef } from "./execution-evidence";
import { writeJsonAtomically } from "./engine";

const safeSlugSchema = z.string().min(1).refine((value) => value.split("/").every((segment) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(segment)));
const generationSchema = z.object({
  provider: z.literal("openai"),
  tool: z.literal("chatgpt-imagegen"),
  interface: z.literal("built-in"),
  toolCallId: z.string().trim().min(1),
  generatedAt: z.string().datetime({ offset: true }),
  prompt: z.string().trim().min(80),
  promptSha256: hashSchema,
  outputSha256: hashSchema,
  providerOutputRef: evidenceRefSchema,
}).strict();

export const articleHeroProviderOutputSchema = z.object({
  schemaVersion: z.literal("ArticleHeroProviderOutputV1"),
  provider: z.literal("openai"),
  tool: z.literal("chatgpt-imagegen"),
  interface: z.literal("built-in"),
  toolCallId: z.string().trim().min(1),
  generatedAt: z.string().datetime({ offset: true }),
  generatedImage: z.object({
    providerAssetPath: z.string().trim().min(1),
    originalSha256: hashSchema,
    outputHint: z.string().trim().min(1).optional(),
  }).strict(),
}).strict();

export const articleHeroGenerationEvidenceSchema = z.object({
  schemaVersion: z.literal("ArticleHeroGenerationEvidenceV1"),
  importId: z.string().regex(/^article-[0-9a-f-]{36}$/),
  sourceFingerprint: hashSchema,
  format: articleHeroFormatSchema,
  slug: safeSlugSchema,
  artifactFingerprint: hashSchema,
  originalRef: evidenceRefSchema,
  alt: z.string().trim().min(20).max(180),
  generation: generationSchema,
}).strict();

export const articleHeroBindingSchema = z.object({
  schemaVersion: z.literal("ArticleHeroBindingV1"),
  format: articleHeroFormatSchema,
  slug: safeSlugSchema,
  artifactFingerprint: hashSchema,
  assetRef: evidenceRefSchema,
  inspectionRef: evidenceRefSchema,
  publicationRef: evidenceRefSchema,
  generationRef: evidenceRefSchema,
}).strict();
export type ArticleHeroBinding = z.infer<typeof articleHeroBindingSchema>;

function articleTitle(format: ArticleHeroFormat, artifact: unknown): string {
  const value = artifact as Record<string, unknown>;
  if (format === "blog" || format === "decision-set") return z.string().parse(value.title);
  const hero = z.object({ headline: z.string() }).passthrough().parse(value.hero);
  return hero.headline;
}

export function articleHeroPrompt(format: ArticleHeroFormat, slug: string, artifact: unknown): string {
  const title = articleTitle(format, artifact);
  return [
    "Create one VettedSaaSBlueprint editorial hero image for a software buyer decision page.",
    `Format: ${format}. Article: ${title}. Route key: ${slug}.`,
    "Use the established warm editorial palette, restrained texture, evidence-led composition, and a clear decision-workspace motif.",
    "Hard rule: no people, faces, silhouettes, hands, limbs, or human body parts anywhere in the image.",
    "Do not render readable words, logos, product interfaces, watermarks, neon AI symbolism, or claims of real product use.",
    "Landscape composition, 16:9-safe central subject, suitable for a responsive web hero. Output one image.",
  ].join(" ");
}

export function articleHeroAlt(format: ArticleHeroFormat, artifact: unknown): string {
  const value = `Editorial decision-workspace illustration for ${articleTitle(format, artifact)}`;
  return value.length <= 180 ? value : `${value.slice(0, 177).trimEnd()}...`;
}

export function articleHeroHandoff(root: string, record: {
  importId: string; sourceFingerprint: string; format: ArticleHeroFormat;
  contentApproval: { artifactFingerprint: string };
}, target: { slug: string }, artifact: unknown, generation = 0) {
  const paths = articleHeroPaths(record.format, target.slug);
  const prompt = articleHeroPrompt(record.format, target.slug, artifact);
  const rendererFingerprint = fingerprintArticleHeroRendererArtifact(record.format, artifact);
  const handoff = {
    schemaVersion: "ArticleHeroImagegenHandoffV1" as const,
    provider: "openai" as const,
    tool: "chatgpt-imagegen" as const,
    interface: "built-in" as const,
    paidFallbackAllowed: false as const,
    importId: record.importId,
    sourceFingerprint: record.sourceFingerprint,
    format: record.format,
    slug: target.slug,
    artifactFingerprint: record.contentApproval.artifactFingerprint,
    rendererFingerprint,
    prompt,
    promptSha256: sha256(prompt),
    alt: articleHeroAlt(record.format, artifact),
    originalFile: `build-pack/article-import/${record.importId}/hero-imagegen-original-${generation}.png`,
    assetFile: paths.assetFile,
    publicPath: paths.publicPath,
    publicationFile: paths.publicationFile,
    evidenceInstruction: ".agents/skills/external-article-import/references/hero-imagegen.md",
    repositoryRoot: path.resolve(root),
  };
  return { ...handoff, handoffFingerprint: sha256(JSON.stringify({
    schemaVersion: handoff.schemaVersion, importId: handoff.importId, sourceFingerprint: handoff.sourceFingerprint,
    format: handoff.format, slug: handoff.slug, artifactFingerprint: handoff.artifactFingerprint,
    promptSha256: handoff.promptSha256, originalFile: handoff.originalFile, assetFile: handoff.assetFile,
    publicationFile: handoff.publicationFile, paidFallbackAllowed: handoff.paidFallbackAllowed,
  })) };
}

export async function bindGeneratedArticleHero(root: string, handoff: ReturnType<typeof articleHeroHandoff>, generationPath: string): Promise<{ binding: ArticleHeroBinding; evidenceRef: EvidenceRef }> {
  const generationRef = { path: generationPath, sha256: sha256(await readVerifiedPath(root, generationPath)) };
  const evidence = articleHeroGenerationEvidenceSchema.parse(await readEvidence(root, generationRef));
  const providerOutput = articleHeroProviderOutputSchema.parse(await readEvidence(root, evidence.generation.providerOutputRef));
  if (evidence.importId !== handoff.importId || evidence.sourceFingerprint !== handoff.sourceFingerprint || evidence.format !== handoff.format || evidence.slug !== handoff.slug ||
      evidence.artifactFingerprint !== handoff.artifactFingerprint || evidence.alt !== handoff.alt || evidence.originalRef.path !== handoff.originalFile ||
      evidence.generation.prompt !== handoff.prompt || evidence.generation.promptSha256 !== handoff.promptSha256) {
    throw new Error("ARTICLE_HERO_GENERATION_BINDING_MISMATCH");
  }
  if (evidence.generation.outputSha256 !== evidence.originalRef.sha256) throw new Error("ARTICLE_HERO_GENERATION_OUTPUT_MISMATCH");
  if (providerOutput.toolCallId !== evidence.generation.toolCallId || providerOutput.generatedAt !== evidence.generation.generatedAt ||
      providerOutput.generatedImage.originalSha256 !== evidence.originalRef.sha256) throw new Error("ARTICLE_HERO_PROVIDER_OUTPUT_MISMATCH");
  await verifyEvidenceRef(root, evidence.generation.providerOutputRef);
  const originalBytes = await readVerifiedEvidenceBytes(root, evidence.originalRef);
  const originalMetadata = await sharp(originalBytes).metadata();
  if (originalMetadata.format !== "png" || !originalMetadata.width || !originalMetadata.height || originalMetadata.width < 1200 || originalMetadata.height < 630 || originalMetadata.pages && originalMetadata.pages !== 1) {
    throw new Error("ARTICLE_HERO_IMAGE_INVALID");
  }
  const ratio = originalMetadata.width / originalMetadata.height;
  if (ratio < 1.4 || ratio > 2) throw new Error("ARTICLE_HERO_ASPECT_RATIO_INVALID");
  const webpBytes = await sharp(originalBytes).rotate().webp({ quality: 88, effort: 6, smartSubsample: true }).toBuffer();
  const assetPath = path.resolve(root, handoff.assetFile);
  await mkdir(path.dirname(assetPath), { recursive: true });
  await writeFile(assetPath, webpBytes);
  const assetRef = { path: handoff.assetFile, sha256: sha256(webpBytes) };
  const inspectionRef = await storeEvidenceBytes(root, handoff.importId, webpBytes, "webp");
  const metadata = await sharp(webpBytes).metadata();
  if (metadata.format !== "webp" || !metadata.width || !metadata.height) throw new Error("ARTICLE_HERO_DERIVATIVE_INVALID");
  const publication = articleHeroPublicationSchema.parse({
    schemaVersion: "ArticleHeroPublicationV1", format: evidence.format, slug: evidence.slug,
    artifactFingerprint: evidence.artifactFingerprint,
    rendererFingerprint: handoff.rendererFingerprint,
    asset: { filePath: assetRef.path, publicPath: handoff.publicPath, sha256: assetRef.sha256,
      width: metadata.width, height: metadata.height, alt: evidence.alt },
  });
  const publicationPath = path.resolve(root, handoff.publicationFile);
  await mkdir(path.dirname(publicationPath), { recursive: true });
  await writeJsonAtomically(publicationPath, publication);
  const publicationRef = { path: handoff.publicationFile, sha256: sha256(await readVerifiedPath(root, handoff.publicationFile)) };
  const binding = articleHeroBindingSchema.parse({ schemaVersion: "ArticleHeroBindingV1", format: evidence.format, slug: evidence.slug,
    artifactFingerprint: evidence.artifactFingerprint, assetRef, inspectionRef, publicationRef, generationRef });
  const evidenceRef = await storeEvidence(root, handoff.importId, binding);
  return { binding, evidenceRef };
}

async function readVerifiedPath(root: string, file: string): Promise<Buffer> {
  const ref = { path: file, sha256: "0".repeat(64) };
  const bytes = await import("./execution-evidence").then(({ readEvidenceBytes }) => readEvidenceBytes(root, file));
  ref.sha256 = sha256(bytes);
  await verifyEvidenceRef(root, ref);
  return bytes;
}

export async function validateArticleHeroBinding(root: string, bindingInput: unknown, expected: { format: ArticleHeroFormat; slug: string; artifactFingerprint: string }): Promise<ArticleHeroBinding> {
  const binding = articleHeroBindingSchema.parse(bindingInput);
  if (binding.format !== expected.format || binding.slug !== expected.slug || binding.artifactFingerprint !== expected.artifactFingerprint) throw new Error("ARTICLE_HERO_BINDING_MISMATCH");
  const generation = articleHeroGenerationEvidenceSchema.parse(await readEvidence(root, binding.generationRef));
  const publication = articleHeroPublicationSchema.parse(await readEvidence(root, binding.publicationRef));
  const providerOutput = articleHeroProviderOutputSchema.parse(await readEvidence(root, generation.generation.providerOutputRef));
  for (const ref of [binding.assetRef, binding.inspectionRef, binding.publicationRef, binding.generationRef, generation.originalRef, generation.generation.providerOutputRef]) await verifyEvidenceRef(root, ref);
  if (generation.generation.outputSha256 !== generation.originalRef.sha256 || generation.artifactFingerprint !== binding.artifactFingerprint ||
      providerOutput.toolCallId !== generation.generation.toolCallId || providerOutput.generatedImage.originalSha256 !== generation.originalRef.sha256 ||
      binding.inspectionRef.sha256 !== binding.assetRef.sha256 || publication.asset.filePath !== binding.assetRef.path || publication.asset.sha256 !== binding.assetRef.sha256 || publication.artifactFingerprint !== binding.artifactFingerprint) {
    throw new Error("ARTICLE_HERO_BYTES_BINDING_MISMATCH");
  }
  return binding;
}

export function assertArticleHeroArtifact(binding: ArticleHeroBinding, artifact: unknown): void {
  if (binding.artifactFingerprint !== fingerprintEditorialArtifact(artifact)) throw new Error("ARTICLE_HERO_ARTIFACT_MISMATCH");
}
