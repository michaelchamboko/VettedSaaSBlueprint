import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

test("affiliate URL intake hands editorial v2 production to Codex without a Hermes draft job", () => {
  const source = readFileSync(
    path.resolve(process.cwd(), "src/lib/admin/affiliate-url-to-draft.ts"),
    "utf8",
  );

  assert.match(source, /design_profile:\s*["']editorial_v2["']/);
  assert.match(source, /review_type:\s*["']CODEX_PRODUCT_PACK_REQUIRED["']/);
  assert.match(source, /original_affiliate_url:\s*input\.partnerstack_url/);
  assert.match(source, /status:\s*["']codex_batch_required["']/);
  assert.doesNotMatch(source, /enqueuePageDraftJob|PAGE_DRAFT_GENERATION/);
});
