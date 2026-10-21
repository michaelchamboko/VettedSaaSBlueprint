import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { executeImportCommand } from "../scripts/import-article";
import { createArticleImport, loadImport, writeJsonAtomically } from "../src/lib/article-import/engine";
import { createSupervisedImportExecutor } from "../src/lib/article-import/supervised-executor";
import type { ReleaseOperations } from "../src/lib/article-import/release";
import { approveFixture, presentFixture } from "./fixtures/article-content-approval";
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
    await executeImportCommand(root, { kind: "resume-pending" });
    await executeImportCommand(root, { kind: "resume-pending" });
    const current = await loadImport(root, created.importId);
    const workPath = current.nextAction.match(/execute (.*?)\.work\.json/)![1];
    const packet = JSON.parse(await readFile(path.join(root, `${workPath}.work.json`), "utf8"));
    const evidencePath = "build-pack/article-import/research.json";
    await writeJsonAtomically(path.join(root, evidencePath), { sources: [{ url: "https://example.com/manual", claims: ["A mocked supported claim."] }] });
    const result = { idempotencyKey: packet.idempotencyKey, sourceFingerprint: "0".repeat(64), summary: "Mocked research evidence.", work: { stage: "RESEARCHING", evidencePath } };
    await writeJsonAtomically(path.join(root, packet.resultPath), result);
    await executeImportCommand(root, { kind: "resume-pending" });
    const rejected = await loadImport(root, created.importId);
    assert.equal(rejected.stage, "WAITING_EXTERNAL");
    assert.equal(rejected.resumeStage, "RESEARCHING");
    assert.match(rejected.stageReceipts.at(-1)!.message, /STAGE_RESULT_BINDING_MISMATCH/);
    await writeJsonAtomically(path.join(root, packet.resultPath), { ...result, sourceFingerprint: created.sourceFingerprint });
    await executeImportCommand(root, { kind: "resume-pending" });
    assert.equal((await loadImport(root, created.importId)).stage, "TRANSFORMING");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("heartbeat consumes durable work after interruption and releases only after review and owner merge", async () => {
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
  const operations: ReleaseOperations = {
    preflight: async () => ({ ok: true, reasons: [] }),
    inspectGit: async () => ({ clean: true, changedFiles: [artifactPath], headSha: "a".repeat(40), originMainSha: "a".repeat(40), fastForwardable: true }),
    refreshMain: async () => ({ clean: true, changedFiles: [artifactPath], headSha: "a".repeat(40), originMainSha: "a".repeat(40), fastForwardable: true }),
    runValidation: async () => ({ ok: true, summary: "Mocked repository checks passed." }),
    capturePreviousDeployment: async () => ({ deploymentId: "dpl-previous", commitSha: "b".repeat(40), verified: true }),
    commit: async () => { commits++; return commit; },
    preparePullRequest: async () => ({ url: pr, branch: `codex/article-import/${importId}`, reviewedCommitSha: commit }),
    inspectPullRequest: async () => ({ merged, ownerApproved: merged, headRefOid: commit, mergeCommitSha: merged ? commit : undefined }),
    checkoutMergedCommit: async () => {},
    verifyCodeReview: async () => {},
    deploy: async (commitSha) => { deployments++; return { deploymentId: "dpl-current", canonicalUrl: "https://vettedsaasblueprint.online/imported-guide", commitSha }; },
    verifyProduction: async () => ({ routeOk: true, contentOk: true, disclosureOk: true, exactCtaOk: true, desktopOk: true, mobileOk: true, robotsOk: true, sitemapOk: true, browserErrorsOk: true }),
    rollback: async () => ({ ok: true, summary: "Mocked rollback." }),
    verifyRollback: async () => true,
  };
  try {
    await writeFile(path.join(root, "approved-urls.md"), "");
    await writeFile(path.join(root, "article.md"), "# Imported workflow guide\n\nA practical guide describing operating choices and trade-offs for teams preparing a production with several mobile devices.");
    const created = await createArticleImport(root, "article.md");
    importId = created.importId;
    // Each invocation constructs a fresh executor, as a later heartbeat process would.
    const heartbeat = () => executeImportCommand(root, { kind: "resume-pending" }, createSupervisedImportExecutor(root, operations));
    const current = () => loadImport(root, created.importId);
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
    await writeJsonAtomically(path.join(root, "build-pack/article-import/research.json"), { sources: [{ url: "https://example.com/documentation", claims: ["Mock evidence for the test workflow."] }] });
    const research = await submit({ stage: "RESEARCHING", evidencePath: "build-pack/article-import/research.json" });
    // The process stopped after producing evidence; the next invocation consumes it.
    assert.equal((await current()).stage, "RESEARCHING");
    await heartbeat();
    assert.equal((await current()).stage, "TRANSFORMING");
    const artifact = { ...samplePageBlueprint, metadata: { ...samplePageBlueprint.metadata, canonical_url: "https://vettedsaasblueprint.online/imported-guide" } };
    await writeJsonAtomically(path.join(root, artifactPath), artifact);
    await submit({ stage: "TRANSFORMING", artifactPath, format: "direct-review" });
    await heartbeat();
    assert.equal((await current()).stage, "REFINING");
    const approved = await approveFixture(root, await current());
    await submit({ stage: "REFINING", artifactPath, editorialEvidencePath: approved.contentApproval!.editorialEvidencePath, formatQualityPath: approved.contentApproval!.formatQualityPath });
    await heartbeat();
    assert.equal((await current()).stage, "VALIDATING");
    const validationReceiptPath = "build-pack/article-import/presentation.json";
    const presented = await presentFixture(root, await current());
    await writeJsonAtomically(path.join(root, validationReceiptPath), presented.presentation!.validation);
    await submit({ stage: "VALIDATING", validationReceiptPath, validationGate: "fixture:rendered-layout" });
    await heartbeat();
    assert.equal((await current()).stage, "RELEASING");
    const release = await submit({ stage: "RELEASING", artifactPath, changedFiles: [artifactPath], slug: "example" });
    await heartbeat();
    assert.equal((await current()).stage, "WAITING_EXTERNAL");
    assert.equal(deployments, 0);
    const codeReviewPath = ".automation/article-imports/reviews/review.json";
    await writeJsonAtomically(path.join(root, codeReviewPath), { schemaVersion: "ImportCodeReviewV1", reviewer: "codex", independent: true, passed: true, reviewedCommitSha: commit, pullRequestUrl: pr, evidenceUrl: `${pr}#issuecomment-review`, reviewedAt: new Date().toISOString() });
    await writeJsonAtomically(path.join(root, release.packet.resultPath), { ...release.result, work: { ...release.result.work, codeReviewPath } });
    await heartbeat();
    assert.equal((await current()).stage, "WAITING_EXTERNAL");
    assert.equal(deployments, 0);
    merged = true;
    await heartbeat();
    assert.equal((await current()).stage, "LIVE");
    await heartbeat();
    assert.equal(commits, 1);
    assert.equal(deployments, 1);
    assert.ok(await readFile(path.join(root, research.packet.resultPath), "utf8"));
  } finally { await rm(root, { recursive: true, force: true }); }
});
