import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";

import sharp from "sharp";
import { z } from "zod";

import { articleHeroFormatSchema, articleHeroPaths, articleHeroPublicationSchema, fingerprintArticleHeroRendererArtifact, type ArticleHeroFormat } from "../article-heroes";
import { fingerprintEditorialArtifact } from "../editorial/refinement";
import { evidenceRefSchema, hashSchema, readEvidence, readEvidenceBytes, readVerifiedEvidenceBytes, sha256, storeEvidence, storeEvidenceBytes, verifyEvidenceRef, type EvidenceRef } from "./execution-evidence";
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

export const articleHeroVisualInspectionSchema = z.object({
  schemaVersion: z.literal("ArticleHeroVisualInspectionV1"),
  artifactFingerprint: hashSchema,
  assetSha256: hashSchema,
  verdict: z.enum(["pass", "fail", "insufficient-evidence"]),
  checks: z.object({
    noPeople: z.object({ verdict: z.enum(["pass", "fail", "insufficient-evidence"]), observations: z.array(z.string().trim().min(8)).min(1) }).strict(),
    brandFit: z.object({ verdict: z.enum(["pass", "fail", "insufficient-evidence"]), observations: z.array(z.string().trim().min(8)).min(1) }).strict(),
  }).strict(),
  findings: z.array(z.object({ description: z.string().trim().min(1), disposition: z.enum(["resolved", "unresolved"]) }).strict()),
}).strict();

const articleHeroRejectionSchema = z.object({
  schemaVersion: z.literal("ArticleHeroVisualRejectionV1"),
  importId: z.string().regex(/^article-[0-9a-f-]{36}$/),
  sourceFingerprint: hashSchema,
  idempotencyKey: hashSchema,
  heroEvidenceRef: evidenceRefSchema,
  binding: articleHeroBindingSchema,
  reviewerExecutionRef: evidenceRefSchema,
  judgment: articleHeroVisualInspectionSchema,
}).strict();
const articleHeroRejectionPointerSchema = z.object({
  schemaVersion: z.literal("ArticleHeroVisualRejectionPointerV1"),
  decisionRef: evidenceRefSchema,
}).strict();

function articleHeroRejectionPointerPath(importId: string, idempotencyKey: string, assetSha256: string): string {
  return `.automation/article-imports/evidence/${importId}/hero-visual-rejection-${idempotencyKey}-${assetSha256}.json`;
}

export function isArticleHeroVisualRejection(judgment: z.infer<typeof articleHeroVisualInspectionSchema>): boolean {
  return judgment.verdict !== "pass" || judgment.checks.noPeople.verdict !== "pass" || judgment.checks.brandFit.verdict !== "pass" ||
    judgment.findings.some((finding) => finding.disposition !== "resolved");
}

export async function persistArticleHeroRejection(root: string, input: {
  importId: string; sourceFingerprint: string; idempotencyKey: string; heroEvidenceRef: EvidenceRef;
  binding: ArticleHeroBinding; reviewerExecutionRef: EvidenceRef; judgment: z.infer<typeof articleHeroVisualInspectionSchema>;
}): Promise<EvidenceRef> {
  const decision = articleHeroRejectionSchema.parse({ schemaVersion: "ArticleHeroVisualRejectionV1", ...input });
  if (!isArticleHeroVisualRejection(decision.judgment) || decision.judgment.artifactFingerprint !== decision.binding.artifactFingerprint ||
      decision.judgment.assetSha256 !== decision.binding.assetRef.sha256) throw new Error("ARTICLE_HERO_REJECTION_BINDING_MISMATCH");
  for (const ref of [decision.heroEvidenceRef, decision.reviewerExecutionRef]) await verifyEvidenceRef(root, ref);
  if (!isDeepStrictEqual(articleHeroBindingSchema.parse(await readEvidence(root, decision.heroEvidenceRef)), decision.binding)) {
    throw new Error("ARTICLE_HERO_REJECTION_BINDING_MISMATCH");
  }
  const decisionRef = await storeEvidence(root, decision.importId, decision);
  const pointerPath = articleHeroRejectionPointerPath(decision.importId, decision.idempotencyKey, decision.binding.assetRef.sha256);
  await mkdir(path.dirname(path.join(root, pointerPath)), { recursive: true });
  await writeJsonAtomically(path.join(root, pointerPath), { schemaVersion: "ArticleHeroVisualRejectionPointerV1", decisionRef });
  return decisionRef;
}

export async function readCurrentArticleHeroRejection(root: string, input: {
  importId: string; sourceFingerprint: string; idempotencyKey: string; heroEvidenceRef: EvidenceRef; binding: ArticleHeroBinding;
}): Promise<(z.infer<typeof articleHeroRejectionSchema> & { decisionRef: EvidenceRef }) | undefined> {
  const pointerPath = articleHeroRejectionPointerPath(input.importId, input.idempotencyKey, input.binding.assetRef.sha256);
  let pointer: z.infer<typeof articleHeroRejectionPointerSchema>;
  try {
    pointer = articleHeroRejectionPointerSchema.parse(JSON.parse((await readEvidenceBytes(root, pointerPath)).toString("utf8")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
  const decision = articleHeroRejectionSchema.parse(await readEvidence(root, pointer.decisionRef));
  if (decision.importId !== input.importId || decision.sourceFingerprint !== input.sourceFingerprint || decision.idempotencyKey !== input.idempotencyKey ||
      !isDeepStrictEqual(decision.heroEvidenceRef, input.heroEvidenceRef) || !isDeepStrictEqual(decision.binding, input.binding) ||
      !isArticleHeroVisualRejection(decision.judgment) || decision.judgment.artifactFingerprint !== input.binding.artifactFingerprint ||
      decision.judgment.assetSha256 !== input.binding.assetRef.sha256) throw new Error("ARTICLE_HERO_REJECTION_BINDING_MISMATCH");
  for (const ref of [pointer.decisionRef, decision.heroEvidenceRef, decision.reviewerExecutionRef]) await verifyEvidenceRef(root, ref);
  if (!isDeepStrictEqual(articleHeroBindingSchema.parse(await readEvidence(root, decision.heroEvidenceRef)), input.binding)) {
    throw new Error("ARTICLE_HERO_REJECTION_BINDING_MISMATCH");
  }
  return { ...decision, decisionRef: pointer.decisionRef };
}

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
