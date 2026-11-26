import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  advanceImport,
  createArticleImport,
  ensureImportContentApproval,
  executePendingImport,
  loadImport,
  resumeImport,
} from "../src/lib/article-import/engine";
import { longFormAffiliateAssessmentSchema } from "../src/lib/article-import/long-form-affiliate";
import { WORKFLOW_REVISION } from "../src/lib/article-import/workflow-requirements";
import { storeEvidence } from "../src/lib/article-import/workflow-evidence";
import { persistFixture } from "./fixtures/article-command";

const destination = "https://example.test/approved-affiliate";
const at = "2026-11-26T00:00:00.000Z";

async function fixture(affiliate = true) {
  const parent = path.join(process.cwd(), ".scratch");
  await mkdir(parent, { recursive: true });
  const root = await mkdtemp(path.join(parent, "transforming-reconciliation-"));
  await writeFile(path.join(root, "approved-urls.md"), affiliate ? `- ${destination}\n` : "");
  const frontmatter = affiliate
    ? `---\ntitle: Legacy affiliate review\naffiliate_name: Example\naffiliate_url: ${destination}\n---\n`
    : "---\ntitle: Neutral workflow guide\n---\n";
  await writeFile(path.join(root, "article.md"), `${frontmatter}# Guide\n\nA retained source explains the workflow and its limits.`);
  const created = await createArticleImport(root, "article.md");
  const snapshotRef = await storeEvidence(root, created.importId, { text: "A retained source explains the workflow and its limits." });
  const research = await storeEvidence(root, created.importId, {
    schemaVersion: "ResearchEvidenceV2",
    id: "legacy-research",
    createdAt: at,
    importId: created.importId,
    sourceFingerprint: created.sourceFingerprint,
    requirementRevision: WORKFLOW_REVISION,
    sources: [{ id: "source", url: "https://example.test/source", retrievedAt: at, snapshotRef }],
    claims: [{
      id: "claim",
      text: "A retained source explains the workflow and its limits.",
      sourceIds: ["source"],
      excerptLocations: [{ sourceId: "source", quote: "A retained source explains the workflow and its limits." }],
      limitations: ["Synthetic recovery fixture."],
    }],
    freshness: "Fixed synthetic input for deterministic recovery tests.",
  });
  return { root, created, research };
}

function legacyAssessment(created: Awaited<ReturnType<typeof createArticleImport>>, research: { path: string; sha256: string }, longFormAffiliate?: unknown) {
  return {
    schemaVersion: "ContentAssessmentV1",
    id: "legacy-transforming-assessment",
    createdAt: at,
    importId: created.importId,
    sourceFingerprint: created.sourceFingerprint,
    requirementRevision: WORKFLOW_REVISION,
    format: "direct-review",
    artifactFingerprint: "f".repeat(64),
    schemaRevision: "PageBlueprintV1",
    intent: { audience: "Legacy buyer", decision: "Whether the workflow fits", query: "legacy workflow review", pageType: "direct-review" },
    ...(longFormAffiliate ? { longFormAffiliate } : {}),
    researchRef: research,
    claimCoverage: [{ claimId: "claim", artifactPaths: ["hero.headline"] }],
    ruleResults: [{ ruleId: "legacy-transforming-rule", revision: WORKFLOW_REVISION, status: "pass", rationale: "The retained assessment passed the rule active at creation.", evidenceRefs: [research] }],
    reviewerExecutionRef: research,
    findings: [],
  };
}

function releaseJournal() {
  return {
    schemaVersion: "ImportPendingReleaseV1" as const,
    reviewedCommitSha: "a".repeat(40),
    branch: "codex/article-import/legacy-transform" as const,
    createdAt: at,
    rollbackDeploymentId: "dpl-known-good",
    rollbackCommitSha: "b".repeat(40),
    operations: { rollback: { deploymentId: "dpl-known-good", restoredCommitSha: "b".repeat(40) } },
  };
}

