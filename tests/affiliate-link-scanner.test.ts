import assert from "node:assert/strict";
import test from "node:test";

import { buildLandingStaticReport } from "../scripts/scan-landing-static.mjs";

test("link scan accepts the approved first-party affiliate redirect in both renderers", () => {
  const report = buildLandingStaticReport("links");
  assert.equal(report.status, "pass", JSON.stringify(report.issues));
});
