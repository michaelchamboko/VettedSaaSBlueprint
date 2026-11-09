import { lstat, readdir, realpath } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { evidenceReference, evidenceRefSchema, hashSchema, isEvidenceSnapshotActive, readEvidence, sha256, storeEvidence, verifyEvidenceRef, type EvidenceRef } from "./execution-evidence";

// Keep this list versioned: a narrower inventory cannot silently reuse a receipt.
const ROOTS = ["src/app", "src/components", "src/styles", "src/lib", "src/generated", "src/content", "public"] as const;
const ROOT_FILES = new Set(["package.json", "package-lock.json", "npm-shrinkwrap.json", "pnpm-lock.yaml", "yarn.lock", "bun.lock", "bun.lockb", "tsconfig.json", "jsconfig.json", "vercel.json", ".browserslistrc", "approved-urls.md", "middleware.ts", "middleware.js", "proxy.ts", "proxy.js"]);
const CONFIG = /^(next|postcss|tailwind)\.config\.(?:js|cjs|mjs|ts|cts|mts)$/;
const ENTRY = /^src\/(?:middleware|proxy|instrumentation|instrumentation-client)\.(?:js|ts)$/;
const excluded = (file: string) => file === "src/lib/article-import" || file.startsWith("src/lib/article-import/");
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
function included(file: string): boolean {
  return !excluded(file) && !file.includes("\\") && !file.split("/").some((part) => part === ".." || part === "." || !part)
    && (ROOT_FILES.has(file) || CONFIG.test(file) || ENTRY.test(file) || ROOTS.some((root) => file.startsWith(`${root}/`)));
}

export const renderingInputsSchema = z.object({
  schemaVersion: z.literal("RenderingInputsV1"), inventoryVersion: z.literal(1),
  files: z.array(evidenceRefSchema).min(1).max(4096), digest: hashSchema,
}).strict().superRefine((manifest, context) => {
  if (manifest.files.some((file, index) => !included(file.path) || (index > 0 && compare(manifest.files[index - 1].path, file.path) >= 0))) {
    context.addIssue({ code: "custom", message: "Rendering inputs must be unique, ordered paths in the renderer inventory." });
  }
  if (manifest.digest !== sha256(JSON.stringify(manifest.files))) context.addIssue({ code: "custom", message: "Rendering input digest does not match its file references." });
});

export const detectorCoreFiles = {
  "direct-review": "src/components/landing/DirectReviewPage.tsx",
  blog: "src/app/blog/[slug]/page.tsx",
  visibility: "src/components/visibility/VisibilityPage.tsx",
  "decision-set": "src/components/public/DecisionJourneyPage.tsx",
} as const;
const RENDERABLE = /\.(?:tsx?|jsx?|css|scss|sass|less|html|vue|svelte)$/;
const PAGE_ENTRY = /^(?:page|layout|template)\.(?:tsx?|jsx?)$/;
const STYLE = /\.(?:css|scss|sass|less)$/;
function routeDirectoryMatches(directory: string, route: string, prefix: boolean): boolean {
  const pattern = directory.split("/").filter((part) => part && !/^\(.*\)$/.test(part));
  const segments = route.split("/").filter(Boolean);
  let cursor = 0;
  for (const part of pattern) {
    if (/^\[\[\.\.\..+\]\]$/.test(part)) return true;
    if (/^\[\.\.\..+\]$/.test(part)) return cursor < segments.length;
    if (cursor >= segments.length || (!/^\[[^\]]+\]$/.test(part) && part !== segments[cursor])) return false;
    cursor += 1;
  }
  return prefix || cursor === segments.length;
}

/** Format-owned surface coverage, not a whole-site scan or caller-selected clean file. */
export function requiredDetectorInputs(manifest: z.infer<typeof renderingInputsSchema>, target: { format: string; renderedRoutes: string[] }): EvidenceRef[] {
  const core = detectorCoreFiles[target.format as keyof typeof detectorCoreFiles];
  if (!core || !target.renderedRoutes.length || target.renderedRoutes.some((route) => !route.startsWith("/") || route.split("/").includes(".."))) throw new Error("DETECTOR_TARGET_UNSUPPORTED");
  const required = [core, "src/app/layout.tsx", "src/app/globals.css"];
  if (target.format === "direct-review") required.push("src/app/landing-page-previews/[slug]/page.tsx");
  for (const file of required) if (!manifest.files.some((ref) => ref.path === file)) throw new Error(`DETECTOR_CORE_INPUT_MISSING:${file}`);
  const subtree = core.slice(0, core.lastIndexOf("/") + 1);
  return manifest.files.filter((ref) => {
    const file = ref.path;
    if (required.includes(file)) return true;
    if (!RENDERABLE.test(file)) return false;
    if (file.startsWith(subtree) || file.startsWith("src/styles/") || (target.format !== "direct-review" && file.startsWith("src/components/public/"))) return true;
    if (!file.startsWith("src/app/")) return false;
    const relative = file.slice("src/app/".length), slash = relative.lastIndexOf("/");
    const directory = slash < 0 ? "" : relative.slice(0, slash), name = relative.slice(slash + 1);
    if (!PAGE_ENTRY.test(name) && !STYLE.test(name)) return false;
    return target.renderedRoutes.some((route) => routeDirectoryMatches(directory, route, name.startsWith("layout.") || name.startsWith("template.") || STYLE.test(name)));
  });
}

