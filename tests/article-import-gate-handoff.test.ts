import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import {
  advanceImport,
  createArticleImport,
  executePendingImport,
  loadImport,
} from "../src/lib/article-import/engine";
import { createSupervisedImportExecutor } from "../src/lib/article-import/supervised-executor";
import { executeFixtureCommand, fixtureResearchRegistry, persistFixture } from "./fixtures/article-command";
import type { WorkerRunner } from "../src/lib/article-import/worker-runner";
import { declareGateHandoff } from "../src/lib/article-import/gate-handoff";
import { evidenceReference, storeEvidence } from "../src/lib/article-import/execution-evidence";
import { approveFixture, prepareApprovalFixture } from "./fixtures/article-content-approval";

const parent = path.resolve(".scratch/article-gate-handoff");

async function fixture() {
  await mkdir(parent, { recursive: true });
  const root = await mkdtemp(path.join(parent, "case-"));
  await writeFile(path.join(root, "approved-urls.md"), "");
  await writeFile(path.join(root, "article.md"), "# Synthetic handoff\n\nA practical workflow guide with enough material for supervised research.\n");
  const created = await createArticleImport(root, "article.md");
  const packetDirectory = path.join(root, ".automation/article-imports/work", created.importId);
  await mkdir(packetDirectory, { recursive: true });
  await writeFile(path.join(packetDirectory, "unknown-sidecar.json"), JSON.stringify({ synthetic: true }));
  const researching = await advanceImport(root, created, "Synthetic ingest gate passed.");
  return { root, created, researching };
}

