import { existsSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

export const openCodeVersionSchema = z.enum(["1.19.4", "2.2.5", "2.2.6", "2.3.0"]);
export type OpenCodeVersion = z.infer<typeof openCodeVersionSchema>;

type OpenCodeRuntime = {
  env: NodeJS.ProcessEnv;
  execPath: string;
  platform: NodeJS.Platform;
  exists: (candidate: string) => boolean;
};

export function openCodeExecutable(runtime: OpenCodeRuntime = {
  env: process.env,
  execPath: process.execPath,
  platform: process.platform,
  exists: existsSync,
}): string {
  if (runtime.env.OPENCODE_EXECUTABLE) return runtime.env.OPENCODE_EXECUTABLE;
  const executableName = path.basename(runtime.execPath).toLowerCase();
  if (executableName === "opencode" || executableName === "opencode.exe") return runtime.execPath;
  if (runtime.platform === "win32" && runtime.env.APPDATA) {
    const npmBinary = path.join(runtime.env.APPDATA, "npm", "node_modules", "@opencode", "cli", "bin", "opencode.exe");
    if (runtime.exists(npmBinary)) return npmBinary;
  }
  return "opencode";
}

export function normalizeOpenCodeVersion(output: string): OpenCodeVersion {
  const value = output.trim();
  const stripped = /^opencode v2\.\d+\.\d+$/.test(value)
    ? value.slice("opencode v".length)
    : value;
  const parsed = openCodeVersionSchema.safeParse(stripped);
  if (!parsed.success) throw new Error("EVIDENCE_UNSUPPORTED");
  return parsed.data;
}

export function openCodeExportArgs(version: OpenCodeVersion, sessionId: string): string[] {
  return version === "1.19.4" ? ["export", sessionId] : ["session", "export", sessionId];
}
