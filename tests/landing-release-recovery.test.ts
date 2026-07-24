import assert from "node:assert/strict";
import test from "node:test";

import {
  verifyOrRecoverLandingRelease,
  type LandingReleaseAdapter,
  type ProductionCheck,
} from "@/lib/landing-automation/release";

function fakeAdapter(verifications: ProductionCheck[]) {
  const calls: string[] = [];
  let verificationIndex = 0;
  const adapter: LandingReleaseAdapter = {
    async verifyProduction() {
      calls.push("verify");
      return (
        verifications[Math.min(verificationIndex++, verifications.length - 1)] ??
        { ok: false, summary: "No verification result.", failedLayer: "unknown" }
      );
    },
    async restorePreviousDeployment() {
      calls.push("restore");
      return { ok: true, summary: "Previous production deployment restored." };
    },
    async repairFailedLayer({ failedLayer, attempt }) {
      calls.push(`repair:${failedLayer}:${attempt}`);
      return { ok: true, summary: `${failedLayer} repaired.` };
    },
    async retryRelease(attempt) {
      calls.push(`retry:${attempt}`);
      return { ok: true, summary: "Reviewed release retried." };
    },
  };
  return { adapter, calls };
}

test("a passing production check never exercises rollback", async () => {
  const { adapter, calls } = fakeAdapter([
    { ok: true, summary: "Canonical route passed." },
  ]);

  const result = await verifyOrRecoverLandingRelease(adapter);

  assert.equal(result.status, "LIVE");
  assert.deepEqual(calls, ["verify"]);
});

test("a real production failure restores, repairs, retries, and verifies", async () => {
  const { adapter, calls } = fakeAdapter([
    {
      ok: false,
      summary: "Exact CTA was missing.",
      failedLayer: "public loader",
    },
    { ok: true, summary: "Canonical route and exact CTA passed." },
  ]);

  const result = await verifyOrRecoverLandingRelease(adapter);

  assert.equal(result.status, "LIVE");
  assert.equal(result.attempts, 1);
  assert.deepEqual(calls, [
    "verify",
    "restore",
    "repair:public loader:1",
    "retry:1",
    "verify",
  ]);
});

test("failed restoration stops with recorded NEEDS_HELP evidence", async () => {
  const { adapter, calls } = fakeAdapter([
    {
      ok: false,
      summary: "Production route returned 500.",
      failedLayer: "deployment",
    },
  ]);
  adapter.restorePreviousDeployment = async () => {
    calls.push("restore");
    return { ok: false, summary: "Vercel could not restore the prior deployment." };
  };

  const result = await verifyOrRecoverLandingRelease(adapter);

  assert.equal(result.status, "NEEDS_HELP");
  assert.deepEqual(calls, ["verify", "restore"]);
  assert.match(result.evidence.at(-1)?.outcome ?? "", /could not restore/i);
});
