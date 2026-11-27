import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createArticleImport,
  loadImport,
  writeJsonAtomically,
} from "../../../../src/lib/article-import/engine";
import {
  evidenceReference,
  freezeEvidenceGraph,
  readEvidence,
  sha256,
  storeEvidence,
  withEvidenceSnapshot,
  type EvidenceRef,
} from "../../../../src/lib/article-import/execution-evidence";
import {
  createResearchRegistryPlan,
  researchRegistryDecisionSchema,
  validateRegistryDecisionAgainstEvidence,
  validateRegistryDecisionPlan,
  type ResearchRegistryCandidate,
  type ResearchRegistryPlan,
  type ValidatedResearchForRegistry,
} from "../../../../src/lib/article-import/research-registry";
import { createSupervisedImportExecutor } from "../../../../src/lib/article-import/supervised-executor";
import { WORKFLOW_REVISION } from "../../../../src/lib/article-import/workflow-requirements";
import { executeFixtureCommand, persistFixture } from "../../../../tests/fixtures/article-command";
import { createInMemoryResearchRegistry } from "../../../../tests/fixtures/article-research-registry";
import { writeAcquisitionResult } from "../../../../tests/fixtures/article-research-flow";

const evidenceDirectory = path.dirname(fileURLToPath(import.meta.url));
const investigatedRevision = "f026bca8b53aecca829262e9a27820ac6d078892";
const generatedAt = "2026-11-27T09:00:00.000Z";
const expiresLater = "2099-01-01T00:00:00.000Z";
const sourceFingerprint = "a".repeat(64);
const importId = "article-44444444-4444-4444-8444-444444444444";
const claimText = "Acme costs $20 per month.";
const passage = `${JSON.stringify({ text: claimText }, null, 2)}\n`;

type GapReason = "missing" | "stale" | "conflicting";
type Dimension = "control" | "relevance" | "support" | "integrity" | "freshness";

const canonicalRegistrationInventory = [
  { evidenceClass: "research", boundary: "ArticleResearchRegistry", availability: "present" },
  { evidenceClass: "rejected-finding", boundary: null, availability: "absent" },
  { evidenceClass: "resolution", boundary: null, availability: "absent" },
  { evidenceClass: "editorial-judgment", boundary: null, availability: "absent" },
  { evidenceClass: "browser-observation", boundary: null, availability: "absent" },
  { evidenceClass: "production-proof", boundary: null, availability: "absent" },
] as const;

function candidate(overrides: Partial<ResearchRegistryCandidate> = {}): ResearchRegistryCandidate {
  return {
    claimId: "11111111-1111-4111-8111-111111111111",
    claimSha256: sha256(claimText),
    claimText,
    claimKind: "factual",
    material: true,
    claimUpdatedAt: "2026-11-25T00:00:00.000Z",
    snapshotId: "22222222-2222-4222-8222-222222222222",
    sourceId: "33333333-3333-4333-8333-333333333333",
    canonicalUrl: "https://example.test/pricing",
    sourceType: "official_pricing",
    evidenceSha256: sha256(passage),
    retrievedAt: "2026-11-25T00:00:00.000Z",
    accessOutcome: "success",
    passage,
    locator: "pricing table",
    verdict: "SUPPORTED",
    confidence: 0.95,
    productContext: "general",
    reasoning: "The retained pricing table states the monthly price.",
    expiresAt: expiresLater,
    evidenceUpdatedAt: "2026-11-25T00:00:00.000Z",
    ...overrides,
  };
}

function planFor(entry: ResearchRegistryCandidate, legacy = false) {
  return createResearchRegistryPlan({
    importId,
    sourceFingerprint,
    generatedAt,
    candidates: [entry],
    legacyLeads: legacy ? [{
      sourceId: "99999999-9999-4999-8999-999999999999",
      productId: null,
      sourceUrl: "https://example.test/historical",
      sourceType: "historical-review",
      sourceHash: null,
      retrievedAt: null,
      usageAllowed: false,
      claimId: null,
      claimText: null,
      claimUpdatedAt: null,
    }] : [],
  });
}

