# Pre-publication repair and post-publication IMPROVE, issue #104

## Outcome

The current controller keeps the two cases separate.

A required acceptance failure in `RELEASING` stayed in pre-publication repair. The controller retained the pending release journal, created no release receipt, terminal proof, or IMPROVE assignment, and preserved the preceding stage-receipt history. It recorded `RELEASING` as the repair stage and `Repair releasing output.` as the next work. It did not record an explicit repair owner.

A defect introduced after verified publication went through the LIVE record's IMPROVE assignment. The synthetic resolution retained the original failing measurement, the changed revision and passing measurement, an affected route regression check, and an independent review receipt. The controller kept the original release receipt, terminal reference, terminal bytes, run snapshot bytes, and stage-receipt history unchanged.

## Authority and scope

- GitHub issue [#104](https://github.com/michaelchamboko/VettedSaaSBlueprint/issues/104), acceptance criteria and investigation-only scope.
- Parent issue [#96](https://github.com/michaelchamboko/VettedSaaSBlueprint/issues/96), User Story 17 and Testing Decisions 1 and 9.
- `docs/adr/0003-unify-publication-approval-and-reconciliation.md`, `Decision`. It says required acceptance failures remain pre-publication repair and post-publication defects use IMPROVE without changing original acceptance history.
- `planning.md`, packet `ARTICLE-HARDENING-002`. The packet permits synthetic automation investigation but prohibits real imports, live changes, publication, merge, and deployment.

This work changed only `docs/designs/recovery-evidence/104`. It did not change product code or perform a live operation.

The isolated branch started at integration commit `d3d49f4c132d5d6b2c597df10d189d1564d89a4d`. Investigated revision `f026bca8b53aecca829262e9a27820ac6d078892` is an ancestor, and `src/` and `tests/` have no diff between that revision and the starting integration commit.

## Test seam and method

The public seam was `executePendingImport(root, importId, executor, { improveExecutor })`. Each case used a separate temporary repository and the controller's normal persisted import record.

The pre-publication case built a synthetic approved and presented article, retained a pending release journal, and made the normal `RELEASING` executor throw a required acceptance failure. The probe then inspected the saved record.

The post-publication case built a second synthetic article through `verifyImportRelease`. Its IMPROVE executor recorded two findings. The first established a route-control measurement that the later CTA repair had to rerun. The second stored the CTA defect's failing measurement at the publication commit, its passing measurement at the changed revision, the route-control regression result, and independent review evidence. All release operations were fixture data.

The code graph available to this session covered another worktree at commit `6383cf88419deae666c9aca74fe83379926c797d`, not this branch. I used it only to locate the IMPROVE symbols, then verified every cited behavior in this worktree's source.

## Red and observation runs

The red command asserted the missing explicit-owner requirement:

```powershell
$env:RECOVERY_ASSERT_REQUIRED='1'
node --import tsx --test docs/designs/recovery-evidence/104/recovery-boundary-probe.test.ts
```

It exited 1 because the repair continuation has no `repairOwner` field. The post-publication test passed in the same run. `red-output.txt` retains the result.

Observation mode records current behavior and writes `observations.json`:

```powershell
node --import tsx --test docs/designs/recovery-evidence/104/recovery-boundary-probe.test.ts
```

It exited 0 with two passing tests. `test-output.txt` retains the summary.

## Expected and observed behavior

| Case | Expected | Observed |
| --- | --- | --- |
| Acceptance failure before verified publication | Route the failure to its owning activity, name the next work, retain release state, and do not create IMPROVE history. | The controller saved a `repair` continuation for `RELEASING`, set `requiredChange` to `Repair releasing output.`, retained `pendingRelease`, and created no `release`, `terminalRef`, or `improve`. The stage is the only owner field. |
| Defect after verified publication | Use IMPROVE, retain the original measurement, changed revision, passing after measurement and affected regressions, and keep original acceptance history readable. | The controller stayed `LIVE` and completed the existing IMPROVE assignment. The checklist linked occurrence and resolution to the publication key. The resolution retained base commit `bbbb...`, changed commit `dddd...`, the passing after measurement, and the `published-route-control` regression check. Original release and acceptance evidence stayed byte-for-byte unchanged. |

## Before and after evidence

| Evidence | Before | After |
| --- | --- | --- |
| CTA destination measurement | Failing receipt at publication commit `bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb` | Passing receipt at changed revision `dddddddddddddddddddddddddddddddddddddddd` |
| Directly affected route control | A prior passing route-control resolution existed at `cccccccccccccccccccccccccccccccccccccccc` | A fresh passing `published-route-control` receipt was required at `dddddddddddddddddddddddddddddddddddddddd` |
| Publication stage | `LIVE` | `LIVE` |
| Release receipt and terminal reference | Bound to the verified publication | Deep-equal after IMPROVE |
| Terminal and IMPROVE run-snapshot bytes | Captured before the later defect resolution | Byte-for-byte equal after resolution |
| Stage-receipt history | Captured before IMPROVE execution | Deep-equal after resolution |

`observations.json` records the stable controller outcomes, publication linkage, revisions and regression keys. The probe verifies the generated evidence paths and hashes at runtime.

## Direct source evidence

- `src/lib/article-import/engine.ts:375-400` sends LIVE records with a pending assignment to the IMPROVE executor and rejects a result that changes the publication stage, terminal reference, release commit, or completion continuation.
- `src/lib/article-import/engine.ts:458-506` turns ordinary stage failures into repair continuations. The continuation records a stage and generic required change, but no explicit owner.
- `src/lib/article-import/engine.ts:765-813` freezes verified publication evidence and creates the first IMPROVE assignment only after production verification.
- `src/lib/article-import/contracts.ts:124-149` defines the publication-bound IMPROVE record.
- `src/lib/article-import/contracts.ts:151-158` defines repair continuation fields. `repairOwner` is absent.
- `src/lib/article-import/improve-checklist.ts:51-89` binds findings to a publication and retained evidence.
- `src/lib/article-import/improve-checklist.ts:96-108` retains measurement receipts by issue, commit and outcome.
- `src/lib/article-import/improve-checklist.ts:111-144` requires before and after checks, merged-review evidence and applicable prior regression checks before resolving a finding.

## Gap and limits

The controller distinguishes pre-publication repair from post-publication IMPROVE. The remaining #104 gap is narrower: pre-publication repair ownership is implicit in `continuation.stage`, and its next work is generic. The current record cannot state a named repair owner beyond the stage or describe the failed acceptance obligation in the required-change field.

The IMPROVE test uses synthetic evidence and fixture review responses. It proves controller selection, persistence, measurement binding, regression enforcement and history immutability. It does not prove a real reviewer found the defect, a real PR merged, a real deployment changed, or a public page was corrected.
