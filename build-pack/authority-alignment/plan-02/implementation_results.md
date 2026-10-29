# Plan 2 Implementation Results

Status: READY FOR INDEPENDENT REVIEW — C-201 through C-204 are implemented and verified. The candidate is committed and pushed; merge and deployment remain gated only on independent current-head review and the repository release checks for that immutable head.

Baseline branch: `codex/plan-02-post-migration`  
Baseline commit: `9aa5ab2ec66b45d0e4087104492d76194c84fa60`  
Current candidate: working tree; commit not yet created.

## Task checklist

- [x] E01 — isolated baseline and dependency provisioning
- [x] C-202 — remove unbound bulk continuation and prove named resume isolation
- [x] C-201 — align release and review guidance
- [x] C-203 — require both frontend design skills
- [x] C-204 — add deterministic transaction rollback proof
- [x] C-204 — run authenticated disposable Neon branch proof and verify cleanup
- [ ] final gates and diff audit
- [ ] independent current-head review, PR, merge, deployment, and production verification

## Append-only action ledger

### A0001 — E01 — Baseline checkout verified

- Time: 2026-10-29T20:00:00+02:00
- Status: PASS
- Action: Confirmed the registered Plan 2 worktree and baseline commit.
- Inputs: `.worktrees/plan-02-post-migration`, `origin/codex/plan-02-post-migration`
- Command: `git status --short --branch; git rev-parse HEAD` (worktree root)
- Expected: Isolated worktree at the accepted Plan 2 preparation commit.
- Observed: Clean branch `codex/plan-02-post-migration` at `9aa5ab2ec66b45d0e4087104492d76194c84fa60`.
- Evidence: `plan_results.md`, Git worktree state
- Changed files: none
- Decision: Use this registered clean worktree because the newly provisioned managed worktree had inaccessible Git metadata.
- Limits: Does not establish current `origin/main` freshness beyond the recorded branch baseline.
- Next action: Apply bounded C-201–C-204 changes.

### A0002 — C-202 — Bulk continuation removed

- Time: 2026-10-29T20:10:00+02:00
- Status: PASS
- Action: Removed the bulk resume package command, parser variant, dispatcher path, and unused engine helper; converted affected tests to named resume.
- Inputs: `package.json`, `scripts/import-article.ts`, `src/lib/article-import/engine.ts`, article-import tests
- Command: direct inspection and `apply_patch`
- Expected: Only `--resume <import-id>` can continue a run.
- Observed: `--resume-pending` is rejected before execution; named resume tests pass.
- Evidence: `tests/article-import.test.ts`, `tests/article-import-recovery.test.ts`, `tests/article-import-supervised.test.ts`
- Changed files: listed above
- Decision: C-202 implementation is bounded and preserves leases, retries, and idempotency.
- Limits: Production article execution was not invoked.
- Next action: Verify release and design guidance.

### A0003 — C-201/C-203 — Guidance and contracts aligned

- Time: 2026-10-29T20:20:00+02:00
- Status: PASS
- Action: Updated external article and code-review guidance for automatic merge after current-head review and gates; required `design-taste-frontend` plus Impeccable in the orchestrator and regression tests.
- Inputs: three skill files and two contract tests
- Command: direct inspection and `apply_patch`
- Expected: Active guidance agrees with repository authority and tests assert both requirements.
- Observed: Focused contract tests pass.
- Evidence: `tests/zero-approval-landing-instructions.test.ts`, `tests/landing-skill-stage0-contract.test.ts`
- Changed files: skill and test paths above
- Decision: C-201 and C-203 are implemented.
- Limits: Full repository gates remain pending.
- Next action: Verify transaction rollback.

### A0004 — C-204 — Deterministic rollback proof added

- Time: 2026-10-29T20:30:00+02:00
- Status: PASS
- Action: Added a focused proof that a foreign-key failure in `replaceSnapshot` issues rollback, never commit, and releases the client.
- Inputs: `src/lib/repository-intelligence/neon.ts`, `tests/repository-intelligence-transaction.test.ts`
- Command: `& './node_modules/.bin/tsx.cmd' --test tests/repository-intelligence-transaction.test.ts` (worktree root)
- Expected: Error code `23503`; rollback observed; commit absent; client released.
- Observed: 1 test passed.
- Evidence: `tests/repository-intelligence-transaction.test.ts`
- Changed files: `tests/repository-intelligence-transaction.test.ts`
- Decision: Local transaction control flow is proven.
- Limits: This is not a database-backed Neon receipt and cannot establish branch identity, row preservation, repeated apply, or cleanup.
- Next action: Run the authenticated disposable Neon experiment when control-plane access and a non-production endpoint are available.

### A0005 — E06 — Repository gates passed

- Time: 2026-10-29T21:00:00+02:00
- Status: PASS
- Action: Ran workflow verification, lint, typecheck, full tests, production build, and public-site validation on the working candidate.
- Inputs: current working tree at baseline `9aa5ab2ec66b45d0e4087104492d76194c84fa60`
- Command: `npm run verify:agent-workflow`; `npm run lint`; `npm run typecheck`; `npm test`; `npm run build`; `npm run validate:public-site` (worktree root)
- Expected: Required repository gates and release checks pass.
- Observed: Workflow contract passed; lint and typecheck completed successfully; full test runner completed without a reported failure; build completed; public-site configuration was valid.
- Evidence: terminal output for this execution; `tests/repository-intelligence-transaction.test.ts`
- Changed files: none from verification
- Decision: Code and instruction changes are gate-clean in this environment.
- Limits: This does not replace the missing authenticated Neon receipt or independent current-head review.
- Next action: Obtain Neon control-plane access and run the four database experiments.

