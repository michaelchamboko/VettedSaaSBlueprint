import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import { loadImport, writeJsonAtomically } from "./engine";
import { claimWorkflowLease, type WorkflowLease } from "./workflow-lease";
import { evaluateWorkflowEvidence } from "./workflow-evidence";

const INTAKE_ROOT = ".automation/article-imports/intake";
const eligible = /\.(md|markdown|txt)$/i;
const blockerSchema = z.object({ scope: z.enum(["article", "shared"]), code: z.string().min(1), stage: z.string().optional(), message: z.string().min(1) }).strict();
const entrySchema = z.object({ relativePath: z.string().min(1), sourceFingerprint: z.string().regex(/^[a-f0-9]{64}$/).optional(), capturedPath: z.string().min(1).optional(), status: z.enum(["PENDING", "SKIPPED", "BLOCKED", "PROCESSING", "LIVE", "QUARANTINED"]), reason: z.string().optional(), importId: z.string().regex(/^article-[0-9a-f-]{36}$/).optional(), blocker: blockerSchema.optional() }).strict();
const intakeSchema = z.object({ schemaVersion: z.enum(["ArticleIntakeRunV1", "ArticleIntakeRunV2"]), revision: z.number().int().nonnegative().optional(), history: z.array(z.object({ relativePath: z.string(), previousStatus: entrySchema.shape.status, at: z.string().datetime({ offset: true }) }).strict()).optional(), runId: z.string().regex(/^intake-[0-9a-f-]{36}$/), createdAt: z.string().datetime({ offset: true }), sourceDirectory: z.string(), entries: z.array(entrySchema), activeEntry: z.string().optional(), outcome: z.enum(["OPEN", "PROCESSING_PASS_FINISHED", "PUBLISHED_WITH_EXCEPTIONS", "ALL_PUBLISHED"]), blocker: blockerSchema.extend({ scope: z.literal("shared") }).optional() }).strict();

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
  schemaVersion: "ArticleIntakeRunV1" | "ArticleIntakeRunV2";
  revision?: number;
  history?: { relativePath: string; previousStatus: IntakeEntry["status"]; at: string }[];
  runId: string;
  createdAt: string;
  sourceDirectory: string;
  entries: IntakeEntry[];
  activeEntry?: string;
  outcome: "OPEN" | "PROCESSING_PASS_FINISHED" | "PUBLISHED_WITH_EXCEPTIONS" | "ALL_PUBLISHED";
  blocker?: { scope: "shared"; code: string; stage?: string; message: string };
};

function runPath(root: string, runId: string): string { return path.join(root, INTAKE_ROOT, runId, "run.json"); }

async function saveRun(root: string, run: IntakeRun, lease: WorkflowLease): Promise<void> {
  await writeJsonAtomically(runPath(root, run.runId), run, async (from, to) => {
    await lease.assertOwned();
    await rename(from, to);
  });
}

export async function loadIntakeRun(root: string, runId: string): Promise<IntakeRun> {
  if (!/^intake-[0-9a-f-]{36}$/.test(runId)) throw new Error("INVALID_INTAKE_ID");
  const run = intakeSchema.parse(JSON.parse(await readFile(runPath(root, runId), "utf8"))) as IntakeRun;
  if (!["ArticleIntakeRunV1", "ArticleIntakeRunV2"].includes(run.schemaVersion) || run.runId !== runId || !Array.isArray(run.entries) || run.entries.some((entry) => !["PENDING", "SKIPPED", "BLOCKED", "PROCESSING", "LIVE", "QUARANTINED"].includes(entry.status) || typeof entry.relativePath !== "string") || run.schemaVersion === "ArticleIntakeRunV2" && !Number.isSafeInteger(run.revision)) throw new Error("INVALID_INTAKE_STATE");
  return run;
}

async function mutateRun(root: string, runId: string, change: (run: IntakeRun) => Promise<IntakeRun> | IntakeRun): Promise<IntakeRun> {
  const lease = await claimWorkflowLease(root, "intake", runId);
  if (!lease) throw new Error("INTAKE_BUSY");
  try {
    const current = await loadIntakeRun(root, runId);
    if (current.schemaVersion !== "ArticleIntakeRunV2") throw new Error("LEGACY_UPGRADE_REQUIRED");
    const updated = await change(current);
    if (updated === current) return current;
    await lease.assertOwned();
    updated.revision = (current.revision ?? 0) + 1;
    await saveRun(root, updated, lease); return updated;
  } finally { await lease.release(); }
}

async function terminalProof(root: string, entry: IntakeEntry): Promise<boolean> {
  if (!entry.importId || !entry.sourceFingerprint) return false;
  try {
    const record = await loadImport(root, entry.importId);
    return record.sourceFingerprint === entry.sourceFingerprint && record.stage === entry.status && (await evaluateWorkflowEvidence(record, { root }, "historical-terminal")).ok;
  } catch { return false; }
}

