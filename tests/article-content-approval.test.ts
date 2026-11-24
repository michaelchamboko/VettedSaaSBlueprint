import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { advanceImport, createArticleImport, ensureImportContentApproval, loadImport, recordImportFailure, resumeImport } from "../src/lib/article-import/engine";
import { approveFixture, presentFixture } from "./fixtures/article-content-approval";
import { recaptureStoredExchange } from "./fixtures/capture-replay";
import type { ExecutionEvidence } from "../src/lib/article-import/execution-evidence";

async function setup() {
  const root = await mkdtemp(path.join(os.tmpdir(), "content-approval-"));
  await writeFile(path.join(root, "approved-urls.md"), "- https://start.switcherstudio.com/anme6fqvgdx9\n");
  await writeFile(path.join(root, "article.md"), "---\ntitle: Example\naffiliate_name: Example\naffiliate_url: https://start.switcherstudio.com/anme6fqvgdx9\n---\nAn article with enough text to qualify as useful source content for the import pipeline and its approval tests.");
  const initial = await createArticleImport(root, "article.md");
  // Arrange a synthetic stage boundary; advancing real work requires producer evidence.
  return { root, record: { ...initial, stage: "REFINING" as const } };
}

test("imports cannot enter presentation without the mandatory evidence chain", async () => {
  const { root, record } = await setup();
  try {
    await assert.rejects(advanceImport(root, record, "No evidence"), /WORKFLOW_EVIDENCE_INVALID/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

for (const target of ["artifactPath", "editorialEvidencePath", "formatQualityPath"] as const) {
  test(`tampering with ${target} returns to refinement`, async () => {
    const { root, record } = await setup();
    try {
      const approved = await approveFixture(root, record);
      const validating = await advanceImport(root, approved, "Approved content");
      assert.equal(validating.stage, "VALIDATING");
      const file = path.join(root, approved.contentApproval![target]);
      const value = JSON.parse(await readFile(file, "utf8"));
      if (target === "artifactPath") value.hero.headline = "Changed wording that has not been reviewed";
      else if (target === "editorialEvidencePath") value.semanticNotes = "Changed review notes after content approval.";
      else value.gate = "another-gate";
      await writeFile(file, JSON.stringify(value));
      if (target === "formatQualityPath") {
        assert.equal((await advanceImport(root, validating, "Ready to release")).stage, "REFINING");
        assert.equal((await loadImport(root, record.importId)).contentApproval, undefined);
      } else {
        await assert.rejects(advanceImport(root, validating, "Ready to release"), /WORKFLOW_EVIDENCE_INVALID/);
        assert.equal((await loadImport(root, record.importId)).stage, "VALIDATING");
      }
    } finally { await rm(root, { recursive: true, force: true }); }
  });
}

test("presentation repair preserves approval, but source identity and artifact substitution do not", async () => {
  const { root, record } = await setup();
  try {
    const approved = await approveFixture(root, record);
    const validating = await advanceImport(root, approved, "Approved content");
    const repair = await recordImportFailure(root, validating, { strategy: "validate", classification: "deterministic", message: "Mobile layout repair required." });
    const resumed = await resumeImport(root, repair);
    assert.equal(resumed.stage, "VALIDATING");
    assert.deepEqual(resumed.contentApproval, approved.contentApproval);
    // The first invalidation writes a new revision. The prior snapshot must be rejected.
    const invalidated = await ensureImportContentApproval(root, { ...resumed, sourceFingerprint: "a".repeat(64) });
    assert.equal(invalidated.stage, "REFINING");
    await assert.rejects(ensureImportContentApproval(root, resumed, "replacement.json"), /STALE_IMPORT_RECORD/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("an artifact substitution requires fresh content approval", async () => {
  const { root, record } = await setup();
  try {
    const approved = await approveFixture(root, record);
    const validating = await advanceImport(root, approved, "Approved content");
    await writeFile(path.join(root, "replacement.json"), await readFile(path.join(root, approved.contentApproval!.artifactPath)));
    assert.equal((await ensureImportContentApproval(root, validating, "replacement.json")).stage, "REFINING");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("invalid legacy receipts remain diagnostic and reads never silently migrate them", async () => {
  const { root, record } = await setup();
  try {
    const approved = await approveFixture(root, record);
    const presented = await presentFixture(root, await advanceImport(root, approved, "Approved content"));
    const legacy = { ...presented, schemaVersion: "ExternalArticleImportV1", workflowVersion: undefined, requirementRevision: undefined, stage: "RELEASING", resumeStage: "RELEASING", presentation: { ...presented.presentation!, evidenceFiles: undefined },
      pendingRelease: { schemaVersion: "ImportPendingReleaseV1", reviewedCommitSha: "a".repeat(40), branch: "codex/article-import/example", createdAt: new Date().toISOString() },
      release: { schemaVersion: "ImportReleaseV1", commitSha: "a".repeat(40), deploymentId: "legacy-deployment", canonicalUrl: "https://vettedsaasblueprint.online/imported-guide", verifiedAt: new Date().toISOString(), checks: { routeOk: true, contentOk: true, disclosureOk: true, exactCtaOk: true, desktopOk: true, mobileOk: true, robotsOk: true, sitemapOk: true, browserErrorsOk: true } },
    };
    const statePath = path.join(root, ".automation/article-imports", `${record.importId}.json`);
    await writeFile(statePath, JSON.stringify(legacy));
    const loaded = await loadImport(root, record.importId);
    assert.equal(loaded.presentation, undefined);
    assert.deepEqual(loaded.contentApproval, approved.contentApproval);
    assert.ok(loaded.legacyDiagnostics?.includes("INVALID_LEGACY_EVIDENCE:presentation"));
    await assert.rejects(resumeImport(root, loaded), /LEGACY_UPGRADE_REQUIRED/);
    assert.equal(await readFile(statePath, "utf8"), JSON.stringify(legacy));
    await writeFile(statePath, JSON.stringify({ ...legacy, presentation: { invalid: true } }));
    assert.equal((await loadImport(root, record.importId)).presentation, undefined);
  } finally { await rm(root, { recursive: true, force: true }); }
});
async function reviewOutcomeFileList(root: string): Promise<string[]> {
  const { readdir } = await import("node:fs/promises");
  const path = await import("node:path");
  const out = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      // Writer acquisition and release append lease generations even for rejected mutations.
      if (full === path.join(root, ".automation/article-imports/leases")) continue;
      if (entry.isDirectory()) await walk(full);
      else out.push(path.relative(root, full));
    }
  }
  await walk(root);
  return out.sort();
}

test("positive presented fixture evaluates through releasing", async () => {
  const { root, record } = await setup();
  try {
    const approved = await approveFixture(root, record);
    const validating = await advanceImport(root, approved, "Approved content");
    const presented = await presentFixture(root, validating);
    const { evaluateWorkflowEvidence } = await import("../src/lib/article-import/workflow-evidence");
    const result = await evaluateWorkflowEvidence(presented, { root, throughStage: "RELEASING" });
    assert.deepEqual(result.diagnostics, []);
    assert.equal(result.ok, true);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("advanceImport rejects fail design review through evaluateWorkflowEvidence and leaves state unchanged", async () => {
  const { root, record } = await setup();
  try {
    const approved = await approveFixture(root, record);
    const validating = await advanceImport(root, approved, "Approved content");
    const presented = await presentFixture(root, validating);
    const { readEvidence, storeEvidence, workflowEvidenceSchema, evaluateWorkflowEvidence } = await import("../src/lib/article-import/workflow-evidence");
    const { executionEvidenceSchema, proseProjectionDigest } = await import("../src/lib/article-import/execution-evidence");
    const presentation = workflowEvidenceSchema.parse(await readEvidence(root, presented.evidenceRefs!.presentation!));
    const rule = presentation.ruleResults.find((item) => item.ruleId === "context")!;
    const execution = executionEvidenceSchema.parse(await readEvidence(root, rule.evidenceRefs[0]));
    if (execution.kind !== "opencode") throw new Error("Expected fixture model execution");
    const review = JSON.parse(execution.output.designReview ?? "null");
    const negative = { ...review, verdict: "fail", findings: [{ description: "Synthetic design failure.", disposition: "unresolved" }] };
    const negativeOutput = { ...execution.output, designReview: JSON.stringify(negative) };
    const newExecution = await storeEvidence(root, presented.importId, recaptureStoredExchange({ ...execution, output: negativeOutput, outputDigest: proseProjectionDigest(negativeOutput) }, execution.replay!.inputRefs, execution.replay!.outputRefs));
    rule.evidenceRefs = [newExecution];
    const newPresentation = await storeEvidence(root, presented.importId, presentation);
    const mutatedRecord = { ...presented, evidenceRefs: { ...presented.evidenceRefs, presentation: newPresentation } };
    const evalResult = await evaluateWorkflowEvidence(mutatedRecord, { root, throughStage: "RELEASING" });
    assert.equal(evalResult.ok, false);
    assert.match(evalResult.diagnostics.join(";"), /PRESENTATION_DESIGN_REVIEW_VERDICT_NOT_PASS/);
    const statePath = path.join(root, ".automation", "article-imports", `${record.importId}.json`);
    const beforeBytes = await readFile(statePath);
    const beforeInventory = await reviewOutcomeFileList(root);
    await assert.rejects(advanceImport(root, mutatedRecord, "Ready to release"), /WORKFLOW_EVIDENCE_INVALID/);
    const afterBytes = await readFile(statePath);
    assert.equal(afterBytes.toString(), beforeBytes.toString());
    const afterInventory = await reviewOutcomeFileList(root);
    assert.deepEqual(afterInventory, beforeInventory);
    assert.equal(mutatedRecord.stage, "VALIDATING");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("advanceImport rejects insufficient-evidence design review through evaluateWorkflowEvidence and leaves state unchanged", async () => {
  const { root, record } = await setup();
  try {
    const approved = await approveFixture(root, record);
    const validating = await advanceImport(root, approved, "Approved content");
    const presented = await presentFixture(root, validating);
    const { readEvidence, storeEvidence, workflowEvidenceSchema, evaluateWorkflowEvidence } = await import("../src/lib/article-import/workflow-evidence");
    const { executionEvidenceSchema, proseProjectionDigest } = await import("../src/lib/article-import/execution-evidence");
    const presentation = workflowEvidenceSchema.parse(await readEvidence(root, presented.evidenceRefs!.presentation!));
    const rule = presentation.ruleResults.find((item) => item.ruleId === "context")!;
    const execution = executionEvidenceSchema.parse(await readEvidence(root, rule.evidenceRefs[0]));
    if (execution.kind !== "opencode") throw new Error("Expected fixture model execution");
    const review = JSON.parse(execution.output.designReview ?? "null");
    const negative = { ...review, verdict: "insufficient-evidence", findings: [{ description: "Missing runtime observation.", disposition: "unresolved" }] };
    const negativeOutput = { ...execution.output, designReview: JSON.stringify(negative) };
    const newExecution = await storeEvidence(root, presented.importId, recaptureStoredExchange({ ...execution, output: negativeOutput, outputDigest: proseProjectionDigest(negativeOutput) }, execution.replay!.inputRefs, execution.replay!.outputRefs));
    rule.evidenceRefs = [newExecution];
    const newPresentation = await storeEvidence(root, presented.importId, presentation);
    const mutatedRecord = { ...presented, evidenceRefs: { ...presented.evidenceRefs, presentation: newPresentation } };
    const evalResult = await evaluateWorkflowEvidence(mutatedRecord, { root, throughStage: "RELEASING" });
    assert.equal(evalResult.ok, false);
    assert.match(evalResult.diagnostics.join(";"), /PRESENTATION_DESIGN_REVIEW_VERDICT_NOT_PASS/);
    const statePath = path.join(root, ".automation", "article-imports", `${record.importId}.json`);
    const beforeBytes = await readFile(statePath);
    const beforeInventory = await reviewOutcomeFileList(root);
    await assert.rejects(advanceImport(root, mutatedRecord, "Ready to release"), /WORKFLOW_EVIDENCE_INVALID/);
    const afterBytes = await readFile(statePath);
    assert.equal(afterBytes.toString(), beforeBytes.toString());
    const afterInventory = await reviewOutcomeFileList(root);
    assert.deepEqual(afterInventory, beforeInventory);
    assert.equal(mutatedRecord.stage, "VALIDATING");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("advanceImport rejects pass design review with unresolved findings through evaluateWorkflowEvidence and leaves state unchanged", async () => {
  const { root, record } = await setup();
  try {
    const approved = await approveFixture(root, record);
    const validating = await advanceImport(root, approved, "Approved content");
    const presented = await presentFixture(root, validating);
    const { readEvidence, storeEvidence, workflowEvidenceSchema, evaluateWorkflowEvidence } = await import("../src/lib/article-import/workflow-evidence");
    const { executionEvidenceSchema, proseProjectionDigest } = await import("../src/lib/article-import/execution-evidence");
    const presentation = workflowEvidenceSchema.parse(await readEvidence(root, presented.evidenceRefs!.presentation!));
    const rule = presentation.ruleResults.find((item) => item.ruleId === "context")!;
    const execution = executionEvidenceSchema.parse(await readEvidence(root, rule.evidenceRefs[0]));
    if (execution.kind !== "opencode") throw new Error("Expected fixture model execution");
    const review = JSON.parse(execution.output.designReview ?? "null");
    const mixed = { ...review, verdict: "pass", findings: [{ description: "Unresolved issue.", disposition: "unresolved" }] };
    const mixedOutput = { ...execution.output, designReview: JSON.stringify(mixed) };
    const newExecution = await storeEvidence(root, presented.importId, recaptureStoredExchange({ ...execution, output: mixedOutput, outputDigest: proseProjectionDigest(mixedOutput) }, execution.replay!.inputRefs, execution.replay!.outputRefs));
    rule.evidenceRefs = [newExecution];
    const newPresentation = await storeEvidence(root, presented.importId, presentation);
    const mutatedRecord = { ...presented, evidenceRefs: { ...presented.evidenceRefs, presentation: newPresentation } };
    const evalResult = await evaluateWorkflowEvidence(mutatedRecord, { root, throughStage: "RELEASING" });
    assert.equal(evalResult.ok, false);
    assert.match(evalResult.diagnostics.join(";"), /PRESENTATION_DESIGN_REVIEW_UNRESOLVED_FINDING/);
    const statePath = path.join(root, ".automation", "article-imports", `${record.importId}.json`);
    const beforeBytes = await readFile(statePath);
    const beforeInventory = await reviewOutcomeFileList(root);
    await assert.rejects(advanceImport(root, mutatedRecord, "Ready to release"), /WORKFLOW_EVIDENCE_INVALID/);
    const afterBytes = await readFile(statePath);
    assert.equal(afterBytes.toString(), beforeBytes.toString());
    const afterInventory = await reviewOutcomeFileList(root);
    assert.deepEqual(afterInventory, beforeInventory);
    assert.equal(mutatedRecord.stage, "VALIDATING");
  } finally { await rm(root, { recursive: true, force: true }); }
});

type SyntheticExecution = Extract<ExecutionEvidence, { kind: "opencode" }>;
for (const scenario of [
  {
    name: "missing replay",
    diagnostic: /EXECUTION_REPLAY_MISSING/,
    mutate: (execution: SyntheticExecution): SyntheticExecution => {
      const { replay: _replay, ...rest } = execution;
      void _replay;
      return rest as SyntheticExecution;
    },
  },
  {
    name: "source wrapper",
    diagnostic: /SyntaxError|Unexpected token/,
    mutate: (execution: SyntheticExecution): SyntheticExecution => {
      const replayExport = execution.replay!.export as { messages: Array<{ parts: Array<{ text: string; [key: string]: unknown }>; [key: string]: unknown }>; [key: string]: unknown };
      const originalText = replayExport.messages[0].parts[0].text;
      const wrappedText = `Do not use any tools. Answer using the attached envelope. <file name="envelope.json">` + originalText + `</file>`;
      const messages = replayExport.messages.map((message, index) =>
        index === 0 ? { ...message, parts: [{ ...message.parts[0], text: wrappedText }] } : message,
      );
      return {
        ...execution,
        replay: {
          ...execution.replay!,
          export: { ...replayExport, messages },
        },
      } as SyntheticExecution;
    },
  },
  {
    name: "tampered answer",
    diagnostic: /EXECUTION_PROSE_MISMATCH/,
    mutate: (execution: SyntheticExecution): SyntheticExecution => execution,
  },
]) {
  test(`capture rejection integration: ${scenario.name}`, async () => {
    const { root, record } = await setup();
    try {
      const approved = await approveFixture(root, record);
      const validating = await advanceImport(root, approved, "Approved content");
      const presented = await presentFixture(root, validating);
      const { readEvidence, storeEvidence, workflowEvidenceSchema, evaluateWorkflowEvidence } = await import("../src/lib/article-import/workflow-evidence");
      const { executionEvidenceSchema, proseProjectionDigest } = await import("../src/lib/article-import/execution-evidence");
      const presentation = workflowEvidenceSchema.parse(await readEvidence(root, presented.evidenceRefs!.presentation!));
      const rule = presentation.ruleResults.find((item) => item.ruleId === "context")!;
      const execution = executionEvidenceSchema.parse(await readEvidence(root, rule.evidenceRefs[0]));
      if (execution.kind !== "opencode") throw new Error("Expected fixture model execution");
      let mutatedExecution: SyntheticExecution = execution;
      if (scenario.name === "tampered answer") {
        const tamperedOutput = { ...execution.output, designReview: JSON.stringify({ ...JSON.parse(execution.output.designReview ?? "null"), verdict: "fail" }) };
        mutatedExecution = { ...execution, output: tamperedOutput, outputDigest: proseProjectionDigest(tamperedOutput) };
      } else {
        mutatedExecution = scenario.mutate(execution);
      }
      const newExecution = await storeEvidence(root, presented.importId, mutatedExecution);
      rule.evidenceRefs = [newExecution];
      const newPresentation = await storeEvidence(root, presented.importId, presentation);
      const mutatedRecord = { ...presented, evidenceRefs: { ...presented.evidenceRefs, presentation: newPresentation } };
      const evalResult = await evaluateWorkflowEvidence(mutatedRecord, { root, throughStage: "RELEASING" });
      assert.equal(evalResult.ok, false);
      assert.match(evalResult.diagnostics.join(";"), scenario.diagnostic as RegExp);
      const statePath = path.join(root, ".automation", "article-imports", `${record.importId}.json`);
      const beforeBytes = await readFile(statePath);
      const beforeInventory = await reviewOutcomeFileList(root);
      await assert.rejects(advanceImport(root, mutatedRecord, "Ready to release"), /WORKFLOW_EVIDENCE_INVALID/);
      const afterBytes = await readFile(statePath);
      assert.equal(afterBytes.toString(), beforeBytes.toString());
      const afterInventory = await reviewOutcomeFileList(root);
      assert.deepEqual(afterInventory, beforeInventory);
      assert.equal(mutatedRecord.stage, "VALIDATING");
    } finally { await rm(root, { recursive: true, force: true }); }
  });
}
