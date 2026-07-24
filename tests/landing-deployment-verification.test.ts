import assert from "node:assert/strict";
import test from "node:test";

import {
  landingSnapshotFailures,
  type LandingBrowserSnapshot,
} from "../scripts/verify-landing-deployment";

const passingSnapshot: LandingBrowserSnapshot = {
  httpOk: true,
  disclosureOk: true,
  exactCtaCount: 2,
  allCtasExact: true,
  ctasFitViewport: true,
  allRevealSectionsVisible: true,
  horizontalPageScrollPossible: false,
  robots: "index, follow",
  errorOverlay: false,
  browserErrors: [],
};

test("live snapshot passes only with the exact CTA and complete browser evidence", () => {
  assert.deepEqual(landingSnapshotFailures(passingSnapshot), []);
});

test("live snapshot reports concrete failures instead of marking a deployment successful", () => {
  const failures = landingSnapshotFailures({
    ...passingSnapshot,
    allCtasExact: false,
    horizontalPageScrollPossible: true,
    browserErrors: ["ReferenceError: failed"],
  });

  assert.equal(failures.length, 3);
  assert.match(failures.join("\n"), /exact supplied URL/i);
  assert.match(failures.join("\n"), /horizontal scrolling/i);
  assert.match(failures.join("\n"), /ReferenceError: failed/);
});
