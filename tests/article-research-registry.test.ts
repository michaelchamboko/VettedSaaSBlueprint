import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { createArticleImport, loadImport, writeJsonAtomically } from "../src/lib/article-import/engine";
import { createSupervisedImportExecutor } from "../src/lib/article-import/supervised-executor";
import { assertResearchRegistryPlanFingerprint, createResearchRegistryPlan, researchRegistryDecisionSchema, researchRegistryPlanSchema, validateRegistryDecisionAgainstEvidence, validateRegistryDecisionPlan, type ResearchRegistryCandidate, type ResearchRegistryCommitInput } from "../src/lib/article-import/research-registry";
import { createInMemoryResearchRegistry } from "./fixtures/article-research-registry";
import { prepareWorkerInvocation } from "../src/lib/article-import/worker-runner";
import { NeonArticleResearchRegistry, prequalifyAcquiredSourceIds, researchSearchExpressions } from "../src/lib/article-import/research-registry-neon";
import { evidenceReference, sha256, storeEvidence } from "../src/lib/article-import/execution-evidence";
import { executeFixtureCommand as executeImportCommand, persistFixture } from "./fixtures/article-command";
import { WORKFLOW_REVISION } from "../src/lib/article-import/workflow-requirements";

async function fixture(candidate?: ResearchRegistryCandidate) {
  const parent = path.join(process.cwd(), ".scratch");
  await mkdir(parent, { recursive: true });
  const root = await mkdtemp(path.join(parent, "article-registry-"));
  await writeFile(path.join(root, "approved-urls.md"), "");
  await writeFile(path.join(root, "article.md"), "# Evidence guide\n\nAcme costs $20 per month.");
  const registry = createInMemoryResearchRegistry(candidate ? [candidate] : []);
  const executor = createSupervisedImportExecutor(root, undefined, { researchRegistry: registry });
  const record = await createArticleImport(root, "article.md");
  await executeImportCommand(root, { kind: "resume", importId: record.importId }, executor);
  await executeImportCommand(root, { kind: "resume", importId: record.importId }, executor);
  const researching = await loadImport(root, record.importId);
  assert.equal(researching.continuation?.kind, "work");
  if (researching.continuation?.kind !== "work") throw new Error("Missing research packet");
  const packet = JSON.parse(await readFile(path.join(root, researching.continuation.workPath), "utf8"));
  return { root, registry, executor, record, researching, packet };
}

function candidate(overrides: Partial<ResearchRegistryCandidate> = {}): ResearchRegistryCandidate {
  const retainedBytes = `${JSON.stringify({ text: "Acme costs $20 per month." }, null, 2)}\n`;
  return {
    claimId: "11111111-1111-4111-8111-111111111111",
    claimSha256: sha256("Acme costs $20 per month."),
    claimText: "Acme costs $20 per month.",
    claimKind: "factual",
    material: true,
    claimUpdatedAt: "2026-11-25T00:00:00.000Z",
    snapshotId: "22222222-2222-4222-8222-222222222222",
    sourceId: "33333333-3333-4333-8333-333333333333",
    canonicalUrl: "https://example.test/pricing",
    sourceType: "official_pricing",
    evidenceSha256: sha256(retainedBytes),
    retrievedAt: "2026-11-25T00:00:00.000Z",
    accessOutcome: "success",
    passage: retainedBytes,
    locator: "pricing table",
    verdict: "SUPPORTED",
    confidence: 0.95,
    productContext: "Acme standard plan",
    reasoning: "The retained pricing table states the monthly price.",
    expiresAt: "2026-12-25T00:00:00.000Z",
    evidenceUpdatedAt: "2026-11-25T00:00:00.000Z",
    ...overrides,
  };
}

