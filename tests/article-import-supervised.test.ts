import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";
import { executeFixtureCommand as executeImportCommand, fixtureResearchRegistry } from "./fixtures/article-command";
import { executeImportCommand as executeArticleCommand } from "../scripts/import-article";
import { writeAcquisitionResult, writeGapPlanResult } from "./fixtures/article-research-flow";
import { createIntakeRun, type IntakeRun } from "../src/lib/article-import/intake";
import { claimWorkflowLease } from "../src/lib/article-import/workflow-lease";
import type { WorkerRunner } from "../src/lib/article-import/worker-runner";
import { createArticleImport, loadImport, writeJsonAtomically } from "../src/lib/article-import/engine";
import { createSupervisedImportExecutor } from "../src/lib/article-import/supervised-executor";
import type { ReleaseOperations } from "../src/lib/article-import/release";
import { prepareApprovalFixture, preparePresentationFixture } from "./fixtures/article-content-approval";
import { storeEvidence } from "../src/lib/article-import/execution-evidence";
import { instructionsForStage, releaseSteps, verificationSteps, WORKFLOW_REVISION } from "../src/lib/article-import/workflow-requirements";
import { productionFixture } from "./fixtures/article-production-evidence";
import { importArtifactTarget } from "../src/lib/article-import/format-validation";
import { samplePageBlueprint } from "./fixtures/sample-page-blueprint";
import { evaluateWorkflowEvidence, readEvidence } from "../src/lib/article-import/workflow-evidence";

async function completeHeroHandoff(root: string, record: Awaited<ReturnType<typeof loadImport>>): Promise<void> {
  if (record.continuation?.kind !== "work") throw new Error("Missing supervised hero handoff");
  const packet = JSON.parse(await readFile(path.join(root, record.continuation.workPath), "utf8"));
  if (packet.supervisedHandoff !== "chatgpt-imagegen") throw new Error("Expected supervised hero handoff");
  const bytes = await sharp({ create: { width: 1600, height: 900, channels: 4, background: { r: 232, g: 221, b: 202, alpha: 1 } } }).png().toBuffer();
  await mkdir(path.dirname(path.join(root, packet.originalFile)), { recursive: true });
  await writeFile(path.join(root, packet.originalFile), bytes);
  const originalRef = { path: packet.originalFile, sha256: createHash("sha256").update(bytes).digest("hex") };
  const generatedAt = "2026-11-03T00:00:00.000Z";
  const toolCallId = "fixture-imagegen-call";
  const providerOutputRef = await storeEvidence(root, record.importId, { schemaVersion: "ArticleHeroProviderOutputV1", provider: "openai", tool: "chatgpt-imagegen", interface: "built-in", toolCallId, generatedAt,
    generatedImage: { providerAssetPath: "generated-image://fixture-hero", originalSha256: originalRef.sha256, outputHint: "Synthetic retained ImageGen fixture output." } });
  const generationPath = `build-pack/article-import/${record.importId}/hero-generation.json`;
  await writeJsonAtomically(path.join(root, generationPath), { schemaVersion: "ArticleHeroGenerationEvidenceV1", importId: record.importId, sourceFingerprint: record.sourceFingerprint,
    format: packet.format, slug: packet.slug, artifactFingerprint: packet.artifactFingerprint, originalRef, alt: packet.alt,
    generation: { provider: "openai", tool: "chatgpt-imagegen", interface: "built-in", toolCallId, generatedAt, prompt: packet.prompt, promptSha256: packet.promptSha256, outputSha256: originalRef.sha256, providerOutputRef } });
  await writeJsonAtomically(path.join(root, record.continuation.resultPath), { schemaVersion: "ArticleHeroImagegenResultV1", handoffFingerprint: packet.handoffFingerprint,
    idempotencyKey: record.continuation.idempotencyKey, sourceFingerprint: record.sourceFingerprint, summary: "Generated the bound synthetic hero through the supervised ImageGen fixture.",
    work: { stage: "VALIDATING", heroGenerationEvidencePath: generationPath } });
}

