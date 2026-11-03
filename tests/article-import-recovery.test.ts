import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { executeImportCommand } from "../scripts/import-article";
import { advanceImport, claimImportLease, createArticleImport, executePendingImport, loadImport, recordImportRepair } from "../src/lib/article-import/engine";

async function fixture() {
  const parent = path.join(process.cwd(), ".scratch");
  await mkdir(parent, { recursive: true });
  const root = await mkdtemp(path.join(parent, "import-recovery-"));
  await writeFile(path.join(root, "approved-urls.md"), "");
  await writeFile(path.join(root, "article.md"), "# A workflow guide\n\nThis practical guide describes several workflow choices and their limitations for a team preparing a production.");
  const record = await advanceImport(root, await createArticleImport(root, "article.md"), "Source captured.");
  return { root, record };
}

test("three failed repairs require diagnosis before any further execution", async () => {
  const { root, record } = await fixture();
  const strategies: string[] = [];
  const attempts: number[] = [];
  try {
    let current = record;
    for (let i = 0; i < 3; i++) {
      current = await recordImportRepair(root, { ...current, transformation: { ...current.transformation!, title: `Attempt ${i}` } }, { strategy: "research", message: `Claim ${i} has no support.` });
    }
    await assert.rejects(executePendingImport(root, record.importId, async (context) => { strategies.push(context.strategy); attempts.push(context.attempt); return context.record; }), /UNCHANGED_SUBMISSION/);
    assert.deepEqual(strategies, []);
    assert.deepEqual(attempts, []);
    const stopped = await loadImport(root, record.importId);
    assert.equal(stopped.stage, "RESEARCHING");
    assert.equal(stopped.continuation?.kind, "repair");
    assert.ok(stopped.continuation?.kind === "repair" && stopped.continuation.diagnosisRequired);
    assert.equal(stopped.sourceDeletedAt, undefined);
    assert.ok(await readFile(path.join(root, ".automation/article-imports", `${record.importId}.source.md`), "utf8"));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("external failures never exhaust content strategies or delete the source", async () => {
  const { root, record } = await fixture();
  const keys = new Set<string>();
  try {
    for (let i = 0; i < 15; i++) {
      const result = await executePendingImport(root, record.importId, async (context) => {
        keys.add(context.idempotencyKey);
        assert.equal(context.strategy, "alternate-source");
        assert.equal(context.attempt, 1);
        throw new Error(["network unavailable", "credentials missing", "rate limit", "Git unavailable", "Vercel timeout"][i % 5]);
      });
      assert.equal(result.stage, "WAITING_EXTERNAL");
      assert.equal(result.sourceDeletedAt, undefined);
    }
    assert.equal(keys.size, 1);
    assert.ok(await readFile(path.join(root, ".automation/article-imports", `${record.importId}.source.md`), "utf8"));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("a concurrent resume cannot execute an already claimed import", async () => {
  const { root, record } = await fixture();
  try {
    let calls = 0;
    let started!: () => void;
    let finish!: () => void;
    const ready = new Promise<void>((resolve) => { started = resolve; });
    const waiting = new Promise<void>((resolve) => { finish = resolve; });
    const first = executePendingImport(root, record.importId, async ({ record: current }) => {
      calls++;
      started();
      await waiting;
      return current;
    });
    await ready;
    await executePendingImport(root, record.importId, async ({ record: current }) => { calls++; return current; });
    finish();
    await first;
    assert.equal(calls, 1);
    assert.equal((await loadImport(root, record.importId)).stage, "RESEARCHING");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("expiry never admits a successor while the owning process is live", async () => {
  const { root, record } = await fixture();
  try {
    const old = await claimImportLease(root, record.importId, 10);
    assert.ok(old);
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(await claimImportLease(root, record.importId), undefined);
    await old.assertOwned();
    await old.release();
    const successor = await claimImportLease(root, record.importId);
    assert.ok(successor);
    assert.notEqual(old.ownerToken, successor.ownerToken);
    await assert.rejects(old.assertOwned, /LEASE_OWNER_CHANGED/);
    await successor.assertOwned();
    assert.equal(await claimImportLease(root, record.importId), undefined);
    await successor.release();
    const next = await claimImportLease(root, record.importId);
    assert.ok(next);
    await next.release();
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("CLI exposes durable authoring work to the supervising heartbeat", async () => {
  const { root, record } = await fixture();
  try {
    await executeImportCommand(root, { kind: "resume", importId: record.importId });
    const pending = await loadImport(root, record.importId);
    assert.equal(pending.stage, "RESEARCHING");
    assert.match(pending.nextAction, /execute .*\.work\.json/);
    assert.equal(pending.strategyAttempts["transient:agent-executor"], undefined);
  } finally { await rm(root, { recursive: true, force: true }); }
});
