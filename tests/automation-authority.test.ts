import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  assertAutomationInvocation,
  automationManifest,
  loadTrackedAutomationManifest,
  verifyAutomationManifest,
  verifyTrackedAutomationManifest,
} from "../src/lib/automation/authority";
import { deploymentConcernReportSchema } from "../src/lib/automation/contracts";

test("the morning concern report turns recurring deployment findings into measurable Braintrust suggestions", () => {
  const fingerprint = "a".repeat(64);
  const report = deploymentConcernReportSchema.parse({
    schemaVersion: "DeploymentConcernReportV1",
    windowStart: "2026-10-26T04:00:00.000Z",
    windowEnd: "2026-10-27T04:00:00.000Z",
    productionOutcome: "deployed_and_verified",
    concerns: [{ id: "overflow-mobile", fingerprint, severity: "P2", category: "visual", summary: "A narrow viewport overflowed.", affectedRoutes: ["/decision-hub"], firstSeenAt: "2026-10-26T18:00:00.000Z", lastSeenAt: "2026-10-26T18:00:00.000Z", occurrences: 1, status: "open", evidenceReferences: ["build-pack/evidence/mobile.png"] }],
    braintrustStatus: "suggestions_only",
    braintrustEvalSuggestions: [{ concernFingerprint: fingerprint, name: "Mobile overflow regression", datasetCase: "Render the affected route at 375px.", expectedOutcome: "No horizontal overflow.", scorer: "document.scrollWidth <= document.clientWidth", baselineEvidence: "build-pack/evidence/mobile.png", passingThreshold: "100% of affected routes pass", nextRunComparison: "Compare the next production receipt with this fingerprint." }],
    createdAt: "2026-10-27T04:00:00.000Z",
  });
  assert.equal(report.braintrustStatus, "suggestions_only");
  assert.equal(report.braintrustEvalSuggestions[0].concernFingerprint, report.concerns[0].fingerprint);
});

test("the morning concern report truthfully represents windows without a verified deployment", () => {
  for (const productionOutcome of ["no_deployment", "release_failed_before_deployment", "production_unverified"] as const) {
    const report = deploymentConcernReportSchema.parse({
      schemaVersion: "DeploymentConcernReportV1",
      windowStart: "2026-10-26T04:00:00.000Z",
      windowEnd: "2026-10-27T04:00:00.000Z",
      productionOutcome,
      concerns: [],
      braintrustStatus: "suggestions_only",
      braintrustEvalSuggestions: [],
      createdAt: "2026-10-27T04:00:00.000Z",
    });
    assert.equal(report.productionOutcome, productionOutcome);
  }
});

test("the repository permits exactly the four on-demand workflow stages", () => {
  assert.deepEqual(automationManifest.tasks.map((task) => [task.id, task.trigger]), [
    ["vetted-saas-research", "manual_or_api"],
    ["vetted-saas-editorial-brief", "manual_or_api"],
    ["vetted-saas-optimisation", "manual_or_api"],
    ["vetted-saas-production-watchdog", "manual_or_api"],
  ]);
  assert.deepEqual(verifyAutomationManifest(), []);
});

test("manual and API triggers follow the same idempotent task chain", () => {
  assert.doesNotThrow(() => assertAutomationInvocation({ type: "research", scheduledWindow: "2026-10-27-manual", mode: "manual" }));
  assert.doesNotThrow(() => assertAutomationInvocation({ type: "editorial_brief", scheduledWindow: "2026-10-27-api", mode: "api" }));
});

test("the runner rejects scheduled execution and unapproved expansion", () => {
  assert.throws(() => assertAutomationInvocation({ type: "research", scheduledWindow: "2026-10-27", mode: "scheduled" as never }), /manual or api/i);
  assert.throws(() => assertAutomationInvocation({ type: "research", scheduledWindow: "2026-10-27", mode: "manual", requestedCapability: "github_remote_release" }), /not approved/i);
  assert.deepEqual(verifyAutomationManifest({ ...automationManifest, tasks: [...automationManifest.tasks.slice(0, 1), { ...automationManifest.tasks[1], trigger: "scheduled" }, ...automationManifest.tasks.slice(2)] }), ["FLOW_AUTHORITY_DRIFT"]);
});

test("the tracked manifest binds every stage to the primary checkout and a fingerprinted prompt", (context) => {
  const manifest = loadTrackedAutomationManifest(process.cwd());
  assert.equal(manifest.checkoutPolicy, "primary");
  assert.equal(manifest.runtimeDirectory, ".automation");
  assert.deepEqual(manifest.tasks.map((task) => task.promptFile), [
    "automation/codex/daily-research.md",
    "automation/codex/editorial-brief.md",
    "automation/codex/optimisation.md",
    "automation/codex/production-watchdog.md",
  ]);
  assert.deepEqual(verifyTrackedAutomationManifest(process.cwd()), []);

  const scratchRoot = path.join(process.cwd(), ".scratch");
  mkdirSync(scratchRoot, { recursive: true });
  const fixtureRoot = mkdtempSync(path.join(scratchRoot, "automation-authority-"));
  context.after(() => rmSync(fixtureRoot, { recursive: true, force: true }));

  const createCheckoutFixture = (name: string, primary: boolean) => {
    const root = path.join(fixtureRoot, name);
    mkdirSync(root, { recursive: true });
    cpSync(path.join(process.cwd(), "automation", "codex"), path.join(root, "automation", "codex"), { recursive: true });
    if (primary) mkdirSync(path.join(root, ".git"));
    else writeFileSync(path.join(root, ".git"), "gitdir: C:/linked-worktree\n", "utf8");
    return root;
  };

  const primaryCheckout = createCheckoutFixture("primary", true);
  const linkedCheckout = createCheckoutFixture("linked", false);
  assert.doesNotThrow(
    () => assertAutomationInvocation({ type: "research", scheduledWindow: "2026-10-27-manual", mode: "manual", repositoryRoot: primaryCheckout }),
  );
  assert.throws(
    () => assertAutomationInvocation({ type: "research", scheduledWindow: "2026-10-27-manual", mode: "manual", repositoryRoot: linkedCheckout }),
    /primary_checkout_required/i,
  );
});
