import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import path from "node:path";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { advanceImport, createArticleImport, executePendingImport, loadImport, writeJsonAtomically } from "../src/lib/article-import/engine";
import { createSupervisedImportExecutor } from "../src/lib/article-import/supervised-executor";
import { approveFixture, prepareApprovalFixture } from "./fixtures/article-content-approval";
import { executeFixtureCommand, persistFixture } from "./fixtures/article-command";
import { storeEvidence, verifyEvidenceRef } from "../src/lib/article-import/execution-evidence";
import { importPacketId } from "../src/lib/article-import/packet-binding";
import type { WorkerRunner } from "../src/lib/article-import/worker-runner";
import { claimWorkflowLease } from "../src/lib/article-import/workflow-lease";
import { buildWorkflowFixture } from "./fixtures/article-workflow-evidence";
import { samplePageBlueprint } from "./fixtures/sample-page-blueprint";

const parent = path.resolve(".scratch/article-activity-recovery");

async function refiningFixture() {
  await mkdir(parent, { recursive: true });
  const root = await mkdtemp(path.join(parent, "case-"));
  await writeFile(path.join(root, "approved-urls.md"), "- https://example.test/affiliate\n");
  await writeFile(path.join(root, "article.md"), "# Synthetic checkpoint article\n");
  const created = await createArticleImport(root, "article.md");
  const prepared = await prepareApprovalFixture(root, { ...created, stage: "REFINING", format: "direct-review" }, { currentPolicy: true, structuredEditorial: true });
  const record = await persistFixture(root, {
    ...created,
    stage: "REFINING",
    format: "direct-review",
    artifactPath: prepared.artifactPath,
    evidenceRefs: prepared.evidenceRefs,
  });
  return { root, record, prepared };
}

async function acceptCurrentActivity(root: string, record: Awaited<ReturnType<typeof loadImport>>, outcome: "accepted" | "rejected" | "unverified" | "not-applicable" = "accepted") {
  assert.equal(record.continuation?.kind, "work");
  if (record.continuation?.kind !== "work") throw new Error("Expected activity work.");
  const packet = JSON.parse(await readFile(path.join(root, record.continuation.workPath), "utf8"));
  if (!packet.activity) throw new Error("Expected an activity-bound packet.");
  await writeJsonAtomically(path.join(root, record.continuation.resultPath), {
    idempotencyKey: record.continuation.idempotencyKey,
    sourceFingerprint: record.sourceFingerprint,
    summary: `Synthetic ${outcome} activity review.`,
    activity: {
      ...packet.activity,
      reviewer: "synthetic-reviewer",
      executionId: `${packet.activity.id}-${packet.activity.inputFingerprint.slice(0, 8)}-${outcome}`,
      outcome,
      ...(["accepted", "rejected"].includes(outcome) && { observation: outcome === "accepted" ? "The bound criterion is satisfied." : "The bound criterion has an attributable defect." }),
      ...(outcome === "not-applicable" && { applicabilityReason: "The criterion does not apply to this synthetic format and the reason is retained." }),
    },
  });
  return { packet, record: await executePendingImport(root, record.importId, createSupervisedImportExecutor(root)) };
}

async function submitFindingReview(root: string, record: Awaited<ReturnType<typeof loadImport>>, findingReview: Record<string, unknown>, outcome: "accepted" | "unverified" | "not-applicable" = "accepted") {
  assert.equal(record.continuation?.kind, "work");
  if (record.continuation?.kind !== "work") throw new Error("Expected finding-bound activity work.");
  const packet = JSON.parse(await readFile(path.join(root, record.continuation.workPath), "utf8"));
  await writeJsonAtomically(path.join(root, record.continuation.resultPath), {
    idempotencyKey: record.continuation.idempotencyKey,
    sourceFingerprint: record.sourceFingerprint,
    summary: `Synthetic ${outcome} independent finding review.`,
    activity: {
      ...packet.activity,
      reviewer: "independent-reviewer",
      executionId: `independent-${packet.activity.id}-${Date.now()}`,
      outcome,
      ...(outcome === "accepted" && { observation: "The independent review checked the original defect and affected regressions." }),
      ...(outcome === "not-applicable" && { applicabilityReason: "The independent review verified that the non-required capability was appropriately removed." }),
      findingReviews: [findingReview],
    },
  });
  return executePendingImport(root, record.importId, createSupervisedImportExecutor(root));
}

async function completeHeroHandoff(root: string, record: Awaited<ReturnType<typeof loadImport>>) {
  if (record.continuation?.kind !== "work") throw new Error("Missing supervised hero handoff.");
  const packet = JSON.parse(await readFile(path.join(root, record.continuation.workPath), "utf8"));
  assert.equal(packet.supervisedHandoff, "chatgpt-imagegen");
  const bytes = await sharp({ create: { width: 1600, height: 900, channels: 4, background: { r: 232, g: 221, b: 202, alpha: 1 } } }).png().toBuffer();
  await mkdir(path.dirname(path.join(root, packet.originalFile)), { recursive: true });
  await writeFile(path.join(root, packet.originalFile), bytes);
  const originalRef = { path: packet.originalFile, sha256: createHash("sha256").update(bytes).digest("hex") };
  const generatedAt = "2026-11-27T00:00:00.000Z";
  const providerOutputRef = await storeEvidence(root, record.importId, { schemaVersion: "ArticleHeroProviderOutputV1", provider: "openai", tool: "chatgpt-imagegen", interface: "built-in", toolCallId: "fixture-imagegen-call", generatedAt,
    generatedImage: { providerAssetPath: "generated-image://fixture-hero", originalSha256: originalRef.sha256, outputHint: "Synthetic fixture output." } });
  const generationPath = `build-pack/article-import/${record.importId}/hero-generation.json`;
  await writeJsonAtomically(path.join(root, generationPath), { schemaVersion: "ArticleHeroGenerationEvidenceV1", importId: record.importId, sourceFingerprint: record.sourceFingerprint,
    format: packet.format, slug: packet.slug, artifactFingerprint: packet.artifactFingerprint, originalRef, alt: packet.alt,
    generation: { provider: "openai", tool: "chatgpt-imagegen", interface: "built-in", toolCallId: "fixture-imagegen-call", generatedAt, prompt: packet.prompt, promptSha256: packet.promptSha256, outputSha256: originalRef.sha256, providerOutputRef } });
  await writeJsonAtomically(path.join(root, record.continuation.resultPath), { schemaVersion: "ArticleHeroImagegenResultV1", handoffFingerprint: packet.handoffFingerprint,
    idempotencyKey: record.continuation.idempotencyKey, sourceFingerprint: record.sourceFingerprint, summary: "Generated the bound synthetic hero.", work: { stage: "VALIDATING", heroGenerationEvidencePath: generationPath } });
}

