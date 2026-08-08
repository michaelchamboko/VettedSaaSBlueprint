---
name: landing-page-production-orchestrator
description: Use when creating, rewriting, batching, reviewing, or marking direct-review affiliate landing pages publish-ready in VettedSaaSBlueprint.
---

# Landing Page Production Orchestrator

## Visibility-page routing

This skill is direct-review-specific. When the task targets one of the approved VisibilityPageV1 paths, hand off before Stage 0 to `visibility-page-production-orchestrator`. Do not adapt direct-review affiliate, CTA, receipt, or allowlist requirements to visibility pages; their sibling Neon workflow owns publication authority.

## Overview

Use the canonical workflow authority at `docs/landing-workflow/README.md` and `docs/landing-workflow/unattended-publication.md` for release ownership, command discovery, deterministic inspection, and unattended boundaries. A page is publish-ready only when its claims, affiliate destination, disclosure, accessibility, release checks, and deployment verification pass.

## Design Direction: 2027 Artistic Standard

Every new landing page starts with a one-line design read: audience, conversion moment, visual attitude, and motion intent. Use the `design-taste-frontend` anti-slop guidance as the creative baseline.

- Original page-specific JSX, CSS, imagery, typography, and GSAP motion are allowed and expected.
- Prefer editorial whitespace, strong image art direction, asymmetric hierarchy, purposeful scroll motion, and one clear conversion action.
- Reject generic AI patterns: template card grids, faux dashboards, centered dark-gradient heroes, decorative motion without a narrative role, and boilerplate feature essays.
- Motion must respect `prefers-reduced-motion`, preserve usability and contrast, and never obstruct CTA access.
- Existing deployed pages are historical artifacts. This standard applies only to new pages and explicit rewrites.

Reference material may inspire an abstract design read but is advisory: it is never a token registry, recipe requirement, or reason to block original implementation. Affiliate evidence, disclosure, accessibility, and release controls remain mandatory.

## Required Workflow

1. Define the buyer decision, evidence boundaries, and a concise 2027 artistic design read.
2. Branch on the intent disposition before drafting:
   - Continue to `direct-review-page-drafter` only for `new_page`, `rewrite_existing` with an explicit target, or explicit internal `noindex_draft`.
   - Route `merge_into_existing`, `hold_for_evidence`, or `hold_for_design_direction` to the named repair action. Stop only for `reject` or after the permitted recovery attempts are exhausted.
3. Use `direct-review-page-drafter` for eligible briefs, then review the rendered design for visual clarity and conversion intent before `landing-page-uniqueness-review`.
4. Use `landing-page-uniqueness-review`; continue only when it returns `status: pass` and `publish_readiness: eligible_for_next_gate`.
5. Use `affiliate-compliance-review`; continue only when it returns `status: pass` and `publish_readiness: eligible_for_conversion_review`.
6. Use `conversion-copy-review`; continue only when it returns `status: pass` and `publish_readiness: eligible_for_release`.
7. Require the URL to be present exactly in `approved-urls.md`, then continue through the unattended gate evaluator, bot PR, Vercel preview, automatic merge, production deployment, live verification, and `LandingReleaseReceiptV1`. Omit or soften unproved high-risk public claims and rerun the affected gate.
8. Use `landing-page-batch-retro` after every batch or repeated correction loop; update or explicitly defer recurring design failures before another wave.

When generated artifacts exist, run the deterministic scanners owned by uniqueness, compliance, and conversion during their respective gates. Do not skip ahead because the page is "simple" or "just a keyword variant".

## Batch Policy

- Build one exemplar first.
- Run a three-page calibration only after the exemplar passes evidence, accessibility, and release checks.
- Do not start an up-to-ten-page wave until the calibration passes without major rework.
- Require a design read, rendered-page review, and mobile/desktop inspection in each batch workspace.
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
