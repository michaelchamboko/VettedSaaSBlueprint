import assert from "node:assert/strict";
import test from "node:test";

import {
  getEditorialV2Preview,
  listEditorialV2PreviewSlugs,
} from "@/lib/generated/editorial-v2-previews";

test("the requested working affiliate sources have editorial v2 preview records", () => {
  const expected = [
    "adcreative-ai-creative-review-signal",
    "carepatron-practice-workflow-review",
    "datahawk-amazon-profitability-review",
    "elevenlabs-recurring-narration-review",
    "snowfire-executive-metrics-review",
  ];

  assert.deepEqual(listEditorialV2PreviewSlugs(), expected);

  for (const slug of expected) {
    const preview = getEditorialV2Preview(slug);
    assert.ok(preview);
    assert.equal(preview.design_profile, "editorial_v2");
    assert.equal(preview.robots, "noindex,nofollow");
    assert.match(preview.affiliate_url, /^https:\/\//);
    assert.ok(preview.answer_snippet.split(/\s+/).length >= 40);
    assert.ok(preview.answer_snippet.split(/\s+/).length <= 60);
    assert.ok(preview.short_disclosure.length > 0);
    assert.ok(preview.benefits.length >= 2);
    assert.ok(preview.limitations.length >= 1);
    assert.ok(preview.faq.length >= 4);
  }
});

test("the ElevenLabs preview preserves the actual supplied href", () => {
  const preview = getEditorialV2Preview("elevenlabs-recurring-narration-review");
  assert.ok(preview);
  assert.equal(preview.affiliate_url, "https://try.elevenlabs.io/izj2b165mcsj");
});
