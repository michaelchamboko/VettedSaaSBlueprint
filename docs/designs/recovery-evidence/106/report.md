# Issue 106 cleanup recovery evidence

## Result

Interrupted gate cleanup cannot currently resume as a recorded controller operation. The controller has no cleanup operation identity, continuation, registered-reference record, or operation-scoped retry counter. A synthetic marker is ignored, so the normal controller dispatches the next stage. This confirms the missing barrier only. It does not prove crash recovery.

No product code changed. No real article, worker, database, archive, deployment, or publication operation ran.

## Authority and baseline

- User directive: investigate GitHub issue 106 under parent issue 96 using disposable synthetic inputs. Do not implement product fixes or run live operations.
- Expected behavior: ADR-0004, `Decision`, specifically the Q44 crash-ordering paragraph and Q48 retry paragraph. The stable decision identifier is ADR-0004. GitHub issue 96, user stories 13 and 14 and testing decisions 3, 10, and 11, carries the accepted specification. GitHub issue 106 carries this evidence scope.
- Investigated application revision: `f026bca8b53aecca829262e9a27820ac6d078892`.
- Evidence branch baseline: `d3d49f4c132d5d6b2c597df10d189d1564d89a4d` on `codex/recovery-106`.
- Recheck: `git diff --stat f026bca8b53aecca829262e9a27820ac6d078892 -- src tests` returned no differences before the probe.
- Prior evidence: `docs/designs/orchestrator-introspection/findings.md`, `Synthetic controller observations, 27 November 2026`, and the primary probe's `controller-observations.json`. That probe showed that a marker did not block dispatch and that an arbitrarily moved approved artifact was not recovered.

The code graph was stale and pointed at a sibling worktree. It was used only to locate `executePendingImport`, `advanceImport`, and `createSupervisedImportExecutor`. Direct inspection and the isolated runtime probe support every observation below. Loading the graph baseline for this worktree was attempted, but the CLI reported that exact-build admission could not be verified while another codebase-memory operation was active.

## Probe boundary

The controller seam is `executePendingImport`. An instrumented stage executor counts a dispatch only after lease acquisition, record reload, current-state checks, research reconciliation, resume selection, strategy selection, and packet identity selection. A separate run uses `createSupervisedImportExecutor` to verify that the normal controller creates the next gate's work packet.

The probe creates every fixture under `.scratch/recovery-106`, verifies each cleanup target is inside that directory, and removes it in `finally`. The only retained outputs are in this directory.

## Expected and observed behavior

| Case | ADR-0004 expectation | Observed at f026bca |
| --- | --- | --- |
| Before mutation | Persist intent and resume the same cleanup operation before next-gate dispatch. | The marker remained readable, but controller state had no operation identity or cleanup counter. The stage executor was called once and stage remained RESEARCHING. |
| After archive copy, before reference registration | Keep the original, verify archive integrity, register references, then continue. A newly claimed dependency must remain protected. | Original and archive were both readable. The marker claimed the original as a dependency, but the controller did not read it and called the stage executor once. |
| After registration, before original removal | Reconcile durable registered references and actual bytes before removal or dispatch. | This crash point is unreachable through a controller cleanup protocol. The strict import schema rejected a `cleanupOperation` field as an unrecognized key. A marker that claims registration was ignored and the stage executor was called once. |
| Normal handoff | Cleanup completion must precede next-gate work. | With the marker present, the normal supervised executor created a RESEARCHING work continuation. No external worker was invoked because the probe stopped at the handoff. |
| Claimed dependency | Recheck disposal eligibility and retain newly protected material. | Both copies survived, but only because the probe made no removal call. The dependency claim had no controller effect. |
| Unreadable downstream input | Resolve a verified archive reference or hold dispatch without repeating accepted authoring. | Moving the approved artifact to a synthetic archive invalidated content approval. Automatic archive discovery was false, the controller returned to REFINING, and the stage executor was called once. The archived bytes remained readable. |
| Uncertain filesystem result | Preserve recoverable copies and hold the next gate until reconciliation. | Original and mismatched archive bytes both remained readable. Integrity did not match, but the controller called the stage executor once and did not hold dispatch. |
| Three temporary pre-mutation failures | Count three automatic executions total against one cleanup operation across restarts and invocations, then require a verified remedy. | Three EPERM failures produced `transient:research` values 1, 2, and 3. The record remained WAITING_EXTERNAL after the third. Cleanup-operation attempts were absent, article repair totals remained zero, and no verified cleanup remedy was required. |
| Shared integrity failure | Stop immediately. | The generic failure classifier produced a shared blocked continuation on the first `STATE_INTEGRITY` failure. A second invocation did not call the stage executor. This is useful current behavior, but it is not bound to cleanup operation identity. |

