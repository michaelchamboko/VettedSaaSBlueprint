import assert from "node:assert/strict";
import test from "node:test";
import { canHeartbeat, completeJobStatus, isClaimable, nextFailureState } from "../src/lib/hermes/jobs";

test("queued jobs are claimable", () => {
  assert.equal(isClaimable("queued", null), true);
});

test("stale running jobs are claimable", () => {
  const stale = new Date(Date.now() - 16 * 60 * 1000);
  assert.equal(isClaimable("running", stale), true);
});

test("fresh running jobs are not claimable", () => {
  const fresh = new Date(Date.now() - 5 * 60 * 1000);
  assert.equal(isClaimable("running", fresh), false);
});

test("heartbeat only applies to running jobs", () => {
  assert.equal(canHeartbeat("running"), true);
  assert.equal(canHeartbeat("queued"), false);
});

test("job failure escalates after retry limit", () => {
  assert.equal(nextFailureState(0), "queued");
  assert.equal(nextFailureState(3), "failed");
});

test("completed state is stable", () => {
  assert.equal(completeJobStatus(), "completed");
});
