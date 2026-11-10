import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildWorkflowFixture } from "./fixtures/article-workflow-evidence";
import { samplePageBlueprint } from "./fixtures/sample-page-blueprint";
import { rewriteAllProse } from "./fixtures/article-content-approval";
import { createEditorialEvidence } from "../src/lib/editorial/refinement";
import { WORKFLOW_REVISION } from "../src/lib/article-import/workflow-requirements";
import { readEvidence, storeEvidence, validateEditorialExecution } from "../src/lib/article-import/workflow-evidence";
import { executionEvidenceSchema, proseProjectionDigest, freezeEvidenceGraph, withEvidenceSnapshot } from "../src/lib/article-import/execution-evidence";
import { recaptureStoredExchange } from "./fixtures/capture-replay";
import { sha256 } from "../src/lib/article-import/execution-evidence";

const id = "article-00000000-0000-4000-8000-000000000099";
const beamNotes = {
  semanticNotes: "Reviewed the complete rewritten prose; meaning, qualification and protected fields are preserved.",
  exceptions: [], meaningPreserved: true, arrayOrderPreserved: true, rewriteMode: "full_article",
  writerModelFamily: "reflection-beam", cleanseModelFamily: "reflection-beam",
  passes: { purposeAndStructure: true, meaningAndEvidence: true, wordingAndRhythm: true, beamReview: true, finalFidelityReview: true },
} as const;

