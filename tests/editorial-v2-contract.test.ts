import assert from "node:assert/strict";
import test from "node:test";

import { isEditorialV2Blueprint, validateEditorialV2Copy } from "../src/lib/landing/editorial-v2";
import { pageBlueprintSchema } from "../src/lib/schemas/contracts";
import { samplePageBlueprint } from "./fixtures/sample-page-blueprint";

test("legacy blueprints default to the legacy design profile", () => {
  const existingFixtureWithoutDesignProfile = {
    ...samplePageBlueprint,
    metadata: { ...samplePageBlueprint.metadata },
  };
  Reflect.deleteProperty(existingFixtureWithoutDesignProfile.metadata, "design_profile");

  const blueprint = pageBlueprintSchema.parse(existingFixtureWithoutDesignProfile);

  assert.equal(blueprint.metadata.design_profile, "legacy");
  assert.equal(isEditorialV2Blueprint(blueprint), false);
});

test("editorial v2 blueprints are identified only by the future profile", () => {
  const blueprint = pageBlueprintSchema.parse({
    ...samplePageBlueprint,
    metadata: { ...samplePageBlueprint.metadata, design_profile: "editorial_v2" },
  });

  assert.equal(isEditorialV2Blueprint(blueprint), true);
});

test("editorial v2 copy requires a 40 to 60 word answer and short CTA", () => {
  assert.deepEqual(
    validateEditorialV2Copy({
      answerSnippet: "one two",
      ctaLabel: "This CTA label is intentionally too long",
    }),
    {
      valid: false,
      reasonCodes: ["answer_snippet_word_count", "cta_label_too_long"],
    },
  );
});
