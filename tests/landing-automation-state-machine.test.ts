import assert from "node:assert/strict";
import test from "node:test";

import {
  canTransitionAutomationRun,
  nextAutomationState,
} from "@/lib/landing-automation/state-machine";

test("automation state machine permits only resumable forward transitions", () => {
  assert.equal(canTransitionAutomationRun("queued", "researching"), true);
  assert.equal(canTransitionAutomationRun("researching", "authoring"), true);
  assert.equal(canTransitionAutomationRun("quality_review", "publication_gate"), true);
  assert.equal(canTransitionAutomationRun("publication_gate", "release_pr"), true);
  assert.equal(canTransitionAutomationRun("release_pr", "deploying"), true);
  assert.equal(canTransitionAutomationRun("published", "authoring"), false);
});

test("blocked and retryable errors preserve a deterministic recovery state", () => {
  assert.equal(nextAutomationState("researching", { kind: "transient_failure" }), "queued");
  assert.equal(nextAutomationState("quality_review", { kind: "gate_failed" }), "blocked");
  assert.equal(nextAutomationState("release_pr", { kind: "release_merged" }), "deploying");
});

test("publication requires deployment verification after merge", () => {
  assert.equal(nextAutomationState("release_pr", { kind: "release_merged" }), "deploying");
  assert.throws(
    () => nextAutomationState("release_pr", { kind: "deployment_verified" as const }),
    /Invalid automation transition/,
  );
});

test("release_pr_opened is emitted from publication_gate exactly once", () => {
  assert.equal(nextAutomationState("publication_gate", { kind: "release_pr_opened" }), "release_pr");
  assert.throws(
    () => nextAutomationState("release_pr", { kind: "release_pr_opened" }),
    /Invalid automation transition/,
  );
});

test("deploying requires deployment verification", () => {
  assert.equal(nextAutomationState("deploying", { kind: "deployment_verified" }), "published");
});