export async function checkIntakeRun(root: string, runId: string): Promise<{ ok: boolean; diagnostics: string[] }> {
  const run = await loadIntakeRun(root, runId);
  const diagnostics: string[] = [];
  if (run.entries.filter((entry) => entry.status === "PROCESSING").length > 1) diagnostics.push("INTAKE_RECONCILIATION_CONFLICT");
  for (const entry of run.entries) if (["LIVE", "QUARANTINED"].includes(entry.status) && !await terminalProof(root, entry)) diagnostics.push(`INTAKE_TERMINAL_PROOF_INVALID:${entry.relativePath}`);
  return { ok: diagnostics.length === 0, diagnostics };
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
  const run: IntakeRun = { schemaVersion: "ArticleIntakeRunV2", revision: 0, history: [], runId, createdAt: new Date().toISOString(), sourceDirectory: path.relative(root, absolute).replaceAll("\\", "/"), entries, outcome: "OPEN" };
  const lease = await claimWorkflowLease(root, "intake", runId);
  if (!lease) throw new Error("INTAKE_BUSY");
  try { await saveRun(root, run, lease); } finally { await lease.release(); }
  return run;
}

export function nextIntakeEntry(run: IntakeRun): IntakeEntry | undefined {
  if (run.blocker) return undefined;
  return run.entries.find((entry) => entry.status === "PROCESSING") ?? run.entries.find((entry) => entry.status === "PENDING");
}

export async function markIntakeEntry(root: string, run: IntakeRun, relativePath: string, status: IntakeEntry["status"], patch: Partial<IntakeEntry> = {}): Promise<IntakeRun> {
  const expectedRevision = run.revision;
  return mutateRun(root, run.runId, async (current) => {
  if (expectedRevision !== current.revision) throw new Error("INTAKE_REVISION_CONFLICT");
  run = current;
  const original = run.entries.find((entry) => entry.relativePath === relativePath);
  if (!original) throw new Error("INTAKE_ENTRY_NOT_FOUND");
  if (patch.relativePath && patch.relativePath !== original.relativePath || patch.sourceFingerprint && patch.sourceFingerprint !== original.sourceFingerprint || patch.capturedPath && patch.capturedPath !== original.capturedPath || original.importId && patch.importId && original.importId !== patch.importId) throw new Error("INTAKE_SOURCE_IMMUTABLE");
  if (status === "PROCESSING" && run.entries.some((entry) => entry.relativePath !== relativePath && entry.status === "PROCESSING")) throw new Error("INTAKE_RECONCILIATION_CONFLICT");
  if (status === "BLOCKED") {
    if (!original.importId) throw new Error("INTAKE_BLOCKER_PROOF_REQUIRED");
    const importRecord = await loadImport(root, original.importId);
    if (importRecord.continuation?.kind !== "blocked" || importRecord.continuation.scope !== "article" || !patch.blocker || patch.blocker.scope !== "article") throw new Error("INTAKE_BLOCKER_PROOF_REQUIRED");
  }
  if (["LIVE", "QUARANTINED"].includes(status) && !await terminalProof(root, { ...original, ...patch, status })) throw new Error("INTAKE_TERMINAL_PROOF_INVALID");
  if (patch.importId) { const record = await loadImport(root, patch.importId); if (record.sourceFingerprint !== original.sourceFingerprint) throw new Error("INTAKE_IMPORT_SOURCE_MISMATCH"); }
  const entries = run.entries.map((entry) => entry.relativePath === relativePath ? { ...entry, ...patch, status } : entry);
  const open = entries.some((entry) => entry.status === "PENDING" || entry.status === "PROCESSING");
  const eligibleEntries = entries.filter((entry) => entry.status !== "SKIPPED");
  const outcome: IntakeRun["outcome"] = open ? "OPEN" : eligibleEntries.length > 0 && eligibleEntries.every((entry) => entry.status === "LIVE") ? "ALL_PUBLISHED" : eligibleEntries.some((entry) => entry.status === "LIVE") ? "PUBLISHED_WITH_EXCEPTIONS" : "PROCESSING_PASS_FINISHED";
  const activeEntry = entries.find((entry) => entry.status === "PROCESSING")?.relativePath;
  const updated = { ...run, entries, activeEntry, outcome };
  return updated;
  });
}

export async function setIntakeBlocker(root: string, run: IntakeRun, blocker: IntakeEntry["blocker"] & { scope: "shared" }): Promise<IntakeRun> {
  return mutateRun(root, run.runId, current => {
    if (run.revision !== current.revision || !run.activeEntry || current.activeEntry !== run.activeEntry) throw new Error("INTAKE_RECONCILIATION_CONFLICT");
    return { ...current, blocker, outcome: "OPEN" };
  });
}

