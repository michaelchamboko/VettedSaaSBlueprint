import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import sharp from "sharp";

import { articleHeroPaths } from "../src/lib/article-heroes";
import { loadArticleHero } from "../src/lib/article-heroes";
import { articleHeroHandoff, bindGeneratedArticleHero, persistArticleHeroRejection, readCurrentArticleHeroRejection, validateArticleHeroBinding } from "../src/lib/article-import/hero-image";
import { sha256, storeEvidence } from "../src/lib/article-import/execution-evidence";
import { canonicalSubmissionFingerprint, createArticleImport, loadImport, recordImportRepair, saveImport, withImportLease } from "../src/lib/article-import/engine";
import { createDispatchingExecutor } from "../src/lib/article-import/dispatch";
import { createSupervisedImportExecutor } from "../src/lib/article-import/supervised-executor";
import { EDITORIAL_REVISION, fingerprintEditorialArtifact } from "../src/lib/editorial/refinement";
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

test("an exact rejection error without a verified decision cannot clear the current hero", async () => {
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
    assert.deepEqual(repaired.heroImage, heroImage);
    assert.deepEqual(repaired.evidenceRefs?.hero, staged.evidenceRefs.hero);
    assert.equal(repaired.strategyAttempts["hero-generation"], undefined);
    assert.equal(repaired.continuation?.kind, "repair");
    assert.equal(repaired.continuation?.kind === "repair" && repaired.continuation.submittedFingerprint, before);
    assert.equal(await canonicalSubmissionFingerprint(repaired, root), before);
    assert.doesNotMatch(repaired.nextAction, /rejected hero remains preserved/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a bound rejection crosses the worker boundary once, opens generation one, and stale replay cannot clear its replacement", async () => {
  const root = await fixture();
  try {
    await mkdir(path.join(root, "Article Intake"), { recursive: true });
    await writeFile(path.join(root, "approved-urls.md"), "");
    await writeFile(path.join(root, "Article Intake/article.md"), "# Synthetic article\n\nA supervised workflow fixture.");
    const created = await createArticleImport(root, "Article Intake/article.md");
    const artifactPath = `build-pack/article-import/${created.importId}/artifact.json`;
    const artifact = { ...samplePageBlueprint, metadata: { ...samplePageBlueprint.metadata, url_slug: "synthetic-review",
      canonical_url: "https://vettedsaasblueprint.online/synthetic-review" } };
    await mkdir(path.dirname(path.join(root, artifactPath)), { recursive: true });
    await writeFile(path.join(root, artifactPath), JSON.stringify(artifact));
    const artifactFingerprint = fingerprintEditorialArtifact(artifact);
    const ref = async (name: string) => storeEvidence(root, created.importId, { name });
    const binding = {
      schemaVersion: "ArticleHeroBindingV1" as const, format: "direct-review" as const, slug: "synthetic-review", artifactFingerprint,
      assetRef: await ref("asset-0"), inspectionRef: await ref("inspection-0"), publicationRef: await ref("publication-0"), generationRef: await ref("generation-0"),
    };
    const heroEvidenceRef = await storeEvidence(root, created.importId, binding);
    const staged = {
      ...created, stage: "VALIDATING" as const, format: "direct-review" as const, heroImage: binding, evidenceRefs: { hero: heroEvidenceRef },
      contentApproval: { schemaVersion: "ImportContentApprovalV1" as const, artifactPath, format: "direct-review" as const,
        schemaRevision: "PageBlueprintV1", artifactFingerprint, sourceFingerprint: created.sourceFingerprint,
        editorialRevision: EDITORIAL_REVISION, editorialEvidencePath: "build-pack/editorial/synthetic.json",
        editorialEvidenceFingerprint: "a".repeat(64), formatQualityPath: "build-pack/article-import/quality.json",
        formatQualityFingerprint: "b".repeat(64), approvedAt: new Date().toISOString() },
    };
    await withImportLease(root, created.importId, () => saveImport(root, staged));
    const reviewerExecutionRef = await storeEvidence(root, created.importId, { schemaVersion: "ExecutionEvidenceV1", result: "negative" });
    let packetKey = "";
    const executor = async (context: Parameters<ReturnType<typeof createSupervisedImportExecutor>>[0]) => {
      packetKey = context.idempotencyKey;
      const directory = `.automation/article-imports/work/${created.importId}`;
      const workPath = `${directory}/${context.idempotencyKey}.work.json`;
      const resultPath = `${directory}/${context.idempotencyKey}.result.json`;
      await mkdir(path.dirname(path.join(root, workPath)), { recursive: true });
      await writeFile(path.join(root, workPath), JSON.stringify({ importId: created.importId, stage: context.stage,
        idempotencyKey: context.idempotencyKey, sourceFingerprint: created.sourceFingerprint, resultPath, record: context.record }));
      return { ...context.record, continuation: { kind: "work" as const, stage: context.stage, workPath, resultPath,
        idempotencyKey: context.idempotencyKey, sourceFingerprint: created.sourceFingerprint } };
    };
    const workerRunner = async ({ args }: { args: string[] }) => {
      const packet = JSON.parse(await readFile(args[args.indexOf("--file") + 1], "utf8"));
      const judgment = { schemaVersion: "ArticleHeroVisualInspectionV1" as const, artifactFingerprint, assetSha256: binding.assetRef.sha256,
        verdict: "pass" as const, checks: { noPeople: { verdict: "fail" as const, observations: ["A visible hand appears in the image."] },
          brandFit: { verdict: "pass" as const, observations: ["The palette matches the editorial system."] } },
        findings: [{ description: "Human body part is present.", disposition: "unresolved" as const }] };
      await persistArticleHeroRejection(root, { importId: created.importId, sourceFingerprint: created.sourceFingerprint,
        idempotencyKey: packet.idempotencyKey, heroEvidenceRef, binding, reviewerExecutionRef, judgment });
      const result = { idempotencyKey: packet.idempotencyKey, sourceFingerprint: packet.sourceFingerprint, summary: "Worker masked the tool rejection.",
        work: { stage: "VALIDATING", validationGate: "masked", validationReceiptPath: "masked.json", presentationEvidencePath: "masked-evidence.json" } };
      const events = [{ type: "step_start", sessionID: "s", part: {} }, { type: "text", sessionID: "s", part: { text: JSON.stringify(result) } },
        { type: "step_finish", sessionID: "s", part: { reason: "stop" } }];
      return { stdout: events.map((event) => JSON.stringify(event)).join("\n"), stderr: "", exitCode: 0, timedOut: false };
    };
    const boundary = createDispatchingExecutor(root, executor, { workerModel: "fixture/model", workerRunner });
    const repaired = await withImportLease(root, created.importId, (record) => boundary({ record, stage: "VALIDATING", strategy: "validate", attempt: 1,
      idempotencyKey: "9".repeat(64), leaseToken: "00000000-0000-4000-8000-000000000009", assertLease: async () => {} }));
    assert.equal(repaired.heroImage, undefined);
    assert.equal(repaired.strategyAttempts["hero-generation"], 1);

    // Simulate a controller exit after both the negative receipt and the masked
    // worker result were persisted, but before the rejection was consumed.
    const resetAttempts = { ...repaired.strategyAttempts };
    delete resetAttempts["hero-generation"];
    const replayable = { ...repaired, heroImage: binding, evidenceRefs: { ...repaired.evidenceRefs, hero: heroEvidenceRef },
      strategyAttempts: resetAttempts, continuation: undefined, nextAction: "Resume validation after controller restart." };
    await withImportLease(root, created.importId, () => saveImport(root, replayable));
    let cachedResultConsumed = false;
    const restartedBoundary = createDispatchingExecutor(root, async () => {
      cachedResultConsumed = true;
      throw new Error("cached worker result must not bypass the rejection receipt");
    }, { workerModel: "fixture/model", workerRunner });
    const recovered = await withImportLease(root, created.importId, (record) => restartedBoundary({ record, stage: "VALIDATING", strategy: "validate", attempt: 1,
      idempotencyKey: packetKey, leaseToken: "00000000-0000-4000-8000-000000000009", assertLease: async () => {} }));
    assert.equal(cachedResultConsumed, false);
    assert.equal(recovered.heroImage, undefined);
    assert.equal(recovered.strategyAttempts["hero-generation"], 1);

    const supervised = createSupervisedImportExecutor(root);
    const next = await supervised({ record: recovered, stage: "VALIDATING", strategy: "validate", attempt: 1, idempotencyKey: packetKey,
      leaseToken: "fixture", assertLease: async () => {} });
    assert.equal(next.continuation?.kind, "work");
    if (next.continuation?.kind !== "work") throw new Error("Missing next hero handoff");
    assert.match(next.continuation.workPath, /hero-image-1\.work\.json$/);
    const handoff = JSON.parse(await readFile(path.join(root, next.continuation.workPath), "utf8"));
    assert.match(handoff.originalFile, /hero-imagegen-original-1\.png$/);

    const replacement = { ...binding, assetRef: await ref("asset-1"), inspectionRef: await ref("inspection-1"), generationRef: await ref("generation-1") };
    const replacementRef = await storeEvidence(root, created.importId, replacement);
    assert.equal(await readCurrentArticleHeroRejection(root, { importId: created.importId, sourceFingerprint: created.sourceFingerprint,
      idempotencyKey: packetKey, heroEvidenceRef: replacementRef, binding: replacement }), undefined);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("worker error text cannot clear a hero without a verified rejection decision", async () => {
  const root = await fixture();
  try {
    await mkdir(path.join(root, "Article Intake"), { recursive: true });
    await writeFile(path.join(root, "approved-urls.md"), "");
    await writeFile(path.join(root, "Article Intake/article.md"), "# Synthetic article\n\nA supervised workflow fixture.");
    const created = await createArticleImport(root, "Article Intake/article.md");
    const ref = (name: string) => ({ path: `build-pack/article-import/${created.importId}/${name}.json`, sha256: name[0].repeat(64) });
    const heroImage = { schemaVersion: "ArticleHeroBindingV1" as const, format: "blog" as const, slug: "synthetic-article", artifactFingerprint: "a".repeat(64),
      assetRef: ref("b-asset"), inspectionRef: ref("c-inspection"), publicationRef: ref("d-publication"), generationRef: ref("e-generation") };
    const staged = { ...created, stage: "VALIDATING" as const, format: "blog" as const, heroImage, evidenceRefs: { hero: ref("f-hero") } };
    await withImportLease(root, created.importId, () => saveImport(root, staged));
    const repaired = await recordImportRepair(root, await loadImport(root, created.importId),
      { strategy: "validate", message: "CAPABILITY_UNAVAILABLE: ARTICLE_HERO_VISUAL_INSPECTION_FAILED [worker masked]" });
    assert.deepEqual(repaired.heroImage, heroImage);
    assert.equal(repaired.strategyAttempts["hero-generation"], undefined);
  } finally { await rm(root, { recursive: true, force: true }); }
});
