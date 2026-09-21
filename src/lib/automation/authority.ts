import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { z } from "zod";
import type { AutomationJobType } from "./contracts";

export const automationManifest = {
  tasks: [
    { id: "vetted-saas-daily-research", type: "research", timeSast: "02:00" },
    { id: "vetted-saas-editorial-brief", type: "editorial_brief", timeSast: "06:00" },
    { id: "vetted-saas-optimisation", type: "optimise", timeSast: "20:00" },
    { id: "vetted-saas-production-watchdog", type: "watchdog", timeSast: "23:00" },
  ],
  approvedCapabilities: ["repository_local_receipts", "direct_vercel_production_deploy", "manual_canary"] as const,
} as const;

const requiredTasks = [
  ["vetted-saas-daily-research", "research", "02:00"],
  ["vetted-saas-editorial-brief", "editorial_brief", "06:00"],
  ["vetted-saas-optimisation", "optimise", "20:00"],
  ["vetted-saas-production-watchdog", "watchdog", "23:00"],
] as const;

const trackedManifestSchema = z.object({
  version: z.literal(1),
  timezone: z.literal("Africa/Johannesburg"),
  workingDirectory: z.string().min(1),
  runtimeDirectory: z.literal(".automation"),
  tasks: z.array(z.object({
    id: z.string().min(1),
    type: z.enum(["research", "editorial_brief", "optimise", "watchdog"]),
    timeSast: z.string().regex(/^\d{2}:\d{2}$/),
    promptFile: z.string().regex(/^automation\/codex\/[a-z-]+\.md$/),
    promptSha256: z.string().regex(/^[a-f0-9]{64}$/),
    desktopBootstrap: z.string().min(1),
  }).strict()).length(4),
}).strict();

export type TrackedAutomationManifest = z.infer<typeof trackedManifestSchema>;

export function loadTrackedAutomationManifest(repositoryRoot: string): TrackedAutomationManifest {
  const manifestPath = path.join(repositoryRoot, "automation", "codex", "manifest.json");
  return trackedManifestSchema.parse(JSON.parse(readFileSync(manifestPath, "utf8")));
}

export function verifyTrackedAutomationManifest(repositoryRoot: string): string[] {
  const manifest = loadTrackedAutomationManifest(repositoryRoot);
  const failures = verifyAutomationManifest(manifest);
  for (const task of manifest.tasks) {
    const promptPath = path.resolve(repositoryRoot, task.promptFile);
    const expectedPath = path.resolve(repositoryRoot, "automation", "codex");
    if (!promptPath.startsWith(`${expectedPath}${path.sep}`)) {
      failures.push(`PROMPT_PATH_OUTSIDE_AUTHORITY:${task.id}`);
      continue;
    }
    const canonicalPrompt = readFileSync(promptPath, "utf8").replace(/\r\n/g, "\n");
    const fingerprint = createHash("sha256").update(canonicalPrompt, "utf8").digest("hex");
    if (fingerprint !== task.promptSha256) failures.push(`PROMPT_FINGERPRINT_DRIFT:${task.id}`);
    const expectedBootstrap = `Load ${task.promptFile} from the configured working directory, verify its SHA-256 against automation/codex/manifest.json, and follow it exactly. Do not add requirements or capabilities.`;
    if (task.desktopBootstrap !== expectedBootstrap) failures.push(`BOOTSTRAP_DRIFT:${task.id}`);
  }
  return failures;
}

export function verifyAutomationManifest(manifest: { tasks: ReadonlyArray<{ id: string; type: string; timeSast: string }> } = automationManifest): string[] {
  const actual = manifest.tasks.map((task) => [task.id, task.type, task.timeSast] as const);
  return JSON.stringify(actual) === JSON.stringify(requiredTasks) ? [] : ["SCHEDULE_DRIFT"];
}

export function assertAutomationInvocation(input: {
  type: AutomationJobType;
  scheduledWindow: string;
  mode: "scheduled" | "manual_canary";
  requestedCapability?: string;
  repositoryRoot?: string;
}) {
  const failures = verifyAutomationManifest();
  if (input.repositoryRoot) {
    failures.push(...verifyTrackedAutomationManifest(input.repositoryRoot));
    const manifest = loadTrackedAutomationManifest(input.repositoryRoot);
    if (input.mode === "scheduled" && path.resolve(input.repositoryRoot).toLowerCase() !== path.resolve(manifest.workingDirectory).toLowerCase()) {
      failures.push("CHECKOUT_DRIFT");
    }
  }
  if (failures.length) throw new Error(`Automation authority violation: ${failures.join(", ")}`);
  if (input.mode === "manual_canary" && !input.scheduledWindow.includes("canary")) {
    throw new Error("Manual canary runs require a distinct canary window.");
  }
  if (input.requestedCapability && !automationManifest.approvedCapabilities.includes(input.requestedCapability as never)) {
    throw new Error(`Automation capability is not approved: ${input.requestedCapability}`);
  }
}