test("corrected acquired claims prequalify every source through the writeback mapping", () => {
  const bytes = Buffer.from("Corrected retained evidence.");
  const acquired = prequalifyAcquiredSourceIds({
    decision: { claims: [{ claimId: "planned-claim", action: "researched_gap" }] },
    writeback: {
      claims: [{ plannedClaimId: "planned-claim", evidenceClaimId: "corrected-claim" }],
      sources: [{ sourceId: "corrected-source" }, { sourceId: "corroborating-source" }],
    },
    research: {
      evidence: {
        claims: [{ id: "corrected-claim", sourceIds: ["corrected-source", "corroborating-source"], excerptLocations: [{ sourceId: "corrected-source", quote: "Corrected evidence." }, { sourceId: "corroborating-source", quote: "Corroborating evidence." }] }],
        sources: [{ id: "corrected-source" }, { id: "corroborating-source" }],
      },
      snapshotBytes: new Map([["corrected-source", bytes], ["corroborating-source", bytes]]),
    },
  } as ResearchRegistryCommitInput);
  assert.deepEqual([...acquired], ["corrected-source", "corroborating-source"]);
});

test("incomplete writeback packets fail repairably before a registry transaction", async () => {
  const base = {
    decision: { claims: [{ claimId: "planned-claim", action: "researched_gap" }] },
    research: {
      evidence: {
        claims: [{ id: "corrected-claim", sourceIds: ["corrected-source"], excerptLocations: [{ sourceId: "corrected-source", quote: "Corrected retained evidence." }] }],
        sources: [{ id: "corrected-source" }],
      },
      snapshotBytes: new Map([["corrected-source", Buffer.from("Corrected retained evidence.")]]),
    },
  } as ResearchRegistryCommitInput;
  const registry = new NeonArticleResearchRegistry();
  await assert.rejects(
    registry.commit({ ...base, writeback: { claims: [], sources: [] } } as ResearchRegistryCommitInput),
    (error: unknown) => error instanceof Error && error.message === "RESEARCH_REGISTRY_WRITEBACK_CLAIM_MISMATCH",
  );
  await assert.rejects(
    registry.commit({ ...base, writeback: { claims: [{ plannedClaimId: "planned-claim", evidenceClaimId: "corrected-claim" }], sources: [] } } as ResearchRegistryCommitInput),
    (error: unknown) => error instanceof Error && error.message === "RESEARCH_REGISTRY_SOURCE_DECISION_MISSING",
  );
});

test("an acquired claim cannot persist a verdict for a source without its own excerpt", async () => {
  const invalid = {
    decision: { claims: [{ claimId: "planned-claim", action: "researched_gap" }] },
    writeback: {
      claims: [{ plannedClaimId: "planned-claim", evidenceClaimId: "corrected-claim" }],
      sources: [{ sourceId: "supported-source" }, { sourceId: "unsupported-extra-source" }],
    },
    research: {
      evidence: {
        claims: [{ id: "corrected-claim", sourceIds: ["supported-source", "unsupported-extra-source"], excerptLocations: [{ sourceId: "supported-source", quote: "This source supports the claim." }] }],
        sources: [{ id: "supported-source" }, { id: "unsupported-extra-source" }],
      },
      snapshotBytes: new Map([["supported-source", Buffer.from("supported")], ["unsupported-extra-source", Buffer.from("unbound")]]),
    },
  } as ResearchRegistryCommitInput;
  await assert.rejects(
    new NeonArticleResearchRegistry().commit(invalid),
    (error: unknown) => error instanceof Error && error.message === "RESEARCH_REGISTRY_CLAIM_SOURCE_EXCERPT_MISSING",
  );
});

test("gap mappings cannot alias a reused claim's effective evidence identity", async () => {
  const collision = {
    decision: { claims: [{ claimId: "reused-claim", action: "reused_current" }, { claimId: "gap-claim", action: "researched_gap" }] },
    writeback: { claims: [{ plannedClaimId: "gap-claim", evidenceClaimId: "reused-claim" }], sources: [] },
    research: {
      evidence: { claims: [{ id: "reused-claim", sourceIds: [], excerptLocations: [] }], sources: [] },
      snapshotBytes: new Map(),
    },
  } as ResearchRegistryCommitInput;
  await assert.rejects(
    new NeonArticleResearchRegistry().commit(collision),
    (error: unknown) => error instanceof Error && error.message === "RESEARCH_REGISTRY_WRITEBACK_CLAIM_MISMATCH",
  );
});

