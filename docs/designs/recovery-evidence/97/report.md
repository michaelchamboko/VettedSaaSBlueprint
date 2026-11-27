# Ticket 97 release-recovery investigation

Date: 27 November 2026

Branch: `codex/recovery-97`

Investigated product revision: `f026bca8b53aecca829262e9a27820ac6d078892`

Scope: synthetic investigation only. No product code, real deployment, publication, database, or release state was changed.

## Result

The current controller does not make a duplicate deployment while the outcome is held or while the killed controller's lease remains active. It also cannot resume the outstanding production verification from the retained journal.

After a successful remote side effect whose response is lost, the remote alias points at the new deployment but the durable journal has no deployment identity. The controller attempts rollback, cannot verify it, and holds in `WAITING_EXTERNAL`. Immediate restart and a due wait both keep the remote call count at one.

After hard controller exit inside `deploy`, the remote alias points at the new deployment while the durable record remains `RELEASING`. Immediate reload through the normal entry point keeps the remote call count at one because the old lease still guards the record. Explicit `recoverWorkflowLease` verifies that the actual killed child PID has exited and releases the lease. The next normal restart then makes a second deployment, verifies that second deployment, retains its production proof, and reaches LIVE.

An indeterminate remote result also holds in `WAITING_EXTERNAL` with one remote call and no local deployment identity.

The safe conclusion is scenario-specific. Lost and indeterminate responses hold without a duplicate, but they cannot resume verification. Hard exit also holds until verified lease recovery; after that authorized recovery, the controller deploys again because no deployment identity was saved. A release operator cannot resume the original deployment's verification without either remaining blocked or making a duplicate deployment.

## Expected behavior

GitHub issue #97 and parent issue #96, Testing Decisions 4 and 11, require the controller to:

- reconcile deployment identity, intended commit, production alias, rollback target, and outstanding verification before retrying;
- hold the release action when the remote outcome remains uncertain;
- reach LIVE only when retained production proof covers the deployed article.

The exact checkout does not contain `GLOSSARY.md`, `docs/adr/0003-unify-publication-approval-and-reconciliation.md`, or `docs/designs/orchestrator-introspection/findings.md`. Those documents were present only as untracked files in the dirty primary checkout, so this report does not treat them as facts from the investigated revision. The expected behavior above is taken from the fetched issue bodies.

## Measured observations

| Scenario | Remote state after incident | Durable state after incident | Restart observation |
| --- | --- | --- | --- |
| Success, response lost | 1 call; `dpl-lost-response-1`; alias assigned; rollback target `dpl-previous` at `bbbb...bbbb` | `WAITING_EXTERNAL`; intended commit `cccc...cccc`; review and merge journal retained; deployment identity absent; no production proof. The probe infers 9 required checks from the non-LIVE stage; the record has no persisted outstanding-check list. | Immediate and due restart stayed `WAITING_EXTERNAL`; call count remained 1 |
| Controller exit before local save | Initial call created `dpl-controller-exit-1` and assigned the alias; no rollback attempt | `RELEASING`; intended commit and prior journal retained; deployment identity absent; no production proof. The probe infers the same 9 checks from stage rather than reading observed check state. | Immediate reload stayed `RELEASING` at 1 call. Explicit recovery verified killed PID 24552, released the lease, then normal restart created `dpl-controller-exit-2`; call count 2; LIVE with retained proof for the second deployment |
| Indeterminate remote result | 1 call; deployment identity and alias assignment unknown; rollback target retained | `WAITING_EXTERNAL`; deployment identity absent; no production proof. The 9 listed checks are a probe inference from stage, not a controller observation. | Immediate and due restart stayed `WAITING_EXTERNAL`; call count remained 1 |

The machine-readable record is [observations.json](./observations.json). It includes each journal, next action, alias assignment, rollback target, stage-derived check inference, and call count before and after restart.

## TDD evidence

