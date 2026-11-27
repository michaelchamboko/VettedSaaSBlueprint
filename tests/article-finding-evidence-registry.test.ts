import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { PGlite } from "@electric-sql/pglite";

import { evidenceReference } from "../src/lib/article-import/execution-evidence";
import { createArticleImport, executePendingImport, loadImport, writeJsonAtomically } from "../src/lib/article-import/engine";
import { NeonArticleReviewEvidenceRegistry } from "../src/lib/article-import/review-evidence-registry-neon";
import { evaluateRegisteredReviewEvidence, reconcileActivityFindingEvidence } from "../src/lib/article-import/review-evidence-registry";
import { createSupervisedImportExecutor } from "../src/lib/article-import/supervised-executor";
import { prepareApprovalFixture } from "./fixtures/article-content-approval";
import { persistFixture } from "./fixtures/article-command";

test("the canonical SQL register persists rejected findings through the Neon adapter", async () => {
  const db = new PGlite();
  const parent = path.resolve(".scratch/article-finding-register");
  await mkdir(parent, { recursive: true });
  const root = await mkdtemp(path.join(parent, "sql-"));
  try {
    await db.exec("create schema article_research;");
    await db.exec(await readFile(path.join(process.cwd(), "db/article-review-evidence-v001.sql"), "utf8"));
    const registry = new NeonArticleReviewEvidenceRegistry(async (sql, params) => db.query(sql, params) as never);
    const evidencePath = "finding-registry-original.json";
    await writeFile(path.join(root, evidencePath), JSON.stringify({ observation: "The original supported claim is absent." }));
    const originalEvidenceRef = await evidenceReference(root, evidencePath);
    const registration = {
      schemaVersion: "ArticleReviewEvidenceRegistrationV1",
      registrationId: "11111111-1111-4111-8111-111111111116",
      evidenceClass: "rejected-finding",
      importId: "article-11111111-1111-4111-8111-111111111111",
      sourceFingerprint: "a".repeat(64),
      examinedRevision: "b".repeat(64),
      reviewer: { id: "original-reviewer", independent: true },
      criteria: [{ id: "refining.meaning-and-evidence", revision: "2026-11-27" }],
      evidenceRef: originalEvidenceRef,
      retentionDependencies: [originalEvidenceRef],
      support: "rejected",
      registeredAt: "2026-11-27T12:00:00.000Z",
      payload: {
        kind: "rejected-finding",
        findingId: "finding-111111111111111111111111",
        stage: "REFINING",
        activityId: "meaning-and-evidence",
        observation: "The original supported claim is absent.",
        expectedCheck: "Recheck the missing support against the changed article.",
        provenance: { status: "known", reviewer: "original-reviewer", executionId: "review-1" },
        applicability: { status: "applicable", reason: "The criterion applies to the examined article revision." },
        protectedReferences: [originalEvidenceRef],
      },
    } as const;

    assert.deepEqual(await registry.commit(registration as never), { registrationId: registration.registrationId, replayed: false });
    assert.deepEqual(await registry.list({ importId: registration.importId, evidenceClass: registration.evidenceClass as never }), [registration]);
  } finally {
    await Promise.all([db.close(), rm(root, { recursive: true, force: true })]);
  }
});

