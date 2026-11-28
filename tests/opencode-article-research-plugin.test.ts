import assert from "node:assert/strict";
import test from "node:test";

import {
  ARTICLE_RESEARCH_SCOPE,
  assertArticleToolInput,
  assertSupportedOpenCodePlatform,
  invokeTransformedTool,
  requireTransformedTool,
  unwrapTransformedToolResult,
  verifyArticleResearchRole,
} from "../plugins/article-research-neon/runtime.js";

test("OpenCode article research plugin supports Windows and Linux only", () => {
  assert.doesNotThrow(() => assertSupportedOpenCodePlatform("win32"));
  assert.doesNotThrow(() => assertSupportedOpenCodePlatform("linux"));
  assert.throws(() => assertSupportedOpenCodePlatform("darwin"), /ARTICLE_RESEARCH_OPENCODE_PLATFORM_UNSUPPORTED/);
});

test("OpenCode article research tool accepts only structured action input", () => {
  assert.deepEqual(assertArticleToolInput({ action: "verify-role" }), { action: "verify-role" });
  assert.deepEqual(assertArticleToolInput({ action: "run", argv: ["--describe-workflow"] }), { action: "run", argv: ["--describe-workflow"] });
  assert.throws(() => assertArticleToolInput({ action: "verify-role", argv: ["ignored"] }), /ARTICLE_RESEARCH_OPENCODE_INPUT_INVALID/);
  assert.throws(() => assertArticleToolInput({ action: "run", argv: [] }), /ARTICLE_RESEARCH_OPENCODE_INPUT_INVALID/);
  assert.throws(() => assertArticleToolInput({ action: "--describe-workflow" }), /ARTICLE_RESEARCH_OPENCODE_INPUT_INVALID/);
});

test("transformed MCP tools must exist and expose their real executor", () => {
  const execute = async () => ({ content: "unused" });
  assert.equal(requireTransformedTool({ get: () => ({ execute, options: { permission: "mcp.query" } }) }, "run_sql").execute, execute);
  assert.throws(() => requireTransformedTool({ get: () => undefined }, "run_sql"), /ARTICLE_RESEARCH_OPENCODE_TOOL_MISSING/);
  assert.throws(() => requireTransformedTool({ get: () => ({}) }, "run_sql"), /ARTICLE_RESEARCH_OPENCODE_EXECUTOR_INVALID/);
});

test("transformed MCP execution uses the invoking context and source permission", async () => {
  const events: unknown[] = [];
  const invocation = {
    sessionID: "session-1",
    agent: "build",
    messageID: "message-1",
    id: "call-1",
    signal: new AbortController().signal,
    progress: async () => undefined,
  };
  const result = await invokeTransformedTool({
    permission: { async assert(input: unknown) { events.push(input); } },
  }, {
    id: "article-research-neon_run_sql",
    options: { permission: "article-research-neon_run_sql" },
    async execute(input: unknown, context: unknown) {
      events.push({ input, sameContext: context === invocation });
      return { output: { data: { rows: [], totalRowCount: 0, truncated: false } } };
    },
  }, { sql: "select 1" }, invocation);

  assert.deepEqual(events, [
    {
      sessionID: "session-1",
      agent: "build",
      source: { type: "tool", messageID: "message-1", id: "call-1" },
      action: "article-research-neon_run_sql",
      resources: ["*"],
      save: ["*"],
    },
    { input: { sql: "select 1" }, sameContext: true },
  ]);
  assert.deepEqual(result, { data: { rows: [], totalRowCount: 0, truncated: false } });
  assert.equal(unwrapTransformedToolResult({ content: "plain" }).content, "plain");

  events.length = 0;
  await invokeTransformedTool({
    permission: { async assert(input: unknown) { events.push(input); } },
  }, {
    id: "article-research-neon_run_sql",
    async execute() { return { output: { data: { rows: [], totalRowCount: 0, truncated: false } } }; },
  }, { sql: "select 1" }, invocation);
  assert.equal((events[0] as { action: string }).action, "article-research-neon_run_sql");
});

test("verify-role is deterministic, read-only, and rejects an unexpected identity", async () => {
  const calls: unknown[] = [];
  const identity = await verifyArticleResearchRole(async (input: unknown) => {
    calls.push(input);
    return {
      data: {
        rows: [{ current_user: "article_research_worker", session_user: "article_research_worker", current_database: "neondb" }],
        totalRowCount: 1,
        truncated: false,
      },
    };
  });
  assert.deepEqual(identity, {
    project_id: ARTICLE_RESEARCH_SCOPE.project_id,
    branch_id: ARTICLE_RESEARCH_SCOPE.branch_id,
    database_name: "neondb",
    current_user: "article_research_worker",
    session_user: "article_research_worker",
  });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    project_id: "winter-truth-98410571",
    branch_id: "br-spring-smoke-a65esjkh",
    database_name: "neondb",
    sql: "select current_user as current_user,\n       session_user as session_user,\n       current_database() as current_database",
    max_rows: 1,
  });
  assert.match((calls[0] as { sql: string }).sql, /^select current_user/);
  assert.doesNotMatch((calls[0] as { sql: string }).sql, /insert|update|delete|call|create|alter|drop/i);

  await assert.rejects(verifyArticleResearchRole(async () => ({
    data: {
      rows: [{ current_user: "owner", session_user: "owner", current_database: "neondb" }],
      totalRowCount: 1,
      truncated: false,
    },
  })), /ARTICLE_RESEARCH_OAUTH_DATABASE_IDENTITY_INVALID/);
});
