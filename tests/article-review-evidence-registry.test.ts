import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  evaluateRegisteredReviewEvidence,
  registerBrowserReviewEvidence,
  reviewEvidenceRegistrationSchema,
  type ArticleReviewEvidenceRegistry,
  type ReviewEvidenceRegistration,
} from "../src/lib/article-import/review-evidence-registry";
import { evidenceReference } from "../src/lib/article-import/execution-evidence";
import { createArticleImport, loadImport, recordImportPresentation, saveImport, withImportLease, writeJsonAtomically } from "../src/lib/article-import/engine";
import { createSupervisedImportExecutor } from "../src/lib/article-import/supervised-executor";
import { prepareApprovalFixture, preparePresentationFixture } from "./fixtures/article-content-approval";

function isolatedRegistry(initial: ReviewEvidenceRegistration[] = []) {
  const records = [...initial];
  return {
    records,
    async list(input) {
      return records.filter((record) => record.importId === input.importId && record.evidenceClass === input.evidenceClass);
    },
    async listAll(input) {
      return records.filter((record) => record.evidenceClass === input.evidenceClass);
    },
    async commit(input) {
      const existing = records.find((record) => record.registrationId === input.registrationId);
      if (!existing) records.push(reviewEvidenceRegistrationSchema.parse(input));
      return { registrationId: input.registrationId, replayed: Boolean(existing) };
    },
  } satisfies ArticleReviewEvidenceRegistry & { records: ReviewEvidenceRegistration[] };
}

