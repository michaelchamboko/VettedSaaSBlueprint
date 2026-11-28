import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  advanceImport,
  createArticleImport,
  executePendingImport,
  recordImportRelease,
  verifyImportRelease,
  writeJsonAtomically,
} from "../../../../src/lib/article-import/engine";
import {
  improveChecklistPath,
  recordImproveFindings,
  resolveImproveFindings,
  retainImproveMeasurement,
} from "../../../../src/lib/article-import/improve-checklist";
import { evidenceReference, storeEvidence } from "../../../../src/lib/article-import/execution-evidence";
import { importArtifactTarget } from "../../../../src/lib/article-import/format-validation";
import { fingerprintEditorialArtifact } from "../../../../src/lib/editorial/refinement";
import { approveFixture, presentFixture } from "../../../../tests/fixtures/article-content-approval";
import { persistFixture } from "../../../../tests/fixtures/article-command";
import { productionFixture } from "../../../../tests/fixtures/article-production-evidence";
import { createRecoveryEvidenceRun } from "../run-output";

const fixtureParent = path.resolve(".scratch/recovery-104");
const revision = "f026bca8b53aecca829262e9a27820ac6d078892";
const runOutput = createRecoveryEvidenceRun(104);
const observations: unknown[] = [];
const requiredMode = process.env.RECOVERY_ASSERT_REQUIRED === "1";
const allowlist = "- https://start.switcherstudio.com/anme6fqvgdx9\n";
const source = `---
title: "Synthetic recovery boundary"
primary_question: "How does recovery preserve publication history?"
affiliate_name: "Switcher Studio"
affiliate_url: "https://start.switcherstudio.com/anme6fqvgdx9"
---

Synthetic source used only by the isolated issue 104 probe.
`;

async function fixtureRoot(label: string) {
  await mkdir(fixtureParent, { recursive: true });
  const root = await mkdtemp(path.join(fixtureParent, `${label}-`));
  await writeFile(path.join(root, "approved-urls.md"), allowlist);
  await writeFile(path.join(root, "article.md"), source);
  return root;
}

async function dispose(root: string) {
  const relative = path.relative(fixtureParent, path.resolve(root));
  assert.ok(relative && !relative.startsWith("..") && !path.isAbsolute(relative));
  await rm(root, { recursive: true, force: true });
}

async function releasingFixture(root: string) {
  let record = await createArticleImport(root, "article.md");
  record = await approveFixture(root, { ...record, stage: "REFINING" });
  record = await presentFixture(root, { ...record, stage: "VALIDATING" });
  record = await advanceImport(root, record, "Synthetic presentation accepted.");
  const artifact = JSON.parse(await readFile(path.resolve(root, record.contentApproval!.artifactPath), "utf8"));
  const target = importArtifactTarget(record.format as "direct-review", artifact);
  const reviewedCommitSha = "a".repeat(40);
  const commitSha = "b".repeat(40);
  const canonicalUrl = new URL(target.renderedRoutes[0], "https://vettedsaasblueprint.online").href;
  record.pendingRelease = {
    schemaVersion: "ImportPendingReleaseV1",
    branch: `codex/article-import/${record.importId}`,
    reviewedCommitSha,
    mergeCommitSha: commitSha,
    pullRequestUrl: "https://github.com/example/repo/pull/104",
    createdAt: new Date().toISOString(),
    operations: {
      review: { reviewedHeadSha: reviewedCommitSha, evidenceUrl: "https://github.com/example/repo/pull/104#review" },
      merge: { reviewedHeadSha: reviewedCommitSha, mergeCommitSha: commitSha },
      deployment: { commitSha, operationKey: `deployment:${commitSha}`, deploymentId: "dpl_recovery_104", url: canonicalUrl },
    },
  };
  return persistFixture(root, record);
}

async function liveFixture(root: string) {
  const releasing = await releasingFixture(root);
  const artifact = JSON.parse(await readFile(path.resolve(root, releasing.contentApproval!.artifactPath), "utf8"));
  const target = importArtifactTarget(releasing.format as "direct-review", artifact);
  const commitSha = releasing.pendingRelease!.mergeCommitSha!;
  const deployment = {
    commitSha,
    deploymentId: releasing.pendingRelease!.operations!.deployment!.deploymentId,
    canonicalUrl: releasing.pendingRelease!.operations!.deployment!.url,
  };
  const checks = await productionFixture(root, releasing.importId, target, deployment, releasing.sourceFingerprint);
  const verifying = await recordImportRelease(root, releasing, {
    schemaVersion: "ImportReleaseV1",
    commitSha,
    deploymentId: deployment.deploymentId,
    canonicalUrl: deployment.canonicalUrl,
    presentationFingerprint: fingerprintEditorialArtifact(releasing.presentation),
    verifiedAt: new Date().toISOString(),
    productionVerifierRef: checks.productionVerifierRef,
    checks: {
      routeOk: true,
      contentOk: true,
      disclosureOk: true,
      exactCtaOk: true,
      desktopOk: true,
      mobileOk: true,
      robotsOk: true,
      sitemapOk: true,
      browserErrorsOk: true,
    },
  });
  return verifyImportRelease(root, verifying);
}