test("the first work packet returns an old approved-affiliate record to Transforming without resetting recovery history", async () => {
  const { root, created, research } = await fixture();
  try {
    const oldAssessment = await storeEvidence(root, created.importId, legacyAssessment(created, research));
    const diagnosis = {
      schemaVersion: "DiagnosisV1" as const,
      importId: created.importId,
      sourceFingerprint: created.sourceFingerprint,
      stage: "REFINING",
      failedSubmissionDigest: "c".repeat(64),
      replacementSubmissionDigest: "d".repeat(64),
      failureCode: "LEGACY_TRANSFORMING_RECEIPT",
      cause: "The retained Transforming receipt predates the buyer brief.",
      attemptedRecoveryRefs: [research],
      remedyEvidenceRefs: [research],
      createdAt: at,
    };
    const legacy = await persistFixture(root, {
      ...created,
      stage: "REFINING",
      artifactPath: "build-pack/editorial/legacy.json",
      evidenceRefs: { research, assessment: oldAssessment, editorial: research, presentation: research, production: research },
      repairStageTotals: { TRANSFORMING: 2, REFINING: 1 },
      strategyAttempts: { transform: 4, "repair:transform:legacy": 2 },
      diagnoses: [diagnosis],
      recoveryRefs: [research],
      continuation: {
        kind: "work",
        stage: "REFINING",
        workPath: ".automation/article-imports/work/legacy.work.json",
        resultPath: ".automation/article-imports/work/legacy.result.json",
      },
      stageReceipts: [...created.stageReceipts, { stage: "REFINING", status: "started", at, message: "Legacy refinement started." }],
      nextAction: "Continue legacy refinement.",
    });
    const priorReceipts = structuredClone(legacy.stageReceipts);

    const packetStages: string[] = [];
    const migrated = await executePendingImport(root, legacy.importId, async (context) => {
      packetStages.push(context.stage);
      return context.record;
    });

    assert.equal(migrated.stage, "TRANSFORMING");
    assert.deepEqual(packetStages, ["TRANSFORMING"]);
    assert.deepEqual(migrated.evidenceRefs, { research });
    assert.equal(migrated.artifactPath, legacy.artifactPath);
    assert.deepEqual(migrated.repairStageTotals, legacy.repairStageTotals);
    assert.deepEqual(migrated.strategyAttempts, legacy.strategyAttempts);
    assert.deepEqual(migrated.diagnoses, legacy.diagnoses);
    assert.deepEqual(migrated.recoveryRefs, legacy.recoveryRefs);
    assert.equal(migrated.continuation, undefined);
    assert.deepEqual(migrated.stageReceipts.slice(0, priorReceipts.length), priorReceipts);
    assert.match(migrated.stageReceipts.at(-1)!.message, /WORKFLOW_REQUIREMENT_MIGRATION/);
    assert.match(migrated.stageReceipts.at(-1)!.message, /legacy\.work\.json/);
    assert.deepEqual(await loadImport(root, created.importId), JSON.parse(JSON.stringify(migrated)));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("an active release journal blocks migration until verified recovery and remains intact", async () => {
  const { root, created, research } = await fixture();
  try {
    const pendingRelease = releaseJournal();
    const oldAssessment = await storeEvidence(root, created.importId, legacyAssessment(created, research));
    const releasing = await persistFixture(root, {
      ...created,
      stage: "RELEASING",
      evidenceRefs: { research, assessment: oldAssessment },
      pendingRelease,
      repairStageTotals: { TRANSFORMING: 1, RELEASING: 2 },
      strategyAttempts: { release: 3 },
      stageReceipts: [...created.stageReceipts, { stage: "RELEASING", status: "started", at, message: "Legacy release started." }],
      nextAction: "Continue the retained release.",
    });
    const packetStages: string[] = [];

    const blocked = await executePendingImport(root, releasing.importId, async (context) => {
      packetStages.push(context.stage);
      return context.record;
    });

    assert.deepEqual(packetStages, []);
    assert.equal(blocked.stage, "RELEASING");
    assert.equal(blocked.continuation?.kind, "blocked");
    assert.deepEqual(blocked.pendingRelease, pendingRelease);
    assert.deepEqual(blocked.repairStageTotals, releasing.repairStageTotals);
    assert.deepEqual(blocked.strategyAttempts, releasing.strategyAttempts);
    assert.match(blocked.stageReceipts.at(-1)!.message, /WORKFLOW_REQUIREMENT_MIGRATION_BLOCKED/);
    const receiptCount = blocked.stageReceipts.length;
    const repeated = await ensureImportContentApproval(root, blocked);
    assert.equal(repeated.stage, "RELEASING");
    assert.equal(repeated.continuation?.kind, "blocked");
    assert.equal(repeated.stageReceipts.length, receiptCount);
    assert.deepEqual(repeated.pendingRelease, pendingRelease);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("an affiliate candidate with no retained assessment follows the ordinary fail-closed approval path", async () => {
  const { root, created, research } = await fixture();
  try {
    const candidate = await persistFixture(root, {
      ...created,
      stage: "VALIDATING",
      evidenceRefs: { research },
      stageReceipts: [...created.stageReceipts, { stage: "VALIDATING", status: "started", at, message: "Candidate validation started." }],
      nextAction: "Validate the candidate.",
    });

    const rejected = await ensureImportContentApproval(root, candidate);

    assert.equal(rejected.stage, "REFINING");
    assert.doesNotMatch(rejected.stageReceipts.at(-1)!.message, /WORKFLOW_REQUIREMENT_MIGRATION/);
    assert.match(rejected.stageReceipts.at(-1)!.message, /Content approval is missing/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("content approval reconciliation returns a pre-rule assessment without a buyer brief to Transforming", async () => {
  const { root, created, research } = await fixture();
  try {
    const preRuleAssessment = await storeEvidence(root, created.importId, legacyAssessment(created, research));
    const legacy = await persistFixture(root, {
      ...created,
      stage: "VALIDATING",
      evidenceRefs: { research, transformAssessment: preRuleAssessment, assessment: research, editorial: research },
      stageReceipts: [...created.stageReceipts, { stage: "VALIDATING", status: "started", at, message: "Legacy validation started." }],
      nextAction: "Continue legacy validation.",
    });

    const migrated = await ensureImportContentApproval(root, legacy);

    assert.equal(migrated.stage, "TRANSFORMING");
    assert.deepEqual(migrated.evidenceRefs, { research });
    assert.match(migrated.stageReceipts.at(-1)!.message, new RegExp(preRuleAssessment.path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("neutral in-flight content is not moved by affiliate migration", async () => {
  const { root, created, research } = await fixture(false);
  try {
    const neutral = await persistFixture(root, {
      ...created,
      stage: "REFINING",
      evidenceRefs: { research },
      stageReceipts: [...created.stageReceipts, { stage: "REFINING", status: "started", at, message: "Neutral refinement started." }],
      nextAction: "Continue neutral refinement.",
    });

    const resumed = await resumeImport(root, neutral);

    assert.equal(resumed.stage, "REFINING");
    assert.deepEqual(resumed.stageReceipts, neutral.stageReceipts);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("ordinary Transforming advancement still evaluates current evidence", async () => {
  const { root, created, research } = await fixture(false);
  try {
    const transforming = await persistFixture(root, {
      ...created,
      stage: "TRANSFORMING",
      evidenceRefs: { research },
      stageReceipts: [...created.stageReceipts, { stage: "TRANSFORMING", status: "started", at, message: "Current transformation started." }],
      nextAction: "Complete current transformation.",
    });

    await assert.rejects(
      advanceImport(root, transforming, "Transformation completed."),
      /WORKFLOW_EVIDENCE_REQUIRED:assessment/,
    );
    assert.equal((await loadImport(root, created.importId)).stage, "TRANSFORMING");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a genuine accepted buyer brief remains at Refining", async () => {
  const { root, created, research } = await fixture();
  try {
    const longFormAffiliate = longFormAffiliateAssessmentSchema.parse({
      artifactFingerprint: "e".repeat(64),
      wordCount: 2050,
      approvedAffiliateUrl: destination,
      brief: {
        reader: "A buyer comparing this workflow",
        purchaseDecision: "Whether the service fits the buyer's workflow",
        strongestEvidencedAdvantage: "The retained research supports the core workflow",
        disqualifyingCondition: "The service does not fit every workflow",
        affiliateNextStep: "Verify current fit at the approved destination",
      },
      lengthStatus: "pass",
      draftingFeedback: "The accepted brief and measured length are ready for refinement.",
    });
    const transformAssessment = await storeEvidence(root, created.importId, legacyAssessment(created, research, longFormAffiliate));
    const accepted = await persistFixture(root, {
      ...created,
      stage: "REFINING",
      evidenceRefs: { research, transformAssessment },
      stageReceipts: [...created.stageReceipts, { stage: "REFINING", status: "started", at, message: "Current refinement started." }],
      nextAction: "Continue current refinement.",
    });

    const resumed = await resumeImport(root, accepted);

    assert.equal(resumed.stage, "REFINING");
    assert.deepEqual(resumed.evidenceRefs, accepted.evidenceRefs);
    assert.deepEqual(resumed.stageReceipts, accepted.stageReceipts);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("missing retained assessment files fail closed without changing the record", async () => {
  const { root, created, research } = await fixture();
  try {
    const missing = { path: `.automation/article-imports/evidence/${created.importId}/missing.json`, sha256: "a".repeat(64) };
    const legacy = await persistFixture(root, {
      ...created,
      stage: "REFINING",
      evidenceRefs: { research, assessment: missing },
      stageReceipts: [...created.stageReceipts, { stage: "REFINING", status: "started", at, message: "Legacy refinement started." }],
      nextAction: "Continue legacy refinement.",
    });

    await assert.rejects(resumeImport(root, legacy), /ENOENT/);
    const retained = await loadImport(root, created.importId);
    assert.equal(retained.stage, "REFINING");
    assert.deepEqual(retained.evidenceRefs, legacy.evidenceRefs);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("invalid retained assessment JSON fails closed without changing the record", async () => {
  const { root, created, research } = await fixture();
  try {
    const bytes = "{invalid-json";
    const relative = `.automation/article-imports/evidence/${created.importId}/invalid.json`;
    await mkdir(path.dirname(path.join(root, relative)), { recursive: true });
    await writeFile(path.join(root, relative), bytes);
    const invalid = { path: relative, sha256: createHash("sha256").update(bytes).digest("hex") };
    const legacy = await persistFixture(root, {
      ...created,
      stage: "REFINING",
      evidenceRefs: { research, assessment: invalid },
      stageReceipts: [...created.stageReceipts, { stage: "REFINING", status: "started", at, message: "Legacy refinement started." }],
      nextAction: "Continue legacy refinement.",
    });

    await assert.rejects(resumeImport(root, legacy), /JSON|Unexpected|position/i);
    const retained = await loadImport(root, created.importId);
    assert.equal(retained.stage, "REFINING");
    assert.deepEqual(retained.evidenceRefs, legacy.evidenceRefs);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
