# Agent Operating Rules

This repository implements the Controlled Affiliate Intelligence Loop from `docs/VetterSaaSBlueprint_PRD.md` through the Step 2 build pack in `build-pack/`.

## Project Boundary

- Treat this as a single-operator personal marketing tool, not a public SaaS product.
- Build only owner/admin surfaces and anonymous public landing-page visitor flows.
- Do not add public signup, teams, tenants, seats, billing, roles, or third-party identity providers unless the operator changes direction.

## Step 2 Execution Order

- Follow `build-pack/11-task-graph.md`.
- Complete `T02A - Oracle Database Connectivity Readiness` before schema migration or DB-connected Hermes work.
- Do not apply database schema until the approved Oracle connection path has passed a read-only verification query.
- Keep task changes small enough to review independently.

## Oracle Guardrails

- Do not change Oracle instance shape, Always Free posture, networking, firewall, storage, packages, systemd services, or existing Hermes runtime without explicit separate approval.
- Do not modify `/michael-core/hermes` or replace the existing Hermes installation without explicit separate approval.
- Do not expose new Oracle-hosted public services.
- Do not print secrets, wallet paths, connection strings, tokens, raw environment variables, or key material in logs or chat.

## Implementation Rules

- Runtime AI may produce structured JSON only; approved code renders pages.
- AI provider integration must use a decoupled wrapper architecture: app and Hermes core logic may depend only on a generic LLM service interface, while provider SDK imports, model names, API/OAuth handling, request/response mapping, and provider-specific errors live only inside isolated provider wrappers.
- AI providers must be selected through configuration-driven dependency injection at startup or job initialization. Switching providers or models must not require app core or Hermes job logic changes.
- ChatGPT account OAuth must not be used as a backend worker credential. Backend AI calls require approved provider credentials stored through the approved secret path.
- Preserve original PartnerStack affiliate URLs and tracking parameters.
- Submitting an exact affiliate URL to `npm run landing:run -- --url <url>` authorizes the complete normal URL-to-live run, including allowlist registration, page creation, repairs, GitHub branch/PR/merge, Vercel preview/production deployment, live verification, and rollback when a real production failure occurs. No recurring owner approval is part of this path.
- Unattended publication remains limited to the exact URL recorded in root `approved-urls.md`. URL authorization never replaces evidence, disclosure, compliance, artifact-integrity, CI, preview, cap, kill-switch, or live verification gates. Omit or soften unproved high-risk public claims (pricing, discounts, guarantees, competitor/ranking conclusions) and continue whenever an honest compliant page remains possible.
- Unknown compliance state must block publication.
- Public tracking remains minimal first-party only: page view, CTA click, affiliate click, link error, and FAQ expand.
- Do not add third-party pixels, fingerprinting, raw IP storage, remarketing, newsletter capture, or profiling in MVP.

## Landing Page Production Skill Loop

- Use `.agents/skills/landing-page-production-orchestrator` for any landing-page creation, rewrite, batch generation, or publication-readiness task.
- Any repository-capable approved agent may produce new structured landing-page drafts through the documented workflow contract. Hermes supplies research, evidence, scores, recommendations, resumable state transitions, and release requests; runtime AI returns structured JSON only and approved code renders pages.
- Stage 0 is mandatory for every new page. Validate the stored catalogue and capture hashes under `docs/design-references/landing-pages/`, then select three references by default (two only when they cover at least four design dimensions). At least one reference must match or closely neighbour the product category.
- Give the selected references explicit roles for hero/typography, sections/CTA, and motion/mobile. Record their IDs, hashes, adopted abstract principles, non-copy boundaries, and selection rationale in `DesignDirectionV1`. If no exact category reference exists, select the closest eligible references or the approved repository house style and record that fallback; stop only when no approved design direction can produce a useful accessible page after the allowed repair rounds.
- Follow the required sequence: `landing-page-production-orchestrator` starts Stage 0 reference validation/selection -> `affiliate-page-intent-brief` -> `direct-review-page-drafter` -> production-identical animated preview -> visual design review -> `landing-page-uniqueness-review` -> `affiliate-compliance-review` -> `conversion-copy-review` -> `landing-page-batch-retro` -> independent unattended publish gates -> bot PR and required checks. The initial wave is one page, then three calibration pages, then at most ten pages.
- New drafts must use `reference_composed_v1` with a validated `PresentationRecipeV1`. Unsupported or missing recipe tokens are hard failures; never fall back silently to `editorial_v2`, `legacy`, or page-specific JSX/CSS/JavaScript.
- Require a passing `VisualDesignReviewV1` before uniqueness, compliance, and conversion review. The visual review must verify desktop/mobile composition, CTA wrapping and overlap, horizontal overflow, reduced motion, reference application without copied branding/content/assets, and the seven-axis presentation fingerprint.
- Require uniqueness, compliance, and conversion scanner outputs before publish-readiness review when generated artifacts exist.
- Treat uniqueness, compliance, and conversion QA as automatic repair gates. Route each failure to the affected page field, run at most two content/design repair rounds, and continue when the gate passes. A page remains ineligible for release if it is mainly a keyword swap, reuses sibling page structure without a clear reason, or lacks a distinct buyer decision after repairs.
- Treat generated page JSON as draft content only. Publish state, allowlist authorization, asset approval, active-link state, evidence state, and compliance pass state must come from audited gate records, not self-attestation inside generated artifacts.
- Block publish-readiness when page artifacts contain placeholder-looking IDs, unresolved product/link/source/evidence references, mismatched CTA ids without reviewed mapping, or evidence scores without resolvable proof.
- Run `landing-page-batch-retro` after every batch or repeated correction loop. Do not start the next batch until recurring failures are converted into skill updates or explicitly deferred.
- Build one exemplar page before broad batches. Cap batches at three pages until the skill loop passes without major rework.
- Store versioned product packs, intents, drafts, independent review reports, retro, and timings under `src/generated/landing-page-batches/<batch-id>/`. Keep review reports separate from page JSON.
- Local batch validation, deterministic packaging, focused tests, and production-identical noindex preview work are permitted. Previews must use the production editorial renderer and fixed `gsap_editorial` motion profile, suppress production analytics, and never self-attest approval or publication state.
- Oracle outages do not block the agent-led URL-to-live path. Record Oracle synchronization as `pending` and continue with the durable tracked release receipt; GitHub CI and Vercel remain the release and deployment authority. Oracle remains authoritative for Oracle-backed records when configured and may synchronize later.

## Dependency Ownership

- Vercel owns Next.js application dependencies.
- Oracle Autonomous Database owns durable data.
- Oracle Hermes owns research, evidence, scoring, optimization, artifact-export, and Scrapling runtime dependencies; it does not own page drafting.
- AI provider SDKs belong only to isolated provider wrapper modules in the runtime that executes them.
- The local workstation owns Codex batch authoring, deterministic batch validation/packaging, focused tests, type generation/typecheck, and production-identical noindex previews. Use a local preview server only when needed for bounded visual QA.
- GitHub repeats application and landing-quality validation from a clean checkout; Vercel performs the release build and deployment. Approved Oracle runtime checks remain required for database/Hermes work.
