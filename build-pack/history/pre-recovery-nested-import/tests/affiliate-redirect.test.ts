import assert from "node:assert/strict";
import test from "node:test";
import { resolveAffiliateRedirect } from "../src/lib/tracking/affiliate-redirect";

test("affiliate redirect falls back to unavailable page when missing url", () => {
  const url = resolveAffiliateRedirect(null, "https://example.com");
  assert.equal(url.pathname, "/affiliate-link-unavailable");
});

test("affiliate redirect preserves the original partnerstack url", () => {
  const url = resolveAffiliateRedirect("https://partnerstack.com/redirect/example", "https://example.com");
  assert.equal(url.toString(), "https://partnerstack.com/redirect/example");
});
