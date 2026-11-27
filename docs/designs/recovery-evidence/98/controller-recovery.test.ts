// Synthetic diagnostics only. No production state, network, database, model, or deployment calls.
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import {
  advanceImport,
  createArticleImport,
  ensureImportContentApproval,
  executePendingImport,
  loadImport,
  recordImportRepair,
} from "../../../../src/lib/article-import/engine";
import { createSupervisedImportExecutor } from "../../../../src/lib/article-import/supervised-executor";
import {
  approveFixture,
  prepareApprovalFixture,
  presentFixture,
} from "../../../../tests/fixtures/article-content-approval";
import { persistFixture } from "../../../../tests/fixtures/article-command";
import { recaptureStoredExchange } from "../../../../tests/fixtures/capture-replay";
import {
  evaluateWorkflowEvidence,
  readEvidence,
  storeEvidence,
  workflowEvidenceSchema,
} from "../../../../src/lib/article-import/workflow-evidence";
import {
  executionEvidenceSchema,
  proseProjectionDigest,
} from "../../../../src/lib/article-import/execution-evidence";
import type { ExternalArticleImportV1 } from "../../../../src/lib/article-import/contracts";

type Observation = Record<string, unknown>;
const observations: Observation[] = [];
const parent = path.resolve(".scratch/recovery-evidence-98/cases");

async function fixture() {
  await mkdir(parent, { recursive: true });
  const root = await mkdtemp(path.join(parent, "case-"));
  await writeFile(path.join(root, "approved-urls.md"), "- https://example.test/affiliate\n");
  await writeFile(
    path.join(root, "article.md"),
    "---\ntitle: Synthetic recovery article\naffiliate_name: Example\naffiliate_url: https://example.test/affiliate\n---\nSynthetic controller evidence only.",
  );
  return { root, record: await createArticleImport(root, "article.md") };
}

async function dispose(root: string) {
  const relative = path.relative(parent, path.resolve(root));
  assert.ok(relative && !relative.startsWith("..") && !path.isAbsolute(relative));
  await rm(root, { recursive: true, force: true });
}

async function refiningRecord(root: string, record: ExternalArticleImportV1) {
  const prepared = await prepareApprovalFixture(root, { ...record, stage: "REFINING" });
  return persistFixture(root, {
    ...record,
    stage: "REFINING",
    format: "direct-review",
    artifactPath: prepared.artifactPath,
    evidenceRefs: prepared.evidenceRefs,
  });
}

async function validatingRecord(root: string, record: ExternalArticleImportV1) {
  const approved = await approveFixture(root, { ...record, stage: "REFINING" });
  return advanceImport(root, approved, "Synthetic content approval accepted.");
}

