import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import {
  advanceImport,
  approveImportContent,
  canonicalSubmissionFingerprint,
  createArticleImport,
  executePendingImport,
  loadImport,
  writeJsonAtomically,
} from "../../../../src/lib/article-import/engine";
import type { ExternalArticleImportV1 } from "../../../../src/lib/article-import/contracts";
import { fingerprintEditorialArtifact } from "../../../../src/lib/editorial/refinement";
import { executionEvidenceSchema, extractOpenCodeExecution, proseProjectionDigest, storeEvidence } from "../../../../src/lib/article-import/execution-evidence";
import { createSupervisedImportExecutor } from "../../../../src/lib/article-import/supervised-executor";
import { readEvidence, workflowEvidenceSchema } from "../../../../src/lib/article-import/workflow-evidence";
import { prepareApprovalFixture, preparePresentationFixture } from "../../../../tests/fixtures/article-content-approval";

const evidenceDirectory = path.dirname(fileURLToPath(import.meta.url));
const fixtureParent = path.resolve(".scratch/recovery-99");
const investigatedRevision = "f026bca8b53aecca829262e9a27820ac6d078892";
const findingDescription = "The primary CTA does not describe its affiliate destination.";

type Finding = { description: string; disposition: "resolved" | "unresolved"; [key: string]: unknown };
type ReviewPatch = {
  verdict: "pass" | "fail" | "insufficient-evidence";
  findings: Finding[];
  extra?: Record<string, unknown>;
};

type ScenarioName = "omitted" | "resolved-label" | "inconclusive" | "appropriate-removal" | "evidenced-dismissal" | "owner-referral";

async function fixture() {
  await mkdir(fixtureParent, { recursive: true });
  const root = await mkdtemp(path.join(fixtureParent, "case-"));
  await writeFile(path.join(root, "approved-urls.md"), "- https://start.switcherstudio.com/anme6fqvgdx9\n");
  await writeFile(path.join(root, "article.md"), [
    "---",
    "title: Synthetic review continuity probe",
    "affiliate_name: Switcher Studio",
    "affiliate_url: https://start.switcherstudio.com/anme6fqvgdx9",
    "---",
    "Synthetic source used only by the isolated controller probe.",
  ].join("\n"));
  const created = await createArticleImport(root, "article.md");
  const prepared = await prepareApprovalFixture(root, { ...created, stage: "REFINING" }, { currentPolicy: true });
  const { evidenceRefs, ...approvalFiles } = prepared;
  const approved = await approveImportContent(root, { ...created, stage: "REFINING", evidenceRefs }, approvalFiles);
  const validating = await advanceImport(root, approved, "Synthetic content approval complete.");
  return { root, record: validating };
}

async function dispose(root: string) {
  const relative = path.relative(fixtureParent, path.resolve(root));
  assert.ok(relative && !relative.startsWith("..") && !path.isAbsolute(relative));
  await rm(root, { recursive: true, force: true });
}

async function completeHeroHandoff(root: string, record: ExternalArticleImportV1) {
  if (record.continuation?.kind !== "work") throw new Error("Missing supervised hero handoff.");
  const packet = JSON.parse(await readFile(path.join(root, record.continuation.workPath), "utf8"));
  assert.equal(packet.supervisedHandoff, "chatgpt-imagegen");
  const bytes = await sharp({
    create: { width: 1600, height: 900, channels: 4, background: { r: 232, g: 221, b: 202, alpha: 1 } },
  }).png().toBuffer();
  await mkdir(path.dirname(path.join(root, packet.originalFile)), { recursive: true });
  await writeFile(path.join(root, packet.originalFile), bytes);
  const originalRef = { path: packet.originalFile, sha256: createHash("sha256").update(bytes).digest("hex") };
  const generatedAt = "2026-11-27T00:00:00.000Z";
  const toolCallId = "recovery-99-fixture-imagegen";
  const providerOutputRef = await storeEvidence(root, record.importId, {
    schemaVersion: "ArticleHeroProviderOutputV1",
    provider: "openai",
    tool: "chatgpt-imagegen",
    interface: "built-in",
    toolCallId,
    generatedAt,
    generatedImage: {
      providerAssetPath: "generated-image://recovery-99-fixture",
      originalSha256: originalRef.sha256,
      outputHint: "Synthetic retained fixture output; no provider was called.",
    },
  });
  const generationPath = `build-pack/article-import/${record.importId}/hero-generation.json`;
  await writeJsonAtomically(path.join(root, generationPath), {
    schemaVersion: "ArticleHeroGenerationEvidenceV1",
    importId: record.importId,
    sourceFingerprint: record.sourceFingerprint,
    format: packet.format,
    slug: packet.slug,
    artifactFingerprint: packet.artifactFingerprint,
    originalRef,
    alt: packet.alt,
    generation: {
      provider: "openai",
      tool: "chatgpt-imagegen",
      interface: "built-in",
      toolCallId,
      generatedAt,
      prompt: packet.prompt,
      promptSha256: packet.promptSha256,
      outputSha256: originalRef.sha256,
      providerOutputRef,
    },
  });
  await writeJsonAtomically(path.join(root, record.continuation.resultPath), {
    schemaVersion: "ArticleHeroImagegenResultV1",
    handoffFingerprint: packet.handoffFingerprint,
    idempotencyKey: record.continuation.idempotencyKey,
    sourceFingerprint: record.sourceFingerprint,
    summary: "Completed the synthetic hero handoff without an external operation.",
    work: { stage: "VALIDATING", heroGenerationEvidencePath: generationPath },
  });
}

