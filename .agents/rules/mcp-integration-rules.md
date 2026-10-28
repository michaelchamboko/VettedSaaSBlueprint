---
alwaysApply: false
---

# Neon repository intelligence and BuildRunner integration rules

## Neon repository intelligence is required

- The declared provider in `build-pack/capabilities.json` must be `neon-postgres` with schema `repository_intelligence_v1`.
- Run `npm run intelligence:sync` before impact-sensitive work. This produces a deterministic dry-run snapshot without changing the database.
- Apply a snapshot only with an explicit database connection through `npm run intelligence:sync:apply`.
- Query an applied snapshot with `npm run intelligence:impact -- --snapshot <sha256> --node <id> --depth <0-8>` and inspect every returned source directly.
- Before commit, rebuild the snapshot and record its commit, source-manifest digest, graph digest, node count, and edge count.
- Never invent database results. If Neon is unavailable, record the limitation and use the deterministic local snapshot, `rg`, imports, route inventories, and affected tests.

Database relationships are navigation evidence, not semantic authority. Text search remains appropriate for exact strings and filenames.

## BuildRunner is authoritative

- `build-pack/execution-state.json` is the only lifecycle ledger.
- Use `validate`, `next`, `start`, `record-evidence`, `verify`, `review`, `complete`, `block`, and `unblock` for transitions and evidence. `graph-sync` remains available for an explicit mid-task refresh, but `complete` always performs the final update.
- Consume the stable JSON envelope (`ok`, `command`, `result` or `error`) instead of scraping prose output.
- Load only the active task's validated `context_files`; harness discovery must not widen them by default.
- Commands stored in state must be argument arrays. The runner executes them without a shell.
- Hosted or external checks are `receipt` validations recorded from their declared runtime; they are never impersonated by a local command.
- Exactly one task may be `in_progress`; dependencies must be done before a task becomes ready.

## Harnesses are adapters

MCP, skills, plugins, or sub-agents may help execute a bounded task, but none are mandatory lifecycle dependencies. They must not create a second task graph, weaken verification, or claim state not recorded by BuildRunner.
