import assert from "node:assert/strict";
import test from "node:test";

import { assertSafePublicHttpsUrl, assertSafeRedirectChain } from "@/lib/landing-research/network-safety";

test("network safety rejects private resolutions", async () => {
  await assert.rejects(
    () => assertSafePublicHttpsUrl("https://example.com", async () => [{ address: "127.0.0.1", family: 4 }]),
    /private or reserved/,
  );
});

test("network safety rejects insecure redirect chains", () => {
  assert.throws(() => assertSafeRedirectChain(["http://example.com"]), /unsafe URL/);
  assert.throws(() => assertSafeRedirectChain(Array.from({ length: 6 }, () => "https://example.com")), /maximum depth/);
});
