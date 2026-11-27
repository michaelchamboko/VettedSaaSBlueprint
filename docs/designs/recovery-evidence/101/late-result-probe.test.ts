// Synthetic diagnostics only. No production state, network, database, model, or deployment calls.
import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import path from "node:path";
import { access, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import {
  advanceImport,
  canonicalSubmissionFingerprint,
  createArticleImport,
  executePendingImport,
  loadImport,
  recordImportRepair,
  recoverWorkflowLease,
  type ImportExecutionContext,
  type ImportStageExecutor,
} from "../../../../src/lib/article-import/engine";
import { claimWorkflowLease } from "../../../../src/lib/article-import/workflow-lease";
import { createSupervisedImportExecutor } from "../../../../src/lib/article-import/supervised-executor";
import { invokeWorker } from "../../../../src/lib/article-import/worker-runner";
import { approveFixture, presentFixture } from "../../../../tests/fixtures/article-content-approval";
import { fixtureResearchRegistry, persistFixture } from "../../../../tests/fixtures/article-command";
import { writeAcquisitionResult, writeGapPlanResult } from "../../../../tests/fixtures/article-research-flow";
import { recaptureStoredExchange } from "../../../../tests/fixtures/capture-replay";
import { evaluateWorkflowEvidence, readEvidence, storeEvidence, workflowEvidenceSchema } from "../../../../src/lib/article-import/workflow-evidence";
import { executionEvidenceSchema, proseProjectionDigest } from "../../../../src/lib/article-import/execution-evidence";

const revision = "f026bca8b53aecca829262e9a27820ac6d078892";
const evidenceDirectory = path.resolve("docs/designs/recovery-evidence/101");
const fixtureParent = path.resolve(".scratch/recovery-evidence-101");
const observations: Record<string, unknown>[] = [];

async function fixture() {
  await mkdir(fixtureParent, { recursive: true });
  const root = await mkdtemp(path.join(fixtureParent, "case-"));
  await mkdir(path.join(root, "Article Intake"), { recursive: true });
  await writeFile(path.join(root, "approved-urls.md"), "- https://start.switcherstudio.com/anme6fqvgdx9\n");
  await writeFile(path.join(root, "Article Intake/article.md"), "---\ntitle: Example\naffiliate_name: Example\naffiliate_url: https://start.switcherstudio.com/anme6fqvgdx9\n---\nSynthetic source for late-result diagnostics.");
  return { root, record: await createArticleImport(root, "Article Intake/article.md") };
}

async function dispose(root: string) {
  const relative = path.relative(fixtureParent, path.resolve(root));
  assert.ok(relative && !relative.startsWith("..") && !path.isAbsolute(relative));
  await rm(root, { recursive: true, force: true });
}

function contextObservation(context: ImportExecutionContext) {
  return {
    stage: context.stage,
    attempt: context.attempt,
    idempotencyKey: context.idempotencyKey,
    leaseToken: context.leaseToken,
    continuationKind: context.record.continuation?.kind ?? null,
  };
}

async function waitFor(file: string) {
  for (let count = 0; count < 250; count += 1) {
    try { await access(file); return; } catch { await new Promise((resolve) => setTimeout(resolve, 20)); }
  }
  throw new Error(`Timed out waiting for ${file}`);
}

test("interrupted resume retains packet identity and intentional repair has no replacement identity", async () => {
  const { root, record } = await fixture();
  try {
    const base = createSupervisedImportExecutor(root, undefined, { researchRegistry: fixtureResearchRegistry(root) });
    const contexts: ReturnType<typeof contextObservation>[] = [];
    const tracked: ImportStageExecutor = async (context) => {
      contexts.push(contextObservation(context));
      return base(context);
    };

    await executePendingImport(root, record.importId, tracked);
    const pending = await executePendingImport(root, record.importId, tracked);
    assert.equal(pending.continuation?.kind, "work");
    if (pending.continuation?.kind !== "work") throw new Error("missing research plan work");
    const firstPacket = JSON.parse(await readFile(path.join(root, pending.continuation.workPath), "utf8"));

    const interrupted = await executePendingImport(root, record.importId, tracked);
    assert.equal(interrupted.continuation?.kind, "work");
    if (interrupted.continuation?.kind !== "work") throw new Error("interrupted work was not resumed");
    assert.equal(interrupted.continuation.idempotencyKey, pending.continuation.idempotencyKey);
    assert.equal(interrupted.continuation.workPath, pending.continuation.workPath);
    assert.equal(interrupted.continuation.resultPath, pending.continuation.resultPath);

    await writeGapPlanResult(root, interrupted.continuation, {
      claimText: "Synthetic claim requiring acquisition.",
      sourceFingerprint: "0".repeat(64),
    });
    const rejected = await executePendingImport(root, record.importId, tracked);
    assert.equal(rejected.continuation?.kind, "repair");
    if (rejected.continuation?.kind !== "repair") throw new Error("invalid result did not become repair");

    await writeGapPlanResult(root, pending.continuation, { claimText: "Synthetic claim requiring acquisition." });
    const repaired = await executePendingImport(root, record.importId, tracked);
    assert.equal(repaired.continuation?.kind, "work");
    const researchContexts = contexts.filter((item) => item.stage === "RESEARCHING");
    assert.ok(researchContexts.length >= 4);
    assert.equal(new Set(researchContexts.map((item) => item.idempotencyKey)).size, 1);
    assert.equal(new Set(researchContexts.map((item) => item.attempt)).size, 1);
    assert.equal(new Set(researchContexts.map((item) => item.leaseToken)).size, researchContexts.length);
    assert.equal("attemptId" in firstPacket, false);
    assert.equal("predecessor" in firstPacket, false);

    observations.push({
      case: "interrupted-versus-intentional-repair",
      interrupted: {
        inheritedIdentity: true,
        sameIdempotencyKey: true,
        sameWorkPath: true,
        sameResultPath: true,
      },
      intentionalRepair: {
        newAttemptIdentity: false,
        predecessorRecorded: false,
        observedAttemptValues: [...new Set(researchContexts.map((item) => item.attempt))],
      },
      lease: {
        controllerCalls: researchContexts.length,
        uniqueOwnerTokens: new Set(researchContexts.map((item) => item.leaseToken)).size,
      },
      limit: "Current state has no replacement-attempt identity, so a superseded/replacement pair cannot be represented.",
    });
  } finally { await dispose(root); }
});

async function invalidResearchCase(mutation: "relevant-evidence" | "unrelated-history") {
  const { root, record } = await fixture();
  try {
    const executor = createSupervisedImportExecutor(root, undefined, { researchRegistry: fixtureResearchRegistry(root) });
    await executePendingImport(root, record.importId, executor);
    const plan = await executePendingImport(root, record.importId, executor);
    assert.equal(plan.continuation?.kind, "work");
    if (plan.continuation?.kind !== "work") throw new Error("missing plan work");
    await writeGapPlanResult(root, plan.continuation, { claimText: "Synthetic unsupported research." });
    const acquisition = await executePendingImport(root, record.importId, executor);
    assert.equal(acquisition.continuation?.kind, "work");
    if (acquisition.continuation?.kind !== "work") throw new Error("missing acquisition work");
    const evidencePath = "invalid-research.json";
    await writeFile(path.join(root, evidencePath), JSON.stringify({ sources: [] }));
    await writeAcquisitionResult(root, acquisition.continuation, evidencePath);
    const originalResult = await readFile(path.join(root, acquisition.continuation.resultPath));
    const failed = await executePendingImport(root, record.importId, executor);
    assert.equal(failed.continuation?.kind, "repair");
    if (failed.continuation?.kind !== "repair") throw new Error("invalid research did not become repair");
    const submittedFingerprint = failed.continuation.submittedFingerprint;

    if (mutation === "relevant-evidence") {
      await writeFile(path.join(root, evidencePath), JSON.stringify({ sources: [], syntheticNote: "changed but still invalid" }));
    } else {
      const workDir = path.dirname(path.join(root, acquisition.continuation.resultPath));
      await writeFile(path.join(workDir, `${"f".repeat(64)}.result.json`), JSON.stringify({ synthetic: "unrelated historical result" }));
    }
    const changedFingerprint = await canonicalSubmissionFingerprint(failed, root);
    assert.notEqual(changedFingerprint, submittedFingerprint);

    const packet = JSON.parse(await readFile(path.join(root, acquisition.continuation.workPath), "utf8"));
    let workerCalls = 0;
    await invokeWorker(root, acquisition.continuation.workPath, acquisition.continuation.resultPath, packet,
      "11111111-1111-1111-1111-111111111111", async () => {}, {
        workerRunner: async () => { workerCalls += 1; throw new Error("cached result must not invoke worker"); },
      });
    assert.equal(workerCalls, 0);

    let retried = await executePendingImport(root, record.importId, executor);
    for (let step = 0; retried.continuation?.kind === "work" && step < 2; step += 1) {
      retried = await executePendingImport(root, record.importId, executor);
    }
    assert.equal(retried.continuation?.kind, "repair");
    assert.deepEqual(await readFile(path.join(root, acquisition.continuation.resultPath)), originalResult);
    return {
      case: mutation,
      repeatEligibilityChanged: true,
      cachedResultSelected: true,
      workerCalls,
      validatorResult: "failed",
      validatorMessage: retried.stageReceipts.at(-1)?.message,
      originalProvenanceRecorded: false,
      controllerReasoningRecorded: false,
    };
  } finally { await dispose(root); }
}

test("relevant and unrelated changes both make a cached result retry-eligible, but validation still applies", async () => {
  const relevant = await invalidResearchCase("relevant-evidence");
  const unrelated = await invalidResearchCase("unrelated-history");
  assert.match(String(relevant.validatorMessage), /RESEARCH|EVIDENCE|REGISTRY/i);
  assert.match(String(unrelated.validatorMessage), /RESEARCH|EVIDENCE|REGISTRY/i);
  observations.push(relevant, unrelated);
});

test("a later synthetic pass can omit an earlier open finding and advance without a recorded resolution", async () => {
  const { root, record } = await fixture();
  try {
    const approved = await approveFixture(root, { ...record, stage: "REFINING" });
    const validating = await advanceImport(root, approved, "Synthetic approved content");
    const presented = await presentFixture(root, validating);
    const cleanPresentationRef = presented.evidenceRefs!.presentation!;
    const negativeManifest = workflowEvidenceSchema.parse(await readEvidence(root, cleanPresentationRef));
    const contextRule = negativeManifest.ruleResults.find((item) => item.ruleId === "context")!;
    const execution = executionEvidenceSchema.parse(await readEvidence(root, contextRule.evidenceRefs[0]));
    assert.equal(execution.kind, "opencode");
    if (execution.kind !== "opencode" || !execution.replay) throw new Error("expected captured synthetic review");
    const priorReview = JSON.parse(execution.output.designReview);
    const finding = "Synthetic open finding from the earlier review";
    const negativeOutput = {
      ...execution.output,
      designReview: JSON.stringify({ ...priorReview, verdict: "fail", findings: [{ description: finding, disposition: "unresolved" }] }),
    };
    const rejectedExecution = await storeEvidence(root, record.importId, recaptureStoredExchange({
      ...execution,
      sessionId: "synthetic-rejected-attempt",
      output: negativeOutput,
      outputDigest: proseProjectionDigest(negativeOutput),
    }, execution.replay.inputRefs, execution.replay.outputRefs));
    contextRule.evidenceRefs = [rejectedExecution];
    const rejectedPresentationRef = await storeEvidence(root, record.importId, negativeManifest);
    const rejectedRecord = await persistFixture(root, {
      ...presented,
      evidenceRefs: { ...presented.evidenceRefs, presentation: rejectedPresentationRef },
    });
    const rejectedValidation = await evaluateWorkflowEvidence(rejectedRecord, { root, throughStage: "RELEASING" });
    assert.equal(rejectedValidation.ok, false);
    const repair = await recordImportRepair(root, await loadImport(root, record.importId), {
      strategy: "validate",
      message: "PRESENTATION_DESIGN_REVIEW_VERDICT_NOT_PASS",
    });

    const cleanManifest = workflowEvidenceSchema.parse(await readEvidence(root, cleanPresentationRef));
    const cleanRule = cleanManifest.ruleResults.find((item) => item.ruleId === "context")!;
    const lateExecution = await storeEvidence(root, record.importId, recaptureStoredExchange({
      ...execution,
      sessionId: "synthetic-late-unselected-attempt",
    }, execution.replay.inputRefs, execution.replay.outputRefs));
    cleanRule.evidenceRefs = [lateExecution];
    const latePresentationRef = await storeEvidence(root, record.importId, cleanManifest);
    await persistFixture(root, { ...repair, evidenceRefs: { ...repair.evidenceRefs, presentation: latePresentationRef } });

    const advanced = await executePendingImport(root, record.importId,
      async (context) => advanceImport(root, context.record, "Synthetic late passing review selected"));
    assert.equal(advanced.stage, "RELEASING");
    assert.ok(String((await readEvidence(root, rejectedExecution) as { output: { designReview: string } }).output.designReview).includes(finding));
    observations.push({
      case: "open-finding-and-late-independent-review",
      earlierValidatorResult: "failed",
      laterValidatorResult: "passed",
      independentReview: "synthetic supplied verdict only",
      earlierFindingRetained: true,
      explicitFindingResolutionSubmitted: false,
      controllerAdvanced: true,
      originalAttemptProvenanceInSelection: false,
      controllerSelectionReasoningRecorded: false,
      limit: "No replacement-attempt state exists; the fixture can switch the selected evidence reference but cannot model an active replacement.",
    });
  } finally { await dispose(root); }
});

test("lease recovery refuses a live owner and succeeds only after that process exits", async () => {
  const { root, record } = await fixture();
  const readyPath = path.join(root, "lease-owner.ready");
  const exitPath = path.join(root, "lease-owner.exit");
  const ownerScript = path.resolve("docs/designs/recovery-evidence/101/lease-owner.ts");
  const child = spawn(process.execPath, ["--import", "tsx", ownerScript, root, record.importId, readyPath, exitPath], {
    cwd: process.cwd(), windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    await waitFor(readyPath);
    const priorOwnerToken = await readFile(readyPath, "utf8");
    await assert.rejects(recoverWorkflowLease(root, "import", record.importId), /LEASE_RECOVERY_UNVERIFIED/);
    assert.equal(await claimWorkflowLease(root, "import", record.importId), undefined);
    await writeFile(exitPath, "exit");
    const [exitCode] = await once(child, "close");
    assert.equal(exitCode, 0);
    await recoverWorkflowLease(root, "import", record.importId);
    const replacement = await claimWorkflowLease(root, "import", record.importId);
    assert.ok(replacement);
    assert.notEqual(replacement.ownerToken, priorOwnerToken);
    const leaseFiles = await readdir(path.join(root, ".automation/article-imports/leases/import", record.importId));
    const leaseJournal = await Promise.all(leaseFiles
      .filter((name) => /^\d+\.json$/.test(name))
      .sort((left, right) => Number(left.slice(0, -5)) - Number(right.slice(0, -5)))
      .map(async (name) => JSON.parse(await readFile(path.join(root, ".automation/article-imports/leases/import", record.importId, name), "utf8")) as {
        generation: number;
        ownerToken: string;
        released: boolean;
      }));
    const priorClaim = leaseJournal.find((entry) => entry.ownerToken === priorOwnerToken && !entry.released);
    const recoveredRelease = leaseJournal.find((entry) => entry.ownerToken === priorOwnerToken && entry.released);
    assert.ok(priorClaim);
    assert.ok(recoveredRelease);
    assert.ok(recoveredRelease.generation > priorClaim.generation);
    observations.push({
      case: "lease-owner-exit-before-recovery",
      recoveryWhileOwnerLive: "rejected",
      recoveryAfterOwnerExit: "accepted",
      priorClaimJournalRetained: Boolean(priorClaim),
      recoveryReleaseJournalRetained: Boolean(recoveredRelease),
      recoveryReleaseFollowsClaim: recoveredRelease.generation > priorClaim.generation,
      replacementOwnerTokenChanged: true,
    });
    await replacement.release();
  } finally {
    await writeFile(exitPath, "exit").catch(() => undefined);
    if (child.exitCode === null && child.signalCode === null) child.kill();
    await dispose(root);
  }
});

test.after(async () => {
  await mkdir(evidenceDirectory, { recursive: true });
  await writeFile(path.join(evidenceDirectory, "observations.json"), JSON.stringify({
    revision,
    syntheticOnly: true,
    productCodeChanged: false,
    observations,
  }, null, 2) + "\n");
});