async function submitResearch(input: Awaited<ReturnType<typeof fixture>>, action: "reused_current" | "researched_gap", gapReason?: "stale" | "conflicting" | "missing") {
  const snapshot = await storeEvidence(input.root, input.record.importId, { text: "Acme costs $20 per month." });
  const evidence = {
    schemaVersion: "ResearchEvidenceV2", id: "research", createdAt: "2026-11-26T00:00:00.000Z",
    importId: input.record.importId, sourceFingerprint: input.record.sourceFingerprint, requirementRevision: WORKFLOW_REVISION,
    sources: [{ id: "source", url: "https://example.test/pricing", retrievedAt: "2026-11-25T00:00:00.000Z", snapshotRef: snapshot }],
    claims: [{ id: "claim", text: "Acme costs $20 per month.", sourceIds: ["source"], excerptLocations: [{ sourceId: "source", quote: "Acme costs $20 per month." }], limitations: ["Synthetic fixture."], price: { amount: 20, currency: "USD", period: "month", plan: "standard", restrictions: [] } }],
    freshness: "Checked against the registry plan.",
  };
  const evidencePath = "research.json";
  const decisionPath = "research-decisions.json";
  await writeJsonAtomically(path.join(input.root, evidencePath), evidence);
  await writeJsonAtomically(path.join(input.root, decisionPath), researchRegistryDecisionSchema.parse({
    schemaVersion: "ResearchRegistryDecisionV1",
    importId: input.record.importId,
    sourceFingerprint: input.record.sourceFingerprint,
    planFingerprint: input.packet.researchRegistry.planFingerprint,
    createdAt: "2026-11-26T00:00:00.000Z",
    claims: [{ claimId: "claim", claimText: "Acme costs $20 per month.", material: true, productContext: "Acme standard plan", action, ...(gapReason ? { gapReason } : {}), registryMatches: action === "reused_current" ? [{ claimId: candidate().claimId, snapshotId: candidate().snapshotId, productContext: candidate().productContext }] : [], rationale: action === "reused_current" ? "Current exact evidence covers the claim." : `The claim has a ${gapReason} evidence gap.` }],
  }));
  await writeJsonAtomically(path.join(input.root, input.packet.resultPath), {
    idempotencyKey: input.packet.idempotencyKey,
    sourceFingerprint: input.record.sourceFingerprint,
    summary: "Registry-backed research.",
    work: { stage: "RESEARCHING", researchAction: action === "reused_current" ? "reuse" : "acquire", registryDecisionPath: decisionPath, ...(action === "reused_current" ? { evidencePath } : {}) },
  });
  if (action === "researched_gap") {
    await executeImportCommand(input.root, { kind: "resume", importId: input.record.importId }, input.executor);
    const acquisition = await loadImport(input.root, input.record.importId);
    assert.equal(acquisition.continuation?.kind, "work");
    if (acquisition.continuation?.kind !== "work") throw new Error("Missing acquisition packet");
    const acquisitionPacket = JSON.parse(await readFile(path.join(input.root, acquisition.continuation.workPath), "utf8"));
    const decisionRef = await evidenceReference(input.root, decisionPath);
    const writebackPath = "research-writeback.json";
    await writeJsonAtomically(path.join(input.root, writebackPath), {
      schemaVersion: "ResearchRegistryWritebackV1", importId: input.record.importId,
      sourceFingerprint: input.record.sourceFingerprint, decisionSha256: decisionRef.sha256, createdAt: "2026-11-26T00:00:00.000Z",
      sources: [{ sourceId: "source", sourceType: "official_pricing", accessOutcome: "success", locator: "pricing table" }],
      claims: [{ plannedClaimId: "claim", evidenceClaimId: "claim", disposition: "confirmed", claimKind: "factual", verdict: "SUPPORTED", confidence: 0.95, reasoning: "The source states the price.", expiresAt: "2026-12-25T00:00:00.000Z" }],
    });
    await writeJsonAtomically(path.join(input.root, acquisitionPacket.resultPath), {
      idempotencyKey: acquisitionPacket.idempotencyKey, sourceFingerprint: input.record.sourceFingerprint,
      summary: "Registry gap research.", work: { stage: "RESEARCHING", evidencePath, registryDecisionPath: decisionPath, registryWritebackPath: writebackPath },
    });
  }
}

