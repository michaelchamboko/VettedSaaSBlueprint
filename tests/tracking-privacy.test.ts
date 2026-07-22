import assert from "node:assert/strict";
import test from "node:test";

import { analyticsAllowedByPrivacySignals, publicTrackingAllowed } from "../src/lib/tracking/privacy";

const enabledConfig = { analytics: { enabled: true } } as Parameters<typeof publicTrackingAllowed>[1];

test("browser privacy signals disable application analytics", () => {
  assert.equal(analyticsAllowedByPrivacySignals({ globalPrivacyControl: true }), false);
  assert.equal(analyticsAllowedByPrivacySignals({ doNotTrack: "1" }), false);
  assert.equal(analyticsAllowedByPrivacySignals({ doNotTrack: "0" }), true);
});

test("server tracking requires enablement and respects GPC and DNT", () => {
  assert.equal(publicTrackingAllowed(new Request("https://example.com"), { analytics: { enabled: false } } as Parameters<typeof publicTrackingAllowed>[1]), false);
  assert.equal(publicTrackingAllowed(new Request("https://example.com", { headers: { "Sec-GPC": "1" } }), enabledConfig), false);
  assert.equal(publicTrackingAllowed(new Request("https://example.com", { headers: { DNT: "1" } }), enabledConfig), false);
  assert.equal(publicTrackingAllowed(new Request("https://example.com"), enabledConfig), true);
});
