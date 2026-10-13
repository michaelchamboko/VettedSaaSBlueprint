import assert from "node:assert/strict";
import test from "node:test";

import { landingReleasePreviews } from "@/generated/landing-release-previews";
import { pageBlueprintSchema } from "@/lib/schemas/contracts";

test("release previews are reference-composed candidates", () => {
  assert.deepEqual(
    landingReleasePreviews.map((preview) => preview.slug),
    ["how-can-you-organize-multiple-web-apps-into-dedicated-desktop-workspaces", "how-can-growing-brands-automate-on-brand-email-marketing-journeys", "elevenlabs-ai-voice-generator", "getresponse-marketing-automation"],
  );
  assert.ok(landingReleasePreviews.every((preview) => preview.blueprint.metadata.design_profile === "reference_composed_v1"));
});

test("the ElevenLabs preview preserves the actual supplied href", () => {
  const preview = landingReleasePreviews.find(
    (candidate) => candidate.slug === "elevenlabs-ai-voice-generator",
  );
  assert.ok(preview);
  assert.equal(preview.affiliate_url, "https://try.elevenlabs.io/izj2b165mcsj");
});

test("the GetResponse preview preserves the exact approved tracking URL", () => {
  const preview = landingReleasePreviews.find(
    (candidate) => candidate.slug === "getresponse-marketing-automation",
  );
  assert.ok(preview);
  assert.equal(preview.affiliate_url, "https://try.getresponsetoday.com/smypvzu98eko-kfze15");
});

test("the GetResponse preview blueprint satisfies the page contract", () => {
  const preview = landingReleasePreviews.find(
    (candidate) => candidate.slug === "getresponse-marketing-automation",
  );
  assert.ok(preview);
  assert.doesNotThrow(() => pageBlueprintSchema.parse(preview.blueprint));
});