test("RESEARCHING shares current retained evidence before acquisition and replays one writeback", async () => {
  const fx = await fixture(candidate());
  try {
    assert.match(fx.packet.researchRegistry.candidates[0].passage, /Acme costs/);
    await submitResearch(fx, "reused_current");
    await executeImportCommand(fx.root, { kind: "resume", importId: fx.record.importId }, fx.executor);
    assert.equal((await loadImport(fx.root, fx.record.importId)).stage, "TRANSFORMING");
    assert.equal(fx.registry.commits.length, 1);
    const replay = await fx.registry.commit(fx.registry.commits[0].input);
    assert.equal(replay.replayed, true);
    assert.equal(fx.registry.commits.length, 1);
  } finally { await rm(fx.root, { recursive: true, force: true }); }
});

for (const reason of ["stale", "conflicting", "missing"] as const) {
  test(`RESEARCHING tracks ${reason} gaps before writing validated evidence`, async () => {
    const existing = reason === "missing" ? undefined : candidate({
      ...(reason === "stale" ? { expiresAt: "2026-11-25T00:00:00.000Z" } : { verdict: "CONTRADICTED", accessOutcome: "conflicting" }),
    });
    const fx = await fixture(existing);
    try {
      await submitResearch(fx, "researched_gap", reason);
      await executeImportCommand(fx.root, { kind: "resume", importId: fx.record.importId }, fx.executor);
      assert.equal((await loadImport(fx.root, fx.record.importId)).stage, "TRANSFORMING");
      assert.equal(fx.registry.commits[0].input.decision.claims[0].gapReason, reason);
    } finally { await rm(fx.root, { recursive: true, force: true }); }
  });
}

test("a stale reuse plan retries with a fresh lookup and preserves historical packets", async () => {
  const fx = await fixture(candidate());
  try {
    await submitResearch(fx, "reused_current");
    fx.registry.invalidateSnapshot(candidate().snapshotId);
    await executeImportCommand(fx.root, { kind: "resume", importId: fx.record.importId }, fx.executor);
    const waiting = await loadImport(fx.root, fx.record.importId);
    assert.equal(waiting.stage, "WAITING_EXTERNAL");
    assert.equal(waiting.continuation?.kind, "wait");
    if (waiting.continuation?.kind !== "wait") throw new Error("Missing stale-plan wait");
    const oldWorkPath = fx.researching.continuation?.kind === "work" ? fx.researching.continuation.workPath : "";
    await persistFixture(fx.root, { ...waiting, continuation: { ...waiting.continuation, nextCheckAt: new Date(Date.now() - 1000).toISOString() } });
    await executeImportCommand(fx.root, { kind: "resume", importId: fx.record.importId }, fx.executor);
    await executeImportCommand(fx.root, { kind: "resume", importId: fx.record.importId }, fx.executor);
    const retried = await loadImport(fx.root, fx.record.importId);
    assert.equal(retried.stage, "RESEARCHING");
    assert.equal(retried.continuation?.kind, "work");
    if (retried.continuation?.kind !== "work") throw new Error("Missing refreshed plan");
    assert.notEqual(retried.continuation.workPath, oldWorkPath);
    const refreshed = JSON.parse(await readFile(path.join(fx.root, retried.continuation.workPath), "utf8"));
    assert.equal(refreshed.researchRegistry.candidates.length, 0);
    assert.ok(await readFile(path.join(fx.root, oldWorkPath), "utf8"));
    assert.equal(retried.sourceFingerprint, fx.record.sourceFingerprint);
  } finally { await rm(fx.root, { recursive: true, force: true }); }
});

