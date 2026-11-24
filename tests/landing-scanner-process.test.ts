import assert from "node:assert/strict";
import test from "node:test";

// @ts-expect-error Plain ESM helper is exercised through its runtime exports.
import { parseJsonObject, runProcess } from "../scripts/landing-scanner-process.mjs";

test("parseJsonObject accepts objects and rejects other JSON values", () => {
  assert.deepEqual(parseJsonObject('{"status":"pass"}'), { status: "pass" });
  assert.equal(parseJsonObject(""), null);
  assert.equal(parseJsonObject("   "), null);
  assert.equal(parseJsonObject("not json"), null);
  assert.equal(parseJsonObject("[1,2,3]"), null);
  assert.equal(parseJsonObject("42"), null);
  assert.equal(parseJsonObject("null"), null);
});

test("runProcess reports spawn failures as structured results", async () => {
  const result = await runProcess("definitely-not-a-real-command-12345", []);
  assert.equal(result.exitCode, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /.+/);
});

test("runProcess collects stdout and exit code on success", async () => {
  const result = await runProcess(process.execPath, ["-e", "process.stdout.write(JSON.stringify({ok:true}))"]);
  assert.equal(result.exitCode, 0);
  assert.deepEqual(parseJsonObject(result.stdout), { ok: true });
});