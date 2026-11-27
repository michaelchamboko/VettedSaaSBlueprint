# Issue #118 verification

## Scope

This change implements slice 8 of `ARTICLE-RECOVERY-1127` for GitHub issue #118. It uses only synthetic records, isolated files, in-memory registry adapters, and a loopback Next server. It did not import, deploy, publish, or alter a real article.

The implementation started from `codex/article-recovery-integration` at `67ec474a1ce07fa00f77f11354806e20dd92c029`. Both prerequisite branches were ancestors of that revision:

- #111: `codex/recovery-111` at `cf0012f0b8d0795e9717ca427bc8bad4ce41ed2e`
- #117: `codex/recovery-117` at `67ec474a1ce07fa00f77f11354806e20dd92c029`

## Evidence sources

- Planning authority: `planning.md`, "Article recovery remediation (ARTICLE-RECOVERY-1127)", slice 8.
- Design direction: `docs/adr/0003-unify-publication-approval-and-reconciliation.md`, "Decision".
- Historical investigation: revision `bebb4fe644b3d97e9a21f46a6e06938ed35684cb`, `docs/designs/recovery-evidence/102`, `103`, `104`, and `109`.
- Domain vocabulary: root `GLOSSARY.md`, "Publication approval", "Publication requiring reconciliation", and "Post-publication improvement".

## TDD evidence

The first public-seam test failed before `verifyImportRelease` wrote publication approval into the terminal record. The observed assertion was `actual undefined` for the expected catalogue approval identity. After integration, the same focused test passed for both catalogue and import paths.

The IMPROVE mutation test then failed with `Missing expected rejection`. The controller allowed a later IMPROVE result to replace the registered publication identity. After the guard was added, the same test rejected the mutation with `IMPROVE_MUTATED_PUBLICATION` and retained the terminal bytes.

The evidence-aware release bypass test also failed with `Missing expected rejection` when the review registry was omitted. After the fail-closed guard was added, the same fixture rejected the release with `PUBLICATION_APPROVAL_REGISTRY_REQUIRED`; supplying the isolated registry then completed both approval paths.

Independent integration review found that direct-review catalogue approval still returned early and that the first impact helper had no production caller. The direct-review authority regression first failed with `Missing expected rejection` for an absent catalogue. The replacement authority resolver now requires the manifest-selected artifact and receipt, binds their reviewed commit, retains all three references, and rejects both missing catalogue state and a wrong reviewed head. The test-only impact helper was removed; presentation reuse now validates a format-specific serving dependency set through the production workflow.

## Runtime observations

The loopback HTTP test started the repository's Next server in a disposable checkout and requested two synthetic blog routes. Target and control both returned 200. The target returned its catalogue title and answer summary before and after a separate mutable import record changed. The changed import title never appeared in the second response.

The follow-up loopback test used a synthetic direct-review catalogue and its actual `/landing-page-builders/[slug]` serving path. It independently changed target content, the shared renderer, shared styles, a target asset, and the catalogue loader rules. Every mutation was requested through loopback HTTP. Target-only content and asset changes left the control reusable; shared renderer, style, and rule changes invalidated presentation approval for both records. The same fixture proved missing-catalogue and wrong-reviewed-commit negatives before the positive target/control agreement.

## Negative and positive agreement checks

- A release receipt naming the wrong commit fails against retained production evidence.
- A missing production observation fails before registration.
- An expired browser approval fails before registration while the separate editorial approval remains independently resolvable.
- Positive catalogue and import agreement creates two immutable production-proof registrations that point to the same retained production observation under distinct approval identities.
- The terminal record stores both identities and checks that both references match retained production proof.
- IMPROVE cannot replace either publication identity or the frozen terminal record.

## Verification commands

- `npm run typecheck` passed. Next type generation reported the repository's existing Edge Runtime deprecation warning.
- `npm run lint` passed with 16 existing warnings outside this change and no errors.
- Focused catalogue/import publication approval passed: 1 test.
- `tests/article-publication-http.test.ts` passed both the original mutable-state isolation and the direct-review five-mutation loopback coverage.
- `tests/article-review-evidence-registry.test.ts` passed: 2 tests.
- `tests/article-production-evidence.test.ts` passed: 5 tests.
- Focused release and authority regressions passed: 5 tests.
- Focused #119 gate-handoff regression passed: 4 tests.

The required code-intelligence loader was retried twice, and the post-change local updater was attempted once. Each stopped before indexing because the installed CLI could not verify exact-build admission while another codebase-memory operation was active. Direct source inspection and the already-published graph at the required historical revision were used instead; no dependency absence was inferred from the unavailable local refresh.

The first sandboxed release regression attempt could not rename a temporary fixture file or initialize a temporary Git repository. The unchanged tests passed with permission for those isolated fixture operations. This was a test-environment restriction, not a product failure.