test("planning disables web tools before gap approval", async () => {
  const fx = await fixture(candidate());
  try {
    const invocation = await prepareWorkerInvocation(fx.root, fx.researching.continuation!.kind === "work" ? fx.researching.continuation.workPath : "", fx.packet, { executable: "opencode", model: "fixture/model" }, crypto.randomUUID());
    const config = JSON.parse(await readFile(path.join(invocation.cwd, "opencode.json"), "utf8"));
    const permissions = config.agents["article-worker"].permissions as Array<{ action: string; effect: string }>;
    assert.equal(permissions.some((permission) => permission.effect === "allow" && ["webfetch", "websearch"].includes(permission.action)), false);
    await rm(invocation.cwd, { recursive: true, force: true });
  } finally { await rm(fx.root, { recursive: true, force: true }); }
});

test("unprovable legacy bytes are a missing gap and expired conflict does not block reuse", () => {
  const now = "2026-11-26T00:00:00.000Z";
  const unprovable = candidate({ passage: null });
  const missingPlan = createResearchRegistryPlan({ importId: "article-44444444-4444-4444-8444-444444444444", sourceFingerprint: "a".repeat(64), generatedAt: now, candidates: [unprovable], legacyLeads: [] });
  const missing = researchRegistryDecisionSchema.parse({ schemaVersion: "ResearchRegistryDecisionV1", importId: missingPlan.importId, sourceFingerprint: missingPlan.sourceFingerprint, planFingerprint: missingPlan.planFingerprint, createdAt: now, claims: [{ claimId: "claim", claimText: unprovable.claimText, material: true, productContext: unprovable.productContext, action: "researched_gap", gapReason: "missing", registryMatches: [], rationale: "The legacy row has no verifiable retained bytes." }] });
  assert.doesNotThrow(() => validateRegistryDecisionPlan(missingPlan, missing, now));

  const supported = candidate();
  const expiredConflict = candidate({ claimId: "55555555-5555-4555-8555-555555555555", snapshotId: "66666666-6666-4666-8666-666666666666", verdict: "CONTRADICTED", accessOutcome: "conflicting", expiresAt: "2026-11-25T00:00:00.000Z" });
  const reusePlan = createResearchRegistryPlan({ importId: "article-77777777-7777-4777-8777-777777777777", sourceFingerprint: "b".repeat(64), generatedAt: now, candidates: [supported, expiredConflict], legacyLeads: [] });
  const reuse = researchRegistryDecisionSchema.parse({ schemaVersion: "ResearchRegistryDecisionV1", importId: reusePlan.importId, sourceFingerprint: reusePlan.sourceFingerprint, planFingerprint: reusePlan.planFingerprint, createdAt: now, claims: [{ claimId: "claim", claimText: supported.claimText, material: true, productContext: supported.productContext, action: "reused_current", registryMatches: [{ claimId: supported.claimId, snapshotId: supported.snapshotId, productContext: supported.productContext }], rationale: "The only current evidence supports the claim." }] });
  assert.doesNotThrow(() => validateRegistryDecisionPlan(reusePlan, reuse, now));
});

