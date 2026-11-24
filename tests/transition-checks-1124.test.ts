import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { createIntakeRun, loadIntakeRun } from "../src/lib/article-import/intake";
import { executeFixtureCommand } from "./fixtures/article-command";

test("transition checks: wrong intake id, missing V2 revision, and multiple active entries reject without mutation", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "transition-checks-"));
  try {
    await mkdir(path.join(root, "Article Intake"), { recursive: true });
    await writeFile(path.join(root, "Article Intake", "a.md"), "# A\n\nA captured article.");

    const run = await createIntakeRun(root);
    const runFile = path.join(root, ".automation", "article-imports", "intake", run.runId, "run.json");
    const original = await readFile(runFile, "utf8");
    const parsed = JSON.parse(original) as { runId: string; revision?: number; entries: Array<{ status: string }> };

    const wrongId = { ...parsed, runId: parsed.runId.endsWith("0") ? `${parsed.runId.slice(0, -1)}1` : `${parsed.runId.slice(0, -1)}0` };
    await writeFile(runFile, JSON.stringify(wrongId));
    await assert.rejects(loadIntakeRun(root, run.runId), /INVALID_INTAKE_STATE/);

    const missingRevision = { ...parsed };
    delete missingRevision.revision;
    await writeFile(runFile, JSON.stringify(missingRevision));
    await assert.rejects(loadIntakeRun(root, run.runId), /INVALID_INTAKE_STATE/);

    const multipleActive = { ...parsed, entries: [{ ...parsed.entries[0], status: "PROCESSING" }, { ...parsed.entries[0], relativePath: "Article Intake/b.md", status: "PROCESSING" }] };
    await writeFile(runFile, JSON.stringify(multipleActive));
    const before = await readFile(runFile);
    await assert.rejects(executeFixtureCommand(root, { kind: "intake-resume", runId: run.runId }), /INTAKE_RECONCILIATION_CONFLICT/);
    const after = await readFile(runFile);
    assert.deepEqual(after, before);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});