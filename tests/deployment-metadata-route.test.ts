import assert from "node:assert/strict";
import test from "node:test";

import { deploymentMetadata } from "../src/lib/site/deployment-metadata";

test("deployment metadata rejects blank provenance and preserves a reviewed SHA", () => {
  assert.deepEqual(
    deploymentMetadata({ VERCEL_ENV: "production", VERCEL_GIT_COMMIT_SHA: "" }),
    { commitSha: null, environment: "production" },
  );
  assert.deepEqual(
    deploymentMetadata({
      VERCEL_ENV: "production",
      VERCEL_GIT_COMMIT_SHA: "c8021c5cd9da82d106da2f2dca8e6060a51998c2",
    }),
    {
      commitSha: "c8021c5cd9da82d106da2f2dca8e6060a51998c2",
      environment: "production",
    },
  );
});