test("interrupted editorial and presentation work reloads the same aggregate stage packet", async () => {
  for (const stage of ["REFINING", "VALIDATING"] as const) {
    const { root, record } = await fixture();
    try {
      const seeded = stage === "REFINING"
        ? await refiningRecord(root, record)
        : await validatingRecord(root, record);
      const executor = createSupervisedImportExecutor(root);
      const orderedDispatch: string[] = [];
      let workerCalls = 0;
      const executeStage = async (dispatchedStage: string, action: () => Promise<ExternalArticleImportV1>) => {
        orderedDispatch.push(dispatchedStage);
        return action();
      };

      const first = await executePendingImport(root, seeded.importId, executor, { executeStage });
      assert.equal(first.continuation?.kind, "work");
      if (first.continuation?.kind !== "work") throw new Error("Expected stage work packet.");
      workerCalls += 1;
      const acceptedActivityPath = path.join(root, path.dirname(first.continuation.resultPath), `${stage.toLowerCase()}-accepted-activity.json`);
      await writeFile(acceptedActivityPath, JSON.stringify({ stage, activity: "synthetic-first-activity", status: "accepted" }));

      const reloaded = await loadImport(root, seeded.importId);
      assert.equal(reloaded.continuation?.kind, "work");
      const second = await executePendingImport(root, seeded.importId, executor, { executeStage });
      assert.equal(second.continuation?.kind, "work");
      if (second.continuation?.kind !== "work") throw new Error("Expected reloaded stage work packet.");
      workerCalls += 1;

      assert.equal(second.continuation.workPath, first.continuation.workPath);
      assert.equal(second.continuation.resultPath, first.continuation.resultPath);
      assert.deepEqual(orderedDispatch, [stage, stage]);
      const workPacket = JSON.parse(await readFile(path.join(root, first.continuation.workPath), "utf8"));
      assert.equal("activity" in workPacket, false);
      assert.equal("acceptedActivities" in (workPacket.record ?? {}), false);

      observations.push({
        case: `${stage.toLowerCase()}-interrupted-after-accepted-activity`,
        actual: {
          orderedDispatch,
          supervisorWorkerCalls: workerCalls,
          sameAggregateWorkPath: true,
          sameAggregateResultPath: true,
          acceptedActivityRecognizedByController: false,
          nextActivity: stage,
        },
        required: {
          reuseAcceptedActivity: true,
          dispatchEarliestUnfinishedActivity: true,
          repeatAcceptedWorkerCall: false,
        },
        unreachable: "The persisted continuation and result contract identify a stage only; neither schema has an activity identity or accepted-activity checkpoint.",
      });
    } finally {
      await dispose(root);
    }
  }
});

test("unchanged approval is reused while a stale artifact invalidates dependent approvals", async () => {
  const { root, record } = await fixture();
  try {
    const approved = await approveFixture(root, { ...record, stage: "REFINING" });
    const validating = await advanceImport(root, approved, "Synthetic content accepted.");
    const presented = await presentFixture(root, validating);
    const unchanged = await ensureImportContentApproval(root, await loadImport(root, record.importId));
    assert.equal(unchanged.contentApproval?.artifactFingerprint, approved.contentApproval?.artifactFingerprint);
    assert.equal(unchanged.presentation?.artifactFingerprint, presented.presentation?.artifactFingerprint);

    const artifactPath = path.join(root, presented.contentApproval!.artifactPath);
    const artifact = JSON.parse(await readFile(artifactPath, "utf8"));
    artifact.hero.headline = `${artifact.hero.headline} Stale revision.`;
    await writeFile(artifactPath, JSON.stringify(artifact));
    const stale = await ensureImportContentApproval(root, await loadImport(root, record.importId));

    assert.equal(stale.stage, "REFINING");
    assert.equal(stale.contentApproval, undefined);
    assert.equal(stale.presentation, undefined);
    assert.deepEqual(stale.evidenceRefs?.research, presented.evidenceRefs?.research);
    assert.deepEqual(stale.evidenceRefs?.assessment, presented.evidenceRefs?.assessment);
    assert.deepEqual(stale.evidenceRefs?.editorial, presented.evidenceRefs?.editorial);
    assert.equal(stale.evidenceRefs?.presentation, undefined);

    observations.push({
      case: "unchanged-versus-stale-revision",
      actual: {
        unchangedContentApprovalReused: true,
        unchangedPresentationReused: true,
        staleStage: stale.stage,
        retainedEvidenceRefs: ["research", "assessment", "editorial"],
        clearedApprovals: ["contentApproval", "presentation", "presentationEvidenceRef"],
        nextActivity: stale.nextAction,
      },
      required: "Reuse only activities whose inputs and dependencies remain valid; obtain fresh dependent editorial and presentation approval for the changed revision.",
      limit: "The retained editorial evidence reference remains readable history, but the controller does not model whether an individual editorial activity is reusable.",
    });
  } finally {
    await dispose(root);
  }
});

type InspectionVariant = "rejection" | "missing-observation" | "claimed-inapplicable";

