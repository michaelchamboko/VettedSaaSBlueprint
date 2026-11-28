import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import type { Readable, Writable } from "node:stream";
import { Pool } from "pg";
import { z } from "zod";

import { closePool, type TransactionRunner, type TransactionSql } from "../db";
import { withTransaction, type TransactionConnection } from "../db/query";
import type { ArticleResearchRegistry } from "./research-registry";
import { NeonArticleResearchRegistry } from "./research-registry-neon";

const NEON_SCOPE = {
  project_id: "winter-truth-98410571",
  branch_id: "br-spring-smoke-a65esjkh",
  database_name: "neondb",
  role_name: "article_research_worker",
} as const;
const DEFAULT_TIMEOUT_MS = 30_000;

type QueryResult = { rows: Record<string, unknown>[] };
export type ArticleRegistryPool = {
  query(sql: string, binds?: unknown[]): Promise<{ rows: unknown[] }>;
  connect(): Promise<TransactionConnection>;
  end(): Promise<void>;
};

export type ArticleRegistryAppServerProcess = {
  stdin: Pick<Writable, "write" | "end">;
  stdout: Readable;
  once(event: "exit", listener: (code: number | null, signal: NodeJS.Signals | null) => void): unknown;
  once(event: "error", listener: (error: Error) => void): unknown;
  kill(): boolean;
};

type RegistryDatabase = { query(sql: string, binds?: unknown[]): Promise<QueryResult>; transaction: TransactionRunner };

export function createPoolResearchRegistryDatabase(pool: ArticleRegistryPool, secret?: string): RegistryDatabase {
  const protect = (error: unknown): never => {
    if (!(error instanceof Error) || !secret || !error.message.includes(secret)) throw error;
    const safe = new Error(error.message.replaceAll(secret, "[redacted]"));
    if ("code" in error) Object.assign(safe, { code: (error as Error & { code?: string }).code });
    throw safe;
  };
  return {
    async query(sql, binds = []) {
      try {
        const result = await pool.query(sql, binds);
        return { rows: result.rows as Record<string, unknown>[] };
      } catch (error) {
        return protect(error);
      }
    },
    async transaction<T>(work: (tx: TransactionSql) => Promise<T>): Promise<T> {
      try {
        return await withTransaction(work, () => pool.connect());
      } catch (error) {
        return protect(error);
      }
    },
  };
}

const responseEnvelopeSchema = z.object({
  jsonrpc: z.literal("2.0").optional(),
  id: z.union([z.number(), z.string()]),
  result: z.unknown().optional(),
  error: z.unknown().optional(),
}).passthrough();
const notificationEnvelopeSchema = z.object({
  jsonrpc: z.literal("2.0").optional(),
  method: z.string().min(1),
}).passthrough();
const threadStartSchema = z.object({ thread: z.object({ id: z.string().min(1) }).passthrough() }).passthrough();
const connectionResultSchema = z.object({
  structuredContent: z.object({ data: z.string().trim().min(1) }).passthrough(),
}).passthrough();

class AppServerRpc {
  private nextId = 1;
  private pending: { id: number; resolve(value: unknown): void; reject(error: Error): void; timer: NodeJS.Timeout } | undefined;
  private closed = false;
  private exited = false;
  private readonly lines;

  constructor(private readonly child: ArticleRegistryAppServerProcess, private readonly timeoutMs: number) {
    this.lines = createInterface({ input: child.stdout });
    this.lines.on("line", (line) => this.receive(line));
    child.once("exit", () => {
      this.exited = true;
      this.rejectPending("ARTICLE_RESEARCH_OAUTH_PREMATURE_EXIT");
    });
    child.once("error", () => this.rejectPending("ARTICLE_RESEARCH_OAUTH_START_FAILED"));
  }

  async request(method: string, params: unknown): Promise<unknown> {
    if (this.closed || this.pending) throw new Error("ARTICLE_RESEARCH_OAUTH_TRANSPORT_UNAVAILABLE");
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => this.rejectPending("ARTICLE_RESEARCH_OAUTH_TIMEOUT"), this.timeoutMs);
      this.pending = { id, resolve, reject, timer };
      try {
        this.child.stdin.write(`${JSON.stringify({ id, method, params })}\n`);
      } catch {
        this.rejectPending("ARTICLE_RESEARCH_OAUTH_WRITE_FAILED");
      }
    });
  }

  private receive(line: string): void {
    if (!this.pending) return;
    let parsed: unknown;
    try { parsed = JSON.parse(line); }
    catch { this.rejectPending("ARTICLE_RESEARCH_OAUTH_MALFORMED_RESPONSE"); return; }
    if (notificationEnvelopeSchema.safeParse(parsed).success && !(typeof parsed === "object" && parsed !== null && "id" in parsed)) return;
    const response = responseEnvelopeSchema.safeParse(parsed);
    if (!response.success) { this.rejectPending("ARTICLE_RESEARCH_OAUTH_MALFORMED_RESPONSE"); return; }
    if (response.data.id !== this.pending.id) { this.rejectPending("ARTICLE_RESEARCH_OAUTH_UNBOUND_RESPONSE"); return; }
    if (response.data.error !== undefined || response.data.result === undefined) { this.rejectPending("ARTICLE_RESEARCH_OAUTH_REQUEST_FAILED"); return; }
    const pending = this.pending;
    this.pending = undefined;
    clearTimeout(pending.timer);
    pending.resolve(response.data.result);
  }

  private rejectPending(code: string): void {
    const pending = this.pending;
    if (!pending) return;
    this.pending = undefined;
    clearTimeout(pending.timer);
    pending.reject(new Error(code));
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    this.rejectPending("ARTICLE_RESEARCH_OAUTH_TRANSPORT_CLOSED");
    this.lines.close();
    if (this.exited) return;
    let timer: NodeJS.Timeout | undefined;
    const exited = new Promise<void>((resolve) => this.child.once("exit", () => resolve()));
    const timeout = new Promise<void>((resolve) => { timer = setTimeout(resolve, this.timeoutMs); });
    this.child.stdin.end();
    this.child.kill();
    await Promise.race([exited, timeout]);
    if (timer) clearTimeout(timer);
  }
}