test("a failed acceptance check remains pre-publication repair", async () => {
  const root = await fixtureRoot("pre-publication");
  try {
    const releasing = await releasingFixture(root);
    const beforeReceipts = structuredClone(releasing.stageReceipts);
    const repaired = await executePendingImport(root, releasing.importId, async () => {
      throw new Error("SYNTHETIC_ACCEPTANCE_CHECK_FAILED: canonical route did not match");
    });
    assert.equal(repaired.stage, "RELEASING");
    assert.equal(repaired.continuation?.kind, "repair");
    assert.equal(repaired.continuation?.stage, "RELEASING");
    assert.match(repaired.continuation?.kind === "repair" ? repaired.continuation.requiredChange : "", /Repair releasing output/);
    assert.equal(repaired.release, undefined);
    assert.equal(repaired.terminalRef, undefined);
    assert.equal(repaired.improve, undefined);
    assert.deepEqual(repaired.stageReceipts.slice(0, beforeReceipts.length), beforeReceipts);

    const explicitRepairOwner = "repairOwner" in (repaired.continuation ?? {});
    observations.push({
      case: "pre-publication-acceptance-failure",
      expected: "Route required acceptance failure to pre-publication repair, identify its owner and next work, and do not create publication or IMPROVE state.",
      observed: {
        stage: repaired.stage,
        continuation: repaired.continuation?.kind === "repair" ? {
          kind: repaired.continuation.kind,
          stage: repaired.continuation.stage,
          diagnosisRequired: repaired.continuation.diagnosisRequired,
          requiredChange: repaired.continuation.requiredChange,
        } : repaired.continuation,
        repairOwner: explicitRepairOwner ? (repaired.continuation as Record<string, unknown>).repairOwner : null,
        ownerInferredFromStage: repaired.continuation?.kind === "repair" ? repaired.continuation.stage : null,
        nextWork: repaired.continuation?.kind === "repair" ? repaired.continuation.requiredChange : null,
        pendingReleaseRetained: Boolean(repaired.pendingRelease),
        releaseReceiptCreated: Boolean(repaired.release),
        terminalEvidenceCreated: Boolean(repaired.terminalRef),
        improveCreated: Boolean(repaired.improve),
        priorHistoryPrefixUnchanged: true,
      },
    });
    if (requiredMode) assert.equal(explicitRepairOwner, true, "pre-publication repair should record an explicit repair owner");
  } finally {
    await dispose(root);
  }
});

