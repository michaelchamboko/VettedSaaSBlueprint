import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  countVisibleArticleWords,
  isLongFormAffiliateArticle,
  isLongFormAffiliateWordCount,
} from "../src/lib/editorial/article-visible-word-count";
import { pageBlueprintSchema } from "../src/lib/schemas/contracts";
import { samplePageBlueprint } from "./fixtures/sample-page-blueprint";

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

function words(count: number): string {
  return Array.from({ length: count }, (_, index) => `word${index + 1}`).join(" ");
}

function controlledLegacyBlueprint(headlineWords = 1) {
  const blueprint = structuredClone(samplePageBlueprint);
  blueprint.metadata.design_profile = "legacy";
  blueprint.metadata.title_tag = words(50);
  blueprint.metadata.meta_description = words(50);
  blueprint.affiliate_disclosure.short_disclosure = words(50);
  blueprint.affiliate_disclosure.full_disclosure = words(50);
  blueprint.hero = {
    ...blueprint.hero,
    headline: words(headlineWords),
    subheadline: "summary",
    answer_snippet: null,
    risk_reversal: null,
    visual_asset: null,
    primary_cta_label: words(50),
  };
  blueprint.problem_solution = {
    problem: "problem",
    agitation: words(50),
    solution: "solution",
  };
  blueprint.benefits = [{
    benefit_title: "benefit",
    benefit_description: "description",
    feature_supporting_it: words(50),
    source_reference_ids: [],
    visual_asset: null,
  }];
  blueprint.proof_blocks = [{
    proof_type: words(50),
    summary: words(50),
    source_reference_id: "550e8400-e29b-41d4-a716-446655440010",
    source_url: "https://example.com/this-url-must-not-count",
    confidence_score: 0.9,
  }];
  blueprint.how_it_works = [];
  blueprint.limitations = [{
    limitation: "limitation",
    who_it_affects: words(50),
    mitigation: "mitigation",
  }];
  blueprint.objection_handling = [{
    objection: words(50),
    response: words(50),
    source_reference_ids: [],
  }];
  blueprint.cta_blocks = [{
    ...blueprint.cta_blocks[0],
    label: words(50),
    supporting_text: words(50),
  }];
  blueprint.faq = [];
  return blueprint;
}

test("counts only prose rendered by the legacy direct-review article", () => {
  const result = countVisibleArticleWords("direct-review", controlledLegacyBlueprint());

  assert.equal(result.wordCount, 8);
  assert.equal(
    result.visibleText,
    "word1\n\nsummary\n\nproblem\n\nsolution\n\nbenefit\n\ndescription\n\nlimitation\n\nmitigation",
  );
  assert.deepEqual(result.visibleProsePaths, [
    "hero.headline",
    "hero.subheadline",
    "problem_solution.problem",
    "problem_solution.solution",
    "benefits.0.benefit_title",
    "benefits.0.benefit_description",
    "limitations.0.limitation",
    "limitations.0.mitigation",
  ]);
});

test("does not count the same rendered artifact text more than once", () => {
  const blueprint = controlledLegacyBlueprint();
  blueprint.metadata.design_profile = "editorial_v2";
  blueprint.hero.headline = "repeated phrase";
  blueprint.hero.subheadline = "repeated phrase";
  blueprint.hero.answer_snippet = null;

  assert.equal(countVisibleArticleWords("direct-review", blueprint).wordCount, 8);
});

test("removes embedded URLs but retains visible Markdown link labels", () => {
  const blueprint = controlledLegacyBlueprint();
  blueprint.hero.headline = "Start [useful comparison](https://example.com/path-with-many-words) then https://example.com/raw/path-word finish.";
  const result = countVisibleArticleWords("direct-review", blueprint);

  assert.equal(result.wordCount, 12);
  assert.ok(result.visibleText.startsWith("Start useful comparison then finish."));
  assert.ok(!result.visibleText.includes("https://"));
  assert.ok(!result.visibleText.includes("path-with-many-words"));
  assert.ok(!result.visibleText.includes("path-word"));
});

test("counts reference-composed comparison and FAQ prose but not disclosure or buttons", () => {
  const blueprint = readJson("src/generated/landing-pages/elevenlabs-ai-voice-generator.json") as {
    affiliate_disclosure: { short_disclosure: string; full_disclosure: string };
    cta_blocks: Array<{ label: string }>;
    objection_handling: Array<{ objection: string; response: string }>;
    faq: Array<{ question: string; answer: string }>;
  };
  const result = countVisibleArticleWords("direct-review", blueprint);
  const visibleBlocks = new Set(result.visibleText.split("\n\n"));

  assert.ok(result.visibleText.includes(blueprint.objection_handling[0].objection));
  assert.ok(result.visibleText.includes(blueprint.objection_handling[0].response));
  assert.ok(result.visibleText.includes(blueprint.faq[0].question));
  assert.ok(result.visibleText.includes(blueprint.faq[0].answer));
  assert.ok(!visibleBlocks.has(blueprint.affiliate_disclosure.short_disclosure));
  assert.ok(!visibleBlocks.has(blueprint.affiliate_disclosure.full_disclosure));
  assert.ok(!visibleBlocks.has(blueprint.cta_blocks[0].label));
});

