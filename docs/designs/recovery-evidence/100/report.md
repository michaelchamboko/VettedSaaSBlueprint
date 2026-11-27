# Issue 100 synthetic recovery evidence

## Result

The controller preserves a cumulative repair total by productive stage and requires diagnosis after the third failed repair. That limit survived three reloads and changes to the finding, worker label and session label.

Four gaps remain at the tested controller boundary:

1. Failure routing depends on recognized error text. A coded shared-capability failure stopped the run, while the equivalent prose wording became article repair. The same split occurred for a lost deployment response.
2. `DiagnosisV1` rejects explicit predicted-observation and disproof-check fields.
3. The controller accepted one opaque evidence record as both attempted-recovery evidence and remedy evidence. It then allowed another stage execution without a distinct remedy-verification step.
4. Threshold, viewport and article changes all changed the generic submission fingerprint, but the persisted import record did not classify the change or retain measurement justification and independent regression checks.

These are observed gaps, not product fixes. GitHub issue #100 authorizes investigation and synthetic testing only.

## Authority and expected behavior

- GitHub issue #100, acceptance criteria, requires four failure categories, wording variation, cumulative stage totals across changed attempts or sessions, a falsifiable diagnosis, separate remedy verification, and explicit treatment of threshold or viewport changes.
- GitHub issue #96, Implementation Decisions, requires cause-based routing, cumulative stage failure totals, diagnosis after three unsuccessful repairs, and independent verification when a criterion or measurement changes.
- GitHub issue #96, Testing Decisions 1 and 7, selects the existing supervised controller entry point, persisted-state reload and synthetic adapters as the test boundary.

## Method

The probe reuses the fixture shape, safety guard, controller imports and deterministic observation record from `.worktrees/webcatalog-issues-1127/.artifacts/orchestrator-introspection/controller.test.ts`. It creates disposable synthetic articles under `.scratch/recovery-100` and drives `executePendingImport`, `loadImport`, `withImportLease` and `submitImportDiagnosis`.

No real article, network, database, model, release or deployment operation ran. Each routing case increments a synthetic external-call counter immediately before throwing the selected failure.

Run:

```powershell
$nodeVersion = node --version
if ($nodeVersion -notmatch '^v24\.') { throw "Node 24 is required; found $nodeVersion" }
node --import tsx --test 'docs\designs\recovery-evidence\100\controller.test.ts'
```

The command prints a unique `.scratch/recovery-evidence-runs/100-*/observations.json` path. The rerun record distinguishes `testedCheckoutRevision` from `investigatedRevision`; it does not rewrite the tracked historical observation.

Machine-readable observations are in `observations.json`.

## Failure routing

| Category | Wording | Expected | Observed | Calls |
|---|---|---|---|---:|
| Content rejection | `PRESENTATION_DESIGN_REVIEW_VERDICT_NOT_PASS` | Article repair | `repair/article` | 1 |
| Content rejection | Prose rejection | Article repair | `repair/article` | 1 |
| Invalid evidence | `WORKFLOW_EVIDENCE_INVALID` | Evidence repair | `repair/article` | 1 |
| Invalid evidence | Prose invalid-evidence message | Evidence repair | `repair/article` | 1 |
| Shared capability | `CAPABILITY_UNAVAILABLE` | Stop shared run | `blocked/shared` | 1 |
| Shared capability | "shared reviewer is offline" | Stop shared run | `repair/article` | 1 |
| Uncertain external outcome | `Vercel timeout` | Stop and reconcile | `blocked/shared` | 1 |
| Uncertain external outcome | "deployment response lost after remote success" | Stop and reconcile | `repair/article` | 1 |

The first TDD red run asserted `blocked/shared` for "shared reviewer is offline". It failed with actual continuation `repair`. The final test keeps that discrepancy as measured evidence.

## Cumulative repair and diagnosis

The probe submitted three changed failures in `RESEARCHING`. Each used a different finding, worker label and session label, and reloaded persisted state before the next attempt.

| Measurement | Observed |
|---|---:|
| Repair total after first failure | 1 |
| Repair total after second failure | 2 |
| Repair total after third failure | 3 |
| Executor calls before diagnosis | 3 |
| Fourth call without diagnosis | Blocked |
| Repair total after accepted diagnosis and another failure | 4 |

The third failure set `diagnosisRequired: true` and the next action requested diagnosis. Changing the submission without a diagnosis did not invoke the executor.

The current diagnosis contract retained a cause and evidence references, but explicit prediction and disproof fields failed strict schema validation. The controller then accepted the same non-executable JSON record in both evidence arrays. Presence and readability were checked. A separate proportionate remedy check was not observed before executor call four.

## Measurement changes

Changing only a synthetic threshold from 0.90 to 0.85 changed the canonical submission fingerprint. Resetting that threshold and changing only the viewport from 390 to 412 produced a separate fingerprint. Changing article text produced another fingerprint. The persisted record exposed no `changeKind`, `measurementJustification` or `independentRegressionRefs` fields.

This proves byte-level change detection. It does not prove the distinction, justification or independent regression review required by issue #100.

## Boundaries

- The investigated product revision is `f026bca8b53aecca829262e9a27820ac6d078892`.
- The probe uses the real controller and persistence boundary with synthetic inputs.
- The remote-success case records one simulated external call, then throws a lost-response error. It does not contact a release provider.
- The worker and session variations are encoded in failure identities because the current import record has no separate worker or session field for this repair test.
- No production fix, live operation, database change, merge, deployment or publication is included.
