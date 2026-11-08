import { z } from "zod";

export const openCodeVersionSchema = z.enum(["1.19.4", "2.2.5", "2.2.6"]);
export type OpenCodeVersion = z.infer<typeof openCodeVersionSchema>;

export function openCodeExecutable(): string {
  return process.env.OPENCODE_EXECUTABLE || "opencode";
}

export function normalizeOpenCodeVersion(output: string): OpenCodeVersion {
  const value = output.trim();
  const stripped = value === "opencode v2.2.5" || value === "opencode v2.2.6"
    ? value.slice("opencode v".length)
    : value;
  if (stripped !== "1.19.4" && stripped !== "2.2.5" && stripped !== "2.2.6") throw new Error("EVIDENCE_UNSUPPORTED");
  if (value !== stripped && stripped === "1.19.4") throw new Error("EVIDENCE_UNSUPPORTED");
  const parsed = openCodeVersionSchema.safeParse(stripped);
  if (!parsed.success) throw new Error("EVIDENCE_UNSUPPORTED");
  return parsed.data;
}

export function openCodeExportArgs(version: OpenCodeVersion, sessionId: string): string[] {
  return version === "1.19.4" ? ["export", sessionId] : ["session", "export", sessionId];
}
