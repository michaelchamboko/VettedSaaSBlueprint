import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { executeFixtureCommand as executeImportCommand } from "./fixtures/article-command";
import { createArticleImport, loadImport, writeJsonAtomically } from "../src/lib/article-import/engine";
import { createSupervisedImportExecutor } from "../src/lib/article-import/supervised-executor";
import type { ReleaseOperations } from "../src/lib/article-import/release";
import { prepareApprovalFixture, presentFixture } from "./fixtures/article-content-approval";
import { storeEvidence } from "../src/lib/article-import/execution-evidence";
import { WORKFLOW_REVISION } from "../src/lib/article-import/workflow-requirements";
import { productionFixture } from "./fixtures/article-production-evidence";
import { importArtifactTarget } from "../src/lib/article-import/format-validation";
import { samplePageBlueprint } from "./fixtures/sample-page-blueprint";

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
    const workPath = current.nextAction.match(/execute (.*?)\.work\.json/)![1];
    const packet = JSON.parse(await readFile(path.join(root, `${workPath}.work.json`), "utf8"));
    const evidencePath = "build-pack/article-import/research.json";
    const snapshotRef = await storeEvidence(root, created.importId, { source: "A mocked supported claim." });
    await writeJsonAtomically(path.join(root, evidencePath), { schemaVersion: "ResearchEvidenceV2", id: "research-fixture", createdAt: "2026-11-03T00:00:00.000Z", importId: created.importId, sourceFingerprint: created.sourceFingerprint, requirementRevision: WORKFLOW_REVISION, sources: [{ id: "source", url: "https://example.com/manual", retrievedAt: "2026-11-03T00:00:00.000Z", snapshotRef }], claims: [{ id: "claim", text: "A mocked supported claim.", sourceIds: ["source"], excerptLocations: [{ sourceId: "source", quote: "A mocked supported claim." }], limitations: [] }], freshness: "Synthetic fixture." });
    const result = { idempotencyKey: packet.idempotencyKey, sourceFingerprint: "0".repeat(64), summary: "Mocked research evidence.", work: { stage: "RESEARCHING", evidencePath } };
    await writeJsonAtomically(path.join(root, packet.resultPath), result);
    await executeImportCommand(root, { kind: "resume", importId: created.importId });
    const rejected = await loadImport(root, created.importId);
    assert.equal(rejected.stage, "RESEARCHING");
    assert.equal(rejected.resumeStage, "RESEARCHING");
    assert.match(rejected.stageReceipts.at(-1)!.message, /STAGE_RESULT_BINDING_MISMATCH/);
    await writeJsonAtomically(path.join(root, packet.resultPath), { ...result, sourceFingerprint: created.sourceFingerprint });
    await executeImportCommand(root, { kind: "resume", importId: created.importId });
    assert.equal((await loadImport(root, created.importId)).stage, "TRANSFORMING");
    // A neutral (mode-"none") import must not be able to select the commercial direct-review format.
    await executeImportCommand(root, { kind: "resume", importId: created.importId });
    const transformPath = (await loadImport(root, created.importId)).nextAction.match(/execute (.*?)\.work\.json/)![1];
    const transformPacket = JSON.parse(await readFile(path.join(root, `${transformPath}.work.json`), "utf8"));
    const neutralArtifact = { ...samplePageBlueprint, metadata: { ...samplePageBlueprint.metadata, canonical_url: "https://vettedsaasblueprint.online/imported-guide" } };
    await writeJsonAtomically(path.join(root, "src/generated/landing-pages/example.json"), neutralArtifact);
    await writeJsonAtomically(path.join(root, transformPacket.resultPath), { idempotencyKey: transformPacket.idempotencyKey, sourceFingerprint: transformPacket.sourceFingerprint, summary: "Mocked transform selecting the commercial format.", work: { stage: "TRANSFORMING", artifactPath: "src/generated/landing-pages/example.json", assessmentPath: "unused-because-commercial-gate-rejects.json", format: "direct-review" } });
    await executeImportCommand(root, { kind: "resume", importId: created.importId });
    const rejectedTransform = await loadImport(root, created.importId);
    assert.equal(rejectedTransform.stage, "TRANSFORMING");
    assert.match(rejectedTransform.stageReceipts.at(-1)!.message, /DIRECT_REVIEW_REQUIRES_APPROVED_COMMERCIAL_MODE/);
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

