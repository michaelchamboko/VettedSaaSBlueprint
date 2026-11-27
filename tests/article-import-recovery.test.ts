import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { executeFixtureCommand as executeImportCommand } from "./fixtures/article-command";
import {
  advanceImport,
  canonicalSubmissionFingerprint,
  claimImportLease,
  createArticleImport,
  executePendingImport,
  loadImport,
  recordImportRepair,
  saveImport,
  submitImportDiagnosis,
  withImportLease,
} from "../src/lib/article-import/engine";
import { captureCommandExecution, storeEvidence } from "../src/lib/article-import/execution-evidence";
import { presentationCandidateUnavailable } from "../src/lib/article-import/worker-presentation";
import { presentationDesignRejected, workflowEvidenceRejected } from "../src/lib/article-import/workflow-evidence";
import { createLocalReleaseOperations } from "../src/lib/article-import/local-release-adapter";
import { WORKFLOW_REVISION } from "../src/lib/article-import/workflow-requirements";

async function fixture() {
  const parent = path.join(process.cwd(), ".scratch");
  await mkdir(parent, { recursive: true });
  const root = await mkdtemp(path.join(parent, "import-recovery-"));
  await writeFile(path.join(root, "approved-urls.md"), "");
  await writeFile(path.join(root, "article.md"), "# A workflow guide\n\nThis practical guide describes several workflow choices and their limitations for a team preparing a production.");
  const record = await advanceImport(root, await createArticleImport(root, "article.md"), "Source captured.");
  return { root, record };
}

async function echoRemedyEvidence(root: string, record: Awaited<ReturnType<typeof fixture>>["record"], input: {
  failedSubmissionDigest: string;
  replacementSubmissionDigest: string;
  result: "verified" | "contradicted";
  observation: string;
  criterion?: { id: string; revision: string };
  measurements?: Array<{ name: string; expected: string; observed: string; satisfied: boolean }>;
  measurementChange?: { aspect: "measurement" | "viewport" | "criterion" | "threshold"; from: string; to: string; justification: string };
}) {
  const checkedAt = new Date().toISOString();
  const result = {
    schemaVersion: "RemedyCheckResultV1",
    importId: record.importId,
    sourceFingerprint: record.sourceFingerprint,
    stage: "RESEARCHING",
    failedSubmissionDigest: input.failedSubmissionDigest,
    replacementSubmissionDigest: input.replacementSubmissionDigest,
    criterion: input.criterion ?? { id: "research.evidence-binding", revision: "fixture-v1" },
    measurements: input.measurements ?? [{ name: "validator", expected: "pass", observed: input.result === "verified" ? "pass" : "fail", satisfied: input.result === "verified" }],
    result: input.result,
    observation: input.observation,
    ...(input.measurementChange && { measurementChange: input.measurementChange }),
    checkedAt,
  } as const;
  const measurementInput = await storeEvidence(root, record.importId, {
    schemaVersion: "RemedyMeasurementInputV1",
    importId: result.importId,
    sourceFingerprint: result.sourceFingerprint,
    stage: result.stage,
    failedSubmissionDigest: result.failedSubmissionDigest,
    replacementSubmissionDigest: result.replacementSubmissionDigest,
    criterion: result.criterion,
    measurements: result.measurements,
    ...(result.measurementChange && { measurementChange: result.measurementChange }),
  });
  const execution = await captureCommandExecution(root, {
    executable: process.execPath,
    argv: ["-e", `process.stdout.write(${JSON.stringify(JSON.stringify(result))})`],
    toolVersion: process.version,
    inputRefs: [measurementInput],
  });
  const executionRef = await storeEvidence(root, record.importId, execution);
  return storeEvidence(root, record.importId, {
    ...result,
    schemaVersion: "RemedyVerificationEvidenceV1",
    method: "deterministic",
    executionRef,
  });
}

async function researchEvidence(root: string, record: Awaited<ReturnType<typeof fixture>>["record"], valid = true) {
  const checkedAt = new Date().toISOString();
  const snapshot = await storeEvidence(root, record.importId, { text: "The retained source supports the repaired synthetic claim." });
  return storeEvidence(root, record.importId, {
    schemaVersion: "ResearchEvidenceV2", id: `research-${crypto.randomUUID()}`, createdAt: checkedAt,
    importId: record.importId, sourceFingerprint: record.sourceFingerprint, requirementRevision: WORKFLOW_REVISION,
    sources: [{ id: "source-1", url: "https://example.com/source", retrievedAt: checkedAt, snapshotRef: snapshot }],
    claims: [{ id: "claim-1", text: "The repaired claim has retained support.", sourceIds: ["source-1"], excerptLocations: [{ sourceId: "source-1", quote: valid ? "supports the repaired synthetic claim" : "missing excerpt" }], limitations: ["Synthetic local evidence only."] }],
    freshness: "Synthetic fixture captured for the current repair.",
  });
}

