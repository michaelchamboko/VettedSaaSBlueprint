import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { persistFixture, executeFixtureCommand as executeImportCommand } from "./fixtures/article-command";
import { createArticleImport, loadImport, writeJsonAtomically } from "../src/lib/article-import/engine";
import { sha256, storeEvidence } from "../src/lib/article-import/execution-evidence";
import { WORKFLOW_REVISION } from "../src/lib/article-import/workflow-requirements";
import { writeAcquisitionResult, writeGapPlanResult } from "./fixtures/article-research-flow";

async function fixture() {
  const parent = path.join(process.cwd(), ".scratch");
  await mkdir(parent, { recursive: true });
  const root = await mkdtemp(path.join(parent, "research-recovery-"));
  await writeFile(path.join(root, "approved-urls.md"), "");
  await writeFile(path.join(root, "article.md"), "# Evidence guide\\n\\nA practical workflow with material claims that need source verification.");
  const record = await createArticleImport(root, "article.md");
  await executeImportCommand(root, { kind: "resume", importId: record.importId });
  const snapshotRef = await storeEvidence(root, record.importId, { text: "Supported fixture claim." });
  const evidence = {
    schemaVersion: "ResearchEvidenceV2", id: "research", createdAt: "2026-11-03T00:00:00.000Z",
    importId: record.importId, sourceFingerprint: record.sourceFingerprint, requirementRevision: WORKFLOW_REVISION,
    sources: [{ id: "source", url: "https://example.test/manual", retrievedAt: "2026-11-03T00:00:00.000Z", snapshotRef }],
    claims: [{ id: "claim", text: "Supported fixture claim.", sourceIds: ["source"], excerptLocations: [{ sourceId: "source", quote: "Supported fixture claim." }], limitations: ["Synthetic fixture."] }],
    freshness: "Fixed test input.",
  };
  return { root, record, evidence, snapshotRef };
}

