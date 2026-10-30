import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  canReuseEditorialEvidence, compareEditorialArtifacts, createEditorialEvidence, editorialProse,
} from "../src/lib/editorial/refinement";
import { samplePageBlueprint } from "./fixtures/sample-page-blueprint";

const readJson = (file: string) => JSON.parse(readFileSync(file, "utf8"));
const decision = readJson("src/content/decision-journeys/sets/governed-ai-client-work-preparation.json");
const blog = readJson("src/generated/blog-posts/posts.json")[0];
const notes = { semanticNotes: "Reviewed the changed prose; meaning, qualification and item order are preserved.", exceptions: [], meaningPreserved: true, arrayOrderPreserved: true };

test("allows only explicit prose fields across decision, landing and blog formats", () => {
  const landing = structuredClone(samplePageBlueprint);
  landing.hero.subheadline = "Evaluate the workflow your team needs.";
  assert.deepEqual(compareEditorialArtifacts("landing", samplePageBlueprint, landing), ["hero.subheadline"]);
  const revisedDecision = structuredClone(decision);
  revisedDecision.pages.decisionHub.headline = "Should this five-person team introduce generative AI?";
  assert.deepEqual(compareEditorialArtifacts("decision", decision, revisedDecision), ["pages.decisionHub.headline"]);
  const revisedBlog = structuredClone(blog);
  revisedBlog.sections[0].heading = "Check consent before recording";
  assert.deepEqual(compareEditorialArtifacts("blog", blog, revisedBlog), ["sections.0.heading"]);
});

test("allows landing CTA wording while preserving its destinations", () => {
  const revised = structuredClone(samplePageBlueprint);
  revised.hero.primary_cta_label = "Explore the offer";
  revised.cta_blocks[0].label = "Check workflow fit";
  revised.cta_blocks[0].supporting_text = "Review the workflow before deciding.";
  assert.deepEqual(compareEditorialArtifacts("landing", samplePageBlueprint, revised), [
    "hero.primary_cta_label", "cta_blocks.0.label", "cta_blocks.0.supporting_text",
  ]);
});

test("allows blog title, description and FAQ wording while freezing publication identity", () => {
  const revised = structuredClone(blog);
  revised.title = "Evaluate AI Voice Cloning for Production";
  revised.description = "Check consent, access controls, audio quality and release review before using an AI voice clone in your team's production workflow.";
  revised.faqs[0].question = "What should a team check before using a voice clone?";
  revised.faqs[0].answer = "Confirm informed consent and review the intended uses before evaluating the voice clone against your team's actual production scripts.";
  assert.deepEqual(compareEditorialArtifacts("blog", blog, revised), [
    "title", "description", "faqs.0.question", "faqs.0.answer",
  ]);
  for (const field of ["canonicalPath", "publishedAt", "modifiedAt", "topicCluster"]) {
    const protectedEdit = structuredClone(blog);
    protectedEdit[field] = field === "canonicalPath" ? "/blog/another-post" :
      field === "topicCluster" ? "email-automation" : "2026-10-21T00:00:00.000Z";
    assert.throws(() => compareEditorialArtifacts("blog", blog, protectedEdit), /Protected/);
  }
});

test("freezes disclosures, evidence, destinations, design, metadata and unknown fields", () => {
  for (const mutate of [
    (page: typeof samplePageBlueprint) => { page.affiliate_disclosure.short_disclosure = "No commission."; },
    (page: typeof samplePageBlueprint) => { page.cta_blocks[0].affiliate_link_id = "550e8400-e29b-41d4-a716-446655440099"; },
    (page: typeof samplePageBlueprint) => { page.metadata.title_tag = "A new title"; },
    (page: typeof samplePageBlueprint) => { page.benefits[0].source_reference_ids = ["550e8400-e29b-41d4-a716-446655440099"]; },
    (page: typeof samplePageBlueprint) => { page.hero.primary_cta_link_id = "550e8400-e29b-41d4-a716-446655440099"; },
    (page: typeof samplePageBlueprint) => { page.metadata.motion_profile = "gsap_editorial"; },
  ]) {
    const revised = structuredClone(samplePageBlueprint);
    mutate(revised);
    assert.throws(() => compareEditorialArtifacts("landing", samplePageBlueprint, revised), /Protected|structure/);
  }
  assert.throws(() => compareEditorialArtifacts("landing", samplePageBlueprint, { ...samplePageBlueprint, internalNote: "new" }), /structure/);
  const revisedDecision = structuredClone(decision);
  revisedDecision.pages.decisionHub.blocks[0].claims[0].statement = "Unsupported certainty.";
  assert.throws(() => compareEditorialArtifacts("decision", decision, revisedDecision), /Protected/);
  const revisedBlog = structuredClone(blog);
  revisedBlog.sources[0].url = "https://example.com/replaced";
  assert.throws(() => compareEditorialArtifacts("blog", blog, revisedBlog), /Protected/);
});

