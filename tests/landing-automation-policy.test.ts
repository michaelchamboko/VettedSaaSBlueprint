import assert from "node:assert/strict";
import test from "node:test";

import { evaluateUnattendedPublication } from "@/lib/landing-automation/publication-policy";

const passingInput = {
  allowlisted: true,
  artifact: { hasPlaceholderIds: false, hasResolvedEvidence: true, hasReviewedCtaMapping: true },
  compliance: { status: "pass" as const },
  evidence: { status: "pass" as const },
  limits: { dailyPublicationCount: 0, dailyPublicationLimit: 10 },
  runtime: { killSwitchEnabled: false },
};

test("unattended publication permits only a complete independent pass", () => {
  assert.deepEqual(evaluateUnattendedPublication(passingInput), {
    publishable: true,
    reasons: [],
  });
});

test("unattended publication remains blocked when any independent gate is not proven", () => {
  const failed = evaluateUnattendedPublication({
    ...passingInput,
    artifact: { ...passingInput.artifact, hasResolvedEvidence: false },
    compliance: { status: "unknown" },
    evidence: { status: "unknown" },
    limits: { dailyPublicationCount: 10, dailyPublicationLimit: 10 },
    runtime: { killSwitchEnabled: true },
  });

  assert.equal(failed.publishable, false);
  assert.deepEqual(failed.reasons, [
    "AUTOMATION_KILL_SWITCH_ENABLED",
    "COMPLIANCE_NOT_PASS",
    "EVIDENCE_NOT_PASS",
    "ARTIFACT_EVIDENCE_UNRESOLVED",
    "DAILY_PUBLICATION_CAP_REACHED",
  ]);
});
