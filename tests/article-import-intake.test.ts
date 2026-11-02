import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { createIntakeRun, markIntakeEntry, nextIntakeEntry } from "../src/lib/article-import/intake";

test("fixed snapshot resumes PROCESSING before later PENDING entries", async () => {
  await mkdir(path.join(process.cwd(), ".scratch"), { recursive: true });
  const root = await mkdtemp(path.join(process.cwd(), ".scratch", "intake-loop-"));
  try {
    await mkdir(path.join(root, "Article Intake"), { recursive: true });
    await writeFile(path.join(root, "Article Intake", "a.md"), "# A\n\nA captured article.");
    await writeFile(path.join(root, "Article Intake", "b.md"), "# B\n\nB captured article.");
    const created = await createIntakeRun(root);
    const first = created.entries[0];
    const processing = await markIntakeEntry(root, created, first.relativePath, "PROCESSING", { importId: "article-00000000-0000-4000-8000-000000000000" });
    assert.equal(nextIntakeEntry(processing)?.relativePath, first.relativePath);
    const finished = await markIntakeEntry(root, processing, first.relativePath, "LIVE");
    assert.equal(nextIntakeEntry(finished)?.relativePath, created.entries[1].relativePath);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("article-specific blockers do not become a shared folder stop", async () => {
  await mkdir(path.join(process.cwd(), ".scratch"), { recursive: true });
  const root = await mkdtemp(path.join(process.cwd(), ".scratch", "intake-blocker-"));
  try {
    await mkdir(path.join(root, "Article Intake"), { recursive: true });
    await writeFile(path.join(root, "Article Intake", "a.md"), "# A\n\nA captured article.");
    await writeFile(path.join(root, "Article Intake", "b.md"), "# B\n\nB captured article.");
    const created = await createIntakeRun(root);
    const blocked = await markIntakeEntry(root, created, created.entries[0].relativePath, "BLOCKED", { blocker: { scope: "article", code: "EDITORIAL_CAPABILITY", stage: "REFINING", message: "Missing cleanse capability." } });
    assert.equal(nextIntakeEntry(blocked)?.relativePath, created.entries[1].relativePath);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
