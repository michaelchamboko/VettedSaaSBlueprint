import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";

import {
  advanceImport,
  cleanupImportGateHandoff,
  createArticleImport,
  executePendingImport,
  loadImport,
} from "../src/lib/article-import/engine";
import { externalArticleImportSchema } from "../src/lib/article-import/contracts";
import { evidenceReference } from "../src/lib/article-import/execution-evidence";
import { persistFixture } from "./fixtures/article-command";
import { parseImportCommand } from "../scripts/import-article";

const parent = path.resolve(".scratch/article-cleanup-recovery");
const noRegisteredDependencies = async () => ({ status: "verified" as const, references: [] });
const cleanupOptions = (now: string, afterBoundary?: (boundary: "intent-recorded" | "archive-copied" | "archive-registered") => void) => ({
  now: () => new Date(now),
  resolveRetentionDependencies: noRegisteredDependencies,
  ...(afterBoundary ? { afterBoundary } : {}),
});

async function fixture() {
  await mkdir(parent, { recursive: true });
  const root = await mkdtemp(path.join(parent, "case-"));
  await writeFile(path.join(root, "approved-urls.md"), "");
  await writeFile(path.join(root, "article.md"), "# Synthetic cleanup\n\nFixture bytes only.\n");
  const created = await createArticleImport(root, "article.md");
  const researching = await advanceImport(root, created, "Synthetic ingest passed.");
  const candidatePath = `.automation/article-imports/work/${created.importId}/superseded-draft.md`;
  await mkdir(path.dirname(path.join(root, candidatePath)), { recursive: true });
  await writeFile(path.join(root, candidatePath), "superseded draft bytes\n");
  const candidate = await evidenceReference(root, candidatePath);
  const gateHandoffs = researching.gateHandoffs!.map((handoff, index) => index === researching.gateHandoffs!.length - 1
    ? {
        ...handoff,
        disposalCandidates: [{ reference: candidate, kind: "superseded-draft" as const, reason: "Synthetic dependency-free superseded draft." }],
        cleanup: { status: "pending" as const },
      }
    : handoff);
  const prepared = externalArticleImportSchema.parse({ ...researching, gateHandoffs });
  await persistFixture(root, prepared);
  return { root, record: await loadImport(root, created.importId), candidate };
}

async function exists(file: string) {
  return Boolean(await stat(file).catch(() => undefined));
}