/** Deterministic, read-only inventory; symlinks cannot hide external or omitted inputs. */
export async function renderingInputPaths(root: string): Promise<string[]> {
  const files: string[] = [];
  const canonicalRoot = await realpath(root);
  async function safeDirectory(relative: string): Promise<boolean> {
    const absolute = path.resolve(canonicalRoot, relative);
    const info = await lstat(absolute).catch((error: NodeJS.ErrnoException) => { if (error.code === "ENOENT") return undefined; throw error; });
    if (!info) return false;
    const resolved = path.relative(canonicalRoot, await realpath(absolute));
    if (!info.isDirectory() || info.isSymbolicLink() || resolved === ".." || resolved.startsWith(`..${path.sep}`) || path.isAbsolute(resolved)) throw new Error(`RENDER_INPUT_INVALID_DIRECTORY:${relative}`);
    return true;
  }
  async function visit(relative: string): Promise<void> {
    if (!await safeDirectory(relative)) return;
    const entries = await readdir(path.resolve(root, relative), { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return [];
      throw error;
    });
    for (const entry of entries) {
      const file = relative ? `${relative}/${entry.name}` : entry.name;
      if (excluded(file)) continue;
      if (entry.isSymbolicLink()) throw new Error(`RENDER_INPUT_LINK_UNSUPPORTED:${file}`);
      if (entry.isDirectory()) await visit(file);
      else if (entry.isFile()) files.push(file);
      else throw new Error(`RENDER_INPUT_INVALID_FILE:${file}`);
      if (files.length > 4096) throw new Error("RENDER_INPUT_INVENTORY_TOO_LARGE");
    }
  }
  for (const directory of ROOTS) await visit(directory);
  const rootEntries = await readdir(root, { withFileTypes: true });
  for (const entry of rootEntries) {
    if (!ROOT_FILES.has(entry.name) && !CONFIG.test(entry.name)) continue;
    if (!entry.isFile()) throw new Error(`RENDER_INPUT_INVALID_FILE:${entry.name}`);
    files.push(entry.name);
  }
  const sourceEntries = await safeDirectory("src") ? await readdir(path.join(root, "src"), { withFileTypes: true }) : [];
  for (const entry of sourceEntries) {
    if (!ENTRY.test(`src/${entry.name}`)) continue;
    if (!entry.isFile()) throw new Error(`RENDER_INPUT_INVALID_FILE:src/${entry.name}`);
    files.push(`src/${entry.name}`);
  }
  return files.sort(compare);
}

export async function captureRenderingInputs(root: string, importId: string): Promise<EvidenceRef> {
  const files: EvidenceRef[] = [];
  for (const file of await renderingInputPaths(root)) files.push(await evidenceReference(root, file));
  const manifest = renderingInputsSchema.parse({ schemaVersion: "RenderingInputsV1", inventoryVersion: 1, files, digest: sha256(JSON.stringify(files)) });
  return storeEvidence(root, importId, manifest);
}

/** Historical mode reads only the terminal's frozen references, never current inventory. */
export async function validateRenderingInputs(root: string, ref: EvidenceRef, options: { historical?: boolean } = {}) {
  if (options.historical && !isEvidenceSnapshotActive()) throw new Error("RENDER_INPUT_FROZEN_SNAPSHOT_REQUIRED");
  const manifest = renderingInputsSchema.parse(await readEvidence(root, ref));
  if (!options.historical) {
    const current = await renderingInputPaths(root);
    if (JSON.stringify(current) !== JSON.stringify(manifest.files.map((file) => file.path))) throw new Error("RENDER_INPUT_INVENTORY_CHANGED");
  }
  for (const file of manifest.files) {
    try { await verifyEvidenceRef(root, file); }
    catch (error) { throw new Error(`RENDER_INPUT_CHANGED:${file.path}`, { cause: error }); }
  }
  return manifest;
}