test("describe-workflow exposes exactly the three actionable release steps", async () => {
  const described = await executeArticleCommand(process.cwd(), { kind: "describe-workflow" }) as {
    releaseSteps: typeof releaseSteps;
    instructions: { RELEASING: string };
  };

  assert.deepEqual(described.releaseSteps, releaseSteps);
  assert.deepEqual(described.releaseSteps.map((step) => step.id), [
    "validate-candidate",
    "review-and-deploy",
    "verify-production",
  ]);
  assert.equal(described.instructions.RELEASING, instructionsForStage("RELEASING"));
  assert.match(described.instructions.RELEASING, /exact PR head/);
  assert.match(described.instructions.RELEASING, /exact merged commit/);
  assert.match(described.instructions.RELEASING, /rollback deployment/);
});

test("describe-workflow exposes exactly four actionable VERIFYING steps", async () => {
  const described = await executeArticleCommand(process.cwd(), { kind: "describe-workflow" }) as {
    verificationSteps: typeof verificationSteps;
    instructions: { VERIFYING: string };
  };

  assert.deepEqual(described.verificationSteps, verificationSteps);
  assert.deepEqual(described.verificationSteps.map((step) => step.id), [
    "validate-receipt-and-presentation",
    "check-production-evidence",
    "match-release-chain",
    "freeze-and-persist-live",
  ]);
  assert.equal(described.instructions.VERIFYING, instructionsForStage("VERIFYING"));
});

