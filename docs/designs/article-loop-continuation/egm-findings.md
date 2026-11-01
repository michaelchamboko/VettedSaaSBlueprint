# EGM findings recorded for execution

- Continuation must use an explicit discriminated contract and fixed classifier precedence so legacy records remain readable.
- Waits need persisted deadlines, observable progress timestamps, and lease release between checks; the two-hour timeout is measured from first dependency recording.
- Repair fingerprints must exclude timestamps, receipts, leases, and counters; unchanged failed submissions cannot consume retries, and the third changed failure requires a diagnosis receipt.
- Remote effects require deterministic operation records and exact-commit reconciliation. A changed PR head invalidates its review; uncertain or duplicate deployments are shared blockers.
- Acceptance must include a real non-terminal fixed-snapshot canary with a restart, not only synthetic unit tests or an already-terminal production article.
- The zero-intervention claim is scoped to the exercised scenarios; owner decisions and missing shared capabilities remain durable blockers.
