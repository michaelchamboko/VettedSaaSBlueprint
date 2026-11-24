# Code intelligence

The owner directive in planning.md, CODE-INTELLIGENCE-1124, selects codebase-memory-mcp v0.12.1 as this repository's sole code graph. Neon retains document-authority relationships; its active code graph functions are retired. Source documents remain product authority.

## Setup

Use Node 24. From the checkout root:

```sh
node scripts/code-intelligence/install.ts
node scripts/code-intelligence/validate.ts
node scripts/code-intelligence/load.ts
```

The installer verifies the pinned official release archive before extraction, installs to the user's `.local/bin`, and preserves global MCP settings. Windows and Linux x64 are supported by this installer. Add that directory to PATH if your shell cannot find `codebase-memory-mcp`. The portable Node launcher resolves the per-user binary without relying on a desktop process's stale PATH. Restart Codex and OpenCode after installing project MCP configuration. OpenCode 2 uses `mcp.servers`; the project entry exposes native tools directly.

The four shared files are `.codebase-memory/graph.db.zst`, `artifact.json`, `.gitattributes` and `provenance.json`. The native export contains the exporter's absolute root path. Import must rebind it to the current checkout; verification records this behavior explicitly. Do not put credentials in tracked source. `.cbmignore` excludes environment files, private keys, runtime records and local tool directories. Native discovery also applies Git ignore rules and skips symlinks. The publisher reads a separate checkout of a committed Git revision, never untracked or dirty working files. It fails on detected credential content or unexpected indexed files.

Each workspace owns its cache. The native default cache is per-user, outside Git. Use a private per-user `CBM_CACHE_DIR` for a clean-cache probe, with all other CBM sessions closed first. The native tool allows only one canonical cache root per account at a time. Never share cache databases or locks across agents. Keep native `auto_watch` and `watcher_enabled` enabled; the watcher follows open MCP sessions, not standalone CLI indexing.

## Query before editing

Check freshness and coverage first. The stable project name is `VettedSaaSBlueprint`.

```sh
node scripts/code-intelligence/status.ts
codebase-memory-mcp cli --json index_status --project VettedSaaSBlueprint --diagnostics full --format json
codebase-memory-mcp cli --json check_index_coverage --project VettedSaaSBlueprint --scopes '["src/lib/tracking","src/app/api/events"]'
codebase-memory-mcp cli --json search_graph --project VettedSaaSBlueprint --name-pattern '.*handlePublicEventPost.*' --format json
codebase-memory-mcp cli --json trace_path --project VettedSaaSBlueprint --function-name handlePublicEventPost --direction inbound --format json
```

Use the equivalent MCP tools in Codex or OpenCode. `get_architecture` gives an overview, `search_graph` locates symbols, `trace_path` follows calls, `detect_changes` checks impact, `query_graph` answers bounded structural questions, and `get_code_snippet` retrieves targeted source. Confirm significant relationships against files and tests. Missing or stale results never prove absence of a dependency.

After editing and verification, run `node scripts/code-intelligence/update-local.ts`. CBM rewrites existing exports even with `persistence=false`; the wrapper restores the published bytes after updating the local cache. A native watcher or direct command may still dirty exports. Review and restore only those generated changes before committing application work. Never push local graph changes automatically.

## Publication

`node scripts/code-intelligence/build.ts` prepares a graph from committed HEAD, performs full-mode persistent indexing, checks native clean-commit provenance, decompresses SQLite, checks integrity and counts, and validates the file inventory before replacing the shared files. Failures leave the previous artifact intact. Local build evidence stays under ignored `.artifacts/code-intelligence/`. The source digest excludes graph outputs, so an artifact commit does not trigger another build.

The GitHub workflow detects main changes. Nightly and manual jobs compare committed source digests, including an existing pending update PR, and publish only changed inputs to `codex/code-graph-update`. Jobs serialize. Updates use ordinary fast-forward pushes, preserve prior commits, and open a review PR. The workflow does not approve or merge. Graph-only main commits do not trigger the workflow. GitHub tokens do not automatically trigger other workflows from their own PR events; required review/checks must run through the repository's authorized review route before merging.

Failed indexing, validation or PR creation is a failed job, not a successful publication. GitHub's reviewed artifact remains the baseline. Do not resolve binary conflicts by combining databases; regenerate from the selected source commit. Full source SHA, hashes, counts, index duration and exclusions are recorded in provenance. Unsupported and partial parser results are retained in local index-status evidence and must be checked for the intended change.

Upstream references: [pinned release](https://github.com/DeusData/codebase-memory-mcp/releases/tag/v0.12.1), [persistent artifacts](https://github.com/DeusData/codebase-memory-mcp/tree/v0.12.1#team-shared-graph-artifact), [OpenCode MCP configuration](https://opencode.ai/docs/mcp-servers/).

