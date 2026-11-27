// Synthetic diagnostics only. No production state, network, database, model, or deployment calls.
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  advanceImport,
  canonicalSubmissionFingerprint,
  createArticleImport,
  executePendingImport,
  loadImport,
  saveImport,
  submitImportDiagnosis,
  withImportLease,
} from "../../../../src/lib/article-import/engine";
import { storeEvidence } from "../../../../src/lib/article-import/execution-evidence";

const observations: Record<string, unknown>[] = [];
const parent = path.resolve(".scratch/recovery-100");
const output = path.resolve("docs/designs/recovery-evidence/100/observations.json");

async function fixture() {
  await mkdir(parent, { recursive: true });
  const root = await mkdtemp(path.join(parent, "case-"));
  await writeFile(path.join(root, "approved-urls.md"), "");
  await writeFile(path.join(root, "article.md"), "# Synthetic recovery probe\n\nThis is not a real article intake or publication.\n");
  const created = await createArticleImport(root, "article.md");
  return { root, record: await advanceImport(root, created, "Synthetic source captured.") };
}

async function dispose(root: string) {
  const relative = path.relative(parent, path.resolve(root));
  assert.ok(relative && !relative.startsWith("..") && !path.isAbsolute(relative));
  await rm(root, { recursive: true, force: true });
}

test("failure routing records stop decisions and external calls across wording variants", async () => {
  const cases = [
    { category: "content-rejection", wording: "coded", message: "PRESENTATION_DESIGN_REVIEW_VERDICT_NOT_PASS", expectedKind: "repair", expectedScope: "article" },
    { category: "content-rejection", wording: "prose", message: "review rejected content: unsupported claim", expectedKind: "repair", expectedScope: "article" },
    { category: "invalid-evidence", wording: "coded", message: "WORKFLOW_EVIDENCE_INVALID: research reference mismatch", expectedKind: "repair", expectedScope: "article" },
    { category: "invalid-evidence", wording: "prose", message: "submitted evidence cannot be validated", expectedKind: "repair", expectedScope: "article" },
    { category: "shared-capability", wording: "coded", message: "CAPABILITY_UNAVAILABLE: editorial reviewer offline", expectedKind: "blocked", expectedScope: "shared" },
    { category: "shared-capability", wording: "prose", message: "shared reviewer is offline", expectedKind: "repair", expectedScope: "article" },
    { category: "uncertain-external-outcome", wording: "coded", message: "Vercel timeout", expectedKind: "blocked", expectedScope: "shared" },
    { category: "uncertain-external-outcome", wording: "prose", message: "deployment response lost after remote success", expectedKind: "repair", expectedScope: "article" },
  ] as const;

  for (const scenario of cases) {
    const { root, record } = await fixture();
    let externalCalls = 0;
    try {
      const result = await executePendingImport(root, record.importId, async () => {
        externalCalls++;
        throw new Error(scenario.message);
      });
      assert.equal(result.continuation?.kind, scenario.expectedKind);
      assert.equal(result.blockerScope, scenario.expectedScope);
      assert.equal(externalCalls, 1);
      observations.push({
        case: "failure-routing",
        category: scenario.category,
        wording: scenario.wording,
        error: scenario.message,
        route: result.continuation?.kind,
        blockerScope: result.blockerScope,
        stage: result.stage,
        stopped: result.continuation?.kind === "blocked",
        externalCalls,
      });
    } finally {
      await dispose(root);
    }
  }
});

