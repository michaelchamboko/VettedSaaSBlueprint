import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";

const forbidden = ["ora", "cle"].join("");
// Workspace-local artifact directories are not repository content; the
// historical runner assumed a clean checkout.
const excludedDirectories = new Set([".git", ".next", "node_modules", ".worktrees", ".automation", ".gitnexus", ".stage2", ".freebuff", ".scratch", "build-pack", ".agents"]);

function repositoryFiles(root: string, directory = root): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) return [];

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
