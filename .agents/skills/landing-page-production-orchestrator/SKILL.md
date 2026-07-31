---
name: landing-page-production-orchestrator
description: Use when creating, rewriting, batching, reviewing, or marking direct-review affiliate landing pages publish-ready in VettedSaaSBlueprint.
---

# Landing Page Production Orchestrator

## Overview

Use the canonical workflow authority at `docs/landing-workflow/README.md` and `docs/landing-workflow/unattended-publication.md` for stages, artifact ownership, command discovery, deterministic inspection, and unattended boundaries. No direct-review page is publish-ready until intent, drafting, visual review, uniqueness, compliance, conversion, and independently audited allowlist/evidence/artifact/cap/kill-switch gates pass.

## Stage 0: Local Design Direction (mandatory)

Run this fail-closed sequence before product evidence, intent, drafting, or any downstream gate:

1. Run `npm run landing:references:validate` to validate the local catalogue and stored desktop/mobile capture hashes. Do not recrawl reference sites during page production.
2. Run `npm run landing:references:select -- --category <slug> --buyer-decision <text> [--tags <adjacent-tags>]`. Select three references by default; allow two only when they cover at least four unique design dimensions. At least one reference must match the product category or an adjacent/neighbor category.
3. Assign explicit `hero/typography`, `sections/CTA`, and `motion/mobile` roles. Record reference IDs, entry digests, adopted abstract principles, non-copy boundaries, rationale, a one-line design read, and `DesignDirectionV1` in the intent brief.
4. The eligible drafter converts the intent direction to a validated `PresentationRecipeV1`. It may use only registered presentation tokens; never generate page-specific JSX/CSS/JavaScript or silently fall back to `editorial_v2` or legacy rendering.
5. After the draft, render the production-identical animated noindex preview with the fixed `gsap_editorial` motion profile and retain `VisualDesignReviewV1`. A visual status other than `pass` blocks uniqueness, compliance, and conversion gates.

When an exact category reference is unavailable, select the closest eligible references or the approved repository house style and record the fallback. Missing, stale, invalid, or reuse-limited references enter the design repair route; stop only when no approved direction can produce a useful accessible page after two repair rounds. Neon Postgres remains the durable workflow authority, and Oracle-hosted Hermes remains mandatory for product identity and research.

## Required Workflow

1. Complete Stage 0 and use `affiliate-page-intent-brief` to validate evidence and intent with its `DesignDirectionV1`.
2. Branch on the intent disposition before drafting:
   - Continue to `direct-review-page-drafter` only for `new_page`, `rewrite_existing` with an explicit target, or explicit internal `noindex_draft`.
   - Route `merge_into_existing`, `hold_for_evidence`, or `hold_for_design_direction` to the named repair action. Stop only for `reject` or after the permitted recovery attempts are exhausted.
3. Use `direct-review-page-drafter` for eligible briefs only, then require the Stage 0 visual pass before `landing-page-uniqueness-review`.
4. Use `landing-page-uniqueness-review`; continue only when it returns `status: pass` and `publish_readiness: eligible_for_next_gate`.
5. Use `affiliate-compliance-review`; continue only when it returns `status: pass` and `publish_readiness: eligible_for_conversion_review`.
6. Use `conversion-copy-review`; continue only when it returns `status: pass` and `publish_readiness: eligible_for_release`.
7. Require the URL to be present exactly in `approved-urls.md`, then continue through the unattended gate evaluator, bot PR, Vercel preview, automatic merge, production deployment, live verification, and `LandingReleaseReceiptV1`. Omit or soften unproved high-risk public claims and rerun the affected gate.
8. Use `landing-page-batch-retro` after every batch or repeated correction loop; update or explicitly defer recurring design failures before another wave.

When generated artifacts exist, run the deterministic scanners owned by uniqueness, compliance, and conversion during their respective gates. Do not skip ahead because the page is "simple" or "just a keyword variant".

## Batch Policy

- Build one exemplar first.
- Run a three-page calibration only after the exemplar passes every gate, including visual pass.
- Do not start an up-to-ten-page wave until the calibration passes without major rework.
- Require selected references, validated recipe/fingerprint, and visual report in each batch workspace.
- Treat any repeated correction as a skill/process defect.

## Review integration

Use the applicable project-local review skills for intent, uniqueness, compliance, conversion, and retro. Follow the canonical workflow's ownership and recovery rules; review artifacts are not publication authority.

## Handoff Rules

- Treat `status: pass` as gate-specific only. It never means publish-ready until conversion passes and independent unattended gates are recorded.
- Treat `eligible_for_next_gate`, `eligible_for_conversion_review`, and `eligible_for_release` as different states.
- Do not treat pending allowlist/release evaluation as a drafter or compliance failure unless generated JSON self-attests approval or publication state.
- Preserve upstream `reason_codes`, `recommended_action`, `action_target`, `required_changes`, scanner summaries, recovery evidence, and release results in the final report.

## Publish-Readiness Hard Gate

Publish readiness is blocked when any page:

- Differs from another page mainly by keyword.
- Reuses the same title, H1, CTA, core benefit, limitation, or FAQ as a sibling page without a clear reason.
- Lacks a distinct buyer problem, decision moment, or use case.
- Makes unsupported claims or uses risky pricing, ranking, guarantee, discount, security, or urgency language.
- Lacks visible disclosure before/near the first CTA.
- Has no honest limitation.
- Does not explain why the visitor should click without hype.
- Has no evidence-backed reason to exist.
- Contains placeholder/test-pattern ids or unresolved evidence/source references.
- Has mismatched hero CTA and CTA block affiliate ids without reviewed mapping.
- Relies on generated JSON to self-assert published state, owner approval, asset approval, active-link state, or compliance pass state.

## Required Final Report

For every page or batch, report:

- Skills used.
- Gate statuses.
- Files reviewed or generated.
- Blocking findings.
- Automatic repairs performed or the one exact external action still needed.
- Skill/process updates made or deferred.