function reuseDecision(plan: ResearchRegistryPlan, entry: ResearchRegistryCandidate) {
  return researchRegistryDecisionSchema.parse({
    schemaVersion: "ResearchRegistryDecisionV1",
    importId: plan.importId,
    sourceFingerprint: plan.sourceFingerprint,
    planFingerprint: plan.planFingerprint,
    createdAt: generatedAt,
    claims: [{
      claimId: "claim",
      claimText,
      material: true,
      productContext: "general",
      action: "reused_current",
      registryMatches: [{ claimId: entry.claimId, snapshotId: entry.snapshotId, productContext: entry.productContext }],
      rationale: "The current retained bytes support this exact claim and product context.",
    }],
  });
}

function gapDecision(plan: ResearchRegistryPlan, gapReason: GapReason) {
  return researchRegistryDecisionSchema.parse({
    schemaVersion: "ResearchRegistryDecisionV1",
    importId: plan.importId,
    sourceFingerprint: plan.sourceFingerprint,
    planFingerprint: plan.planFingerprint,
    createdAt: generatedAt,
    claims: [{
      claimId: "claim",
      claimText,
      material: true,
      productContext: "general",
      action: "researched_gap",
      gapReason,
      registryMatches: [],
      rationale: `The register has a ${gapReason} gap for this exact claim.`,
    }],
  });
}

function researchFor(entry: ResearchRegistryCandidate): ValidatedResearchForRegistry {
  return {
    evidenceRef: { path: "synthetic-research.json", sha256: "b".repeat(64) },
    evidencePath: "synthetic-research.json",
    evidenceSha256: "b".repeat(64),
    evidence: {
      createdAt: generatedAt,
      sources: [{
        id: "source",
        url: entry.canonicalUrl,
        retrievedAt: generatedAt,
        snapshotRef: { path: "synthetic-source.json", sha256: sha256(passage) },
      }],
      claims: [{
        id: "claim",
        text: claimText,
        sourceIds: ["source"],
        excerptLocations: [{ sourceId: "source", quote: claimText }],
      }],
    },
    snapshotBytes: new Map([["source", Buffer.from(passage)]]),
  };
}

