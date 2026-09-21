import assert from "node:assert/strict";
import test from "node:test";

import { assessAutomaticRelease } from "../src/lib/automation/release-policy";

const fingerprint = "a".repeat(64);
const evidence = { version: 1 as const, outcome: "changed" as const, sourceFingerprint: fingerprint, sourceReferences: ["D05-S-example"], reviewedAt: "2026-09-01T00:00:00.000Z", summary: "A source changed." };
const change = { version: 1 as const, paths: ["/decision-hub"] as const, sourceFingerprint: fingerprint, contentOnly: true, requiresReview: false };

test("structured content with attributable changed, partial, or conflicting evidence is eligible", () => {
  assert.deepEqual(assessAutomaticRelease({
    changedFiles: ["src/content/decision-journeys/five-person-team.json"], evidence, change, killSwitchEnabled: false,
  }), { eligible: true, reasons: [] });
  assert.deepEqual(assessAutomaticRelease({
    changedFiles: ["src/content/decision-journeys/five-person-team.json"], evidence: { ...evidence, outcome: "partial" }, change, killSwitchEnabled: false,
  }), { eligible: true, reasons: [] });
  assert.deepEqual(assessAutomaticRelease({
    changedFiles: ["src/content/decision-journeys/five-person-team.json"], evidence: { ...evidence, outcome: "conflicting" }, change, killSwitchEnabled: false,
  }), { eligible: true, reasons: [] });
});

test("unsafe changes and the kill switch fail closed without treating bounded evidence as a blocker", () => {
  const result = assessAutomaticRelease({
    changedFiles: ["src/app/page.tsx"],
    evidence: { ...evidence, outcome: "blocked" },
    change: { ...change, requiresReview: true },
    killSwitchEnabled: true,
  });
  assert.equal(result.eligible, false);
  assert.deepEqual(result.reasons, ["AUTOMATION_KILL_SWITCH_ENABLED", "EVIDENCE_BLOCKED", "CHANGE_REQUIRES_REVIEW", "OUTSIDE_STRUCTURED_CONTENT_ALLOWLIST"]);
});

test("a truthful no-change result is successful but never deployable", () => {
  const result = assessAutomaticRelease({
    changedFiles: ["src/content/decision-journeys/catalogue.json"],
    evidence: { ...evidence, outcome: "no_change" },
    change,
    killSwitchEnabled: false,
  });
  assert.deepEqual(result, { eligible: false, reasons: ["EVIDENCE_NO_CHANGE"] });
});