test("registered review evidence varies relevance, support, integrity, and freshness independently", async () => {
  const parent = path.join(process.cwd(), ".scratch");
  await mkdir(parent, { recursive: true });
  const root = await mkdtemp(path.join(parent, "review-evidence-registry-"));
  try {
    await writeFile(path.join(root, "editorial.json"), JSON.stringify({ verdict: "pass" }));
    const evidenceRef = await evidenceReference(root, "editorial.json");
    const control = reviewEvidenceRegistrationSchema.parse({
      schemaVersion: "ArticleReviewEvidenceRegistrationV1",
      registrationId: "11111111-1111-4111-8111-111111111111",
      evidenceClass: "editorial-judgment",
      importId: "article-11111111-1111-4111-8111-111111111111",
      sourceFingerprint: "a".repeat(64),
      examinedRevision: "b".repeat(64),
      reviewer: { id: "independent-editor", independent: true },
      criteria: [{ id: "editorial-fidelity", revision: "2026-11-27" }],
      evidenceRef,
      retentionDependencies: [evidenceRef],
      support: "accepted",
      registeredAt: "2026-11-27T12:00:00.000Z",
      payload: {
        kind: "editorial-judgment",
        artifactPath: "article.json",
        assessmentRef: evidenceRef,
        editorialExecutionRef: evidenceRef,
        contentApproval: {
          schemaVersion: "ImportContentApprovalV1",
          artifactPath: "article.json",
          format: "direct-review",
          schemaRevision: "PageBlueprintV1",
          artifactFingerprint: "b".repeat(64),
          sourceFingerprint: "a".repeat(64),
          editorialRevision: "slopmonster-full-rewrite-v2:8bf609edfaeed844f1d03bb6b69f80dc21728c8b",
          editorialEvidencePath: "editorial.json",
          editorialEvidenceFingerprint: evidenceRef.sha256,
          formatQualityPath: "quality.json",
          formatQualityFingerprint: "c".repeat(64),
          approvedAt: "2026-11-27T12:00:00.000Z",
        },
      },
    });
    const context = {
      root,
      importId: control.importId,
      sourceFingerprint: control.sourceFingerprint,
      examinedRevision: control.examinedRevision,
      now: "2026-11-27T13:00:00.000Z",
    };

    assert.deepEqual(await evaluateRegisteredReviewEvidence(control, context), {
      relevance: true,
      support: true,
      integrity: true,
      freshness: true,
      reusable: true,
    });
    assert.equal((await evaluateRegisteredReviewEvidence({ ...control, examinedRevision: "c".repeat(64) }, context)).relevance, false);
    assert.equal((await evaluateRegisteredReviewEvidence({ ...control, support: "rejected" }, context)).support, false);
    assert.equal((await evaluateRegisteredReviewEvidence({ ...control, evidenceRef: { ...evidenceRef, sha256: "d".repeat(64) } }, context)).integrity, false);
    assert.equal((await evaluateRegisteredReviewEvidence({ ...control, expiresAt: "2026-11-27T12:30:00.000Z" }, context)).freshness, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the supervised controller registers and reuses an independently reviewed editorial approval", async () => {
  const parent = path.join(process.cwd(), ".scratch");
  await mkdir(parent, { recursive: true });
  const root = await mkdtemp(path.join(parent, "review-evidence-controller-"));
  try {
    await writeFile(path.join(root, "approved-urls.md"), "");
    await writeFile(path.join(root, "article.md"), "# Evidence guide\n\nA synthetic article used only for isolated controller verification.");
    const created = await createArticleImport(root, "article.md");
    const prepared = await prepareApprovalFixture(root, { ...created, format: "direct-review" });
    const refining = {
      ...created,
      stage: "REFINING" as const,
      format: "direct-review" as const,
      artifactPath: prepared.artifactPath,
      evidenceRefs: {
        research: prepared.evidenceRefs.research,
        transformAssessment: prepared.evidenceRefs.assessment,
        assessment: prepared.evidenceRefs.assessment,
      },
    };
    const registry = isolatedRegistry();
    const executor = createSupervisedImportExecutor(root, undefined, { reviewEvidenceRegistry: registry });
    const context = {
      record: refining,
      stage: "REFINING" as const,
      strategy: "validate",
      attempt: 1,
      idempotencyKey: "a".repeat(64),
      leaseToken: "synthetic-review-registry",
      assertLease: async () => {},
    };
    let pending = await executor(context);
    while (pending.continuation?.kind === "work" && pending.continuation.activityId) {
      const activityPacket = JSON.parse(await readFile(path.join(root, pending.continuation.workPath), "utf8")) as {
        activity: Record<string, unknown> & { id: string; inputFingerprint: string };
      };
      await writeJsonAtomically(path.join(root, pending.continuation.resultPath), {
        idempotencyKey: pending.continuation.idempotencyKey,
        sourceFingerprint: refining.sourceFingerprint,
        summary: "Completed an isolated editorial activity.",
        activity: {
          ...activityPacket.activity,
          reviewer: "independent-editorial-fixture",
          executionId: `${activityPacket.activity.id}-${activityPacket.activity.inputFingerprint.slice(0, 12)}`,
          outcome: "accepted",
          observation: "The bound synthetic editorial criterion passed.",
        },
      });
      pending = await executor({ ...context, record: pending });
      if (!pending.continuation) pending = await executor({ ...context, record: pending });
    }
    assert.equal(pending.continuation?.kind, "work");
    if (pending.continuation?.kind !== "work") throw new Error("Missing editorial finalization packet");
    await writeJsonAtomically(path.join(root, pending.continuation.resultPath), {
      idempotencyKey: pending.continuation.idempotencyKey,
      sourceFingerprint: refining.sourceFingerprint,
      summary: "Completed isolated editorial review.",
      work: {
        stage: "REFINING",
        artifactPath: prepared.artifactPath,
        assessmentPath: prepared.evidenceRefs.assessment.path,
        editorialExecutionPath: prepared.evidenceRefs.editorial.path,
        editorialEvidencePath: prepared.editorialEvidencePath,
        formatQualityPath: prepared.formatQualityPath,
      },
    });
    const approved = await executor({ ...context, record: pending });
    assert.equal(approved.stage, "VALIDATING");
    assert.equal(registry.records.length, 1);
    assert.equal(registry.records[0].evidenceClass, "editorial-judgment");
    assert.equal(registry.records[0].reviewer.independent, true);
    assert.ok(registry.records[0].criteria.length > 0);
    assert.ok(registry.records[0].retentionDependencies.length > 2);

    await withImportLease(root, created.importId, async () => saveImport(root, {
      ...refining,
      stateRevision: approved.stateRevision,
      updatedAt: approved.updatedAt,
    }));
    const replayInput = await loadImport(root, created.importId);
    const replay = await executor({ ...context, record: replayInput, idempotencyKey: "b".repeat(64) });
    assert.equal(replay.stage, "VALIDATING");
    assert.equal(replay.continuation, undefined);
    assert.equal(replay.reviewEvidence?.editorial?.action, "reused");

    const presentationFixture = await preparePresentationFixture(root, replay);
    const tampered = {
      ...presentationFixture.record,
      presentation: {
        ...(await recordImportPresentation(root, presentationFixture.record, presentationFixture.input)).presentation!,
        evidenceFiles: [{ path: "missing-browser-observation.json", sha256: "f".repeat(64) }],
      },
    };
    await assert.rejects(registerBrowserReviewEvidence(root, registry, tampered), /ENOENT|PRESENTATION_EVIDENCE_CHANGED/);
    assert.equal(registry.records.length, 1, "invalid replacement browser evidence must not be registered");

    const presented = await loadImport(root, created.importId);
    const browserRegistration = await registerBrowserReviewEvidence(root, registry, presented);
    assert.equal(browserRegistration.evidenceClass, "browser-observation");
    assert.ok(browserRegistration.criteria.some((criterion) => criterion.id === "presentation:desktop"));
    assert.ok(browserRegistration.criteria.some((criterion) => criterion.id === "presentation:reduced-motion"));

    await withImportLease(root, created.importId, async () => saveImport(root, {
      ...replay,
      stateRevision: presented.stateRevision,
      updatedAt: presented.updatedAt,
      presentation: undefined,
      evidenceRefs: { ...replay.evidenceRefs, presentation: undefined },
    }));
    const validating = await loadImport(root, created.importId);
    const browserReuse = await executor({ ...context, record: validating, stage: "VALIDATING", idempotencyKey: "c".repeat(64) });
    assert.equal(browserReuse.stage, "RELEASING");
    assert.equal(browserReuse.reviewEvidence?.browser?.action, "reused");

    const storedBrowser = registry.records.find((record) => record.registrationId === browserRegistration.registrationId)!;
    storedBrowser.expiresAt = "2026-01-01T00:00:00.000Z";
    await withImportLease(root, created.importId, async () => saveImport(root, {
      ...validating,
      stateRevision: browserReuse.stateRevision,
      updatedAt: browserReuse.updatedAt,
      presentation: undefined,
      evidenceRefs: { ...validating.evidenceRefs, presentation: undefined },
    }));
    const staleInput = await loadImport(root, created.importId);
    const stale = await executor({ ...context, record: staleInput, stage: "VALIDATING", idempotencyKey: "d".repeat(64) });
    assert.equal(stale.continuation?.kind, "work", "stale browser evidence must dispatch VALIDATING work");
    assert.equal(stale.reviewEvidence?.browser?.action, "reacquire");
    assert.equal(stale.reviewEvidence?.browser?.dimensions.freshness, false);
    assert.equal(stale.reviewEvidence?.editorial?.action, "reused", "independent editorial approval survives browser reacquisition");
    assert.deepEqual(stale.evidenceRefs?.research, validating.evidenceRefs?.research, "research registration remains preserved");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
