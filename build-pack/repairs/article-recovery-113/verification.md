# Article recovery 113 verification

## Authority and boundary

- Planning authority: `planning.md`, heading `Article recovery remediation (ARTICLE-RECOVERY-1127)`, slice 3.
- Ticket authority: GitHub issue #113, with parent #96.
- Investigation evidence: issues #99 and #104 at commit `bebb4fe644b3d97e9a21f46a6e06938ed35684cb`.
- Starting integration revision: `67ec474a1ce07fa00f77f11354806e20dd92c029`.
- Dependency check: issue #112 commit `26965abedd2b1c71b207ecb9f1b38d22fb853c6a` is an ancestor of the starting revision.
- Test boundary: isolated synthetic article, review, evidence, release, and IMPROVE fixtures. No real article, worker model, database, GitHub mutation, deployment, or publication operation ran.

## Before

The first test-first run reproduced the issue #99 omission failure through `executePendingImport` and `createSupervisedImportExecutor`:

```text
node --import tsx --test --test-name-pattern "replacement review cannot" tests/article-import-activity-recovery.test.ts
# 0 passed, 1 failed
# activityFindings was undefined after a retained rejection
```

The inherited controller retained each activity receipt but treated an accepted or not-applicable replacement as sufficient by itself. It had no stable finding record, no finding-bound repair context, and no independent resolution contract.

## After

The controller now creates a stable finding from the rejected activity, criterion, reviewed revision, observation, reviewer, execution, dependencies, and original result evidence. Open findings take priority over accepted replacement receipts, so omission and a bare `Resolved.` observation cannot advance the activity.

The same activity packet carries each objection and expected check. A conclusive review must use a different reviewer and execution, verify the original result evidence, retain fresh evidence, and record passing checks for affected criteria. Verified repair and appropriate removal also require a changed dependency whose path was relevant to the rejected revision. Unsupported or failed checks stay in pre-publication repair.

The synthetic matrix exercised verified repair, appropriate removal, evidenced dismissal, inconclusive review, requirement referral, and required-capability-removal referral. Inconclusive and referred findings remain open. Independently accepted activities whose dependencies did not change remain accepted.

A separate release fixture took retained finding history through verified publication and a later normal-controller IMPROVE execution. The original release receipt, terminal reference, rejected finding, and independent resolution stayed unchanged.

## Focused checks

```text
node --import tsx --test tests/article-import-activity-recovery.test.ts
# 11 passed, 0 failed

node --import tsx --test tests/article-import-recovery.test.ts
# 8 passed, 0 failed

node --import tsx --test --test-name-pattern "RELEASING executor|default CLI|supervised transforming|executor output failures" tests/article-import-supervised.test.ts
# 4 passed, 0 failed

node --import tsx --test --test-name-pattern "verified publication and later IMPROVE" tests/article-import-release.test.ts
# 1 passed, 0 failed
```

The combined full supervised and recovery command passed the eight recovery cases and the first six supervised cases, then made no further progress in the broad full-release dispatch fixture for more than five minutes. It was stopped and is not counted as a passing check. The four directly affected supervised cases were rerun separately and passed.

## Repository gates

- `npm run verify:agent-workflow`: passed.
- `npm run lint`: passed with 16 existing warnings and no errors.
- `npm run typecheck`: passed.
- `git diff --check`: pending final diff.

The available runtime was Node 26.13.0 with npm 11.20.0, not the repository's Node 24.x and npm 12 contract. The focused checks passed under the available runtime.

Both required code-intelligence refresh attempts failed because the installed CLI could not verify exact-build admission while other codebase-memory operations were active. The existing graph covered the investigation worktree at `bebb4fe`, so graph results were treated as locator evidence only. The changed controller, packet, contract, release, and test relationships were verified in source and focused runtime checks.

Codex Code Review requires the GitHub PR and its current remote head. This ticket branch is intentionally local and must not be pushed. The independent review remains a shipping gate on the integration PR after this commit is merged there.
