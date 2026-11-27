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
import { storeEvidence } from "../src/lib/article-import/execution-evidence";
import { importPacketId } from "../src/lib/article-import/packet-binding";
import type { WorkerRunner } from "../src/lib/article-import/worker-runner";

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