test("the next worker packet receives an explicit verified gate handoff", async () => {
  const { root, researching } = await fixture();
  try {
    const dispatched = await executePendingImport(
      root,
      researching.importId,
      createSupervisedImportExecutor(root, undefined, { researchRegistry: fixtureResearchRegistry(root) }),
    );
    assert.equal(dispatched.continuation?.kind, "work");
    if (dispatched.continuation?.kind !== "work") throw new Error("Expected supervised research work.");
    const packet = JSON.parse(await readFile(path.join(root, dispatched.continuation.workPath), "utf8"));
    assert.equal(packet.gateHandoff.schemaVersion, "ImportGateHandoffV1");
    assert.equal(packet.gateHandoff.passedGate, "INGESTING");
    assert.equal(packet.gateHandoff.nextStage, "RESEARCHING");
    assert.ok(packet.gateHandoff.acceptedOutputs.some((item: { name: string }) => item.name === "captured-source"));
    assert.ok(packet.gateHandoff.requiredNextInputs.some((item: { name: string }) => item.name === "captured-source"));
    assert.ok(packet.gateHandoff.retainedEvidence.some((item: { name: string }) => item.name === "captured-source"));
    assert.deepEqual(packet.gateHandoff.disposalCandidates, []);
    assert.ok(packet.gateHandoff.unclassifiedMaterial.some((item: { reference: { path: string } }) => item.reference.path.endsWith("unknown-sidecar.json")));
    assert.equal(packet.gateHandoff.cleanup.status, "not-required");
    assert.equal(packet.gateHandoffVerification.status, "verified");
    assert.equal(packet.sourcePath, packet.gateHandoff.requiredNextInputs.find((item: { name: string }) => item.name === "captured-source").reference.path);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("every existing gate declares outputs, next inputs, retention, disposal, and unclassified material", async () => {
  const { root, created, researching } = await fixture();
  try {
    const refining = await persistFixture(root, { ...researching, stage: "REFINING", format: "direct-review" });
    const approved = await approveFixture(root, refining, { currentPolicy: true, structuredEditorial: true });
    const hero = await storeEvidence(root, created.importId, { kind: "synthetic-hero" });
    const presentation = await storeEvidence(root, created.importId, { kind: "synthetic-presentation" });
    const production = await storeEvidence(root, created.importId, { kind: "synthetic-production" });
    const terminal = await storeEvidence(root, created.importId, { kind: "synthetic-terminal" });
    const improveRun = await storeEvidence(root, created.importId, { kind: "synthetic-improve-run" });
    const complete = {
      ...approved,
      evidenceRefs: { ...approved.evidenceRefs, hero, presentation, production },
      terminalRef: terminal,
      improve: {
        schemaVersion: "ImportImproveV1" as const,
        publicationKey: "p".repeat(64),
        boundCommitSha: "b".repeat(40),
        runRef: improveRun,
        phase: "ASSESSING" as const,
        attempt: 0,
        issueKeys: [],
        resolvedKeys: [],
        openKeys: [],
        handoffRefs: [],
      },
    };
    const boundaries = [
      ["INGESTING", "RESEARCHING"],
      ["RESEARCHING", "TRANSFORMING"],
      ["TRANSFORMING", "REFINING"],
      ["REFINING", "VALIDATING"],
      ["VALIDATING", "RELEASING"],
      ["RELEASING", "VERIFYING"],
      ["VERIFYING", "LIVE"],
    ] as const;
    for (const [passedGate, nextStage] of boundaries) {
      const handoff = await declareGateHandoff(root, complete, passedGate, nextStage);
      assert.equal(handoff.passedGate, passedGate);
      assert.equal(handoff.nextStage, nextStage);
      assert.ok(handoff.acceptedOutputs.length > 0);
      assert.ok(handoff.requiredNextInputs.length > 0);
      assert.ok(handoff.retainedEvidence.length > 0);
      assert.ok(Array.isArray(handoff.disposalCandidates));
      assert.ok(handoff.unclassifiedMaterial.some((item) => item.reference.path.endsWith("unknown-sidecar.json")));
      assert.equal(handoff.constraints.sourceFingerprint, created.sourceFingerprint);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("unreadable inputs and pending cleanup hold dispatch without changing accepted work or counts", async () => {
  for (const hold of ["unreadable", "cleanup-pending"] as const) {
    const { root, researching } = await fixture();
    try {
      const handoff = researching.gateHandoffs?.at(-1);
      assert.ok(handoff);
      const accepted = {
        schemaVersion: "ImportActivityReceiptV1" as const,
        stage: "REFINING" as const,
        activityId: "purpose-and-structure",
        inputFingerprint: "a".repeat(64),
        criteria: [{ id: "refining.purpose-and-structure", revision: researching.requirementRevision! }],
        dependencyRefs: [researching.sourceRef!],
        resultRef: researching.sourceRef!,
        reviewer: "synthetic-reviewer",
        executionId: "accepted-before-interruption",
        outcome: "accepted" as const,
        observation: "The accepted activity remains complete across the handoff interruption.",
        completedAt: new Date().toISOString(),
      };
      const held = {
        ...researching,
        activityReceipts: [accepted],
        repairStageTotals: { REFINING: 2 },
        gateHandoffs: researching.gateHandoffs!.map((item, index) => index === researching.gateHandoffs!.length - 1 && hold === "cleanup-pending"
          ? { ...item, cleanup: { status: "pending" as const, operationId: "cleanup-ingesting-1" } }
          : item),
      };
      await persistFixture(root, held);
      if (hold === "unreadable") await writeFile(path.join(root, handoff!.requiredNextInputs[0].reference.path), "tampered bytes");

      let calls = 0;
      const workerRunner: WorkerRunner = async () => {
        calls += 1;
        throw new Error("worker must not run while the handoff is held");
      };
      const result = await executeFixtureCommand(
        root,
        { kind: "dispatch", importId: researching.importId },
        createSupervisedImportExecutor(root, undefined, { researchRegistry: fixtureResearchRegistry(root) }),
        { maxSteps: 2, workerModel: "fixture/model", workerRunner },
      );
      const reloaded = await loadImport(root, researching.importId);
      assert.equal(calls, 0);
      assert.equal(result.continuation, undefined);
      assert.match(result.nextAction, /handoff/i);
      assert.equal(reloaded.activityReceipts?.at(-1)?.executionId, accepted.executionId);
      assert.deepEqual(reloaded.repairStageTotals, { REFINING: 2 });
      assert.deepEqual(reloaded.strategyAttempts, researching.strategyAttempts);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test("dispatch rechecks handoff bytes after packet creation and before invoking the worker", async () => {
  const { root, researching } = await fixture();
  try {
    let calls = 0;
    const supervised = createSupervisedImportExecutor(root, undefined, { researchRegistry: fixtureResearchRegistry(root) });
    const mutateAfterPacket: typeof supervised = async (context) => {
      const result = await supervised(context);
      if (result.continuation?.kind === "work") {
        const handoff = result.gateHandoffs?.at(-1);
        if (!handoff) throw new Error("Expected the persisted gate handoff.");
        await writeFile(path.join(root, handoff.requiredNextInputs[0].reference.path), "changed after packet creation");
      }
      return result;
    };
    const workerRunner: WorkerRunner = async () => {
      calls += 1;
      throw new Error("worker must not receive bytes that changed after packet creation");
    };
    const result = await executeFixtureCommand(root, { kind: "dispatch", importId: researching.importId }, mutateAfterPacket,
      { maxSteps: 1, workerModel: "fixture/model", workerRunner });
    assert.equal(calls, 0);
    assert.equal(result.continuation, undefined);
    assert.match(result.nextAction, /handoff/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a changed candidate before refining dispatch is rebound for the normal activity controller", async () => {
  const { root, researching } = await fixture();
  try {
    const prepared = await prepareApprovalFixture(root, { ...researching, stage: "REFINING", format: "direct-review" }, { currentPolicy: true, structuredEditorial: true });
    const artifactPath = prepared.artifactPath;
    const transforming = {
      ...researching,
      stage: "TRANSFORMING",
      format: "direct-review",
      artifactPath,
      activityProtocolVersion: 1,
      evidenceRefs: prepared.evidenceRefs,
    } as const;
    const handoff = await declareGateHandoff(root, transforming, "TRANSFORMING", "REFINING");
    const refining = await persistFixture(root, { ...transforming, stage: "REFINING", gateHandoffs: [...(transforming.gateHandoffs ?? []), handoff] });
    const original = refining.gateHandoffs?.at(-1)?.requiredNextInputs.find((input) => input.name === "candidate-artifact")?.reference;
    assert.ok(original);

    const candidate = JSON.parse(await readFile(path.join(root, artifactPath), "utf8"));
    await writeFile(path.join(root, artifactPath), JSON.stringify({ ...candidate, hero: { ...candidate.hero, headline: `${candidate.hero.headline} repaired` } }));
    const replacement = await evidenceReference(root, artifactPath);
    assert.notEqual(replacement.sha256, original.sha256);

    const resumed = await executePendingImport(root, refining.importId, createSupervisedImportExecutor(root));
    assert.equal(resumed.stage, "REFINING");
    assert.equal(resumed.continuation?.activityId, "purpose-and-structure");
    if (resumed.continuation?.kind !== "work") throw new Error("Expected refining activity work.");
    const packet = JSON.parse(await readFile(path.join(root, resumed.continuation.workPath), "utf8"));
    const verified = packet.gateHandoffVerification.verifiedInputs.find((input: { name: string }) => input.name === "candidate-artifact");
    assert.deepEqual(verified.reference, replacement);
    assert.deepEqual(packet.gateHandoff.requiredNextInputs.find((input: { name: string }) => input.name === "candidate-artifact").reference, original);
    assert.equal(packet.activity.dependencyRefs.some((ref: { path: string; sha256: string }) => ref.path === replacement.path && ref.sha256 === replacement.sha256), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("dispatch rejects a candidate rebind that changes after the refining packet is written", async () => {
  const { root, researching } = await fixture();
  try {
    const prepared = await prepareApprovalFixture(root, { ...researching, stage: "REFINING", format: "direct-review" }, { currentPolicy: true, structuredEditorial: true });
    const transforming = { ...researching, stage: "TRANSFORMING", format: "direct-review", artifactPath: prepared.artifactPath, activityProtocolVersion: 1, evidenceRefs: prepared.evidenceRefs } as const;
    const handoff = await declareGateHandoff(root, transforming, "TRANSFORMING", "REFINING");
    const refining = await persistFixture(root, { ...transforming, stage: "REFINING", gateHandoffs: [...(transforming.gateHandoffs ?? []), handoff] });
    const first = JSON.parse(await readFile(path.join(root, prepared.artifactPath), "utf8"));
    await writeFile(path.join(root, prepared.artifactPath), JSON.stringify({ ...first, hero: { ...first.hero, headline: `${first.hero.headline} first repair` } }));

    const supervised = createSupervisedImportExecutor(root);
    const mutateAfterPacket: typeof supervised = async (context) => {
      const result = await supervised(context);
      if (result.continuation?.kind === "work") {
        const current = JSON.parse(await readFile(path.join(root, prepared.artifactPath), "utf8"));
        await writeFile(path.join(root, prepared.artifactPath), JSON.stringify({ ...current, hero: { ...current.hero, headline: `${current.hero.headline} second repair` } }));
      }
      return result;
    };
    let calls = 0;
    const workerRunner: WorkerRunner = async () => { calls += 1; throw new Error("worker must not receive a stale verifiedInputs binding"); };
    const result = await executeFixtureCommand(root, { kind: "dispatch", importId: refining.importId }, mutateAfterPacket, { maxSteps: 1, workerModel: "fixture/model", workerRunner });
    assert.equal(calls, 0);
    assert.match(JSON.stringify(result), /gate handoff packet binding mismatch/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
