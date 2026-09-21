import assert from "node:assert/strict";
import test from "node:test";

import {
  assertAutomationInvocation,
  automationManifest,
  loadTrackedAutomationManifest,
  verifyAutomationManifest,
  verifyTrackedAutomationManifest,
} from "../src/lib/automation/authority";

test("the repository permits exactly the four approved Codex automations at their approved times", () => {
  assert.deepEqual(automationManifest.tasks.map((task) => [task.id, task.timeSast]), [
    ["vetted-saas-daily-research", "02:00"],
    ["vetted-saas-editorial-brief", "06:00"],
    ["vetted-saas-optimisation", "20:00"],
    ["vetted-saas-production-watchdog", "23:00"],
  ]);
  assert.deepEqual(verifyAutomationManifest(), []);
});

test("a manual canary follows the existing task chain without changing a schedule", () => {
  assert.doesNotThrow(() => assertAutomationInvocation({ type: "research", scheduledWindow: "2026-09-02-canary", mode: "manual_canary" }));
  assert.doesNotThrow(() => assertAutomationInvocation({ type: "editorial_brief", scheduledWindow: "2026-09-02-canary", mode: "manual_canary" }));
});

test("the runner rejects unapproved automation expansion and schedule mutation", () => {
  assert.throws(() => assertAutomationInvocation({ type: "research", scheduledWindow: "2026-09-02", mode: "scheduled", requestedCapability: "github_remote_release" }), /not approved/i);
  assert.deepEqual(verifyAutomationManifest({ ...automationManifest, tasks: [...automationManifest.tasks.slice(0, 1), { ...automationManifest.tasks[1], timeSast: "07:00" }, ...automationManifest.tasks.slice(2)] }), ["SCHEDULE_DRIFT"]);
});

test("the tracked manifest binds every task to its approved checkout and fingerprinted prompt", () => {
  const manifest = loadTrackedAutomationManifest(process.cwd());
  assert.equal(manifest.workingDirectory, "C:\\Users\\micha\\.buzz\\REPOS\\Antigravity Applications Created\\Vetted SaaS B - Content Strategy and Growth Strategy\\.worktrees\\phase-two");
  assert.equal(manifest.runtimeDirectory, ".automation");
  assert.deepEqual(manifest.tasks.map((task) => task.promptFile), [
    "automation/codex/daily-research.md",
    "automation/codex/editorial-brief.md",
    "automation/codex/optimisation.md",
    "automation/codex/production-watchdog.md",
  ]);
  assert.deepEqual(verifyTrackedAutomationManifest(process.cwd()), []);
  const scheduledInvocation = () => assertAutomationInvocation({ type: "research", scheduledWindow: "2026-09-02", mode: "scheduled", repositoryRoot: process.cwd() });
  if (process.cwd().toLowerCase() === manifest.workingDirectory.toLowerCase()) assert.doesNotThrow(scheduledInvocation);
  else assert.throws(scheduledInvocation, /checkout_drift/i);
  assert.doesNotThrow(() => assertAutomationInvocation({ type: "research", scheduledWindow: "2026-09-02-canary", mode: "manual_canary", repositoryRoot: process.cwd() }));
});
