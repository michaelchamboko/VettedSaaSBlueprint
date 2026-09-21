import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, stat, utimes } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  completeLocalAutomationRun,
  failLocalAutomationRun,
  readLocalAutomationReceipt,
  startLocalAutomationRun,
} from "../src/lib/automation/local-store";

async function store(at: string) {
  return { root: await mkdtemp(path.join(os.tmpdir(), "vetted-automation-")), now: () => new Date(at) };
}

test("duplicate starts return one running local automation run", async () => {
  const local = await store("2026-09-02T00:00:00.000Z");
  const first = await startLocalAutomationRun({ store: local, type: "research", scheduledWindow: "2026-09-02" });
  const duplicate = await startLocalAutomationRun({ store: local, type: "research", scheduledWindow: "2026-09-02" });
  assert.equal(first.created, true);
  assert.equal(duplicate.created, false);
  assert.equal(first.run.runId, duplicate.run.runId);
});

test("a stale local lock is recovered", async () => {
  const local = await store("2026-09-02T00:00:00.000Z");
  const first = await startLocalAutomationRun({ store: local, type: "research", scheduledWindow: "2026-09-02" });
  const key = first.run.idempotencyKey;
  const lock = path.join(local.root, ".automation", "locks", `${createHash("sha256").update(key).digest("hex")}.lock`);
  await mkdir(path.dirname(lock), { recursive: true });
  const stale = new Date("2026-09-01T20:00:00.000Z");
  await utimes(lock, stale, stale);
  const recovered = await startLocalAutomationRun({ store: { ...local, now: () => new Date("2026-09-02T04:00:01.000Z") }, type: "research", scheduledWindow: "2026-09-02" });
  assert.equal(recovered.run.runId, first.run.runId);
  await stat(lock);
});

test("three failures write one escalation receipt", async () => {
  const local = await store("2026-09-02T00:00:00.000Z");
  let started = await startLocalAutomationRun({ store: local, type: "watchdog", scheduledWindow: "2026-09-02" });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const failed = await failLocalAutomationRun({ store: local, run: started.run, failure: { attempt } });
    if (attempt < 2) started = await startLocalAutomationRun({ store: local, type: "watchdog", scheduledWindow: "2026-09-02" });
    else assert.equal(failed.state, "blocked");
  }
});

test("completion records a repository-local receipt", async () => {
  const local = await store("2026-09-02T00:00:00.000Z");
  const started = await startLocalAutomationRun({ store: local, type: "research", scheduledWindow: "2026-09-02" });
  await completeLocalAutomationRun({ store: local, run: started.run, result: { outcome: "no_change" } });
  assert.ok(await readLocalAutomationReceipt(local, "2026-09-02", "research"));
});

test("completion receipts contain the final completed run, not its prior running state", async () => {
  const local = await store("2026-09-02T00:00:00.000Z");
  const started = await startLocalAutomationRun({ store: local, type: "research", scheduledWindow: "2026-09-02" });
  const completed = await completeLocalAutomationRun({ store: local, run: started.run, result: { outcome: "no_change" } });
  const receiptPath = path.join(local.root, ".automation", "receipts", "2026-09-02", "research.json");
  const receipt = JSON.parse(await readFile(receiptPath, "utf8")) as { run: { state: string; completedAt: string | null } };
  assert.equal(receipt.run.state, "completed");
  assert.equal(receipt.run.completedAt, completed.completedAt);
});
