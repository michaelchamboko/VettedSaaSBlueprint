import assert from "node:assert/strict";
import test from "node:test";

import { productionQualityReceiptV2Schema } from "../src/lib/automation/contracts";
import { deploymentIdentityMatches, expectedProductionRoutes, headlineStepCountMatches } from "../scripts/verify-decision-journey-production";

test("headline step-count semantics catch the Solution Hub mismatch", () => {
  assert.equal(headlineStepCountMatches("A six-step path from shared passwords", 7), false);
  assert.equal(headlineStepCountMatches("A seven-step path from shared passwords", 7), true);
  assert.equal(headlineStepCountMatches("A 7-step path from shared passwords", 7), true);
  assert.equal(headlineStepCountMatches("Should a five-person business move shared logins?", 7), true);
});

test("deployment identity verification fails closed on missing, fake, stale, and mismatched metadata", () => {
  const revision = "a".repeat(40);
  // Valid identity passes.
  assert.equal(deploymentIdentityMatches({ commitSha: revision, environment: "production" }, revision).passed, true);
  // Missing commit SHA or environment fails.
  assert.equal(deploymentIdentityMatches({ commitSha: null, environment: "production" }, revision).passed, false);
  assert.equal(deploymentIdentityMatches({ commitSha: revision, environment: null }, revision).passed, false);
  // A supplied SHA that does not match the deployed SHA (fake or stale) fails.
  assert.equal(deploymentIdentityMatches({ commitSha: "b".repeat(40), environment: "production" }, revision).passed, false);
  // A matching SHA on a non-production environment fails.
  assert.equal(deploymentIdentityMatches({ commitSha: revision, environment: "preview" }, revision).passed, false);
  assert.equal(deploymentIdentityMatches({ commitSha: revision, environment: "local" }, revision).passed, false);
});

test("expected production routes derive from the catalogue and published decision sets, not a hardcoded list", () => {
  const routes = expectedProductionRoutes();
  // Homepage plus the three pilot routes are always in scope.
  assert.ok(routes.includes("/"));
  assert.ok(routes.includes("/decision-hub"));
  assert.ok(routes.includes("/solution-hub"));
  assert.ok(routes.includes("/scenarios"));
  // Every published set contributes exactly three routes.
  const setRoutes = routes.filter((route) => route.startsWith("/decision-hub/") || route.startsWith("/solution-hub/") || route.startsWith("/scenarios/"));
  assert.equal(setRoutes.length % 3, 0);
  for (const route of setRoutes) {
    assert.ok(/^\/(decision-hub|solution-hub|scenarios)\/[a-z0-9-]+$/.test(route), `unexpected route shape: ${route}`);
  }
  // Routes are unique.
  assert.equal(new Set(routes).size, routes.length);
});

test("production-quality receipts require the exact revision and catalogue fingerprint", () => {
  const receipt = {
    version: 2,
    runId: "00000000-0000-4000-8000-000000000000",
    passed: true,
    checks: [{ name: "content", passed: true, detail: "ok", category: "content" }],
    screenshots: [],
    createdAt: "2026-09-29T00:00:00.000Z",
    revision: "a".repeat(40),
    catalogueFingerprint: "b".repeat(64),
  };

  assert.equal(productionQualityReceiptV2Schema.safeParse(receipt).success, true);
  const legacyReceipt = { ...receipt };
  delete (legacyReceipt as Partial<typeof receipt>).revision;
  delete (legacyReceipt as Partial<typeof receipt>).catalogueFingerprint;
  assert.equal(productionQualityReceiptV2Schema.safeParse(legacyReceipt).success, false);
  assert.equal(productionQualityReceiptV2Schema.safeParse({ ...receipt, revision: "old" }).success, false);
  assert.equal(productionQualityReceiptV2Schema.safeParse({ ...receipt, catalogueFingerprint: "old" }).success, false);
});