test("Beam review policy validates a distinct same-family review and rejects mixed/reused/wrong-model variants", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "beam-policy-"));
  try {
    const before = { ...samplePageBlueprint, metadata: { ...samplePageBlueprint.metadata, canonical_url: "https://example.test/example", url_slug: "example" } };
    const after = rewriteAllProse("landing", before);
    const artifactPath = "artifact.json", editorialEvidencePath = "editorial.json";
    await (await import("node:fs/promises")).writeFile(path.join(root, artifactPath), JSON.stringify(after));
    await (await import("node:fs/promises")).writeFile(path.join(root, editorialEvidencePath), JSON.stringify(createEditorialEvidence("landing", before, after, beamNotes, { before: "score 3/5", after: "score 5/5 CLEAN" })));
    const record = { importId: id, sourceFingerprint: sha256("source"), researchGeneration: 0, stage: "RELEASING" as const, workflowVersion: 2, requirementRevision: WORKFLOW_REVISION, artifactPath, format: "direct-review" as const };
    const fixture = await buildWorkflowFixture(root, record, { format: "direct-review", artifactPath, before, after, editorialEvidencePath });
    // Add Beam identity to capabilities for the Beam review pass (fixture capabilities otherwise only fixture families).
    const capsPath = path.join(root, "config/article-workflow-capabilities.json");
    const caps = JSON.parse(await (await import("node:fs/promises")).readFile(capsPath, "utf8"));
    caps.modelFamilies = { ...caps.modelFamilies, "opencode-go/beam-free": "reflection-beam", "opencode-go/beam-alt": "reflection-beam" };
    await (await import("node:fs/promises")).writeFile(capsPath, JSON.stringify(caps));
    const editorial = await readEvidence(root, fixture.editorial) as { passes: Array<{ name: string; executionRef: { path: string; sha256: string }; judgmentRef: { path: string; sha256: string } }>; editorialEvidenceRef: { path: string; sha256: string } };

    // Convert fourth pass to beamReview with distinct session and same family.
    const converted = structuredClone(editorial);
    converted.passes[3].name = "beamReview";
    const j0 = await readEvidence(root, converted.passes[3].judgmentRef) as Record<string, unknown>;
    j0.pass = "beamReview";
    const oldJe = executionEvidenceSchema.parse(await readEvidence(root, j0.executionRef));
    if (oldJe.kind === "opencode") {
      const judgmentTextForExec = { ...j0, executionRef: undefined };
    const judgmentProj = { judgment: JSON.stringify(judgmentTextForExec) };
    const mutated = { ...oldJe, pass: "beamReview-judgment", family: "reflection-beam", providerId: "opencode-go", modelId: "beam-free", output: judgmentProj, outputDigest: proseProjectionDigest(judgmentProj) };
    const newJe = await storeEvidence(root, id, recaptureStoredExchange(mutated, oldJe.replay!.inputRefs, oldJe.replay!.outputRefs));
      j0.executionRef = newJe;
    }
    converted.passes[3].judgmentRef = await storeEvidence(root, id, j0);
    const exec = executionEvidenceSchema.parse(await readEvidence(root, converted.passes[3].executionRef));
    if (exec.kind !== "opencode") throw new Error("expected opencode");
    // Make writer pass executions use distinct sessions and exact Beam identity.
    for (let i = 0; i < converted.passes.length; i++) {
      if (i === 3) continue;
      const e = executionEvidenceSchema.parse(await readEvidence(root, converted.passes[i].executionRef));
      if (e.kind !== "opencode") continue;
      const mutatedWriter = { ...e, family: "reflection-beam", providerId: "opencode-go", modelId: "beam-free", sessionId: `writer-session-${i}` };
      converted.passes[i].executionRef = await storeEvidence(root, id, recaptureStoredExchange(mutatedWriter, e.replay!.inputRefs, e.replay!.outputRefs));
    }
    const mutatedBeam = { ...exec, family: "reflection-beam", providerId: "opencode-go", modelId: "beam-free", pass: "beamReview", sessionId: "beam-review-session", userMessageId: exec.userMessageId, assistantMessageId: exec.assistantMessageId };
    const newExec = await storeEvidence(root, id, recaptureStoredExchange(mutatedBeam, exec.replay!.inputRefs, exec.replay!.outputRefs));
    converted.passes[3].executionRef = newExec;
    await storeEvidence(root, id, converted);
    // receipt already uses beamReview notes; but fixture receipt uses rivalFamilyCleanse notes -> mismatch. Rebuild receipt.
    const receiptPath = "editorial2.json";
    await (await import("node:fs/promises")).writeFile(path.join(root, receiptPath), JSON.stringify(createEditorialEvidence("landing", before, after, beamNotes, { before: "score 3/5", after: "score 5/5 CLEAN" })));
    converted.editorialEvidenceRef = await (await import("../src/lib/article-import/workflow-evidence")).evidenceReference(root, receiptPath);
    const finalRef = await storeEvidence(root, id, converted);
    await validateEditorialExecution(root, finalRef, record);
    assert.ok(true, "valid beam review passes");

    // Negative: reused session from each of the three rewrite passes -> reject.
    for (let i = 0; i < 3; i++) {
      const reused = structuredClone(converted);
      const reusedExec = executionEvidenceSchema.parse(await readEvidence(root, newExec));
      const reusedMutated = { ...reusedExec, sessionId: `writer-session-${i}` };
      reused.passes[3].executionRef = await storeEvidence(root, id, recaptureStoredExchange(reusedMutated, reusedExec.replay!.inputRefs, reusedExec.replay!.outputRefs));
      const reusedRef = await storeEvidence(root, id, reused);
      await assert.rejects(validateEditorialExecution(root, reusedRef, record), /SESSION_REUSED|REUSED/);
    }

    // Negative: wrong model (registered same-family alias, not exact Beam) -> reject.
    const wrong = structuredClone(converted);
    const wrongExec = executionEvidenceSchema.parse(await readEvidence(root, newExec));
    const wrongMutated = { ...wrongExec, providerId: "opencode-go", modelId: "beam-alt", family: "reflection-beam" };
    wrong.passes[3].executionRef = await storeEvidence(root, id, recaptureStoredExchange(wrongMutated, wrongExec.replay!.inputRefs, wrongExec.replay!.outputRefs));
    const wrongRef = await storeEvidence(root, id, wrong);
    await assert.rejects(validateEditorialExecution(root, wrongRef, record), /CAPABILITY_UNAVAILABLE/);

    // Negative: mixed policy flags (receipt rival, companion beam) -> reject.
    const rivalNotes = { ...beamNotes, passes: { purposeAndStructure: true, meaningAndEvidence: true, wordingAndRhythm: true, rivalFamilyCleanse: true, finalFidelityReview: true }, writerModelFamily: "writer-family", cleanseModelFamily: "reviewer-family" };
    await (await import("node:fs/promises")).writeFile(path.join(root, "editorial3.json"), JSON.stringify(createEditorialEvidence("landing", before, after, rivalNotes, { before: "score 3/5", after: "score 5/5 CLEAN" })));
    const mixed = structuredClone(converted);
    mixed.editorialEvidenceRef = await (await import("../src/lib/article-import/workflow-evidence")).evidenceReference(root, "editorial3.json");
    const mixedRef = await storeEvidence(root, id, mixed);
    await assert.rejects(validateEditorialExecution(root, mixedRef, record), /PASS_POLICY_MISMATCH|MISMATCH/);

    // Negative: mixed policy flags (receipt beam, companion rival) -> reject.
    const beamReceiptNotes = { ...beamNotes };
    await (await import("node:fs/promises")).writeFile(path.join(root, "editorial4.json"), JSON.stringify(createEditorialEvidence("landing", before, after, beamReceiptNotes, { before: "score 3/5", after: "score 5/5 CLEAN" })));
    const mixed2 = structuredClone(converted);
    mixed2.passes[3].name = "rivalFamilyCleanse";
    // make family different for legacy
    const mixed2Exec = executionEvidenceSchema.parse(await readEvidence(root, newExec));
    const mixed2Mutated = { ...mixed2Exec, family: "reviewer-family", providerId: "fixture", modelId: "cleanser", pass: "rivalFamilyCleanse", sessionId: "reviewer-session" };
    mixed2.passes[3].executionRef = await storeEvidence(root, id, recaptureStoredExchange(mixed2Mutated, mixed2Exec.replay!.inputRefs, mixed2Exec.replay!.outputRefs));
    mixed2.editorialEvidenceRef = await (await import("../src/lib/article-import/workflow-evidence")).evidenceReference(root, "editorial4.json");
    const mixed2Ref = await storeEvidence(root, id, mixed2);
    await assert.rejects(validateEditorialExecution(root, mixed2Ref, record), /PASS_ORDER|PASS_POLICY|MISMATCH|CAPABILITY_UNAVAILABLE/);

    // Negative: false receipt family mismatch (receipt claims false-family, execution is reflection-beam) -> reject.
    const falseFamilyNotes = { ...beamNotes, writerModelFamily: "false-family", cleanseModelFamily: "false-family" };
    await (await import("node:fs/promises")).writeFile(path.join(root, "editorial5.json"), JSON.stringify(createEditorialEvidence("landing", before, after, falseFamilyNotes, { before: "score 3/5", after: "score 5/5 CLEAN" })));
    const falseFamily = structuredClone(converted);
    falseFamily.editorialEvidenceRef = await (await import("../src/lib/article-import/workflow-evidence")).evidenceReference(root, "editorial5.json");
    const falseFamilyRef = await storeEvidence(root, id, falseFamily);
    await assert.rejects(validateEditorialExecution(root, falseFamilyRef, record), /RECEIPT_WRITER_FAMILY_MISMATCH|RECEIPT_CLEANSE_FAMILY_MISMATCH|MISMATCH/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("legacy rival-family evidence remains valid under its own policy", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "beam-legacy-"));
  try {
    const before = { ...samplePageBlueprint, metadata: { ...samplePageBlueprint.metadata, canonical_url: "https://example.test/example", url_slug: "example" } };
    const after = rewriteAllProse("landing", before);
    const artifactPath = "artifact.json", editorialEvidencePath = "editorial.json";
    await (await import("node:fs/promises")).writeFile(path.join(root, artifactPath), JSON.stringify(after));
    const rivalNotes = { semanticNotes: "Reviewed the complete rewritten prose; meaning, qualification and protected fields are preserved.", exceptions: [], meaningPreserved: true, arrayOrderPreserved: true, rewriteMode: "full_article", writerModelFamily: "fixture-writer-family", cleanseModelFamily: "fixture-cleanser-family", passes: { purposeAndStructure: true, meaningAndEvidence: true, wordingAndRhythm: true, rivalFamilyCleanse: true, finalFidelityReview: true } } as const;
    await (await import("node:fs/promises")).writeFile(path.join(root, editorialEvidencePath), JSON.stringify(createEditorialEvidence("landing", before, after, rivalNotes, { before: "score 3/5", after: "score 5/5 CLEAN" })));
    const record = { importId: id, sourceFingerprint: sha256("source"), researchGeneration: 0, stage: "RELEASING" as const, workflowVersion: 2, requirementRevision: WORKFLOW_REVISION, artifactPath, format: "direct-review" as const };
    const fixture = await buildWorkflowFixture(root, record, { format: "direct-review", artifactPath, before, after, editorialEvidencePath });
    // Convert the fixture's fourth pass to a true legacy rival-family pass.
    const editorial = await readEvidence(root, fixture.editorial) as { passes: Array<{ name: string; executionRef: { path: string; sha256: string }; judgmentRef: { path: string; sha256: string } }>; editorialEvidenceRef: { path: string; sha256: string } };
    const converted = structuredClone(editorial);
    converted.passes[3].name = "rivalFamilyCleanse";
    const exec = (await import("../src/lib/article-import/execution-evidence")).executionEvidenceSchema.parse(await readEvidence(root, converted.passes[3].executionRef));
    if (exec.kind === "opencode") {
      const legacyMutated = { ...exec, family: "fixture-cleanser-family", providerId: "fixture", modelId: "cleanser", pass: "rivalFamilyCleanse", sessionId: "fixture-legacy-review-session" };
      converted.passes[3].executionRef = await storeEvidence(root, id, recaptureStoredExchange(legacyMutated, exec.replay!.inputRefs, exec.replay!.outputRefs));
    }
    const j0 = await readEvidence(root, converted.passes[3].judgmentRef) as Record<string, unknown>;
    j0.pass = "rivalFamilyCleanse";
    const oldJe = (await import("../src/lib/article-import/execution-evidence")).executionEvidenceSchema.parse(await readEvidence(root, (j0.executionRef as { path: string; sha256: string })));
    if (oldJe.kind === "opencode") {
      const judgmentTextForExec = { ...j0, executionRef: undefined };
      const judgmentProj = { judgment: JSON.stringify(judgmentTextForExec) };
      const legacyJudgmentMutated = { ...oldJe, pass: "rivalFamilyCleanse-judgment", output: judgmentProj, outputDigest: (await import("../src/lib/article-import/execution-evidence")).proseProjectionDigest(judgmentProj) };
      const newJe = await storeEvidence(root, id, recaptureStoredExchange(legacyJudgmentMutated, oldJe.replay!.inputRefs, oldJe.replay!.outputRefs));
      j0.executionRef = newJe;
    }
    converted.passes[3].judgmentRef = await storeEvidence(root, id, j0);
    const legacyRef = await storeEvidence(root, id, converted);
    const frozen = await freezeEvidenceGraph(root, id, [legacyRef]);
    await withEvidenceSnapshot(frozen, () => validateEditorialExecution(root, legacyRef, record));
    assert.ok(true);
    // Without frozen historical context, legacy rival-family evidence is not a current approval.
    await assert.rejects(validateEditorialExecution(root, legacyRef, record), /PASS_ORDER|PASS_POLICY|CAPABILITY_UNAVAILABLE/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});