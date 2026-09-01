import assert from "node:assert/strict";
import test from "node:test";

import { ExecutorError, runApprovedExecutor } from "@/lib/landing-research/executor";

test("executor boundary rejects relative and shell-like command paths", async () => {
  await assert.rejects(
    () => runApprovedExecutor("./identity.sh", {}, { timeoutMs: 100, stdoutLimitBytes: 100 }, (value) => value),
    (error: unknown) => error instanceof ExecutorError && error.exitCode === 78,
  );
  await assert.rejects(
    () => runApprovedExecutor("/tmp/identity;touch /tmp/pwned", {}, { timeoutMs: 100, stdoutLimitBytes: 100 }, (value) => value),
    (error: unknown) => error instanceof ExecutorError && error.exitCode === 78,
  );
});
