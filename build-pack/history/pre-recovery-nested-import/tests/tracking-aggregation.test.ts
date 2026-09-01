import assert from "node:assert/strict";
import test from "node:test";
import { buildDailyMetrics, countEventType } from "../src/lib/tracking/aggregation";

test("tracking aggregation builds daily metrics", () => {
  const metrics = buildDailyMetrics({ page_views: 10, cta_clicks: 2, affiliate_clicks: 1, link_errors: 0, faq_expands: 3 });
  assert.equal(metrics.page_views, 10);
});

test("event counters count matching types", () => {
  const count = countEventType("cta_click", [{ event_type: "page_view" }, { event_type: "cta_click" }]);
  assert.equal(count, 1);
});
