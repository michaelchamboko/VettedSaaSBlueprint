# Plan 2 results — Neon repository intelligence replacement

## Current status

- Status: VERIFIED WORKTREE — candidate commit and independent review pending
- Branch: `codex/replace-both-with-neon`
- Baseline commit: `b67a50425df71a3c98ee36f9543ddeadd815457d`
- Candidate commit: not created
- Exact next action: create the candidate commit, synchronize its exact snapshot to the isolated Neon branch, and request independent current-head review.

## Task checklist

- [x] Isolate work from current `origin/main`.
- [x] Register the owner-authorized replacement in `planning.md`.
- [x] Implement one commit-bound semantic and code relationship snapshot.
- [x] Implement versioned Neon schema, transactional synchronization, and bounded impact query.
- [x] Prove the migration and query on an isolated Neon branch.
- [x] Delete tracked files and active contracts for the retired local graph tool.
- [x] Add a repository-wide zero-trace regression test.
- [x] Pass every required repository and release gate on the final worktree candidate.
- [ ] Obtain independent review of the exact candidate commit.
- [ ] Merge, migrate production, synchronize the reviewed snapshot, deploy, and verify.

## Action ledger

### A0001 — Isolated implementation baseline established

- Time: 2026-10-28T18:00:00+02:00
- Status: PASS
- Action: Created a fresh worktree and branch from current `origin/main`; preserved the dirty primary checkout.
- Inputs: `origin/main`; repository worktree inventory.
- Command: `git worktree add` from the primary checkout.
- Expected: clean independent implementation baseline.
- Observed: branch `codex/replace-both-with-neon` at `b67a50425df71a3c98ee36f9543ddeadd815457d`.
- Evidence: Git worktree and branch state.
- Changed files: none.
- Decision: implementation may proceed without mixing the owner's local changes.
- Limits: does not prove implementation correctness.
- Next action: inventory the retired provider and both replacement responsibilities.

### A0002 — Both repository-intelligence responsibilities implemented

- Time: 2026-10-28T21:00:00+02:00
- Status: PASS
- Action: Added deterministic semantic and code relationship extraction, versioned Neon persistence, transactional synchronization, and bounded impact queries.
- Inputs: `docs/document-intelligence/DOCUMENT_GRAPH.json`, tracked repository files, TypeScript imports, stable source identifiers, `db/repository-intelligence-v001.sql`.
- Command: direct implementation and focused test execution.
- Expected: one snapshot joins document relationships with code files and imports and is bound to exact source and commit evidence.
- Observed: dry-run snapshot contains 2,748 nodes and 3,379 edges and records commit, source-manifest, and graph hashes.
- Evidence: `src/lib/repository-intelligence/`, `scripts/sync-repository-intelligence.ts`, `scripts/query-repository-impact.ts`, `tests/repository-intelligence.test.ts`.
- Changed files: the paths listed above plus `package.json` and the migration scripts.
- Decision: the replacement covers semantic persistence/query and code impact/navigation.
- Limits: production Neon is not yet changed.
- Next action: validate on an isolated Neon branch.

### A0003 — Isolated Neon migration and query proved

- Time: 2026-10-28T22:30:00+02:00
- Status: PASS
- Action: Created an isolated Neon branch, applied the additive migration, synchronized a complete snapshot, and queried code and semantic seeds.
- Inputs: Neon project `winter-truth-98410571`; validation branch `br-square-leaf-a6lqabvu`; schema `repository_intelligence_v1`.
- Command: connected Neon branch operations plus `npm run intelligence:sync:apply` and `npm run intelligence:impact` equivalents.
- Expected: schema objects exist; full upload succeeds; bounded queries return expected neighbours.
- Observed: snapshot upload succeeded with 2,748 nodes and 3,379 edges; a script seed returned its imported service modules; document seed `D01` returned contained stable sections.
- Evidence: Neon validation branch and local migration/source verifiers.
- Changed files: none from the database proof.
- Decision: the schema and query are technically viable before production promotion.
- Limits: production branch remains unchanged; validation branch cleanup remains pending.
- Next action: purge every tracked repository trace of the retired provider.

