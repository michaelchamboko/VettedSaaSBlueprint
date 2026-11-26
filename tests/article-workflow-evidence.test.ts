import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm, readdir } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { buildWorkflowFixture } from "./fixtures/article-workflow-evidence";
import { samplePageBlueprint } from "./fixtures/sample-page-blueprint";
import { fullRewriteNotes, rewriteAllProse } from "./fixtures/article-content-approval";
import { recaptureStoredExchange } from "./fixtures/capture-replay";
import { createEditorialEvidence, fingerprintEditorialArtifact } from "../src/lib/editorial/refinement";
import { WORKFLOW_REVISION } from "../src/lib/article-import/workflow-requirements";
import { artifactProseProjection, contentAssessmentSchema, createDesignReviewSchema, editorialExecutionSchema, evaluateWorkflowEvidence, readEvidence, storeEvidence, validateContentAssessment, validateEditorialExecution, validatePresentationEvidence, validateResearchEvidence, withTransformingArtifact, workflowEvidenceSchema, type WorkflowEvidenceRecord } from "../src/lib/article-import/workflow-evidence";
import { captureCommandExecution, evidenceReference, executionEvidenceSchema, extractOpenCodeExecution, freezeEvidenceGraph, proseProjectionDigest, sha256, validateExecutionEvidence, withEvidenceSnapshot } from "../src/lib/article-import/execution-evidence";
import { captureRenderingInputs, detectorCoreFiles, renderingInputsSchema, requiredDetectorInputs, validateRenderingInputs } from "../src/lib/article-import/rendering-inputs";

const id = "article-00000000-0000-4000-8000-000000000001";
async function fixture(researchGeneration = 0, options: { structuredEditorial?: boolean; reuseIndependentContext?: boolean; assessmentStage?: "TRANSFORMING" | "REFINING" } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "workflow-proof-"));
  const before = { ...samplePageBlueprint, metadata: { ...samplePageBlueprint.metadata, canonical_url: "https://example.test/example", url_slug: "example" } };
  const after = rewriteAllProse("landing", before);
  const artifactPath = "artifact.json", editorialEvidencePath = "editorial.json";
  await writeFile(path.join(root, artifactPath), JSON.stringify(after));
  const notes = options.structuredEditorial ? { ...fullRewriteNotes, writerModelFamily: undefined, cleanseModelFamily: undefined, passes: { purposeAndStructure: true, meaningAndEvidence: true, wordingAndRhythm: true, independentReview: true, finalFidelityReview: true } } : fullRewriteNotes;
  await writeFile(path.join(root, editorialEvidencePath), JSON.stringify(createEditorialEvidence("landing", before, after, notes, { before: "score 3/5", after: "score 5/5 CLEAN" })));
  const record: WorkflowEvidenceRecord = { researchGeneration, importId: id, sourceFingerprint: sha256("source"), format: "direct-review", stage: "RELEASING", workflowVersion: 2, requirementRevision: WORKFLOW_REVISION, artifactPath };
  record.evidenceRefs = await buildWorkflowFixture(root, record, { format: "direct-review", artifactPath, before, after, editorialEvidencePath, ...options });
  return { root, record };
}
test("structured Refining accepts alternate tools and models but rejects a reused rewrite context", async () => {
  const passing = await fixture(0, { structuredEditorial: true });
  try {
    const editorial = editorialExecutionSchema.parse(await readEvidence(passing.root, passing.record.evidenceRefs!.editorial!));
    const rewrite = executionEvidenceSchema.parse(await readEvidence(passing.root, editorial.passes[0].executionRef));
    const review = executionEvidenceSchema.parse(await readEvidence(passing.root, editorial.passes[3].executionRef));
    assert.equal(rewrite.kind, "structured");
    assert.equal(review.kind, "structured");
    if (rewrite.kind !== "structured" || review.kind !== "structured") throw new Error("Expected structured executions");
    assert.notEqual(rewrite.toolName, review.toolName);
    assert.notEqual(rewrite.modelId, review.modelId);
    await validateEditorialExecution(passing.root, passing.record.evidenceRefs!.editorial!, passing.record);
    await validateContentAssessment(passing.root, passing.record.evidenceRefs!.assessment!, passing.record);
    await assert.rejects(
      validateContentAssessment(passing.root, passing.record.evidenceRefs!.assessment!, { ...passing.record, stage: undefined }),
      /ASSESSMENT_CONSUMER_STAGE_MISMATCH/,
    );
    await assert.rejects(
      validateContentAssessment(passing.root, passing.record.evidenceRefs!.assessment!, { ...passing.record, stage: "UNKNOWN" }),
      /ASSESSMENT_CONSUMER_STAGE_MISMATCH/,
    );
    assert.equal((await evaluateWorkflowEvidence(passing.record, { root: passing.root, throughStage: "REFINING" })).ok, true);
  } finally { await rm(passing.root, { recursive: true, force: true }); }

  const blocked = await fixture(0, { structuredEditorial: true, reuseIndependentContext: true });
  try {
    await assert.rejects(validateEditorialExecution(blocked.root, blocked.record.evidenceRefs!.editorial!, blocked.record), /EDITORIAL_INDEPENDENT_REVIEW_CONTEXT_REUSED/);
  } finally { await rm(blocked.root, { recursive: true, force: true }); }
});
test("structured final assessment requires a Refining packet while legacy OpenCode retains Transforming compatibility", async () => {
  const blocked = await fixture(0, { structuredEditorial: true, assessmentStage: "TRANSFORMING" });
  try {
    await assert.rejects(
      validateContentAssessment(blocked.root, blocked.record.evidenceRefs!.assessment!, blocked.record),
      /EXECUTION_PACKET_MISMATCH/,
    );
  } finally { await rm(blocked.root, { recursive: true, force: true }); }

  const legacy = await fixture(0, { assessmentStage: "TRANSFORMING" });
  try {
    await validateContentAssessment(legacy.root, legacy.record.evidenceRefs!.assessment!, legacy.record);
  } finally { await rm(legacy.root, { recursive: true, force: true }); }
});