test("a verified publication defect uses IMPROVE and preserves acceptance history", async () => {
  const root = await fixtureRoot("post-publication");
  try {
    const live = await liveFixture(root);
    assert.equal(live.stage, "LIVE");
    assert.ok(live.improve && live.terminalRef && live.release);
    const terminalBefore = await readFile(path.join(root, live.terminalRef.path));
    const runBefore = await readFile(path.join(root, live.improve.runRef.path));
    const historyBefore = structuredClone(live.stageReceipts);
    const publicationKey = live.improve.publicationKey;
    const baseCommit = live.release.commitSha;
    const firstCommit = "c".repeat(40);
    const changedCommit = "d".repeat(40);
    const priorKey = "published-route-control";
    const defectKey = "later-cta-regression";

    const improved = await executePendingImport(root, live.importId, async () => {
      throw new Error("ordinary stage executor must not run for LIVE IMPROVE");
    }, {
      improveExecutor: async ({ record, assignment }) => {
        const laterObservation = await storeEvidence(root, record.importId, {
          event: "later verified-publication inspection",
          routeControl: "pass",
          ctaDestination: "mismatch",
        });
        const findings = [
          {
            key: priorKey,
            step: "production acceptance",
            expected: "route control stays matched",
            observed: "route control needed a retained control check",
            consequence: "later corrections could regress the serving route",
            excerpt: "ImportReleaseV1",
            evidence: [assignment.runRef, laterObservation],
          },
          {
            key: defectKey,
            step: "production acceptance",
            expected: "CTA destination matches the accepted affiliate destination",
            observed: "later inspection found a CTA destination mismatch",
            consequence: "the verified article could send a reader to the wrong destination",
            excerpt: "ImportReleaseV1",
            evidence: [assignment.runRef, laterObservation],
          },
        ];
        await recordImproveFindings(root, publicationKey, findings, record.importId, {
          runRef: assignment.runRef,
          terminalRef: record.terminalRef!,
        });

        const measurement = async (key: string, commitSha: string, outcome: "fail" | "pass", value: unknown) => {
          const output = await storeEvidence(root, record.importId, value);
          return retainImproveMeasurement(root, publicationKey, {
            key,
            check: key === priorKey ? "route identity check" : "CTA destination check",
            commitSha,
            outcome,
            output,
          });
        };
        const review = async (commitSha: string) => {
          const reviewPath = `.automation/article-imports/improve/${publicationKey}/reviews/${commitSha}.json`;
          await writeJsonAtomically(path.join(root, reviewPath), {
            schemaVersion: "ImportCodeReviewV1",
            reviewer: "codex",
            independent: true,
            passed: true,
            reviewedCommitSha: commitSha,
            pullRequestUrl: `https://github.com/example/repo/pull/${commitSha === firstCommit ? 105 : 106}`,
            evidenceUrl: `https://github.com/example/repo/pull/${commitSha === firstCommit ? 105 : 106}#review`,
            reviewedAt: new Date().toISOString(),
          });
          return evidenceReference(root, path.join(root, reviewPath));
        };
        const reviewer = {
          inspectPullRequest: async (url: string) => ({
            state: "MERGED" as const,
            merged: true,
            headRefOid: url.endsWith("105") ? firstCommit : changedCommit,
            mergeCommitSha: "e".repeat(40),
          }),
          verifyCodeReview: async () => undefined,
        };

        const priorBefore = await measurement(priorKey, baseCommit, "fail", { routeMatches: false, revision: baseCommit });
        const priorAfter = await measurement(priorKey, firstCommit, "pass", { routeMatches: true, revision: firstCommit });
        await resolveImproveFindings(root, publicationKey, [{
          key: priorKey,
          commitSha: firstCommit,
          before: priorBefore,
          after: priorAfter,
          review: await review(firstCommit),
          regressionChecks: [],
        }], reviewer, baseCommit);

        const defectBefore = await measurement(defectKey, baseCommit, "fail", { destinationMatches: false, revision: baseCommit });
        const defectAfter = await measurement(defectKey, changedCommit, "pass", { destinationMatches: true, revision: changedCommit });
        const routeRegression = await measurement(priorKey, changedCommit, "pass", { routeMatches: true, revision: changedCommit });
        await resolveImproveFindings(root, publicationKey, [{
          key: defectKey,
          commitSha: changedCommit,
          before: defectBefore,
          after: defectAfter,
          review: await review(changedCommit),
          regressionChecks: [{ key: priorKey, evidence: routeRegression }],
        }], reviewer, baseCommit);

        return {
          ...record,
          improve: {
            ...assignment,
            phase: "COMPLETE",
            issueKeys: [priorKey, defectKey],
            resolvedKeys: [priorKey, defectKey],
            openKeys: [],
            completedAt: new Date().toISOString(),
          },
        };
      },
    });

    const checklist = JSON.parse(await readFile(path.join(root, improveChecklistPath), "utf8"));
    const defect = checklist.find((item: { key: string }) => item.key === defectKey);
    assert.equal(improved.stage, "LIVE");
    assert.equal(improved.improve?.phase, "COMPLETE");
    assert.equal(defect.status, "resolved");
    assert.equal(defect.occurrences[0].publication, publicationKey);
    assert.equal(defect.resolutions[0].publication, publicationKey);
    assert.equal(defect.resolutions[0].commitSha, changedCommit);
    assert.deepEqual(defect.resolutions[0].regressionChecks.map((item: { key: string }) => item.key), [priorKey]);
    assert.deepEqual(improved.terminalRef, live.terminalRef);
    assert.deepEqual(improved.release, live.release);
    assert.deepEqual(improved.stageReceipts, historyBefore);
    assert.deepEqual(await readFile(path.join(root, live.terminalRef.path)), terminalBefore);
    assert.deepEqual(await readFile(path.join(root, live.improve.runRef.path)), runBefore);

    observations.push({
      case: "verified-publication-improve",
      expected: "Record a later defect under IMPROVE, bind its before and after measurements and directly affected regressions, and preserve original publication acceptance history.",
      observed: {
        stage: improved.stage,
        improvePhase: improved.improve?.phase,
        occurrenceLinkedToPublication: defect.occurrences[0].publication === publicationKey,
        resolutionLinkedToPublication: defect.resolutions[0].publication === publicationKey,
        originalMeasurementCommit: baseCommit,
        changedRevision: changedCommit,
        afterMeasurementOutcome: "pass",
        regressionChecks: [priorKey],
        terminalReferenceUnchanged: true,
        releaseReceiptUnchanged: true,
        stageReceiptHistoryUnchanged: true,
        terminalBytesUnchanged: true,
        improveRunSnapshotBytesUnchanged: true,
        checklistDefect: {
          key: defect.key,
          status: defect.status,
          occurrenceCount: defect.occurrences.length,
          resolutionCount: defect.resolutions.length,
          changedRevision: defect.resolutions[0].commitSha,
          regressionKeys: defect.resolutions[0].regressionChecks.map((item: { key: string }) => item.key),
        },
      },
    });
  } finally {
    await dispose(root);
  }
});

test.after(async () => {
  if (requiredMode) return;
  const { outputDirectory, testedCheckoutRevision } = await runOutput;
  const output = path.join(outputDirectory, "observations.json");
  await writeFile(output, JSON.stringify({
    investigatedRevision: revision,
    testedCheckoutRevision,
    probeHead: createHash("sha256").update(await readFile(fileURLToPath(import.meta.url))).digest("hex"),
    syntheticOnly: true,
    productCodeChanged: false,
    observations,
  }, null, 2) + "\n");
  process.stdout.write(`RECOVERY_104_OUTPUT=${output}\n`);
});