test("gate cleanup resumes the same durable archive operation at every crash boundary", async () => {
  for (const boundary of ["intent-recorded", "archive-copied", "archive-registered"] as const) {
    const { root, record, candidate } = await fixture();
    try {
      let calls = 0;
      await assert.rejects(() => executePendingImport(root, record.importId, async (context) => {
        calls += 1;
        return context.record;
      }, {
        cleanup: cleanupOptions("2026-11-27T12:00:00.000Z", (observed) => {
            if (observed === boundary) throw new Error(`CRASH:${boundary}`);
          }),
      } as never), new RegExp(`CRASH:${boundary}`));

      const interrupted = await loadImport(root, record.importId);
      const operationId = interrupted.gateHandoffs!.at(-1)!.cleanup.operationId;
      assert.match(operationId ?? "", /^cleanup-[a-f0-9]{24}$/);
      assert.equal(calls, 0);
      assert.equal(await readFile(path.join(root, candidate.path), "utf8"), "superseded draft bytes\n");

      const resumed = await executePendingImport(root, record.importId, async (context) => {
        calls += 1;
        return context.record;
      }, { cleanup: cleanupOptions("2026-11-27T12:00:00.000Z") } as never);
      const cleanup = resumed.gateHandoffs!.at(-1)!.cleanup;
      const operation = cleanup.operations!.find((item) => item.operationId === operationId)!;
      const disposition = operation.dispositions[0];
      assert.equal(cleanup.status, "verified");
      assert.equal(operation.phase, "completed");
      assert.equal(disposition.disposition, "archive");
      assert.equal(disposition.original.reference.sha256, candidate.sha256);
      assert.ok(disposition.archiveRef);
      assert.equal(await readFile(path.join(root, disposition.archiveRef!.path), "utf8"), "superseded draft bytes\n");
      assert.equal(await exists(path.join(root, candidate.path)), false);
      assert.equal(calls, 0);

      await executePendingImport(root, record.importId, async (context) => {
        calls += 1;
        return context.record;
      }, { cleanup: cleanupOptions("2026-11-27T12:00:00.000Z") } as never);
      assert.equal(calls, 1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test("manual cleanup disposes only verified temporary material and rechecks an expired archive dependency", async () => {
  const temporaryFixture = await fixture();
  try {
    const handoffs = temporaryFixture.record.gateHandoffs!.map((handoff, index) => index === temporaryFixture.record.gateHandoffs!.length - 1
      ? { ...handoff, disposalCandidates: handoff.disposalCandidates.map((candidate) => ({ ...candidate, kind: "verified-temporary" as const })) }
      : handoff);
    await persistFixture(temporaryFixture.root, externalArticleImportSchema.parse({ ...temporaryFixture.record, gateHandoffs: handoffs }));
    const cleaned = await cleanupImportGateHandoff(temporaryFixture.root, temporaryFixture.record.importId, cleanupOptions("2026-11-27T12:00:00.000Z"));
    assert.equal(await exists(path.join(temporaryFixture.root, temporaryFixture.candidate.path)), false);
    assert.equal(cleaned.gateHandoffs!.at(-1)!.cleanup.operations!.at(-1)!.dispositions[0].disposition, "dispose");
  } finally {
    await rm(temporaryFixture.root, { recursive: true, force: true });
  }

  const archivedFixture = await fixture();
  try {
    const initialRepairs = archivedFixture.record.repairStageTotals;
    const initialAttempts = archivedFixture.record.strategyAttempts;
    const archived = await cleanupImportGateHandoff(archivedFixture.root, archivedFixture.record.importId, cleanupOptions("2026-11-27T12:00:00.000Z"));
    const handoff = archived.gateHandoffs!.at(-1)!;
    const archiveCandidate = handoff.disposalCandidates[0];
    assert.equal(archiveCandidate.archivedAt, "2026-11-27T12:00:00.000Z");
    assert.equal(await readFile(path.join(archivedFixture.root, archiveCandidate.reference.path), "utf8"), "superseded draft bytes\n");

    const beforeExpiry = await cleanupImportGateHandoff(archivedFixture.root, archived.importId, cleanupOptions("2026-12-26T12:00:00.000Z"));
    assert.equal(beforeExpiry.gateHandoffs!.at(-1)!.cleanup.operations!.length, 1);

    let workerCalls = 0;
    const retained = await executePendingImport(archivedFixture.root, archived.importId, async (context) => {
      workerCalls += 1;
      return context.record;
    }, { cleanup: {
      ...cleanupOptions("2026-12-27T12:00:00.000Z"),
      resolveRetentionDependencies: async () => ({ status: "verified", references: [archiveCandidate.reference] }),
    } });
    assert.equal(workerCalls, 0);
    assert.equal(await readFile(path.join(archivedFixture.root, archiveCandidate.reference.path), "utf8"), "superseded draft bytes\n");
    assert.equal(retained.gateHandoffs!.at(-1)!.cleanup.operations!.at(-1)!.dispositions[0].disposition, "retain");
    assert.match(retained.gateHandoffs!.at(-1)!.cleanup.operations!.at(-1)!.dispositions[0].reason, /reference/i);

    const disposed = await cleanupImportGateHandoff(archivedFixture.root, archived.importId, cleanupOptions("2026-12-27T12:01:00.000Z"));
    assert.equal(await exists(path.join(archivedFixture.root, archiveCandidate.reference.path)), false);
    assert.equal(disposed.gateHandoffs!.at(-1)!.cleanup.operations!.at(-1)!.dispositions[0].disposition, "dispose");
    assert.deepEqual(disposed.repairStageTotals, initialRepairs);
    assert.deepEqual(disposed.strategyAttempts, initialAttempts);
  } finally {
    await rm(archivedFixture.root, { recursive: true, force: true });
  }
});

test("manual and gate cleanup produce the same disposition without worker or repair-count changes", async () => {
  const manualFixture = await fixture();
  const gateFixture = await fixture();
  try {
    const now = "2026-11-27T12:00:00.000Z";
    const manual = await cleanupImportGateHandoff(manualFixture.root, manualFixture.record.importId, cleanupOptions(now));
    let gateWorkerCalls = 0;
    const gate = await executePendingImport(gateFixture.root, gateFixture.record.importId, async (context) => {
      gateWorkerCalls += 1;
      return context.record;
    }, { cleanup: cleanupOptions(now) });
    const manualOperation = manual.gateHandoffs!.at(-1)!.cleanup.operations!.at(-1)!;
    const gateOperation = gate.gateHandoffs!.at(-1)!.cleanup.operations!.at(-1)!;
    const comparable = (operation: typeof manualOperation) => operation.dispositions.map(({ archiveRef, disposition, reason, retainUntil, removedAt }) => ({
      disposition,
      reason,
      retainUntil,
      removedAt,
      archiveSha256: archiveRef?.sha256,
    }));
    assert.deepEqual(comparable(manualOperation), comparable(gateOperation));
    assert.equal(manualOperation.phase, gateOperation.phase);
    assert.equal(gateWorkerCalls, 0);
    assert.deepEqual(manual.repairStageTotals, manualFixture.record.repairStageTotals);
    assert.deepEqual(gate.repairStageTotals, gateFixture.record.repairStageTotals);
    assert.deepEqual(manual.strategyAttempts, manualFixture.record.strategyAttempts);
    assert.deepEqual(gate.strategyAttempts, gateFixture.record.strategyAttempts);
  } finally {
    await rm(manualFixture.root, { recursive: true, force: true });
    await rm(gateFixture.root, { recursive: true, force: true });
  }
});

test("archive uncertainty preserves both recoverable copies and holds dispatch", async () => {
  const { root, record, candidate } = await fixture();
  try {
    await assert.rejects(() => executePendingImport(root, record.importId, async (context) => context.record, {
      cleanup: cleanupOptions("2026-11-27T12:00:00.000Z", (boundary) => {
          if (boundary === "archive-copied") throw new Error("CRASH:archive-copied");
        }),
    }), /CRASH:archive-copied/);
    const interrupted = await loadImport(root, record.importId);
    const operation = interrupted.gateHandoffs!.at(-1)!.cleanup.operations!.at(-1)!;
    const archivePath = `.automation/article-imports/archive/${record.importId}/${candidate.sha256}/${path.basename(candidate.path)}`;
    await writeFile(path.join(root, archivePath), "different archive bytes\n");
    let workerCalls = 0;
    const held = await executePendingImport(root, record.importId, async (context) => {
      workerCalls += 1;
      return context.record;
    }, { cleanup: cleanupOptions("2026-11-27T12:00:00.000Z") });
    assert.equal(workerCalls, 0);
    assert.equal(held.gateHandoffs!.at(-1)!.cleanup.operationId, operation.operationId);
    assert.equal(held.gateHandoffs!.at(-1)!.cleanup.status, "held");
    assert.equal(await readFile(path.join(root, candidate.path), "utf8"), "superseded draft bytes\n");
    assert.equal(await readFile(path.join(root, archivePath), "utf8"), "different archive bytes\n");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the manual cleanup command selects the same controller operation", () => {
  assert.deepEqual(parseImportCommand(["--cleanup", "article-123"]), { kind: "cleanup", importId: "article-123" });
});

test("a normal gate handoff classifies superseded attempt files and fails closed when the canonical register is unavailable", async () => {
  await mkdir(parent, { recursive: true });
  const root = await mkdtemp(path.join(parent, "producer-"));
  try {
    await writeFile(path.join(root, "approved-urls.md"), "");
    await writeFile(path.join(root, "article.md"), "# Synthetic producer\n\nFixture bytes only.\n");
    const created = await createArticleImport(root, "article.md");
    const directory = `.automation/article-imports/work/${created.importId}`;
    const workPath = `${directory}/superseded.work.json`;
    const resultPath = `${directory}/superseded.result.json`;
    await mkdir(path.join(root, directory), { recursive: true });
    await writeFile(path.join(root, workPath), "superseded work bytes\n");
    await writeFile(path.join(root, resultPath), "superseded result bytes\n");
    const prepared = externalArticleImportSchema.parse({
      ...created,
      stageAttempts: [{
        schemaVersion: "ImportStageAttemptV1",
        attemptId: `stage-attempt-${"a".repeat(24)}`,
        stage: "RESEARCHING",
        operation: "research-plan",
        sequence: 1,
        inputFingerprint: "b".repeat(64),
        idempotencyKey: "c".repeat(64),
        workPath,
        resultPath,
        reason: "initial",
        status: "superseded",
        repairTotalAtIssue: 0,
        issuingLeaseOwnerToken: "11111111-1111-4111-8111-111111111111",
        issuedAt: "2026-11-27T11:00:00.000Z",
      }],
    });
    await persistFixture(root, prepared);
    const advanced = await advanceImport(root, await loadImport(root, created.importId), "Synthetic ingest passed.");
    const handoff = advanced.gateHandoffs!.at(-1)!;
    assert.equal(handoff.cleanup.status, "pending");
    assert.deepEqual(handoff.disposalCandidates.map((candidate) => candidate.kind).sort(), ["superseded-capture", "superseded-draft"]);

    const held = await cleanupImportGateHandoff(root, created.importId, {
      now: () => new Date("2026-11-27T12:00:00.000Z"),
      resolveRetentionDependencies: async () => ({ status: "unavailable", reason: "synthetic registry outage" }),
    });
    assert.equal(held.gateHandoffs!.at(-1)!.cleanup.status, "held");
    assert.equal(await readFile(path.join(root, workPath), "utf8"), "superseded work bytes\n");
    assert.equal(await readFile(path.join(root, resultPath), "utf8"), "superseded result bytes\n");

    const canonicalDependency = handoff.disposalCandidates.find((candidate) => candidate.reference.path === workPath)!.reference;
    const cleaned = await cleanupImportGateHandoff(root, created.importId, {
      now: () => new Date("2026-11-27T12:00:00.000Z"),
      resolveRetentionDependencies: async () => ({ status: "verified", references: [canonicalDependency] }),
    });
    const dispositions = cleaned.gateHandoffs!.at(-1)!.cleanup.operations!.at(-1)!.dispositions;
    assert.equal(dispositions.find((item) => item.original.reference.path === workPath)!.disposition, "retain");
    assert.equal(dispositions.find((item) => item.original.reference.path === resultPath)!.disposition, "archive");
    assert.equal(await readFile(path.join(root, workPath), "utf8"), "superseded work bytes\n");
    assert.equal(await exists(path.join(root, resultPath)), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("cleanup retains active, rejected, diagnosis, rollback, IMPROVE, and registered evidence dependencies", async () => {
  const { root, record } = await fixture();
  try {
    const protectedKinds = ["active-work", "rejected-evidence", "resolution", "diagnosis", "registered-evidence", "rollback", "improve", "publication-proof"];
    const candidates = [];
    for (const kind of protectedKinds) {
      const relative = `.automation/article-imports/work/${record.importId}/${kind}.tmp`;
      await writeFile(path.join(root, relative), `${kind} bytes\n`);
      candidates.push({ kind, relative, reference: await evidenceReference(root, relative) });
    }
    const handoffs = record.gateHandoffs!.map((handoff, index) => index === record.gateHandoffs!.length - 1
      ? {
          ...handoff,
          disposalCandidates: candidates.map((candidate) => ({ reference: candidate.reference, kind: "verified-temporary" as const, reason: `Synthetic ${candidate.kind} candidate.` })),
          retainedEvidence: [
            ...handoff.retainedEvidence,
            ...candidates.slice(1).map((candidate) => ({ name: candidate.kind, reference: candidate.reference, reason: `Protected ${candidate.kind} dependency.` })),
          ],
          cleanup: { status: "pending" as const },
        }
      : handoff);
    const prepared = externalArticleImportSchema.parse({
      ...record,
      gateHandoffs: handoffs,
      continuation: {
        kind: "work",
        stage: "RESEARCHING",
        workPath: candidates[0].relative,
        resultPath: `${candidates[0].relative}.result.json`,
        idempotencyKey: "a".repeat(64),
        sourceFingerprint: record.sourceFingerprint,
      },
    });
    await persistFixture(root, prepared);
    const retained = await cleanupImportGateHandoff(root, record.importId, cleanupOptions("2026-11-27T12:00:00.000Z"));
    const dispositions = retained.gateHandoffs!.at(-1)!.cleanup.operations!.at(-1)!.dispositions;
    assert.equal(dispositions.length, protectedKinds.length);
    assert.ok(dispositions.every((item) => item.disposition === "retain"));
    for (const candidate of candidates) assert.equal(await readFile(path.join(root, candidate.relative), "utf8"), `${candidate.kind} bytes\n`);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
