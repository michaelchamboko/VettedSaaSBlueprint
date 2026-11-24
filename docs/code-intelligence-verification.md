# Code intelligence verification

Implementation and verification are in progress. No complete integration or release claim is made here.

- Pinned official v0.12.1 Windows binary installed and archive checksum verified. Installer reuse verified without stopping active sessions.
- Five graph regression tests pass. Eight document-intelligence tests pass. Agent-workflow contract passes.
- Neon dry-run changes from 3,664 nodes and 12,797 edges to 2,256 semantic nodes and 3,083 edges. No file/import nodes are generated. Historical data is unchanged; live PostgreSQL query verification remains pending.
- Initial full repository graph, clean-clone reuse, both agent queries, incremental indexing, GitHub publication, hosted workflow and final current-head review remain pending.

## First native repository export

Source commit 9d6a5d0fdc696497be531c92816719cb9e6dd91d. Native full persistent indexing took 52,344 ms. The validated graph contains 20,582 nodes, 35,430 relationships and 1,340 indexed files. The compressed artifact is 6,033,583 bytes. Native provenance certified git-clean-head. SQLite integrity, foreign keys, metadata counts and indexed-path checks passed. Native unresolved-symbol diagnostics use a separate `VettedSaaSBlueprint::missed` partition, which is allowed explicitly and excluded from the primary counts.

Two files have partial parser coverage: scripts/DocumentGraph.psm1 line 481 and src/app/globals.css lines 800 and 803. No unusable parses or skipped files were reported. Excluded directories and unsupported file inventory are retained in the local index-status receipt. Graph absence must not be treated as dependency absence.

Lint passed with 17 existing warnings; typecheck and agent-workflow verification passed. Full npm test remains running.

## Neon document-only verification

The exact new PostgreSQL query ran on isolated branch br-square-bonus-a62ijo1c. For historical snapshot 75df1e3b, section D01-S-0403b64da931 reached parent document D01 at depth 1. Depth-8 traversal returned 1,864 semantic nodes and no code nodes. Existing file and import-source seeds returned zero rows. Historical 982 file nodes and 282 import edges remained unchanged. No database writes occurred. The temporary validation branch remains because the connector requires explicit user authorization naming a branch before deletion.
