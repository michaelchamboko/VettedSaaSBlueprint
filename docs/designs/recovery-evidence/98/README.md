# Recovery evidence for issue 98

## Result

The controller blocks stale or failing approval evidence, but it cannot resume the earliest unfinished editorial or presentation activity. It persists one aggregate work item for each stage. A restart therefore asks the supervisor to execute the same stage packet again, even when the synthetic worker has saved one accepted activity.

This is investigation evidence only. It changes no product code, live article state, database, release, or deployment.

## Authority and scope

- User directive: GitHub issue [#98](https://github.com/michaelchamboko/VettedSaaSBlueprint/issues/98), acceptance criteria 1 through 3.
- Parent specification: GitHub issue [#96](https://github.com/michaelchamboko/VettedSaaSBlueprint/issues/96), `Testing Decisions` items 1 and 7, plus `User Stories` 1 and 21.
- Accepted design: `docs/adr/0002-checkpoint-article-review-activities.md`, heading `Decision`. The integration branch does not contain this ADR, so the investigation read the primary checkout copy and the matching text in issue #96. The report does not add the ADR to this branch.
- Subject revision: `9472dba200865a51573b589bd41796f7321347af`, the supplied `codex/recovery-evidence-96` integration tip.
- Prior evidence reused as fixture guidance: `.worktrees/webcatalog-issues-1127/.artifacts/orchestrator-introspection/controller.test.ts`. The new test runs from the normal `executePendingImport` controller entry point against the subject revision.

## Observed behavior compared with the requirement

| Case | Observed | Required | Status |
|---|---|---|---|
| Editorial interruption after one accepted activity | Dispatch order was `REFINING`, `REFINING`. A supervisor following both dispatches would make two worker calls against the same work and result paths. The controller did not read the accepted-activity receipt. | Reuse the accepted activity and dispatch the earliest unfinished editorial activity without repeating its worker call. | Unreachable in the current state contract. |
| Presentation interruption after one accepted activity | Dispatch order was `VALIDATING`, `VALIDATING`, again with the same aggregate paths and two supervisor worker calls. | Reuse the accepted activity and dispatch the earliest unfinished presentation activity. | Unreachable in the current state contract. |
| Unchanged approval | The controller reused the content and presentation approvals. | Reuse activities while their inputs and dependencies remain valid. | Observed at approval level. |
| Stale artifact revision | The controller returned to `REFINING`, cleared content approval, presentation approval, and the presentation evidence reference. It retained research, assessment, and editorial evidence references as history. | Preserve independent evidence and obtain fresh dependent approvals for the changed revision. | Safe coarse invalidation observed. Per-activity reuse remains unrepresented. |
| Completed rejection | The failed verdict blocked advancement. The raw finding remained in evidence. Controller state recorded a generic `VALIDATING` repair. | Retain the finding and dispatch cause-based repair. | Blocking works. Structured routing is absent. |
| Missing observation | `insufficient-evidence` blocked advancement with the same generic repair action. | Keep the criterion unverified and dispatch the missing observation. | Blocking works. The missing observation is not the next activity. |
| Claimed inapplicable criterion | `not-applicable` blocked advancement and preserved the rationale in raw evidence. Controller state again recorded generic repair. | Retain the applicability reason and require independent acceptance before approval. | Blocking works. No structured applicability decision exists. |

## Why activity restart is unreachable

The observed result follows the current contracts rather than a missing fixture hook:

- `src/lib/article-import/contracts.ts:152` gives a work continuation a stage, work path, result path, and binding fields. It has no activity identity or accepted-activity list.
- `src/lib/article-import/supervised-executor.ts:63-64` derives one work path and one result path from the stage idempotency key.
- `src/lib/article-import/supervised-executor.ts:241-250` consumes one complete `REFINING` or `VALIDATING` result and advances only after the aggregate stage result validates.
- `src/lib/article-import/engine.ts:486-488` records a generic stage repair and tells the supervisor to repair that stage's output.

Adding another synthetic receipt cannot make the normal controller select a later activity because no persisted field can name that activity. A future authorized implementation needs an activity-level state contract before the first acceptance criterion can pass.

## Runnable proof

Test file: `docs/designs/recovery-evidence/98/controller-recovery.test.ts`

The run used cached Node `v24.22.3` from npm cache key `7c49414caf231b7c`. `TEMP` and `TMP` pointed to the worktree's `.scratch/temp`. Dependencies came from the existing `webcatalog-issues-1127` worktree through an untracked local junction.

```powershell
$env:TEMP = (Resolve-Path '.scratch\temp').Path
$env:TMP = $env:TEMP
$env:RECOVERY_EVIDENCE_REVISION = (git rev-parse HEAD)
& 'C:\Users\micha\AppData\Local\npm-cache\_npx\7c49414caf231b7c\node_modules\node\bin\node.exe' `
  'node_modules\tsx\dist\cli.mjs' --test `
  'docs\designs\recovery-evidence\98\controller-recovery.test.ts'
```

Final focused result:

```text
tests 3
pass 3
fail 0
duration_ms 152269.1262
```

The TDD Red run expected the restarted controller to select a different work path. It failed because both paths were identical. The Green diagnostic asserts the observed identity and records the missing activity checkpoint explicitly. The machine-readable snapshot is in `observed-results.json`.

## Evidence limits

- The two worker-call counts model a supervisor obeying each returned work dispatch. The controller produces work packets but does not invoke the model worker itself.
- Supplied synthetic verdicts test controller selection and validation, not reviewer effectiveness.
- The test does not prove a future activity-recovery design. No such protocol exists to interrupt.
- No historical WebCatalog cause is inferred from these observations.
