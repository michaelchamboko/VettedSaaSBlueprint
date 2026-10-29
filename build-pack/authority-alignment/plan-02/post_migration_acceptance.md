# Post-migration acceptance

## Controlling boundary

Planning authority: planning.md lines 26–30.

The approved replacement has two responsibilities:

1. Persist and query versioned semantic relationships in Neon.
2. Provide repository code navigation and bounded impact analysis from the same commit-bound snapshot.

The twelve source strategy documents, deterministic source manifest, and canonical graph remain auditable producer inputs. Source documents remain product authority; planning.md remains planning authority; database rows remain derived evidence.

## Acceptance matrix

| ID | Responsibility | Evidence | Status | Limit |
| --- | --- | --- | --- | --- |
| AC-01 | Product and planning authority remain outside the database | AGENTS.md lines 11, 41–43 and 50; planning.md lines 20 and 40–48 | PASS | Does not prove every subordinate instruction follows the boundary |
| AC-02 | Deterministic semantic input remains auditable | graph.ts reads the committed canonical graph and records manifest and graph digests | PASS | Semantic extraction quality remains governed by the source-intelligence workflow |
| AC-03 | Snapshot identity binds commit and source digests | Production snapshot and SQL constraints | PASS | The stored commit is the reviewed PR head; equality to the deployed merge is established by identical Git tree IDs |
| AC-04 | Semantic and code relationships share one snapshot | graph.ts adds documents, sections, claims, directives, findings, files, imports, and stable-UID references | PASS | Parser coverage is intentionally bounded; direct source inspection remains required |
| AC-05 | Stored relationships are referentially valid | Production counts and endpoint query; installed primary and foreign keys | PASS | Valid relationships can still be semantically incomplete |
| AC-06 | Reapplying an unchanged snapshot is deterministic | Snapshot key is content-derived; focused test builds twice and compares keys; database upsert targets the same key | PASS | No live repeated-apply experiment was required because the code and key contract are deterministic |
| AC-07 | Partial snapshot replacement is not committed | replaceSnapshot uses one transaction and rolls back on error | UNVERIFIED | No database-backed injected-failure test proves the rollback path |
| AC-08 | Retired graph provider is absent from the tracked tree | Direct tracked-content and tracked-path searches; repository regression test | PASS | Git history and global user tooling are outside repository scope |
| AC-09 | Production release matches the merged repository | Vercel deployment metadata and public /api/deployment response | PASS | Runtime health beyond the verified release window is operational monitoring, not this packet |

## Plan 1 acceptance disposition

Plan 1 pass 1 is accepted on the current merged tree:

- Authority amendments and derived records are present.
- Stable D02 identity D02-S-0951e69fb4b0 is intentionally preserved across manifest, graph, requirements, and task consumers.
- Line-ending-sensitive source hashes use normalized content.
- The verifier requires a real Git worktree and committed HEAD without assuming a missing remote.
- The reviewed PR head and merged release share the same tree.
- Plan 1 P2-005 is explicitly disposed in `authority_execution_matrix.md`: current execution is a local manual CLI with durable idempotent state, leases, retries, observable failure stages, authenticated release adapters, and no public request-path consumer. No API trigger is claimed. C-202 carries the remaining unbound-resume defect.

The article-import, code-review, and landing-design discrepancies were deliberately deferred to execution guidance. They remain Plan 2 work and do not reopen Plan 1 authority mapping.

## Migration acceptance result

Status: PASSED WITH ONE TEST GAP.

The replacement is operating in production and satisfies its approved ownership boundary. Plan 2 must add an isolated database-backed rollback test before treating transactional failure behaviour as independently proved.
