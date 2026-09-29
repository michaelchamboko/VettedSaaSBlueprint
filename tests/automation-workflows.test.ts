import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { completeLocalAutomationRun, startLocalAutomationRun } from "../src/lib/automation/local-store";
import { assertWorkflowPrerequisites, parseWorkflowResult } from "../src/lib/automation/workflows";

const fingerprint = "a".repeat(64);

const evidencePacket = {
  version: 2 as const,
  outcome: "changed" as const,
  sourceFingerprint: fingerprint,
  sourceReferences: ["D08-S-262edcaad6b9"],
  reviewedAt: "2026-09-01T00:00:00.000Z",
  summary: "Evidence supports a detailed decision guide.",
  decision: {
    audience: "A five-person team without a technical administrator",
    question: "How should the team choose software?",
    importance: "detailed" as const,
    rationale: "The decision has operating and implementation consequences.",
    criteria: ["operating simplicity"],
    evidenceGaps: [],
    contradictions: [],
    visualOpportunities: [{ id: "criteria-map", kind: "criteria-grid" as const, purpose: "Make decision criteria scannable.", sourceReferences: ["D04-S-c5113e3d7e2d"], assetProvenance: "Repository-local explanatory diagram." }],
  },
};

const editorialBlueprint = {
  version: 2 as const,
  runId: "00000000-0000-4000-8000-000000000001",
  evidenceOutcome: "changed" as const,
  workItems: [],
  evidencePacketVersion: 2 as const,
  blueprints: ["/decision-hub", "/solution-hub", "/scenarios"].map((path) => ({
    path: path as "/decision-hub" | "/solution-hub" | "/scenarios",
    contentDepth: "detailed" as const,
    targetWords: { min: 1400, max: 2800 },
    compositionFamily: "diagnostic editorial",
    catalogueReferences: ["Tailblocks Classic Light Split Hero", "UI Layouts Condition Grid"],
    sections: [{ id: "opening", directAnswer: "Start with the operating decision.", explanation: "Explain the relevant constraint and why it matters.", evidenceFocus: "Source-bound criteria.", uncertainty: "State the evidence limit.", visualOpportunityId: "criteria-map" }],
    motion: { purpose: "Show the progression from question to criterion.", majorPatterns: ["progress line"], mobileTreatment: "Static reading sequence.", reducedMotionTreatment: "No transform or scrub." },
  })),
};

test("editorial work requires a same-window research receipt", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "vetted-workflow-"));
  const store = { root };
  try {
    await assert.rejects(
      assertWorkflowPrerequisites({ store, type: "editorial_brief", scheduledWindow: "2026-09-01", result: {} }),
      /research receipt/,
    );

    const research = await startLocalAutomationRun({ store, type: "research", scheduledWindow: "2026-09-01" });
    await completeLocalAutomationRun({
      store,
      run: research.run,
      result: { version: 1, outcome: "no_change", sourceFingerprint: fingerprint, sourceReferences: ["D10-S-example"], reviewedAt: "2026-09-01T00:00:00.000Z", summary: "No source changes." },
    });
    await assert.doesNotReject(
      assertWorkflowPrerequisites({ store, type: "editorial_brief", scheduledWindow: "2026-09-01", result: {} }),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a version 2 editorial brief requires a version 2 research evidence packet", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "vetted-workflow-"));
  const store = { root };
  try {
    const research = await startLocalAutomationRun({ store, type: "research", scheduledWindow: "2026-09-01" });
    await completeLocalAutomationRun({ store, run: research.run, result: evidencePacket });
    await assert.doesNotReject(assertWorkflowPrerequisites({ store, type: "editorial_brief", scheduledWindow: "2026-09-01", result: editorialBlueprint }));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("watchdog completion requires a revision-bound V2 receipt and rejects unbound V1 receipts", () => {
  const v2Receipt = {
    version: 2,
    runId: "00000000-0000-4000-8000-000000000002",
    revision: "a".repeat(40),
    catalogueFingerprint: "b".repeat(64),
    passed: true,
    checks: [{ name: "content", passed: true, detail: "ok", category: "content" }],
    screenshots: [],
    createdAt: "2026-09-29T00:00:00.000Z",
  };
  const v1Receipt = {
    version: 1,
    runId: "00000000-0000-4000-8000-000000000003",
    passed: true,
    checks: [{ name: "content", passed: true, detail: "ok" }],
    createdAt: "2026-09-29T00:00:00.000Z",
  };
  const parsed = parseWorkflowResult("watchdog", v2Receipt) as { version: number; revision: string };
  assert.equal(parsed.version, 2);
  assert.equal(parsed.revision, "a".repeat(40));
  assert.throws(() => parseWorkflowResult("watchdog", v1Receipt), /ProductionQualityReceiptV2/i);
});
