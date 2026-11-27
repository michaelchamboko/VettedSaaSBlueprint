# Issue 119 gate handoff verification

Date: 27 November 2026

## Authority and baseline

- User directive: GitHub issue #119, "Verify the next worker's handoff after each passed gate".
- Planning authority: `planning.md`, packet `ARTICLE-RECOVERY-1127`, slice 9.
- Investigation baseline: issue #105 at commit `05fe30e`, reconciled by issue #109 at commit `bebb4fe`.
- Implementation baseline: `codex/article-recovery-integration` at `e7d670f`, including the issue #112 activity checkpoint work from `e1dc602` through merge `26965ab`.
- Scope: synthetic fixtures only. No real article, worker, database, cleanup, deployment, or publication operation ran.

## Implemented behavior

`ImportGateHandoffV1` records the passed gate, next stage, accepted outputs, required inputs, retained evidence, disposal candidates, unclassified material, constraints, and cleanup status. The controller creates one declaration at every existing gate boundary from INGESTING through VERIFYING.

Before packet creation, the supervised executor verifies every required reference and refuses dispatch while an input is unreadable or cleanup is pending. The dispatch controller repeats the reference check after packet creation and before worker invocation. The packet binds its source path to the verified immutable source reference. Unclassified files remain hash-addressable and visible in the declaration.

The ownership-race fixture now uses an isolated review registry and actual issue #112 VALIDATING activity receipts. It carries the issue #119 REFINING-to-VALIDATING handoff into both race directions without a Neon connection.

## TDD evidence

The first focused run failed all new cases because no handoff declaration or dispatch barrier existed:

```text
npx tsx --test tests/article-import-gate-handoff.test.ts
tests 2, pass 0, fail 2
```

The packet-to-dispatch race test then failed with one worker call after the required bytes changed. After adding the second verification point, the final focused handoff run passed:

```text
npx tsx --test tests/article-import-gate-handoff.test.ts
tests 4, pass 4, fail 0
```

The combined activity, handoff, and review-registry run passed:

```text
npx tsx --test tests/article-import-gate-handoff.test.ts tests/article-import-activity-recovery.test.ts tests/article-review-evidence-registry.test.ts
tests 13, pass 13, fail 0
```

With `DATABASE_URL` cleared, both ownership race directions passed:

```text
node --import tsx --test --test-name-pattern "one presentation transition when" tests/article-mutation-ownership.test.ts
tests 2, pass 2, fail 0
```

The integrated supervised controller regression run also passed before the final fixture-only ownership update:

```text
npx tsx --test tests/article-import-gate-handoff.test.ts tests/article-import-activity-recovery.test.ts tests/article-import-supervised.test.ts
tests 19, pass 19, fail 0
```

## Repository gates

- `npm run verify:agent-workflow`: passed.
- `npm run lint`: passed with 16 existing warnings and no errors.
- `npm run typecheck`: passed.
- `git diff --check`: passed.

The code-intelligence graph was available only at the issue #105 investigation checkout, so graph results served as navigation rather than current proof. Direct source inspection covered every changed caller. Both `scripts/code-intelligence/load.ts` and `update-local.ts` were attempted, but the local CLI rejected indexing while another codebase-memory operation held exact-build admission. Neither attempt changed repository files.

The full test suite and public-site build were not run. Repository policy limits correction testing to the changed behavior and directly affected callers, and this change does not alter the public UI or generated public content.
