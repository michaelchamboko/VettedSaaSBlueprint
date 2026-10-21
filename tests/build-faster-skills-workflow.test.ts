import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

test("Build Faster Skills workflow contract is intact", () => {
  const result = spawnSync(process.execPath, ["scripts/verify-agent-workflow.mjs"], { encoding: "utf8" });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});
