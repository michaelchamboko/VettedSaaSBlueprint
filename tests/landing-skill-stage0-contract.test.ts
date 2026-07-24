import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

const skillPaths = {
  orchestrator: ".agents/skills/landing-page-production-orchestrator/SKILL.md",
  intent: ".agents/skills/affiliate-page-intent-brief/SKILL.md",
  drafter: ".agents/skills/direct-review-page-drafter/SKILL.md",
  uniqueness: ".agents/skills/landing-page-uniqueness-review/SKILL.md",
  retro: ".agents/skills/landing-page-batch-retro/SKILL.md",
} as const;

function readSkill(relativePath: string) {
  const filePath = path.join(root, relativePath);
  assert.ok(fs.existsSync(filePath), `expected ${relativePath} to exist`);
  return fs.readFileSync(filePath, "utf8");
}

function requireAll(source: string, skill: string, requirements: Array<[string, RegExp]>) {
  for (const [behavior, pattern] of requirements) {
    assert.match(source, pattern, `${skill} must require ${behavior}`);
  }
}

test("all landing-production skills fail closed on the ordered local Stage 0 contract", () => {
  const sharedRequirements: Array<[string, RegExp]> = [
    ["local catalogue validation with stored capture hashes and no recrawl", /(?=[\s\S]*landing:references:validate)(?=[\s\S]*(?:hash|capture))(?=[\s\S]*(?:no recrawl|without recrawl|do not recrawl))[\s\S]*/i],
    ["three-reference default and the constrained two-reference exception", /three references[\s\S]{0,300}(?:two|2)[\s\S]{0,300}four (?:unique )?design (?:dimensions|axes)/i],
    ["same or neighbouring product-category coverage", /(?:same|match|matching)[\s\S]{0,120}(?:neighbou?r|adjacent)[\s\S]{0,160}(?:product )?categor/i],
    ["explicit hero/typography, sections/CTA, and motion/mobile roles", /hero\s*\/\s*typography[\s\S]{0,160}sections\s*\/\s*CTA[\s\S]{0,160}motion\s*\/\s*mobile/i],
    ["a DesignDirectionV1 artifact", /DesignDirectionV1/],
    ["a validated PresentationRecipeV1 without page-specific code or legacy fallback", /PresentationRecipeV1[\s\S]{0,600}(?:page-specific (?:JSX|CSS|JavaScript)|JSX\/CSS\/JavaScript)[\s\S]{0,600}(?:legacy|Editorial V2|editorial_v2)/i],
    ["a production-identical animated noindex preview with gsap_editorial", /production-identical[\s\S]{0,300}(?:animated )?noindex[\s\S]{0,300}gsap_editorial/i],
    ["a passing VisualDesignReviewV1 before uniqueness, compliance, and conversion", /VisualDesignReviewV1[\s\S]{0,450}(?:status other than `?pass`?|visual pass)[\s\S]{0,650}(?:uniqueness|compliance)[\s\S]{0,450}conversion/i],
    ["hold_for_design_direction when Stage 0 is unavailable or invalid", /hold_for_design_direction/],
    ["Oracle synchronization optional for the agent-led release", /Oracle[\s\S]{0,500}(?:synchronization|sync)[\s\S]{0,500}(?:optional|never blocks|does not block|must not block|not block)/i],
  ];

  for (const [skill, relativePath] of Object.entries(skillPaths)) {
    requireAll(readSkill(relativePath), skill, sharedRequirements);
  }
});

test("Stage 0 contracts retain their skill-specific reuse and retro controls", () => {
  const uniqueness = readSkill(skillPaths.uniqueness);
  requireAll(uniqueness, "uniqueness", [
    ["seven-axis presentation fingerprint review", /seven-axis presentation fingerprint/i],
    ["no exact fingerprint reuse", /exact fingerprint reuse/i],
    ["three-axis same-wave diversity", /same-wave[\s\S]{0,160}three axes/i],
    ["primary-reference ten-page reuse limit", /primary reference[\s\S]{0,160}once per ten-page wave/i],
    ["previous-ten reference reuse limit", /(?:at most twice|no more than twice)[\s\S]{0,160}previous ten drafts/i],
    ["previous-twenty combination reuse limit", /combination[\s\S]{0,160}(?:previous )?twenty/i],
    ["two-axis per-reference influence limit", /reference[\s\S]{0,160}(?:more than two axes|two axes)/i],
    ["three-axis per-reference structural limit", /no page matches more than three structural axes/i],
    ["one section family per page", /section family once per page/i],
    ["abstract-principle adoption without copying", /principles[\s\S]{0,160}(?:without copying|do not copy)[\s\S]{0,160}(?:branding|content|assets)/i],
    ["pixel similarity excluded as a success criterion", /pixel similarity[\s\S]{0,120}never.*success criteri(?:on|a)/i],
  ]);

  const retro = readSkill(skillPaths.retro);
  requireAll(retro, "retro", [
    ["catalogue-gap tracking", /catalogue gaps/i],
    ["reference reuse and recipe collision tracking", /reference reuse[\s\S]{0,160}recipe collisions/i],
    ["renderer-token failure tracking", /renderer-token failures/i],
    ["mobile, CTA, overflow, and motion failure tracking", /mobile\/CTA\/overflow\/motion failures/i],
    ["visual-report quality tracking", /visual-report quality/i],
    ["updates or explicit deferrals before another wave", /(?:catalogue|contract|renderer|skill) updates[\s\S]{0,320}(?:explicitly defer|deferred)[\s\S]{0,320}before another wave/i],
    ["no live per-page browsing requirement", /without live per-page browsing/i],
  ]);
});
