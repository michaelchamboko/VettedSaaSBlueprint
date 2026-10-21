import { execFile } from "node:child_process";
import { mkdir, realpath } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

/** Mutable post-review state must never become part of the reviewed checkout. */
export async function assertIgnoredImportStatePath(root: string, file: string): Promise<void> {
  const relative = path.relative(path.resolve(root), path.resolve(root, file)).replaceAll("\\", "/");
  // Top-level JSON files are reserved for import records discovered by the engine.
  if (!/^\.automation\/article-imports\/[^/]+\/.+/.test(relative)) throw new Error("IMPORT_STATE_PATH_REQUIRED");
  const parent = path.dirname(path.resolve(root, file));
  await mkdir(parent, { recursive: true });
  const canonicalParent = path.relative(await realpath(root), await realpath(parent)).replaceAll("\\", "/");
  if (canonicalParent !== ".automation/article-imports" && !canonicalParent.startsWith(".automation/article-imports/")) throw new Error("IMPORT_STATE_PATH_REQUIRED");
  try {
    const canonicalFile = path.relative(await realpath(root), await realpath(path.resolve(root, file))).replaceAll("\\", "/");
    if (canonicalFile !== relative) throw new Error("IMPORT_STATE_PATH_REQUIRED");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  try {
    await run("git", ["check-ignore", "--quiet", "--", relative], { cwd: root, windowsHide: true });
  } catch {
    throw new Error("IMPORT_STATE_MUST_BE_IGNORED_AND_UNTRACKED");
  }
}