async function exerciseInspection(variant: InspectionVariant): Promise<Observation> {
  const { root, record } = await fixture();
  try {
    const approved = await approveFixture(root, { ...record, stage: "REFINING" });
    const validating = await advanceImport(root, approved, "Synthetic content accepted.");
    const presented = await presentFixture(root, validating);
    const manifest = workflowEvidenceSchema.parse(await readEvidence(root, presented.evidenceRefs!.presentation!));
    const rule = manifest.ruleResults.find((item) => item.ruleId === "context")!;
    let finding: string | undefined;
    let applicabilityReason: string | undefined;

    if (variant === "claimed-inapplicable") {
      rule.status = "not-applicable";
      applicabilityReason = "Synthetic claim: context is inapplicable because the fixture has no runtime observation.";
      rule.rationale = applicabilityReason;
    } else {
      const execution = executionEvidenceSchema.parse(await readEvidence(root, rule.evidenceRefs[0]));
      assert.equal(execution.kind, "opencode");
      if (execution.kind !== "opencode" || !execution.replay) throw new Error("Expected replayable synthetic review.");
      const review = JSON.parse(execution.output.designReview ?? "null");
      finding = variant === "rejection"
        ? "Synthetic visible hierarchy defect remains unresolved."
        : "Required runtime observation is missing.";
      const output = {
        ...execution.output,
        designReview: JSON.stringify({
          ...review,
          verdict: variant === "rejection" ? "fail" : "insufficient-evidence",
          findings: [{ description: finding, disposition: "unresolved" }],
        }),
      };
      rule.evidenceRefs = [await storeEvidence(root, record.importId, recaptureStoredExchange({
        ...execution,
        sessionId: `synthetic-${variant}`,
        output,
        outputDigest: proseProjectionDigest(output),
      }, execution.replay.inputRefs, execution.replay.outputRefs))];
    }

    const presentationRef = await storeEvidence(root, record.importId, manifest);
    const selected = await persistFixture(root, {
      ...presented,
      evidenceRefs: { ...presented.evidenceRefs, presentation: presentationRef },
    });
    const evaluation = await evaluateWorkflowEvidence(selected, { root, throughStage: "RELEASING" });
    assert.equal(evaluation.ok, false);
    await assert.rejects(advanceImport(root, selected, `Synthetic ${variant} inspection.`), /WORKFLOW_EVIDENCE_INVALID/);
    const repaired = await recordImportRepair(root, await loadImport(root, record.importId), {
      strategy: "validate",
      message: evaluation.diagnostics.join(";"),
    });
    assert.equal(repaired.stage, "VALIDATING");
    assert.equal(repaired.continuation?.kind, "repair");

    return {
      case: `completed-inspection-${variant}`,
      actual: {
        finding,
        applicabilityReason,
        diagnostics: evaluation.diagnostics,
        approvalState: "blocked",
        controllerStage: repaired.stage,
        nextActivity: repaired.nextAction,
        structuredFindingPersistedInControllerState: false,
        structuredApplicabilityReasonPersistedInControllerState: false,
      },
      required: {
        rejection: "Retain the finding and route cause-based repair.",
        missingObservation: "Remain unverified and dispatch the missing observation.",
        claimedInapplicable: "Retain the applicability reason and require independent acceptance before approval.",
      }[variant === "missing-observation" ? "missingObservation" : variant === "claimed-inapplicable" ? "claimedInapplicable" : "rejection"],
      limit: "The raw evidence remains readable, but controller state reduces all three outcomes to a generic stage repair without a structured finding, applicability decision, or activity identity.",
    };
  } finally {
    await dispose(root);
  }
}

test("rejection, missing observation, and claimed inapplicability all block approval but collapse to generic repair", async () => {
  for (const variant of ["rejection", "missing-observation", "claimed-inapplicable"] as const) {
    observations.push(await exerciseInspection(variant));
  }
});

test.after(async () => {
  const output = path.resolve(".scratch/recovery-evidence-98/observations.json");
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify({ revision: process.env.RECOVERY_EVIDENCE_REVISION, syntheticOnly: true, observations }, null, 2) + "\n");
});
