# Article recovery 114 verification

## Scope

- Ticket: GitHub issue #114 under planning packet `ARTICLE-RECOVERY-1127`.
- Base: `codex/article-recovery-integration` at `575563360367de5b98b00ca63c0b79ce4e85a531`.
- Inputs: synthetic filesystem fixtures only. No real article, intake run, database, worker service, deployment, or publication was used.

## Before

The first focused TDD run failed because the activity packet had no `attemptId`. The assertion at `tests/article-import-activity-recovery.test.ts:144` received `undefined` instead of `activity-attempt-<24 hex>`.

Command:

```text
node --import tsx --test --test-name-pattern "interrupted activity work keeps" tests/article-import-activity-recovery.test.ts
```

Observed result: 1 test, 0 passed, 1 failed.

## After

The controller now persists activity attempt identity, predecessor, issue reason, issuing lease owner, and status. Interrupted work reuses its active attempt. Intentional repair receives a new linked attempt without changing the existing stage repair total. Late output is compared with current dependencies, open findings, the active replacement, validator outcome, and independent review before it can be selected. Invalid, stale, or finding-omitting output stays historical. Identical delivery is not recorded twice after reload.

The same attempt identity is now enforced by the normal `RESEARCHING` research-plan controller, not only by editorial and validation checkpoints. The #101 rejected-plan sequence preserves attempt A, issues linked intentional-repair attempt B, and validates a corrected late A against the current registry plan before selection. If B is already delivered, B remains authoritative and validated A is retained as historical. Selected A result and decision bytes are immutable; the restart test overwrites both original paths before acquisition resumes and still reaches `TRANSFORMING` from the frozen selection references.

Focused checks:

```text
node --import tsx --test tests/article-import-activity-recovery.test.ts
17 passed, 0 failed

node --import tsx --test tests/article-import-recovery.test.ts
8 passed, 0 failed

npm run verify:agent-workflow
passed

npm run lint
passed with 16 existing warnings and 0 errors

npm run typecheck
passed
```

Additional focused controller checks:

```text
node --test --import tsx --test-name-pattern "default CLI consumes bound research output" tests/article-import-supervised.test.ts
1 passed, 0 failed (includes interrupted identity, rejected-plan repair, late-A selection, and frozen restart)

node --test --import tsx --test-name-pattern "delivered replacement plan wins" tests/article-import-supervised.test.ts
1 passed, 0 failed

node --test --import tsx --test-name-pattern "delivered replacement is consumed" tests/article-import-activity-recovery.test.ts
1 passed, 0 failed
```

The focused controller test also held dispatch at zero worker calls while a live import owner held the lease. After the owner released it, eligible late output from attempt A was selected before replacement B ran. Reload retained one selection record and one accepted A receipt.

The first independent Codex review of commit `404c2a2` found seven actionable defects. The corrected tests now prove that B is consumed before conflicting A, malformed or misbound A cannot block B, independent review needs prior review evidence, selected bytes are retained immutably, legacy packets are adopted at their existing paths, and historical decisions are scoped to the replacement and compared input.

After merging integration tip `f622a4e`, the controller also preserves the issued public decision-path alias while validating from the immutable result and decision references stored on every completed research-plan attempt. Initial, selected-A, delivered-B, and pre-upgrade pending acquisition all resume through the next stage. A late reuse candidate without valid bound evidence remains historical, leaves B active, and does not increment the repair total. The merged #116 PGlite checks passed 2/2, and an independent compound PGlite probe confirmed a late selected A immediately registers exactly one finding resolution and rehydrates it after restart.

## Environment

The repository declares Node 24 and npm 12. This shell exposed Node 26.13.0 and npm 11.20.0. The locked dependency install completed, and all commands above passed under the available runtime. The full test suite was not run because the repository correction policy requires only the changed behavior and its direct callers.

`node scripts/code-intelligence/update-local.ts` was attempted twice. Both attempts stopped before indexing because another CBM operation prevented exact-build admission. No code-graph export changed. Source inspection and focused runtime checks remain the implementation evidence for this slice.
