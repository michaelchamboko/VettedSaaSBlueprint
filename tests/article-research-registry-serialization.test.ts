import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import type { TransactionRunner } from "../src/lib/db";
import { ARTICLE_RESEARCH_SERIALIZATION_ATTEMPTS, runResearchRegistryTransaction } from "../src/lib/article-import/research-registry-neon";
import { advanceImport, createArticleImport, executePendingImport } from "../src/lib/article-import/engine";

function serializationFailure(): Error & { code: string } {
  return Object.assign(new Error("could not serialize access"), { code: "40001" });
}

test("research registry retries the complete transaction after serialization failures", async () => {
  let transactionAttempts = 0;
  let workAttempts = 0;
  const transaction: TransactionRunner = async (work) => {
    transactionAttempts += 1;
    const result = await work(async () => ({ rows: [] }));
    if (transactionAttempts < ARTICLE_RESEARCH_SERIALIZATION_ATTEMPTS) throw serializationFailure();
    return result;
  };

  const result = await runResearchRegistryTransaction(transaction, async () => ++workAttempts);
  assert.equal(result, ARTICLE_RESEARCH_SERIALIZATION_ATTEMPTS);
  assert.equal(transactionAttempts, ARTICLE_RESEARCH_SERIALIZATION_ATTEMPTS);
  assert.equal(workAttempts, ARTICLE_RESEARCH_SERIALIZATION_ATTEMPTS);
});

test("research registry reports exhausted serialization retries for transient recovery", async () => {
  let transactionAttempts = 0;
  const transaction: TransactionRunner = async () => {
    transactionAttempts += 1;
    throw serializationFailure();
  };

  await assert.rejects(
    runResearchRegistryTransaction(transaction, async () => undefined),
    /^Error: RESEARCH_REGISTRY_SERIALIZATION_RETRY_EXHAUSTED$/,
  );
  assert.equal(transactionAttempts, ARTICLE_RESEARCH_SERIALIZATION_ATTEMPTS);
});

test("exhausted research serialization retries enter transient recovery without a shared capability blocker", async () => {
  const parent = path.join(process.cwd(), ".scratch");
  await mkdir(parent, { recursive: true });
  const root = await mkdtemp(path.join(parent, "research-serialization-"));
  try {
    await writeFile(path.join(root, "approved-urls.md"), "");
    await writeFile(path.join(root, "article.md"), "# Research serialization\n\nA synthetic article used only to verify retry classification.");
    const record = await advanceImport(root, await createArticleImport(root, "article.md"), "Source captured.");
    const result = await executePendingImport(root, record.importId, async () => {
      throw new Error("RESEARCH_REGISTRY_SERIALIZATION_RETRY_EXHAUSTED");
    });
    assert.equal(result.stage, "WAITING_EXTERNAL");
    assert.equal(result.continuation?.kind, "wait");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("research registry does not retry non-serialization failures", async () => {
  const failure = new Error("RESEARCH_REGISTRY_PLAN_STALE");
  let transactionAttempts = 0;
  const transaction: TransactionRunner = async () => {
    transactionAttempts += 1;
    throw failure;
  };

  await assert.rejects(runResearchRegistryTransaction(transaction, async () => undefined), (error) => error === failure);
  assert.equal(transactionAttempts, 1);
});
