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

- Each durable `cleanup-<24 hex>` operation owns at most three automatic attempts. The ledger records admission before the pre-mutation check, trigger, sequence, result, timestamps, and failure evidence.
- Gate, manual, and restarted entry points reuse the same operation and count. A crash after attempt admission resumes that admitted attempt instead of adding another.
- A confirmed temporary pre-mutation failure may consume the next attempt. Attempt three records exhaustion. Later invocations stay held and do not call the cleanup adapter.
- Shared failures stop on the first attempt. Uncertain mutation outcomes stay held until reconciliation. Neither path mutates the candidate while held.
- A held operation can continue only with a readable, hash-verified `ImportGateCleanupRemedyV1` artifact. The artifact must name the operation, the exact failure evidence, and the matching recovery kind.
- Cleanup attempts do not change article repair totals or strategy attempts. Different cleanup operation IDs keep independent ledgers.

## Synthetic proof at the implementation checkpoint

- RED: `node --import tsx --test tests/article-import-cleanup-recovery.test.ts` reported 7 passed and 3 failed before implementation.
- GREEN: the same focused file reported 11 passed and 0 failed after implementation, including the durable attempt-admission crash case.
- Directly affected regression files `tests/article-import-gate-handoff.test.ts`, `tests/article-import-dispatch.test.ts`, and `tests/article-import.test.ts` reported 54 passed and 0 failed.
- `npm run typecheck` passed.

The host uses Node 26.13.0 and npm 11.20.0. `package.json` requires Node 24.x and npm 12.x. `npm ci` completed with the expected engine warning. Final required gates and the corrected #120 integration merge remain to be recorded against the final head.
