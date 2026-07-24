import assert from "node:assert/strict";
import test from "node:test";

import { landingReleasePreviews } from "@/generated/landing-release-previews";

test("the active release preview is a reference-composed candidate", () => {
  assert.deepEqual(
    landingReleasePreviews.map((preview) => preview.slug),
    ["elevenlabs-ai-voice-generator"],
  );
  assert.equal(
    landingReleasePreviews[0]?.blueprint.metadata.design_profile,
    "reference_composed_v1",
  );
});

test("the ElevenLabs preview preserves the actual supplied href", () => {
  const preview = landingReleasePreviews.find(
    (candidate) => candidate.slug === "elevenlabs-ai-voice-generator",
  );
  assert.ok(preview);
  assert.equal(preview.affiliate_url, "https://try.elevenlabs.io/izj2b165mcsj");
});
