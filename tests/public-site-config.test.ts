import assert from "node:assert/strict";
import test from "node:test";

import {
  assertGitBackedProductionDeployment,
  assertPublicLaunchReady,
  getPublicLaunchBlockers,
  loadPublicSiteConfig,
  publicSiteMetadata,
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

test("public metadata includes the Google site verification token", () => {
  const metadata = publicSiteMetadata(loadPublicSiteConfig(readyEnv));

  assert.equal(
    metadata.verification?.google,
    "yXL5P6NXRbp4b0oDBYQe1b-UWD0B6Jj9cBeFpLosONQ",
  );
});

test("production builds require clean main Git provenance", () => {
  assert.throws(
    () => assertGitBackedProductionDeployment({ VERCEL_ENV: "production" }),
    /VERCEL_GIT_COMMIT_SHA/,
  );
  assert.throws(
    () =>
      assertGitBackedProductionDeployment({
        VERCEL_ENV: "production",
        VERCEL_GIT_COMMIT_REF: "codex/daily-saas-blog",
        VERCEL_GIT_COMMIT_SHA: "d7c333d8ae224a79d9da42ef9c09bf45500d1060",
      }),
    /main/,
  );

  assert.doesNotThrow(() =>
    assertGitBackedProductionDeployment({ VERCEL_ENV: "preview" }),
  );
  assert.doesNotThrow(() =>
    assertGitBackedProductionDeployment({
      VERCEL_ENV: "production",
      VERCEL_GIT_COMMIT_REF: "main",
      VERCEL_GIT_COMMIT_SHA: "d7629784f22332872db7995d8522e7245c70abfc",
    }),
  );
});
