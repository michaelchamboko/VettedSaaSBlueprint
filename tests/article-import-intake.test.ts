import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { claimNextIntakeEntry, clearSharedIntakeBlocker, createIntakeRun, markIntakeEntry, nextIntakeEntry, setIntakeBlocker } from "../src/lib/article-import/intake";

test("fixed snapshot resumes PROCESSING before later PENDING entries", async () => {
  await mkdir(path.join(process.cwd(), ".scratch"), { recursive: true });
  const root = await mkdtemp(path.join(process.cwd(), ".scratch", "intake-loop-"));
  try {
    await mkdir(path.join(root, "Article Intake"), { recursive: true });
    await writeFile(path.join(root, "Article Intake", "a.md"), "# A\n\nA captured article.");
    await writeFile(path.join(root, "Article Intake", "b.md"), "# B\n\nB captured article.");
    const created = await createIntakeRun(root);
    const first = created.entries[0];
    const processing = await markIntakeEntry(root, created, first.relativePath, "PROCESSING");
    assert.equal(nextIntakeEntry(processing)?.relativePath, first.relativePath);
    await assert.rejects(markIntakeEntry(root, processing, first.relativePath, "LIVE"), /INTAKE_TERMINAL_PROOF_INVALID/);
    assert.equal(nextIntakeEntry(processing)?.relativePath, first.relativePath);
    const runPath = path.join(root, ".automation/article-imports/intake", created.runId, "run.json");
    await writeFile(runPath, JSON.stringify({ ...processing, activeEntry: undefined }));
    const recovered = await claimNextIntakeEntry(root, created.runId);
    assert.equal(recovered.entry?.relativePath, first.relativePath);
    assert.equal(recovered.run.activeEntry, undefined);
    assert.equal(recovered.run.revision, processing.revision);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("missing editorial capability is a shared folder stop", async () => {
  await mkdir(path.join(process.cwd(), ".scratch"), { recursive: true });
  const root = await mkdtemp(path.join(process.cwd(), ".scratch", "intake-blocker-"));
  try {
    await mkdir(path.join(root, "Article Intake"), { recursive: true });
    await writeFile(path.join(root, "Article Intake", "a.md"), "# A\n\nA captured article.");
    await writeFile(path.join(root, "Article Intake", "b.md"), "# B\n\nB captured article.");
    const created = await createIntakeRun(root);
    const claimed = await claimNextIntakeEntry(root, created.runId);
    assert.equal(claimed.entry?.relativePath, created.entries[0].relativePath);
    const repeated = await claimNextIntakeEntry(root, created.runId);
    assert.equal(repeated.entry?.relativePath, claimed.entry?.relativePath);
    assert.equal(repeated.run.revision, claimed.run.revision);
    const blocked = await setIntakeBlocker(root, claimed.run, { scope: "shared", code: "EDITORIAL_CAPABILITY", stage: "REFINING", message: "Missing cleanse capability." });
    assert.equal(nextIntakeEntry(blocked), undefined);
    await assert.rejects(setIntakeBlocker(root, claimed.run, blocked.blocker!), /INTAKE_REVISION_CONFLICT/);
    await assert.rejects(clearSharedIntakeBlocker(root, blocked, blocked.entries[1].relativePath, "other"), /INTAKE_BLOCKER_IMPORT_MISMATCH/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