async function withReview(root: string, record: ExternalArticleImportV1, patch: ReviewPatch, sessionId: string) {
  const prepared = await preparePresentationFixture(root, record);
  const originalRef = prepared.record.evidenceRefs!.presentation!;
  const manifest = workflowEvidenceSchema.parse(await readEvidence(root, originalRef));
  const rule = manifest.ruleResults.find((item) => item.ruleId === "context");
  if (!rule) throw new Error("Synthetic context review is missing.");
  const execution = executionEvidenceSchema.parse(await readEvidence(root, rule.evidenceRefs[0]));
  if (execution.kind !== "opencode" || !execution.replay) throw new Error("Expected replayable synthetic review execution.");
  const originalReview = JSON.parse(execution.output.designReview ?? "null");
  const review = { ...originalReview, verdict: patch.verdict, findings: patch.findings, ...(patch.extra ?? {}) };
  const output = { ...execution.output, designReview: JSON.stringify(review) };
  const selected = {
    version: execution.toolVersion,
    sessionId,
    userMessageId: execution.userMessageId,
    assistantMessageId: execution.assistantMessageId,
    packetId: execution.packetId,
    pass: execution.pass,
    input: execution.input,
    output,
    instructions: execution.instructions,
    families: { [`${execution.providerId}/${execution.modelId}`]: execution.family },
    inputRefs: execution.replay.inputRefs,
    outputRefs: execution.replay.outputRefs,
  };
  const captured = execution.toolVersion === "1.19.4"
    ? extractOpenCodeExecution({
      info: { id: sessionId },
      messages: [
        { info: { id: execution.userMessageId, role: "user", sessionID: sessionId }, parts: [{ type: "text", text: JSON.stringify({ packetId: execution.packetId, pass: execution.pass, prose: execution.input, digest: execution.inputDigest, instructions: execution.instructions }) }] },
        { info: { id: execution.assistantMessageId, role: "assistant", sessionID: sessionId, parentID: execution.userMessageId, providerID: execution.providerId, modelID: execution.modelId, time: { created: 1, completed: 2 }, finish: "stop" }, parts: [{ type: "text", text: JSON.stringify(output) }] },
      ],
    }, selected)
    : extractOpenCodeExecution({
      info: { id: sessionId, model: { providerID: execution.providerId, id: execution.modelId, variant: "default" }, outcome: "succeeded" },
      messages: [
        { id: execution.userMessageId, type: "user", text: JSON.stringify({ packetId: execution.packetId, pass: execution.pass, prose: execution.input, digest: execution.inputDigest, instructions: execution.instructions }), time: { created: 1 } },
        { id: execution.assistantMessageId, type: "assistant", model: { providerID: execution.providerId, id: execution.modelId, variant: "default" }, time: { created: 2, streamed: 3, completed: 4 }, finish: "stop", content: [{ type: "text", text: JSON.stringify(output) }] },
        { id: `${execution.assistantMessageId}-idle`, type: "idle", outcome: "succeeded", time: { created: 5 } },
      ],
    }, selected);
  assert.equal(captured.kind, "opencode");
  assert.equal(captured.outputDigest, proseProjectionDigest(output));
  const executionRef = await storeEvidence(root, record.importId, captured);
  rule.evidenceRefs = [executionRef];
  const presentationRef = await storeEvidence(root, record.importId, manifest);
  return {
    executionRef,
    presentationRef,
    validationReceipt: prepared.input.validationReceipt,
    review,
    reviewer: { kind: execution.kind, family: execution.family, sessionId },
    criterion: rule.ruleId,
    artifactRevision: originalReview.artifactFingerprint,
    renderingRevision: originalReview.renderingDigest,
  };
}

