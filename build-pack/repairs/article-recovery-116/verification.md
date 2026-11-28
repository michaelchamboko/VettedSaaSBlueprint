# Article recovery 116 verification

## Authority and boundary

- Planning authority: `planning.md`, `Article recovery remediation (ARTICLE-RECOVERY-1127)`, slice 6.
- Ticket authority: GitHub issue #116.
- Investigation baseline: issues #99 and #102, reconciled in issue #109 at commit `bebb4fe644b3d97e9a21f46a6e06938ed35684cb`.
- Test boundary: synthetic article records, ephemeral PGlite databases, and isolated filesystem fixtures. No production database, real article, deployment, or publication was touched.

## Before

Issue #113 retained rejected findings and independent reviews inside the import record. Issue #117 added the canonical register for editorial and browser evidence. The controller did not register findings or resolutions, and the SQL constraint rejected both classes. Mutable activity dependencies also meant a later artifact replacement could make the original finding graph unreadable.

The first TDD test failed because `ArticleReviewEvidenceRegistrationV1` accepted only editorial and browser records. The controller test then failed because a rejected activity wrote zero canonical registrations. A later red assertion showed that expiring a resolution still let the controller keep the finding resolved.

## After

The canonical register now accepts `rejected-finding` and `finding-resolution` alongside editorial, browser, and production proof. The actual supervised controller registers both records. It freezes the original review, changed inputs, resolution observations, and regression checks under content hashes before committing the row.

On restart, the controller checks relevance, support, integrity, and freshness. A missing row is rebuilt only from verified immutable evidence. Corrupt, stale, unsupported, or irrelevant evidence reopens the owning activity. Historical rows remain intact, including records with explicitly missing provenance, and an unrelated independently verified resolution survives invalidation of the affected one.

The SQL acceptance test starts from the #118 production-proof constraint, runs `db/article-review-evidence-v001.sql`, and commits both production proof and finding records through `NeonArticleReviewEvidenceRegistry`. This verifies the migration upgrade and query injection against a PostgreSQL-compatible engine.

## Checks

- Dedicated PGlite and controller regression: 2 passed, 0 failed.
- Post-integration focused suite covering #113, #116, #117, and #119: 19 passed, 0 failed.
- #118 public catalogue HTTP regression: 1 passed, 0 failed.
- Earlier directly affected regression run: 24 passed, 0 failed.
- `npm run verify:agent-workflow`: passed.
- `npm run lint`: passed with 16 pre-existing warnings and none in ticket-owned files.
- `npm run typecheck`: passed.
- `npx --yes --package=node@24 --package=npm@12 -- npm run build`: passed, 139 static pages generated.

## Limits

`node scripts/code-intelligence/update-local.ts` could not obtain exact-build admission because another codebase-memory operation held it. Direct source inspection and the focused tests supplied the implementation proof. The central integration owner will perform the independent current-head review. No migration was applied outside ephemeral PGlite.
