import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { inspectImportCompletion } from "../src/lib/article-import/completion";
import { advanceImport, createArticleImport, recordImportFailure, saveImport } from "../src/lib/article-import/engine";

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-completion-"));
  await writeFile(path.join(root, "approved-urls.md"), "");
  await writeFile(path.join(root, "article.md"), "# A workflow guide\n\nThis practical guide describes workflow choices and their limitations for a production team.");
  const record = await advanceImport(root, await createArticleImport(root, "article.md"), "Source captured.");
  return { root, record };
}

test("completion inspection reports actionable work without mutating the record", async () => {
  const { root, record } = await fixture();
  const before = await readFile(path.join(root, ".automation", "article-imports", `${record.importId}.json`), "utf8");
  const inspection = await inspectImportCompletion(root, record.importId);
  const after = await readFile(path.join(root, ".automation", "article-imports", `${record.importId}.json`), "utf8");
  assert.equal(inspection.status, "WORK");
  assert.equal(inspection.importId, record.importId);
  assert.equal(before, after);
});

test("transient failure records a persisted wait and repair failure records a changed submission requirement", async () => {
  const { root, record } = await fixture();
  const waiting = await recordImportFailure(root, record, { strategy: "research", classification: "transient", message: "GitHub review is pending." });
  assert.equal(waiting.stage, "WAITING_EXTERNAL");
  assert.equal(waiting.continuation?.kind, "wait");
  assert.ok(waiting.continuation?.kind === "wait" && waiting.continuation.timeoutAt);
  const repair = await recordImportFailure(root, { ...waiting, stage: "RESEARCHING" }, { strategy: "research", classification: "deterministic", message: "Evidence is incomplete." });
  assert.equal(repair.continuation?.kind, "repair");
  assert.ok(repair.continuation?.kind === "repair" && repair.continuation.requiredChange);
  await saveImport(root, repair);
  const inspection = await inspectImportCompletion(root, repair.importId);
  assert.equal(inspection.status, "REPAIR");
});
