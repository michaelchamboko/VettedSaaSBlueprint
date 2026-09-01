import assert from "node:assert/strict";
import test from "node:test";
import { evaluatePagePublishability } from "../src/lib/pages/publication";
import { pageBlueprintSchema } from "../src/lib/schemas/contracts";
import { samplePageBlueprint as safeBlueprint } from "./fixtures/sample-page-blueprint";

test("publication is blocked without active link or destination review", () => {
  const result = evaluatePagePublishability(safeBlueprint, {
    hasCurrentDestinationReview: false,
    ownerOverride: false,
    affiliateLinkActive: false,
    complianceProfileComplete: true,
    programRulesReviewed: true,
    highRiskClaimsApproved: true,
  });
  assert.equal(result.publishable, false);
});

test("publication can proceed when active link, review, and compliance are present", () => {
  const result = evaluatePagePublishability(safeBlueprint, {
    hasCurrentDestinationReview: true,
    ownerOverride: false,
    affiliateLinkActive: true,
    complianceProfileComplete: true,
    programRulesReviewed: true,
    highRiskClaimsApproved: true,
  });
  assert.equal(result.publishable, true);
});

test("page blueprint accepts reviewed Codex-generated hero image metadata", () => {
  const parsed = pageBlueprintSchema.parse({
    ...safeBlueprint,
    hero: {
      ...safeBlueprint.hero,
      visual_asset: {
        asset_type: "codex_generated_image",
        asset_url: "/generated/landing/browse-ai-hero.png",
        alt_text: "Abstract reviewed SaaS workflow dashboard visual",
        prompt_summary: "Codex-generated landing page hero visual for a direct review page.",
        generation_tool: "codex_image_generation",
        approval_status: "approved",
        approved_by_owner: true,
      },
    },
  });

  assert.equal(parsed.hero.visual_asset?.generation_tool, "codex_image_generation");
  assert.equal(parsed.hero.visual_asset?.approval_status, "approved");
});