export async function clearIntakeBlocker(root: string, run: IntakeRun, relativePath: string): Promise<IntakeRun> {
  return mutateRun(root, run.runId, (current) => {
    const entry = current.entries.find(item => item.relativePath === relativePath);
    const expected = run.entries.find(item => item.relativePath === relativePath);
    if (!entry || !expected || expected.importId !== entry.importId) throw new Error("INTAKE_RECONCILIATION_CONFLICT");
    if (!entry.blocker && entry.status === "PROCESSING") return current;
    if (entry.blocker?.scope !== "article") throw new Error("INTAKE_ARTICLE_BLOCKER_REQUIRED");
    if (run.revision !== current.revision) throw new Error("INTAKE_RECONCILIATION_CONFLICT");
    if (current.entries.some(item => item.relativePath !== relativePath && item.status === "PROCESSING")) throw new Error("INTAKE_RECONCILIATION_CONFLICT");
    const entries = current.entries.map(item => item.relativePath === relativePath ? { ...item, status: "PROCESSING" as const, blocker: undefined } : item);
    return { ...current, entries, activeEntry: relativePath, outcome: "OPEN" };
  });
}

export async function clearSharedIntakeBlocker(root: string, run: IntakeRun, relativePath: string, importId: string): Promise<IntakeRun> {
  return mutateRun(root, run.runId, (current) => {
    const entry = current.entries.find(item => item.relativePath === relativePath);
    if (current.activeEntry !== relativePath || entry?.importId !== importId) throw new Error("INTAKE_BLOCKER_IMPORT_MISMATCH");
    if (!current.blocker && run.blocker) return current;
    if (!current.blocker) throw new Error("INTAKE_SHARED_BLOCKER_REQUIRED");
    if (run.revision !== current.revision) throw new Error("INTAKE_RECONCILIATION_CONFLICT");
    return { ...current, blocker: undefined, outcome: "OPEN" };
  });
}

export async function claimNextIntakeEntry(root: string, runId: string): Promise<IntakeRun> {
  return mutateRun(root, runId, async (run) => {
    for (const entry of run.entries) if (["LIVE", "QUARANTINED"].includes(entry.status) && !await terminalProof(root, entry)) throw new Error(`INTAKE_TERMINAL_PROOF_INVALID:${entry.relativePath}`);
    const entry = nextIntakeEntry(run);
    if (!entry) return run;
    if (entry.status === "PROCESSING") return run;
    entry.status = "PROCESSING";
    return { ...run, activeEntry: entry.relativePath };
  });
}

export async function upgradeIntakeRun(root: string, runId: string): Promise<IntakeRun> {
  const lease = await claimWorkflowLease(root, "intake", runId);
  if (!lease) throw new Error("INTAKE_BUSY");
  try {
    const run = await loadIntakeRun(root, runId);
    if (run.schemaVersion === "ArticleIntakeRunV2") return run;
    for (const entry of run.entries.filter((e) => e.status !== "SKIPPED")) {
      if (!entry.capturedPath || !entry.sourceFingerprint) throw new Error("INTAKE_SOURCE_MISSING");
      const source = await readFile(path.resolve(root, entry.capturedPath));
      if (createHash("sha256").update(source).digest("hex") !== entry.sourceFingerprint) throw new Error("INTAKE_SOURCE_MISMATCH");
    }
    await writeFile(`${runPath(root, runId)}.v1.archive`, await readFile(runPath(root, runId)), { flag: "wx" }).catch((e: NodeJS.ErrnoException) => { if (e.code !== "EEXIST") throw e; });
    const updated: IntakeRun = { ...run, schemaVersion: "ArticleIntakeRunV2", revision: 0, history: [] };
    await lease.assertOwned(); await saveRun(root, updated, lease); return updated;
  } finally { await lease.release(); }
}

export async function reconcileIntakeEntry(root: string, runId: string, relativePath: string): Promise<IntakeRun> {
  return mutateRun(root, runId, async (run) => {
    const entry = run.entries.find((e) => e.relativePath === relativePath);
    if (!entry?.importId) throw new Error("INTAKE_ENTRY_NOT_FOUND");
    if (run.entries.some((e) => e.status === "PROCESSING" && e !== entry)) throw new Error("INTAKE_RECONCILIATION_CONFLICT");
    const record = await loadImport(root, entry.importId);
    if (record.schemaVersion !== "ExternalArticleImportV2" || record.sourceFingerprint !== entry.sourceFingerprint || ["LIVE", "QUARANTINED"].includes(record.stage)) throw new Error("INTAKE_RECONCILIATION_INVALID");
    if (entry.status !== "PROCESSING") { run.history = [...(run.history ?? []), { relativePath, previousStatus: entry.status, at: new Date().toISOString() }]; entry.status = "PROCESSING"; }
    return { ...run, activeEntry: relativePath, outcome: "OPEN" };
  });
}