test("reuse expiring after lookup enters stale-plan recovery instead of packet repair", () => {
  const generatedAt = "2026-11-26T00:00:00.000Z";
  const decidedAt = "2026-11-26T01:00:00.000Z";
  const expiring = candidate({ expiresAt: "2026-11-26T00:30:00.000Z" });
  const plan = createResearchRegistryPlan({ importId: "article-99999999-9999-4999-8999-999999999999", sourceFingerprint: "d".repeat(64), generatedAt, candidates: [expiring], legacyLeads: [] });
  const decision = researchRegistryDecisionSchema.parse({ schemaVersion: "ResearchRegistryDecisionV1", importId: plan.importId, sourceFingerprint: plan.sourceFingerprint, planFingerprint: plan.planFingerprint, createdAt: decidedAt, claims: [{ claimId: "claim", claimText: expiring.claimText, material: true, productContext: expiring.productContext, action: "reused_current", registryMatches: [{ claimId: expiring.claimId, snapshotId: expiring.snapshotId, productContext: expiring.productContext }], rationale: "The evidence was current when the plan was generated." }] });
  const bytes = Buffer.from(expiring.passage!, "utf8");
  const research = {
    evidenceRef: { path: "synthetic/research.json", sha256: "e".repeat(64) }, evidencePath: "synthetic/research.json", evidenceSha256: "e".repeat(64),
    evidence: { createdAt: decidedAt, sources: [{ id: "source", url: expiring.canonicalUrl, retrievedAt: expiring.retrievedAt, snapshotRef: { path: "synthetic/snapshot.json", sha256: expiring.evidenceSha256 } }], claims: [{ id: "claim", text: expiring.claimText, sourceIds: ["source"], excerptLocations: [{ sourceId: "source", quote: expiring.claimText }] }] },
    snapshotBytes: new Map([["source", bytes]]),
  };
  assert.throws(() => validateRegistryDecisionAgainstEvidence(plan, decision, research, decidedAt), /RESEARCH_REGISTRY_PLAN_STALE/);

  const alreadyExpiredPlan = createResearchRegistryPlan({ importId: plan.importId, sourceFingerprint: plan.sourceFingerprint, generatedAt: decidedAt, candidates: [expiring], legacyLeads: [] });
  const invalidDecision = researchRegistryDecisionSchema.parse({ ...decision, planFingerprint: alreadyExpiredPlan.planFingerprint });
  assert.throws(() => validateRegistryDecisionAgainstEvidence(alreadyExpiredPlan, invalidDecision, research, decidedAt), /RESEARCH_REGISTRY_REUSE_NOT_CURRENT/);
});

test("lookup covers short Unicode product terms and claims after long introductions", () => {
  const introduction = Array.from({ length: 130 }, (_, index) => `introductory${index}`).join(" ");
  const expressions = researchSearchExpressions(`${introduction} SAP Übertool lateclaim`);
  const combined = expressions.join(" OR ");
  assert.match(combined, /sap/i);
  assert.match(combined, /übertool/i);
  assert.match(combined, /lateclaim/i);
  assert.ok(expressions.length > 1);
});

test("saved plans canonicalize key order and reject content tampering", () => {
  const plan = createResearchRegistryPlan({ importId: "article-88888888-8888-4888-8888-888888888888", sourceFingerprint: "c".repeat(64), generatedAt: "2026-11-26T00:00:00.000Z", candidates: [candidate()], legacyLeads: [] });
  const reordered = researchRegistryPlanSchema.parse(JSON.parse(JSON.stringify({ planFingerprint: plan.planFingerprint, legacyLeads: plan.legacyLeads, candidates: plan.candidates, generatedAt: plan.generatedAt, sourceFingerprint: plan.sourceFingerprint, importId: plan.importId, schemaVersion: plan.schemaVersion })));
  assert.doesNotThrow(() => assertResearchRegistryPlanFingerprint(reordered));
  const tampered = researchRegistryPlanSchema.parse({ ...reordered, candidates: [{ ...reordered.candidates[0], passage: "changed retained bytes" }] });
  assert.throws(() => assertResearchRegistryPlanFingerprint(tampered), /RESEARCH_REGISTRY_PLAN_FINGERPRINT_MISMATCH/);
});
