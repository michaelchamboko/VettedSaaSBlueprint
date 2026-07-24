import assert from "node:assert/strict";
import test from "node:test";

import {
  assertPublicLaunchReady,
  getPublicLaunchBlockers,
  loadPublicSiteConfig,
} from "../src/lib/site/public-site";

const readyEnv = {
  PUBLIC_POLICY_EFFECTIVE_DATE: "2026-07-10",
  INFORMATION_OFFICER_REGISTRATION_CONFIRMED_AT: "2026-07-10T08:00:00.000Z",
};

test("the public profile uses the approved sole-proprietor identity", () => {
  const config = loadPublicSiteConfig(readyEnv);

  assert.equal(config.brandName, "VettedSaaSBlueprint");
  assert.equal(config.operator.structure, "sole_proprietor");
  assert.equal(config.operator.tradingName, "VettedSaaSBlueprint");
  assert.equal(config.operator.registrationNumber, null);
  assert.equal(config.operator.publicEmail, "vettedsaasblueprint@proton.me");
  assert.equal(config.operator.phone, null);
  assert.deepEqual(config.operator.address, {
    line1: "3 Wagner Lane",
    suburb: "Sagewood",
    city: "Johannesburg",
    province: "Gauteng",
    country: "South Africa",
  });
});

test("policy dates are real calendar dates and review one year later", () => {
  const config = loadPublicSiteConfig(readyEnv);
  assert.equal(config.policies.effectiveDate, "2026-07-10");
  assert.equal(config.policies.reviewDate, "2027-07-10");

  assert.deepEqual(
    getPublicLaunchBlockers(
      loadPublicSiteConfig({
        ...readyEnv,
        PUBLIC_POLICY_EFFECTIVE_DATE: "2026-02-30",
      }),
    ),
    ["PUBLIC_POLICY_EFFECTIVE_DATE must be a valid ISO date."],
  );
});

test("release readiness requires the policy date and Information Officer confirmation", () => {
  const config = loadPublicSiteConfig({});
  assert.deepEqual(getPublicLaunchBlockers(config), [
    "PUBLIC_POLICY_EFFECTIVE_DATE must be a valid ISO date.",
    "INFORMATION_OFFICER_REGISTRATION_CONFIRMED_AT must be a valid ISO timestamp.",
  ]);
  assert.throws(() => assertPublicLaunchReady(config), /PUBLIC_POLICY_EFFECTIVE_DATE[\s\S]*INFORMATION_OFFICER/);
});

test("analytics stays disabled until retention verification is valid", () => {
  const unverified = loadPublicSiteConfig({ ...readyEnv, ANALYTICS_ENABLED: "true" });
  const verified = loadPublicSiteConfig({
    ...readyEnv,
    ANALYTICS_ENABLED: "true",
    ANALYTICS_RETENTION_VERIFIED_AT: "2026-07-10T09:00:00.000Z",
  });

  assert.equal(unverified.analytics.enabled, false);
  assert.equal(verified.analytics.enabled, true);
  assert.equal(verified.analytics.rawEventRetentionDays, 90);
  assert.equal(verified.analytics.aggregateRetentionMonths, 24);
});

test("canonical origin is HTTPS and normalized", () => {
  assert.equal(
    loadPublicSiteConfig({
      ...readyEnv,
      PUBLIC_SITE_ORIGIN: "https://example.com/path/",
    }).canonicalOrigin,
    "https://example.com",
  );

  assert.ok(
    getPublicLaunchBlockers(
      loadPublicSiteConfig({ ...readyEnv, PUBLIC_SITE_ORIGIN: "http://example.com" }),
    ).some((blocker) => blocker.includes("HTTPS origin")),
  );
});
