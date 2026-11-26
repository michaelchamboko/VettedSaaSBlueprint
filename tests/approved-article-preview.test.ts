import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fingerprintEditorialArtifact } from "../src/lib/editorial/refinement";
import { countVisibleArticleWords } from "../src/lib/editorial/article-visible-word-count";
import { validateApprovedArticlePreview, isValidSlug, isDevEnvironment } from "../src/lib/article-import/approved-article-preview";
import { loadApprovedArtifact } from "../src/lib/article-import/content-approval";

const VALID_SLUG = "test-approved-article";
const VALID_IMPORT_ID = "article-12345678-1234-4234-8234-123456789abc";
const SOURCE_FP = "a".repeat(64);
const APPROVED_AFFILIATE_URL = "https://start.switcherstudio.com/anme6fqvgdx9";
const LONG_FORM_COPY = Array.from(
  { length: 130 },
  (_, index) => `Review section ${index + 1} compares the documented workflow with the buyer's requirements before choosing this service.`,
).join(" ");

function makeBlueprint(slug: string, overrides: Record<string, unknown> = {}) {
  return {
    metadata: { product_id: "12345678-1234-4234-8234-123456789abc", page_type: "direct_review", target_keyword: "test", search_intent: "test", category_slug: "test", url_slug: slug, title_tag: "t", meta_description: "d", canonical_url: "https://vettedsaasblueprint.online/landing-page-builders/test-approved-article", design_profile: "reference_composed_v1" },
    presentation: {"hero":"media_first_offset","typography":"dm_serif_instrument_sans","section_order":["problem_solution","benefits","proof_blocks","how_it_works","limitations","objection_handling","faq","closing_cta"],"section_variants":{"problem_solution":"closing_manifesto","benefits":"alternating_story","proof_blocks":"decision_matrix","how_it_works":"split_editorial","limitations":"proof_strip","objection_handling":"process_timeline","faq":"objection_accordion","closing_cta":"numbered_ledger"},"cta":"inline_decision","motion":"split_reveal","mobile":"copy_first","design_dials":{"design_variance":7,"motion_intensity":6,"visual_density":4},"reference_ids":["lp-ref-0002","lp-ref-0029"],"recipe_id":"recipe-af7e9c8af1c28ec6","fingerprint":"af7e9c8af1c28ec607e2b99703ed7db69c74059aa77542ba2ef4275b3e1ce3d3"},
    affiliate_disclosure: { short_disclosure: "s", full_disclosure: "f", placement: "above_first_cta" },
    hero: { headline: "h", subheadline: "sh", primary_cta_label: "cta", primary_cta_link_id: "12345678-1234-4234-8234-123456789abc", answer_snippet: LONG_FORM_COPY },
    problem_solution: { problem: "p", agitation: "a", solution: "s" },
    benefits: [{ benefit_title: "b", benefit_description: "d", feature_supporting_it: "f", source_reference_ids: [] }],
    limitations: [{ limitation: "l", who_it_affects: "w", mitigation: "m" }],
    cta_blocks: [{ placement: "hero", label: "cta", supporting_text: "s", affiliate_link_id: "12345678-1234-4234-8234-123456789abc" }],
    schema_markup: { faq_schema: {}, breadcrumb_schema: {} },
    quality_scores: { evidence_score: 1, originality_score: 1, conversion_score: 1, compliance_score: 1, readability_score: 1, seo_safety_score: 1, overall_score: 1 },
    ...overrides,
  };
}

