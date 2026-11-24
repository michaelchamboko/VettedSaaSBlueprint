# ORCH-01 fresh-context handover

Updated 24 November 2026. Testing action COMPLETE; ORCH-01 PARTIALLY IMPLEMENTED, not closed. ORCH-02 untouched.

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