test("projection paths match the representative JSX fields for every direct-review profile", () => {
  const directReviewSource = readFileSync("src/components/landing/DirectReviewPage.tsx", "utf8");
  const editorialSource = readFileSync("src/components/landing/EditorialReviewPage.tsx", "utf8");
  const referenceSource = readFileSync("src/components/landing/ReferenceComposedReviewPage.tsx", "utf8");
  const legacy = pageBlueprintSchema.parse(controlledLegacyBlueprint());
  const editorialInput = controlledLegacyBlueprint();
  editorialInput.metadata.design_profile = "editorial_v2";
  editorialInput.hero.answer_snippet = "editorial answer snippet";
  editorialInput.hero.risk_reversal = "editorial risk reversal";
  editorialInput.hero.visual_asset = {
    asset_type: "codex_generated_image",
    asset_url: "/images/editorial-proof.webp",
    alt_text: "Image alternative text stays outside the body count",
    prompt_summary: "Visible editorial image caption",
    generation_tool: "codex_image_generation",
    approval_status: "approved",
    approved_by_owner: true,
  };
  const editorial = pageBlueprintSchema.parse(editorialInput);
  const reference = pageBlueprintSchema.parse(
    readJson("src/generated/landing-pages/elevenlabs-ai-voice-generator.json"),
  );

  assert.match(directReviewSource, /\{blueprint\.hero\.headline\}/);
  assert.match(directReviewSource, /\{blueprint\.hero\.subheadline\}/);
  assert.match(directReviewSource, /\{blueprint\.problem_solution\.problem\}/);
  assert.match(directReviewSource, /\{blueprint\.problem_solution\.solution\}/);
  assert.match(directReviewSource, /\{benefit\.benefit_title\}/);
  assert.match(directReviewSource, /\{benefit\.benefit_description\}/);
  assert.match(directReviewSource, /\{item\.limitation\}/);
  assert.match(directReviewSource, /\{item\.mitigation\}/);
  assert.deepEqual(countVisibleArticleWords("direct-review", legacy).visibleProsePaths, [
    "hero.headline", "hero.subheadline", "problem_solution.problem", "problem_solution.solution",
    "benefits.0.benefit_title", "benefits.0.benefit_description",
    "limitations.0.limitation", "limitations.0.mitigation",
  ]);

  const editorialPaths = countVisibleArticleWords("direct-review", editorial).visibleProsePaths;
  assert.match(editorialSource, /\{answerSnippet\}/);
  assert.match(editorialSource, /\{approvedHeroVisual\.prompt_summary\}/);
  assert.ok(editorialPaths.includes("hero.visual_asset.prompt_summary"));
  assert.ok(!editorialPaths.includes("hero.visual_asset.alt_text"));
  assert.ok(!editorialPaths.includes("problem_solution.problem"));
  assert.ok(!editorialPaths.includes("cta_blocks.0.label"));

  const referencePaths = countVisibleArticleWords("direct-review", reference).visibleProsePaths;
  for (const expression of [
    "benefit.feature_supporting_it", "proof.proof_type", "proof.summary",
    "limitation.who_it_affects", "item.objection", "item.response",
    "item.question", "item.answer", "closing.supporting_text",
  ]) {
    assert.ok(referenceSource.includes(`{${expression}}`), `${expression} must be rendered`);
  }
  assert.ok(referencePaths.includes("cta_blocks.0.supporting_text"));
  assert.ok(!referencePaths.includes("cta_blocks.0.label"));
  assert.ok(!referencePaths.includes("hero.primary_cta_label"));
});

test("counts the inclusive long-form boundaries exactly", () => {
  for (const [expected, accepted] of [
    [1_799, false],
    [1_800, true],
    [2_300, true],
    [2_301, false],
  ] as const) {
    const result = countVisibleArticleWords(
      "direct-review",
      controlledLegacyBlueprint(expected - 7),
    );
    assert.equal(result.wordCount, expected);
    assert.equal(isLongFormAffiliateWordCount(result.wordCount), accepted);
  }
});

test("requires an approved affiliate destination on a direct-review route", () => {
  assert.equal(isLongFormAffiliateArticle({
    format: "direct-review",
    approvedAffiliateUrl: "https://partner.example/approved",
  }), true);
  assert.equal(isLongFormAffiliateArticle({ format: "direct-review", approvedAffiliateUrl: "  " }), false);
  assert.equal(isLongFormAffiliateArticle({
    format: "blog",
    approvedAffiliateUrl: "https://partner.example/approved",
  }), false);
  assert.equal(isLongFormAffiliateArticle({
    format: "visibility",
    approvedAffiliateUrl: "https://partner.example/approved",
  }), false);
});

