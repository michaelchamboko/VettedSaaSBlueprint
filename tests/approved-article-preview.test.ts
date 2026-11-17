import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { validateApprovedArticlePreview, isValidSlug, isDevEnvironment } from "../src/lib/article-import/approved-article-preview";

function sha256(s: string) { return createHash("sha256").update(s).digest("hex"); }

const VALID_SLUG = "test-approved-article";
const VALID_IMPORT_ID = "article-12345678-1234-4234-8234-123456789abc";

async function makeFixture(root: string, opts: { stage?: string; fingerprint?: string; slug?: string; artifactContent?: string; importId?: string } = {}) {
  const slug = opts.slug ?? VALID_SLUG;
  const importId = opts.importId ?? VALID_IMPORT_ID;
  const artifactContent = opts.artifactContent ?? JSON.stringify({
    metadata: { product_id: "12345678-1234-4234-8234-123456789abc", page_type: "direct_review", target_keyword: "test", search_intent: "test", category_slug: "test", url_slug: slug, title_tag: "t", meta_description: "d", design_profile: "legacy" },
    affiliate_disclosure: { short_disclosure: "s", full_disclosure: "f", placement: "above_first_cta" },
    hero: { headline: "h", subheadline: "sh", primary_cta_label: "cta", primary_cta_link_id: "12345678-1234-4234-8234-123456789abc", answer_snippet: "a" },
    problem_solution: { problem: "p", agitation: "a", solution: "s" },
    benefits: [{ benefit_title: "b", benefit_description: "d", feature_supporting_it: "f", source_reference_ids: [] }],
    limitations: [{ limitation: "l", who_it_affects: "w", mitigation: "m" }],
    cta_blocks: [{ placement: "hero", label: "cta", supporting_text: "s", affiliate_link_id: "12345678-1234-4234-8234-123456789abc" }],
    schema_markup: { faq_schema: {}, breadcrumb_schema: {} },
    quality_scores: { evidence_score: 1, originality_score: 1, conversion_score: 1, compliance_score: 1, readability_score: 1, seo_safety_score: 1, overall_score: 1 },
  });
  const fingerprint = opts.fingerprint ?? sha256(artifactContent);

  // Write import record
  const workDir = join(root, ".automation", "article-imports", "work", importId);
  await mkdir(workDir, { recursive: true });
  const workPath = `.automation/article-imports/work/${importId}/work.json`;
  await writeFile(join(root, workPath), JSON.stringify({ stage: "VALIDATING" }));

  const importRecord = {
    importId,
    stage: opts.stage ?? "VALIDATING",
    sourceFingerprint: "a".repeat(64),
    contentApproval: {
      artifactPath: `.automation/article-imports/work/${importId}/approved.json`,
      artifactFingerprint: fingerprint,
    },
    artifactPath: `src/generated/landing-pages/${slug}.json`,
    continuation: { workPath },
    transformation: { resolvedAffiliateUrl: "https://example.com/affiliate" },
  };
  await mkdir(join(root, ".automation", "article-imports"), { recursive: true });
  await writeFile(join(root, ".automation", "article-imports", `${importId}.json`), JSON.stringify(importRecord));

  // Write approved private artifact
  await writeFile(join(root, ".automation", "article-imports", "work", importId, "approved.json"), artifactContent);

  // Write public projection
  const pubDir = join(root, "src", "generated", "landing-pages");
  await mkdir(pubDir, { recursive: true });
  await writeFile(join(pubDir, `${slug}.json`), artifactContent);

  return { root, slug, importId, fingerprint };
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
    process.env.NODE_ENV = "development";
    assert.equal(isDevEnvironment(), true);
    process.env.NODE_ENV = "production";
    assert.equal(isDevEnvironment(), false);
    process.env.NODE_ENV = orig;
  });
});

