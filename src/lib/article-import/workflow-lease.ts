import { closeSync, fsyncSync, openSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, readdir } from "node:fs/promises";
import { hostname } from "node:os";
import path from "node:path";

export type WorkflowLease = { ownerToken: string; expiresAt: number; assertOwned(): Promise<void>; release(): Promise<void> };
type Claim = { generation: number; ownerToken: string; expiresAt: number; machine: string; pid: number; processStart: string; released: boolean };
// The identity is retained for auditing; recovery additionally requires ESRCH, never a PID-only live-owner match.
const processStart = new Date(Date.now() - process.uptime() * 1000).toISOString();
function directory(root: string, kind: string, key: string) {
  if (!["source", "intake", "import"].includes(kind) || !/^[a-zA-Z0-9-]{1,100}$/.test(key)) throw new Error("INVALID_LEASE_KEY");
  return path.join(root, ".automation/article-imports/leases", kind, key);
}
async function latest(dir: string): Promise<Claim | undefined> {
  const names = await readdir(dir).catch((error: NodeJS.ErrnoException) => { if (error.code === "ENOENT") return []; throw error; });
  const ids = names.filter((name) => /^\d+\.json$/.test(name)).map((name) => Number(name.slice(0, -5)));
  if (!ids.length) return undefined;
  try {
    const claim = JSON.parse(await readFile(path.join(dir, `${Math.max(...ids)}.json`), "utf8")) as Claim;
    if (!claim.ownerToken || !Number.isSafeInteger(claim.pid) || !claim.processStart || !claim.machine || typeof claim.released !== "boolean") throw new Error();
    return claim;
  } catch { throw new Error("LEASE_RECOVERY_UNVERIFIED"); }
}
async function append(dir: string, claim: Claim): Promise<boolean> {
  await mkdir(dir, { recursive: true });
  let file;
  try { file = await open(path.join(dir, `${claim.generation}.json`), "wx"); await file.writeFile(JSON.stringify(claim)); await file.sync(); return true; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "EEXIST") return false; throw error; }
  finally { await file?.close(); }
}
// Record intent before spawn. A crash before PID persistence leaves ownership unknown.
export function workerOwnershipFile(root: string, importId: string, leaseToken: string): string {
  if (!/^[a-f0-9-]{36}$/.test(leaseToken)) throw new Error("INVALID_LEASE_TOKEN");
  return path.join(directory(root, "import", importId), leaseToken + ".worker");
}

export function writeWorkerMarker(file: string, value: string) {
  const fd = openSync(file, "wx");
  try { writeFileSync(fd, value); fsyncSync(fd); } finally { closeSync(fd); }
}

function assertProcessExited(pid: number) {
  if (!Number.isSafeInteger(pid) || pid < 1) throw new Error("LEASE_RECOVERY_UNVERIFIED");
  try { process.kill(pid, 0); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ESRCH") return; }
  throw new Error("LEASE_RECOVERY_UNVERIFIED");
}

async function assertWorkerExited(dir: string, token: string) {
  const marker = path.join(dir, token + ".worker");
  let protocol;
  try { protocol = await readFile(marker, "utf8"); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return; throw error; }
  if (protocol === "host-v1") {
    try { assertProcessExited(Number(await readFile(marker + ".host", "utf8"))); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return; throw error; }
    try { await readFile(marker + ".start"); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return; throw error; }
  }
  let identity: string;
  try { identity = await readFile(marker + ".pid", "utf8"); }
  catch { throw new Error("LEASE_RECOVERY_UNVERIFIED"); }
  if (identity !== "spawn-failed") {
    const pid = Number(identity);
    assertProcessExited(pid);
    if (protocol === "host-v1" && process.platform !== "win32") {
      try { process.kill(-pid, 0); }
      catch (error) { if ((error as NodeJS.ErrnoException).code === "ESRCH") return; }
      throw new Error("LEASE_RECOVERY_UNVERIFIED");
    }
  }
}
export async function claimWorkflowLease(root: string, kind: "source" | "intake" | "import", key: string, ttlMs = 30 * 60_000): Promise<WorkflowLease | undefined> {
  const dir = directory(root, kind, key);
  const previous = await latest(dir);
  if (previous && !previous.released) return undefined; // Time cannot fence a paused writer.
  const claim: Claim = { generation: (previous?.generation ?? 0) + 1, ownerToken: randomUUID(), expiresAt: Date.now() + ttlMs, machine: hostname(), pid: process.pid, processStart, released: false };
  if (!await append(dir, claim)) return undefined;
  const assertOwned = async () => {
    const current = await latest(dir);
    if (process.pid !== claim.pid || current?.ownerToken !== claim.ownerToken || current.released) throw new Error("LEASE_OWNER_CHANGED");
  };
  return { ownerToken: claim.ownerToken, expiresAt: claim.expiresAt, assertOwned, release: async () => {
    await assertOwned();
    if (kind === "import") await assertWorkerExited(dir, claim.ownerToken);
    if (!await append(dir, { ...claim, generation: claim.generation + 1, released: true })) throw new Error("LEASE_OWNER_CHANGED");
  } };
}
/** Explicit recovery only. Conservative PID reuse handling: any currently live PID remains blocked. */
export async function recoverWorkflowLease(root: string, kind: "source" | "intake" | "import", key: string): Promise<void> {
  const dir = directory(root, kind, key);
  const previous = await latest(dir);
  if (!previous || previous.released) return;
  if (previous.machine !== hostname()) throw new Error("LEASE_RECOVERY_UNVERIFIED");
  assertProcessExited(previous.pid);
  if (kind === "import") await assertWorkerExited(dir, previous.ownerToken);
  if (!await append(dir, { ...previous, generation: previous.generation + 1, released: true })) throw new Error("LEASE_RECOVERY_CONFLICT");
}
