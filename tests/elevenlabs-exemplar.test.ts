import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { productEvidencePackV1Schema } from "@/lib/codex-batches/contracts";
import { pageBlueprintSchema } from "@/lib/schemas/contracts";

const slug = "elevenlabs-ai-voice-generator";
const exactUrl = "https://try.elevenlabs.io/izj2b165mcsj";

async function json(relativePath: string): Promise<unknown> {
  return JSON.parse(await readFile(path.resolve(relativePath), "utf8"));
}

test("ElevenLabs exemplar is a valid evidence-backed reference-composed page", async () => {
  const page = pageBlueprintSchema.parse(
    await json(`src/generated/landing-pages/${slug}.json`),
  );
  const evidence = productEvidencePackV1Schema.parse(
    await json(
      `src/generated/landing-pages/releases/${slug}/product-evidence.json`,
    ),
  );

  assert.equal(page.metadata.design_profile, "reference_composed_v1");
  assert.equal(page.metadata.url_slug, slug);
  assert.equal(page.metadata.robots, "index,follow");
  assert.equal(
    page.hero.primary_cta_link_id,
    page.cta_blocks[0].affiliate_link_id,
  );
  assert.equal(evidence.affiliate.original_url, exactUrl);
  assert.equal(evidence.affiliate.destination_review.state, "reviewed");
  assert.equal(evidence.review_basis.basis, "vendor_docs");
  assert.equal(page.presentation?.reference_ids.length, 3);
  assert.ok(
    (page.hero.answer_snippet?.trim().split(/\s+/).length ?? 0) >= 40,
  );
});

test("ElevenLabs public copy omits unsupported commercial and ranking claims", async () => {
  const pageSource = await readFile(
    path.resolve(`src/generated/landing-pages/${slug}.json`),
    "utf8",
  );
  assert.doesNotMatch(
    pageSource,
    /\b(?:discount|free trial|guarantee|refund|best|#1|number one)\b/i,
  );
});
