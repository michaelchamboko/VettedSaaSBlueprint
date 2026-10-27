import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";

import { z } from "zod";
import type { AutomationJobType } from "./contracts";

export const automationManifest = {
  tasks: [
    { id: "vetted-saas-research", type: "research", trigger: "manual_or_api" },
    { id: "vetted-saas-editorial-brief", type: "editorial_brief", trigger: "manual_or_api" },
    { id: "vetted-saas-optimisation", type: "optimise", trigger: "manual_or_api" },
    { id: "vetted-saas-production-watchdog", type: "watchdog", trigger: "manual_or_api" },
  ],
  approvedCapabilities: ["repository_local_receipts", "direct_vercel_production_deploy", "manual_trigger", "api_trigger"] as const,
} as const;

const requiredTasks = [
  ["vetted-saas-research", "research", "manual_or_api"],
  ["vetted-saas-editorial-brief", "editorial_brief", "manual_or_api"],
  ["vetted-saas-optimisation", "optimise", "manual_or_api"],
  ["vetted-saas-production-watchdog", "watchdog", "manual_or_api"],
] as const;

const trackedManifestSchema = z.object({
  version: z.literal(2),
  checkoutPolicy: z.literal("primary"),
  runtimeDirectory: z.literal(".automation"),
  tasks: z.array(z.object({
    id: z.string().min(1),
    type: z.enum(["research", "editorial_brief", "optimise", "watchdog"]),
    trigger: z.literal("manual_or_api"),
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

export function verifyAutomationManifest(manifest: { tasks: ReadonlyArray<{ id: string; type: string; trigger: string }> } = automationManifest): string[] {
  const actual = manifest.tasks.map((task) => [task.id, task.type, task.trigger] as const);
  return JSON.stringify(actual) === JSON.stringify(requiredTasks) ? [] : ["FLOW_AUTHORITY_DRIFT"];
}

export function assertAutomationInvocation(input: {
  type: AutomationJobType;
  scheduledWindow: string;
  mode: "manual" | "api";
  requestedCapability?: string;
  repositoryRoot?: string;
}) {
  if (!(["manual", "api"] as const).includes(input.mode)) {
    throw new Error("Automation authority violation: trigger must be manual or API; scheduled execution is prohibited.");
  }
  const failures = verifyAutomationManifest();
  if (input.repositoryRoot) {
    failures.push(...verifyTrackedAutomationManifest(input.repositoryRoot));
    const gitEntry = path.join(input.repositoryRoot, ".git");
    try {
      if (!statSync(gitEntry).isDirectory()) failures.push("PRIMARY_CHECKOUT_REQUIRED");
    } catch {
      failures.push("PRIMARY_CHECKOUT_REQUIRED");
    }
  }
  if (failures.length) throw new Error(`Automation authority violation: ${failures.join(", ")}`);
  if (input.requestedCapability && !automationManifest.approvedCapabilities.includes(input.requestedCapability as never)) {
    throw new Error(`Automation capability is not approved: ${input.requestedCapability}`);
  }
}