async function writeValidationResult(root: string, record: ExternalArticleImportV1, presentationPath: string, receipt: unknown) {
  if (record.continuation?.kind !== "work" || record.continuation.stage !== "VALIDATING") {
    throw new Error("Missing normal VALIDATING work packet.");
  }
  const receiptPath = `build-pack/article-import/${record.importId}/presentation-validation.json`;
  const boundReceipt = record.heroImage
    ? { ...(receipt as Record<string, unknown>), heroImageFingerprint: fingerprintEditorialArtifact(record.heroImage) }
    : receipt;
  await writeJsonAtomically(path.join(root, receiptPath), boundReceipt);
  await writeJsonAtomically(path.join(root, record.continuation.resultPath), {
    idempotencyKey: record.continuation.idempotencyKey,
    sourceFingerprint: record.sourceFingerprint,
    summary: "Submitted a synthetic presentation judgment through the normal controller packet.",
    work: {
      stage: "VALIDATING",
      validationGate: "fixture:rendered-layout",
      validationReceiptPath: receiptPath,
      presentationEvidencePath: presentationPath,
    },
  });
}

async function reachRejectedRepair(root: string, initial: ExternalArticleImportV1, scenario: ScenarioName) {
  const executor = createSupervisedImportExecutor(root);
  let current = await executePendingImport(root, initial.importId, executor);
  await completeHeroHandoff(root, current);
  current = await executePendingImport(root, initial.importId, executor);
  current = await executePendingImport(root, initial.importId, executor);
  assert.equal(current.continuation?.kind, "work");
  const rejectedReview = await withReview(root, current, {
    verdict: "fail",
    findings: [{ description: findingDescription, disposition: "unresolved" }],
  }, "recovery-99-original-reviewer");
  const replacementReview = await withReview(root, current, replacementPatch(scenario), `recovery-99-${scenario}-reviewer`);
  const workPath = current.continuation.kind === "work" ? current.continuation.workPath : "";
  const resultPath = current.continuation.kind === "work" ? current.continuation.resultPath : "";
  const packetBeforeRejection = JSON.parse(await readFile(path.join(root, workPath), "utf8"));
  await writeValidationResult(root, current, rejectedReview.presentationRef.path, rejectedReview.validationReceipt);
  const failed = await executePendingImport(root, initial.importId, executor);
  assert.equal(failed.continuation?.kind, "repair");
  const fingerprintBeforeUnchanged = await canonicalSubmissionFingerprint(failed, root);
  let unchangedError = "";
  try {
    await executePendingImport(root, initial.importId, executor);
  } catch (error) {
    unchangedError = error instanceof Error ? error.message : String(error);
  }
  assert.match(unchangedError, /UNCHANGED_SUBMISSION/);
  return {
    executor,
    failed,
    rejectedReview,
    replacementReview,
    packetBeforeRejection,
    workPath,
    resultPath,
    fingerprintBeforeUnchanged,
    unchangedError,
  };
}

function replacementPatch(name: ScenarioName): ReviewPatch {
  switch (name) {
    case "omitted":
      return { verdict: "pass", findings: [] };
    case "resolved-label":
      return { verdict: "pass", findings: [{ description: findingDescription, disposition: "resolved" }] };
    case "inconclusive":
      return { verdict: "insufficient-evidence", findings: [{ description: "The changed rendering was not observed.", disposition: "unresolved" }] };
    case "appropriate-removal":
      return { verdict: "pass", findings: [], extra: { resolution: { type: "appropriate-removal", findingId: "finding-99-cta", evidenceRefs: [] } } };
    case "evidenced-dismissal":
      return { verdict: "pass", findings: [], extra: { resolution: { type: "evidenced-dismissal", findingId: "finding-99-cta", evidenceRefs: [{ path: "synthetic-dismissal.json", sha256: "0".repeat(64) }] } } };
    case "owner-referral":
      return { verdict: "fail", findings: [{ description: findingDescription, disposition: "unresolved" }], extra: { ownerReferral: { findingId: "finding-99-cta", reason: "The reviewer disputes whether the CTA capability is required." } } };
  }
}

