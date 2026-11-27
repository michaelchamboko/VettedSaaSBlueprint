import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execute = promisify(execFile);

export async function reviewedTreeFile(root: string, commitSha: string, file: string): Promise<Buffer> {
  const normalized = file.replaceAll("\\", "/");
  if (!/^[a-f0-9]{40}$/.test(commitSha) || normalized.startsWith("/") || normalized.split("/").includes("..")) {
    throw new Error("REVIEWED_TREE_REFERENCE_INVALID");
  }
  const result = await execute("git", ["show", `${commitSha}:${normalized}`], {
    cwd: path.resolve(root),
    encoding: "buffer",
    windowsHide: true,
    maxBuffer: 16 * 1024 * 1024,
  });
  return Buffer.from(result.stdout);
}