The requirement-level red check demanded all three properties together: one deploy call, resumed verification through LIVE, and retained production proof. The lost-response case reached the injected remote side effect, kept the call count at one, then failed because the restarted controller remained `WAITING_EXTERNAL`:

```text
AssertionError: lost-response should resume outstanding verification
+ actual - expected

+ 'WAITING_EXTERNAL'
- 'LIVE'
```

The retained output is [red-output.txt](./red-output.txt). The final observational probe exits successfully only when every scenario reaches the injected remote boundary and any LIVE result has retained production proof. It does not convert the missing recovery behavior into a passing requirement.

## Reproduce

Run from the repository root with Node 24 and the checked-out dependencies:

```powershell
$env:TEMP = Join-Path $PWD '.scratch\recovery-97-temp'
$env:TMP = $env:TEMP
New-Item -ItemType Directory -Force -Path $env:TEMP | Out-Null
node --import tsx docs/designs/recovery-evidence/97/release-recovery-probe.ts --assert-required
node --import tsx docs/designs/recovery-evidence/97/release-recovery-probe.ts
node --import tsx docs/designs/recovery-evidence/97/release-recovery-probe.ts --refresh-snapshots
```

The first command is expected to exit 1 at the missing verification-resume assertion. The first two commands write only to a new `.scratch/recovery-evidence-97-runs/run-*` directory, so an expected failure cannot overwrite tracked evidence. The third command explicitly refreshes the tracked observation snapshot and succeeds only after the complete observational run passes its checks.

## Revision and source checks

- The requested base branch `codex/recovery-evidence-96` and requested SHA both resolved to `f026bca8b53aecca829262e9a27820ac6d078892`.
- The isolated worktree was clean and exactly at that SHA before evidence files were added.
- No open pull request touched `docs/designs/recovery-evidence/97/`.
- Direct inspection found the critical ordering in `src/lib/article-import/release.ts`: `deploy(commitSha)` returns before the deployment journal is saved. `ReleaseOperations` has no deployment lookup or reconciliation operation.
- The shared code graph was indexed from another worktree at `6383cf8...`. Loading the exact checkout was refused while another codebase-memory operation was active, so graph results were treated as stale and every conclusion above was checked in source and at runtime.

## Limitations

- The adapter and article are synthetic. This does not prove provider-specific lookup, alias consistency, or real rollback behavior.
- The hard-exit case uses `process.exit(86)` inside the adapter after recording the remote side effect. Immediate restart was observed separately from explicit `recoverWorkflowLease`. Recovery used the actual dead child PID and the repository's ESRCH check; it did not force expiry or fabricate ownership evidence.
- The probe does not propose or test a product fix. A future authorized change needs a provider reconciliation capability and a separate acceptance test that resumes verification with one remote deployment.
- No real release, merge, deployment, publication, or external write was performed.

## Verification

- `node --import tsx docs/designs/recovery-evidence/97/release-recovery-probe.ts --assert-required`: expected failure after one recorded remote call, because restart stayed `WAITING_EXTERNAL` instead of resuming verification.
- `node --import tsx docs/designs/recovery-evidence/97/release-recovery-probe.ts`: passed and wrote the three-scenario observation receipt.
- `npm run verify:agent-workflow`: passed.
- `npm run typecheck`: passed, including Next.js route type generation.
- Targeted ESLint for `release-recovery-probe.ts`, using the complete shared dependency tree: passed.
- `npm test`: did not establish a suite result. The interrupted worktree install first left `zod/v4/core/util.js` missing. A second run with the complete shared dependency tree reached the active tests and exposed numerous existing article-import failures; it was stopped without a final count because repository-wide gates are owned by the coordinating task.

The dependency setup used the required Node 24.22.3 and npm 12.0.2 pair. Its first sandboxed attempt could not reach the registry; the approved network retry remained silent for several minutes and was stopped. The incomplete local tree was moved aside before the final probe, targeted lint, workflow verification, and typecheck used the complete shared locked dependency tree.
