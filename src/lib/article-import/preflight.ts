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
  openCodeVersion: openCodeVersionSchema,
  modelFamilies: z.record(z.string(), z.string().min(1)),
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

export type CapabilityProbe = (tool: "opencode" | "python", args: string[]) => Promise<string>;
const probe: CapabilityProbe = async (tool, args) => {
  const executable = tool === "python" ? process.env.PYTHON || "python" : openCodeExecutable();
  const result = await run(executable, args, { windowsHide: true, timeout: 10_000, maxBuffer: 64 * 1024 });
  return result.stdout.trim();
};

export async function inspectArticlePreflight(root: string, checkTool: CapabilityProbe = probe) {
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
  try { if (normalizeOpenCodeVersion(await checkTool("opencode", ["--version"])) !== manifest.openCodeVersion) throw new Error("Unsupported OpenCode version"); }
  catch (error) { diagnostics.push({ code: "CAPABILITY_UNAVAILABLE", detail: String(error) }); }
  try { if (!(await checkTool("python", ["--version"])).startsWith("Python 3.")) throw new Error("Python 3 required"); }
  catch (error) { diagnostics.push({ code: "CAPABILITY_UNAVAILABLE", detail: String(error) }); }
  if (new Set(Object.values(manifest.modelFamilies)).size < 1) diagnostics.push({ code: "MODEL_FAMILIES_UNCONFIGURED", detail: "Configure at least one verified exact provider/model identity before editorial execution." });
  if (typeof manifest.modelFamilies["opencode-go/beam-free"] !== "string" || manifest.modelFamilies["opencode-go/beam-free"].trim().length === 0) diagnostics.push({ code: "MODEL_FAMILIES_UNCONFIGURED", detail: "Configure the exact opencode-go/beam-free Beam model family before editorial execution." });
  return { ok: diagnostics.length === 0, diagnostics, requirement: "Explicit manual/API trigger in primary checkout; no scheduling or automatic restoration." };
}

export async function assertArticleCapabilities(root: string, probe?: CapabilityProbe): Promise<void> {
  const result = await inspectArticlePreflight(root, probe);
  if (!result.ok) throw new Error(`CAPABILITY_UNAVAILABLE: ${JSON.stringify(result.diagnostics)}`);
}

const executionCheckout = new AsyncLocalStorage<string>();

/** Nested controller operations may reuse only the preflight for this checkout. */
export async function withArticleExecution<T>(root: string, action: () => Promise<T>, probe?: CapabilityProbe): Promise<T> {
  const checkout = await realpath(root);
  if (executionCheckout.getStore() === checkout) return action();
  await assertPrimaryArticleCheckout(checkout);
  await assertArticleCapabilities(checkout, probe);
  return executionCheckout.run(checkout, action);
}
