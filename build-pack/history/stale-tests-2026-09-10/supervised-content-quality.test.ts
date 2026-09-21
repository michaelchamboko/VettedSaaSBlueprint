import assert from "node:assert/strict";
import test from "node:test";

import { evaluateSupervisedContentQuality } from "@/lib/landing-workflow/quality";

test("quality passes supported claims with disclosure and a limitation", () => {
  const result = evaluateSupervisedContentQuality({
    disclosurePresent: true,
    limitationPresent: true,
    claims: [{ text: "Supports exports", risk: "low", evidence: { claim: "Supports exports", status: "vendor_documented" } }],
  });
  assert.equal(result.status, "pass");
});

test("quality repairs low-risk unsupported claims and blocks high-risk unsupported claims", () => {
  const repair = evaluateSupervisedContentQuality({ disclosurePresent: true, limitationPresent: true, claims: [{ text: "Useful for teams", risk: "low" }] });
  const blocked = evaluateSupervisedContentQuality({ disclosurePresent: true, limitationPresent: true, claims: [{ text: "Cheapest option", risk: "high" }] });
  assert.equal(repair.status, "repair");
  assert.equal(blocked.status, "blocked");
});