test("the supervised controller registers a rejected finding with its original bytes", async () => {
  const db = new PGlite();
  const parent = path.resolve(".scratch/article-finding-register");
  await mkdir(parent, { recursive: true });
  const root = await mkdtemp(path.join(parent, "case-"));
  try {
    await db.exec("create schema article_research;");
    await db.exec(await readFile(path.join(process.cwd(), "db/article-review-evidence-v001.sql"), "utf8"));
    const registry = new NeonArticleReviewEvidenceRegistry(async (sql, params) => db.query(sql, params) as never);
    await writeFile(path.join(root, "approved-urls.md"), "");
    await writeFile(path.join(root, "article.md"), "# Synthetic finding article\n");
    const created = await createArticleImport(root, "article.md");
    const prepared = await prepareApprovalFixture(root, { ...created, stage: "REFINING", format: "direct-review" }, { currentPolicy: true, structuredEditorial: true });
    const initial = await persistFixture(root, {
      ...created,
      stage: "REFINING",
      format: "direct-review",
      artifactPath: prepared.artifactPath,
      evidenceRefs: prepared.evidenceRefs,
    });
    const executor = createSupervisedImportExecutor(root, undefined, { reviewEvidenceRegistry: registry });
    const pending = await executePendingImport(root, initial.importId, executor);
    assert.equal(pending.continuation?.kind, "work");
    if (pending.continuation?.kind !== "work") throw new Error("Expected activity work.");
    const packet = JSON.parse(await readFile(path.join(root, pending.continuation.workPath), "utf8"));
    const originalResult = {
      idempotencyKey: pending.continuation.idempotencyKey,
      sourceFingerprint: pending.sourceFingerprint,
      summary: "Rejected the synthetic activity.",
      activity: {
        ...packet.activity,
        reviewer: "original-reviewer",
        executionId: "original-review-1",
        outcome: "rejected",
        observation: "The original supported claim is absent.",
      },
    };
    await writeJsonAtomically(path.join(root, pending.continuation.resultPath), originalResult);
    const rejected = await executePendingImport(root, initial.importId, executor);
    const finding = rejected.activityFindings?.[0];
    assert.ok(finding);

    const registrations = await registry.list({ importId: initial.importId, evidenceClass: "rejected-finding" as never });
    assert.equal(registrations.length, 1);
    assert.equal(registrations[0].payload.kind, "rejected-finding");
    assert.equal(registrations[0].payload.findingId, finding.findingId);
    assert.equal(registrations[0].payload.provenance.status, "known");
    assert.deepEqual(JSON.parse(await readFile(path.join(root, registrations[0].evidenceRef.path), "utf8")), originalResult);
    assert.ok(registrations[0].payload.protectedReferences.some((ref) => ref.sha256 === finding.originalEvidenceRef.sha256));
    assert.deepEqual(await evaluateRegisteredReviewEvidence(registrations[0], {
      root,
      importId: initial.importId,
      sourceFingerprint: initial.sourceFingerprint,
      examinedRevision: finding.revision,
      now: "2026-11-27T13:00:00.000Z",
    }), { relevance: true, support: true, integrity: true, freshness: true, reusable: true });

    const artifactPath = path.join(root, prepared.artifactPath);
    const artifact = JSON.parse(await readFile(artifactPath, "utf8"));
    await writeJsonAtomically(artifactPath, { ...artifact, syntheticRepair: "added-the-missing-support" });
    const restartedExecutor = createSupervisedImportExecutor(root, undefined, { reviewEvidenceRegistry: registry });
    const repairPending = await executePendingImport(root, initial.importId, restartedExecutor);
    assert.equal(repairPending.continuation?.kind, "work");
    if (repairPending.continuation?.kind !== "work") throw new Error("Expected finding-bound repair work.");
    const repairPacket = JSON.parse(await readFile(path.join(root, repairPending.continuation.workPath), "utf8"));
    assert.equal(repairPacket.activity.openFindings[0].findingId, finding.findingId);
    await writeJsonAtomically(path.join(root, "resolution-observation.json"), { observation: "The repaired claim is now supported." });
    await writeJsonAtomically(path.join(root, "regression-observation.json"), { observation: "The directly affected criterion still passes." });
    const resolutionRef = await evidenceReference(root, "resolution-observation.json");
    const regressionRef = await evidenceReference(root, "regression-observation.json");
    const changedArtifactRef = repairPacket.activity.dependencyRefs.find((ref: { path: string }) => ref.path === prepared.artifactPath);
    assert.ok(changedArtifactRef);
    await writeJsonAtomically(path.join(root, repairPending.continuation.resultPath), {
      idempotencyKey: repairPending.continuation.idempotencyKey,
      sourceFingerprint: repairPending.sourceFingerprint,
      summary: "Independently verified the synthetic repair.",
      activity: {
        ...repairPacket.activity,
        reviewer: "independent-resolution-reviewer",
        executionId: "independent-resolution-1",
        outcome: "accepted",
        observation: "The original defect and directly affected regression were checked.",
        findingReviews: [{
          findingId: finding.findingId,
          disposition: "verified-repair",
          expectedCheck: finding.expectedCheck,
          observation: "The repaired claim is supported by the changed article bytes.",
          evidenceRefs: [resolutionRef],
          changedInputRefs: [changedArtifactRef],
          regressionChecks: [{ criterion: finding.criterion, observation: "The original criterion passes on the changed revision.", outcome: "passed", evidenceRefs: [regressionRef] }],
        }],
      },
    });
    const resolved = await executePendingImport(root, initial.importId, restartedExecutor);
    assert.equal(resolved.activityFindings?.[0].status, "resolved");
    const resolutions = await registry.list({ importId: initial.importId, evidenceClass: "finding-resolution" as never });
    assert.equal(resolutions.length, 1);
    assert.equal(resolutions[0].payload.kind, "finding-resolution");
    assert.equal(resolutions[0].payload.findingId, finding.findingId);
    assert.equal(resolutions[0].reviewer.independent, true);
    assert.ok(resolutions[0].payload.protectedReferences.some((ref) => ref.sha256 === finding.originalEvidenceRef.sha256));
    assert.deepEqual(JSON.parse(await readFile(path.join(root, registrations[0].evidenceRef.path), "utf8")), originalResult, "replacement and restart preserve the exact original result bytes");

    const dimensionContext = {
      root,
      importId: initial.importId,
      sourceFingerprint: initial.sourceFingerprint,
      examinedRevision: resolutions[0].examinedRevision,
      now: "2026-11-27T13:00:00.000Z",
    };
    assert.deepEqual(await evaluateRegisteredReviewEvidence(resolutions[0], dimensionContext), {
      relevance: true,
      support: true,
      integrity: true,
      freshness: true,
      reusable: true,
    });
    assert.equal((await evaluateRegisteredReviewEvidence({ ...resolutions[0], examinedRevision: "c".repeat(64) }, dimensionContext)).relevance, false);
    assert.equal((await evaluateRegisteredReviewEvidence({ ...resolutions[0], support: "insufficient-evidence" }, dimensionContext)).support, false);
    assert.equal((await evaluateRegisteredReviewEvidence({ ...resolutions[0], evidenceRef: { ...resolutions[0].evidenceRef, sha256: "d".repeat(64) } }, dimensionContext)).integrity, false);
    assert.equal((await evaluateRegisteredReviewEvidence({ ...resolutions[0], expiresAt: "2026-11-27T12:30:00.000Z" }, dimensionContext)).freshness, false);

    await db.query("delete from article_research.review_evidence_registrations where registration_id = $1::uuid", [resolutions[0].registrationId]);
    const missingRecovered = await executePendingImport(root, initial.importId, createSupervisedImportExecutor(root, undefined, { reviewEvidenceRegistry: registry }));
    assert.equal(missingRecovered.activityFindings?.[0].status, "resolved", "missing registration is reacquired from validated immutable evidence");
    const recoveredResolutions = await registry.list({ importId: initial.importId, evidenceClass: "finding-resolution" as never });
    assert.equal(recoveredResolutions.length, 1);
    assert.equal(recoveredResolutions[0].registrationId, resolutions[0].registrationId);

    const survivor = {
      ...recoveredResolutions[0],
      registrationId: "22222222-2222-4222-8222-222222222226",
      examinedRevision: "e".repeat(64),
      payload: {
        ...recoveredResolutions[0].payload,
        findingId: "finding-222222222222222222222222",
        reviewId: "finding-review-222222222222222222222222",
      },
    };
    await registry.commit(survivor);
    const historicalMissingProvenance = {
      ...registrations[0],
      registrationId: "33333333-3333-4333-8333-333333333336",
      examinedRevision: "f".repeat(64),
      payload: {
        ...registrations[0].payload,
        findingId: "finding-333333333333333333333333",
        provenance: { status: "missing", reason: "The legacy reviewer identity was never retained." },
      },
    };
    await registry.commit(historicalMissingProvenance);
    const missingProvenanceDimensions = await evaluateRegisteredReviewEvidence(historicalMissingProvenance, {
      root,
      importId: initial.importId,
      sourceFingerprint: initial.sourceFingerprint,
      examinedRevision: historicalMissingProvenance.examinedRevision,
      now: "2026-11-27T13:00:00.000Z",
    });
    assert.equal(missingProvenanceDimensions.support, false, "unknown historical provenance remains explicit and cannot approve reuse");

    const corruptResolution = { ...recoveredResolutions[0], evidenceRef: { ...recoveredResolutions[0].evidenceRef, sha256: "0".repeat(64) } };
    await db.query("update article_research.review_evidence_registrations set registration = $1::jsonb where registration_id = $2::uuid", [JSON.stringify(corruptResolution), recoveredResolutions[0].registrationId]);
    const corruptReacquisition = await reconcileActivityFindingEvidence(root, registry, await loadImport(root, initial.importId));
    assert.equal(corruptReacquisition.activityFindings?.[0].status, "open", "corrupt resolution evidence returns to the owning activity");
    await db.query("update article_research.review_evidence_registrations set registration = $1::jsonb where registration_id = $2::uuid", [JSON.stringify(recoveredResolutions[0]), recoveredResolutions[0].registrationId]);

    await db.query(
      "update article_research.review_evidence_registrations set registration = jsonb_set(registration, '{expiresAt}', $1::jsonb) where registration_id = $2::uuid",
      [JSON.stringify("2000-01-01T00:00:00.000Z"), recoveredResolutions[0].registrationId],
    );
    const expired = (await registry.list({ importId: initial.importId, evidenceClass: "finding-resolution" as never })).find((entry) => entry.registrationId === recoveredResolutions[0].registrationId);
    assert.equal(expired?.expiresAt, "2000-01-01T00:00:00.000Z");
    const audited = await reconcileActivityFindingEvidence(root, registry, await loadImport(root, initial.importId));
    assert.equal(audited.activityFindings?.[0].status, "open");

    const reacquiring = await executePendingImport(root, initial.importId, createSupervisedImportExecutor(root, undefined, { reviewEvidenceRegistry: registry }));
    assert.equal(reacquiring.activityFindings?.[0].status, "open");
    assert.equal(reacquiring.continuation?.activityId, finding.activityId);
    assert.equal((await registry.list({ importId: initial.importId, evidenceClass: "finding-resolution" as never })).length, 2, "the unaffected independent resolution survives");
    const retainedHistorical = await registry.list({ importId: initial.importId, evidenceClass: "rejected-finding" as never });
    assert.ok(retainedHistorical.some((entry) => entry.payload.kind === "rejected-finding" && entry.payload.provenance.status === "missing"));
  } finally {
    await Promise.all([db.close(), rm(root, { recursive: true, force: true })]);
  }
});
