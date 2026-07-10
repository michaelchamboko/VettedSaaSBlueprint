# Project Rules

## Current Build Approval

The operator approved moving from Step 1 build-pack review into Step 2 implementation on 2026-06-10.

Step 2 approval does not automatically approve Oracle infrastructure changes, schema application, wallet placement, driver installation, service restarts, package upgrades, or secrets handling. Those actions require the separate approvals described in `build-pack/19-oracle-infrastructure-review-and-guardrails.md`.

## Required Gates

- `T00` decisions must stay resolved in the build pack.
- `T01` governance files must exist before implementation expands.
- Module plans under `build-pack/module-plans/` must stay aligned with the task graph.
- `T02A` must pass a read-only Oracle connection test before `T02` schema migration.
- Schema changes must be reviewable and reversible or explicitly covered by rollback notes.
- Any page publication path must enforce disclosure, active affiliate link, claim-level proof/source records meeting threshold, destination review or audited override, compliance pass state, and owner approval.
- Any landing-page creation, rewrite, batch generation, or publication-readiness task must use `.agents/skills/landing-page-production-orchestrator` and the ordered project-local skill loop: `affiliate-page-intent-brief` -> `direct-review-page-drafter` -> `landing-page-uniqueness-review` -> `affiliate-compliance-review` -> `conversion-copy-review` -> audited owner approval; batches and repeated correction loops then require `landing-page-batch-retro` before the next batch.
- Landing-page uniqueness is a hard gate: pages that differ mainly by keyword, repeat sibling page titles/H1s/CTAs/core benefits/limitations/FAQs without a clear reason, or lack a distinct buyer decision are blocked.
- Compliance and conversion QA are hard gates before publish-readiness. Unsafe claims, missing disclosure, unknown program rules, weak evidence, generic hero copy, or copied limitations/FAQs block the page.
- Generated landing-page artifacts must be checked with the uniqueness, compliance, and conversion scanners before publish-readiness review.
- Generated page JSON is draft content only. It must not be treated as the source of truth for published state, owner approval, asset approval, active-link state, or compliance pass state.
- Placeholder-looking IDs, unresolved records, mismatched CTA ids without reviewed mapping, empty proof for scored evidence, and index entries built from file presence block publish-readiness.
- Each landing-page batch must complete a batch retro before the next batch starts. Recurring failures must become skill updates or explicit deferred decisions.
- AI/LLM provider integration must follow `docs/deployment/ai-provider-integration.md`: app and Hermes core code depend only on a generic LLM service interface, provider SDK/API details stay in isolated wrappers, and provider selection is injected through configuration.

## Future Editorial v2 Batch Rules

- New pages in the next-30 batch must explicitly set `metadata.design_profile` to `editorial_v2`; missing profiles remain `legacy` so existing live artifacts are not restyled.
- Editorial v2 uses scoped loaded geometric fonts, a dark monochrome palette with one solid accent, and only 8px-grid spacing values.
- Editorial v2 CTAs must use separate label/arrow flex children with `flex items-center justify-between whitespace-nowrap`, a maximum 32-character generated label, and no gradient, fixed, sticky, or floating mobile CTA.
- Editorial v2 hero copy must include a 40–60-word `hero.answer_snippet` under the H1. The compact disclosure remains before/near the first CTA; full disclosure and secondary links render in the footer.
- Benefits must be semantic decision cards and FAQs must use accessible disclosure rows; blind text pills are not allowed.
- Run `npm run scan:landing:editorial-v2 -- --json` before any next-30 page advances to subjective review. Legacy artifacts are ignored by this profile scan.
- Keep one exemplar first and cap subsequent batches at three pages until uniqueness, compliance, conversion, and owner-approval gates pass without major rework.

## Prohibited MVP Scope

- Public account creation.
- Multi-user SaaS account structures.
- Paid billing/subscription features.
- PartnerStack API automation.
- Vercel-hosted crawler workloads.
- Third-party analytics pixels.
- Unreviewed runtime React/CSS generation.
- Direct provider SDK imports or model-specific API calls in app core, Hermes job logic, route handlers, page drafting workflows, or optimization workflows.
- ChatGPT account OAuth as a backend worker credential.

## Verification Expectations

- Every task card must declare a validation location: GitHub, Vercel, Oracle, another approved runtime, or docs-only/static inspection.
- Hosted application build/typecheck validation belongs in Vercel/GitHub, not on the local workstation.
- Oracle database/Hermes validation belongs in the approved Oracle runtime after explicit approvals.
- Do not run local `npm install`, `npm ci`, `npm run build`, local dev servers, or full local typechecks unless the operator explicitly opts into local preview.
- Record known blockers in `findings.md`.
- Keep generated local artifacts out of git.
