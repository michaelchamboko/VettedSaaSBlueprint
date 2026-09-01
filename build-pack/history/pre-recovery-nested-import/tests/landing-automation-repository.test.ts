import assert from "node:assert/strict";
import test from "node:test";

import { createLandingAutomationRepository } from "@/lib/landing-automation/repository";

function createFakeExecutor() {
  const executedSql: string[] = [];
  const executedBinds: unknown[][] = [];

  return {
    executedSql,
    executedBinds,
    execute: async (sql: string, binds: unknown[] = []) => {
      executedSql.push(sql);
      executedBinds.push(binds);
      return [];
    },
  };
}

test("createRun is idempotent for allowlist source SHA and manifest digest", async () => {
  const executor = createFakeExecutor();
  const repository = createLandingAutomationRepository({ execute: executor.execute });

  const first = await repository.createReconciliationRun({
    allowlistSourceCommitSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    manifestDigest: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    requestedEntries: [
      { allowlistEntryId: "1", exactUrl: "https://example.com/a", urlSha256: "a".repeat(64) },
      { allowlistEntryId: "2", exactUrl: "https://example.com/b", urlSha256: "b".repeat(64) },
    ],
  });

  const second = await repository.createReconciliationRun({
    allowlistSourceCommitSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    manifestDigest: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    requestedEntries: [
      { allowlistEntryId: "1", exactUrl: "https://example.com/a", urlSha256: "a".repeat(64) },
      { allowlistEntryId: "2", exactUrl: "https://example.com/b", urlSha256: "b".repeat(64) },
    ],
  });

  assert.equal(first.automationRunId, second.automationRunId);
  assert.equal(second.created, false);
  assert.equal(executor.executedSql.length > 0, true);
});

test("page child is idempotent for parent and allowlist entry", async () => {
  const executor = createFakeExecutor();
  const repository = createLandingAutomationRepository({ execute: executor.execute });

  const firstReconcile = await repository.reconcileAllowlist({
    allowlistSourceCommitSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    manifestDigest: "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    allowBulkRevocation: true,
    entries: [{ exactUrl: "https://example.com/a", urlSha256: "a".repeat(64) }],
  });

  const parent = await repository.createReconciliationRun({
    allowlistSourceCommitSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    manifestDigest: "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    requestedEntries: firstReconcile.activeEntries,
  });

  const childA = await repository.createPageRun({
    parentRunId: parent.automationRunId,
    allowlistEntryId: firstReconcile.activeEntries[0].allowlistEntryId,
    wave: "exemplar",
    waveSequence: 1,
  });

  const childB = await repository.createPageRun({
    parentRunId: parent.automationRunId,
    allowlistEntryId: firstReconcile.activeEntries[0].allowlistEntryId,
    wave: "exemplar",
    waveSequence: 1,
  });

  assert.equal(childA.automationRunId, childB.automationRunId);
  assert.equal(childB.created, false);
  assert.equal(executor.executedSql.length > 0, true);
});

test("allowlist removal schedules immediate noindex and seven-day archive", async () => {
  const executor = createFakeExecutor();
  const repository = createLandingAutomationRepository({ execute: executor.execute });

  const first = await repository.reconcileAllowlist({
    allowlistSourceCommitSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    manifestDigest: "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    allowBulkRevocation: true,
    entries: [
      { exactUrl: "https://example.com/a", urlSha256: "a".repeat(64) },
      { exactUrl: "https://example.com/b", urlSha256: "b".repeat(64) },
    ],
  });

  const second = await repository.reconcileAllowlist({
    allowlistSourceCommitSha: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    manifestDigest: "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    allowBulkRevocation: true,
    entries: [{ exactUrl: "https://example.com/a", urlSha256: "a".repeat(64) }],
  });

  const revokedIds = second.revokedEntryIds;
  assert.equal(revokedIds.length, 1);
  assert.equal(revokedIds[0], first.activeEntries.find((entry) => entry.urlSha256 === "b".repeat(64))?.allowlistEntryId);
  assert.equal(second.activeEntries.length, 1);
  assert.match(
    executor.executedSql.join("\n"),
    /revoked_noindex|archive_after_at/i,
  );
});

test("appendEvent rejects an invalid state transition", async () => {
  const repository = createLandingAutomationRepository();
  const parent = await repository.createReconciliationRun({
    allowlistSourceCommitSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    manifestDigest: "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    requestedEntries: [],
  });

  await assert.rejects(
    () => repository.appendEvent(parent.automationRunId, { kind: "deployment_verified" }),
    /Invalid automation transition/,
  );
});

test("gate receipts are immutable by input digest", async () => {
  const repository = createLandingAutomationRepository();

  const reconciled = await repository.reconcileAllowlist({
    allowlistSourceCommitSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    manifestDigest: "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    allowBulkRevocation: true,
    entries: [{ exactUrl: "https://example.com/a", urlSha256: "a".repeat(64) }],
  });

  const parent = await repository.createReconciliationRun({
    allowlistSourceCommitSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    manifestDigest: "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    requestedEntries: reconciled.activeEntries,
  });

  const pageRun = await repository.createPageRun({
    parentRunId: parent.automationRunId,
    allowlistEntryId: reconciled.activeEntries[0].allowlistEntryId,
    wave: "exemplar",
    waveSequence: 1,
  });

  const receipt = {
    runId: pageRun.automationRunId,
    blueprintId: "blueprint-1",
    batchId: "batch-1",
    authoringHeadSha: "f".repeat(40),
    inputDigest: "i".repeat(64),
    status: "pass" as const,
    receipt: { state: "ok" },
  };

  await repository.recordGateReceipt(receipt);

  await assert.rejects(
    () => repository.recordGateReceipt({ ...receipt, status: "fail" as const }),
    /immutable/i,
  );
});