## Identity and counters

The synthetic marker used a stable operation ID shaped as `cleanup:<import-id>:INGESTING:synthetic-output`. That ID never entered controller state. `externalArticleImportSchema` has no cleanup operation field, and `importContinuationSchema` has no cleanup continuation kind.

The counters stayed distinct in the evidence:

- Cleanup-operation attempt count: absent from controller state.
- Generic transient stage count: `strategyAttempts["transient:research"]` reached 3.
- Article repair total: `repairStageTotals.RESEARCHING` stayed 0.
- External article worker calls: 0. The normal handoff probe stopped before subprocess invocation.
- Stage executor calls: 1 at each ignored crash marker, 3 across the synthetic temporary-failure invocations, and 1 total across two invocations for the shared integrity failure.

The generic transient count cannot stand in for Q48. It is keyed by stage strategy, not cleanup operation, and the third attempt does not exhaust the run.

## Source explanation

Direct source inspection explains the runtime result:

- `src/lib/article-import/contracts.ts` defines only work, repair, wait, blocked, and complete continuations. The record schema is strict and has no cleanup operation or cleanup counter.
- `src/lib/article-import/engine.ts` advances directly to the next lifecycle stage. `executePendingImport` reloads that state and calls the selected stage executor without a cleanup reconciliation step.
- The same engine stores generic transient attempts under `transient:<strategy>`. With three strategies per group, a third transient failure selects another strategy rather than cleanup exhaustion.
- `src/lib/article-import/supervised-executor.ts` writes the next stage's work packet and returns a work continuation when no result exists. It has no cleanup barrier before that handoff.

These are current-code observations, not proposed implementation choices.

## Unreachable cases and future acceptance checks

Crash recovery at the three Q44 boundaries is not testable until an interruptible cleanup protocol exists. The after-registration case is especially clear: there is no valid controller field in which registration can be durably represented. The marker cases establish only that dispatch is not blocked.

A future authorized implementation needs focused acceptance tests at the same `executePendingImport` boundary:

1. Persist an operation before mutation, kill after persistence, restart through the normal entry point, and assert zero next-gate stage and external worker calls until reconciliation finishes.
2. Kill after archive copy. On restart, compare original and archive bytes, preserve the original, retain a dependency claimed since intent creation, register the verified archive, and dispatch exactly once afterward.
3. Kill after reference registration but before removal. Reload the same operation identity, verify the registered reference resolves to matching bytes, remove only the eligible original, and dispatch exactly once without repeating accepted authoring.
4. Inject an uncertain filesystem result. Assert both recoverable copies remain, the next gate is held, and another mutation is impossible until reconciliation records a certain outcome.
5. Inject the same confirmed pre-mutation temporary failure across three processes or invocations. Assert operation attempts 1, 2, and 3, exhaustion after the third total attempt, unchanged article repair totals, zero further automatic mutation, and resumption only after a separately verified remedy. Repeat with a shared integrity or capability failure and assert immediate stop after the first call.

## TDD record

The red assertion required a durable pre-mutation cleanup intent to produce zero next-stage executor calls. It failed with `1 !== 0`; see `red-output.txt`. Product changes were out of scope, so there is no green implementation. The non-asserting probe then recorded current behavior in `observations.json` and exited successfully; see `current-output.txt`.

Rerun either mode from the repository root:

```powershell
node --import tsx docs/designs/recovery-evidence/106/cleanup-recovery-probe.ts --assert-required
node --import tsx docs/designs/recovery-evidence/106/cleanup-recovery-probe.ts
```

Each command allocates a unique `.scratch/recovery-evidence-runs/106-*` directory. Observation mode prints its `observations.json` path and distinguishes `testedCheckoutRevision` from `investigatedRevision`. The tracked observation, red output, and current output remain immutable historical snapshots.

This is the smallest evidence-only result. It deliberately skips a cleanup implementation, real artifact removal, a live article run, and external worker execution.
