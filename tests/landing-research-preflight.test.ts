import assert from "node:assert/strict";
import test from "node:test";

import { inspectLandingResearchPreflight } from "@/lib/landing-automation/research-preflight";

const approvedUrls = `
- https://partner.example.com/product?ref=exact-value
- https://partner.example.com/second?campaign=exact-value
`;

test("controller preflight is ready only when Neon control authority and a durable worker capability are available", () => {
  const result = inspectLandingResearchPreflight(approvedUrls, {
    LANDING_CONTROL_DATABASE_URL: "postgresql://control-secret",
  }, {
    LANDING_CONTROL_DATABASE_URL: true,
    WORKER_CAPABILITY: true,
  });

  assert.equal(result.status, "ready");
  assert.equal(result.urlCount, 2);
  assert.deepEqual(result.blockers, []);
  assert.equal(result.configuration[0]?.configured, true);
});

test("research preflight reports exact missing configuration names without exposing configured values", () => {
  const result = inspectLandingResearchPreflight(approvedUrls, {
    LANDING_CONTROL_DATABASE_URL: "postgresql://must-not-appear",
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.status, "blocked");
  assert.deepEqual(result.blockers, [
    "LANDING_CONTROL_DATABASE_URL has not passed its authority probe.",
    "Oracle Hermes worker capability is unavailable or stale.",
  ]);
  assert.doesNotMatch(serialized, /postgresql:\/\//);
  assert.doesNotMatch(serialized, /must-not-appear/);
});

test("controller preflight refuses configured control authority and stale worker capability", () => {
  const result = inspectLandingResearchPreflight(approvedUrls, {
    LANDING_CONTROL_DATABASE_URL: "postgresql://control",
  });

  assert.equal(result.status, "blocked");
  assert.equal(result.blockers.length, 2);
  assert.ok(result.blockers.some((blocker) => blocker.includes("authority probe")));
  assert.ok(result.blockers.some((blocker) => blocker.includes("worker capability")));
});

test("research preflight blocks an empty authorization manifest", () => {
  const result = inspectLandingResearchPreflight("# No approved URLs\n", {});

  assert.equal(result.status, "blocked");
  assert.equal(result.urlCount, 0);
  assert.equal(result.blockers[0], "approved-urls.md contains no authorized URLs.");
});