async function makeFixture(root: string, opts: {
  stage?: string;
  slug?: string;
  importId?: string;
  blueprint?: unknown;
  artifactContent?: string;
  workPacket?: Record<string, unknown> | null;
  contentApproval?: Record<string, unknown> | null;
  approvedUrls?: string;
} = {}) {
  const slug = opts.slug ?? VALID_SLUG;
  const importId = opts.importId ?? VALID_IMPORT_ID;
  const bp = opts.blueprint ?? makeBlueprint(slug);
  const artifactContent = opts.artifactContent ?? JSON.stringify(bp);
  const fingerprint = fingerprintEditorialArtifact(JSON.parse(artifactContent));
  const { wordCount } = countVisibleArticleWords("direct-review", JSON.parse(artifactContent));

  const workDir = join(root, ".automation", "article-imports", "work", importId);
  await mkdir(workDir, { recursive: true });

  const workPath = `.automation/article-imports/work/${importId}/work.json`;
  const workPacket = opts.workPacket === null ? null : (opts.workPacket ?? {
    schemaVersion: "ImportSupervisedWorkV1",
    importId,
    sourceFingerprint: SOURCE_FP,
    stage: "VALIDATING",
    idempotencyKey: "k".repeat(64),
    record: {
      importId,
      sourceFingerprint: SOURCE_FP,
      stage: "VALIDATING",
      contentApproval: {
        artifactPath: `.automation/article-imports/work/${importId}/approved.json`,
        artifactFingerprint: fingerprint,
        sourceFingerprint: SOURCE_FP,
        editorialEvidencePath: `.automation/article-imports/work/${importId}/editorial-evidence.json`,
        formatQualityPath: `.automation/article-imports/work/${importId}/quality-receipt.json`,
      },
    },
  });
  if (workPacket) {
    await writeFile(join(root, workPath), JSON.stringify(workPacket));
  }

  const contentApproval = opts.contentApproval === null ? undefined : (opts.contentApproval ?? {
    schemaVersion: "ImportContentApprovalV1",
    artifactPath: `.automation/article-imports/work/${importId}/approved.json`,
    format: "direct-review",
    schemaRevision: "PageBlueprintV1",
    artifactFingerprint: fingerprint,
    sourceFingerprint: SOURCE_FP,
    editorialRevision: "slopmonster-full-rewrite-v2:8bf609edfaeed844f1d03bb6b69f80dc21728c8b",
    editorialEvidencePath: `.automation/article-imports/work/${importId}/editorial-evidence.json`,
    editorialEvidenceFingerprint: "0".repeat(64),
    formatQualityPath: `.automation/article-imports/work/${importId}/quality-receipt.json`,
    formatQualityFingerprint: "0".repeat(64),
    longFormAffiliate: { wordCount, approvedAffiliateUrl: APPROVED_AFFILIATE_URL },
    approvedAt: new Date().toISOString(),
  });

  const importRecord: Record<string, unknown> = {
    importId,
    stage: opts.stage ?? "VALIDATING",
    sourceFingerprint: SOURCE_FP,
    contentApproval,
    artifactPath: `src/generated/landing-pages/${slug}.json`,
    continuation: workPacket ? { workPath } : undefined,
    format: "direct-review",
    transformation: { commercialMode: "approved", resolvedAffiliateUrl: APPROVED_AFFILIATE_URL },
  };
  const importDir = join(root, ".automation", "article-imports");
  await mkdir(importDir, { recursive: true });
  await writeFile(join(importDir, `${importId}.json`), JSON.stringify(importRecord));

  // Write approved private artifact
  await writeFile(join(workDir, "approved.json"), artifactContent);

  // Write public projection (same content by default)
  const pubDir = join(root, "src", "generated", "landing-pages");
  await mkdir(pubDir, { recursive: true });
  await writeFile(join(pubDir, `${slug}.json`), artifactContent);

  // Write editorial evidence (valid V2, matching artifact prose paths)
  const { editorialProsePaths } = await import("../src/lib/editorial/refinement");
  let eligiblePaths: string[] = [];
  try { eligiblePaths = editorialProsePaths("landing", JSON.parse(artifactContent)); } catch { eligiblePaths = []; }
  const editorialEvidence = {
    schemaVersion: "EditorialEvidenceV2",
    format: "landing",
    revision: "slopmonster-full-rewrite-v2:8bf609edfaeed844f1d03bb6b69f80dc21728c8b",
    beforeFingerprint: "0".repeat(64),
    afterFingerprint: fingerprint,
    eligibleProsePaths: eligiblePaths.length > 0 ? eligiblePaths : ["hero.headline"],
    changedPaths: eligiblePaths.length > 0 ? eligiblePaths : ["hero.headline"],
    checker: { before: "before", after: "score 5/5 CLEAN" },
    semanticNotes: "This is a test editorial evidence with sufficient length for validation.",
    exceptions: ["No exceptions for this test fixture."],
    meaningPreserved: true,
    arrayOrderPreserved: true,
    rewriteMode: "full_article",
    writerModelFamily: "beam",
    cleanseModelFamily: "other",
    passes: { purposeAndStructure: true, meaningAndEvidence: true, wordingAndRhythm: true, rivalFamilyCleanse: true, finalFidelityReview: true },
  };
  await writeFile(join(workDir, "editorial-evidence.json"), JSON.stringify(editorialEvidence));

  // Write format quality receipt
  const qualityReceipt = {
    format: "direct-review",
    artifactFingerprint: fingerprint,
    passed: true,
    gate: "landing:quality:candidate",
  };
  await writeFile(join(workDir, "quality-receipt.json"), JSON.stringify(qualityReceipt));

  // Compute fingerprints of evidence files
  const { fingerprintEditorialArtifact: fpa } = await import("../src/lib/editorial/refinement");
  const editorialBytes = await (await import("node:fs/promises")).readFile(join(workDir, "editorial-evidence.json"), "utf8");
  const editorialFp = fpa(JSON.parse(editorialBytes));
  const qualityBytes = await (await import("node:fs/promises")).readFile(join(workDir, "quality-receipt.json"), "utf8");
  const qualityFp = fpa(JSON.parse(qualityBytes));

  // Update contentApproval with evidence paths and fingerprints
  const record2 = JSON.parse(await (await import("node:fs/promises")).readFile(join(importDir, `${importId}.json`), "utf8"));
  if (record2.contentApproval) {
    record2.contentApproval.editorialEvidencePath = `.automation/article-imports/work/${importId}/editorial-evidence.json`;
    record2.contentApproval.formatQualityPath = `.automation/article-imports/work/${importId}/quality-receipt.json`;
    record2.contentApproval.editorialEvidenceFingerprint = editorialFp;
    record2.contentApproval.formatQualityFingerprint = qualityFp;
    await (await import("node:fs/promises")).writeFile(join(importDir, `${importId}.json`), JSON.stringify(record2));
  }

  // Update work packet contentApproval similarly
  const wp2 = join(root, ".automation", "article-imports", "work", importId, "work.json");
  const wpData2 = JSON.parse(await (await import("node:fs/promises")).readFile(wp2, "utf8"));
  if (wpData2.record?.contentApproval) {
    wpData2.record.contentApproval.editorialEvidencePath = `.automation/article-imports/work/${importId}/editorial-evidence.json`;
    wpData2.record.contentApproval.formatQualityPath = `.automation/article-imports/work/${importId}/quality-receipt.json`;
    wpData2.record.contentApproval.editorialEvidenceFingerprint = editorialFp;
    wpData2.record.contentApproval.formatQualityFingerprint = qualityFp;
    await (await import("node:fs/promises")).writeFile(wp2, JSON.stringify(wpData2));
  }

  // Write approved-urls.md
  const urls = opts.approvedUrls ?? `- ${APPROVED_AFFILIATE_URL}\n`;
  await writeFile(join(root, "approved-urls.md"), urls);

  return { root, slug, importId, fingerprint, bp };
}

