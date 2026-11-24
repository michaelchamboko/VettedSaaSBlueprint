# Article orchestrator handover

## ORCH-01 closeout

**Reopened during release review.** GitHub PR #69 built successfully on Vercel preview. Its independent reviewer found that a fresh refinement worker could not produce the required editorial receipts. Production release is pending proof of the correction.

**Previous local acceptance.** Independent Codex review passed for implementation and tests at `49cf0a711c0ba5aed2ea2d6e9d81946c6778be97`, based on `3fde335921e49d60e5c0264cb0906833aec81ec4`. The completion decision uses local synthetic runs. Review stayed local because the repository runs Vercel checks on pull requests and this handover excludes deployment.

| Verification on the reviewed revision | Result |
| --- | --- |
| Workflow contract and typecheck | Passed |
| Lint | Passed with zero errors and 19 warnings |
| Repository test suite, Node 24.22.3 and npm 12.0.2 | 601 tests, 598 passed, zero failed, three skipped because Windows symlink privileges were unavailable |
| Public-site configuration | Passed |
| Independent current-revision review | Passed after corrections to interrupted failure replay, catalogue writes, proposal repair and catalogue contention |

The real OpenCode 2.2.6 binary ran through the dispatch handler against a loopback model fixture. It wrote the permitted nested research file, received a permission denial on a workflow-state write, and produced a result that the research validator accepted. The import advanced to `TRANSFORMING`. Model selection remains explicit.

The handler tests exercised an interrupted intake claim, saved results with zero worker calls, JSONL rejection, concurrent dispatch, controller death with a live worker, exit-receipt replay, and process-tree termination. One folder dispatch reached `ALL_PUBLISHED` with retained synthetic `LIVE` proof. A separate failed-rollback run retained the previous deployment target and stopped further deployment. Correcting only a catalogue proposal resumed the same packet and preserved an unrelated published entry.

Local evidence in this worktree includes `.mece/orch01-49cf0a7-test.log`, `.mece/native-handler-probe.log` and `.mece/orch01-49cf0a7-review.md`.

## ORCH-02 handover

**Open. Implementation has not started in this worktree.** The original audit defines ORCH-02 under “Mutation entry points have inconsistent locking and preflight.” Its earlier appendix describes a different checkout.

1. After separate authorization, inspect `scripts/record-article-presentation.ts`, `scripts/import-article.ts` and `src/lib/article-import/engine.ts` on the chosen baseline. At the reviewed ORCH-01 revision, standalone presentation loads the import and calls approval helpers before checking that its stage is `VALIDATING`. Compare that path with the existing import lease and checkout preflight.
2. Run standalone presentation and resume against the same synthetic import. Demonstrate that exactly one writer progresses and the competing writer cannot overwrite its result.
3. Submit a stale presentation request against a journal-bearing `RELEASING` record and a genuinely verified `LIVE` record. Compare record bytes and retained evidence before and after rejection. Check the other supported mutation commands against the same ownership rule and confirm that read-only inspection leaves state unchanged.

## Incoming ORCH-01 checkpoint (historical)

The following instructions and results describe the incoming 24 November checkpoint.

## Working location and authority

Continue in `.worktrees/orch01-only-1124`, branch `codex/orch01-only-1124`, baseline origin/main `3fde335`. Preserve all uncommitted work. Primary checkout and earlier `.worktrees/orch-audit-1124` contain separate unfinished work; do not reset, merge, or copy it wholesale.

Read shared and project AGENTS.md, Karpathy guidelines, and i-have-adhd. The user explicitly selected direct Codex implementation after three unsuccessful OpenCode correction passes. This overrides the implementation-worker routing for this task. Production orchestration must be model-agnostic. Do not restore the implicit Beam fallback. Keep editorial-policy questions distinct from general dispatcher configuration.

## Completed testing action

Independent Node 24.22.3/npm 12.0.2 checks: workflow verification passed; typecheck passed; npm test passed with 588 total, 585 passed, 3 skipped, 0 failed, 444817.6664 ms. Lint failed with 3 no-explicit-any errors in tests/article-import-dispatch.test.ts and 26 warnings. Logs are `.mece/testing-*.log`. The full test command has exited. Earlier combined focused session 65473 had not returned a completion result when last checked; inspect before launching overlapping tests.

## Current implementation

New dispatch.ts wraps supervised execution inside executePendingImport's lease. scripts/import-article.ts exposes dispatch commands. worker-runner.ts parses OpenCode JSONL and attempts process-tree termination on Windows timeout. Latest direct edits removed implicit Beam fallback, routed terminal imports through existing proof validation, and changed intake loading to claimNextIntakeEntry. These edits passed the full checks above except lint.

## Remaining ORCH-01 work

1. Correct lint errors and inspect the latest intake change for races, error masking, and stable snapshot ordering. Confirm terminal-proof checks through normal command handling.
2. Make the configured worker able to create required scoped artifacts. Current invocation forbids edits; default article-worker definition exists locally but is ignored/untracked. Do not rely on prose alone to constrain tools or permit independent stage advancement/publication.
3. Persist and verify child-process ownership across controller interruption. Controller death alone must not authorize duplicate dispatch while its child survives. Keep recovery bounded and durable.
4. Complete real handler acceptance coverage: persisted packet/restart, saved valid result without invocation, actual JSONL/subprocess compatibility, wrong-stage/malformed/stale rejection, due/future waits, concurrent duplicate prevention, captured intake order/resume, and synthetic verified LIVE plus accurate failed recovery. Existing tests include weak assertions: missing-worker test stops before worker invocation, wait test only covers future wait, real JSONL fixture is unused. Existing release tests are not full dispatcher proof.
5. Review provider-specific argument/parsing separation, same-stage progress detection, and budget exhaustion outcomes. Reuse existing engine/gates; do not invent a second orchestrator or bypass evidence validators.

## Completion discipline

Stay on ORCH-01. Run focused regressions and required repository checks after corrections. Obtain independent review of the exact tested revision. Mark ORCH-01 complete only after all original acceptance criteria pass. Then provide a concise ORCH-02 handover and stop. No real imports, production database writes, merge, deploy, or publication. Major independent discoveries belong in v2; defects in this fix remain ORCH-01 responsibilities.

The original audit retains all 15 IDs and a sequential plan. Its historical implementation observations refer to the prior worktree; they are not proof of fixes in this checkout. The later model-agnostic directive supersedes the old appendix's pinned dispatch-model wording.
