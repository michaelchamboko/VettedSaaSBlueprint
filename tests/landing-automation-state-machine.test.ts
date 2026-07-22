import assert from "node:assert/strict";
import test from "node:test";

import {
  canTransitionAutomationRun,
  nextAutomationState,
} from "@/lib/landing-automation/state-machine";

test("automation state machine permits only resumable forward transitions", () => {
  assert.equal(canTransitionAutomationRun("queued", "researching"), true);
  assert.equal(canTransitionAutomationRun("researching", "drafting"), true);
  assert.equal(canTransitionAutomationRun("quality_review", "release_pr"), true);
  assert.equal(canTransitionAutomationRun("release_pr", "published"), true);
  assert.equal(canTransitionAutomationRun("published", "drafting"), false);
});

test("blocked and retryable errors preserve a deterministic recovery state", () => {
  assert.equal(nextAutomationState("researching", { kind: "transient_failure" }), "queued");
  assert.equal(nextAutomationState("quality_review", { kind: "gate_failed" }), "blocked");
  assert.equal(nextAutomationState("release_pr", { kind: "release_merged" }), "published");
});
