import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import sharp from "sharp";

import { articleHeroPaths } from "../src/lib/article-heroes";
import { loadArticleHero } from "../src/lib/article-heroes";
import { articleHeroHandoff, bindGeneratedArticleHero, validateArticleHeroBinding } from "../src/lib/article-import/hero-image";
import { sha256 } from "../src/lib/article-import/execution-evidence";
import { canonicalSubmissionFingerprint, createArticleImport, loadImport, recordImportRepair, saveImport, withImportLease } from "../src/lib/article-import/engine";
import { isAllowedReleasePath, requiredImportReleaseFiles, validateBoundArticleHeroReleasePaths } from "../src/lib/article-import/release";
import { samplePageBlueprint } from "./fixtures/sample-page-blueprint";

async function fixture() {
  const parent = path.join(process.cwd(), ".scratch");
  await mkdir(parent, { recursive: true });
  return mkdtemp(path.join(parent, "article-hero-"));
}

test("article hero paths preserve the blog release root and isolate all other formats", () => {
  assert.equal(articleHeroPaths("blog", "buyer-guide").assetFile, "public/blog/images/buyer-guide-hero.webp");
  assert.equal(articleHeroPaths("direct-review", "acme-review").assetFile, "public/images/direct-review-acme-review-hero.webp");
  assert.equal(articleHeroPaths("visibility", "guides/buyer-guide").assetFile, "public/images/visibility-guides--buyer-guide-hero.webp");
  assert.equal(articleHeroPaths("decision-set", "email-platforms").assetFile, "public/images/decision-set-email-platforms-hero.webp");
  assert.equal(isAllowedReleasePath("src/generated/article-heroes/blog/buyer-guide.json", "blog"), true);
  assert.equal(isAllowedReleasePath("public/blog/images/buyer-guide-hero.webp", "blog"), true);
  assert.equal(isAllowedReleasePath("public/images/blog-buyer-guide-hero.webp", "blog"), false);
  const expected = ["src/generated/article-heroes/blog/buyer-guide.json", "public/blog/images/buyer-guide-hero.webp"];
  assert.deepEqual(validateBoundArticleHeroReleasePaths(expected, expected), []);
  assert.deepEqual(validateBoundArticleHeroReleasePaths([...expected, "src/generated/article-heroes/blog/other-article.json"], expected), ["src/generated/article-heroes/blog/other-article.json"]);
});

test("release requirements use the canonical direct-review projection and exact bound hero files", () => {
  assert.deepEqual(requiredImportReleaseFiles({
    format: "direct-review",
    approvedArtifactPath: "build-pack/editorial/article/example.json",
    slug: "acme-review",
    includeHero: true,
  }), {
    artifact: "src/generated/landing-pages/acme-review.json",
    authorities: ["src/generated/landing-pages/index.json"],
    hero: ["public/images/direct-review-acme-review-hero.webp", "src/generated/article-heroes/direct-review/acme-review.json"],
    all: [
      "public/images/direct-review-acme-review-hero.webp",
      "src/generated/article-heroes/direct-review/acme-review.json",
      "src/generated/landing-pages/acme-review.json",
      "src/generated/landing-pages/index.json",
    ],
  });
});

