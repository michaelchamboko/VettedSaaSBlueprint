import assert from "node:assert/strict";
import test from "node:test";

import { ExecutorError, resolveApprovedExecutorInvocation, runApprovedExecutor } from "@/lib/landing-research/executor";

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

test("executor boundary runs absolute .mjs bundles through the Node interpreter", () => {
  const invocation = resolveApprovedExecutorInvocation("/opt/vettedsaas/current/hermes-product-identity.mjs");

  assert.equal(invocation.command, process.execPath);
  assert.deepEqual(invocation.args, ["/opt/vettedsaas/current/hermes-product-identity.mjs"]);
});

test("executor boundary keeps approved absolute binaries direct and shell-free", () => {
  const invocation = resolveApprovedExecutorInvocation("/opt/vettedsaas/current/hermes-product-identity");

  assert.equal(invocation.command, "/opt/vettedsaas/current/hermes-product-identity");
  assert.deepEqual(invocation.args, []);
});
