# Neon OAuth for article research in OpenCode

On Windows or Linux, open the primary project checkout with OpenCode 2.3. Run `opencode mcp auth article-research-neon` on the machine and under the account that runs the workflow. The Neon approval screen should show project `winter-truth-98410571`, Postgres role `article_research_worker`, the querying category, and no secrets in tool results.

In OpenCode, ask the `vetted_article_import` tool to run `{"action":"verify-role"}`. This performs a read-only check on branch `br-spring-smoke-a65esjkh`. Both the login role and effective role must be `article_research_worker`, and the database must be `neondb`. Signing in on one machine does not establish the identity of a workflow running on another.

The registry migration in `db/article-research-registry-functions-v001.sql` must be applied before the research stage can read or save evidence through this connector. The identity check works before migration. The two functions run with the caller's existing table grants. The write runs in a serializable transaction. Production migration is a separate database change.

Use the same tool with `{"action":"run","argv":["--describe-workflow"]}` to inspect the manual workflow. For an authorized run, pass the normal article command arguments in `argv`. This entry point supplies OpenCode’s signed-in Neon connection to the research registry. The usual primary-checkout, intake, editorial and release checks still apply.