### A0004 — Retired provider purged and guarded against regression

- Time: 2026-10-29T00:20:00+02:00
- Status: PASS
- Action: Deleted provider configuration, bridge data, refresh/reconciliation scripts, and provider-specific documents; reconciled prompts, tests, planning, manifests, skills, and generated records; added a full candidate-file zero-trace test.
- Inputs: tracked path inventory and repository-wide content search.
- Command: direct edits, generator execution, `git grep`, and `npx tsx --test tests/repository-intelligence.test.ts`.
- Expected: no existing candidate path or text contains the retired provider name; no obsolete licence/version/cache contract remains.
- Observed: both bounded content audits returned zero matches; all three repository-intelligence tests passed.
- Evidence: `tests/repository-intelligence.test.ts`; current Git diff; deleted provider paths.
- Changed files: authority, prompts, manifests, tests, generated records, scripts, and deleted provider artifacts in the current diff.
- Decision: the candidate cannot silently reintroduce the retired provider through a tracked path or text file.
- Limits: deleted names remain visible in local unstaged status until committed; Git history is intentionally preserved.
- Next action: validate all repository contracts.

### A0005 — Focused contracts and derived records verified

- Time: 2026-10-29T00:31:42+02:00
- Status: PASS
- Action: Regenerated the current build pack and document graph, corrected generator/validator contract inconsistencies exposed by fresh generation, and reran focused checks.
- Inputs: 12 registered source documents, 1,424 stable sections, current planning and generation scripts.
- Command: document-intelligence generation and verification; Python unit tests; lint; typecheck; workflow verifier; migration verifier.
- Expected: reproducible records and no contract drift.
- Observed: document verification passed with 12 sources, 1,424 sections, 791 claims, 8 directives, 868 relationships, and 112 candidates; 11 Python tests passed; lint passed with 0 errors and 15 pre-existing warnings; typecheck, workflow verification, and migration-source verification passed.
- Evidence: command output retained in the task transcript and reproducible from repository commands.
- Changed files: generator, validator, generated build pack, and document graph.
- Decision: focused evidence supports starting the full gate run.
- Limits: full test, production build, public-site validation, independent review, production migration, merge, and deployment remain pending.
- Next action: run full gates on the current candidate.

### A0006 — Final worktree candidate passed all required gates

- Time: 2026-10-29T01:01:09+02:00
- Status: PASS
- Action: Corrected mechanical purge leftovers, removed stale provider-specific packet evidence, regenerated the build pack, and ran the exact final-source gate matrix.
- Inputs: complete current diff; regenerated build pack; 12-source document graph; repository test suite; Next.js production application.
- Command: `npm run verify:agent-workflow`; `npm run lint`; `npm run typecheck`; `npm test`; `npm run build`; `npm run validate:public-site`; `verify-document-intelligence.ps1`; repository-wide zero-trace searches.
- Expected: every required gate exits 0; no branded provider path or text remains; production build and public release configuration remain valid.
- Observed: workflow verification passed; lint passed with 0 errors and 15 pre-existing warnings; typecheck passed; 397 tests ran with 394 passed, 3 expected Windows privilege skips, and 0 failures; production build compiled and generated 130/130 static pages; public-site validation passed; document intelligence passed with 12 sources, 1,424 sections, 791 claims, 8 directives, 868 relationships, and 112 candidates; both zero-trace audits returned no matches.
- Evidence: reproducible repository commands, current diff, and this ledger. The first sandbox test run failed on restricted atomic-link, localhost, and browser access; the required unsandboxed rerun passed. Two sandbox production-build attempts stalled after their child process disappeared; the required unsandboxed build completed successfully.
- Changed files: final scoped diff.
- Decision: the worktree is ready for a candidate commit and independent current-head review.
- Limits: no commit, PR, production database migration, merge, or deployment has occurred yet.
- Next action: commit the exact candidate through repository hooks.

## Open blockers and unresolved decisions

- Production migration and production snapshot synchronization require the exact reviewed candidate and explicit execution at the release step.
- Independent current-head review cannot begin until a candidate commit exists.
- Deployment verification cannot begin until the reviewed PR is merged.