async function runScenario(name: ScenarioName) {
  const { root, record } = await fixture();
  try {
    const rejected = await reachRejectedRepair(root, record, name);
    const approvalsBefore = {
      contentApproval: rejected.failed.contentApproval,
      research: rejected.failed.evidenceRefs?.research,
      assessment: rejected.failed.evidenceRefs?.assessment,
      editorial: rejected.failed.evidenceRefs?.editorial,
    };
    const replacement = rejected.replacementReview;
    const repairingRecord: ExternalArticleImportV1 = {
      ...rejected.failed,
      continuation: {
        kind: "work",
        stage: "VALIDATING",
        workPath: rejected.workPath,
        resultPath: rejected.resultPath,
        idempotencyKey: rejected.packetBeforeRejection.idempotencyKey,
        sourceFingerprint: rejected.failed.sourceFingerprint,
      },
    };
    await writeValidationResult(root, repairingRecord, replacement.presentationRef.path, replacement.validationReceipt);
    const fingerprintAfterReplacement = await canonicalSubmissionFingerprint(rejected.failed, root);
    assert.notEqual(fingerprintAfterReplacement, rejected.fingerprintBeforeUnchanged);
    const result = await executePendingImport(root, record.importId, rejected.executor);
    const persisted = await loadImport(root, record.importId);
    const approvalsAfter = {
      contentApproval: persisted.contentApproval,
      research: persisted.evidenceRefs?.research,
      assessment: persisted.evidenceRefs?.assessment,
      editorial: persisted.evidenceRefs?.editorial,
    };
    const originalEvidence = await readEvidence(root, rejected.rejectedReview.executionRef);
    return {
      scenario: name,
      expected: {
        originalFindingRemainsOpenUntilIndependentResolution: true,
        changedRevisionAndDirectRegressionsRequired: true,
        removalOrDismissalRequiresTypedEvidence: ["appropriate-removal", "evidenced-dismissal"].includes(name),
        inconclusiveRemainsOpen: name === "inconclusive",
        disputeReachesOwnerAndStaysOpen: name === "owner-referral",
      },
      observed: {
        stage: result.stage,
        continuation: result.continuation ?? null,
        lastReceipt: result.stageReceipts.at(-1),
        unchangedResubmissionError: rejected.unchangedError,
        originalFindingBytesRetained: JSON.stringify(originalEvidence).includes(findingDescription),
        replacementOmitsOriginalFinding: !JSON.stringify(replacement.review).includes(findingDescription),
        sameArtifactRevision: replacement.artifactRevision === rejected.rejectedReview.artifactRevision,
        sameRenderingRevision: replacement.renderingRevision === rejected.rejectedReview.renderingRevision,
        approvalsSurvived: JSON.stringify(approvalsBefore) === JSON.stringify(approvalsAfter),
        repairContinuation: rejected.failed.continuation,
        freshRepairPacketDispatched: false,
        reusedPacketIdentity: rejected.packetBeforeRejection.idempotencyKey,
        originalReview: {
          reviewer: rejected.rejectedReview.reviewer,
          criterion: rejected.rejectedReview.criterion,
          artifactRevision: rejected.rejectedReview.artifactRevision,
          renderingRevision: rejected.rejectedReview.renderingRevision,
          observation: findingDescription,
          findingIdentity: null,
        },
        replacementReview: {
          reviewer: replacement.reviewer,
          criterion: replacement.criterion,
          artifactRevision: replacement.artifactRevision,
          renderingRevision: replacement.renderingRevision,
          supplied: replacement.review,
          linkedFindingIdentity: null,
        },
      },
    };
  } finally {
    await dispose(root);
  }
}

async function main() {
  const scenarios = [];
  const requestedScenario = process.argv.find((argument) => argument.startsWith("--scenario="))?.slice("--scenario=".length) as ScenarioName | undefined;
  const names = ["omitted", "resolved-label", "inconclusive", "appropriate-removal", "evidenced-dismissal", "owner-referral"] as const;
  const selectedNames = requestedScenario
    ? names.filter((candidate) => candidate === requestedScenario)
    : process.argv.includes("--assert-required") ? names.slice(0, 2) : names;
  for (const name of selectedNames) {
    scenarios.push(await runScenario(name));
  }
  const observations = {
    schemaVersion: "RejectedFindingRecoveryEvidence99V1",
    investigatedRevision,
    generatedAt: new Date().toISOString(),
    syntheticOnly: true,
    normalEntryPoint: "executePendingImport(createSupervisedImportExecutor(root))",
    findingExpectation: {
      findingId: "finding-99-cta",
      owningActivity: "VALIDATING/context design review",
      inputToChange: "the exact rendered revision that produced the CTA observation",
      expectedCheck: "fresh independent review of the original observation and directly affected CTA regressions",
    },
    scenarios,
  };
  await writeFile(path.join(evidenceDirectory, "observations.json"), JSON.stringify(observations, null, 2) + "\n");
  if (process.argv.includes("--assert-required")) {
    const omitted = scenarios.find((scenario) => scenario.scenario === "omitted")!;
    assert.notEqual(omitted.observed.stage, "RELEASING", "a passing replacement that omits the finding must not close it");
    const resolved = scenarios.find((scenario) => scenario.scenario === "resolved-label")!;
    assert.notEqual(resolved.observed.stage, "RELEASING", "a bare resolved label without resolution evidence must not advance");
  }
  process.stdout.write(JSON.stringify({ ok: true, observations: path.join(evidenceDirectory, "observations.json") }) + "\n");
}

main().catch(async (error) => {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  if (process.argv.includes("--assert-required")) await writeFile(path.join(evidenceDirectory, "red-output.txt"), message + "\n");
  console.error(message);
  process.exitCode = 1;
});
