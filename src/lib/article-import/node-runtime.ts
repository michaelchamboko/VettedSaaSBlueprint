import { accessSync, constants } from "node:fs";
import path from "node:path";

type NodeRuntime = {
  env: NodeJS.ProcessEnv;
  execPath: string;
  platform: NodeJS.Platform;
  access: (candidate: string) => void;
};

export function nodeExecutable(runtime: NodeRuntime = {
  env: process.env,
  execPath: process.execPath,
  platform: process.platform,
  access: (candidate) => accessSync(candidate, constants.X_OK),
}): string {
  const env = (name: string) => runtime.env[name] ?? (runtime.platform === "win32"
    ? Object.entries(runtime.env).find(([key]) => key.toUpperCase() === name.toUpperCase())?.[1]
    : undefined);
  const configured = env("ARTICLE_NODE_EXECUTABLE");
  if (configured) return configured;
  const executableName = path.basename(runtime.execPath).toLowerCase();
  if (executableName === "node" || executableName === "node.exe") return runtime.execPath;

  const windows = runtime.platform === "win32";
  const join = windows ? path.win32.join : path.posix.join;
  const delimiter = windows ? ";" : ":";
  const candidates = (env("PATH") ?? "")
    .split(delimiter)
    .filter(Boolean)
    .map((directory) => join(directory, windows ? "node.exe" : "node"));
  const programFiles = env("ProgramFiles");
  if (windows && programFiles) candidates.push(path.win32.join(programFiles, "nodejs", "node.exe"));
  for (const candidate of candidates) {
    try {
      runtime.access(candidate);
      return candidate;
    } catch {}
  }
  throw new Error("NODE_EXECUTABLE_UNAVAILABLE");
}
