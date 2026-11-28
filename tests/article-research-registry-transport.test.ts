import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import test from "node:test";

import type { ArticleResearchRegistry } from "../src/lib/article-import/research-registry";
import {
  codexAppServerExecutable,
  createArticleResearchRegistryTransport,
  createPoolResearchRegistryDatabase,
  withArticleResearchRegistryTransport,
  type ArticleRegistryAppServerProcess,
  type ArticleRegistryPool,
} from "../src/lib/article-import/research-registry-transport";
import { executeImportRunnerCommand } from "../scripts/import-article";

const prepareInput = {
  importId: "article-11111111-1111-4111-8111-111111111111",
  sourceFingerprint: "a".repeat(64),
  sourceText: "synthetic source",
  now: "2026-11-27T00:00:00.000Z",
};

test("Codex app-server executable is platform-correct", () => {
  assert.equal(codexAppServerExecutable("win32"), "codex.exe");
  assert.equal(codexAppServerExecutable("linux"), "codex");
  assert.equal(codexAppServerExecutable("darwin"), "codex");
});

function directRegistry(): ArticleResearchRegistry {
  return {
    async prepare(input) {
      return { schemaVersion: "ResearchRegistryPlanV1", importId: input.importId, sourceFingerprint: input.sourceFingerprint, generatedAt: input.now, planFingerprint: "b".repeat(64), candidates: [], legacyLeads: [] };
    },
    async commit() { return { bindingId: "binding", replayed: false }; },
  };
}

class FakeAppServer extends EventEmitter implements ArticleRegistryAppServerProcess {
  readonly stdin = new PassThrough();
  readonly stdout = new PassThrough();
  readonly requests: Record<string, unknown>[] = [];
  killed = false;

  constructor(private readonly reply: (request: Record<string, unknown>, server: FakeAppServer) => void) {
    super();
    let pending = "";
    this.stdin.on("data", (chunk) => {
      pending += chunk.toString();
      for (;;) {
        const newline = pending.indexOf("\n");
        if (newline < 0) break;
        const line = pending.slice(0, newline);
        pending = pending.slice(newline + 1);
        const request = JSON.parse(line) as Record<string, unknown>;
        this.requests.push(request);
        this.reply(request, this);
      }
    });
  }

  respond(value: unknown) { this.stdout.write(`${JSON.stringify(value)}\n`); }
  kill() { this.killed = true; this.emit("exit", 0, null); return true; }
}

function oauthServer(connectionString = "postgres://fake-secret@localhost/neondb", interleaveNotifications = false) {
  return new FakeAppServer((request, server) => {
    const id = request.id;
    if (interleaveNotifications) server.respond({ method: "app-server/event", params: { phase: request.method } });
    if (request.method === "initialize") server.respond({ id, result: {} });
    if (request.method === "thread/start") server.respond({ id, result: { thread: { id: "thread-1" } } });
    if (request.method === "mcpServer/tool/call") server.respond({ id, result: { structuredContent: { data: connectionString } } });
  });
}

function preparePool(events: string[]): ArticleRegistryPool {
  return {
    async query(sql) {
      events.push(`pool:${sql}`);
      if (sql.includes("current_timestamp")) return { rows: [{ database_now: prepareInput.now }] };
      return { rows: [] };
    },
    async connect() { throw new Error("not used"); },
    async end() { events.push("pool:end"); },
  };
}

test("direct DATABASE_URL mode preserves the injected registry without starting app-server", async () => {
  let starts = 0;
  const registry = directRegistry();
  const transport = createArticleResearchRegistryTransport({
    databaseUrl: "postgres://direct",
    directRegistry: registry,
    startAppServer: () => { starts += 1; return oauthServer(); },
  });
  assert.deepEqual(await transport.prepare(prepareInput), await registry.prepare(prepareInput));
  assert.equal(starts, 0);
  await transport.close();
});

test("injected registry mode needs no DATABASE_URL and never starts Codex app-server", async () => {
  let starts = 0;
  const registry = directRegistry();
  const transport = createArticleResearchRegistryTransport({
    databaseUrl: "",
    directRegistry: registry,
    startAppServer: () => { starts += 1; return oauthServer(); },
  });
  assert.deepEqual(await transport.prepare(prepareInput), await registry.prepare(prepareInput));
  assert.equal(starts, 0);
  await transport.close();
});

