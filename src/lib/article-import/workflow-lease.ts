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
    if (!await append(dir, { ...claim, generation: claim.generation + 1, released: true })) throw new Error("LEASE_OWNER_CHANGED");
  } };
}
/** Explicit recovery only. Conservative PID reuse handling: any currently live PID remains blocked. */
export async function recoverWorkflowLease(root: string, kind: "source" | "intake" | "import", key: string): Promise<void> {
  const dir = directory(root, kind, key);
  const previous = await latest(dir);
  if (!previous || previous.released) return;
  if (previous.machine !== hostname()) throw new Error("LEASE_RECOVERY_UNVERIFIED");
  try { process.kill(previous.pid, 0); throw new Error("LEASE_RECOVERY_UNVERIFIED"); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw new Error("LEASE_RECOVERY_UNVERIFIED"); }
  if (!await append(dir, { ...previous, generation: previous.generation + 1, released: true })) throw new Error("LEASE_RECOVERY_CONFLICT");
}