async function validatedResearchRemedy(root: string, record: Awaited<ReturnType<typeof fixture>>["record"], input: {
  failedSubmissionDigest: string;
  replacementSubmissionDigest: string;
  validatedEvidenceRef: { path: string; sha256: string };
  measurementChange?: { aspect: "measurement" | "viewport" | "criterion" | "threshold"; from: string; to: string; justification: string };
}) {
  const checkedAt = new Date().toISOString();
  return storeEvidence(root, record.importId, {
    schemaVersion: "RemedyVerificationEvidenceV1", importId: record.importId, sourceFingerprint: record.sourceFingerprint,
    stage: "RESEARCHING", failedSubmissionDigest: input.failedSubmissionDigest, replacementSubmissionDigest: input.replacementSubmissionDigest,
    criterion: { id: "research-evidence", revision: WORKFLOW_REVISION }, validatedEvidenceRef: input.validatedEvidenceRef,
    ...(input.measurementChange && { measurementChange: input.measurementChange }), checkedAt,
  });
}

test("three failed repairs require diagnosis before any further execution", async () => {
  const { root, record } = await fixture();
  const strategies: string[] = [];
  const attempts: number[] = [];
  try {
    let current = record;
    for (let i = 0; i < 3; i++) {
      current = await recordImportRepair(root, { ...current, transformation: { ...current.transformation!, title: `Attempt ${i}` } }, { strategy: "research", message: `Claim ${i} has no support.` });
    }
    await assert.rejects(executePendingImport(root, record.importId, async (context) => { strategies.push(context.strategy); attempts.push(context.attempt); return context.record; }), /UNCHANGED_SUBMISSION/);
    assert.deepEqual(strategies, []);
    assert.deepEqual(attempts, []);
    const stopped = await loadImport(root, record.importId);
    assert.equal(stopped.stage, "RESEARCHING");
    assert.equal(stopped.continuation?.kind, "repair");
    assert.ok(stopped.continuation?.kind === "repair" && stopped.continuation.diagnosisRequired);
    assert.equal(stopped.sourceDeletedAt, undefined);
    assert.ok(await readFile(path.join(root, ".automation/article-imports", `${record.importId}.source.md`), "utf8"));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("external failures never exhaust content strategies or delete the source", async () => {
  const { root, record } = await fixture();
  const keys = new Set<string>();
  try {
    for (let i = 0; i < 15; i++) {
      const result = await executePendingImport(root, record.importId, async (context) => {
        keys.add(context.idempotencyKey);
        assert.equal(context.strategy, "alternate-source");
        assert.equal(context.attempt, 1);
        throw new Error(["network unavailable", "credentials missing", "rate limit", "Git unavailable", "Vercel timeout"][i % 5]);
      });
      assert.equal(result.stage, "WAITING_EXTERNAL");
      assert.equal(result.sourceDeletedAt, undefined);
    }
    assert.equal(keys.size, 1);
    assert.ok(await readFile(path.join(root, ".automation/article-imports", `${record.importId}.source.md`), "utf8"));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("failure categories keep their recovery action when wording changes", async () => {
  const scenarios = [
    { category: "content-rejection", fail: (detail: string, _root: string) => presentationDesignRejected(detail), messages: ["review rejected content", "unsupported buyer claim"], kind: "repair", scope: "article" },
    { category: "invalid-evidence", fail: (detail: string, _root: string) => workflowEvidenceRejected(detail), messages: ["evidence digest mismatch", "citation cannot be validated"], kind: "repair", scope: "article" },
    { category: "unavailable-capability", fail: (detail: string, _root: string) => presentationCandidateUnavailable(detail), messages: ["reviewer offline", "editorial service cannot start"], kind: "blocked", scope: "shared" },
    { category: "uncertain-external-outcome", fail: (detail: string, root: string) => createLocalReleaseOperations(root, { format: "blog", runner: async () => { throw new Error(detail); } }).deploy("a".repeat(40)), messages: ["response lost after remote success", "provider result is indeterminate"], kind: "blocked", scope: "shared" },
  ] as const;

  for (const scenario of scenarios) {
    const actions: string[] = [];
    for (const message of scenario.messages) {
      const { root, record } = await fixture();
      let calls = 0;
      try {
        const failed = await executePendingImport(root, record.importId, async () => {
          calls++;
          return scenario.fail(message, root);
        });
        assert.equal(failed.continuation?.kind, scenario.kind);
        assert.equal(failed.blockerScope, scenario.scope);
        assert.equal(failed.continuation?.failureCategory, scenario.category);
        assert.equal(calls, 1);
        actions.push(failed.nextAction);

        if (scenario.kind === "blocked") {
          await executePendingImport(root, record.importId, async () => { calls++; return failed; });
          assert.equal(calls, 1, "a demonstrated shared failure must stop before another worker call");
        }
      } finally { await rm(root, { recursive: true, force: true }); }
    }
    assert.equal(actions[0], actions[1], `${scenario.category} must not route by message text`);
  }
});

test("three stage-wide repairs require a falsifiable diagnosis and a verified remedy", async () => {
  const { root, record } = await fixture();
  let calls = 0;
  try {
    let current = record;
    const failures = [
      () => workflowEvidenceRejected("finding-a worker-one session-one"),
      () => presentationDesignRejected("finding-b worker-two session-two"),
      () => workflowEvidenceRejected("finding-c worker-three session-three"),
    ];
    for (let index = 0; index < failures.length; index++) {
      current = await executePendingImport(root, record.importId, async () => {
        calls++;
        return failures[index]();
      });
      current = await loadImport(root, record.importId);
      assert.equal(current.repairStageTotals?.RESEARCHING, index + 1);
      if (index < failures.length - 1) {
        current = await withImportLease(root, record.importId, async (leased) => {
          leased.transformation!.title = `Changed repair input ${index + 1}`;
          await saveImport(root, leased);
          return leased;
        });
      }
    }
    assert.ok(current.continuation?.kind === "repair" && current.continuation.diagnosisRequired);

    current = await withImportLease(root, record.importId, async (leased) => {
      leased.transformation!.title = "Replacement after diagnosis";
      await saveImport(root, leased);
      return leased;
    });
    const supporting = await storeEvidence(root, record.importId, { observation: "All three failures reject the same stage output." });
    const failedSubmissionDigest = current.continuation!.kind === "repair" ? current.continuation.submittedFingerprint! : "";
    const invalidResearch = await researchEvidence(root, record, false);
    current = await withImportLease(root, record.importId, async (leased) => {
      leased.evidenceRefs = { ...(leased.evidenceRefs ?? {}), research: invalidResearch };
      await saveImport(root, leased); return leased;
    });
    const invalidReplacementDigest = await canonicalSubmissionFingerprint(current, root);
    const contradictedRemedy = await validatedResearchRemedy(root, record, { failedSubmissionDigest, replacementSubmissionDigest: invalidReplacementDigest, validatedEvidenceRef: invalidResearch });
    const invalidBase = { schemaVersion: "DiagnosisV1" as const, importId: record.importId, sourceFingerprint: record.sourceFingerprint, stage: current.stage, failedSubmissionDigest, replacementSubmissionDigest: invalidReplacementDigest, failureCode: "SYNTHETIC_STAGE_REPAIR_FAILED", cause: "The stage output is bound to stale evidence.", predictedObservation: "Rebinding the evidence makes the original validator pass.", disproofCheck: "Run the original validator; another rejection disproves the cause.", attemptedRecoveryRefs: [supporting], repairChange: { kind: "product-repair" as const, changedInputs: ["transformation.title"] }, createdAt: new Date().toISOString() };
    await assert.rejects(submitImportDiagnosis(root, record.importId, { ...invalidBase, remedyEvidenceRefs: [contradictedRemedy] }), /RESEARCH_EXCERPT_MISMATCH/);

    const validResearch = await researchEvidence(root, record);
    current = await withImportLease(root, record.importId, async (leased) => {
      leased.evidenceRefs = { ...(leased.evidenceRefs ?? {}), research: validResearch };
      await saveImport(root, leased); return leased;
    });
    const base = {
      schemaVersion: "DiagnosisV1" as const,
      importId: record.importId,
      sourceFingerprint: record.sourceFingerprint,
      stage: current.stage,
      failedSubmissionDigest,
      replacementSubmissionDigest: await canonicalSubmissionFingerprint(current, root),
      failureCode: "SYNTHETIC_STAGE_REPAIR_FAILED",
      cause: "The stage output is bound to stale evidence.",
      predictedObservation: "Rebinding the evidence makes the original validator pass.",
      disproofCheck: "Run the original validator; another rejection disproves the cause.",
      attemptedRecoveryRefs: [supporting],
      repairChange: { kind: "product-repair" as const, changedInputs: ["transformation.title"] },
      createdAt: new Date().toISOString(),
    };

    const mismatchedRemedy = await validatedResearchRemedy(root, record, {
      failedSubmissionDigest: base.failedSubmissionDigest,
      replacementSubmissionDigest: "f".repeat(64),
      validatedEvidenceRef: validResearch,
    });
    const verifiedRemedy = await validatedResearchRemedy(root, record, {
      failedSubmissionDigest: base.failedSubmissionDigest,
      replacementSubmissionDigest: base.replacementSubmissionDigest,
      validatedEvidenceRef: validResearch,
    });
    const selfAuthoredEcho = await echoRemedyEvidence(root, record, { failedSubmissionDigest: base.failedSubmissionDigest, replacementSubmissionDigest: base.replacementSubmissionDigest, result: "verified", observation: "Submitter-authored satisfied flags are not a controller check." });

    await assert.rejects(submitImportDiagnosis(root, record.importId, {
      ...base,
      remedyEvidenceRefs: [supporting],
    }));
    await assert.rejects(submitImportDiagnosis(root, record.importId, {
      ...base,
      remedyEvidenceRefs: [mismatchedRemedy],
    }), /DIAGNOSIS_REMEDY_BINDING_MISMATCH/);
    await assert.rejects(submitImportDiagnosis(root, record.importId, {
      ...base,
      remedyEvidenceRefs: [selfAuthoredEcho],
    }), /invalid_union|unrecognized_keys|invalid_type|Invalid input/i);
    await executePendingImport(root, record.importId, async ({ record: pending }) => { calls++; return pending; });
    assert.equal(calls, 3, "a contradicted diagnosis must not unlock another stage execution");

    await withImportLease(root, record.importId, async (leased) => {
      const legacy = { ...base, remedyEvidenceRefs: [supporting], remedyCheck: { method: "deterministic" as const, result: "verified" as const, observation: "Legacy submitter assertion without controller verification." } };
      const updated = { ...leased, diagnoses: [...(leased.diagnoses ?? []), legacy] };
      await saveImport(root, updated);
      return updated;
    });
    await executePendingImport(root, record.importId, async ({ record: pending }) => { calls++; return pending; });
    assert.equal(calls, 3, "historical submitter assertions must not gain retroactive approval");

    await submitImportDiagnosis(root, record.importId, {
      ...base,
      remedyEvidenceRefs: [verifiedRemedy],
    });
    await executePendingImport(root, record.importId, async ({ record: repaired }) => { calls++; return repaired; });
    assert.equal(calls, 4);
    const saved = await loadImport(root, record.importId);
    assert.ok(saved.diagnoses?.some((diagnosis) => diagnosis.remedyCheck?.result === "verified" && diagnosis.consumedAt));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("measurement changes require justification and separate independent verification", async () => {
  const { root, record } = await fixture();
  try {
    let current = record;
    for (let index = 0; index < 3; index++) {
      current = await executePendingImport(root, record.importId, async () => {
        return presentationDesignRejected(`measurement failure ${index}`);
      });
      if (index < 2) {
        current = await withImportLease(root, record.importId, async (leased) => {
          leased.transformation!.title = `Measurement attempt ${index}`;
          await saveImport(root, leased);
          return leased;
        });
      }
    }
    current = await withImportLease(root, record.importId, async (leased) => {
      leased.transformation!.title = "Candidate with changed threshold";
      await saveImport(root, leased);
      return leased;
    });
    assert.ok(current.continuation?.kind === "repair");
    const supporting = await storeEvidence(root, record.importId, { observation: "The old threshold rejects the fixture." });
    const validResearch = await researchEvidence(root, record);
    current = await withImportLease(root, record.importId, async (leased) => {
      leased.evidenceRefs = { ...(leased.evidenceRefs ?? {}), research: validResearch };
      await saveImport(root, leased); return leased;
    });
    const replacementSubmissionDigest = await canonicalSubmissionFingerprint(current, root);
    const measurementChange = { aspect: "threshold" as const, from: "40", to: "30", justification: "The deterministic title-length criterion is recalibrated to the retained replacement." };
    const remedy = await validatedResearchRemedy(root, record, { failedSubmissionDigest: current.continuation.submittedFingerprint!, replacementSubmissionDigest, validatedEvidenceRef: validResearch });
    const aliasedResearch = await validatedResearchRemedy(root, record, { failedSubmissionDigest: current.continuation.submittedFingerprint!, replacementSubmissionDigest, validatedEvidenceRef: validResearch, measurementChange });
    const independent = await storeEvidence(root, record.importId, {
      schemaVersion: "RemedyMeasurementVerificationV1", importId: record.importId, sourceFingerprint: record.sourceFingerprint,
      stage: current.stage, failedSubmissionDigest: current.continuation.submittedFingerprint!, replacementSubmissionDigest,
      criterion: { id: "transformation.title-length", revision: WORKFLOW_REVISION }, metric: "transformation.title.length",
      observedValue: current.transformation!.title.length, measurementChange, checkedAt: new Date().toISOString(),
    });
    const diagnosis = {
      schemaVersion: "DiagnosisV1",
      importId: record.importId,
      sourceFingerprint: record.sourceFingerprint,
      stage: current.stage,
      failedSubmissionDigest: current.continuation.submittedFingerprint,
      replacementSubmissionDigest,
      failureCode: "SYNTHETIC_MEASUREMENT_REPAIR",
      cause: "The measurement threshold is not calibrated for this viewport.",
      predictedObservation: "The revised threshold preserves the criterion and accepts the control.",
      disproofCheck: "Run the defective control; acceptance would disprove the calibration.",
      attemptedRecoveryRefs: [supporting],
      remedyEvidenceRefs: [remedy],
      createdAt: new Date().toISOString(),
    };

    await assert.rejects(submitImportDiagnosis(root, record.importId, {
      ...diagnosis,
      repairChange: { kind: "measurement-change", aspect: "threshold", from: "0.90", to: "0.85" },
    }));
    await assert.rejects(submitImportDiagnosis(root, record.importId, {
      ...diagnosis,
      repairChange: { kind: "measurement-change", ...measurementChange, independentVerificationRef: remedy },
    }), /Measurement verification must be independent/);
    await assert.rejects(submitImportDiagnosis(root, record.importId, {
      ...diagnosis,
      repairChange: { kind: "measurement-change", ...measurementChange, independentVerificationRef: aliasedResearch },
    }), /Invalid input|unrecognized_keys|invalid_type/i);
    await submitImportDiagnosis(root, record.importId, {
      ...diagnosis,
      repairChange: { kind: "measurement-change", ...measurementChange, independentVerificationRef: independent },
    });
    const saved = await loadImport(root, record.importId);
    assert.equal(saved.diagnoses?.at(-1)?.repairChange?.kind, "measurement-change");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("a concurrent resume cannot execute an already claimed import", async () => {
  const { root, record } = await fixture();
  try {
    let calls = 0;
    let started!: () => void;
    let finish!: () => void;
    const ready = new Promise<void>((resolve) => { started = resolve; });
    const waiting = new Promise<void>((resolve) => { finish = resolve; });
    const first = executePendingImport(root, record.importId, async ({ record: current }) => {
      calls++;
      started();
      await waiting;
      return current;
    });
    await ready;
    await executePendingImport(root, record.importId, async ({ record: current }) => { calls++; return current; });
    finish();
    await first;
    assert.equal(calls, 1);
    assert.equal((await loadImport(root, record.importId)).stage, "RESEARCHING");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("expiry never admits a successor while the owning process is live", async () => {
  const { root, record } = await fixture();
  try {
    const old = await claimImportLease(root, record.importId, 10);
    assert.ok(old);
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(await claimImportLease(root, record.importId), undefined);
    await old.assertOwned();
    await old.release();
    const successor = await claimImportLease(root, record.importId);
    assert.ok(successor);
    assert.notEqual(old.ownerToken, successor.ownerToken);
    await assert.rejects(old.assertOwned, /LEASE_OWNER_CHANGED/);
    await successor.assertOwned();
    assert.equal(await claimImportLease(root, record.importId), undefined);
    await successor.release();
    const next = await claimImportLease(root, record.importId);
    assert.ok(next);
    await next.release();
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("CLI exposes durable authoring work to the supervising heartbeat", async () => {
  const { root, record } = await fixture();
  try {
    await executeImportCommand(root, { kind: "resume", importId: record.importId });
    const pending = await loadImport(root, record.importId);
    assert.equal(pending.stage, "RESEARCHING");
    assert.match(pending.nextAction, /execute .*\.work\.json/);
    assert.equal(pending.strategyAttempts["transient:agent-executor"], undefined);
  } finally { await rm(root, { recursive: true, force: true }); }
});