test("OAuth mode sends the bound request sequence and exact fixed Neon scope while ignoring notifications", async () => {
  const server = oauthServer(undefined, true);
  const events: string[] = [];
  const transport = createArticleResearchRegistryTransport({ startAppServer: () => server, poolFactory: () => preparePool(events) });
  const plan = await transport.prepare(prepareInput);

  assert.deepEqual(server.requests.map((request) => request.method), ["initialize", "thread/start", "mcpServer/tool/call"]);
  assert.deepEqual(server.requests.map((request) => request.id), [1, 2, 3]);
  assert.equal(server.requests.every((request) => !("jsonrpc" in request)), true);
  assert.deepEqual(server.requests[0]?.params, { clientInfo: { name: "article-research-registry", version: "1" }, capabilities: { experimentalApi: true } });
  assert.deepEqual(server.requests[1]?.params, { ephemeral: true });
  assert.deepEqual(server.requests[2]?.params, {
    threadId: "thread-1", server: "codex_apps", tool: "neon.get_connection_string",
    arguments: { project_id: "winter-truth-98410571", branch_id: "br-spring-smoke-a65esjkh", database_name: "neondb", role_name: "article_research_worker" },
  });
  assert.equal(plan.generatedAt, prepareInput.now);
  await transport.close();
});

test("OAuth mode rejects malformed, error, and wrong-ID responses without leaking connector data", async (t) => {
  const secret = "postgres://fake-secret@localhost/neondb";
  const cases = [
    { name: "malformed", response: "not-json" },
    { name: "error", response: { jsonrpc: "2.0", id: 1, error: { message: secret, data: { content: secret } } } },
    { name: "wrong id", response: { jsonrpc: "2.0", id: 99, result: { structuredContent: { data: secret } } } },
    { name: "premature exit", response: "exit" },
  ];
  for (const item of cases) await t.test(item.name, async () => {
    const server = new FakeAppServer((_request, child) => {
      if (item.response === "exit") child.emit("exit", 1, null);
      else if (typeof item.response === "string") child.stdout.write(`${item.response}\n`);
      else child.respond(item.response);
    });
    const transport = createArticleResearchRegistryTransport({ startAppServer: () => server, timeoutMs: 100 });
    await assert.rejects(transport.prepare(prepareInput), (error: Error) => {
      assert.doesNotMatch(error.message, /fake-secret|neondb|content/i);
      return true;
    });
    await transport.close();
  });
});

test("pool database uses one pool for the database clock and serializable transaction", async () => {
  const events: string[] = [];
  const connection = {
    async query(sql: string) {
      events.push(`connection:${sql}`);
      if (sql === "select current_timestamp as database_now") return { rows: [{ database_now: prepareInput.now }] };
      return { rows: [] };
    },
    release() { events.push("release"); },
  };
  const pool: ArticleRegistryPool = {
    async query(sql) { events.push(`pool:${sql}`); return { rows: [{ database_now: prepareInput.now }] }; },
    async connect() { events.push("connect"); return connection; },
    async end() { events.push("end"); },
  };
  const database = createPoolResearchRegistryDatabase(pool);
  await database.query("select current_timestamp as database_now");
  await database.transaction(async (tx) => {
    await tx`set transaction isolation level serializable`;
    await tx`insert into synthetic_table (value) values (${"value"})`;
  });
  assert.deepEqual(events, [
    "pool:select current_timestamp as database_now", "connect", "connection:begin",
    "connection:set transaction isolation level serializable", "connection:insert into synthetic_table (value) values ($1)",
    "connection:commit", "release",
  ]);

  await assert.rejects(database.transaction(async () => { throw new Error("synthetic failure"); }), /synthetic failure/);
  assert.deepEqual(events.slice(-4), ["connect", "connection:begin", "connection:rollback", "release"]);
});

test("pool errors redact the connection string without retaining a secret-bearing cause", async () => {
  const secret = "postgres://fake-secret@localhost/neondb";
  const pool: ArticleRegistryPool = {
    async query() { throw new Error(`connection failed for ${secret}`); },
    async connect() { throw new Error("not used"); },
    async end() {},
  };
  const database = createPoolResearchRegistryDatabase(pool, secret);
  await assert.rejects(database.query("select 1"), (error: Error & { cause?: unknown }) => {
    assert.doesNotMatch(error.message, /fake-secret|neondb/);
    assert.equal(error.cause, undefined);
    return true;
  });
});

test("transport is lazy for read-only runner work and closes its OAuth pool and app-server once", async () => {
  let starts = 0;
  const readOnlyTransport = createArticleResearchRegistryTransport({ startAppServer: () => { starts += 1; return oauthServer(); } });
  await executeImportRunnerCommand(process.cwd(), { kind: "describe-workflow" }, readOnlyTransport);
  assert.equal(starts, 0);

  await withArticleResearchRegistryTransport(async () => "read-only", { startAppServer: () => { starts += 1; return oauthServer(); } });
  assert.equal(starts, 0);

  const events: string[] = [];
  const server = oauthServer();
  const transport = createArticleResearchRegistryTransport({ startAppServer: () => server, poolFactory: () => preparePool(events) });
  await transport.prepare(prepareInput);
  await transport.close();
  await transport.close();
  assert.deepEqual(events.filter((event) => event === "pool:end"), ["pool:end"]);
  assert.equal(server.killed, true);
});