test("RELEASING executor writes exactly three actionable steps before awaiting its result", async () => {
  const parent = path.join(process.cwd(), ".scratch");
  await mkdir(parent, { recursive: true });
  const root = await mkdtemp(path.join(parent, "supervised-releasing-packet-"));
  const { writeFile } = await import("node:fs/promises");
  try {
    await writeFile(path.join(root, "approved-urls.md"), "");
    await writeFile(path.join(root, "article.md"), "# Synthetic release packet\n\nA long enough article body for an isolated supervised release packet test.");
    const created = await createArticleImport(root, "article.md");
    const record = {
      ...created,
      stage: "RELEASING" as const,
      format: "direct-review" as const,
      artifactPath: "src/generated/landing-pages/example.json",
    };
    const executor = createSupervisedImportExecutor(root);
    const pending = await executor({
      record,
      stage: "RELEASING",
      strategy: "release",
      attempt: 1,
      idempotencyKey: "a".repeat(64),
      leaseToken: "synthetic-release-lease",
      assertLease: async () => {},
    });

    assert.equal(pending.continuation?.kind, "work");
    if (pending.continuation?.kind !== "work") throw new Error("Missing RELEASING work packet");
    const packet = JSON.parse(await readFile(path.join(root, pending.continuation.workPath), "utf8"));
    assert.deepEqual(packet.releaseSteps.map((step: { id: string }) => step.id), ["validate-candidate", "review-and-deploy", "verify-production"]);
    assert.equal(packet.releaseSteps.length, 3);
    assert.match(packet.instructions, /1\. Validate the candidate:/);
    assert.match(packet.instructions, /2\. Review and deploy:/);
    assert.match(packet.instructions, /3\. Verify production:/);
    assert.equal(pending.continuation.resultPath, packet.resultPath);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the default CLI consumes bound research output and rejects a result for another source", async () => {
  const parent = path.join(process.cwd(), ".scratch");
  await mkdir(parent, { recursive: true });
  const root = await mkdtemp(path.join(parent, "supervised-binding-"));
  const { writeFile } = await import("node:fs/promises");
  try {
    await writeFile(path.join(root, "approved-urls.md"), "");
    await writeFile(path.join(root, "article.md"), "# A practical guide\n\nThis sufficiently long article describes a workflow and its trade-offs so the supervising agent can research a defensible topic.");
    const created = await createArticleImport(root, "article.md");
    await executeImportCommand(root, { kind: "resume", importId: created.importId });
    await executeImportCommand(root, { kind: "resume", importId: created.importId });
    const current = await loadImport(root, created.importId);
    assert.ok(current.continuation?.kind === "work");
    if (current.continuation?.kind !== "work") throw new Error("Missing research plan work");
    const evidencePath = "build-pack/article-import/research.json";
    const snapshotRef = await storeEvidence(root, created.importId, { source: "A mocked supported claim." });
    await writeJsonAtomically(path.join(root, evidencePath), { schemaVersion: "ResearchEvidenceV2", id: "research-fixture", createdAt: "2026-11-03T00:00:00.000Z", importId: created.importId, sourceFingerprint: created.sourceFingerprint, requirementRevision: WORKFLOW_REVISION, sources: [{ id: "source", url: "https://example.com/manual", retrievedAt: "2026-11-03T00:00:00.000Z", snapshotRef }], claims: [{ id: "claim", text: "A mocked supported claim.", sourceIds: ["source"], excerptLocations: [{ sourceId: "source", quote: "A mocked supported claim." }], limitations: [] }], freshness: "Synthetic fixture." });
    await writeGapPlanResult(root, current.continuation, { claimText: "A mocked supported claim.", sourceFingerprint: "0".repeat(64) });
    await executeImportCommand(root, { kind: "resume", importId: created.importId });
    const rejected = await loadImport(root, created.importId);
    assert.equal(rejected.stage, "RESEARCHING");
    assert.equal(rejected.resumeStage, "RESEARCHING");
    assert.match(rejected.stageReceipts.at(-1)!.message, /STAGE_RESULT_BINDING_MISMATCH/);
    await writeGapPlanResult(root, current.continuation, { claimText: "A mocked supported claim." });
    await executeImportCommand(root, { kind: "resume", importId: created.importId });
    const acquisition = await loadImport(root, created.importId);
    assert.ok(acquisition.continuation?.kind === "work");
    if (acquisition.continuation?.kind !== "work") throw new Error("Missing research acquisition work");
    await writeAcquisitionResult(root, acquisition.continuation, evidencePath);
    await executeImportCommand(root, { kind: "resume", importId: created.importId });
    assert.equal((await loadImport(root, created.importId)).stage, "TRANSFORMING");
    // A neutral (mode-"none") import must not be able to select the commercial direct-review format.
    await executeImportCommand(root, { kind: "resume", importId: created.importId });
    const transformPath = (await loadImport(root, created.importId)).nextAction.match(/execute (.*?)\.work\.json/)![1];
    const transformPacket = JSON.parse(await readFile(path.join(root, `${transformPath}.work.json`), "utf8"));
    assert.match(transformPacket.instructions, /1\. Prepare the intent brief and complete draft/);
    assert.match(transformPacket.instructions, /2\. Assess the full draft's claims, disclosure, SEO and AEO/);
    const neutralArtifact = { ...samplePageBlueprint, metadata: { ...samplePageBlueprint.metadata, canonical_url: "https://vettedsaasblueprint.online/imported-guide" } };
    await writeJsonAtomically(path.join(root, "src/generated/landing-pages/example.json"), neutralArtifact);
    await writeJsonAtomically(path.join(root, transformPacket.resultPath), { idempotencyKey: transformPacket.idempotencyKey, sourceFingerprint: transformPacket.sourceFingerprint, summary: "Mocked transform selecting the commercial format.", work: { stage: "TRANSFORMING", artifactPath: "src/generated/landing-pages/example.json", assessmentPath: "unused-because-commercial-gate-rejects.json", format: "direct-review" } });
    await executeImportCommand(root, { kind: "resume", importId: created.importId });
    const rejectedTransform = await loadImport(root, created.importId);
    assert.equal(rejectedTransform.stage, "TRANSFORMING");
    assert.match(rejectedTransform.stageReceipts.at(-1)!.message, /DIRECT_REVIEW_REQUIRES_APPROVED_COMMERCIAL_MODE/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("supervised transforming handoff reuses its checked artifact and advances to refining", async () => {
  const parent = path.join(process.cwd(), ".scratch");
  await mkdir(parent, { recursive: true });
  const root = await mkdtemp(path.join(parent, "supervised-transform-snapshot-"));
  const { writeFile } = await import("node:fs/promises");
  try {
    const affiliateUrl = "https://start.switcherstudio.com/anme6fqvgdx9";
    await writeFile(path.join(root, "approved-urls.md"), `- ${affiliateUrl}\n`);
    await writeFile(path.join(root, "article.md"), `---\naffiliate_name: "Switcher Studio"\naffiliate_url: "${affiliateUrl}"\n---\n\n# A practical guide\n\nThis sufficiently long article describes a workflow and its trade-offs so the supervising agent can research a defensible topic.`);
    const created = await createArticleImport(root, "article.md");
    const prepared = await prepareApprovalFixture(root, { ...created, format: "direct-review" });
    const executor = createSupervisedImportExecutor(root, undefined, { researchRegistry: fixtureResearchRegistry(root) });
    await executeImportCommand(root, { kind: "resume", importId: created.importId }, executor);
    await executeImportCommand(root, { kind: "resume", importId: created.importId }, executor);
    const research = (await loadImport(root, created.importId)).continuation;
    if (research?.kind !== "work") throw new Error("Missing research plan work");
    const researchEvidence = JSON.parse(await readFile(path.join(root, prepared.evidenceRefs.research.path), "utf8"));
    await writeGapPlanResult(root, research, { claimId: researchEvidence.claims[0].id, claimText: researchEvidence.claims[0].text });
    await executeImportCommand(root, { kind: "resume", importId: created.importId }, executor);
    const acquisition = (await loadImport(root, created.importId)).continuation;
    if (acquisition?.kind !== "work") throw new Error("Missing research acquisition work");
    await writeAcquisitionResult(root, acquisition, prepared.evidenceRefs.research.path);
    await executeImportCommand(root, { kind: "resume", importId: created.importId }, executor);
    await executeImportCommand(root, { kind: "resume", importId: created.importId }, executor);
    const transforming = await loadImport(root, created.importId);
    if (transforming.continuation?.kind !== "work") throw new Error("Missing transforming work");
    const packet = JSON.parse(await readFile(path.join(root, transforming.continuation.workPath), "utf8"));
    assert.match(packet.instructions, /1\. Prepare the intent brief and complete draft/);
    assert.match(packet.instructions, /2\. Assess the full draft's claims, disclosure, SEO and AEO/);
    await writeJsonAtomically(path.join(root, transforming.continuation.resultPath), { idempotencyKey: transforming.continuation.idempotencyKey, sourceFingerprint: created.sourceFingerprint, summary: "Completed synthetic transforming handoff.", work: { stage: "TRANSFORMING", artifactPath: prepared.artifactPath, assessmentPath: prepared.evidenceRefs.assessment.path, format: "direct-review" } });
    await executeImportCommand(root, { kind: "resume", importId: created.importId }, executor);
    assert.equal((await loadImport(root, created.importId)).stage, "REFINING");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("executor output failures remain repair work at the productive stage", async () => {
  const parent = path.join(process.cwd(), ".scratch");
  await mkdir(parent, { recursive: true });
  const root = await mkdtemp(path.join(parent, "supervised-repair-"));
  const { writeFile } = await import("node:fs/promises");
  try {
    await writeFile(path.join(root, "approved-urls.md"), "");
    await writeFile(path.join(root, "article.md"), "# Repairable guide\n\nThis article contains enough material for a supervised research handoff.");
    const created = await createArticleImport(root, "article.md");
    await executeImportCommand(root, { kind: "resume", importId: created.importId });
    await executeImportCommand(root, { kind: "resume", importId: created.importId }, async () => { throw new Error("INVALID_STAGE_RESULT"); });
    const current = await loadImport(root, created.importId);
    assert.equal(current.stage, "RESEARCHING");
    assert.match(current.nextAction, /Repair researching output/);
    assert.equal(current.stageReceipts.at(-1)?.status, "failed");
  } finally { await rm(root, { recursive: true, force: true }); }
});

for (const scenario of ["verified LIVE", "failed rollback", "catalogue repair and contention"]) test("dispatch handles " + scenario, async (t) => {
  const failRollback = scenario === "failed rollback";
  const repairCatalogue = scenario === "catalogue repair and contention";
  t.mock.timers.enable({ apis: ["Date"], now: Date.now() });
  const parent = path.join(process.cwd(), ".scratch");
  await mkdir(parent, { recursive: true });
  const root = await mkdtemp(path.join(parent, "supervised-import-"));
  const { writeFile } = await import("node:fs/promises");
  let commits = 0;
  let deployments = 0;
  let merged = false;
  let importId = "";
  const commit = "c".repeat(40);
  const pr = "https://github.com/example/repository/pull/1";
  const artifactPath = "src/generated/landing-pages/example.json";
  const authorityPath = "src/generated/landing-pages/index.json";
  let releaseFiles = [artifactPath, authorityPath];
  const operations: ReleaseOperations = {
    preflight: async () => ({ ok: true, reasons: [] }),
    inspectGit: async () => ({ clean: true, changedFiles: releaseFiles, headSha: "a".repeat(40), originMainSha: "a".repeat(40), fastForwardable: true }),
    refreshMain: async () => ({ clean: true, changedFiles: releaseFiles, headSha: "a".repeat(40), originMainSha: "a".repeat(40), fastForwardable: true }),
    runValidation: async () => ({ ok: true, summary: "Mocked repository checks passed." }),
    capturePreviousDeployment: async () => ({ deploymentId: "dpl-previous", commitSha: "b".repeat(40), verified: true }),
    commit: async () => { commits++; return commit; },
    preparePullRequest: async () => ({ url: pr, branch: `codex/article-import/${importId}`, reviewedCommitSha: commit }),
    inspectPullRequest: async () => ({ merged, ownerApproved: merged, headRefOid: commit, mergeCommitSha: merged ? commit : undefined }),
    checkoutMergedCommit: async () => {},
    verifyCodeReview: async () => {},
    reconcileDeployment: async () => ({ status: "not-found", evidence: ["production alias still resolves to the rollback target"] }),
    deploy: async (commitSha) => { deployments++; return { deploymentId: "dpl-current", canonicalUrl: "https://vettedsaasblueprint.online/imported-guide", commitSha }; },
    verifyProduction: async (deployment) => { if (failRollback) throw new Error("synthetic production verification failure"); return productionFixture(root, importId, importArtifactTarget("direct-review", JSON.parse(await readFile(path.join(root, artifactPath), "utf8"))), deployment, (await loadImport(root, importId)).sourceFingerprint); },
    rollback: async () => ({ ok: true, summary: "Mocked rollback." }),
    verifyRollback: async () => !failRollback,
  };
  try {
    await writeFile(path.join(root, "approved-urls.md"), "- https://start.switcherstudio.com/anme6fqvgdx9\n");
    await mkdir(path.join(root, "Article Intake"));
    await writeFile(path.join(root, "Article Intake/article.md"), `---\naffiliate_name: "Switcher Studio"\naffiliate_url: "https://start.switcherstudio.com/anme6fqvgdx9"\n---\n\n# Imported workflow guide\n\nA practical guide describing operating choices and trade-offs for teams preparing a production with several mobile devices.`);
    const created = await createArticleImport(root, "Article Intake/article.md");
    importId = created.importId;
    const prepared = await prepareApprovalFixture(root, { ...created, format: "direct-review" }, { currentPolicy: true });
    await mkdir(path.join(root, ".agents/skills/improve"), { recursive: true });
    await writeFile(path.join(root, ".agents/skills/improve/SKILL.md"), await readFile(".agents/skills/improve/SKILL.md"));
    await writeFile(path.join(root, "skills-lock.json"), await readFile("skills-lock.json"));
    const existing = { slug: "another-review", artifact: "another-review.json", title: "Existing published review" };
    await writeJsonAtomically(path.join(root, authorityPath), { generated_at: "preserve-me", pages: [existing] });
    const executor = createSupervisedImportExecutor(root, operations, { researchRegistry: fixtureResearchRegistry(root) });
    const current = () => loadImport(root, importId);
    await executeImportCommand(root, { kind: "resume", importId }, executor);
    await executeImportCommand(root, { kind: "resume", importId }, executor);
    const research = (await current()).continuation;
    assert.ok(research?.kind === "work");
    if (research?.kind !== "work") throw new Error("Missing research plan work");
    const researchEvidence = JSON.parse(await readFile(path.join(root, prepared.evidenceRefs.research.path), "utf8"));
    await writeGapPlanResult(root, research, { claimId: researchEvidence.claims[0].id, claimText: researchEvidence.claims[0].text });
    await executeImportCommand(root, { kind: "resume", importId }, executor);
    const acquisition = (await current()).continuation;
    if (acquisition?.kind !== "work") throw new Error("Missing research acquisition work");
    await writeAcquisitionResult(root, acquisition, prepared.evidenceRefs.research.path);
    const calls: string[] = [];
    const validationReceiptPath = "build-pack/article-import/presentation.json";
    let releaseResultPath = "";
    let proposalFile = "";
    const workerRunner: WorkerRunner = async ({ args }) => {
      const packet = JSON.parse(await readFile(args[args.indexOf("--file") + 1], "utf8"));
      if (packet.activity) {
        const result = { idempotencyKey: packet.idempotencyKey, sourceFingerprint: packet.sourceFingerprint, summary: "Completed synthetic activity checkpoint",
          activity: { ...packet.activity, reviewer: "fixture-reviewer", executionId: `${packet.activity.id}-${packet.activity.inputFingerprint.slice(0, 12)}`, outcome: "accepted", observation: "The bound synthetic activity criterion passed." } };
        const events = (await readFile("tests/fixtures/opencode-jsonl-fixture.jsonl", "utf8")).trim().split(/\r?\n/).map(line => JSON.parse(line));
        events.find(event => event.type === "text").part.text = JSON.stringify(result);
        return { stdout: events.map(event => JSON.stringify(event)).join("\n"), stderr: "", exitCode: 0, timedOut: false };
      }
      calls.push(packet.stage);
      let work;
      switch (packet.stage) {
        case "TRANSFORMING":
          work = { stage: packet.stage, artifactPath, format: "direct-review", assessmentPath: prepared.evidenceRefs.assessment.path };
          break;
        case "REFINING": {
          assert.match(packet.instructions, /eleanor-editorial/i);
          assert.match(packet.instructions, /independent review in a distinct verified execution context/i);
          assert.doesNotMatch(packet.instructions, /Beam review/i);
          assert.match(packet.instructions, /5\/5 CLEAN/i);
          const fingerprint = createHash("sha256").update((await readFile(path.join(root, artifactPath), "utf8")).replace(/\r\n/g, "\n")).digest("hex");
          proposalFile = path.join(root, packet.publicationProposals[0].proposalPath);
          await writeJsonAtomically(proposalFile, { pages: [{ slug: repairCatalogue ? "wrong" : "example", artifact: "example.json", release_receipt: "releases/example/release-receipt.json" }] });
          await writeJsonAtomically(path.join(root, "src/generated/landing-pages/releases/example/release-receipt.json"), { exact_affiliate_url: "https://start.switcherstudio.com/anme6fqvgdx9", artifacts: { page: { path: "example.json", sha256: fingerprint } } });
          work = { stage: packet.stage, artifactPath, editorialEvidencePath: prepared.editorialEvidencePath, formatQualityPath: prepared.formatQualityPath,
            editorialExecutionPath: prepared.evidenceRefs.editorial.path, assessmentPath: prepared.evidenceRefs.assessment.path };
          break;
        }
        case "VALIDATING": {
          const presented = await preparePresentationFixture(root, await current());
          await writeJsonAtomically(path.join(root, validationReceiptPath), presented.input.validationReceipt);
          work = { stage: packet.stage, validationReceiptPath, validationGate: "fixture:rendered-layout", presentationEvidencePath: presented.record.evidenceRefs!.presentation!.path };
          break;
        }
        case "RELEASING":
          releaseResultPath = packet.resultPath;
          releaseFiles = packet.requiredReleaseFiles;
          work = { stage: packet.stage, artifactPath, changedFiles: releaseFiles, slug: "example" };
          break;
        case "IMPROVE": {
          const assessment = await storeEvidence(root, importId, { schemaVersion: "ImproveAssessmentHandoffV1", publicationKey: packet.publicationKey, summary: "Synthetic assessment found no supported improvements." });
          const improveResult = { schemaVersion: "ImproveResultV1", publicationKey: packet.publicationKey, idempotencyKey: packet.idempotencyKey, phase: "ASSESSING", findings: [], limitations: [], handoffs: { assessment } };
          const events = (await readFile("tests/fixtures/opencode-jsonl-fixture.jsonl", "utf8")).trim().split(/\r?\n/).map(line => JSON.parse(line));
          events.find(event => event.type === "text").part.text = JSON.stringify(improveResult);
          return { stdout: events.map(event => JSON.stringify(event)).join("\n"), stderr: "", exitCode: 0, timedOut: false };
        }
        default: throw new Error("Unexpected worker stage " + packet.stage);
      }
      const result = { idempotencyKey: packet.idempotencyKey, sourceFingerprint: packet.sourceFingerprint, summary: "Completed synthetic stage", work };
      const events = (await readFile("tests/fixtures/opencode-jsonl-fixture.jsonl", "utf8")).trim().split(/\r?\n/).map(line => JSON.parse(line));
      events.find(event => event.type === "text").part.text = JSON.stringify(result);
      return { stdout: events.map(event => JSON.stringify(event)).join("\n"), stderr: "", exitCode: 0, timedOut: false };
    };
    let waits = 0;
    const sleep = async (delay: number) => {
      assert.equal(deployments, 0);
      assert.ok(delay > 0);
      assert.ok(++waits <= 2, "unexpected additional release wait");
      t.mock.timers.setTime(Date.now() + delay);
      if (waits === 2) { merged = true; return; }
      const codeReviewPath = ".automation/article-imports/reviews/review.json";
      await writeJsonAtomically(path.join(root, codeReviewPath), { schemaVersion: "ImportCodeReviewV1", reviewer: "codex", independent: true, passed: true,
        reviewedCommitSha: commit, pullRequestUrl: pr, evidenceUrl: pr + "#issuecomment-review", reviewedAt: new Date().toISOString() });
      const release = JSON.parse(await readFile(path.join(root, releaseResultPath), "utf8"));
      await writeJsonAtomically(path.join(root, releaseResultPath), { ...release, work: { ...release.work, codeReviewPath } });
    };
    const heartbeat = () => executeImportCommand(root, { kind: "dispatch", importId }, executor, { workerModel: "fixture/model", workerRunner, sleep });
    if (repairCatalogue) {
      await heartbeat();
      const repaired = await current();
      assert.equal(repaired.continuation?.kind, "repair");
      assert.match(repaired.stageReceipts.at(-1)!.message, /PUBLICATION_PROPOSAL_TARGET_MISMATCH/);
      await assert.rejects(heartbeat(), /UNCHANGED_SUBMISSION/);
      const proposal = JSON.parse(await readFile(proposalFile, "utf8"));
      proposal.pages[0].slug = "example";
      await writeJsonAtomically(proposalFile, proposal);
      const holder = await claimWorkflowLease(root, "publication", "direct-review");
      assert.ok(holder);
      const oneStep = () => executeImportCommand(root, { kind: "dispatch", importId }, executor, { maxSteps: 1,
        workerRunner: async () => { throw new Error("Corrected proposal must reuse the saved worker result"); } });
      try {
        await oneStep();
        const waiting = (await current()).continuation;
        assert.ok(waiting?.kind === "wait");
        assert.equal(waiting.dependency, "PUBLICATION_CATALOGUE_BUSY");
        t.mock.timers.setTime(Date.parse(waiting.nextCheckAt));
      } finally { await holder.release(); }
      await oneStep();
      assert.equal((await current()).stage, "VALIDATING", (await current()).nextAction);
      assert.deepEqual(calls, ["TRANSFORMING", "REFINING"]);
      const catalogue = JSON.parse(await readFile(path.join(root, authorityPath), "utf8"));
      assert.deepEqual(catalogue.pages[0], existing);
      assert.equal(catalogue.pages[1].slug, "example");
      return;
    }
    if (failRollback) {
      await heartbeat();
      await completeHeroHandoff(root, await current());
      await heartbeat();
    }
    else {
      await heartbeat();
      await completeHeroHandoff(root, await current());
      const intake = await createIntakeRun(root);
      const completed = await executeImportCommand(root, { kind: "dispatch-intake", runId: intake.runId }, executor, { workerModel: "fixture/model", workerRunner, sleep }) as IntakeRun;
      assert.equal(completed.outcome, "ALL_PUBLISHED", (await current()).nextAction);
      assert.equal(completed.entries[0].importId, importId);
    }
    assert.deepEqual(calls, failRollback ? ["TRANSFORMING", "REFINING", "VALIDATING", "RELEASING"] : ["TRANSFORMING", "REFINING", "VALIDATING", "RELEASING", "IMPROVE"]);
    assert.equal(waits, 2);
    const published = JSON.parse(await readFile(path.join(root, authorityPath), "utf8"));
    assert.deepEqual(published.pages[0], existing);
    assert.equal(published.generated_at, "preserve-me");
    assert.equal(published.pages.length, 2);
    if (failRollback) {
      const failed = await current();
      assert.equal(failed.stage, "WAITING_EXTERNAL");
      assert.ok(failed.continuation?.kind === "blocked");
      assert.match(failed.continuation.resumptionRequirement, /dpl-previous/);
      assert.equal(failed.pendingRelease?.operations?.deployment?.deploymentId, "dpl-current");
      assert.equal(failed.terminalRef, undefined);
      assert.equal(failed.improve, undefined);
      await heartbeat();
      assert.equal(deployments, 1);
      return;
    }
    const live = await current();
    assert.equal(live.stage, "LIVE");
    assert.ok(live.improve?.publicationKey);
    assert.equal(live.improve.boundCommitSha, live.release?.commitSha);
    await heartbeat();
    assert.equal(commits, 1);
    assert.equal(deployments, 1);
    assert.ok(await readFile(path.join(root, research.resultPath), "utf8"));
    const terminal = await current();
    assert.equal(terminal.improve?.publicationKey, live.improve.publicationKey);
    const terminalEvidence = await readEvidence(root, terminal.terminalRef!) as { commercialMode?: string; approvedAffiliateUrl?: string };
    assert.equal(terminalEvidence.commercialMode, "approved");
    assert.equal(terminalEvidence.approvedAffiliateUrl, terminal.transformation?.resolvedAffiliateUrl);
    assert.deepEqual((await evaluateWorkflowEvidence(terminal, { root }, "historical-terminal")).diagnostics, []);
    await rm(path.join(root, terminal.terminalRef!.path));
    await assert.rejects(heartbeat(), /TERMINAL_PROOF_INVALID/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