test("invalid research requires actual repair and unchanged submissions cannot advance", async () => {
  const { root, record, evidence } = await fixture();
  try {
    await executeImportCommand(root, { kind: "resume", importId: record.importId });
    const waiting = await loadImport(root, record.importId);
    assert.equal(waiting.continuation?.kind, "work");
    if (waiting.continuation?.kind !== "work") throw new Error("Missing research work");
    const packet = JSON.parse(await readFile(path.join(root, waiting.continuation.workPath), "utf8"));
    assert.match(packet.instructions, /material claim|registry decision/i);
    const evidencePath = "research.json";
    await writeJsonAtomically(path.join(root, evidencePath), { ...evidence, claims: [{ ...evidence.claims[0], excerptLocations: [{ sourceId: "source", quote: "Not in the source." }] }] });
    await writeGapPlanResult(root, waiting.continuation, { claimId: evidence.claims[0].id, claimText: evidence.claims[0].text });
    await executeImportCommand(root, { kind: "resume", importId: record.importId });
    const acquisition = await loadImport(root, record.importId);
    if (acquisition.continuation?.kind !== "work") throw new Error("Missing research acquisition work");
    await writeAcquisitionResult(root, acquisition.continuation, evidencePath);
    await executeImportCommand(root, { kind: "resume", importId: record.importId });
    const failed = await loadImport(root, record.importId);
    assert.equal(failed.stage, "RESEARCHING");
    assert.equal(failed.continuation?.kind, "repair");
    assert.match(failed.nextAction, /must conduct research/i);
    await assert.rejects(executeImportCommand(root, { kind: "resume", importId: record.importId }), /UNCHANGED_SUBMISSION/);
    await writeJsonAtomically(path.join(root, evidencePath), evidence);
    await executeImportCommand(root, { kind: "resume", importId: record.importId });
    await executeImportCommand(root, { kind: "resume", importId: record.importId });
    const advanced = await loadImport(root, record.importId);
    assert.equal(advanced.stage, "TRANSFORMING");
    assert.equal(advanced.resumeStage, undefined);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("later stages with missing or corrupted research return to research before any stage work", async () => {
  for (const stage of ["TRANSFORMING", "REFINING", "VALIDATING", "RELEASING", "VERIFYING"] as const) {
    for (const missing of [true, false]) {
      const { root, record, evidence, snapshotRef } = await fixture();
      try {
        const research = await storeEvidence(root, record.importId, evidence);
        if (!missing) await writeFile(path.join(root, snapshotRef.path), "Corrupted source bytes");
        const current = await loadImport(root, record.importId);
        await persistFixture(root, { ...current, stage, resumeStage: "RESEARCHING", evidenceRefs: missing ? {} : { research, assessment: research, editorial: research, presentation: research },
          repairStageTotals: { RESEARCHING: 2 },
          continuation: { kind: "repair", stage, failureFingerprint: "a".repeat(64), submittedFingerprint: "b".repeat(64), diagnosisRequired: false, requiredChange: "Old stage repair.", idempotencyKey: "c".repeat(64), sourceFingerprint: record.sourceFingerprint },
        });
        await executeImportCommand(root, { kind: "resume", importId: record.importId });
        const repaired = await loadImport(root, record.importId);
        assert.equal(repaired.stage, "RESEARCHING", stage);
        assert.equal(repaired.continuation?.kind, "work", stage);
        assert.deepEqual(repaired.evidenceRefs, {});
        assert.equal(repaired.repairStageTotals?.RESEARCHING, 2);
        assert.equal(repaired.sourceFingerprint, record.sourceFingerprint);
        assert.ok(repaired.stageReceipts.some((receipt) => receipt.message.includes("RESEARCH_RECOVERY_REQUIRED")));
        if (repaired.continuation?.kind !== "work") throw new Error("Missing recovery packet");
        const packet = JSON.parse(await readFile(path.join(root, repaired.continuation.workPath), "utf8"));
        assert.match(packet.instructions, /material claim|registry decision/i);
      } finally { await rm(root, { recursive: true, force: true }); }
    }
  }
});


test("research recovery preserves an outstanding diagnosis requirement", async () => {
  const { root, record } = await fixture();
  try {
    const current = await loadImport(root, record.importId);
    await persistFixture(root, { ...current, stage: "TRANSFORMING", repairStageTotals: { TRANSFORMING: 3 },
      continuation: { kind: "repair", stage: "TRANSFORMING", failureFingerprint: "a".repeat(64), submittedFingerprint: "b".repeat(64), diagnosisRequired: true, requiredChange: "Diagnose failed transform.", idempotencyKey: "c".repeat(64), sourceFingerprint: record.sourceFingerprint },
    });
    await executeImportCommand(root, { kind: "resume", importId: record.importId });
    const waiting = await loadImport(root, record.importId);
    assert.equal(waiting.stage, "TRANSFORMING");
    assert.equal(waiting.continuation?.kind, "repair");
    if (waiting.continuation?.kind !== "repair") throw new Error("Missing diagnosis gate");
    assert.equal(waiting.continuation.diagnosisRequired, true);
    assert.equal(waiting.repairStageTotals?.TRANSFORMING, 3);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("research failure during an existing release preserves its journal and requires verified recovery", async () => {
  const { root, record } = await fixture();
  try {
    const current = await loadImport(root, record.importId);
    const pendingRelease = {
      schemaVersion: "ImportPendingReleaseV1" as const, reviewedCommitSha: "a".repeat(40),
      branch: "codex/article-import/" + record.importId, createdAt: "2026-11-03T00:00:00.000Z",
      rollbackDeploymentId: "known-good", rollbackCommitSha: "b".repeat(40),
      operations: { merge: { reviewedHeadSha: "a".repeat(40), mergeCommitSha: "c".repeat(40) } },
    };
    await persistFixture(root, { ...current, stage: "RELEASING", pendingRelease });
    await executeImportCommand(root, { kind: "resume", importId: record.importId });
    const blocked = await loadImport(root, record.importId);
    assert.equal(blocked.stage, "RELEASING");
    assert.deepEqual(blocked.pendingRelease, pendingRelease);
    assert.equal(blocked.continuation?.kind, "blocked");
    assert.equal(blocked.blockerScope, "shared");
    assert.match(blocked.nextAction, /must conduct research/i);
    await executeImportCommand(root, { kind: "resume", importId: record.importId });
    assert.deepEqual((await loadImport(root, record.importId)).pendingRelease, pendingRelease);
  } finally { await rm(root, { recursive: true, force: true }); }
});


test("failed material-claims assessment requires research even when the receipt is structurally valid", async () => {
  const { root, record, evidence } = await fixture();
  try {
    await executeImportCommand(root, { kind: "resume", importId: record.importId });
    const researching = await loadImport(root, record.importId);
    if (researching.continuation?.kind !== "work") throw new Error("Missing initial research packet");
    const initialPacket = researching.continuation;
    await writeJsonAtomically(path.join(root, "research.json"), evidence);
    await writeGapPlanResult(root, initialPacket, { claimId: evidence.claims[0].id, claimText: evidence.claims[0].text });
    await executeImportCommand(root, { kind: "resume", importId: record.importId });
    const initialAcquisition = await loadImport(root, record.importId);
    if (initialAcquisition.continuation?.kind !== "work") throw new Error("Missing initial research acquisition");
    await writeAcquisitionResult(root, initialAcquisition.continuation, "research.json");
    await executeImportCommand(root, { kind: "resume", importId: record.importId });
    const current = await loadImport(root, record.importId);
    assert.equal(current.stage, "TRANSFORMING");
    await persistFixture(root, { ...current, stage: "TRANSFORMING",
      stageReceipts: [...current.stageReceipts, { stage: "TRANSFORMING", status: "failed", at: new Date().toISOString(), message: "WORKFLOW_EVIDENCE_INVALID: ASSESSMENT_RULE_FAILED:claims" }],
    });
    await executeImportCommand(root, { kind: "resume", importId: record.importId });
    const recovered = await loadImport(root, record.importId);
    assert.equal(recovered.stage, "RESEARCHING");
    assert.equal(recovered.continuation?.kind, "work");
    assert.deepEqual(recovered.evidenceRefs, {});
    if (recovered.continuation?.kind !== "work") throw new Error("Missing new research work");
    assert.notEqual(recovered.continuation.idempotencyKey, initialPacket.idempotencyKey);
    assert.notEqual(recovered.continuation.resultPath, initialPacket.resultPath);
    assert.ok(await readFile(path.join(root, initialPacket.resultPath), "utf8"));
    await executeImportCommand(root, { kind: "resume", importId: record.importId });
    assert.equal((await loadImport(root, record.importId)).stage, "RESEARCHING");
    await writeGapPlanResult(root, recovered.continuation, { claimId: evidence.claims[0].id, claimText: evidence.claims[0].text });
    await executeImportCommand(root, { kind: "resume", importId: record.importId });
    const newAcquisition = await loadImport(root, record.importId);
    if (newAcquisition.continuation?.kind !== "work") throw new Error("Missing new research acquisition");
    await writeAcquisitionResult(root, newAcquisition.continuation, "research.json");
    await executeImportCommand(root, { kind: "resume", importId: record.importId });
    assert.equal((await loadImport(root, record.importId)).stage, "TRANSFORMING");
    await executeImportCommand(root, { kind: "resume", importId: record.importId });
    const transforming = await loadImport(root, record.importId);
    if (transforming.continuation?.kind !== "work") throw new Error("Missing transform work");
    assert.equal(transforming.continuation.idempotencyKey, sha256(record.importId + ":" + record.sourceFingerprint + ":TRANSFORMING:field-repair:research-recovery-1"));
  } finally { await rm(root, { recursive: true, force: true }); }
});
