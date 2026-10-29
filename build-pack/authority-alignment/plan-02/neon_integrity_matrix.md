# Neon integrity matrix

| Invariant | Implementation | Production evidence | Status | Required Plan 2 proof |
| --- | --- | --- | --- | --- |
| Snapshot identity is unique | snapshots.snapshot_key primary key and digest check | One production key for the reviewed tree | PASS | Preserve |
| Node identity is unique per snapshot | nodes primary key on snapshot_key and node_id | 3,238 actual and recorded nodes | PASS | Preserve |
| Edge identity is unique per snapshot | edges primary key on snapshot_key and edge_id | 12,511 actual and recorded edges | PASS | Preserve |
| Edge endpoints exist in the same snapshot | Composite endpoint foreign keys | Zero dangling edges | PASS | Preserve |
| Snapshot records source provenance | commit, source-manifest, and graph digests | All three stored on production snapshot | PASS | Preserve |
| Snapshot generation excludes uncommitted files | Builder reads git archive of HEAD | Focused test checks indexed files are tracked | PASS | Preserve |
| Unchanged generation is deterministic | Content-derived ordered snapshot and repeated-build test | Same key on two local builds in the focused test | PASS | Preserve |
| Apply is atomic | One begin/commit transaction with rollback catch | Code inspection | UNVERIFIED | Add an isolated-branch injected failure test and verify no partial rows or new active key remain |
| Readers select an explicit snapshot | Impact function requires requested_snapshot | Production query uses explicit snapshot key | PASS | Add a negative unknown-snapshot assertion if missing |
| Database evidence cannot override sources | AGENTS.md and planning.md authority boundary | Current instructions state the boundary | PASS | Preserve in any guidance edits |

## Database mutation boundary

Production was inspected read-only. Plan 2 should test rollback on the existing isolated validation branch or a disposable branch. The test must record before and after snapshot keys and row counts and must not promote test data to production.
