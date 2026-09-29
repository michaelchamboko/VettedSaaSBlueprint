import assert from "node:assert/strict";
import test from "node:test";

import { productionQualityReceiptV2Schema } from "../src/lib/automation/contracts";
import { headlineStepCountMatches } from "../scripts/verify-decision-journey-production";

test("headline step-count semantics catch the Solution Hub mismatch", () => {
  assert.equal(headlineStepCountMatches("A six-step path from shared passwords", 7), false);
  assert.equal(headlineStepCountMatches("A seven-step path from shared passwords", 7), true);
  assert.equal(headlineStepCountMatches("A 7-step path from shared passwords", 7), true);
  assert.equal(headlineStepCountMatches("Should a five-person business move shared logins?", 7), true);
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