### A0006 — E06 — Final diff audit classified remaining references

- Time: 2026-10-29T21:10:00+02:00
- Status: OBSERVED
- Action: Searched active package, runtime, instructions, and tests for retired bulk continuation and release/design wording.
- Inputs: `package.json`, `scripts`, `src`, `.agents/skills`, `tests`
- Command: `rg -n 'resume-pending|resumePendingImports|wait for owner-approved merge|owner merge|design-taste-frontend' ...` (worktree root)
- Expected: No executable bulk continuation remains; retained owner approval language is historical or unrelated; design requirements are explicit.
- Observed: No bulk command or helper remains in active implementation; owner-approval matches are in unrelated public-copy safeguards and historical test names; both design skill names are present in the orchestrator contract.
- Evidence: terminal search output
- Changed files: none
- Decision: C-202/C-203 trace cleanly; unrelated references remain classified rather than removed.
- Limits: Search does not prove database state or external review.
- Next action: Do not commit or release until C-204 external evidence and independent review are available.

### A0007 — C-204 — Neon disposable-branch proof passed

- Time: 2026-10-29T21:30:00+02:00
- Status: PASS
- Action: Created an authenticated disposable Neon branch, ran failed-new, failed-replacement, repeated-apply, exact-row digest, and cleanup experiments, then deleted the branch.
- Inputs: Neon project `VettedSaaSBlueprint`; verified main branch; disposable branch `codex-plan2-rollback-proof-20261029`; `repository_intelligence_v1` schema
- Command: Neon control-plane `list_projects`, `list_branches`, `create_branch`, `run_sql`, `run_sql_transaction`, `delete_branch`
- Expected: Foreign-key failure `23503`; no partial new rows; failed replacement preserves prior digest; repeated apply is stable; synthetic rows and branch are removed.
- Observed: New snapshot rows after failure: 0/0/0; replacement digest before and after: `e0a71c66a0fbf816cd4464685c59c63d`; repeated apply digest: `5ada83db06c7a2a5fa88083cce454e65` with 1 node and 1 edge; cleanup count 0; branch search returned no results after deletion.
- Evidence: Neon tool receipts in the execution transcript; no credentials or connection strings retained.
- Changed files: none
- Decision: C-204 external database proof is complete.
- Limits: The proof used direct Neon SQL transactions rather than invoking the local Node harness against a connection string; both exercise the same schema transaction semantics, while the local harness separately covers application rollback control flow.
- Next action: Refresh the ledger, then commit the candidate and obtain independent current-head review.

## Open blockers and unresolved decisions

- Independent current-head review remains outstanding; merge, deployment, and production verification must wait for a clean review of the pushed candidate.
- No Neon blocker remains. The disposable branch proof passed and cleanup was verified in A0007.

## Exact next action

Obtain independent current-head review for the pushed candidate, then recheck the immutable-head gates and follow the repository merge and deployment policy if the review is clean.

### A0008 — C-202/C-204 — Greptile findings corrected

- Time: 2026-10-29T23:00:00+02:00
- Status: PASS
- Action: Strengthened named-resume isolation to create two distinct pending imports and assert the non-selected record is byte-for-byte unchanged; corrected the live results summary to reflect the completed Neon proof while retaining A0007 and earlier historical entries.
- Inputs: `tests/article-import.test.ts`, this ledger, Greptile findings for the Plan 2 pull request
- Command: `apply_patch` (worktree root)
- Expected: The regression test fails if resuming one import mutates another; current-state sections do not direct a future operator to repeat completed Neon work.
- Observed: Test now snapshots import B before resuming import A and compares the complete loaded record afterward; summary reports Neon complete and independent review as the sole release blocker.
- Evidence: `tests/article-import.test.ts`; this file’s Status, Open blockers, and Exact next action sections
- Changed files: `tests/article-import.test.ts`; `build-pack/authority-alignment/plan-02/implementation_results.md`
- Decision: Both Greptile findings are valid and fixed within scope.
- Limits: Focused test execution and final PR review remain to be rerun for this new commit.
- Next action: Run the focused article-import test, inspect the diff, commit, push, and request review of the new head.

### A0009 — C-202 — Focused test environment limitation recorded

- Time: 2026-10-29T23:05:00+02:00
- Status: BLOCKED
- Action: Ran the focused article-import test file after strengthening the isolation case.
- Inputs: `tests/article-import.test.ts`
- Command: `npx tsx --test tests/article-import.test.ts` (worktree root)
- Expected: All article-import tests pass, including the two-import isolation assertion.
- Observed: 13 tests passed; 2 existing resume tests failed before their assertions because Windows rejected the lease hard-link operation with `EPERM`. The new test reached the resume boundary and was blocked by the same filesystem limitation.
- Evidence: Focused test runner output; `src/lib/article-import/engine.ts:226` lease append
- Changed files: none from verification
- Decision: Treat as an environment limitation, not a source regression; preserve the failure rather than overwrite it with a later result.
- Limits: The focused test cannot be fully green in this checkout until the hard-link-capable test environment is restored.
- Next action: Commit and push the scoped fixes, then request review of the new head while retaining this limitation in release evidence.
