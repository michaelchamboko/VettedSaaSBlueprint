import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";
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
import { captureCommandExecution, evidenceReference, sha256, storeEvidence, storeEvidenceBytes, validateExecutionEvidence } from "../src/lib/article-import/execution-evidence";
import { presentationCandidateUnavailable } from "../src/lib/article-import/worker-presentation";
import { editorialExecutionSchema, presentationDesignRejected, readEvidence, workflowEvidenceRejected, workflowEvidenceSchema } from "../src/lib/article-import/workflow-evidence";
import { validateArticleVisualRuntime } from "../src/lib/article-import/article-visual-quality";
import { createLocalReleaseOperations } from "../src/lib/article-import/local-release-adapter";
import { WORKFLOW_REVISION } from "../src/lib/article-import/workflow-requirements";
import { importPacketId } from "../src/lib/article-import/packet-binding";
import { approveFixture, refreshPresentationFixture, refreshPresentationFixtureWithMeasurementReview } from "./fixtures/article-content-approval";
import { buildWorkflowFixture } from "./fixtures/article-workflow-evidence";

async function fixture() {
  const parent = path.join(process.cwd(), ".scratch");
  await mkdir(parent, { recursive: true });
  const root = await mkdtemp(path.join(parent, "import-recovery-"));
  await writeFile(path.join(root, "approved-urls.md"), "");
  await writeFile(path.join(root, "article.md"), "# A workflow guide\n\nThis practical guide describes several workflow choices and their limitations for a team preparing a production.");
  const record = await advanceImport(root, await createArticleImport(root, "article.md"), "Source captured.");
  return { root, record };
}

async function attachSyntheticHero(root: string, record: Awaited<ReturnType<typeof fixture>>["record"]) {
  const webp = await sharp({ create: { width: 1600, height: 900, channels: 3, background: "#d9c7a8" } }).webp().toBuffer();
  const assetPath = "public/images/direct-review-example-hero.webp";
  await mkdir(path.join(root, "public/images"), { recursive: true });
  await writeFile(path.join(root, assetPath), webp);
  const assetRef = { path: assetPath, sha256: sha256(webp) };
  const inspectionRef = await storeEvidenceBytes(root, record.importId, webp, "webp");
  const providerOutputRef = await storeEvidence(root, record.importId, { schemaVersion: "ArticleHeroProviderOutputV1", provider: "openai", tool: "chatgpt-imagegen", interface: "built-in", toolCallId: "tracking-fixture", generatedAt: "2026-11-03T00:00:00.000Z", generatedImage: { providerAssetPath: "generated-image://tracking-fixture", originalSha256: assetRef.sha256 } });
  const prompt = "Create a restrained editorial workflow illustration with no people, text, logos, or misleading product imagery.";
  const generationRef = await storeEvidence(root, record.importId, { schemaVersion: "ArticleHeroGenerationEvidenceV1", importId: record.importId, sourceFingerprint: record.sourceFingerprint, format: "direct-review", slug: "example", artifactFingerprint: record.contentApproval!.artifactFingerprint, originalRef: assetRef, alt: "A restrained abstract workflow illustration for the reviewed article.", generation: { provider: "openai", tool: "chatgpt-imagegen", interface: "built-in", toolCallId: "tracking-fixture", generatedAt: "2026-11-03T00:00:00.000Z", prompt, promptSha256: sha256(prompt), outputSha256: assetRef.sha256, providerOutputRef } });
  const publicationRef = await storeEvidence(root, record.importId, { schemaVersion: "ArticleHeroPublicationV1", format: "direct-review", slug: "example", artifactFingerprint: record.contentApproval!.artifactFingerprint, rendererFingerprint: "1".repeat(64), asset: { filePath: assetPath, publicPath: "/images/direct-review-example-hero.webp", sha256: assetRef.sha256, width: 1600, height: 900, alt: "A restrained abstract workflow illustration for the reviewed article." } });
  const binding = { schemaVersion: "ArticleHeroBindingV1" as const, format: "direct-review" as const, slug: "example", artifactFingerprint: record.contentApproval!.artifactFingerprint, assetRef, inspectionRef, publicationRef, generationRef };
  const hero = await storeEvidence(root, record.importId, binding);
  return { ...record, heroImage: binding, evidenceRefs: { ...record.evidenceRefs, hero } };
}

