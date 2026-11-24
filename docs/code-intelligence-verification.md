# Code intelligence verification

Implementation and verification are in progress. No complete integration or release claim is made here.

- Pinned official v0.12.1 Windows binary installed and archive checksum verified. Installer reuse verified without stopping active sessions.
- Five graph regression tests pass. Eight document-intelligence tests pass. Agent-workflow contract passes.
- Neon dry-run changes from 3,664 nodes and 12,797 edges to 2,256 semantic nodes and 3,083 edges. No file/import nodes are generated. Historical data is unchanged; live PostgreSQL query verification remains pending.
- Initial full repository graph, clean-clone reuse, both agent queries, incremental indexing, GitHub publication, hosted workflow and final current-head review remain pending.

## First native repository export

Source commit 9d6a5d0fdc696497be531c92816719cb9e6dd91d. Native full persistent indexing took 52,344 ms. The validated graph contains 20,582 nodes, 35,430 relationships and 1,340 indexed files. The compressed artifact is 6,033,583 bytes. Native provenance certified git-clean-head. SQLite integrity, foreign keys, metadata counts and indexed-path checks passed. Native unresolved-symbol diagnostics use a separate `VettedSaaSBlueprint::missed` partition, which is allowed explicitly and excluded from the primary counts.

Two files have partial parser coverage: scripts/DocumentGraph.psm1 line 481 and src/app/globals.css lines 800 and 803. No unusable parses or skipped files were reported. Excluded directories and unsupported file inventory are retained in the local index-status receipt. Graph absence must not be treated as dependency absence.

Lint passed with 17 existing warnings; typecheck and agent-workflow verification passed. The full npm test run finished with 627 passed, 3 skipped and 3 failures caused by the old blanket prohibition on workflows. After adding the owner-authorized graph-only exception, all 12 directly affected tests passed.

## Neon document-only verification

The exact new PostgreSQL query ran on isolated branch br-square-bonus-a62ijo1c. For historical snapshot 75df1e3b, section D01-S-0403b64da931 reached parent document D01 at depth 1. Depth-8 traversal returned 1,864 semantic nodes and no code nodes. Existing file and import-source seeds returned zero rows. Historical 982 file nodes and 282 import edges remained unchanged. No database writes occurred. The temporary validation branch remains because the connector requires explicit user authorization naming a branch before deletion.

## Fresh GitHub checkout and agent checks

GitHub publication succeeded in PR #76 at dc3444b93101af8a4b39de8967621a697edfd3c3. A genuine clone at a different path and an initially absent per-user cache loaded in 41,812 ms. Root rebinding and the five inbound callers of handlePublicEventPost passed. Source verification confirms src/app/api/events/page-view/route.ts:7 calls the function defined in src/lib/tracking/public-event-handler.ts:5.

Native reuse did not pass. All actual file hashes matched, but the reserved git-context-v1 hash differed. The pinned native pipeline fingerprints HEAD, branch, detached/worktree status and base SHA; changed synthetic input forces full rebuilding after import. The database UID changed and 18,749 existing symbol IDs changed. Do not claim snapshot reuse or rewrite native fingerprints to fabricate it.

A controlled added caller in the disposable clone was indexed and traced in 30,498 ms; source bytes were restored afterward. This edit also took the native full-rebuild fallback, evidenced by a changed database UID. The local refresh wrapper preserved the published graph files. Native incremental optimization is therefore a limitation for these measured cases, not a verified performance benefit.

Codex's actual MCP trace_path call succeeded after trusting the fresh project. OpenCode's configured MCP server connected and completed protocol discovery. Its opencode-go/beam-free query attempt returned provider HTTP 429 with a multi-hour retry interval before a graph call; that query check remains pending. No paid model fallback was used.

Independent Codex Code Review passed dc3444b931. Automatically triggered security review identified a checkout-owned OpenCode launcher. The correction removes that launcher and project OpenCode config, uses user-managed startup for both agents, and invokes the installed executable directly. Fresh current-head review is required after this correction.

## Corrected verification gates

The review correction profile passed agent-workflow verification, lint, typecheck, and all 13 code/document-intelligence regression tests. All 12 workflow-boundary and Stage 2 regression tests passed after the graph-only exception. Existing lint warnings remain unchanged. The full suite was not repeated after these corrections, following AGENTS.md's requirement to rerun only affected tests.

Both managed MCP entries now resolve the verified installed binary directly, without a checkout-owned script. OpenCode reports connected. The published artifact remains a valid baseline for 74de7b71ee284a3ab4cf06e55a14e3b62055c051; the hosted job must refresh it after the correction commit is merged. Hosted execution/publication and the rate-limited OpenCode model query remain pending.
