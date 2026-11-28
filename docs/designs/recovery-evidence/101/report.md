# Issue 101 late-result investigation

## Result

The controller at `f026bca8b53aecca829262e9a27820ac6d078892` does not implement the late-result selection model accepted in issue #96 and requested by issue #101. Interrupted work reuses its packet identity, which is expected. Intentional repair also reuses that identity. The record and work packet have no replacement attempt ID, predecessor link, selected-candidate provenance, or reconciliation decision.

The lease protocol does fence recovery correctly in the tested process-exit case. Recovery failed while the synthetic owner process remained alive. It succeeded after that process exited, retained the old claim in the journal, and issued a different owner token.

No product code, live article, database, external worker, release, deployment, or publication was changed or invoked.

## Authority and scope

- User directive: investigate GitHub issue #101 against the parent specification in issue #96. Synthetic testing is allowed. Product fixes and live operations are not.
- Accepted design: ADR-0002, Q47 assigns late-output selection to the TypeScript controller. A superseded result stays historical unless the controller reconciles it against current inputs, open findings, and the replacement attempt, then records its decision. Reuse keeps the original execution identity and still requires validation and independent review.
- Investigated code: the isolated branch contains no `src`, `tests`, or `scripts` diff from `f026bca8b53aecca829262e9a27820ac6d078892`.
- Test seam: `executePendingImport`, the normal controller entry point. `invokeWorker` and the workflow lease are system boundaries. Tests use isolated filesystem fixtures only.

## Observed evidence

| Case | Observation |
| --- | --- |
| Interrupted execution | A second controller call reused the same idempotency key, work path, result path, and attempt value. Each call had a different lease owner token. |
| Intentional repair | Correcting a rejected plan reused the same idempotency key and attempt value. The packet contained neither an attempt ID nor a predecessor. |
| Relevant input change | Changing the evidence referenced by a cached invalid result changed repeat eligibility. The cached result was selected with zero new worker calls, then the validator rejected it. |
| Unrelated historical change | Adding an unrelated historical `.result.json` also changed repeat eligibility. The same cached current result was selected with zero new worker calls, then the validator rejected it. |
| Open finding | An earlier synthetic independent review failed with an unresolved finding. Switching the selected presentation reference to a separate synthetic passing review let the controller advance while retaining the earlier rejection bytes and without an explicit finding resolution. |
| Owner exit | Recovery was rejected while the lease owner process was alive. After verified process exit, recovery succeeded and a replacement owner received a new token. The probe read the journal and verified that both the prior unreleased claim and its later recovery-release entry retained the original owner token in generation order. |

The evidence for exact tokens, call counts, validator output, and retained findings is in `observations.json`. `test-output.txt` records the four passing probe cases.

## Unreachable scenarios

The exact issue #101 race, where attempt A finishes after intentional replacement B becomes active, is not representable in current controller state. There is no B identity, no predecessor relation, and no candidate-selection record. Both attempts would address the same result path and binding.

A cooperative late worker also cannot remain alive through lease recovery. `recoverWorkflowLease` requires both the former controller and its worker to have exited. `invokeWorker` checks the old lease again before saving output. This is useful fencing, but it means the requested late-arrival design needs an explicit retained result/candidate protocol before the active-replacement scenario can be exercised honestly.

The open-finding probe therefore performs the strongest current-code observation available. It supplies a separate retained review, switches the selected evidence reference, and drives the controller normally. It does not claim that the controller automatically reconciled late output or that a replacement was active.

## Expected behavior not observed

Issue #101 and Q47 require a new intentional-repair identity linked to the rejected attempt, original provenance for late output, reconciliation against changed inputs and open findings, and a recorded reuse or exclusion reason. Reused output must then pass applicable validation and independent review.

Current behavior has only the last part. Cached output is still validated and can fail. The other selection records do not exist.

## Future acceptance checks

After an authorized implementation adds attempt and candidate state, rerun these checks through the same controller seam:

1. Interrupt attempt A, resume it, and confirm identity is inherited only for the interruption case.
2. Start intentional repair B with a new identity and predecessor A after verified owner exit.
3. Deliver A while B is active. Confirm A remains historical by default and cannot overwrite B.
4. Exercise relevant input, unrelated historical-file, and open-finding variants. Assert the recorded selection reason, original provenance, worker calls, validation, and independent review separately.
5. Reuse A only through explicit reconciliation, then prove that validation or independent review can still reject it.

## Reproduction

From the isolated checkout:

```text
node --import tsx --test docs/designs/recovery-evidence/101/late-result-probe.test.ts
```

Expected result: four tests pass. The probe prints a unique `.scratch/recovery-evidence-runs/101-*/observations.json` path and deletes only its owned `.scratch/recovery-evidence-101/case-*` directories. The rerun record distinguishes `testedCheckoutRevision` from `investigatedRevision`; it does not rewrite the tracked historical observation.