async function v3Presentation(root: string, record: Awaited<ReturnType<typeof fixture>>["record"], input: { trackingOverride?: string; remedyTrackingReview?: NonNullable<Parameters<typeof buildWorkflowFixture>[2]["remedyTrackingReview"]> } = {}) {
  const approval = record.contentApproval!;
  const after = JSON.parse(await readFile(path.join(root, approval.artifactPath), "utf8"));
  const editorial = editorialExecutionSchema.parse(await readEvidence(root, record.evidenceRefs!.editorial!));
  const before = await readEvidence(root, editorial.passes[0].inputRef);
  return buildWorkflowFixture(root, record, { format: "direct-review", artifactPath: approval.artifactPath, before, after, editorialEvidencePath: approval.editorialEvidencePath, ...input });
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

test("a normal pending research result supplies the fourth-attempt remedy without seeded record evidence", async () => {
  const { root, record } = await fixture();
  try {
    const directory = `.automation/article-imports/work/${record.importId}`;
    const workPath = `${directory}/pending.work.json`;
    const resultPath = `${directory}/pending.result.json`;
    await mkdir(path.join(root, directory), { recursive: true });
    await writeFile(path.join(root, workPath), JSON.stringify({ stage: "RESEARCHING" }));
    const idempotencyKey = importPacketId(record, "RESEARCHING", "alternate-source");
    let current = await withImportLease(root, record.importId, async (leased) => {
      const updated = { ...leased, continuation: { kind: "work" as const, stage: "RESEARCHING" as const, workPath, resultPath, idempotencyKey, sourceFingerprint: leased.sourceFingerprint } };
      await saveImport(root, updated); return updated;
    });
    const invalidResearch = await researchEvidence(root, record, false);
    for (let attempt = 0; attempt < 3; attempt++) {
      await writeFile(path.join(root, resultPath), JSON.stringify({ idempotencyKey, sourceFingerprint: record.sourceFingerprint, summary: `invalid ${attempt}`, work: { stage: "RESEARCHING", evidencePath: invalidResearch.path, registryDecisionPath: "synthetic-decision.json" } }));
      current = await recordImportRepair(root, current, { strategy: "research", message: `Pending research validation failed ${attempt}.` });
    }
    assert.ok(current.continuation?.kind === "repair" && current.continuation.failedWork?.resultPath === resultPath);
    const failedSubmissionDigest = current.continuation.submittedFingerprint!;
    const supporting = await storeEvidence(root, record.importId, { observation: "The pending result failed the research validator three times." });
    await writeFile(path.join(root, resultPath), JSON.stringify({ idempotencyKey, sourceFingerprint: record.sourceFingerprint, summary: "contradicted replacement", work: { stage: "RESEARCHING", evidencePath: invalidResearch.path, registryDecisionPath: "synthetic-decision.json" } }));
    const contradictedDigest = await canonicalSubmissionFingerprint(current, root);
    const contradictedRemedy = await validatedResearchRemedy(root, record, { failedSubmissionDigest, replacementSubmissionDigest: contradictedDigest, validatedEvidenceRef: invalidResearch });
    const diagnosis = (replacementSubmissionDigest: string, remedyEvidenceRefs: Array<{ path: string; sha256: string }>) => ({ schemaVersion: "DiagnosisV1", importId: record.importId, sourceFingerprint: record.sourceFingerprint, stage: current.stage, failedSubmissionDigest, replacementSubmissionDigest, failureCode: "PENDING_RESEARCH_INVALID", cause: "The pending result referenced invalid research evidence.", predictedObservation: "The corrected pending result passes the research validator.", disproofCheck: "Reject if the pending packet binding or research validator fails.", attemptedRecoveryRefs: [supporting], remedyEvidenceRefs, repairChange: { kind: "product-repair", changedInputs: [resultPath] }, createdAt: new Date().toISOString() });
    await assert.rejects(submitImportDiagnosis(root, record.importId, diagnosis(contradictedDigest, [contradictedRemedy])), /RESEARCH_EXCERPT_MISMATCH/);
    const validResearch = await researchEvidence(root, record);
    const unrelatedResearch = await researchEvidence(root, record);
    await writeFile(path.join(root, resultPath), JSON.stringify({ idempotencyKey, sourceFingerprint: record.sourceFingerprint, summary: "corrected", work: { stage: "RESEARCHING", evidencePath: validResearch.path, registryDecisionPath: "synthetic-decision.json" } }));
    const replacementSubmissionDigest = await canonicalSubmissionFingerprint(current, root);
    const remedy = await validatedResearchRemedy(root, record, { failedSubmissionDigest, replacementSubmissionDigest, validatedEvidenceRef: validResearch });
    const unrelatedRemedy = await validatedResearchRemedy(root, record, { failedSubmissionDigest, replacementSubmissionDigest, validatedEvidenceRef: unrelatedResearch });
    await assert.rejects(submitImportDiagnosis(root, record.importId, diagnosis(replacementSubmissionDigest, [unrelatedRemedy])), /DIAGNOSIS_REMEDY_REPLACEMENT_EVIDENCE_MISMATCH/);
    const base = diagnosis(replacementSubmissionDigest, [remedy]);
    const wrongPacket = await validatedResearchRemedy(root, record, { failedSubmissionDigest, replacementSubmissionDigest, validatedEvidenceRef: validResearch });
    await writeFile(path.join(root, resultPath), JSON.stringify({ idempotencyKey: "0".repeat(64), sourceFingerprint: record.sourceFingerprint, summary: "wrong packet", work: { stage: "RESEARCHING", evidencePath: validResearch.path, registryDecisionPath: "synthetic-decision.json" } }));
    await assert.rejects(submitImportDiagnosis(root, record.importId, { ...base, replacementSubmissionDigest: await canonicalSubmissionFingerprint(current, root), remedyEvidenceRefs: [wrongPacket] }), /DIAGNOSIS_REMEDY_RESULT_BINDING_MISMATCH|DIAGNOSIS_REMEDY_BINDING_MISMATCH/);
    await writeFile(path.join(root, resultPath), JSON.stringify({ idempotencyKey, sourceFingerprint: record.sourceFingerprint, summary: "corrected", work: { stage: "RESEARCHING", evidencePath: validResearch.path, registryDecisionPath: "synthetic-decision.json" } }));
    await submitImportDiagnosis(root, record.importId, base);
    let calls = 0;
    await executePendingImport(root, record.importId, async ({ record: pending }) => { calls++; return pending; });
    assert.equal(calls, 1);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("a releasing repair verifies corrected paths without invoking a provider", async () => {
  const { root, record } = await fixture();
  try {
    let current = { ...record, stage: "REFINING" as const, format: "direct-review" as const };
    current = await withImportLease(root, record.importId, async () => { await saveImport(root, current); return current; });
    current = await approveFixture(root, current);
    current = { ...current, stage: "RELEASING" as const };
    const directory = `.automation/article-imports/work/${record.importId}`;
    const workPath = `${directory}/release.work.json`, resultPath = `${directory}/release.result.json`;
    await mkdir(path.join(root, directory), { recursive: true });
    await writeFile(path.join(root, workPath), JSON.stringify({ stage: "RELEASING" }));
    const idempotencyKey = importPacketId(current, "RELEASING", "retry-transient");
    current = await withImportLease(root, record.importId, async () => {
      const updated = { ...current, continuation: { kind: "work" as const, stage: "RELEASING" as const, workPath, resultPath, idempotencyKey, sourceFingerprint: current.sourceFingerprint } };
      await saveImport(root, updated); return updated;
    });
    for (let attempt = 0; attempt < 3; attempt++) {
      await writeFile(path.join(root, resultPath), JSON.stringify({ idempotencyKey, sourceFingerprint: record.sourceFingerprint, summary: `invalid release ${attempt}`, work: { stage: "RELEASING", artifactPath: current.contentApproval!.artifactPath, slug: "example", changedFiles: ["approved-urls.md"] } }));
      current = await recordImportRepair(root, current, { strategy: "release-validation", message: `Disallowed release path ${attempt}.`, failedCheck: { code: "RELEASE_DECLARATION", criterionId: "release-result", criterionRevision: WORKFLOW_REVISION } });
    }
    assert.ok(current.continuation?.kind === "repair");
    const failedSubmissionDigest = current.continuation.submittedFingerprint!;
    await writeFile(path.join(root, resultPath), JSON.stringify({ idempotencyKey, sourceFingerprint: record.sourceFingerprint, summary: "corrected release", work: { stage: "RELEASING", artifactPath: current.contentApproval!.artifactPath, slug: "example", changedFiles: [current.contentApproval!.artifactPath, "src/generated/landing-pages/index.json"] } }));
    const replacementSubmissionDigest = await canonicalSubmissionFingerprint(current, root);
    const resultRef = await evidenceReference(root, resultPath);
    const supporting = await storeEvidence(root, record.importId, { observation: "The prior release result declared a disallowed path." });
    const remedy = await storeEvidence(root, record.importId, { schemaVersion: "RemedyVerificationEvidenceV1", importId: record.importId, sourceFingerprint: record.sourceFingerprint, stage: "RELEASING", failedSubmissionDigest, replacementSubmissionDigest, criterion: { id: "release-result", revision: WORKFLOW_REVISION }, validatedEvidenceRef: resultRef, checkedAt: new Date().toISOString() });
    const diagnosis = { schemaVersion: "DiagnosisV1", importId: record.importId, sourceFingerprint: record.sourceFingerprint, stage: "RELEASING", failedSubmissionDigest, replacementSubmissionDigest, failureCode: "RELEASE_PATHS_INVALID", cause: "The pending release result included a disallowed path.", predictedObservation: "The corrected release result passes path and artifact identity checks without provider mutation.", disproofCheck: "Reject if the result identity, artifact, slug or required paths do not match.", attemptedRecoveryRefs: [supporting], remedyEvidenceRefs: [remedy], repairChange: { kind: "product-repair", changedInputs: [resultPath] }, createdAt: new Date().toISOString() } as const;
    const unrelatedFailure = { ...current, updatedAt: new Date(Date.parse(current.updatedAt) + 1).toISOString(), continuation: { ...current.continuation, failedCheck: { code: "FORMAT_VALIDATION", criterionId: "release-result", criterionRevision: WORKFLOW_REVISION } } };
    await withImportLease(root, record.importId, async () => { await saveImport(root, unrelatedFailure); return unrelatedFailure; });
    await assert.rejects(submitImportDiagnosis(root, record.importId, diagnosis), /DIAGNOSIS_RELEASE_CHECK_UNSUPPORTED/);
    current = { ...current, stateRevision: (await loadImport(root, record.importId)).stateRevision, updatedAt: new Date(Date.parse(unrelatedFailure.updatedAt) + 1).toISOString() };
    await withImportLease(root, record.importId, async () => { await saveImport(root, current); return current; });
    await submitImportDiagnosis(root, record.importId, diagnosis);
    let calls = 0;
    await executePendingImport(root, record.importId, async ({ record: pending }) => { calls++; return pending; });
    assert.equal(calls, 1);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("measurement changes require justification and separate independent verification", async () => {
  const { root, record } = await fixture();
  try {
    let current = { ...record, stage: "REFINING" as const, format: "direct-review" as const };
    current = await withImportLease(root, record.importId, async () => { await saveImport(root, current); return current; });
    current = await approveFixture(root, current);
    current = await advanceImport(root, current, "Synthetic editorial approval complete.");
    current = await refreshPresentationFixture(root, current, { mobile: { width: 390, height: 844, reducedMotion: false } });
    current = await withImportLease(root, record.importId, async () => { await saveImport(root, current); return current; });
    for (let index = 0; index < 3; index++) {
      current = await recordImportRepair(root, { ...current, transformation: { ...current.transformation!, title: `Viewport attempt ${index}` } }, { strategy: "design-repair", message: `Mobile viewport criterion rejected attempt ${index}.` });
    }
    assert.ok(current.continuation?.kind === "repair");
    const previousPresentationRef = current.evidenceRefs!.presentation!;
    const previous = workflowEvidenceSchema.parse(await readEvidence(root, previousPresentationRef));
    const previousObservationRef = previous.ruleResults.find((result) => result.ruleId === "mobile")!.evidenceRefs[0];
    const sourceViewport = (await validateExecutionEvidence(root, previousObservationRef));
    assert.equal(sourceViewport.kind, "browser");
    const justification = "The retained prior and replacement mobile observations establish the corrected viewport criterion without weakening layout requirements.";
    const refreshed = await refreshPresentationFixtureWithMeasurementReview(root, { ...current, transformation: { ...current.transformation!, title: "Replacement viewport candidate" } }, { viewportOverrides: { mobile: { width: 430, height: 900, reducedMotion: false } }, remedyMeasurementReview: { previousObservationRef, criterion: { id: "mobile", revision: WORKFLOW_REVISION }, sourceViewport: sourceViewport.viewport, targetViewport: { width: 430, height: 900, reducedMotion: false }, justification, limitations: ["Synthetic browser observations cover the retained candidate routes only."] } });
    current = refreshed.record;
    current = await withImportLease(root, record.importId, async () => { await saveImport(root, current); return current; });
    const currentPresentationRef = current.evidenceRefs!.presentation!;
    const replacement = workflowEvidenceSchema.parse(await readEvidence(root, currentPresentationRef));
    const currentObservationRef = replacement.ruleResults.find((result) => result.ruleId === "mobile")!.evidenceRefs[0];
    const ordinaryCurrentReviewRef = replacement.ruleResults.find((result) => result.ruleId === "critique")!.evidenceRefs[0];
    const targetViewport = await validateExecutionEvidence(root, currentObservationRef);
    assert.equal(targetViewport.kind, "browser");
    const replacementSubmissionDigest = await canonicalSubmissionFingerprint(current, root);
    const measurementChange = { aspect: "viewport" as const, from: JSON.stringify(sourceViewport.viewport), to: JSON.stringify(targetViewport.viewport), justification };
    const remedy = await storeEvidence(root, record.importId, { schemaVersion: "RemedyVerificationEvidenceV1", importId: record.importId, sourceFingerprint: record.sourceFingerprint, stage: current.stage, failedSubmissionDigest: current.continuation.submittedFingerprint!, replacementSubmissionDigest, criterion: { id: "presentation-evidence", revision: WORKFLOW_REVISION }, validatedEvidenceRef: currentPresentationRef, checkedAt: new Date().toISOString() });
    const independent = await storeEvidence(root, record.importId, {
      schemaVersion: "RemedyMeasurementVerificationV1", verificationKind: "presentation-viewport", importId: record.importId, sourceFingerprint: record.sourceFingerprint,
      stage: current.stage, failedSubmissionDigest: current.continuation.submittedFingerprint!, replacementSubmissionDigest,
      criterion: { id: "mobile", reviewRule: "critique", revision: WORKFLOW_REVISION }, previousPresentationRef, currentPresentationRef,
      previousObservationRef, currentObservationRef, reviewExecutionRef: refreshed.measurementReviewRef,
      sourceViewport: sourceViewport.viewport, targetViewport: targetViewport.viewport, reviewLimitations: ["Synthetic browser observations cover the retained candidate routes only."], measurementChange, checkedAt: new Date().toISOString(),
    });
    const ordinaryReviewOnly = await storeEvidence(root, record.importId, { ...(await readEvidence(root, independent) as object), reviewExecutionRef: ordinaryCurrentReviewRef });
    const diagnosis = {
      schemaVersion: "DiagnosisV1",
      importId: record.importId,
      sourceFingerprint: record.sourceFingerprint,
      stage: current.stage,
      failedSubmissionDigest: current.continuation.submittedFingerprint,
      replacementSubmissionDigest,
      failureCode: "SYNTHETIC_MEASUREMENT_REPAIR",
      cause: "The mobile presentation criterion was evaluated at the wrong retained viewport.",
      predictedObservation: "The replacement presentation passes at the independently reviewed target viewport.",
      disproofCheck: "Re-run the bound mobile observation and independent critique; a mismatch disproves the diagnosis.",
      attemptedRecoveryRefs: [previousPresentationRef],
      remedyEvidenceRefs: [remedy],
      createdAt: new Date().toISOString(),
    };

    await assert.rejects(submitImportDiagnosis(root, record.importId, {
      ...diagnosis,
      repairChange: { kind: "measurement-change", aspect: "viewport", from: measurementChange.from, to: measurementChange.to },
    }));
    await assert.rejects(submitImportDiagnosis(root, record.importId, {
      ...diagnosis,
      repairChange: { kind: "measurement-change", ...measurementChange, independentVerificationRef: remedy },
    }), /Measurement verification must be independent/);
    await assert.rejects(submitImportDiagnosis(root, record.importId, { ...diagnosis, repairChange: { kind: "product-repair", changedInputs: ["presentation viewport configuration"] } }), /DIAGNOSIS_MEASUREMENT_CHANGE_UNDECLARED/);
    await assert.rejects(submitImportDiagnosis(root, record.importId, { ...diagnosis, repairChange: { kind: "measurement-change", ...measurementChange, independentVerificationRef: ordinaryReviewOnly } }), /DIAGNOSIS_MEASUREMENT_REVIEW_REQUIRED/);
    await assert.rejects(submitImportDiagnosis(root, record.importId, {
      ...diagnosis,
      repairChange: { kind: "measurement-change", aspect: "threshold", from: "900", to: "1", justification, independentVerificationRef: independent },
    }), /DIAGNOSIS_MEASUREMENT_VERIFICATION_MISMATCH/);
    const contradicted = await storeEvidence(root, record.importId, { ...(await readEvidence(root, independent) as object), targetViewport: { width: 320, height: 900, reducedMotion: false } });
    await assert.rejects(submitImportDiagnosis(root, record.importId, { ...diagnosis, repairChange: { kind: "measurement-change", ...measurementChange, independentVerificationRef: contradicted } }), /DIAGNOSIS_MEASUREMENT_VIEWPORT_CONTRADICTED/);
    await submitImportDiagnosis(root, record.importId, {
      ...diagnosis,
      repairChange: { kind: "measurement-change", ...measurementChange, independentVerificationRef: independent },
    });
    const saved = await loadImport(root, record.importId);
    assert.equal(saved.diagnoses?.at(-1)?.repairChange?.kind, "measurement-change");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("tracking threshold correction uses pending V3 runtime evidence and the producer-retained failed check", async () => {
  const { root, record } = await fixture();
  try {
    let current = { ...record, stage: "REFINING" as const, format: "direct-review" as const };
    current = await withImportLease(root, record.importId, async () => { await saveImport(root, current); return current; });
    current = await approveFixture(root, current);
    current = await attachSyntheticHero(root, current);
    const priorFixture = await v3Presentation(root, current);
    current = { ...current, stage: "VALIDATING" as const, evidenceRefs: { ...current.evidenceRefs, research: priorFixture.research, transformAssessment: priorFixture.transformAssessment, assessment: priorFixture.assessment, editorial: priorFixture.editorial, presentation: priorFixture.presentation } };
    current = await withImportLease(root, record.importId, async () => { await saveImport(root, current); return current; });
    const directory = `.automation/article-imports/work/${record.importId}`;
    const workPath = `${directory}/tracking.work.json`, resultPath = `${directory}/tracking.result.json`;
    await mkdir(path.join(root, directory), { recursive: true });
    const idempotencyKey = importPacketId(current, "VALIDATING", "targeted-repair");
    current = await withImportLease(root, record.importId, async () => {
      const pending = { ...current, continuation: { kind: "work" as const, stage: "VALIDATING" as const, workPath, resultPath, idempotencyKey, sourceFingerprint: current.sourceFingerprint } };
      await saveImport(root, pending); return pending;
    });
    await writeFile(path.join(root, resultPath), JSON.stringify({ idempotencyKey, sourceFingerprint: current.sourceFingerprint, summary: "Historical tracking checker rejected.", work: { stage: "VALIDATING", presentationEvidencePath: priorFixture.presentation.path } }));
    for (let attempt = 0; attempt < 3; attempt++) {
      current = await withImportLease(root, record.importId, async () => {
        const changed = { ...current, transformation: { ...current.transformation!, title: `Tracking checker attempt ${attempt}` } };
        await saveImport(root, changed); return changed;
      });
      current = await executePendingImport(root, record.importId, async ({ record: pending }) => {
        const presentation = workflowEvidenceSchema.parse(await readEvidence(root, pending.evidenceRefs!.presentation!));
        const execution = await validateExecutionEvidence(root, presentation.ruleResults.find((result) => result.ruleId === "desktop")!.evidenceRefs[0]);
        if (execution.kind !== "browser") throw new Error("Expected browser runtime evidence.");
        validateArticleVisualRuntime(await readEvidence(root, execution.outputRefs[0]), "historical-pre-craft-floor");
        return pending;
      });
    }
    assert.ok(current.continuation?.kind === "repair");
    assert.equal(current.continuation.failedCheck?.code, "TYPOGRAPHY_TRACKING_FLOOR");
    assert.equal(current.continuation.failedCheck?.settings?.criterionFloor, "-0.4em");
    assert.equal(current.continuation.failedWork?.resultPath, resultPath);
    const previousPresentationRef = current.evidenceRefs!.presentation!;
    const previous = workflowEvidenceSchema.parse(await readEvidence(root, previousPresentationRef));
    const previousObservationRef = previous.ruleResults.find((result) => result.ruleId === "desktop")!.evidenceRefs[0];
    const justification = "The checker threshold is corrected to the pinned craft-floor floor while the computed heading tracking remains a separate observed value.";
    const replacementRecord = { ...current, transformation: { ...current.transformation!, title: "Tracking threshold replacement" } };
    const replacementFixture = await v3Presentation(root, replacementRecord, { trackingOverride: "-0.03em", remedyTrackingReview: { previousObservationRef, sourceComputedValue: "-0.03125em", targetComputedValue: "-0.03em", sourceCriterionFloor: "-0.4em", justification, limitations: ["The judgment covers the bound heading tracking observation and does not relax other typography criteria."] } });
    await writeFile(path.join(root, resultPath), JSON.stringify({ idempotencyKey, sourceFingerprint: current.sourceFingerprint, summary: "Corrected tracking checker and replacement presentation.", work: { stage: "VALIDATING", presentationEvidencePath: replacementFixture.presentation.path } }));
    current = await withImportLease(root, record.importId, async () => { await saveImport(root, replacementRecord); return replacementRecord; });
    const replacement = workflowEvidenceSchema.parse(await readEvidence(root, replacementFixture.presentation));
    const currentObservationRef = replacement.ruleResults.find((result) => result.ruleId === "desktop")!.evidenceRefs[0];
    const currentObservation = await validateExecutionEvidence(root, currentObservationRef);
    assert.equal(currentObservation.kind, "browser");
    const authorityInstructionRef = await evidenceReference(root, ".agents/skills/impeccable/reference/craft-floor.md");
    const failedSubmissionDigest = current.continuation!.kind === "repair" ? current.continuation.submittedFingerprint! : "";
    const replacementSubmissionDigest = await canonicalSubmissionFingerprint(current, root);
    const remedy = await storeEvidence(root, record.importId, { schemaVersion: "RemedyVerificationEvidenceV1", importId: record.importId, sourceFingerprint: record.sourceFingerprint, stage: current.stage, failedSubmissionDigest, replacementSubmissionDigest, criterion: { id: "presentation-evidence", revision: WORKFLOW_REVISION }, validatedEvidenceRef: replacementFixture.presentation, checkedAt: new Date().toISOString() });
    const change = { aspect: "threshold" as const, from: "-0.4em", to: "-0.04em", justification };
    const independent = await storeEvidence(root, record.importId, { schemaVersion: "RemedyMeasurementVerificationV1", verificationKind: "typography-tracking-threshold", importId: record.importId, sourceFingerprint: record.sourceFingerprint, stage: current.stage, failedSubmissionDigest, replacementSubmissionDigest, criterion: { id: "typography.heading.letterSpacing", stableAuthorityId: "D04-S-a2bbcd69b901", observationRule: "desktop", reviewRule: "critique", revision: WORKFLOW_REVISION }, authorityInstructionRef, previousPresentationRef, currentPresentationRef: replacementFixture.presentation, previousObservationRef, currentObservationRef, reviewExecutionRef: replacementFixture.remedyTrackingReview, sourceComputedValue: "-0.03125em", targetComputedValue: "-0.03em", sourceCriterionFloor: "-0.4em", criterionFloor: "-0.04em", reviewLimitations: ["The judgment covers the bound heading tracking observation and does not relax other typography criteria."], measurementChange: change, checkedAt: new Date().toISOString() });
    const supporting = await storeEvidence(root, record.importId, { observation: "The old checker used -0.4em while the computed style was independently retained." });
    await submitImportDiagnosis(root, record.importId, { schemaVersion: "DiagnosisV1", importId: record.importId, sourceFingerprint: record.sourceFingerprint, stage: current.stage, failedSubmissionDigest, replacementSubmissionDigest, failureCode: "TRACKING_THRESHOLD_INCORRECT", cause: "The producer-retained checker revision did not match the pinned craft-floor authority.", predictedObservation: "The approved floor and computed style are evaluated separately on the pending V3 replacement.", disproofCheck: "Reject if the authority hash, computed observations, pending presentation or independent review do not bind.", attemptedRecoveryRefs: [previousPresentationRef, supporting], remedyEvidenceRefs: [remedy], repairChange: { kind: "measurement-change", ...change, independentVerificationRef: independent }, createdAt: new Date().toISOString() });
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
