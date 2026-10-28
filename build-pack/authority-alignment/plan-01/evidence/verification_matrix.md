# Verification Matrix — Plan 1 Closeout Candidate

| Invariant | Candidate result | Evidence | Remaining limit |
|---|---|---|---|
| Registered source integrity | 12 sources, 1,424 headings, clean UTF-8 headings | inventory producer output; focused Python test | none |
| Stable identity | D02-H006 retains `D02-S-0951e69fb4b0` | manifest, inventory, graph, bridge, build-pack projections | intermediate evidence still records abandoned UID |
| Canonical graph | 791 claims, 8 directives, 868 relationships, 0 unreviewed | graph producer and verifier output | none |
| Relationship candidates | 112 total: 79 accepted, 25 unresolved, 8 duplicate | extractor output | unresolved candidates remain intentionally classified |
| Bridge runtime | 2,223 node exports, 868 relationships | full verifier with `-SkipGitNexus` | GitNexus reconciliation itself was explicitly skipped |
| Source hash portability | LF and CRLF fixtures produce the same normalized hash | `document-intelligence.tests.ps1` | disposable checkout proof pending final commit |
| Active build-pack projections | 803 requirements; check reports `stale: []` | bounded reconciliation check; focused Python tests | four historical requirements retained with explicit owner-retired dispositions |
| Retired programme completeness | D01-D10 declare cadence supersession; all 06:00, 20:00, and 23:00 source occurrences are locally retired | focused Python test; C005/M005 | subordinate execution consumers remain Plan 2 |
| Execution-owned state | tasks, status, acceptance IDs, Phase One authorization, phase-map dispositions preserved | sentinel fixture test | production release receipts remain outside the source projection writer |
| Repository lifecycle | committed worktree and `origin` remote reported rather than rejected | lifecycle helper unit test; full verifier output | none |
| GitNexus version contract | wrapper and verifier expect 1.6.10 | focused PowerShell test | refresh/reconciliation requires installed CLI and selected-checkout index |
| Full document verifier | PASS with `-SkipGitNexus` | verifier output in current execution | non-skipped GitNexus mode remains conditional on fresh reconciliation evidence |
| Independent current-head review | pending | review package to be created after commit | release blocked until clean review |

## Negative and red-green evidence

- Clean-source test failed on the corrupted D03 headings before the UTF-8 repair.
- Reconciliation test failed because the bounded producer did not exist.
- Normalized-hash test failed because the helper did not exist.
- Lifecycle test failed because the helper did not exist.
- GitNexus pin test failed against 1.6.9 before the wrapper moved to 1.6.10.
- Live reconciliation check failed on stale projections, then passed after write.
- Cross-source cadence test failed on all ten missing declarations and 20 active fixed-time occurrences, then passed after C005/M005 amendments.
- A parallel graph build failed closed on a stale candidate-manifest hash; the producer chain was rerun serially and passed.

Historical logs A0016, A0024, and A0036 describe earlier candidates and do not
represent the closeout candidate.
