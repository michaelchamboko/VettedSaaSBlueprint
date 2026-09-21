import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  automationRunSchema,
  type AutomationJobType,
  type AutomationRunV1,
  fingerprintAutomation,
} from "@/lib/automation/contracts";

const LOCK_TTL_MS = 3 * 60 * 60 * 1000;

export type LocalAutomationStore = {
  root: string;
  now?: () => Date;
};

function safeKey(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function paths(store: LocalAutomationStore, key: string) {
  const base = path.resolve(store.root, ".automation");
  const name = safeKey(key);
  return {
    base,
    state: path.join(base, "state", `${name}.json`),
    lock: path.join(base, "locks", `${name}.lock`),
    receiptDirectory: path.join(base, "receipts"),
  };
}

function now(store: LocalAutomationStore): Date {
  return (store.now ?? (() => new Date()))();
}

async function ensureDirectories(target: ReturnType<typeof paths>) {
  await Promise.all([mkdir(path.dirname(target.state), { recursive: true }), mkdir(path.dirname(target.lock), { recursive: true }), mkdir(target.receiptDirectory, { recursive: true })]);
}

async function readRun(statePath: string): Promise<AutomationRunV1 | null> {
  try {
    return automationRunSchema.parse(JSON.parse(await readFile(statePath, "utf8")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function writeRun(statePath: string, run: AutomationRunV1) {
  await writeFile(statePath, `${JSON.stringify(run, null, 2)}\n`, "utf8");
}

async function acquireLock(lockPath: string, at: Date): Promise<boolean> {
  try {
    const handle = await open(lockPath, "wx");
    await handle.writeFile(at.toISOString(), "utf8");
    await handle.close();
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    const existing = await stat(lockPath);
    if (at.getTime() - existing.mtimeMs <= LOCK_TTL_MS) return false;
    await rm(lockPath, { force: true });
    return acquireLock(lockPath, at);
  }
}

export async function startLocalAutomationRun(input: {
  store: LocalAutomationStore;
  type: AutomationJobType;
  scheduledWindow: string;
}): Promise<{ run: AutomationRunV1; created: boolean }> {
  const idempotencyKey = `${input.type}:${input.scheduledWindow}`;
  const target = paths(input.store, idempotencyKey);
  await ensureDirectories(target);
  const at = now(input.store);
  const lockAcquired = await acquireLock(target.lock, at);
  const existing = await readRun(target.state);

  if (!lockAcquired) {
    if (!existing) throw new Error(`Automation lock exists without state for ${idempotencyKey}.`);
    return { run: existing, created: false };
  }
  if (existing?.state === "completed" || existing?.state === "blocked") {
    await rm(target.lock, { force: true });
    return { run: existing, created: false };
  }

  const run: AutomationRunV1 = existing
    ? { ...existing, state: "running", completedAt: null, resultReference: null, failureFingerprint: null }
    : {
        version: 1,
        runId: randomUUID(),
        type: input.type,
        scheduledWindow: input.scheduledWindow,
        idempotencyKey,
        state: "running",
        attempts: 0,
        maxAttempts: 3,
        startedAt: at.toISOString(),
        completedAt: null,
        resultReference: null,
        failureFingerprint: null,
      };
  await writeRun(target.state, run);
  return { run, created: !existing };
}

export async function readLocalAutomationRun(input: {
  store: LocalAutomationStore;
  type: AutomationJobType;
  scheduledWindow: string;
}): Promise<AutomationRunV1 | null> {
  return readRun(paths(input.store, `${input.type}:${input.scheduledWindow}`).state);
}

export async function completeLocalAutomationRun(input: {
  store: LocalAutomationStore;
  run: AutomationRunV1;
  result: unknown;
}): Promise<AutomationRunV1> {
  const target = paths(input.store, input.run.idempotencyKey);
  const current = await readRun(target.state);
  if (!current || current.runId !== input.run.runId || current.state !== "running") throw new Error("Only the active local run can be completed.");
  const completedAt = now(input.store).toISOString();
  const completed: AutomationRunV1 = {
    ...current,
    state: "completed",
    completedAt,
    resultReference: path.join(target.receiptDirectory, input.run.scheduledWindow, `${input.run.type}.json`),
  };
  const receiptPath = path.join(target.receiptDirectory, input.run.scheduledWindow, `${input.run.type}.json`);
  await mkdir(path.dirname(receiptPath), { recursive: true });
  await writeFile(receiptPath, `${JSON.stringify({ version: 1, run: completed, result: input.result, completedAt }, null, 2)}\n`, "utf8");
  await writeRun(target.state, completed);
  await rm(target.lock, { force: true });
  return completed;
}

export async function failLocalAutomationRun(input: {
  store: LocalAutomationStore;
  run: AutomationRunV1;
  failure: unknown;
}): Promise<AutomationRunV1> {
  const target = paths(input.store, input.run.idempotencyKey);
  const current = await readRun(target.state);
  if (!current || current.runId !== input.run.runId || current.state !== "running") throw new Error("Only the active local run can fail.");
  const attempts = current.attempts + 1;
  const blocked = attempts >= current.maxAttempts;
  const failed: AutomationRunV1 = {
    ...current,
    attempts,
    state: blocked ? "blocked" : "failed",
    completedAt: blocked ? now(input.store).toISOString() : null,
    failureFingerprint: fingerprintAutomation(input.failure),
  };
  await writeRun(target.state, failed);
  await rm(target.lock, { force: true });
  if (blocked) {
    const escalation = path.join(target.receiptDirectory, input.run.scheduledWindow, `${input.run.type}-escalation.json`);
    await mkdir(path.dirname(escalation), { recursive: true });
    await writeFile(escalation, `${JSON.stringify({ version: 1, run: failed, failure: input.failure }, null, 2)}\n`, "utf8");
  }
  return failed;
}

export async function readLocalAutomationReceipt(store: LocalAutomationStore, window: string, type: AutomationJobType): Promise<unknown | null> {
  const receiptPath = path.resolve(store.root, ".automation", "receipts", window, `${type}.json`);
  try {
    return JSON.parse(await readFile(receiptPath, "utf8")) as unknown;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}
