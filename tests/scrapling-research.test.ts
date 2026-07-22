import assert from "node:assert/strict";
import test from "node:test";
import { completeScraplingRun, createScraplingRunPlan, validateScraplingPolicy } from "../src/lib/research/scrapling";

test("scrapling policy validates crawl safety", () => {
  const result = validateScraplingPolicy({ robots: true, rate_limit_per_minute: 10, depth: 2, mode: "static" });
  assert.equal(result.valid, true);
});

test("scrapling run plan starts queued and can complete", () => {
  const plan = createScraplingRunPlan("https://example.com", "manual_note", { robots: true, rate_limit_per_minute: 10, depth: 1, mode: "browser" });
  const completed = completeScraplingRun(plan);
  assert.equal(completed.status, "completed");
});