function thrownCode(work: () => void): string | null {
  try {
    work();
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

function registryMatrix() {
  const variants: Record<Dimension, { entry: ResearchRegistryCandidate; gap?: GapReason }> = {
    control: { entry: candidate() },
    relevance: { entry: candidate({ claimText: "Acme has an annual enterprise plan.", claimSha256: sha256("Acme has an annual enterprise plan.") }), gap: "missing" },
    support: { entry: candidate({ verdict: "PARTIALLY_SUPPORTED" }), gap: "conflicting" },
    integrity: { entry: candidate({ evidenceSha256: "f".repeat(64) }), gap: "missing" },
    freshness: { entry: candidate({ expiresAt: "2026-11-26T00:00:00.000Z" }), gap: "stale" },
  };
  const observations = Object.entries(variants).map(([dimension, input]) => {
    const plan = planFor(input.entry, dimension === "control");
    const reuse = reuseDecision(plan, input.entry);
    const reuseError = thrownCode(() => {
      validateRegistryDecisionPlan(plan, reuse, generatedAt);
      validateRegistryDecisionAgainstEvidence(plan, reuse, researchFor(input.entry), generatedAt);
    });
    const gapError = input.gap ? thrownCode(() => validateRegistryDecisionPlan(plan, gapDecision(plan, input.gap!), generatedAt)) : null;
    return {
      dimension,
      reuseAccepted: reuseError === null,
      reuseError,
      gapReason: input.gap ?? null,
      gapAccepted: input.gap ? gapError === null : null,
      gapError,
      sourceFingerprint: plan.sourceFingerprint,
      unknownHistoricalProvenance: plan.legacyLeads,
    };
  });
  assert.equal(observations.find((item) => item.dimension === "control")?.reuseAccepted, true);
  for (const item of observations.filter((entry) => entry.dimension !== "control")) {
    assert.equal(item.reuseAccepted, false, `${item.dimension} must not reuse invalid evidence`);
    assert.equal(item.gapAccepted, true, `${item.dimension} must classify a recoverable gap`);
  }
  return observations;
}

function canonicalRegistrationExercise(matrix: ReturnType<typeof registryMatrix>) {
  const researchObserved = matrix.some((item) => item.dimension === "control" && item.reuseAccepted);
  return Object.fromEntries(canonicalRegistrationInventory.map((item) => [item.evidenceClass, item.evidenceClass === "research"
    ? {
      status: researchObserved ? "observed" : "failed",
      boundary: item.boundary,
      evidence: "The valid control traversed the research registry plan and evidence validators.",
    }
    : {
      status: "unreachable",
      boundary: null,
      evidence: `No first-class ${item.evidenceClass} registration boundary exists in the investigated revision.`,
    }])) as Record<string, { status: "observed" | "failed" | "unreachable"; boundary: string | null; evidence: string }>;
}

async function writePlanningResult(root: string, continuation: { workPath: string; resultPath: string; idempotencyKey?: string; sourceFingerprint?: string }, gapReason: GapReason) {
  const { idempotencyKey, sourceFingerprint } = continuation;
  assert.ok(idempotencyKey, "research planning continuation must have an idempotency key");
  assert.ok(sourceFingerprint, "research planning continuation must have a source fingerprint");
  const packet = JSON.parse(await readFile(path.join(root, continuation.workPath), "utf8"));
  const decisionPath = path.posix.join(path.posix.dirname(continuation.resultPath), `${idempotencyKey}.registry-decision.json`);
  const decision = gapDecision(packet.researchRegistry, gapReason);
  await writeJsonAtomically(path.join(root, decisionPath), decision);
  await writeJsonAtomically(path.join(root, continuation.resultPath), {
    idempotencyKey,
    sourceFingerprint,
    summary: `Recorded a synthetic ${gapReason} registry gap.`,
    work: { stage: "RESEARCHING", researchAction: "acquire", registryDecisionPath: decisionPath },
  });
  return { decisionPath };
}

async function writeResearch(root: string, record: { importId: string; sourceFingerprint: string }, name: string) {
  const snapshotRef = await storeEvidence(root, record.importId, { text: claimText, acquisition: name });
  const evidencePath = `${name}.json`;
  await writeJsonAtomically(path.join(root, evidencePath), {
    schemaVersion: "ResearchEvidenceV2",
    id: name,
    createdAt: generatedAt,
    importId: record.importId,
    sourceFingerprint: record.sourceFingerprint,
    requirementRevision: WORKFLOW_REVISION,
    sources: [{ id: "source", url: "https://example.test/pricing", retrievedAt: generatedAt, snapshotRef }],
    claims: [{
      id: "claim",
      text: claimText,
      sourceIds: ["source"],
      excerptLocations: [{ sourceId: "source", quote: claimText }],
      limitations: ["Synthetic fixture only."],
      price: { amount: 20, currency: "USD", period: "month", plan: "standard", restrictions: [] },
    }],
    freshness: `Synthetic acquisition ${name}.`,
  });
  return evidencePath;
}

async function acquireGap(root: string, gapReason: GapReason, initialCandidates: ResearchRegistryCandidate[]) {
  const registry = createInMemoryResearchRegistry(initialCandidates);
  const executor = createSupervisedImportExecutor(root, undefined, { researchRegistry: registry });
  const record = await createArticleImport(root, "article.md");
  await executeFixtureCommand(root, { kind: "resume", importId: record.importId }, executor);
  await executeFixtureCommand(root, { kind: "resume", importId: record.importId }, executor);
  const planning = await loadImport(root, record.importId);
  assert.equal(planning.continuation?.kind, "work");
  if (planning.continuation?.kind !== "work") throw new Error("Missing research planning packet");
  await writePlanningResult(root, planning.continuation, gapReason);
  await executeFixtureCommand(root, { kind: "resume", importId: record.importId }, executor);
  const acquisition = await loadImport(root, record.importId);
  assert.equal(acquisition.continuation?.kind, "work");
  if (acquisition.continuation?.kind !== "work") throw new Error("Missing research acquisition packet");
  const evidencePath = await writeResearch(root, record, `research-${gapReason}`);
  await writeAcquisitionResult(root, acquisition.continuation, evidencePath);
  await executeFixtureCommand(root, { kind: "resume", importId: record.importId }, executor);
  const advanced = await loadImport(root, record.importId);
  assert.equal(advanced.stage, "TRANSFORMING", `${gapReason}: ${advanced.nextAction} ${JSON.stringify(advanced.stageReceipts.at(-1))}`);
  return { registry, executor, record, advanced, evidencePath };
}

async function controllerRecovery() {
  const parent = path.join(process.cwd(), ".scratch");
  await mkdir(parent, { recursive: true });
  const missingRoot = await mkdtemp(path.join(parent, "recovery-102-missing-"));
  const staleRoot = await mkdtemp(path.join(parent, "recovery-102-stale-"));
  try {
    for (const root of [missingRoot, staleRoot]) {
      await writeFile(path.join(root, "approved-urls.md"), "");
      await writeFile(path.join(root, "article.md"), `# Evidence guide\n\n${claimText}\n`);
    }
    const missing = await acquireGap(missingRoot, "missing", []);
    const stale = await acquireGap(staleRoot, "stale", [candidate({ expiresAt: "2026-11-26T00:00:00.000Z" })]);
    const initialResearchRef = missing.advanced.evidenceRefs?.research;
    assert.ok(initialResearchRef);
    const dependentRefs = {
      assessment: await storeEvidence(missingRoot, missing.record.importId, { kind: "assessment", examinedRevision: missing.record.sourceFingerprint }),
      editorial: await storeEvidence(missingRoot, missing.record.importId, { kind: "editorial", examinedRevision: missing.record.sourceFingerprint }),
      presentation: await storeEvidence(missingRoot, missing.record.importId, { kind: "browser-observation", examinedRevision: missing.record.sourceFingerprint }),
      production: await storeEvidence(missingRoot, missing.record.importId, { kind: "production-proof", examinedRevision: missing.record.sourceFingerprint }),
    };
    await persistFixture(missingRoot, {
      ...missing.advanced,
      stage: "VALIDATING",
      evidenceRefs: { research: initialResearchRef, ...dependentRefs },
      stageReceipts: [...missing.advanced.stageReceipts, {
        stage: "TRANSFORMING",
        status: "failed",
        at: generatedAt,
        message: "WORKFLOW_EVIDENCE_INVALID: ASSESSMENT_RULE_FAILED:claims",
      }],
    });
    await executeFixtureCommand(missingRoot, { kind: "resume", importId: missing.record.importId }, missing.executor);
    const invalidated = await loadImport(missingRoot, missing.record.importId);
    assert.equal(invalidated.stage, "RESEARCHING");
    assert.equal(invalidated.continuation?.kind, "work");
    assert.deepEqual(invalidated.evidenceRefs, {});
    if (invalidated.continuation?.kind !== "work") throw new Error("Missing recovery planning packet");
    const invalidationReceipt = invalidated.stageReceipts.findLast((receipt) => receipt.message.includes("RESEARCH_RECOVERY_REQUIRED"));
    assert.ok(invalidationReceipt);
    await writePlanningResult(missingRoot, invalidated.continuation, "missing");
    await executeFixtureCommand(missingRoot, { kind: "resume", importId: missing.record.importId }, missing.executor);
    const reacquisition = await loadImport(missingRoot, missing.record.importId);
    if (reacquisition.continuation?.kind !== "work") throw new Error("Missing recovery acquisition packet");
    const freshPath = await writeResearch(missingRoot, missing.record, "research-reacquired");
    await writeAcquisitionResult(missingRoot, reacquisition.continuation, freshPath);
    await executeFixtureCommand(missingRoot, { kind: "resume", importId: missing.record.importId }, missing.executor);
    const recovered = await loadImport(missingRoot, missing.record.importId);
    assert.equal(recovered.stage, "TRANSFORMING");
    assert.ok(recovered.evidenceRefs?.research);
    assert.notDeepEqual(recovered.evidenceRefs?.research, initialResearchRef);
    const priorReadable = {
      research: Boolean(await readEvidence(missingRoot, initialResearchRef)),
      assessment: Boolean(await readEvidence(missingRoot, dependentRefs.assessment)),
      editorial: Boolean(await readEvidence(missingRoot, dependentRefs.editorial)),
      presentation: Boolean(await readEvidence(missingRoot, dependentRefs.presentation)),
      production: Boolean(await readEvidence(missingRoot, dependentRefs.production)),
    };
    return {
      missing: { stage: missing.advanced.stage, gapReason: missing.registry.commits[0].input.decision.claims[0].gapReason },
      stale: { stage: stale.advanced.stage, gapReason: stale.registry.commits[0].input.decision.claims[0].gapReason },
      invalidResearch: {
        stageAfterInvalidation: invalidated.stage,
        invalidatedApprovalKeys: Object.keys(dependentRefs),
        retainedApprovalKeys: Object.keys(invalidated.evidenceRefs ?? {}).filter((key) => key !== "research"),
        invalidationReason: invalidationReceipt.message,
        priorReadable,
        recoveredStage: recovered.stage,
        freshResearchRef: recovered.evidenceRefs?.research,
        examinedRevision: recovered.sourceFingerprint,
      },
      externalWorkerCalls: 0,
    };
  } finally {
    await rm(missingRoot, { recursive: true, force: true });
    await rm(staleRoot, { recursive: true, force: true });
  }
}

async function retentionGraph() {
  const root = await mkdtemp(path.join(process.cwd(), ".scratch", "recovery-102-retention-"));
  try {
    await mkdir(path.join(root, "config"), { recursive: true });
    await writeFile(path.join(root, "config/article-workflow-capabilities.json"), "{}");
    const categories = ["research", "rejected-finding", "resolution", "editorial-judgment", "browser-observation", "production-proof"];
    const refs: Record<string, EvidenceRef> = {};
    for (const category of categories) {
      const relative = `retained/${category}.json`;
      await mkdir(path.dirname(path.join(root, relative)), { recursive: true });
      await writeFile(path.join(root, relative), JSON.stringify({ category, examinedRevision: sourceFingerprint }));
      refs[category] = await evidenceReference(root, relative);
    }
    const register = await storeEvidence(root, importId, { schemaVersion: "SyntheticEvidenceRegisterV1", refs });
    const frozen = await freezeEvidenceGraph(root, importId, [register]);
    for (const category of categories) await writeFile(path.join(root, `retained/${category}.json`), JSON.stringify({ category, changed: true }));
    const resolved = await withEvidenceSnapshot(frozen, async () => Object.fromEntries(await Promise.all(
      categories.map(async (category) => [category, await readEvidence(root, refs[category])]),
    )));
    return {
      resolvedCategories: Object.keys(resolved),
      frozenFileCount: frozen.length,
      allExactRevisions: Object.values(resolved).every((value) => (value as { examinedRevision?: string }).examinedRevision === sourceFingerprint),
      retentionNote: "The generic frozen graph retains exact bytes. Canonical registration is evaluated separately at exercised product boundaries.",
    };
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function main() {
  const matrix = registryMatrix();
  const observations = {
    schemaVersion: "RegisteredEvidenceRecovery102V1",
    investigatedRevision,
    generatedAt: new Date().toISOString(),
    expected: {
      reuseDimensions: ["relevance", "support", "integrity", "freshness"],
      invalidDimensionsRequireResearch: true,
      dependentApprovalsInvalidated: true,
      independentApprovalsRetainedWithReason: true,
      everyEvidenceClassHasCanonicalRegistration: true,
      freshJudgmentBoundToExaminedRevision: true,
      unknownHistoricalProvenanceRetained: true,
    },
    canonicalRegistrationInventory,
    canonicalRegistrationExercise: canonicalRegistrationExercise(matrix),
    registryMatrix: matrix,
    controllerRecovery: await controllerRecovery(),
    retentionGraph: await retentionGraph(),
    unreachable: [
      "No first-class canonical register schema exists for rejected findings, resolutions, editorial judgments, browser observations, or production proof.",
      "No approval in the active assessment/editorial/presentation/production chain is independent of research, so a surviving independent approval case cannot be constructed through the current controller contract.",
      "A rejected finding has a disposition and evidence refs, but the active schema has no separate integrity-bound resolution record.",
    ],
  };
  await writeFile(path.join(evidenceDirectory, "observations.json"), `${JSON.stringify(observations, null, 2)}\n`);
  assert.equal(observations.controllerRecovery.missing.stage, "TRANSFORMING");
  assert.equal(observations.controllerRecovery.stale.stage, "TRANSFORMING");
  assert.equal(observations.controllerRecovery.invalidResearch.recoveredStage, "TRANSFORMING");
  assert.equal(observations.retentionGraph.allExactRevisions, true);
  if (process.argv.includes("--assert-required")) {
    assert.equal(
      Object.values(observations.canonicalRegistrationExercise).every((item) => item.status === "observed"),
      true,
      "every retained evidence class must have a first-class canonical register record",
    );
    assert.ok(
      observations.controllerRecovery.invalidResearch.retainedApprovalKeys.length > 0,
      "independently valid approvals must survive with a recorded reason",
    );
  }
  process.stdout.write(`${JSON.stringify({ ok: true, observations: path.join(evidenceDirectory, "observations.json") })}\n`);
}

main().catch(async (error) => {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  if (process.argv.includes("--assert-required")) await writeFile(path.join(evidenceDirectory, "red-output.txt"), `${message.trimEnd()}\n`);
  console.error(message);
  process.exitCode = 1;
});
