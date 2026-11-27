# Article recovery 121 verification

## Authority and boundary

- Planning authority: `planning.md`, heading `Article recovery remediation (ARTICLE-RECOVERY-1127)`, slice 11.
- Ticket authority: GitHub issue #121, `Bound cleanup retries across restarts`.
- Investigation baseline: issues #96 and #106.
- Starting revision: `3794c3d72cf1ba7bd5f0011170c98d6928a342ce`, the #120 cleanup-operation implementation.
- Test boundary: temporary fixture roots under `.scratch/article-cleanup-recovery`. No real article, worker, canonical registry, cleanup, deployment, or publication ran.

## Before

The first focused run failed the three new acceptance cases. The cleanup adapter was never called, and the operation had no attempt ledger or remedy binding. Seven existing cleanup-recovery cases passed in the same run.

## Implemented behavior

- Each durable `cleanup-<24 hex>` operation owns at most three automatic attempts. The ledger records admission before the controller reads the candidate, trigger, sequence, result, timestamps, and a generated failure-evidence file.
- Gate, manual, and restarted entry points reuse the same operation and count. A crash after attempt admission resumes that admitted attempt instead of adding another.
- A confirmed temporary pre-mutation failure may consume the next attempt. Attempt three records exhaustion. Later invocations stay held and do not call the cleanup adapter.
- Missing, busy, or inaccessible candidate files count as temporary pre-mutation failures. Hash or path-integrity failures stop on the first attempt as shared failures. Errors after a verified pre-mutation check are uncertain outcomes and stay held until reconciliation.
- The manual `--cleanup-remedy <import-id> --file <path>` command accepts only an import-scoped, hash-verified `ImportGateCleanupRemedyV1` artifact. The artifact must name the operation, the exact failure evidence, and the matching recovery kind. The controller then reruns the filesystem and hash checks. It does not trust an assertion in the artifact.
- Cleanup attempts do not change article repair totals or strategy attempts. Different cleanup operation IDs keep independent ledgers.

## Synthetic proof at the implementation checkpoint

- RED: `node --import tsx --test tests/article-import-cleanup-recovery.test.ts` reported 7 passed and 3 failed before implementation.
- GREEN: the same focused file reported 11 passed and 0 failed after implementation, including the durable attempt-admission crash case, actual missing-file exhaustion, shared hash failure, uncertain archive reconciliation, and remedy submission through the normal command controller.
- Directly affected regression files `tests/article-import-gate-handoff.test.ts`, `tests/article-import-dispatch.test.ts`, and `tests/article-import.test.ts` reported 54 passed and 0 failed.
- `npm run typecheck` passed.

## Final integrated proof

- Merged corrected #120 cleanup behavior and final integration head `3192e4ee9dd87d9b64946a5022099f86f8a82e42` before the final checks.
- The directly affected cleanup, handoff, dispatch, and core import files reported 74 passed and 0 failed.
- `npm run verify:agent-workflow` passed.
- `npm run typecheck` passed.
- `npm run lint` passed with 19 pre-existing warnings and no errors.
- Independent synthetic review reproduced corrupt failure-receipt bytes, a corrupt registered archive, a registry outage before removal, and a missing work directory. The corrected controller rejected or held all four cases. Failure receipts now use the separate import-scoped cleanup-failure directory.

The host uses Node 26.13.0 and npm 11.20.0. `package.json` requires Node 24.x and npm 12.x. `npm ci` completed with the expected engine warning.

`node scripts/code-intelligence/update-local.ts` could not acquire exact-build admission while another codebase-memory operation was active. No graph export changed. Direct source inspection, the focused controller tests, and the required repository gates cover this branch.
