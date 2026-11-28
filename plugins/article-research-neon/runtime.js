export const ARTICLE_RESEARCH_SCOPE = Object.freeze({
  project_id: "winter-truth-98410571",
  branch_id: "br-spring-smoke-a65esjkh",
  database_name: "neondb",
  role_name: "article_research_worker",
});

export const RUN_SQL_TOOL_ID = "article-research-neon_run_sql";
export const RUN_SQL_TRANSACTION_TOOL_ID = "article-research-neon_run_sql_transaction";

const VERIFY_ROLE_SQL = [
  "select current_user as current_user,",
  "       session_user as session_user,",
  "       current_database() as current_database",
].join("\n");

export function assertSupportedOpenCodePlatform(platform = process.platform) {
  if (platform !== "win32" && platform !== "linux") {
    throw new Error("ARTICLE_RESEARCH_OPENCODE_PLATFORM_UNSUPPORTED");
  }
}

export function assertArticleToolInput(input) {
  if (input?.action === "verify-role" && input.argv === undefined) return input;
  if (input?.action === "run"
    && Array.isArray(input.argv)
    && input.argv.length >= 1
    && input.argv.length <= 8
    && input.argv.every((argument) => typeof argument === "string" && argument.length > 0)) return input;
  throw new Error("ARTICLE_RESEARCH_OPENCODE_INPUT_INVALID");
}

export function requireTransformedTool(editor, id) {
  return assertTransformedTool(editor.get(id), id);
}

export function assertTransformedTool(tool, id) {
  if (!tool) throw new Error(`ARTICLE_RESEARCH_OPENCODE_TOOL_MISSING: ${id}`);
  if (typeof tool.execute !== "function") throw new Error(`ARTICLE_RESEARCH_OPENCODE_EXECUTOR_INVALID: ${id}`);
  return tool;
}

export function unwrapTransformedToolResult(result) {
  if (result && typeof result === "object" && "output" in result && result.output !== undefined) {
    return result.output;
  }
  return result;
}

export async function invokeTransformedTool(ctx, tool, input, invocation) {
  await ctx.permission.assert({
    sessionID: invocation.sessionID,
    agent: invocation.agent,
    source: { type: "tool", messageID: invocation.messageID, id: invocation.id },
    action: tool.options?.permission ?? tool.id,
    resources: ["*"],
    save: ["*"],
  });
  return unwrapTransformedToolResult(await tool.execute(input, invocation));
}

export async function verifyArticleResearchRole(runSql) {
  const result = await runSql({
    project_id: ARTICLE_RESEARCH_SCOPE.project_id,
    branch_id: ARTICLE_RESEARCH_SCOPE.branch_id,
    database_name: ARTICLE_RESEARCH_SCOPE.database_name,
    sql: VERIFY_ROLE_SQL,
    max_rows: 1,
  });
  const row = result?.data?.rows?.[0];
  if (result?.data?.truncated !== false
    || result?.data?.totalRowCount !== 1
    || result.data.rows.length !== 1
    || row?.current_user !== ARTICLE_RESEARCH_SCOPE.role_name
    || row?.session_user !== ARTICLE_RESEARCH_SCOPE.role_name
    || row?.current_database !== ARTICLE_RESEARCH_SCOPE.database_name) {
    throw new Error("ARTICLE_RESEARCH_OAUTH_DATABASE_IDENTITY_INVALID");
  }
  return {
    project_id: ARTICLE_RESEARCH_SCOPE.project_id,
    branch_id: ARTICLE_RESEARCH_SCOPE.branch_id,
    database_name: row.current_database,
    current_user: row.current_user,
    session_user: row.session_user,
  };
}
