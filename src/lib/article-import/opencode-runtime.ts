import { z } from "zod";

export const openCodeVersionSchema = z.enum(["1.19.4", "2.2.5"]);
export type OpenCodeVersion = z.infer<typeof openCodeVersionSchema>;

export function openCodeExecutable(): string {
  return process.env.OPENCODE_EXECUTABLE || "opencode";
}

export function normalizeOpenCodeVersion(output: string): OpenCodeVersion {
  const value = output.trim();
  const parsed = openCodeVersionSchema.safeParse(value === "opencode v2.2.5" ? "2.2.5" : value);
  if (!parsed.success) throw new Error("EVIDENCE_UNSUPPORTED");
  return parsed.data;
}

export function openCodeExportArgs(version: OpenCodeVersion, sessionId: string): string[] {
  return version === "2.2.5" ? ["session", "export", sessionId] : ["export", sessionId];
}
