import assert from "node:assert/strict";
import test from "node:test";

import { inspectLandingResearchPreflight } from "@/lib/landing-automation/research-preflight";

const approvedUrls = `
- https://partner.example.com/product?ref=exact-value
- https://partner.example.com/second?campaign=exact-value
`;

test("research preflight is ready only when Neon and both approved Hermes executors are configured", () => {
  const result = inspectLandingResearchPreflight(approvedUrls, {
    LANDING_CONTROL_DATABASE_URL: "postgresql://control-secret",
    LANDING_AUTOMATION_DATABASE_URL: "postgresql://worker-secret",
    HERMES_PRODUCT_IDENTITY_COMMAND: "C:\\approved\\product-identity.exe",
    HERMES_LANDING_RESEARCH_COMMAND: "C:\\approved\\landing-research.exe",
  }, {
    LANDING_CONTROL_DATABASE_URL: true,
    LANDING_AUTOMATION_DATABASE_URL: true,
    HERMES_PRODUCT_IDENTITY_COMMAND: true,
    HERMES_LANDING_RESEARCH_COMMAND: true,
  });

  assert.equal(result.status, "ready");
  assert.equal(result.urlCount, 2);
  assert.deepEqual(result.blockers, []);
  assert.equal(result.configuration.every((item) => item.configured), true);
});

test("research preflight reports exact missing configuration names without exposing configured values", () => {
  const result = inspectLandingResearchPreflight(approvedUrls, {
    LANDING_CONTROL_DATABASE_URL: "postgresql://must-not-appear",
    LANDING_AUTOMATION_DATABASE_URL: " ",
    HERMES_PRODUCT_IDENTITY_COMMAND: "C:\\must-not-appear\\identity.exe",
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.status, "blocked");
  assert.deepEqual(result.blockers, [
    "LANDING_CONTROL_DATABASE_URL has not passed its authority probe.",
    "LANDING_AUTOMATION_DATABASE_URL is missing.",
    "HERMES_PRODUCT_IDENTITY_COMMAND has not passed its authority probe.",
    "HERMES_LANDING_RESEARCH_COMMAND is missing.",
  ]);
  assert.doesNotMatch(serialized, /postgresql:\/\//);
  assert.doesNotMatch(serialized, /must-not-appear/);
});

test("research preflight refuses configured authorities that have not passed probes", () => {
  const result = inspectLandingResearchPreflight(approvedUrls, {
    LANDING_CONTROL_DATABASE_URL: "postgresql://control",
    LANDING_AUTOMATION_DATABASE_URL: "postgresql://worker",
    HERMES_PRODUCT_IDENTITY_COMMAND: "C:\\approved\\identity.exe",
    HERMES_LANDING_RESEARCH_COMMAND: "C:\\approved\\research.exe",
  });

  assert.equal(result.status, "blocked");
  assert.equal(result.blockers.length, 4);
  assert.ok(result.blockers.every((blocker) => blocker.includes("authority probe")));
});

test("research preflight blocks an empty authorization manifest", () => {
  const result = inspectLandingResearchPreflight("# No approved URLs\n", {});

  assert.equal(result.status, "blocked");
  assert.equal(result.urlCount, 0);
  assert.equal(result.blockers[0], "approved-urls.md contains no authorized URLs.");
});
