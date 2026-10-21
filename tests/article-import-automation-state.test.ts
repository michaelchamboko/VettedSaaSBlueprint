import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { assertIgnoredImportStatePath } from "../src/lib/article-import/automation-state";
import { createLocalReleaseOperations, type ReleaseCommandRunner } from "../src/lib/article-import/local-release-adapter";

const run = promisify(execFile);

test("review and result state must be ignored, untracked automation files", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-import-state-"));
  const file = ".automation/article-imports/reviews/review.json";
  try {
    await run("git", ["init", root]);
    await assert.rejects(assertIgnoredImportStatePath(root, "build-pack/article-import/review.json"), /IMPORT_STATE_PATH_REQUIRED/);
    await assert.rejects(assertIgnoredImportStatePath(root, ".automation/article-imports/review.json"), /IMPORT_STATE_PATH_REQUIRED/);
    await assert.rejects(assertIgnoredImportStatePath(root, ".automation/article-imports/../../review.json"), /IMPORT_STATE_PATH_REQUIRED/);
    await assert.rejects(assertIgnoredImportStatePath(root, file), /IMPORT_STATE_MUST_BE_IGNORED_AND_UNTRACKED/);
    await writeFile(path.join(root, ".gitignore"), ".automation/\n");
    await assertIgnoredImportStatePath(root, file);
    await assertIgnoredImportStatePath(root, ".automation/article-imports/work/result.json");
    await writeFile(path.join(root, file), "{}");
    await run("git", ["add", "--force", "--", file], { cwd: root });
    await assert.rejects(assertIgnoredImportStatePath(root, file), /IMPORT_STATE_MUST_BE_IGNORED_AND_UNTRACKED/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("merged checkout rejects every tracked or untracked change and malformed status", async () => {
  for (const status of [" M src/generated/landing-pages/example.json\n", "?? build-pack/article-import/review.json\n", "?? unrelated.txt\n", "UU src/app/page.tsx\n", "x\n", ""]) {
    let checkedOut = false;
    const runner: ReleaseCommandRunner = async (_command, args) => {
      if (args[0] === "checkout") checkedOut = true;
      return { stdout: args[0] === "status" ? status : args[0] === "rev-parse" ? "c".repeat(40) : "", stderr: "" };
    };
    const operations = createLocalReleaseOperations(".", { runner, format: "blog" });
    if (status) await assert.rejects(operations.checkoutMergedCommit("c".repeat(40), "d".repeat(40)), /MERGED_RELEASE_WORKTREE_DIRTY/);
    else await operations.checkoutMergedCommit("c".repeat(40), "d".repeat(40));
    assert.equal(checkedOut, status === "");
  }
});

test("Git ignores post-review receipts and results while preserving real changes", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-import-checkout-"));
  try {
    await run("git", ["init", root]);
    await writeFile(path.join(root, ".gitignore"), ".automation/\n");
    await writeFile(path.join(root, "article.json"), "{}");
    await run("git", ["add", "."], { cwd: root });
    await run("git", ["-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-m", "fixture"], { cwd: root });
    const commit = (await run("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim();
    await run("git", ["update-ref", "refs/remotes/origin/main", commit], { cwd: root });
    const runner: ReleaseCommandRunner = async (command, args) => args[0] === "fetch" ? { stdout: "", stderr: "" } : run(command, [...args], { cwd: root });
    const operations = createLocalReleaseOperations(root, { runner, format: "blog" });
    for (const file of ["reviews/review.json", "work/result.json"]) {
      const state = `.automation/article-imports/${file}`;
      await assertIgnoredImportStatePath(root, state);
      await writeFile(path.join(root, state), "{}");
    }
    await operations.checkoutMergedCommit(commit, commit);
    await writeFile(path.join(root, "article.json"), '{"changed":true}');
    await assert.rejects(operations.checkoutMergedCommit(commit, commit), /MERGED_RELEASE_WORKTREE_DIRTY/);
    await run("git", ["restore", "article.json"], { cwd: root });
    await writeFile(path.join(root, "untracked.json"), "{}");
    await assert.rejects(operations.checkoutMergedCommit(commit, commit), /MERGED_RELEASE_WORKTREE_DIRTY/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