test("sidecar loading observes generation and regeneration under one artifact fingerprint", async () => {
  const root = await fixture();
  try {
    const fingerprint = "a".repeat(64);
    const paths = articleHeroPaths("blog", "buyer-guide");
    let current: unknown | null = null;
    const lookup = () => current;
    assert.equal(loadArticleHero("blog", "buyer-guide", fingerprint, lookup), null);
    const publication = (sha256: string, alt: string) => ({ schemaVersion: "ArticleHeroPublicationV1", format: "blog", slug: "buyer-guide", artifactFingerprint: "d".repeat(64), rendererFingerprint: fingerprint,
      asset: { filePath: paths.assetFile, publicPath: paths.publicPath, sha256, width: 1600, height: 900, alt } });
    current = publication("b".repeat(64), "First generated decision workspace illustration");
    assert.equal(loadArticleHero("blog", "buyer-guide", fingerprint, lookup)?.asset.sha256, "b".repeat(64));
    current = publication("c".repeat(64), "Regenerated decision workspace illustration");
    assert.equal(loadArticleHero("blog", "buyer-guide", fingerprint, lookup)?.asset.sha256, "c".repeat(64));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("ImageGen PNG provenance is retained while exact derived WebP bytes are independently bound", async () => {
  const root = await fixture();
  try {
    const record = {
      importId: "article-00000000-0000-4000-8000-000000000001",
      sourceFingerprint: "1".repeat(64),
      format: "direct-review" as const,
      contentApproval: { artifactFingerprint: "2".repeat(64) },
    };
    const artifact = { ...samplePageBlueprint, metadata: { ...samplePageBlueprint.metadata, url_slug: "acme-review" } };
    const handoff = articleHeroHandoff(root, record, { slug: "acme-review" }, artifact, 0);
    assert.equal(handoff.artifactFingerprint, record.contentApproval.artifactFingerprint, "approval and generation retain the raw approved fingerprint");
    assert.notEqual(handoff.rendererFingerprint, handoff.artifactFingerprint, "renderer identity is a separate schema-canonical projection");
    const png = await sharp({ create: { width: 1600, height: 900, channels: 3, background: "#d9c7a8" } }).png().toBuffer();
    await mkdir(path.dirname(path.join(root, handoff.originalFile)), { recursive: true });
    await writeFile(path.join(root, handoff.originalFile), png);
    const generationPath = "build-pack/article-import/article-00000000-0000-4000-8000-000000000001/hero-generation-0.json";
    const providerOutputPath = "build-pack/article-import/article-00000000-0000-4000-8000-000000000001/hero-provider-output-0.json";
    const providerOutput = { schemaVersion: "ArticleHeroProviderOutputV1", provider: "openai", tool: "chatgpt-imagegen", interface: "built-in",
      toolCallId: "imagegen-call-1", generatedAt: "2026-11-26T12:00:00.000Z",
      generatedImage: { providerAssetPath: "generated_images/imagegen-call-1.png", originalSha256: sha256(png), outputHint: "Generated image returned by built-in ImageGen." } };
    await writeFile(path.join(root, providerOutputPath), `${JSON.stringify(providerOutput)}\n`);
    const evidence = {
      schemaVersion: "ArticleHeroGenerationEvidenceV1", importId: record.importId, sourceFingerprint: record.sourceFingerprint,
      format: record.format, slug: "acme-review", artifactFingerprint: record.contentApproval.artifactFingerprint,
      originalRef: { path: handoff.originalFile, sha256: sha256(png) }, alt: handoff.alt,
      generation: { provider: "openai", tool: "chatgpt-imagegen", interface: "built-in", toolCallId: "imagegen-call-1",
        generatedAt: "2026-11-26T12:00:00.000Z", prompt: handoff.prompt, promptSha256: handoff.promptSha256, outputSha256: sha256(png),
        providerOutputRef: { path: providerOutputPath, sha256: sha256(await readFile(path.join(root, providerOutputPath))) } },
    };
    await mkdir(path.dirname(path.join(root, generationPath)), { recursive: true });
    await writeFile(path.join(root, generationPath), `${JSON.stringify(evidence)}\n`);

    const { binding } = await bindGeneratedArticleHero(root, handoff, generationPath);
    const publication = JSON.parse(await readFile(path.join(root, handoff.publicationFile), "utf8"));
    assert.equal(publication.artifactFingerprint, record.contentApproval.artifactFingerprint);
    assert.equal(publication.rendererFingerprint, handoff.rendererFingerprint);
    assert.equal(binding.generationRef.sha256, sha256(await readFile(path.join(root, generationPath))));
    assert.equal(binding.assetRef.sha256, binding.inspectionRef.sha256);
    assert.notEqual(binding.assetRef.sha256, evidence.originalRef.sha256);
    assert.notEqual(binding.assetRef.path, binding.inspectionRef.path);
    await validateArticleHeroBinding(root, binding, { format: record.format, slug: "acme-review", artifactFingerprint: record.contentApproval.artifactFingerprint });
    const replay = await bindGeneratedArticleHero(root, handoff, generationPath);
    assert.deepEqual(replay.binding, binding, "same-generation resume is idempotent");
    const nextHandoff = articleHeroHandoff(root, record, { slug: "acme-review" }, artifact, 1);
    assert.notEqual(nextHandoff.handoffFingerprint, handoff.handoffFingerprint);
    await assert.rejects(bindGeneratedArticleHero(root, nextHandoff, generationPath), /ARTICLE_HERO_GENERATION_BINDING_MISMATCH/);

    await writeFile(path.join(root, binding.assetRef.path), Buffer.from("not the reviewed image"));
    await assert.rejects(
      validateArticleHeroBinding(root, binding, { format: record.format, slug: "acme-review", artifactFingerprint: record.contentApproval.artifactFingerprint }),
      /EVIDENCE_HASH_MISMATCH/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("failed visual inspection preserves the rejected generation and opens a fresh generation", async () => {
  const root = await fixture();
  try {
    await mkdir(path.join(root, "Article Intake"), { recursive: true });
    await writeFile(path.join(root, "approved-urls.md"), "");
    await writeFile(path.join(root, "Article Intake/article.md"), "# Synthetic article\n\nA supervised workflow fixture.");
    const created = await createArticleImport(root, "Article Intake/article.md");
    const ref = (name: string) => ({ path: `build-pack/article-import/${created.importId}/${name}.json`, sha256: name[0].repeat(64) });
    const heroImage = {
      schemaVersion: "ArticleHeroBindingV1" as const, format: "blog" as const, slug: "synthetic-article", artifactFingerprint: "a".repeat(64),
      assetRef: { path: "public/blog/images/synthetic-article-hero.webp", sha256: "b".repeat(64) },
      inspectionRef: ref("c-inspection"), publicationRef: ref("d-publication"), generationRef: ref("e-generation"),
    };
    const staged = { ...created, stage: "VALIDATING" as const, format: "blog" as const, heroImage, evidenceRefs: { hero: ref("f-hero") } };
    await withImportLease(root, created.importId, () => saveImport(root, staged));
    const current = await loadImport(root, created.importId);
    const before = await canonicalSubmissionFingerprint(current, root);
    const repaired = await recordImportRepair(root, current, { strategy: "validate", message: "ARTICLE_HERO_VISUAL_INSPECTION_FAILED" });
    assert.equal(repaired.heroImage, undefined);
    assert.equal(repaired.evidenceRefs?.hero, undefined);
    assert.equal(repaired.strategyAttempts["hero-generation"], 1);
    assert.equal(repaired.continuation?.kind, "repair");
    assert.equal(repaired.continuation?.kind === "repair" && repaired.continuation.submittedFingerprint, before);
    assert.notEqual(await canonicalSubmissionFingerprint(repaired, root), before, "resume observes a changed submission without editing history");
    assert.match(repaired.nextAction, /rejected hero remains preserved/);
    assert.match(repaired.nextAction, new RegExp(heroImage.assetRef.sha256));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
