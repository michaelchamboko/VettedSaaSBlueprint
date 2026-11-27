# Rejected finding recovery investigation, issue #99

## Outcome

The current controller does not carry a rejected presentation finding through repair and independent resolution.

A selected failing review blocked `VALIDATING`. An unchanged resubmission then failed with `UNCHANGED_SUBMISSION`. After the synthetic result selected a separate passing review, the controller advanced to `RELEASING` even when that review omitted the original finding. It also advanced when the review repeated the description with `disposition: "resolved"`, without a finding identity or resolution evidence.

The rejected execution bytes remained readable. Retention did not create continuity. The import record, work packet and replacement review had no shared finding identifier.

## Authority and scope

- GitHub issue [#99](https://github.com/michaelchamboko/VettedSaaSBlueprint/issues/99), acceptance criteria and investigation-only scope.
- Parent issue [#96](https://github.com/michaelchamboko/VettedSaaSBlueprint/issues/96), User Stories 2 through 5 and 22, plus Testing Decisions 2 and 7.
- `docs/adr/0002-checkpoint-article-review-activities.md`, `Decision` and `Evidence`. The ADR was read from the primary checkout because it is not present in the integration branch. Its authority note identifies owner answers Q1 through Q11 and Q16 through Q32. `planning.md` remains implementation authority.
- `planning.md`, packet `ARTICLE-HARDENING-002`. The packet permits automation-code investigation and synthetic tests only. This investigation changed no product code and ran no real article, model, database, release, deployment or publication operation.

The isolated branch started at integration commit `32204bd7c4c795e8a985e2657189862235f88378`. Commit `f026bca8b53aecca829262e9a27820ac6d078892` is an ancestor. `src/` and `tests/` have no diff between that product revision and the integration head, so the runtime observations apply to the requested product code.

## Test seam and method

The public seam was `executePendingImport(root, importId, createSupervisedImportExecutor(root))`. Each scenario used a new synthetic repository and the controller's persisted import record, work packet and result path. The test supplied isolated editorial, image, rendering and review fixtures. It did not call a worker or external adapter.

The red command asserted the required continuity rule:

```powershell
$nodeVersion = node --version
if ($nodeVersion -notmatch '^v24\.') { throw "Node 24 is required; found $nodeVersion" }
node --import tsx docs/designs/recovery-evidence/99/controller-repair-probe.ts --assert-required
```

It exited 1 with:

```text
AssertionError: a passing replacement that omits the finding must not close it
```

Observation mode ran six controlled cases and wrote `observations.json`:

```powershell
$nodeVersion = node --version
if ($nodeVersion -notmatch '^v24\.') { throw "Node 24 is required; found $nodeVersion" }
node --import tsx docs/designs/recovery-evidence/99/controller-repair-probe.ts
```

Each command prints a unique `.scratch/recovery-evidence-runs/99-*/observations.json` path. The rerun record distinguishes `testedCheckoutRevision` from `investigatedRevision`. The tracked observation and red-output files remain immutable historical snapshots.

Both commands used Node 24.22.3. The first command is supposed to fail. The second is supposed to pass.

## Acceptance criteria

| Ticket criterion | Expected | Observed |
| --- | --- | --- |
| Rejection followed by a passing review that omits it | Keep the original obligation open. Track finding identity, reviewer, criterion, revision and observation across both selections. | The failing review blocked. The passing omission advanced to `RELEASING`. Execution evidence retained reviewer session, criterion, artifact fingerprint, rendering digest and observation text. Neither review carried a finding identity, and no record linked the selections. |
| Repair dispatch and approval survival | Dispatch the finding, owning activity, input to change and expected check. Reject unchanged input. Preserve only independent approvals. | Unchanged input failed with `UNCHANGED_SUBMISSION`. The repair continuation said only `Repair validating output.` and named `VALIDATING`. It did not name the finding, input or check. The controller reused the existing packet identity. Content, research, assessment and editorial approvals survived every replacement. |
| Verified repair, removal, dismissal and inconclusive review | Compare original evidence with fresh observations of a changed revision and directly affected regressions. Close only through an evidenced resolution. | A bare `resolved` label advanced on the same artifact and rendering revision. Typed `appropriate-removal` and `evidenced-dismissal` records failed schema validation because `resolution` is not allowed. An inconclusive review remained in `VALIDATING`. No finding-specific regression list or resolution evidence exists in the contract. |
| Disputed interpretation or removal of required capability | Refer the dispute to the owner and keep the finding open pending adjudication. | Adding `ownerReferral` failed strict schema validation. The run stayed in `VALIDATING` as a generic repair. No owner queue, adjudication state or finding link was recorded. |

## Scenario results

| Replacement | Stage after normal resume | Direct evidence |
| --- | --- | --- |
| Passing review omits original finding | `RELEASING` | Original execution remained readable; replacement had no finding; artifact and rendering fingerprints were unchanged. |
| Passing review marks matching text `resolved` | `RELEASING` | No finding ID, changed revision, resolution evidence or affected-regression record was required. |
| `insufficient-evidence` with unresolved observation | `VALIDATING` | `PRESENTATION_DESIGN_REVIEW_VERDICT_NOT_PASS`; generic repair continuation retained. |
| Typed appropriate removal | `VALIDATING` | Strict review schema rejected the unrecognized `resolution` field. |
| Typed evidenced dismissal | `VALIDATING` | Strict review schema rejected the unrecognized `resolution` field before evidence could be checked. |
| Owner referral for disputed requirement | `VALIDATING` | Strict review schema rejected the unrecognized `ownerReferral` field. No referral was recorded. |

## Direct source evidence

- `src/lib/article-import/workflow-evidence.ts:21-31` permits only rule, artifact fingerprint, routes, rendering references, verdict, findings with description/disposition, and notes. The schema is strict.
- `src/lib/article-import/workflow-evidence.ts:610-612` validates only the selected review. A pass with no unresolved finding succeeds. It does not consult earlier rejected reviews.
- `src/lib/article-import/contracts.ts:147-156` defines the repair continuation. It has stage, failure and submission fingerprints, diagnosis flag, generic required change, packet key and source fingerprint. It has no finding or resolution field.
- `src/lib/article-import/engine.ts:405-415` blocks an unchanged submission and checks diagnosis bindings after the third stage failure. It does not select or reconcile findings.
- `src/lib/article-import/engine.ts:458-489` increments repair totals and writes a generic repair continuation. Only the special hero-rejection path retains typed rejected inputs.
- `src/lib/article-import/supervised-executor.ts:207-250` embeds the full current record in the ordinary stage packet and consumes the selected result. It does not create a distinct finding-bound repair packet.

## Unreachable cases

Verified repair, appropriate removal, evidenced dismissal and owner adjudication cannot be represented through the current presentation-review and import-state schemas. The probe attempted each record through the normal controller. Strict parsing rejected the extra resolution or referral data. A bare `resolved` disposition is representable, but it is not an evidenced resolution and has no link to the original finding.

The probe did not manufacture a changed product revision. Both advancing cases kept the same artifact and rendering fingerprints, which is the defect under test. A future authorized implementation needs a finding identity, repair input binding, fresh-review revision, directly affected regression evidence and resolution type before these cases can receive positive acceptance tests.

## Files

- `controller-repair-probe.ts` is the repeatable synthetic probe.
- `red-output.txt` is the expected failing continuity assertion.
- `observations.json` contains the complete expected-versus-observed receipts for all six cases.

## Limits

- Synthetic fixtures prove controller behavior, not reviewer effectiveness.
- Reviewer identity is the retained execution context and session. The current review payload has no explicit reviewer field.
- The probe did not test a real CTA, browser interaction, model judgment or historical WebCatalog review.
- No product fix, real operation, remote write, merge, deployment or publication occurred.