test("repair totals survive reload and diagnosis does not enforce prediction or separate remedy verification", async () => {
  const { root, record } = await fixture();
  const failures = [
    "WORKFLOW_EVIDENCE_INVALID: finding-a worker-one session-one",
    "PRESENTATION_DESIGN_REVIEW_VERDICT_NOT_PASS: finding-b worker-two session-two",
    "review rejected content: finding-c worker-three session-three",
  ];
  let executorCalls = 0;
  try {
    let current = record;
    for (let index = 0; index < failures.length; index++) {
      current = await executePendingImport(root, current.importId, async () => {
        executorCalls++;
        throw new Error(failures[index]);
      });
      assert.equal(current.repairStageTotals?.RESEARCHING, index + 1);
      current = await loadImport(root, current.importId);
      if (index < failures.length - 1) {
        current = await withImportLease(root, current.importId, async (leased) => {
          leased.transformation.title = `Changed repair input ${index + 1}`;
          await saveImport(root, leased);
          return leased;
        });
      }
    }

    assert.equal(current.continuation?.kind, "repair");
    assert.ok(current.continuation?.kind === "repair" && current.continuation.diagnosisRequired);
    assert.equal(executorCalls, 3);

    current = await withImportLease(root, current.importId, async (leased) => {
      leased.transformation.title = "Replacement after diagnosis gate";
      await saveImport(root, leased);
      return leased;
    });
    const stopped = await executePendingImport(root, current.importId, async () => {
      executorCalls++;
      return current;
    });
    assert.equal(executorCalls, 3);
    assert.equal(stopped.repairStageTotals?.RESEARCHING, 3);

    if (stopped.continuation?.kind !== "repair") throw new Error("Expected diagnosis-gated repair");
    const evidence = await storeEvidence(root, stopped.importId, { note: "Synthetic claim only; no executable remedy verification." });
    const diagnosis = {
      schemaVersion: "DiagnosisV1" as const,
      importId: stopped.importId,
      sourceFingerprint: stopped.sourceFingerprint,
      stage: stopped.stage,
      failedSubmissionDigest: stopped.continuation.submittedFingerprint,
      replacementSubmissionDigest: await canonicalSubmissionFingerprint(stopped, root),
      failureCode: "SYNTHETIC_REPAIR_FAILURE",
      cause: "The synthetic inputs did not satisfy the selected check.",
      attemptedRecoveryRefs: [evidence],
      remedyEvidenceRefs: [evidence],
      createdAt: new Date().toISOString(),
    };

    await assert.rejects(
      submitImportDiagnosis(root, stopped.importId, {
        ...diagnosis,
        predictedObservation: "The replacement will pass the original check.",
        disproofCheck: "Repeat the original check and reject the cause if it still fails.",
      }),
    );

    await submitImportDiagnosis(root, stopped.importId, diagnosis);
    const fourth = await executePendingImport(root, stopped.importId, async () => {
      executorCalls++;
      throw new Error("fourth distinct failure after accepted diagnosis");
    });
    assert.equal(executorCalls, 4);
    assert.equal(fourth.repairStageTotals?.RESEARCHING, 4);
    assert.ok(fourth.diagnoses?.[0].consumedAt);

    observations.push({
      case: "cumulative-repair-limit",
      failures: failures.length,
      variedFindings: 3,
      variedWorkers: 3,
      variedSessions: 3,
      reloads: 3,
      cumulativeStageTotalBeforeDiagnosis: stopped.repairStageTotals?.RESEARCHING,
      nextActionBeforeDiagnosis: stopped.nextAction,
      callsBeforeDiagnosis: 3,
      callBlockedWithoutDiagnosis: true,
      predictionAndDisproofFieldsAccepted: false,
      identicalAttemptAndRemedyEvidenceAccepted: true,
      separateRemedyVerificationObserved: false,
      callsAfterAcceptedDiagnosis: executorCalls,
      cumulativeStageTotalAfterNextFailure: fourth.repairStageTotals?.RESEARCHING,
    });
  } finally {
    await dispose(root);
  }
});

test("threshold, viewport and article changes alter one generic submission fingerprint", async () => {
  const { root, record } = await fixture();
  try {
    const workDirectory = path.join(root, ".automation/article-imports/work", record.importId);
    const measurementPath = path.join(workDirectory, "synthetic-measurement.work.json");
    await mkdir(workDirectory, { recursive: true });
    await writeFile(measurementPath, JSON.stringify({ threshold: 0.9, viewport: 390 }));
    const before = await canonicalSubmissionFingerprint(record, root);

    await writeFile(measurementPath, JSON.stringify({ threshold: 0.85, viewport: 412 }));
    const afterMeasurementChange = await canonicalSubmissionFingerprint(record, root);
    assert.notEqual(afterMeasurementChange, before);

    record.transformation.title = "Synthetic article text changed";
    const afterArticleChange = await canonicalSubmissionFingerprint(record, root);
    assert.notEqual(afterArticleChange, afterMeasurementChange);

    const persisted = await loadImport(root, record.importId) as unknown as Record<string, unknown>;
    const classificationFields = ["changeKind", "measurementJustification", "independentRegressionRefs"].filter((field) => field in persisted);
    assert.deepEqual(classificationFields, []);
    observations.push({
      case: "measurement-versus-article-change",
      thresholdChanged: true,
      viewportChanged: true,
      articleChanged: true,
      measurementFingerprintChanged: afterMeasurementChange !== before,
      articleFingerprintChanged: afterArticleChange !== afterMeasurementChange,
      explicitChangeClassification: false,
      justificationRecorded: false,
      independentRegressionChecksRecorded: false,
      observation: "The controller detects changed bytes but does not distinguish measurement changes from article changes in the persisted import record.",
    });
  } finally {
    await dispose(root);
  }
});

test.after(async () => {
  await writeFile(output, JSON.stringify({
    schemaVersion: "RecoveryRoutingObservationV1",
    issue: 100,
    investigatedRevision: "f026bca8b53aecca829262e9a27820ac6d078892",
    syntheticOnly: true,
    productionCalls: 0,
    observations,
  }, null, 2) + "\n");
});
