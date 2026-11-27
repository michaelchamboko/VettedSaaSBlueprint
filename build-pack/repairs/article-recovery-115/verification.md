# Article recovery 115 verification

## Authority and boundary

- Planning authority: `planning.md`, heading `Article recovery remediation (ARTICLE-RECOVERY-1127)`, slice 5.
- Ticket authority: GitHub issue #115, acceptance criteria.
- Investigation baseline: GitHub issue #100 evidence at commit `bebb4fe644b3d97e9a21f46a6e06938ed35684cb`.
- Test boundary: isolated synthetic articles driven through `executePendingImport`. The tests did not read or change a real article, call a worker model, contact a deployment provider, or publish content.

## Before

The issue #100 probe found four gaps at product revision `f026bca8b53aecca829262e9a27820ac6d078892`:

- Equivalent shared-capability and uncertain-external failures took different routes when their messages changed.
- `DiagnosisV1` rejected predicted-observation and disproof-check fields.
- One evidence record could serve as both failed-recovery evidence and remedy evidence.
- Threshold, viewport and article edits changed one generic fingerprint without recording the kind of change or an independent measurement check.

The first ticket #115 test run reproduced the missing contract. Three new controller tests failed because the category, falsifiable-diagnosis fields, remedy check and repair-change record did not exist.

## After

The focused synthetic controller run passed 37 tests across:

- `tests/article-import-recovery.test.ts`
- `tests/article-state-hardening.test.ts`
- `tests/article-transforming-reconciliation.test.ts`

Observed results:

- Two message variants in each of the four failure categories produced the same category-specific action. Demonstrated shared capability and uncertain external failures stopped before a second executor call.
- Three unsuccessful `RESEARCHING` repairs accumulated across changed findings, worker labels, session labels and persisted reloads. The fourth executor call stayed at zero until a matching diagnosis had a verified remedy.
- A contradicted deterministic check did not unlock execution. A separate verified deterministic check did.
- Reusing the failed-recovery evidence as remedy evidence failed schema validation.
- A threshold change without justification and an independent verification reference failed. A separately recorded threshold change with both fields passed and remained distinct from a product repair.
- Historical diagnosis records remained readable. New diagnosis submissions must satisfy the stronger contract.

## Commands

```text
node --import tsx --test tests/article-import-recovery.test.ts tests/article-state-hardening.test.ts tests/article-transforming-reconciliation.test.ts
# 37 passed, 0 failed

rtk npm run typecheck
# passed
```

The repository-wide workflow, lint and final focused checks are recorded in the ticket handoff after the integration tip is merged into this branch.
