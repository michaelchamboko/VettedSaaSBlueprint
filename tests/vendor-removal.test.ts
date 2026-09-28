import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";
import os from "node:os";

const forbidden = ["ora", "cle"].join("");
// Workspace-local artifact directories are not repository content; the
// historical runner assumed a clean checkout.
const excludedDirectories = new Set([".git", ".next", "node_modules", ".worktrees", ".automation", ".gitnexus", ".stage2", ".freebuff", ".scratch", "build-pack"]);

export function repositoryFiles(root: string, directory = root): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) return [];
    // A Windows junction or symlink reports neither isDirectory() nor isFile() on every
    // Node version, and reading it throws EISDIR. Repository content is what Git tracks,
    // and Git stores no junctions, so reparse points are never scanned here.
    if (entry.isSymbolicLink()) return [];

    const path = join(directory, entry.name);
    return entry.isDirectory() ? repositoryFiles(root, path) : [relative(root, path)];
  });
}

test("removed database vendor has no content or filename references", () => {
  const root = process.cwd();
  const pattern = new RegExp(forbidden, "i");
  const files = repositoryFiles(root);

  assert.deepEqual(files.filter((file) => pattern.test(file)), []);
  assert.deepEqual(
    files.filter((file) => pattern.test(readFileSync(join(root, file)).toString("utf8"))),
    [],
  );
});

// Regression for the EISDIR failure: a Windows junction reports neither isDirectory() nor
// isFile() and throws when read, so the walker must skip reparse points instead of reading them.
test("the repository walk skips reparse points instead of trying to read them", async (t) => {
  const root = await mkdtemp(join(os.tmpdir(), "vendor-removal-walk-"));
  const outside = join(os.tmpdir(), `vendor-removal-target-${t.name.replace(/\W+/g, "-")}`);
  try {
    await writeFile(join(root, "clean.txt"), "nothing forbidden here", "utf8");
    await mkdir(outside, { recursive: true });
    await writeFile(join(outside, "inside.txt"), "content behind the junction", "utf8");

    try {
      await symlink(outside, join(root, "a-junction"), "junction");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EPERM") {
        t.skip("Windows symlink privilege is unavailable in this environment.");
        return;
      }
      throw error;
    }

    const files = repositoryFiles(root);
    assert.deepEqual(files, ["clean.txt"]);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});