describe("validateApprovedArticlePreview", () => {
  it("returns NOT_FOUND in production", async () => {
    const orig = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    const root = await mkdtemp(join(tmpdir(), "preview-"));
    const r = validateApprovedArticlePreview("test", VALID_IMPORT_ID, root);
    assert.equal(r.ok, false);
    assert.equal(r.error, "NOT_FOUND");
    process.env.NODE_ENV = orig;
    await rm(root, { recursive: true, force: true });
  });

  it("validates approved binding in development", async () => {
    const orig = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    const root = await mkdtemp(join(tmpdir(), "preview-"));
    const fx = await makeFixture(root);
    const r = validateApprovedArticlePreview(fx.slug, fx.importId, root);
    assert.equal(r.ok, true, `expected ok but got ${r.error}`);
    assert.ok(r.blueprint);
    process.env.NODE_ENV = orig;
    await rm(root, { recursive: true, force: true });
  });

  it("rejects bad hash (fingerprint mismatch)", async () => {
    const orig = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    const root = await mkdtemp(join(tmpdir(), "preview-"));
    const fx = await makeFixture(root, { fingerprint: "0".repeat(64) });
    const r = validateApprovedArticlePreview(fx.slug, fx.importId, root);
    assert.equal(r.ok, false);
    assert.equal(r.error, "ARTIFACT_FINGERPRINT_MISMATCH");
    process.env.NODE_ENV = orig;
    await rm(root, { recursive: true, force: true });
  });

  it("rejects bad slug (traversal)", async () => {
    const orig = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    const root = await mkdtemp(join(tmpdir(), "preview-"));
    const fx = await makeFixture(root);
    const r = validateApprovedArticlePreview("../etc", fx.importId, root);
    assert.equal(r.ok, false);
    assert.equal(r.error, "INVALID_SLUG");
    process.env.NODE_ENV = orig;
    await rm(root, { recursive: true, force: true });
  });

  it("rejects wrong stage", async () => {
    const orig = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    const root = await mkdtemp(join(tmpdir(), "preview-"));
    const fx = await makeFixture(root, { stage: "RESEARCHING" });
    const r = validateApprovedArticlePreview(fx.slug, fx.importId, root);
    assert.equal(r.ok, false);
    assert.equal(r.error, "INVALID_STAGE");
    process.env.NODE_ENV = orig;
    await rm(root, { recursive: true, force: true });
  });

  it("rejects bad schema (invalid blueprint)", async () => {
    const orig = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    const root = await mkdtemp(join(tmpdir(), "preview-"));
    const fx = await makeFixture(root, { artifactContent: '{"not": "a blueprint"}' });
    const r = validateApprovedArticlePreview(fx.slug, fx.importId, root);
    assert.equal(r.ok, false);
    // Could be ARTIFACT_FINGERPRINT_MISMATCH (hash mismatch) or INVALID_BLUEPRINT_SCHEMA
    assert.ok(r.error === "ARTIFACT_FINGERPRINT_MISMATCH" || r.error === "INVALID_BLUEPRINT_SCHEMA", `got ${r.error}`);
    process.env.NODE_ENV = orig;
    await rm(root, { recursive: true, force: true });
  });

  it("rejects missing import record", async () => {
    const orig = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    const root = await mkdtemp(join(tmpdir(), "preview-"));
    const r = validateApprovedArticlePreview("test-slug", "article-00000000-0000-4000-8000-000000000000", root);
    assert.equal(r.ok, false);
    assert.equal(r.error, "IMPORT_NOT_FOUND");
    process.env.NODE_ENV = orig;
    await rm(root, { recursive: true, force: true });
  });

  it("rejects missing content approval", async () => {
    const orig = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    const root = await mkdtemp(join(tmpdir(), "preview-"));
    const fx = await makeFixture(root);
    // Remove contentApproval
    const importPath = join(root, ".automation", "article-imports", `${fx.importId}.json`);
    const record = JSON.parse(await (await import("node:fs/promises")).readFile(importPath, "utf8"));
    delete record.contentApproval;
    await (await import("node:fs/promises")).writeFile(importPath, JSON.stringify(record));
    const r = validateApprovedArticlePreview(fx.slug, fx.importId, root);
    assert.equal(r.ok, false);
    assert.equal(r.error, "NO_CONTENT_APPROVAL");
    process.env.NODE_ENV = orig;
    await rm(root, { recursive: true, force: true });
  });

  it("rejects slug mismatch with blueprint", async () => {
    const orig = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    const root = await mkdtemp(join(tmpdir(), "preview-"));
    const artifactContent = JSON.stringify({
      metadata: { product_id: "12345678-1234-4234-8234-123456789abc", page_type: "direct_review", target_keyword: "test", search_intent: "test", category_slug: "test", url_slug: "different-slug", title_tag: "t", meta_description: "d", design_profile: "legacy" },
      affiliate_disclosure: { short_disclosure: "s", full_disclosure: "f", placement: "above_first_cta" },
      hero: { headline: "h", subheadline: "sh", primary_cta_label: "cta", primary_cta_link_id: "12345678-1234-4234-8234-123456789abc", answer_snippet: "a" },
      problem_solution: { problem: "p", agitation: "a", solution: "s" },
      benefits: [{ benefit_title: "b", benefit_description: "d", feature_supporting_it: "f", source_reference_ids: [] }],
      limitations: [{ limitation: "l", who_it_affects: "w", mitigation: "m" }],
      cta_blocks: [{ placement: "hero", label: "cta", supporting_text: "s", affiliate_link_id: "12345678-1234-4234-8234-123456789abc" }],
      schema_markup: { faq_schema: {}, breadcrumb_schema: {} },
      quality_scores: { evidence_score: 1, originality_score: 1, conversion_score: 1, compliance_score: 1, readability_score: 1, seo_safety_score: 1, overall_score: 1 },
    });
    const fx = await makeFixture(root, { artifactContent, slug: VALID_SLUG });
    const r = validateApprovedArticlePreview(fx.slug, fx.importId, root);
    assert.equal(r.ok, false);
    assert.equal(r.error, "SLUG_MISMATCH");
    process.env.NODE_ENV = orig;
    await rm(root, { recursive: true, force: true });
  });
});