test("heartbeat consumes durable work after interruption and releases only after review and owner merge", async (t) => {
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
  const operations: ReleaseOperations = {
    preflight: async () => ({ ok: true, reasons: [] }),
    inspectGit: async () => ({ clean: true, changedFiles: [artifactPath, authorityPath], headSha: "a".repeat(40), originMainSha: "a".repeat(40), fastForwardable: true }),
    refreshMain: async () => ({ clean: true, changedFiles: [artifactPath, authorityPath], headSha: "a".repeat(40), originMainSha: "a".repeat(40), fastForwardable: true }),
    runValidation: async () => ({ ok: true, summary: "Mocked repository checks passed." }),
    capturePreviousDeployment: async () => ({ deploymentId: "dpl-previous", commitSha: "b".repeat(40), verified: true }),
    commit: async () => { commits++; return commit; },
    preparePullRequest: async () => ({ url: pr, branch: `codex/article-import/${importId}`, reviewedCommitSha: commit }),
    inspectPullRequest: async () => ({ merged, ownerApproved: merged, headRefOid: commit, mergeCommitSha: merged ? commit : undefined }),
    checkoutMergedCommit: async () => {},
    verifyCodeReview: async () => {},
    deploy: async (commitSha) => { deployments++; return { deploymentId: "dpl-current", canonicalUrl: "https://vettedsaasblueprint.online/imported-guide", commitSha }; },
    verifyProduction: async (deployment) => productionFixture(root, importId, importArtifactTarget("direct-review", JSON.parse(await readFile(path.join(root, artifactPath), "utf8"))), deployment, (await loadImport(root, importId)).sourceFingerprint),
    rollback: async () => ({ ok: true, summary: "Mocked rollback." }),
    verifyRollback: async () => true,
  };
  try {
    await writeFile(path.join(root, "approved-urls.md"), "- https://start.switcherstudio.com/anme6fqvgdx9\n");
    await writeFile(path.join(root, "article.md"), `---\naffiliate_name: "Switcher Studio"\naffiliate_url: "https://start.switcherstudio.com/anme6fqvgdx9"\n---\n\n# Imported workflow guide\n\nA practical guide describing operating choices and trade-offs for teams preparing a production with several mobile devices.`);
    const created = await createArticleImport(root, "article.md");
    importId = created.importId;
    const prepared = await prepareApprovalFixture(root, { ...created, format: "direct-review" });
    // Each invocation constructs a fresh executor, as a later heartbeat process would.
    const heartbeat = () => executeImportCommand(root, { kind: "resume", importId: created.importId }, createSupervisedImportExecutor(root, operations));
    const current = () => loadImport(root, created.importId);
    const reachNextCheck = async () => {
      const waiting = await current();
      assert.ok(waiting.continuation?.kind === "wait");
      t.mock.timers.setTime(Date.parse(waiting.continuation.nextCheckAt));
    };
    const submit = async (work: Record<string, unknown>) => {
      await heartbeat();
      const record = await current();
      const workPath = record.nextAction.match(/execute (.*?)\.work\.json/)?.[1];
      assert.ok(workPath, record.nextAction);
      const packet = JSON.parse(await readFile(path.join(root, `${workPath}.work.json`), "utf8"));
      assert.equal(packet.stage, work.stage);
      const result = { idempotencyKey: packet.idempotencyKey, sourceFingerprint: packet.sourceFingerprint, summary: "Completed mocked agent work with retained evidence.", work };
      await writeJsonAtomically(path.join(root, packet.resultPath), result);
      return { packet, result };
    };
    await heartbeat();
    assert.equal((await current()).stage, "RESEARCHING");
    const research = await submit({ stage: "RESEARCHING", evidencePath: prepared.evidenceRefs.research.path });
    // The process stopped after producing evidence; the next invocation consumes it.
    assert.equal((await current()).stage, "RESEARCHING");
    await heartbeat();
    assert.equal((await current()).stage, "TRANSFORMING");
    // Approved direct-review releases bind to the manifest-selected receipt URL and artefact fingerprint.
    await writeJsonAtomically(path.join(root, authorityPath), { pages: [{ slug: "example", artifact: "example.json", release_receipt: "releases/example/release-receipt.json" }] });
    await submit({ stage: "TRANSFORMING", artifactPath, format: "direct-review", assessmentPath: prepared.evidenceRefs.assessment.path });
    await heartbeat();
    assert.equal((await current()).stage, "REFINING");
    const refinement = await submit({ stage: "REFINING", artifactPath, editorialEvidencePath: prepared.editorialEvidencePath, formatQualityPath: prepared.formatQualityPath, editorialExecutionPath: prepared.evidenceRefs.editorial.path, assessmentPath: prepared.evidenceRefs.assessment.path });
    assert.match(refinement.packet.instructions, /eleanor-editorial/i);
    assert.match(refinement.packet.instructions, /Beam review/i);
    assert.match(refinement.packet.instructions, /5\/5 CLEAN/i);
    await heartbeat();
    assert.equal((await current()).stage, "VALIDATING");
    const validationReceiptPath = "build-pack/article-import/presentation.json";
    // Publication inputs exist before presentation captures rendering dependencies.
    const artifactFingerprint = createHash("sha256").update((await readFile(path.join(root, artifactPath))).toString("utf8").replace(/\r\n/g, "\n")).digest("hex");
    await writeJsonAtomically(path.join(root, "src/generated/landing-pages/releases/example/release-receipt.json"), { exact_affiliate_url: "https://start.switcherstudio.com/anme6fqvgdx9", artifacts: { page: { path: "example.json", sha256: artifactFingerprint } } });
    const presented = await presentFixture(root, { ...await current(), evidenceRefs: prepared.evidenceRefs });
    await writeJsonAtomically(path.join(root, validationReceiptPath), presented.presentation!.validation);
    await submit({ stage: "VALIDATING", validationReceiptPath, validationGate: "fixture:rendered-layout", presentationEvidencePath: presented.evidenceRefs!.presentation!.path });
    await heartbeat();
    assert.equal((await current()).stage, "RELEASING");
    const release = await submit({ stage: "RELEASING", artifactPath, changedFiles: [artifactPath, authorityPath], slug: "example" });
    await heartbeat();
    assert.equal((await current()).stage, "WAITING_EXTERNAL");
    assert.equal(deployments, 0);
    const codeReviewPath = ".automation/article-imports/reviews/review.json";
    await writeJsonAtomically(path.join(root, codeReviewPath), { schemaVersion: "ImportCodeReviewV1", reviewer: "codex", independent: true, passed: true, reviewedCommitSha: commit, pullRequestUrl: pr, evidenceUrl: `${pr}#issuecomment-review`, reviewedAt: new Date().toISOString() });
    await writeJsonAtomically(path.join(root, release.packet.resultPath), { ...release.result, work: { ...release.result.work, codeReviewPath } });
    await reachNextCheck();
    await heartbeat();
    assert.equal((await current()).stage, "WAITING_EXTERNAL");
    assert.equal(deployments, 0);
    merged = true;
    await heartbeat();
    assert.equal((await current()).stage, "WAITING_EXTERNAL");
    assert.equal(deployments, 0);
    await reachNextCheck();
    await heartbeat();
    assert.equal((await current()).stage, "LIVE");
    await heartbeat();
    assert.equal(commits, 1);
    assert.equal(deployments, 1);
    assert.ok(await readFile(path.join(root, research.packet.resultPath), "utf8"));
  } finally { await rm(root, { recursive: true, force: true }); }
});