export function codexAppServerExecutable(platform: NodeJS.Platform = process.platform): string {
  return platform === "win32" ? "codex.exe" : "codex";
}

function startCodexAppServer(): ArticleRegistryAppServerProcess {
  return spawn(codexAppServerExecutable(), ["app-server"], { stdio: ["pipe", "pipe", "ignore"], windowsHide: true });
}

async function acquireConnectionString(rpc: AppServerRpc): Promise<string> {
  const initialized = await rpc.request("initialize", {
    clientInfo: { name: "article-research-registry", version: "1" },
    capabilities: { experimentalApi: true },
  });
  if (!z.object({}).passthrough().safeParse(initialized).success) throw new Error("ARTICLE_RESEARCH_OAUTH_MALFORMED_RESPONSE");
  const thread = threadStartSchema.safeParse(await rpc.request("thread/start", { ephemeral: true }));
  if (!thread.success) throw new Error("ARTICLE_RESEARCH_OAUTH_MALFORMED_RESPONSE");
  const result = connectionResultSchema.safeParse(await rpc.request("mcpServer/tool/call", {
    threadId: thread.data.thread.id,
    server: "codex_apps",
    tool: "neon.get_connection_string",
    arguments: NEON_SCOPE,
  }));
  if (!result.success) throw new Error("ARTICLE_RESEARCH_OAUTH_MALFORMED_RESPONSE");
  return result.data.structuredContent.data;
}

export type ArticleResearchRegistryTransport = {
  registry: ArticleResearchRegistry;
  prepare: ArticleResearchRegistry["prepare"];
  close(): Promise<void>;
};

type TransportOptions = {
  databaseUrl?: string;
  directRegistry?: ArticleResearchRegistry;
  startAppServer?: () => ArticleRegistryAppServerProcess;
  poolFactory?: (connectionString: string) => ArticleRegistryPool;
  timeoutMs?: number;
};

export function createArticleResearchRegistryTransport(options: TransportOptions = {}): ArticleResearchRegistryTransport {
  const databaseUrl = options.databaseUrl ?? process.env.DATABASE_URL?.trim();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  let backend: Promise<{ registry: ArticleResearchRegistry; close(): Promise<void> }> | undefined;
  let closed = false;

  const getBackend = () => {
    if (closed) throw new Error("ARTICLE_RESEARCH_REGISTRY_TRANSPORT_CLOSED");
    if (!backend) backend = databaseUrl
      ? Promise.resolve({ registry: options.directRegistry ?? new NeonArticleResearchRegistry(), close: options.directRegistry ? async () => undefined : closePool })
      : (async () => {
          const rpc = new AppServerRpc((options.startAppServer ?? startCodexAppServer)(), timeoutMs);
          try {
            const connectionString = await acquireConnectionString(rpc);
            const pool = (options.poolFactory ?? ((value) => new Pool({ connectionString: value, max: 5 })))(connectionString);
            const database = createPoolResearchRegistryDatabase(pool, connectionString);
            return {
              registry: new NeonArticleResearchRegistry(database.query, database.transaction),
              async close() {
                try { await pool.end(); }
                catch { throw new Error("ARTICLE_RESEARCH_DATABASE_CLOSE_FAILED"); }
                finally { await rpc.close(); }
              },
            };
          } catch {
            await rpc.close();
            throw new Error("CAPABILITY_UNAVAILABLE: ARTICLE_RESEARCH_OAUTH_TRANSPORT_FAILED");
          }
        })();
    return backend;
  };

  const registry: ArticleResearchRegistry = {
    async prepare(input) { return (await getBackend()).registry.prepare(input); },
    async commit(input) { return (await getBackend()).registry.commit(input); },
  };
  return {
    registry,
    prepare: (input) => registry.prepare(input),
    async close() {
      if (closed) return;
      closed = true;
      if (backend) await backend.then((value) => value.close(), () => undefined);
    },
  };
}

export async function withArticleResearchRegistryTransport<T>(
  work: (transport: ArticleResearchRegistryTransport) => Promise<T>,
  options: TransportOptions = {},
): Promise<T> {
  const transport = createArticleResearchRegistryTransport(options);
  try { return await work(transport); }
  finally { await transport.close(); }
}
