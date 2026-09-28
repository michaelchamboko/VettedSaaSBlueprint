import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { run, shellArguments, usesShell } from "../scripts/release-decision-journey.ts";

const execFile = promisify(execFileCallback);

test("run() resolves the npm and vercel shims on Windows", async () => {
  const version = await run("npm", ["--version"]);
  assert.match(version.trim(), /^\d+\.\d+\.\d+/);
});

test("run() preserves arguments containing spaces through the shell", async () => {
  const directory = await mkdtemp(join(tmpdir(), "release-journey-"));
  const previous = { ...process.env };
  try {
    const message = "automation: update decision journey abc123def456";
    // The temp repository has no configured identity; the release script commits in the
    // real checkout, where the owner identity is configured.
    process.env.GIT_AUTHOR_NAME = "test";
    process.env.GIT_AUTHOR_EMAIL = "test@example.invalid";
    process.env.GIT_COMMITTER_NAME = "test";
    process.env.GIT_COMMITTER_EMAIL = "test@example.invalid";

    await execFile("git", ["init", "-q"], { cwd: directory, windowsHide: true });
    await writeFile(join(directory, "content.json"), "{}\n", "utf8");
    const cwdBefore = process.cwd();
    process.chdir(directory);
    try {
      await run("git", ["add", "--", "content.json"]);
      await run("git", ["commit", "-q", "-m", message]);
      // `.git/COMMIT_EDITMSG` holds the message exactly as Git received it, so this proves
      // the shell quoting preserved every space.
      const recorded = await readFile(join(directory, ".git", "COMMIT_EDITMSG"), "utf8");
      assert.equal(recorded.trim(), message);
      assert.equal(usesShell, process.platform === "win32");
    } finally {
      process.chdir(cwdBefore);
    }
  } finally {
    for (const key of ["GIT_AUTHOR_NAME", "GIT_AUTHOR_EMAIL", "GIT_COMMITTER_NAME", "GIT_COMMITTER_EMAIL"]) delete process.env[key];
    Object.assign(process.env, previous);
    await rm(directory, { recursive: true, force: true });
  }
});

test("shellArguments quotes every argument on Windows and rejects unsafe ones", () => {
  if (!usesShell) {
    assert.deepEqual(shellArguments(["run", "lint"]), ["run", "lint"]);
    return;
  }
  assert.deepEqual(shellArguments(["run", "validate:public-site"]), ['"run"', '"validate:public-site"']);
  assert.throws(() => shellArguments(["--", 'a"b']), /cannot be passed safely/);
  assert.throws(() => shellArguments(["rm -rf & echo done"]), /cannot be passed safely/);
});
