# Article recovery 117 verification

## Authority and boundary

- Planning authority: `planning.md`, heading `Article recovery remediation (ARTICLE-RECOVERY-1127)`, slice 7.
- Ticket authority: GitHub issue #117, acceptance criteria.
- Investigation baseline: issues #98 and #102 at commit `bebb4fe644b3d97e9a21f46a6e06938ed35684cb`, reconciled by `docs/designs/recovery-evidence/109/reconciliation.md` at that commit.
- Test boundary: synthetic articles and an isolated in-memory review registry. No real article ran. No database migration was applied. No deployment or publication occurred.

## Before

The #102 investigation recorded first-class registration for research only. Editorial judgments and browser observations had no canonical registration boundary. It also could not produce an approval that survived independently when another evidence class became stale. The #98 investigation found coarse stage-level reuse, but no activity-level retrieval for an examined revision.

The required red tests reproduced those gaps on this branch:

- The registry module did not exist, so the dimension test failed with `MODULE_NOT_FOUND`.
- The supervised controller completed a synthetic editorial result but committed zero review-evidence records.

## After

The controller now uses `ArticleReviewEvidenceRegistry` for editorial judgments and browser observations. Each registration records the examined revision, independent reviewer, applicable criteria, exact evidence reference and retention dependencies. Before reuse, the controller checks relevance, support, integrity and freshness separately, then runs the existing editorial or presentation validator again.

The normal CLI uses the Neon adapter. The migration creates `article_research.review_evidence_registrations`. Tests substitute an isolated in-memory adapter and never contact Neon. Research registry code and research recovery remain unchanged.

Observed synthetic outcomes:

- An accepted editorial result registered exact evidence and advanced to `VALIDATING`. A restart at the same examined revision reused it without another work packet.
- The integrated activity protocol completed every attributable editorial checkpoint through the normal controller before final registration; accepted checkpoints were not bypassed or repeated.
- Invalid browser evidence failed validation before registration. Valid desktop, mobile and reduced-motion observations registered and later advanced the same revision to `RELEASING` by reuse.
- Expiring only the browser record dispatched `VALIDATING` work. The editorial approval and research evidence reference survived.
- Relevance, support, integrity and freshness each failed independently while the other control values remained valid.

## Checks

- `npx --yes --package=node@24 -- node --import tsx --test --test-concurrency=1 tests/article-review-evidence-registry.test.ts tests/article-import-activity-recovery.test.ts tests/article-import-research-recovery.test.ts tests/article-research-registry.test.ts tests/article-import-recovery.test.ts`: 36 passed, 0 failed on Node 24.22.3.
- `npm run typecheck`: passed.
- `npm run lint`: passed with 16 pre-existing warnings and no warnings in ticket-owned files.
- `npm run verify:agent-workflow`: passed.
- `npm run build`: passed on Node 24.22.3 and npm 12.2.3.
- `npm run neon:migration:verify`: passed. This repository command validates the repository-intelligence migration only; it did not apply or validate the new review-evidence migration against a database.
- `node scripts/code-intelligence/update-local.ts`: blocked because another codebase-memory operation held exact-build admission. Direct source inspection and the focused regression suite supplied the verification for this branch.

## Limits

The synthetic tests prove controller behavior and storage boundaries. They do not establish historical WebCatalog approval, run a real article, apply the SQL migration, or prove a production Neon deployment. Those actions remain outside `ARTICLE-RECOVERY-1127` slice 7.
