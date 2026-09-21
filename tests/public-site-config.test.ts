import assert from "node:assert/strict";
import test from "node:test";

import {
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
test("configured policy dates derive a review date one year later", () => {
  const config = loadPublicSiteConfig(readyEnv);
  assert.equal(config.policies.effectiveDate, "2026-07-10");
  assert.equal(config.policies.reviewDate, "2027-07-10");

  assert.equal(
    loadPublicSiteConfig({ PUBLIC_POLICY_EFFECTIVE_DATE: "2026-02-30" }).policies.reviewDate,
    "",
  );
});
test("release readiness does not repeat production legal-metadata approval", () => {
  const config = loadPublicSiteConfig({});
  assert.deepEqual(getPublicLaunchBlockers(config), []);
  assert.doesNotThrow(() => assertPublicLaunchReady(config));
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