describe("isValidSlug", () => {
  it("accepts valid slugs", () => {
    assert.equal(isValidSlug("hello-world"), true);
    assert.equal(isValidSlug("abc123"), true);
  });
  it("rejects traversal and special chars", () => {
    assert.equal(isValidSlug("../etc"), false);
    assert.equal(isValidSlug("a/b"), false);
    assert.equal(isValidSlug(""), false);
    assert.equal(isValidSlug("UPPER"), false);
  });
});

describe("isDevEnvironment", () => {
  it("returns based on NODE_ENV", () => {
    const orig = process.env.NODE_ENV;
    if (orig === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = orig;
    // test development
    process.env.NODE_ENV = "development";
    assert.equal(isDevEnvironment(), true);
    process.env.NODE_ENV = "production";
    assert.equal(isDevEnvironment(), false);
    // restore
    if (orig === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = orig;
  });
});

describe("validateApprovedArticlePreview", () => {
  let origNodeEnv: string | undefined;
  afterEach(() => {
    if (origNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = origNodeEnv;
  });

  it("returns NOT_FOUND in production", async () => {
    origNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    const root = await mkdtemp(join(tmpdir(), "preview-"));
    const r = await validateApprovedArticlePreview("test", VALID_IMPORT_ID, root);
    assert.equal(r.ok, false);
    assert.equal(r.error, "NOT_FOUND");
    await rm(root, { recursive: true, force: true });
  });

  it("validates approved binding in development", async () => {
    origNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    const root = await mkdtemp(join(tmpdir(), "preview-"));
    const fx = await makeFixture(root);
    const r = await validateApprovedArticlePreview(fx.slug, fx.importId, root);
    assert.equal(r.ok, true, `expected ok but got ${r.error}`);
    assert.ok(r.blueprint);
    await rm(root, { recursive: true, force: true });
  });

  it("rejects bad hash (fingerprint mismatch)", async () => {
    origNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    const root = await mkdtemp(join(tmpdir(), "preview-"));
    const bp = makeBlueprint(VALID_SLUG);
    const wrongFp = "0".repeat(64);
    const fx = await makeFixture(root, { blueprint: bp });
    // tamper both record and work-packet semantic fingerprints to the same wrong value
    const importPath = join(root, ".automation", "article-imports", `${fx.importId}.json`);
    const record = JSON.parse(await (await import("node:fs/promises")).readFile(importPath, "utf8"));
    record.contentApproval.artifactFingerprint = wrongFp;
    await (await import("node:fs/promises")).writeFile(importPath, JSON.stringify(record));
    const wp = join(root, ".automation", "article-imports", "work", fx.importId, "work.json");
    const wpData = JSON.parse(await (await import("node:fs/promises")).readFile(wp, "utf8"));
    wpData.record.contentApproval.artifactFingerprint = wrongFp;
    await (await import("node:fs/promises")).writeFile(wp, JSON.stringify(wpData));
    const r = await validateApprovedArticlePreview(fx.slug, fx.importId, root);
    assert.equal(r.ok, false);
    assert.equal(r.error, "ARTIFACT_FINGERPRINT_MISMATCH");
    await rm(root, { recursive: true, force: true });
  });

  it("rejects bad slug (traversal)", async () => {
    origNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    const root = await mkdtemp(join(tmpdir(), "preview-"));
    const fx = await makeFixture(root);
    const r = await validateApprovedArticlePreview("../etc", fx.importId, root);
    assert.equal(r.ok, false);
    assert.equal(r.error, "INVALID_SLUG");
    await rm(root, { recursive: true, force: true });
  });

  it("rejects wrong stage", async () => {
    origNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    const root = await mkdtemp(join(tmpdir(), "preview-"));
    const fx = await makeFixture(root, { stage: "RESEARCHING" });
    const r = await validateApprovedArticlePreview(fx.slug, fx.importId, root);
    assert.equal(r.ok, false);
    assert.equal(r.error, "INVALID_STAGE");
    await rm(root, { recursive: true, force: true });
  });

  it("rejects bad schema (invalid blueprint, valid fingerprint)", async () => {
    origNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    const root = await mkdtemp(join(tmpdir(), "preview-"));
    const bp = makeBlueprint(VALID_SLUG);
    const fx = await makeFixture(root, { blueprint: bp });
    // tamper approved artifact to invalid schema, recompute fingerprint, bind it
    const invalidBytes = '{"not_a_blueprint": true}';
    const invalidFp = fingerprintEditorialArtifact(JSON.parse(invalidBytes));
    const workDir = join(root, ".automation", "article-imports", "work", fx.importId);
    await (await import("node:fs/promises")).writeFile(join(workDir, "approved.json"), invalidBytes);
    const importPath = join(root, ".automation", "article-imports", `${fx.importId}.json`);
    const record = JSON.parse(await (await import("node:fs/promises")).readFile(importPath, "utf8"));
    record.contentApproval.artifactFingerprint = invalidFp;
    await (await import("node:fs/promises")).writeFile(importPath, JSON.stringify(record));
    const wp = join(root, ".automation", "article-imports", "work", fx.importId, "work.json");
    const wpData = JSON.parse(await (await import("node:fs/promises")).readFile(wp, "utf8"));
    wpData.record.contentApproval.artifactFingerprint = invalidFp;
    await (await import("node:fs/promises")).writeFile(wp, JSON.stringify(wpData));
    const r = await validateApprovedArticlePreview(fx.slug, fx.importId, root);
    assert.equal(r.ok, false);
    assert.equal(r.error, "INVALID_BLUEPRINT_SCHEMA");
    await rm(root, { recursive: true, force: true });
  });

  it("rejects missing import record", async () => {
    origNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    const root = await mkdtemp(join(tmpdir(), "preview-"));
    const r = await validateApprovedArticlePreview("test-slug", "article-00000000-0000-4000-8000-000000000000", root);
    assert.equal(r.ok, false);
    assert.equal(r.error, "IMPORT_NOT_FOUND");
    await rm(root, { recursive: true, force: true });
  });

  it("rejects missing content approval", async () => {
    origNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    const root = await mkdtemp(join(tmpdir(), "preview-"));
    const fx = await makeFixture(root, { contentApproval: null });
    const r = await validateApprovedArticlePreview(fx.slug, fx.importId, root);
    assert.equal(r.ok, false);
    assert.equal(r.error, "NO_CONTENT_APPROVAL");
    await rm(root, { recursive: true, force: true });
  });

  it("rejects slug mismatch with blueprint", async () => {
    origNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    const root = await mkdtemp(join(tmpdir(), "preview-"));
    const bp = makeBlueprint("different-slug");
    const fx = await makeFixture(root, { blueprint: bp, slug: VALID_SLUG });
    const r = await validateApprovedArticlePreview(VALID_SLUG, fx.importId, root);
    assert.equal(r.ok, false);
    assert.equal(r.error, "SLUG_MISMATCH");
    await rm(root, { recursive: true, force: true });
  });

  it("rejects work packet mismatch (wrong importId)", async () => {
    origNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    const root = await mkdtemp(join(tmpdir(), "preview-"));
    const fx = await makeFixture(root);
    // Tamper work packet importId
    const wp = join(root, ".automation", "article-imports", "work", fx.importId, "work.json");
    const data = JSON.parse(await (await import("node:fs/promises")).readFile(wp, "utf8"));
    data.importId = "article-00000000-0000-4000-8000-000000000000";
    await (await import("node:fs/promises")).writeFile(wp, JSON.stringify(data));
    const r = await validateApprovedArticlePreview(fx.slug, fx.importId, root);
    assert.equal(r.ok, false);
    assert.equal(r.error, "WORK_PACKET_IMPORT_MISMATCH");
    await rm(root, { recursive: true, force: true });
  });

  it("rejects work packet wrong stage", async () => {
    origNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    const root = await mkdtemp(join(tmpdir(), "preview-"));
    const bp = makeBlueprint(VALID_SLUG);
    const fp = fingerprintEditorialArtifact(bp);
    const fx = await makeFixture(root, { workPacket: { schemaVersion: "ImportSupervisedWorkV1", importId: VALID_IMPORT_ID, sourceFingerprint: SOURCE_FP, stage: "RESEARCHING", idempotencyKey: "k".repeat(64), record: { importId: VALID_IMPORT_ID, sourceFingerprint: SOURCE_FP, stage: "RESEARCHING", contentApproval: { artifactPath: `.automation/article-imports/work/${VALID_IMPORT_ID}/approved.json`, artifactFingerprint: fp, sourceFingerprint: SOURCE_FP } } }, blueprint: bp });
    const r = await validateApprovedArticlePreview(fx.slug, fx.importId, root);
    assert.equal(r.ok, false);
    assert.equal(r.error, "WORK_PACKET_STAGE_MISMATCH");
    await rm(root, { recursive: true, force: true });
  });

  it("rejects unapproved affiliate URL", async () => {
    origNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    const root = await mkdtemp(join(tmpdir(), "preview-"));
    const fx = await makeFixture(root, { approvedUrls: "- https://example.com/other\n" });
    const r = await validateApprovedArticlePreview(fx.slug, fx.importId, root);
    assert.equal(r.ok, false);
    assert.equal(r.error, "UNAPPROVED_AFFILIATE_URL");
    await rm(root, { recursive: true, force: true });
  });

  it("rejects public projection divergence (renders private approved bytes)", async () => {
    origNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    const root = await mkdtemp(join(tmpdir(), "preview-"));
    const fx = await makeFixture(root);
    // Modify public projection to differ
    const pubPath = join(root, "src", "generated", "landing-pages", `${fx.slug}.json`);
    await writeFile(pubPath, JSON.stringify({ tampered: true }));
    const r = await validateApprovedArticlePreview(fx.slug, fx.importId, root);
    // Should still succeed because it reads the private approved artifact, not the public projection
    assert.equal(r.ok, true, `expected ok but got ${r.error}`);
    assert.ok(r.blueprint);
    await rm(root, { recursive: true, force: true });
  });

  it("rejects artifact path traversal (symlink escape)", async () => {
    origNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    const root = await mkdtemp(join(tmpdir(), "preview-"));
    const fx = await makeFixture(root);
    // Tamper artifactPath to escape work dir
    const importPath = join(root, ".automation", "article-imports", `${fx.importId}.json`);
    const record = JSON.parse(await (await import("node:fs/promises")).readFile(importPath, "utf8"));
    record.contentApproval.artifactPath = "../../etc/passwd";
    await (await import("node:fs/promises")).writeFile(importPath, JSON.stringify(record));
    const wp = join(root, ".automation", "article-imports", "work", fx.importId, "work.json");
    const wpData = JSON.parse(await (await import("node:fs/promises")).readFile(wp, "utf8"));
    wpData.record.contentApproval.artifactPath = "../../etc/passwd";
    await (await import("node:fs/promises")).writeFile(wp, JSON.stringify(wpData));
    const r = await validateApprovedArticlePreview(fx.slug, fx.importId, root);
    assert.equal(r.ok, false);
    assert.ok(r.error === "ARTIFACT_NOT_FOUND" || r.error === "ARTIFACT_PATH_ESCAPE" || r.error === "WORK_PACKET_ARTIFACT_PATH_MISMATCH", `got ${r.error}`);
    await rm(root, { recursive: true, force: true });
  });

  it("approval verifies the loaded snapshot after its file changes", async () => {
    origNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    const root = await mkdtemp(join(tmpdir(), "preview-"));
    const fx = await makeFixture(root);
    const fs = await import("node:fs/promises");
    const importPath = join(root, ".automation", "article-imports", `${fx.importId}.json`);
    const record = JSON.parse(await fs.readFile(importPath, "utf8"));
    const contentApproval = record.contentApproval;
    const sourceFingerprint = record.sourceFingerprint as string;
    const loaded = await loadApprovedArtifact(root, contentApproval.artifactPath);
    assert.equal(loaded.ok, true);
    if (!loaded.ok) throw new Error("expected loaded");
    // mutate underlying artifact bytes after loading
    await fs.writeFile(join(root, contentApproval.artifactPath), JSON.stringify(null));
    assert.equal(await loaded.matches(contentApproval, "direct-review", sourceFingerprint, APPROVED_AFFILIATE_URL), true);
    const r = await validateApprovedArticlePreview(fx.slug, fx.importId, root);
    assert.equal(r.ok, false);
    await rm(root, { recursive: true, force: true });
  });
});


it("fresh import previews select the development renderer while ordinary preview requests retain their route", async () => {
  const {candidateRequestPath} = await import("../src/lib/article-import/candidate-route");
  const {default:config} = await import("../next.config");
  const id = "article-11223344-abcd-abcd-abcd-0123456789ab";
  assert.equal(candidateRequestPath("fresh-candidate",id),"/landing-page-previews/fresh-candidate?importId=" + id);
  assert.equal(candidateRequestPath("prior-candidate"),"/landing-page-previews/prior-candidate");
  assert.throws(() => candidateRequestPath("fresh-candidate","../other"));
  const before = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "development";
    assert.equal((await config.rewrites!()).beforeFiles[0].has[0].key,"importId");
    process.env.NODE_ENV = "production";
    assert.deepEqual((await config.rewrites!()).beforeFiles,[]);
  } finally { if (before === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = before; }
});
