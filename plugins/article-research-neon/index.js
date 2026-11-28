import { Plugin } from "@opencode/plugin";
import {
  RUN_SQL_TOOL_ID,
  RUN_SQL_TRANSACTION_TOOL_ID,
  assertArticleToolInput,
  assertSupportedOpenCodePlatform,
  assertTransformedTool,
  invokeTransformedTool,
  verifyArticleResearchRole,
} from "./runtime.js";

function commandInputSchema() {
  return {
    type: "object",
    properties: {
      action: { type: "string", enum: ["verify-role", "run"] },
      argv: {
        type: "array",
        items: { type: "string", minLength: 1 },
        minItems: 1,
        maxItems: 8,
        description: "Exact arguments accepted by scripts/import-article.ts. Required only for action run.",
      },
    },
    required: ["action"],
    additionalProperties: false,
  };
}

export default Plugin.define({
  id: "vetted.article-research-neon",
  async setup(ctx) {
    assertSupportedOpenCodePlatform();

    await ctx.tool.transform((editor) => {
      const runSqlTool = editor.get(RUN_SQL_TOOL_ID);
      const runSqlTransactionTool = editor.get(RUN_SQL_TRANSACTION_TOOL_ID);

      editor.add({
        name: "vetted_article_import",
        description: "Run the existing manual article command with the scoped Neon research registry, or verify the fixed OAuth database role without starting an import.",
        input: commandInputSchema(),
        options: { codemode: false },
        async execute(input, invocation) {
          assertArticleToolInput(input);
          if (!runSqlTool || !runSqlTransactionTool) {
            throw new Error("ARTICLE_RESEARCH_OPENCODE_MCP_NOT_READY");
          }
          const activeRunSqlTool = assertTransformedTool(runSqlTool, RUN_SQL_TOOL_ID);
          const activeRunSqlTransactionTool = assertTransformedTool(
            runSqlTransactionTool,
            RUN_SQL_TRANSACTION_TOOL_ID,
          );
          const runSql = (request) => invokeTransformedTool(ctx, activeRunSqlTool, request, invocation);
          if (input.action === "verify-role") {
            return { content: JSON.stringify(await verifyArticleResearchRole(runSql), null, 2) };
          }

          await ctx.permission.assert({
            sessionID: invocation.sessionID,
            agent: invocation.agent,
            source: { type: "tool", messageID: invocation.messageID, id: invocation.id },
            action: "vetted_article_import",
            resources: [ctx.location.directory],
            save: [ctx.location.directory],
          });

          const [{ parseImportCommand, executeImportRunnerCommand }, registryModule, transportModule] = await Promise.all([
            import("../../scripts/import-article.ts"),
            import("../../src/lib/article-import/research-registry-mcp.ts"),
            import("../../src/lib/article-import/research-registry-transport.ts"),
          ]);
          const registry = registryModule.createMcpArticleResearchRegistry({
            runSql,
            runSqlTransaction: (request) => invokeTransformedTool(
              ctx,
              activeRunSqlTransactionTool,
              request,
              invocation,
            ),
          });
          const transport = transportModule.createArticleResearchRegistryTransport({ directRegistry: registry });
          const result = await executeImportRunnerCommand(
            ctx.location.directory,
            parseImportCommand(input.argv),
            transport,
          );
          return { content: JSON.stringify(result, null, 2) };
        },
      });
    });
  },
});
