import { persistFixture } from "./fixtures/article-command";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { hostname } from "node:os";
import test from "node:test";
import { advanceImport, canonicalSubmissionFingerprint, claimImportLease, clearImportBlocker, createArticleImport, executePendingImport, loadImport, recordImportFailure, recordImportRepair, submitImportDiagnosis, upgradeImportEvidence } from "../src/lib/article-import/engine";
import { claimNextIntakeEntry, createIntakeRun, markIntakeEntry, loadIntakeRun, checkIntakeRun, reconcileIntakeEntry, upgradeIntakeRun } from "../src/lib/article-import/intake";
import { inspectImportCompletion } from "../src/lib/article-import/completion";
import { recoverWorkflowLease } from "../src/lib/article-import/workflow-lease";
import { storeEvidence } from "../src/lib/article-import/workflow-evidence";
import { captureCommandExecution } from "../src/lib/article-import/execution-evidence";
import { createSupervisedImportExecutor } from "../src/lib/article-import/supervised-executor";

async function fixture() {
  const parent = path.join(process.cwd(), ".scratch"); await mkdir(parent, { recursive: true });
  const root = await mkdtemp(path.join(parent, "state-v2-"));
  await mkdir(path.join(root, "Article Intake"));
  await writeFile(path.join(root, "approved-urls.md"), "");
  await writeFile(path.join(root, "Article Intake/a.md"), "# Workflow guide\n\nSynthetic fixture for automation gates.");
  return root;
}
test("source creation serializes before allocation and reuses one identity", async () => {
  const root = await fixture();
  try {
    const results = await Promise.allSettled([createArticleImport(root, "Article Intake/a.md"), createArticleImport(root, "Article Intake/a.md")]);
    const record = results.find((result) => result.status === "fulfilled"); assert.ok(record?.status === "fulfilled");
    assert.equal((await createArticleImport(root, "Article Intake/a.md")).importId, record.value.importId);
    assert.equal(record.value.schemaVersion, "ExternalArticleImportV2");
    assert.ok(record.value.sourceRef);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("expiry never permits takeover of a live writer", async () => {
  const root = await fixture();
  try {
    const record = await createArticleImport(root, "Article Intake/a.md");
    const owner = await claimImportLease(root, record.importId, 1); assert.ok(owner);
    await new Promise((resolve) => setTimeout(resolve, 5));
    assert.equal(await claimImportLease(root, record.importId), undefined);
    await assert.rejects(recoverWorkflowLease(root, "import", record.importId), /LEASE_RECOVERY_UNVERIFIED/);
    await owner.assertOwned(); await owner.release();
    const next = await claimImportLease(root, record.importId); assert.ok(next); await next.release();
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("missing research cannot advance and a terminal flag is not completion", async () => {
  const root = await fixture();
  try {
    const record = await advanceImport(root, await createArticleImport(root, "Article Intake/a.md"), "Captured.");
    await assert.rejects(advanceImport(root, record, "Pretend researched."), /WORKFLOW_EVIDENCE/);
    await persistFixture(root, { ...record, stage: "LIVE" });
    assert.equal((await inspectImportCompletion(root, record.importId)).status, "REPAIR");
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("intake mutation validates terminal identity and reloads current state", async () => {
  const root = await fixture();
  try {
    const run = await createIntakeRun(root);
    await assert.rejects(markIntakeEntry(root, run, run.entries[0].relativePath, "LIVE"), /INTAKE_TERMINAL_PROOF_INVALID/);
    const selected = await claimNextIntakeEntry(root, run.runId); assert.equal(selected.entries[0].status, "PROCESSING");
    const record = await createArticleImport(root, selected.entries[0].capturedPath!);
    await markIntakeEntry(root, selected, selected.entries[0].relativePath, "PROCESSING", { importId: record.importId });
    assert.equal((await loadIntakeRun(root, run.runId)).entries[0].importId, record.importId);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("three different failed submissions aggregate by productive stage", async () => {
  const root = await fixture();
  try {
    let record = await advanceImport(root, await createArticleImport(root, "Article Intake/a.md"), "Captured.");
    for (let i = 0; i < 3; i++) {
      record = { ...record, transformation: { ...record.transformation!, title: `Changed ${i}` } };
      record = await recordImportRepair(root, record, { strategy: `strategy-${i}`, message: `Different failure ${i}` });
    }
    assert.equal(record.repairStageTotals?.RESEARCHING, 3);
    assert.ok(record.continuation?.kind === "repair" && record.continuation.diagnosisRequired);
    await assert.rejects(executePendingImport(root, record.importId, async () => { throw new Error("Must not run"); }), /UNCHANGED_SUBMISSION/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("same evidence path with changed bytes changes submission digest", async () => {
  const root = await fixture();
  try {
    const record = await createArticleImport(root, "Article Intake/a.md");
    await writeFile(path.join(root, "evidence.json"), JSON.stringify({ value: 1 }));
    record.evidenceRefs = { research: { path: "evidence.json", sha256: "a".repeat(64) } };
    const before = await canonicalSubmissionFingerprint(record, root);
    await writeFile(path.join(root, "evidence.json"), JSON.stringify({ value: 2 }));
    assert.notEqual(await canonicalSubmissionFingerprint(record, root), before);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("repair digest ignores public route paths and binds transitive evidence bytes", async () => {
  const root = await fixture();
  try {
    const record = await createArticleImport(root, "Article Intake/a.md");
    await writeFile(path.join(root, "dependency.json"), JSON.stringify({ observed: "before" }));
    await writeFile(path.join(root, "candidate.json"), JSON.stringify({ path: "/public-route", canonicalPath: "/canonical-route", links: [{ path: "/related" }], evidence: { path: "dependency.json", sha256: "a".repeat(64) } }));
    record.artifactPath = "candidate.json";
    const before = await canonicalSubmissionFingerprint(record, root);
    await writeFile(path.join(root, "dependency.json"), JSON.stringify({ observed: "after" }));
    assert.notEqual(await canonicalSubmissionFingerprint(record, root), before);
    const repaired = await recordImportRepair(root, record, { strategy: "release", message: "Synthetic release validation failure" });
    assert.equal(repaired.continuation?.kind, "repair");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("supervised work-to-repair transition preserves digest and rejects unchanged resubmission", async () => {
  const root = await fixture();
  try {
    const record = await advanceImport(root, await createArticleImport(root, "Article Intake/a.md"), "Captured.");
    const supervised = createSupervisedImportExecutor(root);
    let executions = 0;
    const execute: typeof supervised = async (context) => { executions++; return supervised(context); };
    const pending = await executePendingImport(root, record.importId, execute);
    assert.ok(pending.continuation?.kind === "work");
    const packet = pending.continuation;
    await writeFile(path.join(root, "research.json"), JSON.stringify({ sources: [] }));
    await writeFile(path.resolve(root, packet.resultPath), JSON.stringify({ idempotencyKey: packet.idempotencyKey, sourceFingerprint: record.sourceFingerprint, summary: "Synthetic invalid research submission", work: { stage: "RESEARCHING", evidencePath: "research.json" } }));
    const failed = await executePendingImport(root, record.importId, execute);
    assert.ok(failed.continuation?.kind === "repair");
    assert.equal(await canonicalSubmissionFingerprint(failed, root), failed.continuation.submittedFingerprint);
    await assert.rejects(executePendingImport(root, record.importId, execute), /UNCHANGED_SUBMISSION/);
    assert.equal(executions, 2);
    await writeFile(path.join(root, "research.json"), JSON.stringify({ sources: [{ url: "https://example.com/source" }] }));
    assert.notEqual(await canonicalSubmissionFingerprint(failed, root), failed.continuation.submittedFingerprint);
    const retried = await executePendingImport(root, record.importId, execute);
    assert.equal(executions, 3, "changed evidence reaches validation without granting passage");
    assert.ok(retried.continuation?.kind === "repair");
    assert.equal(await canonicalSubmissionFingerprint(retried, root), retried.continuation.submittedFingerprint);
    await assert.rejects(executePendingImport(root, record.importId, execute), /UNCHANGED_SUBMISSION/);
    assert.equal(executions, 3);
  } finally { await rm(root, { recursive: true, force: true }); }
});

for (const evidenceField of ["assessmentPath", "editorialExecutionPath", "presentationEvidencePath"] as const) {
  test(`failed submission retries after in-place ${evidenceField} repair before evidence refs were persisted`, async () => {
    const root = await fixture();
    try {
      const record = await advanceImport(root, await createArticleImport(root, "Article Intake/a.md"), "Captured.");
      const workDirectory = path.join(root, ".automation/article-imports/work", record.importId);
      await mkdir(workDirectory, { recursive: true });
      const evidencePath = `${evidenceField}.json`;
      await writeFile(path.join(root, evidencePath), JSON.stringify({ ready: false, path: "/public-route" }));
      await writeFile(path.join(workDirectory, "synthetic.result.json"), JSON.stringify({ work: { stage: record.stage, [evidenceField]: evidencePath } }));
      let executions = 0;
      const executor = async ({ record: current }: { record: typeof record }) => {
        executions++;
        const evidence = JSON.parse(await readFile(path.join(root, evidencePath), "utf8"));
        if (!evidence.ready) throw new Error("Synthetic stage evidence failed before assigning evidenceRefs");
        return current;
      };
      const failed = await executePendingImport(root, record.importId, executor);
      assert.equal(failed.continuation?.kind, "repair");
      assert.deepEqual(failed.evidenceRefs, {});
      const before = await canonicalSubmissionFingerprint(failed, root);
      await assert.rejects(executePendingImport(root, record.importId, executor), /UNCHANGED_SUBMISSION/);
      await writeFile(path.join(root, evidencePath), JSON.stringify({ ready: true, path: "/public-route" }));
      assert.notEqual(await canonicalSubmissionFingerprint(failed, root), before);
      await executePendingImport(root, record.importId, executor);
      assert.equal(executions, 2);
    } finally { await rm(root, { recursive: true, force: true }); }
  });
}
test("explicit legacy upgrade preserves history and terminal mismatch cannot skip", async () => {
  const root = await fixture();
  try {
    const run = await createIntakeRun(root), entry = run.entries[0];
    const record = await createArticleImport(root, entry.capturedPath!);
    const legacy = { ...record, schemaVersion: "ExternalArticleImportV1", workflowVersion: undefined, stage: "LIVE" };
    await writeFile(path.join(root, ".automation/article-imports", `${record.importId}.json`), JSON.stringify(legacy));
    const runFile = path.join(root, ".automation/article-imports/intake", run.runId, "run.json");
    await writeFile(runFile, JSON.stringify({ ...run, schemaVersion: "ArticleIntakeRunV1", entries: [{ ...entry, status: "LIVE", importId: record.importId }] }));
    await upgradeImportEvidence(root, record.importId); await upgradeIntakeRun(root, run.runId);
    assert.equal((await checkIntakeRun(root, run.runId)).ok, false);
    await assert.rejects(claimNextIntakeEntry(root, run.runId), /INTAKE_TERMINAL_PROOF_INVALID/);
    const reconciled = await reconcileIntakeEntry(root, run.runId, entry.relativePath);
    assert.equal(reconciled.entries[0].status, "PROCESSING");
    assert.equal((await loadImport(root, record.importId)).stage, "RESEARCHING");
    assert.equal(JSON.parse(await readFile(`${runFile}.v1.archive`, "utf8")).entries[0].status, "LIVE");
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("genuine empty input quarantine retains source and verifies independently", async () => {
  const root = await fixture();
  try {
    await writeFile(path.join(root, "empty.md"), "");
    const record = await createArticleImport(root, "empty.md");
    assert.equal(record.stage, "QUARANTINED"); assert.ok(record.sourceRef);
    assert.equal((await inspectImportCompletion(root, record.importId)).status, "COMPLETE");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("reservation survives record-creation crash and stale intake writes cannot overwrite", async () => {
  const root = await fixture();
  try {
    const record = await createArticleImport(root, "Article Intake/a.md");
    await rm(path.join(root, ".automation/article-imports", `${record.importId}.json`));
    const recovered = await createArticleImport(root, "Article Intake/a.md");
    assert.equal(recovered.importId, record.importId);
    const run = await createIntakeRun(root);
    await claimNextIntakeEntry(root, run.runId);
    await assert.rejects(markIntakeEntry(root, run, run.entries[0].relativePath, "PROCESSING"), /INTAKE_REVISION_CONFLICT/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("diagnosis permits only the bound changed submission once and preserves totals", async () => {
  const root = await fixture();
  try {
    let record = await advanceImport(root, await createArticleImport(root, "Article Intake/a.md"), "Captured.");
    for (let i = 0; i < 3; i++) record = await recordImportRepair(root, { ...record, transformation: { ...record.transformation!, title: `Attempt ${i}` } }, { strategy: "research", message: `Failure ${i}` });
    assert.ok(record.continuation?.kind === "repair");
    const failedSubmissionDigest = record.continuation.submittedFingerprint!;
    record = { ...record, transformation: { ...record.transformation!, title: "Verified repair" } };
    await persistFixture(root, record);
    const evidence = await storeEvidence(root, record.importId, { observed: "synthetic failing input inspected and replacement validated" });
    const input = { schemaVersion: "DiagnosisV1", importId: record.importId, sourceFingerprint: record.sourceFingerprint, stage: record.stage, failedSubmissionDigest, replacementSubmissionDigest: await canonicalSubmissionFingerprint(record, root), failureCode: "FIXTURE_FAILURE", cause: "Incorrect synthetic input", attemptedRecoveryRefs: [evidence], remedyEvidenceRefs: [evidence], createdAt: new Date().toISOString() };
    await assert.rejects(submitImportDiagnosis(root, record.importId, { ...input, failedSubmissionDigest: "0".repeat(64) }), /DIAGNOSIS_BINDING_MISMATCH/);
    await submitImportDiagnosis(root, record.importId, input);
    let executions = 0;
    await executePendingImport(root, record.importId, async () => { executions++; throw new Error("A genuinely different failure"); });
    const result = await loadImport(root, record.importId);
    assert.equal(executions, 1); assert.equal(result.repairStageTotals?.RESEARCHING, 4);
    assert.ok(result.diagnoses?.[0].consumedAt);
    await assert.rejects(executePendingImport(root, record.importId, async (context) => { executions++; return context.record; }), /UNCHANGED_SUBMISSION/);
    assert.equal(executions, 1);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("explicit recovery validates retained execution then clears blocked import without executing it", async () => {
  const root = await fixture();
  try {
    const record = await advanceImport(root, await createArticleImport(root, "Article Intake/a.md"), "Captured.");
    const blocked = await recordImportFailure(root, record, { strategy: "research", classification: "transient", message: "credentials missing" });
    assert.ok(blocked.continuation?.kind === "blocked");
    const execution = await captureCommandExecution(root, { executable: process.execPath, argv: ["-e", "process.stdout.write('synthetic capability check')"], toolVersion: process.version, inputRefs: [] });
    const executionRef = await storeEvidence(root, record.importId, execution);
    const recovery = { schemaVersion: "RecoveryEvidenceV1", importId: record.importId, sourceFingerprint: record.sourceFingerprint, cause: blocked.continuation.cause, resumptionRequirement: blocked.continuation.resumptionRequirement, checkedAt: new Date().toISOString(), executionRefs: [executionRef] };
    const invalid = await storeEvidence(root, record.importId, { ...recovery, cause: "Different problem" });
    await assert.rejects(clearImportBlocker(root, record.importId, invalid), /RECOVERY_EVIDENCE_MISMATCH/);
    const proof = await storeEvidence(root, record.importId, recovery);
    const restored = await clearImportBlocker(root, record.importId, proof);
    assert.equal(restored.stage, "RESEARCHING"); assert.equal(restored.continuation, undefined);
    assert.deepEqual(restored.strategyAttempts, blocked.strategyAttempts); assert.equal(restored.recoveryRefs?.length, 1);
    const statePath = path.join(root, ".automation/article-imports", `${record.importId}.json`);
    const beforeReplay = await readFile(statePath, "utf8");
    assert.equal((await clearImportBlocker(root, record.importId, proof)).stage, restored.stage);
    assert.equal(await readFile(statePath, "utf8"), beforeReplay);
    await assert.rejects(clearImportBlocker(root, record.importId, invalid), /IMPORT_BLOCKER_REQUIRED/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("confirmed dead-owner recovery admits one successor and does not execute work", async () => {
  const root = await fixture();
  try {
    const record = await createArticleImport(root, "Article Intake/a.md");
    const child = await captureCommandExecution(root, { executable: process.execPath, argv: ["-e", "console.log(JSON.stringify({pid:process.pid,processStart:new Date(Date.now()-process.uptime()*1000).toISOString()}))"], toolVersion: process.version, inputRefs: [] });
    assert.equal(child.kind, "command"); if (child.kind !== "command") throw new Error("command required");
    const identity = JSON.parse(child.stdout) as { pid: number; processStart: string };
    const directory = path.join(root, ".automation/article-imports/leases/import", record.importId);
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, "1.json"), JSON.stringify({ generation: 1, ownerToken: "exited-test-worker", expiresAt: 0, machine: hostname(), ...identity, released: false }));
    const recovered = await Promise.allSettled([recoverWorkflowLease(root, "import", record.importId), recoverWorkflowLease(root, "import", record.importId)]);
    assert.ok(recovered.some((result) => result.status === "fulfilled"));
    const candidates = await Promise.all([claimImportLease(root, record.importId), claimImportLease(root, record.importId)]);
    assert.equal(candidates.filter(Boolean).length, 1);
    await candidates.find(Boolean)!.release();
    assert.equal((await loadImport(root, record.importId)).stage, "INGESTING");
  } finally { await rm(root, { recursive: true, force: true }); }
});
