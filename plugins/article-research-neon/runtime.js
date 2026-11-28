import { lstat, realpath } from "node:fs/promises";
import path from "node:path";

export const ARTICLE_RESEARCH_SCOPE = Object.freeze({
  project_id: "winter-truth-98410571",
  branch_id: "br-spring-smoke-a65esjkh",
  database_name: "neondb",
  role_name: "article_research_worker",
});

export const RUN_SQL_TOOL_ID = "article-research-neon_run_sql";
export const RUN_SQL_TRANSACTION_TOOL_ID = "article-research-neon_run_sql_transaction";

const ARTICLE_ID = /^article-[0-9a-f-]{36}$/;
const INTAKE_ID = /^intake-[0-9a-f-]{36}$/;
const LEASE_KEY = /^[a-zA-Z0-9-]{1,100}$/;
const SOURCE_EXTENSION = /\.(md|markdown|txt)$/i;

function containedBy(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`));
}

function samePath(left, right) {
  return process.platform === "win32" ? left.toLowerCase() === right.toLowerCase() : left === right;
}

async function canonicalRoot(root) {
  return realpath(path.resolve(root));
}

async function authorizeExistingPath(root, candidate, { directory = false, within = root } = {}) {
  const lexical = path.resolve(root, candidate);
  if (!containedBy(root, lexical)) throw new Error("ARTICLE_RESEARCH_OPENCODE_PATH_OUTSIDE_PROJECT");
  const metadata = await lstat(lexical);
  if (metadata.isSymbolicLink()) throw new Error("ARTICLE_RESEARCH_OPENCODE_LINKED_PATH_FORBIDDEN");
  const canonical = await realpath(lexical);
  if (!containedBy(within, canonical)) throw new Error("ARTICLE_RESEARCH_OPENCODE_PATH_OUTSIDE_PROJECT");
  if (!samePath(lexical, canonical)) throw new Error("ARTICLE_RESEARCH_OPENCODE_LINKED_PATH_FORBIDDEN");
  if (directory ? !metadata.isDirectory() : !metadata.isFile()) throw new Error("ARTICLE_RESEARCH_OPENCODE_PATH_TYPE_INVALID");
  return canonical;
}

function assertImportId(value) {
  if (!ARTICLE_ID.test(value)) throw new Error("ARTICLE_RESEARCH_OPENCODE_IMPORT_ID_INVALID");
}

function assertIntakeId(value) {
  if (!INTAKE_ID.test(value)) throw new Error("ARTICLE_RESEARCH_OPENCODE_INTAKE_ID_INVALID");
}

export async function createProjectImportAuthorization(repositoryDirectory) {
  const root = await canonicalRoot(repositoryDirectory);
  const intakeLexical = path.join(root, "Article Intake");
  const authorizedIntake = async () => {
    const intake = await authorizeExistingPath(root, intakeLexical, { directory: true });
    if (!samePath(intake, intakeLexical)) throw new Error("ARTICLE_RESEARCH_OPENCODE_LINKED_PATH_FORBIDDEN");
    return intake;
  };

  const authorizeSource = async (candidate) => {
    if (!SOURCE_EXTENSION.test(candidate)) throw new Error("ARTICLE_RESEARCH_OPENCODE_SOURCE_TYPE_INVALID");
    return authorizeExistingPath(root, candidate, { within: await authorizedIntake() });
  };
  const authorizeEvidence = (candidate) => authorizeExistingPath(root, candidate);
  const authorizeSnapshot = async (runId, candidate) => {
    assertIntakeId(runId);
    const snapshotRoot = path.join(root, ".automation", "article-imports", "intake", runId, "sources");
    if (!/^[a-f0-9]{64}\.source$/.test(path.basename(candidate))) throw new Error("ARTICLE_RESEARCH_OPENCODE_SNAPSHOT_INVALID");
    return authorizeExistingPath(root, candidate, { within: snapshotRoot });
  };

  return {
    async authorizeCommand(_root, command) {
      if ("importId" in command && command.importId !== undefined) assertImportId(command.importId);
      if ("runId" in command) assertIntakeId(command.runId);
      if (command.kind === "recover-lease" && !LEASE_KEY.test(command.key)) throw new Error("ARTICLE_RESEARCH_OPENCODE_LEASE_KEY_INVALID");
      if (command.kind === "reconcile-intake-entry" && (path.isAbsolute(command.entry) || command.entry.split(/[\\/]/).includes("..") || command.entry.includes("\0"))) throw new Error("ARTICLE_RESEARCH_OPENCODE_ENTRY_INVALID");
      if (command.kind === "source") return { ...command, source: await authorizeSource(command.source) };
      if (command.kind === "intake") {
        const intake = await authorizedIntake();
        const selected = await authorizeExistingPath(root, command.directory ?? "Article Intake", { directory: true });
        if (selected !== intake) throw new Error("ARTICLE_RESEARCH_OPENCODE_INTAKE_DIRECTORY_INVALID");
        return { ...command, directory: intake };
      }
      if (["cleanup-remedy", "submit-diagnosis", "submit-owner-decision"].includes(command.kind)) return { ...command, file: await authorizeEvidence(command.file) };
      if (command.kind === "intake-retry" && command.recovery) return { ...command, recovery: await authorizeEvidence(command.recovery) };
      return command;
    },
    authorizeIntakeEntry: (_root, candidate) => authorizeSource(candidate),
    authorizeSnapshot: (_root, runId, candidate) => authorizeSnapshot(runId, candidate),
  };
}

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
