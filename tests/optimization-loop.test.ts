import assert from "node:assert/strict";
import test from "node:test";
import { defaultLowRiskUpdateEnabled, generateDailyRecommendations } from "../src/lib/optimization/recommendations";

test("low engagement produces review recommendations", () => {
  const recommendations = generateDailyRecommendations({ page_views: 100, cta_clicks: 1, affiliate_clicks: 0, link_errors: 0, faq_expands: 30 });
  assert.ok(recommendations.length >= 1);
});

test("default low-risk updates stay disabled unless explicitly enabled", () => {
  assert.equal(defaultLowRiskUpdateEnabled(false), false);
  assert.equal(defaultLowRiskUpdateEnabled(true), true);
});
