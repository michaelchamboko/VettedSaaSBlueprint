import assert from "node:assert/strict";
import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  ARTICLE_RESEARCH_SCOPE,
  assertArticleToolInput,
  assertSupportedOpenCodePlatform,
  createProjectImportAuthorization,
  invokeTransformedTool,
  requireTransformedTool,
  unwrapTransformedToolResult,
  verifyArticleResearchRole,
} from "../plugins/article-research-neon/runtime.js";

test("native project authorization permits only canonical project-scoped inputs", async (context) => {
  const fixture = await mkdtemp(path.join(os.tmpdir(), "vetted-opencode-paths-"));
  context.after(() => rm(fixture, { recursive: true, force: true }));
  const root = path.join(fixture, "checkout");
  const intake = path.join(root, "Article Intake");
  const evidence = path.join(root, "build-pack", "evidence.json");
  const outside = path.join(fixture, "outside.md");
  await mkdir(intake, { recursive: true });
  await mkdir(path.dirname(evidence), { recursive: true });
  await writeFile(path.join(intake, "inside.md"), "safe fixture");
  await writeFile(evidence, "{}");
  await writeFile(path.join(root, "build-pack", "not-intake.md"), "safe fixture");
  await writeFile(outside, "outside fixture");

  const authorization = await createProjectImportAuthorization(root);
  const source = await authorization.authorizeCommand(root, { kind: "source", source: "Article Intake/inside.md" });
  assert.equal(source.source, await realpath(path.join(intake, "inside.md")));
  const intakeCommand = await authorization.authorizeCommand(root, { kind: "intake" });
  assert.equal(intakeCommand.directory, await realpath(intake));
  const remedy = await authorization.authorizeCommand(root, { kind: "cleanup-remedy", importId: `article-${"a".repeat(36)}`, file: "build-pack/evidence.json" });
  assert.equal(remedy.file, await realpath(evidence));
  await assert.rejects(authorization.authorizeCommand(root, { kind: "source", source: outside }), /PATH_OUTSIDE_PROJECT/);
  await assert.rejects(authorization.authorizeCommand(root, { kind: "source", source: "build-pack/not-intake.md" }), /PATH_OUTSIDE_PROJECT/);
  await assert.rejects(authorization.authorizeCommand(root, { kind: "intake", directory: "build-pack" }), /INTAKE_DIRECTORY_INVALID/);
  await assert.rejects(authorization.authorizeCommand(root, { kind: "resume", importId: "../../outside" }), /IMPORT_ID_INVALID/);
  await assert.rejects(authorization.authorizeCommand(root, { kind: "reconcile-intake-entry", runId: `intake-${"b".repeat(36)}`, entry: "../outside.md" }), /ENTRY_INVALID/);
});

test("native project authorization rejects linked files and intake junctions", async (context) => {
  const fixture = await mkdtemp(path.join(os.tmpdir(), "vetted-opencode-links-"));
  context.after(() => rm(fixture, { recursive: true, force: true }));
  const root = path.join(fixture, "checkout");
  const intake = path.join(root, "Article Intake");
  const outside = path.join(fixture, "outside.md");
  await mkdir(intake, { recursive: true });
  await writeFile(outside, "outside fixture");
  const link = path.join(intake, "linked.md");
  const authorization = await createProjectImportAuthorization(root);
  try {
    await symlink(outside, link, "file");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EPERM") {
      const outsideDirectory = path.join(fixture, "outside-directory");
      const junction = path.join(intake, "linked-directory");
      await mkdir(outsideDirectory);
      await writeFile(path.join(outsideDirectory, "linked.md"), "outside fixture");
      try {
        await symlink(outsideDirectory, junction, "junction");
      } catch (junctionError) {
        if ((junctionError as NodeJS.ErrnoException).code === "EPERM") { context.skip("Host does not permit fixture links"); return; }
        throw junctionError;
      }
      await assert.rejects(authorization.authorizeCommand(root, { kind: "source", source: path.join(junction, "linked.md") }), /PATH_OUTSIDE_PROJECT/);
      return;
    }
    throw error;
  }
  await assert.rejects(authorization.authorizeCommand(root, { kind: "source", source: link }), /LINKED_PATH_FORBIDDEN/);
  await assert.rejects(authorization.authorizeIntakeEntry(root, link), /LINKED_PATH_FORBIDDEN/);
});

test("read-only native commands do not require an Article Intake directory", async (context) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "vetted-opencode-empty-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const authorization = await createProjectImportAuthorization(root);
  assert.deepEqual(await authorization.authorizeCommand(root, { kind: "describe-workflow" }), { kind: "describe-workflow" });
  assert.deepEqual(await authorization.authorizeCommand(root, { kind: "preflight" }), { kind: "preflight" });
  assert.deepEqual(await authorization.authorizeCommand(root, { kind: "resume", importId: `article-${"c".repeat(36)}` }), { kind: "resume", importId: `article-${"c".repeat(36)}` });
});

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