test("reload resumes the next editorial activity without repeating accepted work", async () => {
  const { root, record } = await refiningFixture();
  try {
    const executor = createSupervisedImportExecutor(root);
    const first = await executePendingImport(root, record.importId, executor);
    assert.equal(first.continuation?.kind, "work");
    if (first.continuation?.kind !== "work") throw new Error("Expected editorial activity work.");
    const firstPacket = JSON.parse(await readFile(path.join(root, first.continuation.workPath), "utf8"));
    assert.equal(firstPacket.activity.id, "purpose-and-structure");

    await writeFile(path.join(root, first.continuation.resultPath), JSON.stringify({
      idempotencyKey: first.continuation.idempotencyKey,
      sourceFingerprint: record.sourceFingerprint,
      summary: "Accepted the first editorial activity.",
      activity: {
        ...firstPacket.activity,
        reviewer: "synthetic-reviewer",
        executionId: "editorial-purpose-1",
        outcome: "accepted",
        observation: "Purpose and structure meet the bound criterion.",
      },
    }));

    const accepted = await executePendingImport(root, record.importId, executor);
    assert.equal(accepted.activityReceipts?.at(-1)?.activityId, "purpose-and-structure");
    const reloaded = await loadImport(root, record.importId);
    assert.equal(reloaded.activityReceipts?.filter((item) => item.outcome === "accepted").length, 1);

    const resumed = await executePendingImport(root, record.importId, executor);
    assert.equal(resumed.continuation?.kind, "work");
    if (resumed.continuation?.kind !== "work") throw new Error("Expected the next editorial activity.");
    const resumedPacket = JSON.parse(await readFile(path.join(root, resumed.continuation.workPath), "utf8"));
    assert.equal(resumedPacket.activity.id, "meaning-and-evidence");
    assert.notEqual(resumed.continuation.workPath, first.continuation.workPath);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("interrupted activity work keeps its identity while intentional repair creates a linked attempt", async () => {
  const { root, record } = await refiningFixture();
  try {
    const seeded = await persistFixture(root, { ...record, repairStageTotals: { REFINING: 2 } });
    const executor = createSupervisedImportExecutor(root);
    const first = await executePendingImport(root, seeded.importId, executor);
    assert.equal(first.continuation?.kind, "work");
    if (first.continuation?.kind !== "work") throw new Error("Expected first activity attempt.");
    const firstPacket = JSON.parse(await readFile(path.join(root, first.continuation.workPath), "utf8"));
    const firstAttemptId = firstPacket.activity.attemptId;
    assert.match(firstAttemptId, /^activity-attempt-[a-f0-9]{24}$/);

    const interrupted = await executePendingImport(root, first.importId, executor);
    assert.equal(interrupted.continuation?.kind, "work");
    if (interrupted.continuation?.kind !== "work") throw new Error("Expected interrupted activity attempt.");
    const interruptedPacket = JSON.parse(await readFile(path.join(root, interrupted.continuation.workPath), "utf8"));
    assert.equal(interruptedPacket.activity.attemptId, firstAttemptId);
    assert.equal(interrupted.continuation.resultPath, first.continuation.resultPath);
    assert.equal(interrupted.activityAttempts?.length, 1);

    await writeJsonAtomically(path.join(root, interrupted.continuation.resultPath), {
      idempotencyKey: interrupted.continuation.idempotencyKey,
      sourceFingerprint: interrupted.sourceFingerprint,
      summary: "The first attempt completed without a usable observation.",
      activity: {
        ...interruptedPacket.activity,
        reviewer: "synthetic-reviewer-a",
        executionId: "attempt-a-unverified",
        outcome: "unverified",
      },
    });
    const unverified = await executePendingImport(root, interrupted.importId, executor);
    assert.equal(unverified.activityAttempts?.[0].status, "completed");

    const replacement = await executePendingImport(root, unverified.importId, executor);
    assert.equal(replacement.continuation?.kind, "work");
    if (replacement.continuation?.kind !== "work") throw new Error("Expected intentional replacement attempt.");
    const replacementPacket = JSON.parse(await readFile(path.join(root, replacement.continuation.workPath), "utf8"));
    assert.notEqual(replacementPacket.activity.attemptId, firstAttemptId);
    assert.equal(replacementPacket.activity.predecessorAttemptId, firstAttemptId);
    assert.equal(replacement.activityAttempts?.length, 2);
    assert.equal(replacement.activityAttempts?.[0].status, "superseded");
    assert.equal(replacement.activityAttempts?.[1].reason, "intentional-repair");
    assert.equal(replacement.repairStageTotals?.REFINING, 2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the dispatch controller explicitly selects eligible late output from a superseded attempt", async () => {
  const { root, record } = await refiningFixture();
  try {
    const executor = createSupervisedImportExecutor(root);
    const attemptA = await executePendingImport(root, record.importId, executor);
    assert.equal(attemptA.continuation?.kind, "work");
    if (attemptA.continuation?.kind !== "work") throw new Error("Expected attempt A.");
    const packetA = JSON.parse(await readFile(path.join(root, attemptA.continuation.workPath), "utf8"));
    await writeJsonAtomically(path.join(root, attemptA.continuation.resultPath), {
      idempotencyKey: attemptA.continuation.idempotencyKey,
      sourceFingerprint: attemptA.sourceFingerprint,
      summary: "Attempt A ended without a conclusive observation.",
      activity: { ...packetA.activity, reviewer: "reviewer-a", executionId: "attempt-a-unverified", outcome: "unverified" },
    });
    const completedA = await executePendingImport(root, attemptA.importId, executor);
    const attemptB = await executePendingImport(root, completedA.importId, executor);
    assert.equal(attemptB.continuation?.kind, "work");
    if (attemptB.continuation?.kind !== "work") throw new Error("Expected replacement attempt B.");
    const packetB = JSON.parse(await readFile(path.join(root, attemptB.continuation.workPath), "utf8"));
    assert.equal(packetB.activity.predecessorAttemptId, packetA.activity.attemptId);

    const liveOwner = await claimWorkflowLease(root, "import", attemptB.importId);
    assert.ok(liveOwner);
    let fencedControllerCalls = 0;
    const fenced = await executePendingImport(root, attemptB.importId, async (context) => {
      fencedControllerCalls += 1;
      return executor(context);
    });
    assert.equal(fencedControllerCalls, 0);
    assert.equal(fenced.continuation?.attemptId, packetB.activity.attemptId);
    await liveOwner.release();

    await writeJsonAtomically(path.join(root, attemptA.continuation.resultPath), {
      idempotencyKey: attemptA.continuation.idempotencyKey,
      sourceFingerprint: attemptA.sourceFingerprint,
      summary: "Late attempt A passed an independent review.",
      activity: {
        ...packetA.activity,
        reviewer: "late-independent-reviewer",
        executionId: "attempt-a-late-independent-review",
        outcome: "accepted",
        observation: "The current dependency-bound criterion is satisfied.",
      },
    });

    let workerCalls = 0;
    const selected = await executeFixtureCommand(root, { kind: "dispatch", importId: attemptB.importId }, executor, {
      maxSteps: 1,
      workerModel: "fixture/model",
      workerRunner: async () => { workerCalls += 1; throw new Error("Replacement B must not run after eligible A is selected."); },
    });
    assert.equal(workerCalls, 0);
    assert.equal(selected.activitySelections?.length, 1);
    assert.equal(selected.activitySelections?.[0].candidateAttemptId, packetA.activity.attemptId);
    assert.equal(selected.activitySelections?.[0].replacementAttemptId, packetB.activity.attemptId);
    assert.equal(selected.activitySelections?.[0].decision, "selected");
    assert.equal(selected.activitySelections?.[0].reason, "eligible-current-dependencies-and-review");
    assert.equal(selected.activitySelections?.[0].validator, "passed");
    assert.equal(selected.activitySelections?.[0].independentReview, "passed");
    assert.equal(selected.activityReceipts?.at(-1)?.attemptId, packetA.activity.attemptId);
    assert.deepEqual(selected.activityReceipts?.at(-1)?.resultRef, selected.activitySelections?.[0].candidateResultRef);
    await writeFile(path.join(root, attemptA.continuation.resultPath), "late path changed after selection");
    await verifyEvidenceRef(root, selected.activityReceipts!.at(-1)!.resultRef);
    assert.equal(selected.activityAttempts?.find((item) => item.attemptId === packetB.activity.attemptId)?.status, "superseded");

    const reloaded = await loadImport(root, selected.importId);
    assert.equal(reloaded.activitySelections?.length, 1);
    const resumed = await executePendingImport(root, selected.importId, executor);
    assert.equal(resumed.activitySelections?.length, 1);
    assert.equal(resumed.continuation?.activityId, "meaning-and-evidence");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("stale, invalid, misbound, and finding-omitting late results remain historical and deduplicate after reload", async () => {
  for (const scenario of ["stale", "invalid", "wrong-key", "open-finding"] as const) {
    const { root, record } = await refiningFixture();
    try {
      const executor = createSupervisedImportExecutor(root);
      const attemptA = await executePendingImport(root, record.importId, executor);
      assert.equal(attemptA.continuation?.kind, "work");
      if (attemptA.continuation?.kind !== "work") throw new Error("Expected attempt A.");
      const packetA = JSON.parse(await readFile(path.join(root, attemptA.continuation.workPath), "utf8"));
      const firstOutcome = scenario === "open-finding" ? "rejected" : "unverified";
      await writeJsonAtomically(path.join(root, attemptA.continuation.resultPath), {
        idempotencyKey: attemptA.continuation.idempotencyKey,
        sourceFingerprint: attemptA.sourceFingerprint,
        summary: `Attempt A ${firstOutcome}.`,
        activity: {
          ...packetA.activity,
          reviewer: "reviewer-a",
          executionId: `attempt-a-${firstOutcome}`,
          outcome: firstOutcome,
          ...(firstOutcome === "rejected" && { observation: "The original criterion has a retained defect." }),
        },
      });
      const completedA = await executePendingImport(root, attemptA.importId, executor);
      const attemptB = await executePendingImport(root, completedA.importId, executor);
      assert.equal(attemptB.continuation?.kind, "work");
      if (attemptB.continuation?.kind !== "work") throw new Error("Expected attempt B.");

      if (scenario === "stale") {
        const assessmentPath = attemptB.evidenceRefs!.assessment!.path;
        const assessment = JSON.parse(await readFile(path.join(root, assessmentPath), "utf8"));
        await writeJsonAtomically(path.join(root, assessmentPath), { ...assessment, lateSelectionRevision: "changed" });
      }
      if (scenario === "invalid") {
        await writeFile(path.join(root, attemptA.continuation.resultPath), "{malformed late result");
      } else {
        await writeJsonAtomically(path.join(root, attemptA.continuation.resultPath), {
            idempotencyKey: scenario === "wrong-key" ? "f".repeat(64) : attemptA.continuation.idempotencyKey,
            sourceFingerprint: attemptA.sourceFingerprint,
            summary: "Late A claims acceptance.",
            activity: {
              ...packetA.activity,
              reviewer: "late-independent-reviewer",
              executionId: `attempt-a-late-${scenario}`,
              outcome: "accepted",
              observation: "The candidate claims the criterion is satisfied.",
            },
          });
      }

      const reconciled = await executePendingImport(root, attemptB.importId, executor);
      assert.equal(reconciled.activitySelections?.length, 1, JSON.stringify({ scenario, selections: reconciled.activitySelections }));
      assert.equal(reconciled.activitySelections?.[0].decision, "historical");
      assert.equal(reconciled.activitySelections?.[0].reason, scenario === "stale" ? "dependencies-changed" : ["invalid", "wrong-key"].includes(scenario) ? "invalid-result" : "open-findings-unresolved");
      assert.equal(reconciled.activityReceipts?.filter((receipt) => receipt.attemptId === packetA.activity.attemptId && receipt.outcome === "accepted").length, 0);

      const reloaded = await loadImport(root, reconciled.importId);
      const duplicate = await executePendingImport(root, reloaded.importId, executor);
      assert.equal(duplicate.activitySelections?.length, 1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test("a delivered replacement is consumed before conflicting late output", async () => {
  const { root, record } = await refiningFixture();
  try {
    const executor = createSupervisedImportExecutor(root);
    const attemptA = await executePendingImport(root, record.importId, executor);
    if (attemptA.continuation?.kind !== "work") throw new Error("Expected attempt A.");
    const packetA = JSON.parse(await readFile(path.join(root, attemptA.continuation.workPath), "utf8"));
    await writeJsonAtomically(path.join(root, attemptA.continuation.resultPath), {
      idempotencyKey: attemptA.continuation.idempotencyKey, sourceFingerprint: attemptA.sourceFingerprint, summary: "A was initially unverified.",
      activity: { ...packetA.activity, reviewer: "reviewer-a", executionId: "a-unverified", outcome: "unverified" },
    });
    const completedA = await executePendingImport(root, attemptA.importId, executor);
    const attemptB = await executePendingImport(root, completedA.importId, executor);
    if (attemptB.continuation?.kind !== "work") throw new Error("Expected attempt B.");
    const packetB = JSON.parse(await readFile(path.join(root, attemptB.continuation.workPath), "utf8"));
    await writeJsonAtomically(path.join(root, attemptA.continuation.resultPath), {
      idempotencyKey: attemptA.continuation.idempotencyKey, sourceFingerprint: attemptA.sourceFingerprint, summary: "Late A claims acceptance.",
      activity: { ...packetA.activity, reviewer: "late-reviewer-a", executionId: "a-late", outcome: "accepted", observation: "A claims the criterion passed." },
    });
    await writeJsonAtomically(path.join(root, attemptB.continuation.resultPath), {
      idempotencyKey: attemptB.continuation.idempotencyKey, sourceFingerprint: attemptB.sourceFingerprint, summary: "B found a current defect.",
      activity: { ...packetB.activity, reviewer: "reviewer-b", executionId: "b-rejected", outcome: "rejected", observation: "B found a current dependency-bound defect." },
    });

    const consumedB = await executePendingImport(root, attemptB.importId, executor);
    assert.equal(consumedB.activityReceipts?.at(-1)?.attemptId, packetB.activity.attemptId);
    assert.equal(consumedB.activityReceipts?.at(-1)?.outcome, "rejected");
    assert.equal(consumedB.activitySelections?.length, 1, JSON.stringify(consumedB.activitySelections));
    assert.equal(consumedB.activitySelections?.at(-1)?.decision, "historical");
    assert.equal(consumedB.activitySelections?.at(-1)?.reason, "replacement-delivered");
    const reconciled = await executePendingImport(root, consumedB.importId, executor);
    assert.equal(reconciled.activitySelections?.at(-1)?.decision, "historical");
    assert.equal(reconciled.activitySelections?.at(-1)?.reason, "open-findings-unresolved");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("late output without prior review evidence cannot claim independent review", async () => {
  const { root, record } = await refiningFixture();
  try {
    const executor = createSupervisedImportExecutor(root);
    const issued = await executePendingImport(root, record.importId, executor);
    if (issued.continuation?.kind !== "work") throw new Error("Expected attempt A.");
    const packetA = JSON.parse(await readFile(path.join(root, issued.continuation.workPath), "utf8"));
    const attemptA = issued.activityAttempts![0];
    const attemptBId = `activity-attempt-${"b".repeat(24)}`;
    const workPathB = attemptA.workPath.replace(/\.1\.work\.json$/, ".2.work.json");
    const resultPathB = attemptA.resultPath.replace(/\.1\.result\.json$/, ".2.result.json");
    const syntheticReplacement = await persistFixture(root, {
      ...issued,
      activityAttempts: [
        { ...attemptA, status: "superseded" },
        { ...attemptA, attemptId: attemptBId, sequence: 2, predecessorAttemptId: attemptA.attemptId, reason: "intentional-repair", status: "active", workPath: workPathB, resultPath: resultPathB },
      ],
      continuation: { ...issued.continuation, attemptId: attemptBId, workPath: workPathB, resultPath: resultPathB },
    });
    await writeJsonAtomically(path.join(root, attemptA.resultPath), {
      idempotencyKey: attemptA.idempotencyKey, sourceFingerprint: issued.sourceFingerprint, summary: "First delivery arrived after replacement.",
      activity: { ...packetA.activity, reviewer: "late-reviewer", executionId: "late-without-prior-review", outcome: "accepted", observation: "The late delivery claims acceptance." },
    });

    const reconciled = await executePendingImport(root, syntheticReplacement.importId, executor);
    assert.equal(reconciled.activitySelections?.at(-1)?.decision, "historical");
    assert.equal(reconciled.activitySelections?.at(-1)?.reason, "independent-review-required");
    assert.equal(reconciled.activitySelections?.at(-1)?.independentReview, "failed");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a pre-upgrade outstanding activity packet is adopted without repeating its work", async () => {
  const { root, record } = await refiningFixture();
  try {
    const executor = createSupervisedImportExecutor(root);
    const issued = await executePendingImport(root, record.importId, executor);
    if (issued.continuation?.kind !== "work") throw new Error("Expected issued activity.");
    const packet = JSON.parse(await readFile(path.join(root, issued.continuation.workPath), "utf8"));
    const legacyActivity = { ...packet.activity };
    delete legacyActivity.attemptId;
    delete legacyActivity.predecessorAttemptId;
    const legacy = await persistFixture(root, {
      ...issued,
      activityAttempts: undefined,
      continuation: { ...issued.continuation, attemptId: undefined },
    });
    await writeJsonAtomically(path.join(root, issued.continuation.resultPath), {
      idempotencyKey: issued.continuation.idempotencyKey, sourceFingerprint: issued.sourceFingerprint, summary: "Legacy packet completed before upgrade.",
      activity: { ...legacyActivity, reviewer: "legacy-reviewer", executionId: "legacy-accepted", outcome: "accepted", observation: "The legacy review passed." },
    });

    const adopted = await executePendingImport(root, legacy.importId, executor);
    assert.equal(adopted.activityAttempts?.[0].reason, "legacy-adoption");
    assert.equal(adopted.activityAttempts?.[0].resultPath, issued.continuation.resultPath);
    assert.equal(adopted.activityReceipts?.at(-1)?.attemptId, adopted.activityAttempts?.[0].attemptId);
    assert.equal(adopted.activityReceipts?.at(-1)?.outcome, "accepted");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("editorial and presentation reload after every accepted activity and call each worker once", async () => {
  for (const stage of ["REFINING", "VALIDATING"] as const) {
    const fixture = await refiningFixture();
    const { root } = fixture;
    try {
      let current = fixture.record;
      if (stage === "VALIDATING") {
        const approved = await approveFixture(root, current, { currentPolicy: true, structuredEditorial: true });
        current = await advanceImport(root, approved, "Synthetic editorial approval accepted.");
        current = await executePendingImport(root, current.importId, createSupervisedImportExecutor(root));
        await completeHeroHandoff(root, current);
        current = await executePendingImport(root, current.importId, createSupervisedImportExecutor(root));
      }
      const expected = stage === "REFINING"
        ? ["purpose-and-structure", "meaning-and-evidence", "wording-and-rhythm", "independent-review", "final-fidelity-review"]
        : ["design-read", "context", "shape", "critique", "audit", "detect", "polish", "desktop", "mobile", "reduced-motion", "visual-quality"];
      const calls: string[] = [];
      for (const activityId of expected) {
        current = await executePendingImport(root, current.importId, createSupervisedImportExecutor(root));
        assert.equal(current.continuation?.activityId, activityId);
        calls.push(activityId);
        current = (await acceptCurrentActivity(root, current)).record;
        current = await loadImport(root, current.importId);
      }
      assert.deepEqual(calls, expected);
      assert.equal(current.activityReceipts?.filter((receipt) => receipt.stage === stage && receipt.outcome === "accepted").length, expected.length);
      const finalization = await executePendingImport(root, current.importId, createSupervisedImportExecutor(root));
      assert.equal(finalization.continuation?.kind, "work");
      assert.equal(finalization.continuation?.activityId, undefined);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test("a changed input reruns affected work while independent accepted activities survive", async () => {
  const { root, record } = await refiningFixture();
  try {
    let current = record;
    for (const activityId of ["purpose-and-structure", "meaning-and-evidence", "wording-and-rhythm"]) {
      current = await executePendingImport(root, current.importId, createSupervisedImportExecutor(root));
      assert.equal(current.continuation?.activityId, activityId);
      current = (await acceptCurrentActivity(root, current)).record;
    }
    const assessmentPath = current.evidenceRefs!.assessment!.path;
    const assessment = JSON.parse(await readFile(path.join(root, assessmentPath), "utf8"));
    await writeFile(path.join(root, assessmentPath), JSON.stringify({ ...assessment, syntheticRevision: "changed-input" }));

    current = await executePendingImport(root, current.importId, createSupervisedImportExecutor(root));
    assert.equal(current.continuation?.activityId, "purpose-and-structure");
    current = (await acceptCurrentActivity(root, current)).record;
    current = await executePendingImport(root, current.importId, createSupervisedImportExecutor(root));
    assert.equal(current.continuation?.activityId, "independent-review");
    assert.equal(current.activityReceipts?.filter((receipt) => receipt.activityId === "meaning-and-evidence" && receipt.outcome === "accepted").length, 1);
    assert.equal(current.activityReceipts?.filter((receipt) => receipt.activityId === "wording-and-rhythm" && receipt.outcome === "accepted").length, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejection, missing observation, and justified inapplicability remain attributable without erasing an open finding", async () => {
  const { root, record } = await refiningFixture();
  try {
    let current = record;
    for (const outcome of ["rejected", "unverified", "not-applicable"] as const) {
      current = await executePendingImport(root, current.importId, createSupervisedImportExecutor(root));
      assert.equal(current.continuation?.activityId, "purpose-and-structure");
      current = (await acceptCurrentActivity(root, current, outcome)).record;
      assert.equal(current.activityReceipts?.at(-1)?.outcome, outcome);
    }
    assert.equal(current.activityReceipts?.length, 3);
    assert.equal(current.activityReceipts?.[0].observation, "The bound criterion has an attributable defect.");
    assert.equal(current.activityReceipts?.[1].observation, undefined);
    assert.match(current.activityReceipts?.[2].applicabilityReason ?? "", /does not apply/);
    assert.equal(current.activityFindings?.[0].status, "open");
    current = await executePendingImport(root, current.importId, createSupervisedImportExecutor(root));
    assert.equal(current.continuation?.activityId, "purpose-and-structure");
    if (current.continuation?.kind !== "work") throw new Error("Expected another bound activity attempt.");
    const packet = JSON.parse(await readFile(path.join(root, current.continuation.workPath), "utf8"));
    await writeJsonAtomically(path.join(root, current.continuation.resultPath), {
      idempotencyKey: current.continuation.idempotencyKey,
      sourceFingerprint: current.sourceFingerprint,
      summary: "Invalid inapplicability claim without a reason.",
      activity: { ...packet.activity, reviewer: "synthetic-reviewer", executionId: "missing-reason", outcome: "not-applicable" },
    });
    const invalid = await executePendingImport(root, current.importId, createSupervisedImportExecutor(root));
    assert.equal(invalid.stage, "REFINING");
    assert.equal(invalid.continuation?.kind, "repair");
    assert.equal(invalid.activityReceipts?.length, 3);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a replacement review cannot omit an earlier rejected finding", async () => {
  const { root, record } = await refiningFixture();
  try {
    let current = await executePendingImport(root, record.importId, createSupervisedImportExecutor(root));
    current = (await acceptCurrentActivity(root, current, "rejected")).record;

    assert.equal(current.activityFindings?.length, 1);
    assert.equal(current.activityFindings?.[0].status, "open");
    assert.equal(current.activityFindings?.[0].activityId, "purpose-and-structure");
    assert.equal(current.activityFindings?.[0].observation, "The bound criterion has an attributable defect.");

    current = await executePendingImport(root, current.importId, createSupervisedImportExecutor(root));
    assert.equal(current.continuation?.activityId, "purpose-and-structure");
    if (current.continuation?.kind !== "work") throw new Error("Expected finding-bound repair work.");
    const repairPacket = JSON.parse(await readFile(path.join(root, current.continuation.workPath), "utf8"));
    assert.equal(repairPacket.activity.openFindings.length, 1);
    assert.equal(repairPacket.activity.openFindings[0].findingId, current.activityFindings?.[0].findingId);
    assert.match(repairPacket.instructions, /expected check/i);

    current = (await acceptCurrentActivity(root, current, "accepted")).record;
    assert.equal(current.activityFindings?.[0].status, "open");
    current = await executePendingImport(root, current.importId, createSupervisedImportExecutor(root));
    assert.equal(current.continuation?.activityId, "purpose-and-structure");
    if (current.continuation?.kind !== "work") throw new Error("Expected finding-bound repair work.");
    const barePacket = JSON.parse(await readFile(path.join(root, current.continuation.workPath), "utf8"));
    await writeJsonAtomically(path.join(root, current.continuation.resultPath), {
      idempotencyKey: current.continuation.idempotencyKey,
      sourceFingerprint: current.sourceFingerprint,
      summary: "Bare resolved claim without finding evidence.",
      activity: { ...barePacket.activity, reviewer: "replacement-reviewer", executionId: "bare-resolved-claim", outcome: "accepted", observation: "Resolved." },
    });
    current = await executePendingImport(root, current.importId, createSupervisedImportExecutor(root));
    assert.equal(current.activityFindings?.[0].status, "open");
    current = await executePendingImport(root, current.importId, createSupervisedImportExecutor(root));
    assert.equal(current.continuation?.activityId, "purpose-and-structure");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("an independent review closes a finding only after a relevant changed input and fresh regression evidence", async () => {
  const { root, record } = await refiningFixture();
  try {
    let current = await executePendingImport(root, record.importId, createSupervisedImportExecutor(root));
    current = (await acceptCurrentActivity(root, current, "rejected")).record;
    const finding = current.activityFindings?.[0];
    assert.ok(finding);

    const assessmentPath = current.evidenceRefs!.assessment!.path;
    const assessment = JSON.parse(await readFile(path.join(root, assessmentPath), "utf8"));
    await writeJsonAtomically(path.join(root, assessmentPath), { ...assessment, syntheticFindingRepair: "changed relevant input" });

    current = await executePendingImport(root, current.importId, createSupervisedImportExecutor(root));
    assert.equal(current.continuation?.activityId, "purpose-and-structure");
    if (current.continuation?.kind !== "work") throw new Error("Expected finding-bound activity work.");
    const packet = JSON.parse(await readFile(path.join(root, current.continuation.workPath), "utf8"));
    const changedInput = packet.activity.dependencyRefs.find((ref: { path: string }) => ref.path === assessmentPath);
    assert.ok(changedInput);
    const freshObservation = await storeEvidence(root, current.importId, { kind: "fresh-finding-observation", findingId: finding.findingId, result: "passed" });
    const regressionEvidence = await storeEvidence(root, current.importId, { kind: "affected-regression", criterion: "refining.meaning-and-evidence", result: "passed" });

    current = await submitFindingReview(root, current, {
      findingId: finding.findingId,
      disposition: "verified-repair",
      expectedCheck: finding.expectedCheck,
      observation: "The changed assessment now satisfies the original criterion.",
      evidenceRefs: [freshObservation],
      changedInputRefs: [changedInput],
      regressionChecks: [{ criterion: { id: "refining.meaning-and-evidence", revision: "article-workflow:2" }, observation: "The evidence meaning remains intact after the repair.", outcome: "passed", evidenceRefs: [regressionEvidence] }],
    });

    assert.equal(current.activityFindings?.[0].status, "resolved");
    assert.equal(current.activityFindingReviews?.[0].disposition, "verified-repair");
    assert.equal(current.activityFindingReviews?.[0].reviewer, "independent-reviewer");
    assert.deepEqual(current.activityFindings?.[0].originalEvidenceRef, finding.originalEvidenceRef);
    current = await executePendingImport(root, current.importId, createSupervisedImportExecutor(root));
    assert.equal(current.continuation?.activityId, "meaning-and-evidence");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a wording repair after the transforming handoff creates a replacement attempt bound to changed candidate bytes", async () => {
  await mkdir(parent, { recursive: true });
  const root = await mkdtemp(path.join(parent, "changed-candidate-"));
  try {
    await writeFile(path.join(root, "approved-urls.md"), "- https://example.test/affiliate\n");
    await writeFile(path.join(root, "article.md"), "# Synthetic changed candidate\n");
    const created = await createArticleImport(root, "article.md");
    const prepared = await prepareApprovalFixture(root, { ...created, stage: "TRANSFORMING", format: "direct-review" }, { currentPolicy: true });
    const transformedArtifact = JSON.parse(await readFile(path.join(root, prepared.artifactPath), "utf8"));
    const evidenceRefs = await buildWorkflowFixture(root, created, { format: "direct-review", artifactPath: prepared.artifactPath, before: samplePageBlueprint, after: transformedArtifact, editorialEvidencePath: prepared.editorialEvidencePath, currentPolicy: true, assessmentStage: "TRANSFORMING" });
    const transforming = await persistFixture(root, {
      ...created,
      stage: "TRANSFORMING",
      format: "direct-review",
      artifactPath: prepared.artifactPath,
      evidenceRefs,
    });
    let current = await advanceImport(root, transforming, "Synthetic transform gate passed.");
    const handoff = current.gateHandoffs?.at(-1);
    const acceptedCandidate = handoff?.acceptedOutputs.find((input) => input.name === "candidate-artifact")?.reference;
    const mutableCandidate = handoff?.requiredNextInputs.find((input) => input.name === "candidate-artifact")?.reference;
    assert.ok(acceptedCandidate);
    assert.ok(mutableCandidate);
    assert.notEqual(acceptedCandidate.path, mutableCandidate.path);
    await verifyEvidenceRef(root, acceptedCandidate);

    for (const expected of ["purpose-and-structure", "meaning-and-evidence"] as const) {
      current = await executePendingImport(root, current.importId, createSupervisedImportExecutor(root));
      assert.equal(current.continuation?.activityId, expected);
      current = (await acceptCurrentActivity(root, current, "accepted")).record;
    }
    current = await executePendingImport(root, current.importId, createSupervisedImportExecutor(root));
    assert.equal(current.continuation?.activityId, "wording-and-rhythm");
    const rejectedAttempt = current.activityAttempts?.at(-1);
    current = (await acceptCurrentActivity(root, current, "rejected")).record;

    const artifact = JSON.parse(await readFile(path.join(root, prepared.artifactPath), "utf8"));
    await writeJsonAtomically(path.join(root, prepared.artifactPath), { ...artifact, hero: { ...artifact.hero, headline: `${artifact.hero.headline} repaired` } });
    current = await executePendingImport(root, current.importId, createSupervisedImportExecutor(root));
    for (const invalidated of ["purpose-and-structure", "meaning-and-evidence"] as const) {
      assert.equal(current.continuation?.activityId, invalidated);
      current = (await acceptCurrentActivity(root, current, "accepted")).record;
      current = await executePendingImport(root, current.importId, createSupervisedImportExecutor(root));
    }
    assert.equal(current.continuation?.activityId, "wording-and-rhythm");
    if (current.continuation?.kind !== "work") throw new Error("Expected replacement wording activity.");
    const packet = JSON.parse(await readFile(path.join(root, current.continuation.workPath), "utf8"));
    const replacementAttempt = current.activityAttempts?.at(-1);
    assert.equal(replacementAttempt?.predecessorAttemptId, rejectedAttempt?.attemptId);
    assert.equal(replacementAttempt?.reason, "dependency-change");
    assert.notEqual(replacementAttempt?.inputFingerprint, rejectedAttempt?.inputFingerprint);
    assert.equal(packet.activity.dependencyRefs[0].sha256, replacementAttempt?.dependencyRefs[0].sha256);
    assert.equal(packet.gateHandoffVerification.verifiedInputs.some((input: { name: string; reference: { sha256: string } }) => input.name === "candidate-artifact" && input.reference.sha256 === replacementAttempt?.dependencyRefs[0].sha256), true);
    await verifyEvidenceRef(root, acceptedCandidate);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("finding review records appropriate removal, evidenced dismissal, inconclusive review, and owner referral", async () => {
  for (const scenario of ["appropriate-removal", "evidenced-dismissal", "inconclusive", "owner-referral"] as const) {
    const { root, record } = await refiningFixture();
    try {
      let current = await executePendingImport(root, record.importId, createSupervisedImportExecutor(root));
      current = (await acceptCurrentActivity(root, current, "rejected")).record;
      const finding = current.activityFindings?.[0];
      assert.ok(finding);

      if (scenario === "appropriate-removal") {
        const assessmentPath = current.evidenceRefs!.assessment!.path;
        const assessment = JSON.parse(await readFile(path.join(root, assessmentPath), "utf8"));
        await writeJsonAtomically(path.join(root, assessmentPath), { ...assessment, syntheticOptionalCapability: "removed" });
      }
      current = await executePendingImport(root, current.importId, createSupervisedImportExecutor(root));
      if (current.continuation?.kind !== "work") throw new Error("Expected finding-bound activity work.");
      const packet = JSON.parse(await readFile(path.join(root, current.continuation.workPath), "utf8"));
      const freshObservation = await storeEvidence(root, current.importId, { kind: "finding-review", scenario, findingId: finding.findingId });
      const regressionEvidence = await storeEvidence(root, current.importId, { kind: "finding-regression", scenario, result: scenario === "inconclusive" ? "inconclusive" : "passed" });
      const changedInput = packet.activity.dependencyRefs.find((ref: { path: string; sha256: string }) => finding.dependencyRefs.some((before) => before.path === ref.path && before.sha256 !== ref.sha256));
      current = await submitFindingReview(root, current, {
        findingId: finding.findingId,
        disposition: scenario,
        expectedCheck: finding.expectedCheck,
        observation: scenario === "owner-referral" ? "The criterion meaning requires an owner decision." : `Independent ${scenario} observation.`,
        evidenceRefs: [freshObservation],
        ...(scenario === "appropriate-removal" && { changedInputRefs: [changedInput] }),
        ...(["appropriate-removal", "evidenced-dismissal"].includes(scenario) && { regressionChecks: [{ criterion: { id: "refining.meaning-and-evidence", revision: "article-workflow:2" }, observation: "The affected evidence criterion remains satisfied.", outcome: "passed", evidenceRefs: [regressionEvidence] }] }),
        ...(scenario === "inconclusive" && { regressionChecks: [{ criterion: finding.criterion, observation: "The available observation cannot establish closure.", outcome: "inconclusive", evidenceRefs: [regressionEvidence] }] }),
        ...(scenario === "owner-referral" && { ownerReferral: { kind: "required-capability-removal", reason: "The proposed repair removes a capability marked required by the current criterion." } }),
      }, scenario === "appropriate-removal" ? "not-applicable" : scenario === "inconclusive" || scenario === "owner-referral" ? "unverified" : "accepted");

      assert.equal(current.activityFindings?.[0].status, ["appropriate-removal", "evidenced-dismissal"].includes(scenario) ? "resolved" : scenario === "owner-referral" ? "owner-referral" : "open");
      assert.equal(current.activityFindingReviews?.[0].disposition, scenario);
      if (["inconclusive", "owner-referral"].includes(scenario)) {
        current = await executePendingImport(root, current.importId, createSupervisedImportExecutor(root));
        assert.equal(current.continuation?.activityId, "purpose-and-structure");
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test("an unsupported finding resolution remains pre-publication repair work", async () => {
  const { root, record } = await refiningFixture();
  try {
    let current = await executePendingImport(root, record.importId, createSupervisedImportExecutor(root));
    current = (await acceptCurrentActivity(root, current, "rejected")).record;
    const finding = current.activityFindings?.[0];
    assert.ok(finding);
    current = await executePendingImport(root, current.importId, createSupervisedImportExecutor(root));
    current = await submitFindingReview(root, current, {
      findingId: finding.findingId,
      disposition: "evidenced-dismissal",
      expectedCheck: finding.expectedCheck,
      observation: "Bare dismissal without fresh evidence or regression checks.",
    });
    assert.equal(current.stage, "REFINING");
    assert.equal(current.continuation?.kind, "repair");
    assert.equal(current.activityFindings?.[0].status, "open");
    assert.equal(current.activityFindingReviews?.length ?? 0, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("an issued activity cannot be bypassed by a staged aggregate result or malformed activity-slot output", async () => {
  const { root, record, prepared } = await refiningFixture();
  try {
    const executor = createSupervisedImportExecutor(root);
    let current = await executePendingImport(root, record.importId, executor);
    assert.equal(current.activityProtocolVersion, 1);
    assert.equal(current.continuation?.activityId, "purpose-and-structure");
    if (current.continuation?.kind !== "work") throw new Error("Expected issued activity work.");
    const aggregatePath = `.automation/article-imports/work/${record.importId}/${current.continuation.idempotencyKey}.result.json`;
    const aggregate = {
      idempotencyKey: current.continuation.idempotencyKey,
      sourceFingerprint: record.sourceFingerprint,
      summary: "Aggregate result must not bypass the issued activity.",
      work: { stage: "REFINING", artifactPath: prepared.artifactPath, assessmentPath: prepared.evidenceRefs.assessment.path, editorialExecutionPath: prepared.evidenceRefs.editorial.path, editorialEvidencePath: prepared.editorialEvidencePath, formatQualityPath: prepared.formatQualityPath },
    };
    await writeJsonAtomically(path.join(root, aggregatePath), aggregate);
    current = await executePendingImport(root, record.importId, executor);
    assert.equal(current.stage, "REFINING");
    assert.equal(current.continuation?.activityId, "purpose-and-structure");

    if (current.continuation?.kind !== "work") throw new Error("Expected the same issued activity.");
    await writeJsonAtomically(path.join(root, current.continuation.resultPath), aggregate);
    const rejected = await executePendingImport(root, record.importId, executor);
    assert.equal(rejected.stage, "REFINING");
    assert.equal(rejected.continuation?.kind, "repair");
    assert.equal(rejected.activityReceipts, undefined);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the dispatch controller sends an activity-specific packet to the worker and consumes its result", async () => {
  const { root, record } = await refiningFixture();
  try {
    const calls: string[] = [];
    const workerRunner: WorkerRunner = async ({ args }) => {
      const packet = JSON.parse(await readFile(args[args.indexOf("--file") + 1], "utf8"));
      calls.push(packet.activity.id);
      const result = { idempotencyKey: packet.idempotencyKey, sourceFingerprint: packet.sourceFingerprint, summary: "Dispatch completed one bound activity.",
        activity: { ...packet.activity, reviewer: "dispatch-fixture", executionId: "dispatch-purpose-1", outcome: "accepted", observation: "The dispatched criterion passed." } };
      const events = (await readFile("tests/fixtures/opencode-jsonl-fixture.jsonl", "utf8")).trim().split(/\r?\n/).map((line) => JSON.parse(line));
      events.find((event) => event.type === "text").part.text = JSON.stringify(result);
      return { stdout: events.map((event) => JSON.stringify(event)).join("\n"), stderr: "", exitCode: 0, timedOut: false };
    };
    const dispatched = await executeFixtureCommand(root, { kind: "dispatch", importId: record.importId }, createSupervisedImportExecutor(root), { maxSteps: 1, workerModel: "fixture/model", workerRunner });
    assert.deepEqual(calls, ["purpose-and-structure"], JSON.stringify({ stage: dispatched.stage, continuation: dispatched.continuation, nextAction: dispatched.nextAction }));
    const persisted = await loadImport(root, record.importId);
    assert.equal(persisted.activityReceipts?.at(-1)?.activityId, "purpose-and-structure", JSON.stringify({ stage: persisted.stage, continuation: persisted.continuation, receipts: persisted.activityReceipts, lastStageReceipt: persisted.stageReceipts.at(-1), nextAction: persisted.nextAction }));
    assert.equal(persisted.activityReceipts?.at(-1)?.outcome, "accepted");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a historical stage-only result advances without manufactured activity checkpoints", async () => {
  const { root, record, prepared } = await refiningFixture();
  try {
    const legacy = { ...record };
    delete legacy.activityProtocolVersion;
    const historical = await persistFixture(root, legacy);
    const idempotencyKey = importPacketId(historical, "REFINING", "targeted-repair");
    const resultPath = `.automation/article-imports/work/${record.importId}/${idempotencyKey}.result.json`;
    await writeJsonAtomically(path.join(root, resultPath), {
      idempotencyKey,
      sourceFingerprint: historical.sourceFingerprint,
      summary: "Historical aggregate refining result.",
      work: { stage: "REFINING", artifactPath: prepared.artifactPath, assessmentPath: prepared.evidenceRefs.assessment.path, editorialExecutionPath: prepared.evidenceRefs.editorial.path, editorialEvidencePath: prepared.editorialEvidencePath, formatQualityPath: prepared.formatQualityPath },
    });
    const advanced = await executePendingImport(root, historical.importId, createSupervisedImportExecutor(root));
    assert.equal(advanced.stage, "VALIDATING");
    assert.equal(advanced.activityReceipts, undefined);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
