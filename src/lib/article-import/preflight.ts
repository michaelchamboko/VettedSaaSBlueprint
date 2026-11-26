import { AsyncLocalStorage } from "node:async_hooks";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { z } from "zod";
import { normalizeOpenCodeVersion, openCodeExecutable, openCodeVersionSchema } from "./opencode-runtime";

const run = promisify(execFile);
const manifestSchema = z.object({
  schemaVersion: z.literal("ArticleWorkflowCapabilitiesV1"),
  openCodeVersion: openCodeVersionSchema.optional(),
  visualReviewModel: z.string().min(1).optional(),
  designEvidenceVersion: z.literal(2).optional(),
  assessmentModel: z.string().min(1).optional(),
  modelFamilies: z.record(z.string(), z.string().min(1)).default({}),
  executionExporters: z.record(z.string(), z.object({ executable: z.string().min(1), exportArgs: z.array(z.string()), versionArgs: z.array(z.string()), toolName: z.string().min(1), toolVersion: z.string().min(1) }).strict()).optional(),
  files: z.array(z.object({ path: z.string().min(1), sha256: z.string().regex(/^[a-f0-9]{64}$/) }).strict()).min(1),
}).strict();

/** Worktree detection is read-only and never initializes ignored state. */
export async function assertPrimaryArticleCheckout(root: string): Promise<void> {
  const checkout = await realpath(root);
  const git = await stat(path.join(checkout, ".git")).catch(() => undefined);
  if (!git?.isDirectory()) throw new Error("PRIMARY_CHECKOUT_REQUIRED");
  const { stdout } = await run("git", ["rev-parse", "--show-toplevel"], { cwd: checkout, windowsHide: true, timeout: 10_000 });
  if (await realpath(stdout.trim()) !== checkout) throw new Error("PRIMARY_CHECKOUT_REQUIRED");
}

export type CapabilityProbe = (tool: string, args: string[]) => Promise<string>;
const probe: CapabilityProbe = async (tool, args) => {
  const executable = tool === "python" ? process.env.PYTHON || "python" : tool === "opencode" ? openCodeExecutable() : tool;
  const result = await run(executable, args, { windowsHide: true, timeout: 10_000, maxBuffer: 64 * 1024 });
  return result.stdout.trim();
};

export async function inspectArticlePreflight(root: string, checkTool: CapabilityProbe = probe, stage?: string) {
  const diagnostics: { code: string; path?: string; detail: string }[] = [];
  const canonicalRoot = await realpath(root);
  const manifest = manifestSchema.parse(JSON.parse(await readFile(path.join(root, "config/article-workflow-capabilities.json"), "utf8")));
  for (const file of manifest.files) {
    try {
      const target = await realpath(path.resolve(root, file.path));
      const relative = path.relative(canonicalRoot, target);
      if (relative.startsWith("..") || path.isAbsolute(relative) || !(await stat(target)).isFile()) throw new Error("Invalid capability path");
      if (createHash("sha256").update(await readFile(target)).digest("hex") !== file.sha256) throw new Error("Pinned bytes differ");
    } catch (error) { diagnostics.push({ code: "CAPABILITY_UNAVAILABLE", path: file.path, detail: String(error) }); }
  }
  for (const required of [".agents/skills/impeccable/SKILL.md", ".agents/skills/design-taste-frontend/SKILL.md", ".agents/skills/eleanor-editorial/SKILL.md"]) {
    if (!manifest.files.some(file => file.path === required)) diagnostics.push({ code: "CAPABILITY_UNPINNED", path: required, detail: "Required skill missing from manifest" });
  }
  if (stage === "REFINING") {
    let structuredExporterAvailable = false;
    for (const exporter of Object.values(manifest.executionExporters ?? {})) {
      try {
        if ((await checkTool(exporter.executable, exporter.versionArgs)).trim() !== exporter.toolVersion) throw new Error("Unsupported structured exporter version");
        structuredExporterAvailable = true;
      } catch { /* Try another configured exporter or the retained legacy path. */ }
    }
    if (!structuredExporterAvailable) {
      try {
        if (!manifest.openCodeVersion || normalizeOpenCodeVersion(await checkTool("opencode", ["--version"])) !== manifest.openCodeVersion || Object.keys(manifest.modelFamilies).length === 0) throw new Error("No verified Refining execution exporter");
      } catch (error) { diagnostics.push({ code: "CAPABILITY_UNAVAILABLE", detail: String(error) }); }
    }
  } else {
    try { if (!manifest.openCodeVersion || normalizeOpenCodeVersion(await checkTool("opencode", ["--version"])) !== manifest.openCodeVersion) throw new Error("Unsupported OpenCode version"); }
    catch (error) { diagnostics.push({ code: "CAPABILITY_UNAVAILABLE", detail: String(error) }); }
  }
  try { if (!(await checkTool("python", ["--version"])).startsWith("Python 3.")) throw new Error("Python 3 required"); }
  catch (error) { diagnostics.push({ code: "CAPABILITY_UNAVAILABLE", detail: String(error) }); }
  if (stage !== "REFINING" && manifest.designEvidenceVersion === 2 && (!manifest.visualReviewModel || !Object.hasOwn(manifest.modelFamilies, manifest.visualReviewModel))) {
    diagnostics.push({code:"MODEL_FAMILIES_UNCONFIGURED",detail:"Configure a registered image-capable visualReviewModel for screenshot judgments."});
  }
  if (stage !== "REFINING" && new Set(Object.values(manifest.modelFamilies)).size < 1) diagnostics.push({ code: "MODEL_FAMILIES_UNCONFIGURED", detail: "Configure at least one verified exact provider/model identity before model execution." });
  if (stage !== "REFINING" && (typeof manifest.modelFamilies["opencode-go/beam-free"] !== "string" || manifest.modelFamilies["opencode-go/beam-free"].trim().length === 0)) diagnostics.push({ code: "MODEL_FAMILIES_UNCONFIGURED", detail: "Configure the exact opencode-go/beam-free Beam model family for legacy workflow stages." });
  return { ok: diagnostics.length === 0, diagnostics, requirement: "Explicit manual/API trigger in primary checkout; no scheduling or automatic restoration." };
}

export async function assertArticleCapabilities(root: string, probe?: CapabilityProbe, stage?: string): Promise<void> {
  const result = await inspectArticlePreflight(root, probe, stage);
  if (!result.ok) throw new Error(`CAPABILITY_UNAVAILABLE: ${JSON.stringify(result.diagnostics)}`);
}

const executionCheckout = new AsyncLocalStorage<{ checkout: string; stage?: string }>();

export function articleExecutionStage(record: { stage: string; resumeStage?: string }): string {
  return record.resumeStage ?? record.stage;
}

type ExecutionStage = string | undefined | (() => Promise<string | undefined>);

/** Nested controller operations may reuse only the preflight for this checkout. */
export async function withArticleExecution<T>(root: string, action: () => Promise<T>, probe?: CapabilityProbe, executionStage?: ExecutionStage): Promise<T> {
  const checkout = await realpath(root);
  const active = executionCheckout.getStore();
  if (!active || active.checkout !== checkout) await assertPrimaryArticleCheckout(checkout);
  const stage = typeof executionStage === "function" ? await executionStage() : executionStage ?? (active?.checkout === checkout ? active.stage : undefined);
  if (active?.checkout === checkout && active.stage === stage) return action();
  await assertArticleCapabilities(checkout, probe, stage);
  return executionCheckout.run({ checkout, stage }, action);
}
