# Article recovery 120 verification

## Authority and boundary

- Planning authority: `planning.md`, heading `Article recovery remediation (ARTICLE-RECOVERY-1127)`, slice 10.
- Ticket authority: GitHub issue #120, `Recover interrupted archive and disposal operations`.
- Investigation baseline: issues #105 and #106, reconciled in issue #109 at commit `bebb4fe644b3d97e9a21f46a6e06938ed35684cb`.
- Starting revision: `56c524a8cafc1e16842a4894c005aeefd48c1b8e` on `codex/article-recovery-integration`.
- Test boundary: temporary fixture roots under `.scratch/article-cleanup-recovery`. No real article, canonical database, worker, deployment, publication, or production cleanup ran.

## Before

The first focused test failed before the product schema accepted a typed cleanup candidate. `ExternalArticleImportV2.gateHandoffs[0].disposalCandidates[0]` required the old path-only marker and rejected `reference` and `kind`. The controller had no durable archive operation to restart.

## Implemented behavior

- Normal gate declarations classify readable work and result files from superseded activity or research-plan attempts. Unknown files remain unclassified.
- Manual `--cleanup` and gate cleanup use the same persisted `cleanup-<24 hex>` operation. The operation records intent before mutation, a verified archive reference before original removal, and final dispositions with reasons.
- Restart reconciliation covers intent-only, archive-copied, archive-registered, and original-removed boundaries. A newly registered dependency restores the verified original from its archive when restart finds it missing. Hash disagreement or an unavailable canonical register persists a held operation.
- Cleanup checks current record references and every canonical review-register retention dependency across all import owners. The check runs again at expiry and immediately before each removal.
- Only atomic-write temporary files with a byte-identical durable target are classified as verified temporary. Redundancy is reverified immediately before removal, including through a registered archive alias when the target is itself superseded. Superseded drafts and captures move to an import-scoped archive for 30 days. Age never runs cleanup by itself.
- Later stages continue selecting older handoffs whose retained archives reach expiry. Retain-only handoffs and recovered registry outages transition back to verified instead of holding dispatch indefinitely.
- Candidate reads, archive writes, and removals are limited to `.automation/article-imports/work/<importId>/` and `.automation/article-imports/archive/<importId>/`.

The cleanup operation ID is trigger-independent and survives restart. Issue #121 can bind its per-operation retry counter to that ID without using article strategy or repair totals. This slice does not add cleanup retry accounting.

## Synthetic proof

`tests/article-import-cleanup-recovery.test.ts` proves:

1. all four crash boundaries resume the same operation and dispatch no worker until cleanup is verified;
2. manual and gate triggers produce the same dispositions while preserving article strategy attempts and repair totals;
3. verified temporary disposal, 30-day retention, canonical-only dependency claims at expiry, and later eligible removal;
4. mismatched archive bytes preserve both copies and hold dispatch;
5. active work, rejected evidence, resolutions, diagnosis, registered evidence, rollback, IMPROVE, and publication proof remain readable;
6. cross-import registrations protect candidates and a normal retain-only handoff releases the next worker;
7. later-stage gate execution expires an older handoff archive;
8. the normal producer emits only byte-identical atomic temporaries, rechecks their durable target, and safely handles a superseded target plus its temporary;
9. distinct same-byte candidates retain distinct archive dispositions.

## Verification

- `npx tsx --test tests/article-import-cleanup-recovery.test.ts`: 16 passed, 0 failed.
- `node --import tsx --test tests/article-import-dispatch.test.ts`: 20 passed, 0 failed.
- `npx tsx --test tests/article-import-cleanup-recovery.test.ts tests/article-import.test.ts`: 46 passed, 0 failed.
- Focused supervised CLI regression: 1 passed, 0 failed.
- `npm run verify:agent-workflow`: passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed. The run reported 16 pre-existing warnings; the two warnings in ticket-owned files were then removed.

The fresh worktree initially lacked local dependencies. `npm ci` succeeded after network approval. The host exposes Node 26.13.0 and npm 11.20.0, while `package.json` requires Node 24.x and npm 12.x. Focused tests and required gates passed on the available host runtime; the runtime-version mismatch remains an environment limitation.

An attempted repository-wide `npm test` was stopped after the coordinator requested focused acceptance only. It is not claimed as a passing check.

A combined directly affected registry/dispatch run passed 34 tests and failed the existing supervised registry case `the supervised controller registers and reuses an independently reviewed editorial approval`: its fixture supplied an invalid `issuingLeaseOwnerToken` UUID before cleanup or retention code ran. Cleanup/handoff tests in that run passed; this unrelated fixture failure is not claimed as fixed.

`node scripts/code-intelligence/update-local.ts` could not acquire exact-build admission while another codebase-memory operation was active. No graph export changed or entered this patch. Direct source inspection, the focused tests, and the required repository gates cover this branch.
