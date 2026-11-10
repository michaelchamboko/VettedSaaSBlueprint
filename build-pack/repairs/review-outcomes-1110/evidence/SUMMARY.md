# REVIEW-OUTCOMES-1110 evidence

## Change
- `src/lib/article-import/workflow-evidence.ts`: design review now uses a single `createDesignReviewSchema` factory in validation. Verdict accepts `pass`, `fail`, or `insufficient-evidence`; finding disposition accepts `resolved` or `unresolved` (removed `justified-exception` from this design-review contract). Advancement requires verdict `pass` with all findings `resolved`; otherwise throws `PRESENTATION_DESIGN_REVIEW_VERDICT_NOT_PASS` or `PRESENTATION_DESIGN_REVIEW_UNRESOLVED_FINDING`.
- `src/lib/article-import/workflow-requirements.ts`: VALIDATING instruction now references the authoritative tracked design-judgment contract and states that it supersedes historical forced-pass prompts.
- `.agents/skills/external-article-import/references/design-judgment.md`: new tracked reference.
- `.agents/skills/external-article-import/SKILL.md`: design review contract note.
- `planning.md`, `build-pack/execution-state.json`: registered REVIEW-OUTCOMES-1110.

## Tests
- `tests/article-workflow-evidence.test.ts`: 22 tests pass.
- `tests/article-content-approval.test.ts`: 10 tests pass.
- New coverage: direct schema accepts fail/insufficient-evidence/pass-resolved and rejects malformed verdict; evaluateWorkflowEvidence through `RELEASING` rejects fail, insufficient-evidence, and pass/unresolved; advanceImport leaves persisted state and inventory unchanged on rejection; positive presented fixture evaluates through releasing.

## Verification
- Typecheck: pass (`tsc --noEmit`, exit 0).
- Focused tests: 32/32 pass.
- Before/after logs retained:
  - `build-pack/repairs/review-outcomes-1110/evidence/before-workflow-evidence.log` (old module: generic enum rejection and missing export failure).
  - `build-pack/repairs/review-outcomes-1110/evidence/after-workflow-evidence.log` (fixed module: 22/22 pass).

## Residual risks
- Error-message regex compatibility depends on the exact diagnostic strings retained above.
- No real article execution was performed; the real article run remains paused.