async function assessmentWithFinding(root: string, record: WorkflowEvidenceRecord, claimIds: string[]) {
  const approved = contentAssessmentSchema.parse(await readEvidence(root, record.evidenceRefs!.assessment!));
  const execution = executionEvidenceSchema.parse(await readEvidence(root, approved.reviewerExecutionRef));
  if (execution.kind !== "opencode") throw new Error("Expected fixture model execution");
  const assessed = { format: approved.format, schemaRevision: approved.schemaRevision, artifactFingerprint: approved.artifactFingerprint, sourceFingerprint: approved.sourceFingerprint, requirementRevision: approved.requirementRevision, researchRef: approved.researchRef, intent: approved.intent, claimCoverage: approved.claimCoverage, ruleResults: approved.ruleResults,
    findings: [{ id: "finding", artifactPaths: ["metadata.title_tag"], claimIds, description: "Synthetic resolved finding.", disposition: "resolved" as const, evidenceRefs: [approved.researchRef] }] };
  const reviewerExecutionRef = await storeEvidence(root, id, recaptureStoredExchange({ ...execution, output: { assessment: JSON.stringify(assessed) }, outputDigest: proseProjectionDigest({ assessment: JSON.stringify(assessed) }) }, execution.replay!.inputRefs, execution.replay!.outputRefs));
  return storeEvidence(root, id, { schemaVersion: approved.schemaVersion, id: approved.id, createdAt: approved.createdAt, importId: approved.importId, ...assessed, reviewerExecutionRef });
}
test("valid synthetic producer chain passes; omitted prerequisites fail closed without writes", async () => {
  const { root, record } = await fixture();
  try {
    const before = (await readdir(root, { recursive: true })).sort();
    assert.deepEqual((await evaluateWorkflowEvidence(record, { root })).diagnostics, []);
    for (const key of ["research", "assessment", "editorial", "presentation"] as const) {
      const evidenceRefs = { ...record.evidenceRefs }; delete evidenceRefs[key];
      const result = await evaluateWorkflowEvidence({ ...record, evidenceRefs }, { root });
      assert.equal(result.ok, false, key); assert.match(result.diagnostics.join(), /REQUIRED/);
    }
    assert.deepEqual((await readdir(root, { recursive: true })).sort(), before);
    await writeFile(path.join(root, record.artifactPath!), "{}");
    assert.equal((await evaluateWorkflowEvidence(record, { root })).ok, false);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("editorial rejects reordered passes and an alias pretending to be a rival family", async () => {
  const { root, record } = await fixture();
  try {
    const editorial = await readEvidence(root, record.evidenceRefs!.editorial!) as { passes: Array<{ executionRef: { path: string; sha256: string } }> };
    const reordered = structuredClone(editorial); [reordered.passes[0], reordered.passes[1]] = [reordered.passes[1], reordered.passes[0]];
    await assert.rejects(validateEditorialExecution(root, await storeEvidence(root, id, reordered), record), /PASS_ORDER/);
    const execution = await readEvidence(root, editorial.passes[3].executionRef) as object;
    const forged = await storeEvidence(root, id, { ...execution, family: "different-name" });
    await assert.rejects(validateExecutionEvidence(root, forged), /CAPABILITY_UNAVAILABLE/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("research rejects changed snapshot bytes and unsupported excerpts", async () => {
  const { root, record } = await fixture();
  try {
    const value = await readEvidence(root, record.evidenceRefs!.research!) as { sources: Array<{ snapshotRef: { path: string } }>; claims: Array<{ excerptLocations: Array<{ quote: string }> }> };
    value.claims[0].excerptLocations[0].quote = "Not present in the primary snapshot";
    await assert.rejects(validateResearchEvidence(root, await storeEvidence(root, id, value), record), /EXCERPT_MISMATCH/);
    await writeFile(path.join(root, value.sources[0].snapshotRef.path), "changed");
    await assert.rejects(validateResearchEvidence(root, record.evidenceRefs!.research!, record), /HASH_MISMATCH/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("assessment findings accept claim IDs present in the bound research", async () => {
  const { root, record } = await fixture();
  try {
    await validateContentAssessment(root, await assessmentWithFinding(root, record, ["claim"]), record);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("assessment findings reject claim IDs absent from the bound research", async () => {
  const { root, record } = await fixture();
  try {
    await assert.rejects(validateContentAssessment(root, await assessmentWithFinding(root, record, ["unknown-claim"]), record), /ASSESSMENT_CLAIM_MISMATCH/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("assessment findings may omit claim IDs when no research claim applies", async () => {
  const { root, record } = await fixture();
  try {
    await validateContentAssessment(root, await assessmentWithFinding(root, record, []), record);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("transforming assessment reuses the schema and commercial artifact object while verifying evidence refs", async () => {
  const { root, record } = await fixture();
  try {
    let observedReads = 0;
    await withTransformingArtifact(root, { ...record, stage: "TRANSFORMING" }, (artifact) => {
      const metadata = (artifact as { metadata: Record<string, unknown> }).metadata;
      const title = metadata.title_tag;
      Object.defineProperty(metadata, "title_tag", { enumerable: true, get: () => { observedReads += 1; return title; } });
    }, async () => {
      assert.deepEqual((await evaluateWorkflowEvidence({ ...record, stage: "TRANSFORMING" }, { root, throughStage: "REFINING" })).diagnostics, []);
    });
    assert.ok(observedReads > 0, "assessment should inspect the exact object checked at the transforming handoff");
    assert.deepEqual((await evaluateWorkflowEvidence(record, { root, throughStage: "REFINING" })).diagnostics, []);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("rebinding assessment envelopes cannot reuse a prose-only review after metadata or disclosure changes", async () => {
  const { root, record } = await fixture();
  try {
    const approved = contentAssessmentSchema.parse(await readEvidence(root, record.evidenceRefs!.assessment!));
    const execution = executionEvidenceSchema.parse(await readEvidence(root, approved.reviewerExecutionRef));
    if (execution.kind !== "opencode") throw new Error("Expected fixture model execution");
    const bytes = await readFile(path.join(root, record.artifactPath!), "utf8");
    for (const [field, replacement] of [["title_tag", "Unreviewed search title"], ["meta_description", "Unreviewed search summary"], ["robots", "noindex,nofollow"], ["canonical_url", "https://example.test/unreviewed"], ["full_disclosure", "A materially different disclosure."]] as const) {
      const artifact = JSON.parse(bytes) as { metadata: Record<string, string>; affiliate_disclosure: Record<string, string> };
      if (field === "full_disclosure") artifact.affiliate_disclosure[field] = replacement;
      else artifact.metadata[field] = replacement;
      await writeFile(path.join(root, record.artifactPath!), JSON.stringify(artifact));
      const current = await evidenceReference(root, record.artifactPath!);
      // Retarget only untrusted envelope refs/fingerprints; the captured model input stays unchanged.
      const rebind = (refs: typeof execution.inputRefs) => refs.map((ref) => ref.path === current.path ? current : ref);
      const reviewerExecutionRef = await storeEvidence(root, id, { ...execution, inputRefs: rebind(execution.inputRefs), outputRefs: rebind(execution.outputRefs), replay: { export: execution.replay!.export, inputRefs: rebind(execution.replay!.inputRefs), outputRefs: rebind(execution.replay!.outputRefs) } });
      const rebound = await storeEvidence(root, id, { ...approved, artifactFingerprint: fingerprintEditorialArtifact(artifact), reviewerExecutionRef });
      await assert.rejects(validateContentAssessment(root, rebound, record), /ASSESSMENT_EXECUTION_MISMATCH/, field);
    }
    await writeFile(path.join(root, record.artifactPath!), bytes);
    const legacyInput = artifactProseProjection(record.format, JSON.parse(bytes));
    const legacyExecution = await storeEvidence(root, id, recaptureStoredExchange({ ...execution, input: legacyInput, inputDigest: proseProjectionDigest(legacyInput), output: execution.output, outputDigest: proseProjectionDigest(execution.output) }, execution.replay!.inputRefs, execution.replay!.outputRefs));
    await assert.rejects(validateContentAssessment(root, await storeEvidence(root, id, { ...approved, reviewerExecutionRef: legacyExecution }), record), /ASSESSMENT_EXECUTION_MISMATCH/);
    await validateContentAssessment(root, record.evidenceRefs!.assessment!, record);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("rebinding a research receipt cannot retain the old captured assessment", async () => {
  const { root, record } = await fixture();
  try {
    const approved = contentAssessmentSchema.parse(await readEvidence(root, record.evidenceRefs!.assessment!));
    const execution = executionEvidenceSchema.parse(await readEvidence(root, approved.reviewerExecutionRef));
    if (execution.kind !== "opencode") throw new Error("Expected fixture model execution");
    const research = await readEvidence(root, approved.researchRef) as Record<string, unknown>;
    const researchRef = await storeEvidence(root, id, { ...research, freshness: "Changed evidence qualification absent from the captured assessment." });
    const reviewerExecutionRef = await storeEvidence(root, id, { ...execution, inputRefs: execution.inputRefs.map((ref) => ref.sha256 === approved.researchRef.sha256 ? researchRef : ref), replay: { export: execution.replay!.export, inputRefs: execution.replay!.inputRefs.map((ref) => ref.sha256 === approved.researchRef.sha256 ? researchRef : ref), outputRefs: execution.replay!.outputRefs } });
    await assert.rejects(validateContentAssessment(root, await storeEvidence(root, id, { ...approved, researchRef, reviewerExecutionRef }), { ...record, evidenceRefs: { ...record.evidenceRefs, research: researchRef } }), /ASSESSMENT_EXECUTION_MISMATCH/);
    assert.ok(execution.input.research.includes("Fixed synthetic input"));
    assert.ok(execution.input.sourceSnapshots.includes("Synthetic source supports this scoped fixture claim."));
    await validateContentAssessment(root, record.evidenceRefs!.assessment!, record);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("a recaptured old design exchange cannot approve a new rendering manifest", async () => {
  const { root, record } = await fixture();
  try {
    const prior = workflowEvidenceSchema.parse(await readEvidence(root, record.evidenceRefs!.presentation!));
    const priorExecution = await readEvidence(root, prior.ruleResults.find((rule) => rule.ruleId === "critique")!.evidenceRefs[0]);
    const editorial = editorialExecutionSchema.parse(await readEvidence(root, record.evidenceRefs!.editorial!));
    const before = await readEvidence(root, editorial.passes[0].inputRef);
    const after = JSON.parse(await readFile(path.join(root, record.artifactPath!), "utf8"));
    await writeFile(path.join(root, "src/styles/fixture-renderer.css"), "body { color: black; background: white; padding: 12px; }\n");
    const fresh = await buildWorkflowFixture(root, record, { format: "direct-review", artifactPath: record.artifactPath!, before, after, editorialEvidencePath: "editorial.json" });
    const current = workflowEvidenceSchema.parse(await readEvidence(root, fresh.presentation));
    assert.notEqual(current.renderInputsRef.sha256, prior.renderInputsRef.sha256);
    const critique = current.ruleResults.find((rule) => rule.ruleId === "critique")!;
    const currentExecution = executionEvidenceSchema.parse(await readEvidence(root, critique.evidenceRefs[0]));
    // The old exported messages are unchanged; only caller-selected refs now target the fresh rendering.
    critique.evidenceRefs = [await storeEvidence(root, id, recaptureStoredExchange(priorExecution, currentExecution.inputRefs, currentExecution.outputRefs))];
    await assert.rejects(validatePresentationEvidence(root, await storeEvidence(root, id, current), record), /PRESENTATION_JUDGMENT_REQUIRED/);
    await validatePresentationEvidence(root, fresh.presentation, record);
    const policyPath = path.join(root,"config/article-workflow-capabilities.json");
    const policy = JSON.parse(await readFile(policyPath,"utf8"));
    await writeFile(policyPath,JSON.stringify({...policy,designEvidenceVersion:2}));
    await assert.rejects(validatePresentationEvidence(root,fresh.presentation,record),/PRESENTATION_RUNTIME_EVIDENCE_REQUIRED/);

  } finally { await rm(root, { recursive: true, force: true }); }
});
test("protected metadata rebinding cannot retain prior editorial authoring or fidelity exchanges", async () => {
  const { root, record } = await fixture();
  try {
    const prior = editorialExecutionSchema.parse(await readEvidence(root, record.evidenceRefs!.editorial!));
    const before = await readEvidence(root, prior.passes[0].inputRef) as { metadata: Record<string, string> };
    const after = JSON.parse(await readFile(path.join(root, record.artifactPath!), "utf8")) as { metadata: Record<string, string> };
    before.metadata.title_tag = "New protected search title"; after.metadata.title_tag = "New protected search title";
    await writeFile(path.join(root, record.artifactPath!), JSON.stringify(after));
    await writeFile(path.join(root, "editorial.json"), JSON.stringify(createEditorialEvidence("landing", before, after, fullRewriteNotes, { before: "score 3/5", after: "score 5/5 CLEAN" })));
    const fresh = await buildWorkflowFixture(root, record, { format: "direct-review", artifactPath: record.artifactPath!, before, after, editorialEvidencePath: "editorial.json" });
    const current = editorialExecutionSchema.parse(await readEvidence(root, fresh.editorial));
    const freshExecution = executionEvidenceSchema.parse(await readEvidence(root, current.passes[0].executionRef));
    const oldExecution = await readEvidence(root, prior.passes[0].executionRef);
    current.passes[0].executionRef = await storeEvidence(root, id, recaptureStoredExchange(oldExecution, freshExecution.inputRefs, freshExecution.outputRefs));
    await assert.rejects(validateEditorialExecution(root, await storeEvidence(root, id, current), record), /EDITORIAL_EXECUTION_MISMATCH/);
    const fidelity = editorialExecutionSchema.parse(await readEvidence(root, fresh.editorial));
    const oldJudgment = await readEvidence(root, prior.passes[4].judgmentRef) as { executionRef: { path: string; sha256: string } };
    const newJudgment = await readEvidence(root, fidelity.passes[4].judgmentRef) as { executionRef: { path: string; sha256: string } };
    const freshJudgmentExecution = executionEvidenceSchema.parse(await readEvidence(root, newJudgment.executionRef));
    const reexported = recaptureStoredExchange(await readEvidence(root, oldJudgment.executionRef), freshJudgmentExecution.inputRefs, freshJudgmentExecution.outputRefs);
    fidelity.passes[4].judgmentRef = await storeEvidence(root, id, { ...newJudgment, executionRef: await storeEvidence(root, id, reexported) });
    await assert.rejects(validateEditorialExecution(root, await storeEvidence(root, id, fidelity), record), /EDITORIAL_JUDGMENT_EXECUTION_MISMATCH/);
    await validateEditorialExecution(root, fresh.editorial, record);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("editorial receipt initial fingerprint must identify the actual first pass artifact", async () => {
  const { root, record } = await fixture();
  try {
    const editorial = editorialExecutionSchema.parse(await readEvidence(root, record.evidenceRefs!.editorial!));
    const receipt = await readEvidence(root, editorial.editorialEvidenceRef) as Record<string, unknown>;
    editorial.editorialEvidenceRef = await storeEvidence(root, id, { ...receipt, beforeFingerprint: "f".repeat(64) });
    await assert.rejects(validateEditorialExecution(root, await storeEvidence(root, id, editorial), record), /EDITORIAL_INITIAL_ARTIFACT_MISMATCH/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("echo-like success output cannot replace the pinned checker, detector or scoped design review", async () => {
  const { root, record } = await fixture();
  try {
    const editorial = editorialExecutionSchema.parse(await readEvidence(root, record.evidenceRefs!.editorial!));
    const checker = await readEvidence(root, editorial.checkerExecutionRef) as Record<string, unknown>;
    const echo = await storeEvidence(root, id, { ...checker, executable: "echo", argv: ["score 5/5 CLEAN"] });
    await assert.rejects(validateEditorialExecution(root, await storeEvidence(root, id, { ...editorial, checkerExecutionRef: echo }), record), /CHECKER_COMMAND_MISMATCH/);
    const presentation = workflowEvidenceSchema.parse(await readEvidence(root, record.evidenceRefs!.presentation!));
    const detect = presentation.ruleResults.find((rule) => rule.ruleId === "detect")!;
    const detector = await readEvidence(root, detect.evidenceRefs[0]) as Record<string, unknown>;
    detect.evidenceRefs = [await storeEvidence(root, id, { ...detector, executable: "echo", argv: ["[]"] })];
    await assert.rejects(validatePresentationEvidence(root, await storeEvidence(root, id, presentation), record), /DETECTOR_COMMAND_MISMATCH/);
    const context = workflowEvidenceSchema.parse(await readEvidence(root, record.evidenceRefs!.presentation!));
    context.ruleResults.find((rule) => rule.ruleId === "context")!.evidenceRefs = [echo];
    await assert.rejects(validatePresentationEvidence(root, await storeEvidence(root, id, context), record), /JUDGMENT_REQUIRED|RENDER_INPUT_BINDING_MISMATCH/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("editorial instructions must be present in the captured exchange, not attached afterward", async () => {
  const { root, record } = await fixture();
  try {
    const editorial = editorialExecutionSchema.parse(await readEvidence(root, record.evidenceRefs!.editorial!));
    const execution = await readEvidence(root, editorial.passes[0].executionRef) as Record<string, unknown>;
    editorial.passes[0].executionRef = await storeEvidence(root, id, { ...execution, instructions: [] });
    await assert.rejects(validateEditorialExecution(root, await storeEvidence(root, id, editorial), record), /INSTRUCTION_MISMATCH/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("authentic detector command shape cannot substitute an unrelated inventory file or partial coverage", async () => {
  const { root, record } = await fixture();
  try {
    const original = workflowEvidenceSchema.parse(await readEvidence(root, record.evidenceRefs!.presentation!));
    const partial = structuredClone(original), partialRule = partial.ruleResults.find((rule) => rule.ruleId === "detect")!;
    partialRule.evidenceRefs = partialRule.evidenceRefs.slice(0, 1);
    await assert.rejects(validatePresentationEvidence(root, await storeEvidence(root, id, partial), record), /DETECTOR_COVERAGE_INCOMPLETE/);
    const unrelated = structuredClone(original), detectorRule = unrelated.ruleResults.find((rule) => rule.ruleId === "detect")!;
    const captured = await readEvidence(root, detectorRule.evidenceRefs[0]) as { inputRefs: Array<{ path: string; sha256: string }>; argv: string[] };
    const lockfile = await evidenceReference(root, "package-lock.json");
    // Preserve the real producer's executable/version/output contract; only the scanned scope differs.
    const unrelatedScan = { ...captured, argv: ["detect", "--json", "--no-config", lockfile.path], inputRefs: [...captured.inputRefs, lockfile] };
    detectorRule.evidenceRefs = [await storeEvidence(root, id, unrelatedScan)];
    await assert.rejects(validatePresentationEvidence(root, await storeEvidence(root, id, unrelated), record), /DETECTOR_TARGET_OUTSIDE_SCOPE:package-lock.json/);
    await validatePresentationEvidence(root, record.evidenceRefs!.presentation!, record);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("detector scope requires each format core, shared shell and matching dynamic route files", () => {
  for (const format of Object.keys(detectorCoreFiles) as Array<keyof typeof detectorCoreFiles>) {
    const basePaths = [detectorCoreFiles[format], "src/app/layout.tsx", "src/app/globals.css", "src/styles/shared.css", "src/components/public/Header.tsx", "src/app/(public)/[slug]/page.tsx", "src/app/(public)/[slug]/page.module.css", "src/app/unrelated/page.tsx", "package-lock.json"];
    if (format === "direct-review") basePaths.push("src/app/landing-page-previews/[slug]/page.tsx");
    const paths = [...new Set(basePaths)].sort();
    const files = paths.map((file) => ({ path: file, sha256: "a".repeat(64) }));
    const manifest = renderingInputsSchema.parse({ schemaVersion: "RenderingInputsV1", inventoryVersion: 1, files, digest: sha256(JSON.stringify(files)) });
    const scope = requiredDetectorInputs(manifest, { format, renderedRoutes: ["/article"] }).map((ref) => ref.path);
    const expectedFiles = [detectorCoreFiles[format], "src/app/layout.tsx", "src/app/globals.css", "src/styles/shared.css", "src/app/(public)/[slug]/page.tsx", "src/app/(public)/[slug]/page.module.css"];
    if (format === "direct-review") expectedFiles.push("src/app/landing-page-previews/[slug]/page.tsx");
    for (const expected of expectedFiles) assert.ok(scope.includes(expected), `${format}: ${expected}`);
    assert.equal(scope.includes("src/components/public/Header.tsx"), format !== "direct-review");
    assert.equal(scope.includes("package-lock.json"), false); assert.equal(scope.includes("src/app/unrelated/page.tsx"), false);
    assert.throws(() => requiredDetectorInputs({ ...manifest, files: files.filter((ref) => ref.path !== detectorCoreFiles[format]) }, { format, renderedRoutes: ["/article"] }), /CORE_INPUT_MISSING/);
  }
});
test("OpenCode extraction rejects unknown versions and mismatched parent linkage", () => {
  const input = { title: "Before" }, output = { title: "After" }, packetId = sha256("packet");
  const selection = { version: "1.19.4", sessionId: "session", userMessageId: "user", assistantMessageId: "answer", packetId, pass: "test", input, output, families: { "fixture/model": "family" } };
  const raw = { info: { id: "session" }, messages: [
    { info: { id: "user", role: "user", sessionID: "session" }, parts: [{ type: "text", text: JSON.stringify({ packetId, pass: "test", prose: input, digest: proseProjectionDigest(input) }) }] },
    { info: { id: "answer", role: "assistant", sessionID: "session", parentID: "user", providerID: "fixture", modelID: "model", finish: "stop", time: { created: 1, completed: 2 } }, parts: [{ type: "text", text: JSON.stringify(output) }, { type: "reasoning", text: "private payload" }] },
  ] };
  assert.equal(JSON.stringify(extractOpenCodeExecution(raw, selection)).includes("private payload"), false);
  assert.throws(() => extractOpenCodeExecution(raw, { ...selection, version: "future" }), /UNSUPPORTED/);
  raw.messages[1].info.parentID = "someone-else";
  assert.throws(() => extractOpenCodeExecution(raw, selection), /MESSAGE_MISMATCH/);
});
test("command producer captures a real harmless local command and rejects path escapes", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "command-proof-"));
  try {
    const execution = await captureCommandExecution(root, { executable: process.execPath, argv: ["-e", "process.stdout.write('fixture-output')"], toolVersion: process.version, inputRefs: [] });
    assert.equal(execution.kind, "command");
    if (execution.kind === "command") assert.equal(execution.stdout, "fixture-output");
    await assert.rejects(evidenceReference(root, "../package.json"));
    await mkdir(path.join(root, "config"));
    await writeFile(path.join(root, "config/check.txt"), "bounded");
    const ref = await evidenceReference(root, "config/check.txt");
    assert.equal(ref.sha256, sha256(await readFile(path.join(root, ref.path))));
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("frozen historical graph survives later source edits and rejects archive tampering", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "frozen-proof-"));
  try {
    await mkdir(path.join(root, "config"));
    await writeFile(path.join(root, "config/article-workflow-capabilities.json"), "{}");
    await writeFile(path.join(root, "mutable.json"), JSON.stringify({ retained: "original" }));
    const original = await evidenceReference(root, "mutable.json");
    const envelope = await storeEvidence(root, id, { predecessor: original });
    const frozen = await freezeEvidenceGraph(root, id, [envelope]);
    await writeFile(path.join(root, "mutable.json"), JSON.stringify({ retained: "new revision" }));
    await assert.rejects(readEvidence(root, original), /HASH_MISMATCH/);
    assert.deepEqual(await withEvidenceSnapshot(frozen, () => readEvidence(root, original)), { retained: "original" });
    await writeFile(path.join(root, frozen.find((entry) => entry.path === "mutable.json")!.archiveRef.path), "tampered archive");
    await assert.rejects(withEvidenceSnapshot(frozen, () => readEvidence(root, original)), /SNAPSHOT_BYTES_CHANGED/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("renderer JSON freezes as opaque data instead of following catalogue-relative metadata paths", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "render-data-proof-"));
  try {
    await mkdir(path.join(root, "config"));
    await writeFile(path.join(root, "config/article-workflow-capabilities.json"), "{}");
    const file = "src/generated/landing-pages/example.release.json";
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    const data = { artifacts: { page: { path: "example.json", sha256: "a".repeat(64) } } };
    await writeFile(path.join(root, file), JSON.stringify(data));
    const rendering = await captureRenderingInputs(root, id);
    const graph = await freezeEvidenceGraph(root, id, [rendering]);
    assert.ok(graph.some((entry) => entry.path === file));
    assert.equal(graph.some((entry) => entry.path === "example.json"), false);
    await writeFile(path.join(root, file), "{}");
    const frozen = await withEvidenceSnapshot(graph, () => validateRenderingInputs(root, rendering, { historical: true }));
    assert.deepEqual(await withEvidenceSnapshot(graph, () => readEvidence(root, frozen.files[0])), data);
  } finally { await rm(root, { recursive: true, force: true }); }
});


test("recovered evidence accepts current generation and rejects prior generation at every downstream validator", async () => {
  const { root, record } = await fixture(1);
  try {
    assert.deepEqual((await evaluateWorkflowEvidence(record, { root })).diagnostics, []);
    const previous = { ...record, researchGeneration: 0 };
    await assert.rejects(validateContentAssessment(root, record.evidenceRefs!.assessment!, previous), /EXECUTION_PACKET_MISMATCH/);
    await assert.rejects(validateEditorialExecution(root, record.evidenceRefs!.editorial!, previous), /EXECUTION_PACKET_MISMATCH/);
    await assert.rejects(validatePresentationEvidence(root, record.evidenceRefs!.presentation!, previous), /EXECUTION_PACKET_MISMATCH/);
    const archived = await freezeEvidenceGraph(root, id, Object.values(record.evidenceRefs!));
    assert.deepEqual((await withEvidenceSnapshot(archived, () => evaluateWorkflowEvidence(record, { root }))).diagnostics, []);
    const research = await readEvidence(root, record.evidenceRefs!.research!) as Record<string, unknown>;
    const replacement = await storeEvidence(root, id, { ...research, freshness: "Replacement research requires a new assessment." });
    await assert.rejects(validateContentAssessment(root, record.evidenceRefs!.assessment!, { ...record, evidenceRefs: { ...record.evidenceRefs, research: replacement } }), /ASSESSMENT_RESEARCH_MISMATCH/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("design review fail blocks advancement", async () => {
  const { root, record } = await fixture();
  try {
    const presentation = workflowEvidenceSchema.parse(await readEvidence(root, record.evidenceRefs!.presentation!));
    const rule = presentation.ruleResults.find((item) => item.ruleId === "context")!;
    const execution = executionEvidenceSchema.parse(await readEvidence(root, rule.evidenceRefs[0]));
    if (execution.kind !== "opencode") throw new Error("Expected fixture model execution");
    const review = JSON.parse(execution.output.designReview ?? "null");
    const negative = { ...review, verdict: "fail", findings: [{ description: "Synthetic design failure.", disposition: "unresolved" }] };
    const negativeOutput = { ...execution.output, designReview: JSON.stringify(negative) };
    rule.evidenceRefs = [await storeEvidence(root, id, recaptureStoredExchange({ ...execution, output: negativeOutput, outputDigest: proseProjectionDigest(negativeOutput) }, execution.replay!.inputRefs, execution.replay!.outputRefs))];
    await assert.rejects(validatePresentationEvidence(root, await storeEvidence(root, id, presentation), record), /PRESENTATION_DESIGN_REVIEW_VERDICT_NOT_PASS/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("design review insufficient-evidence blocks advancement", async () => {
  const { root, record } = await fixture();
  try {
    const presentation = workflowEvidenceSchema.parse(await readEvidence(root, record.evidenceRefs!.presentation!));
    const rule = presentation.ruleResults.find((item) => item.ruleId === "context")!;
    const execution = executionEvidenceSchema.parse(await readEvidence(root, rule.evidenceRefs[0]));
    if (execution.kind !== "opencode") throw new Error("Expected fixture model execution");
    const review = JSON.parse(execution.output.designReview ?? "null");
    const negative = { ...review, verdict: "insufficient-evidence", findings: [{ description: "Missing runtime observation.", disposition: "unresolved" }] };
    const negativeOutput = { ...execution.output, designReview: JSON.stringify(negative) };
    rule.evidenceRefs = [await storeEvidence(root, id, recaptureStoredExchange({ ...execution, output: negativeOutput, outputDigest: proseProjectionDigest(negativeOutput) }, execution.replay!.inputRefs, execution.replay!.outputRefs))];
    await assert.rejects(validatePresentationEvidence(root, await storeEvidence(root, id, presentation), record), /PRESENTATION_DESIGN_REVIEW_VERDICT_NOT_PASS/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("design review pass with unresolved findings blocks advancement", async () => {
  const { root, record } = await fixture();
  try {
    const presentation = workflowEvidenceSchema.parse(await readEvidence(root, record.evidenceRefs!.presentation!));
    const rule = presentation.ruleResults.find((item) => item.ruleId === "context")!;
    const execution = executionEvidenceSchema.parse(await readEvidence(root, rule.evidenceRefs[0]));
    if (execution.kind !== "opencode") throw new Error("Expected fixture model execution");
    const review = JSON.parse(execution.output.designReview ?? "null");
    const mixed = { ...review, verdict: "pass", findings: [{ description: "Unresolved issue.", disposition: "unresolved" }] };
    const mixedOutput = { ...execution.output, designReview: JSON.stringify(mixed) };
    rule.evidenceRefs = [await storeEvidence(root, id, recaptureStoredExchange({ ...execution, output: mixedOutput, outputDigest: proseProjectionDigest(mixedOutput) }, execution.replay!.inputRefs, execution.replay!.outputRefs))];
    await assert.rejects(validatePresentationEvidence(root, await storeEvidence(root, id, presentation), record), /PRESENTATION_DESIGN_REVIEW_UNRESOLVED_FINDING/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("design review malformed verdict is rejected", async () => {
  const { root, record } = await fixture();
  try {
    const presentation = workflowEvidenceSchema.parse(await readEvidence(root, record.evidenceRefs!.presentation!));
    const rule = presentation.ruleResults.find((item) => item.ruleId === "context")!;
    const execution = executionEvidenceSchema.parse(await readEvidence(root, rule.evidenceRefs[0]));
    if (execution.kind !== "opencode") throw new Error("Expected fixture model execution");
    const review = JSON.parse(execution.output.designReview ?? "null");
    const malformed = { ...review, verdict: "maybe" };
    const malformedOutput = { ...execution.output, designReview: JSON.stringify(malformed) };
    rule.evidenceRefs = [await storeEvidence(root, id, { ...execution, output: malformedOutput, outputDigest: proseProjectionDigest(malformedOutput) })];
    await assert.rejects(validatePresentationEvidence(root, await storeEvidence(root, id, presentation), record));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("design review schema accepts truthful negative verdicts and rejects malformed verdicts", () => {
  const schema = createDesignReviewSchema({ rule: "context", artifactFingerprint: "a".repeat(64), renderInputsRef: { path: "render.json", sha256: "b".repeat(64) }, renderingDigest: "c".repeat(64), allowedRoutes: [JSON.stringify(["/article"])] });
  const base = { rule: "context", artifactFingerprint: "a".repeat(64), routes: ["/article"], renderInputsRef: { path: "render.json", sha256: "b".repeat(64) }, renderingDigest: "c".repeat(64), notes: "Synthetic scoped review." };
  const fail = schema.parse({ ...base, verdict: "fail", findings: [{ description: "Synthetic design failure.", disposition: "unresolved" }] });
  assert.equal(fail.verdict, "fail");
  const insufficient = schema.parse({ ...base, verdict: "insufficient-evidence", findings: [{ description: "Missing runtime observation.", disposition: "unresolved" }] });
  assert.equal(insufficient.verdict, "insufficient-evidence");
  const pass = schema.parse({ ...base, verdict: "pass", findings: [{ description: "All resolved.", disposition: "resolved" }] });
  assert.equal(pass.verdict, "pass");
  assert.throws(() => schema.parse({ ...base, verdict: "maybe", findings: [] }));
});


test("pound and euro research claims require complete price context",async () => {
  const root = await mkdtemp(path.join(os.tmpdir(),"research-prices-"));
  try {
    const binding = {importId:id,sourceFingerprint:sha256("prices"),requirementRevision:WORKFLOW_REVISION};
    const createdAt = new Date().toISOString();
    for (const [symbol,currency] of [["\u00a3","GBP"],["\u20ac","EUR"]]) {
      const quote = "Costs " + symbol + "19 per month";
      const snapshotRef = await storeEvidence(root,id,{quote});
      const proof = {schemaVersion:"ResearchEvidenceV2",id:"price",createdAt,...binding,
        freshness:"Current fixture.",sources:[{id:"source",url:"https://example.test/pricing",retrievedAt:createdAt,snapshotRef}]};
      const claim = {id:"price",text:quote,sourceIds:["source"],excerptLocations:[{sourceId:"source",quote}],limitations:[]};
      const save = (item:object) => storeEvidence(root,id,{...proof,claims:[item]});
      await assert.rejects(validateResearchEvidence(root,await save(claim),binding),/RESEARCH_PRICE_CONTEXT_REQUIRED/);
      await assert.rejects(validateResearchEvidence(root,await save({...claim,text:symbol+"/month"}),binding),/RESEARCH_PRICE_INVALID/);
      await validateResearchEvidence(root,await save({...claim,price:{amount:19,currency,period:"month",plan:"Example",restrictions:[]}}),binding);
    }
  } finally {await rm(root,{recursive:true,force:true});}
});
