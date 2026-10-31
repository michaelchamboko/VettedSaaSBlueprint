import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { writeJsonAtomically } from "./engine";

const INTAKE_ROOT = ".automation/article-imports/intake";
const eligible = /\.(md|markdown|txt)$/i;

export type IntakeEntry = {
  relativePath: string;
  sourceFingerprint?: string;
  capturedPath?: string;
  status: "PENDING" | "SKIPPED" | "BLOCKED" | "PROCESSING" | "LIVE" | "QUARANTINED";
  reason?: string;
  importId?: string;
  blocker?: { scope: "article" | "shared"; code: string; stage?: string; message: string };
};

export type IntakeRun = {
  schemaVersion: "ArticleIntakeRunV1";
  runId: string;
  createdAt: string;
  sourceDirectory: string;
  entries: IntakeEntry[];
  activeEntry?: string;
  outcome: "OPEN" | "PROCESSING_PASS_FINISHED" | "PUBLISHED_WITH_EXCEPTIONS";
  blocker?: { scope: "shared"; code: string; stage?: string; message: string };
};

function runPath(root: string, runId: string): string { return path.join(root, INTAKE_ROOT, runId, "run.json"); }

async function saveRun(root: string, run: IntakeRun): Promise<void> {
  await writeJsonAtomically(runPath(root, run.runId), run);
}

export async function loadIntakeRun(root: string, runId: string): Promise<IntakeRun> {
  return JSON.parse(await readFile(runPath(root, runId), "utf8")) as IntakeRun;
}

export async function createIntakeRun(root: string, sourceDirectory = "Article Intake"): Promise<IntakeRun> {
  const absolute = path.resolve(root, sourceDirectory);
  const names = (await readdir(absolute, { withFileTypes: true })).filter((entry) => entry.isFile()).map((entry) => entry.name).sort((a, b) => a.localeCompare(b));
  const runId = `intake-${randomUUID()}`;
  const base = path.join(root, INTAKE_ROOT, runId);
  await mkdir(path.join(base, "sources"), { recursive: true });
  const entries: IntakeEntry[] = [];
  for (const name of names) {
    const relativePath = path.relative(root, path.join(absolute, name)).replaceAll("\\", "/");
    if (!eligible.test(name)) { entries.push({ relativePath, status: "SKIPPED", reason: "Unsupported file type." }); continue; }
    const source = await readFile(path.join(absolute, name));
    const sourceFingerprint = createHash("sha256").update(source).digest("hex");
    const capturedPath = path.join(INTAKE_ROOT, runId, "sources", `${sourceFingerprint}.source`);
    await writeFile(path.join(root, capturedPath), source, { flag: "wx" }).catch(async (error: unknown) => { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; });
    entries.push({ relativePath, sourceFingerprint, capturedPath, status: "PENDING" });
  }
  const run: IntakeRun = { schemaVersion: "ArticleIntakeRunV1", runId, createdAt: new Date().toISOString(), sourceDirectory: path.relative(root, absolute).replaceAll("\\", "/"), entries, outcome: "OPEN" };
  await saveRun(root, run);
  return run;
}

export function nextIntakeEntry(run: IntakeRun): IntakeEntry | undefined {
  if (run.blocker) return undefined;
  return run.entries.find((entry) => entry.status === "PROCESSING") ?? run.entries.find((entry) => entry.status === "PENDING");
}

export async function markIntakeEntry(root: string, run: IntakeRun, relativePath: string, status: IntakeEntry["status"], patch: Partial<IntakeEntry> = {}): Promise<IntakeRun> {
  const entries = run.entries.map((entry) => entry.relativePath === relativePath ? { ...entry, ...patch, status } : entry);
  const open = entries.some((entry) => entry.status === "PENDING" || entry.status === "PROCESSING");
  const outcome: IntakeRun["outcome"] = open ? "OPEN" : entries.some((entry) => entry.status === "BLOCKED" || entry.status === "QUARANTINED") ? "PUBLISHED_WITH_EXCEPTIONS" : "PROCESSING_PASS_FINISHED";
  const activeEntry = entries.find((entry) => entry.status === "PROCESSING")?.relativePath;
  const updated = { ...run, entries, activeEntry, outcome };
  await saveRun(root, updated);
  return updated;
}

export async function setIntakeBlocker(root: string, run: IntakeRun, blocker: IntakeEntry["blocker"] & { scope: "shared" }): Promise<IntakeRun> {
  const updated = { ...run, blocker, outcome: "PUBLISHED_WITH_EXCEPTIONS" as const };
  await saveRun(root, updated);
  return updated;
}

export async function clearIntakeBlocker(root: string, run: IntakeRun, relativePath: string): Promise<IntakeRun> {
  const entry = run.entries.find((item) => item.relativePath === relativePath);
  if (!entry?.blocker || entry.blocker.scope !== "article") throw new Error("INTAKE_ARTICLE_BLOCKER_REQUIRED");
  const entries = run.entries.map((item) => item.relativePath === relativePath ? { ...item, status: "PROCESSING" as const, blocker: undefined } : item);
  const updated = { ...run, entries, activeEntry: relativePath, outcome: "OPEN" as const };
  await saveRun(root, updated);
  return updated;
}

export async function clearSharedIntakeBlocker(root: string, run: IntakeRun): Promise<IntakeRun> {
  if (!run.blocker) throw new Error("INTAKE_SHARED_BLOCKER_REQUIRED");
  const updated = { ...run, blocker: undefined, outcome: "OPEN" as const };
  await saveRun(root, updated);
  return updated;
}