test("rejects array insertion, deletion, reorder and schema-invalid drafts", () => {
  for (const mutate of [
    (post: typeof blog) => post.sections.reverse(),
    (post: typeof blog) => post.sections[0].paragraphs.push("An added paragraph has enough length to satisfy the schema, but changes the established content structure."),
    (post: typeof blog) => post.sections.pop(),
    (post: typeof blog) => { post.sections[0].heading = ""; },
  ]) {
    const revised = structuredClone(blog);
    mutate(revised);
    assert.throws(() => compareEditorialArtifacts("blog", blog, revised));
  }
  const revised = structuredClone(blog);
  revised.sections[0].paragraphs.reverse();
  if (blog.sections[0].paragraphs.length > 1) assert.throws(() => compareEditorialArtifacts("blog", blog, revised), /order/);
  assert.throws(() => compareEditorialArtifacts("unknown", {}, {}), /Unsupported/);
  assert.throws(() => compareEditorialArtifacts("blog", {}, blog));
});

test("visibility allows prose but freezes claim identity and links", () => {
  const page = { schema_version: "VisibilityPageV1", id: "guide", path: "/guides/first-email-automation-workflow", kind: "guide", cluster_id: "email_marketing", title: "First workflow", description: "Map your first workflow.", modified_at: "2026-10-21T00:00:00Z", hero: { eyebrow: "Guide", headline: "Map your first workflow", summary: "Start with one event and its follow-up." }, claim_ids: ["claim-1"], relevant_review_path: "/reviews/moosend", related_paths: ["/email-marketing-software"], blocks: [{ type: "prose", paragraphs: ["Choose the event before writing the email."] }] };
  const revised = structuredClone(page);
  revised.hero.summary = "Define one event and the follow-up it needs.";
  assert.deepEqual(compareEditorialArtifacts("visibility", page, revised), ["hero.summary"]);
  revised.claim_ids[0] = "claim-2";
  assert.throws(() => compareEditorialArtifacts("visibility", page, revised), /Protected/);
});

test("receipt reuse requires identical artifact, format and pinned revision", () => {
  const revised = structuredClone(samplePageBlueprint);
  revised.hero.subheadline = "Evaluate the workflow your team needs.";
  const evidence = createEditorialEvidence("landing", samplePageBlueprint, revised, notes, { before: "score 4/5", after: "score 5/5" });
  assert.equal(canReuseEditorialEvidence(evidence, "landing", revised), true);
  assert.equal(canReuseEditorialEvidence(evidence, "landing", samplePageBlueprint), false);
  assert.equal(canReuseEditorialEvidence({ ...evidence, revision: "old" }, "landing", revised), false);
  assert.throws(() => createEditorialEvidence("landing", samplePageBlueprint, revised, { ...notes, meaningPreserved: false }, { before: "checked", after: "checked" }));
  assert.throws(() => createEditorialEvidence("landing", samplePageBlueprint, revised, notes, { before: "", after: "checked" }));
  assert.ok(!editorialProse("landing", samplePageBlueprint).includes(samplePageBlueprint.affiliate_disclosure.short_disclosure));
});

test("vendored upstream bytes match pinned Git blob hashes", () => {
  const root = ".agents/skills/eleanor-editorial/";
  const manifest = readJson(root + "UPSTREAM.json");
  for (const [file, record] of Object.entries(manifest.files)) {
    const bytes = readFileSync(root + file);
    const sha = createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
    assert.equal(sha, (record as { gitBlobSha1: string }).gitBlobSha1, file);
  }
});

test("unpublished calibration covers two passages in each requested category", () => {
  const calibration = readJson("build-pack/editorial/calibration-2026-10-21/passages.json");
  assert.equal(calibration.status, "unpublished calibration only");
  assert.equal(calibration.passages.length, 6);
  for (const category of ["strong", "generic", "overly_cautious"]) {
    assert.equal(calibration.passages.filter((passage: { category: string }) => passage.category === category).length, 2);
  }
  assert.ok(new Set(calibration.passages.map((passage: { format: string }) => passage.format)).size > 1);
  for (const passage of calibration.passages) {
    assert.ok(passage.changeExplanation.length > 30);
    assert.ok(passage.integrityCheck.length > 30);
  }
});
