---
name: conversion-copy-review
description: Use when reviewing affiliate landing-page copy for buyer-specific persuasion, CTA fit, mobile scan quality, trust net impression, destination continuity, or generic-page risk in the VettedSaaSBlueprint landing-page workflow.
---

# Conversion Copy Review

## Overview

Act as the late-stage persuasion QA gate for direct-review affiliate landing pages. A conversion-ready page helps a specific visitor decide whether to click through without hype, hidden material incentives, unsupported certainty, generic affiliate filler, or pressure tactics.

This skill does not approve intent viability, uniqueness, compliance, evidence, affiliate links, assets, publication state, or final page JSON. Route those issues to the owning automatic gate instead of trying to resolve them here.

## Required Inputs

- Page draft JSON.
- Approved intent brief.
- Destination review notes.
- Evidence/source notes.
- Sibling page summaries for batch context.
- Passed uniqueness review or explicit uniqueness review output.
- Passed compliance review or explicit compliance review output.

If required context is missing, return a blocked output instead of guessing.

## Required References

Always read `references/review-contract.md` before reviewing. It defines the output contract, visible-field priority, reason codes, hard gates, and escalation rules.

Read `references/forward-tests.md` when validating or improving this skill.

## Deterministic Scan

Run the bundled advisory scanner when reviewing generated artifacts or batches:

```powershell
node .agents/skills/conversion-copy-review/scripts/summarize-conversion-copy-risks.mjs src/generated/landing-pages --report-only
```

Use `--json` for machine-readable output and `--target <filename>` to focus a target page while comparing it against the full artifact set.

The scanner is necessary but not sufficient. It catches objective copy risks; semantic review still decides whether the page helps a real buyer decide.

## Review Flow

1. Run the input-readiness gate from `references/review-contract.md`.
2. Inspect renderer-visible fields first: title/meta, hero, disclosure, primary CTA, risk reversal, fallback problem/solution, benefits, how-it-works, limitations, and FAQ.
3. Check the first mobile viewport: disclosure, H1, subheadline, and primary CTA must explain the buyer decision, affiliate relationship, and next step quickly.
4. Verify the H1 names a concrete buyer decision, use case, task, or workflow constraint.
5. Confirm the subheadline narrows audience, expectation, destination fit, and reason to keep reading.
6. Evaluate whether benefits answer the target visitor's problem and product-fit decision, not the site's internal workflow.
7. Check objections and FAQ for real pre-click friction, not generic affiliate disclaimers or filler.
8. Confirm limitations increase trust, name who is affected, and state what to verify or do next.
9. Check CTA language for buyer intent, destination continuity, and confidence level. Do not let CTA copy imply a pricing, trial, guarantee, endorsement, or verification state that prior gates did not approve.
10. Flag repeated sibling patterns as conversion genericness risk, then escalate formal duplicate-intent decisions to uniqueness review.
11. Return structured JSON only using `references/review-contract.md`.

## Hard Gates

Fail conversion QA when:

- Required context is missing.
- The hero could fit any product, keyword, or generic affiliate page.
- The page explains the site's workflow more than the product decision.
- The buyer decision is vague, such as "learn about Product" or "see if Product is good."
- CTA language does not match the visitor's likely next step, CTA intent, or official-site verification action.
- The first mobile scan path does not connect disclosure, decision, CTA, and destination expectation.
- Benefits do not answer the target visitor's problem or product-fit decision.
- Objections and FAQ do not answer real buyer friction.
- Limitations are generic, copied, evasive, or unrelated to the page angle.
- Critical value appears only in hidden fields such as proof blocks, objection handling, CTA supporting text, source IDs, or scores.
- Copy needs hype, urgency, fake proof, overclaimed independence, unverifiable social proof, or unsupported certainty to feel persuasive.
- Required rewrites would change intent, uniqueness, compliance, evidence, link, destination, or approval state without rerunning the owning gate.

## Required Output

Return structured JSON only with these top-level fields:

- `schema_version`
- `status`: `pass`, `fail`, or `blocked`
- `publish_readiness`: `blocked` or `eligible_for_release`
- `reason_codes`
- `review_scope`
- `scanner_result`
- `hero_findings`
- `cta_findings`
- `benefit_findings`
- `objection_faq_findings`
- `limitation_findings`
- `mobile_scan_findings`
- `destination_continuity_findings`
- `trust_findings`
- `hard_gate_failures`
- `required_rewrites`
- `boundary_escalations`
- `release_notes`
- `recommended_action`
- `source_recommended_action`
- `action_target`
- `handoff_to`
- `handoff_reason`

Allowed `recommended_action` values: `pass`, `rewrite_visible_fields`, `return_to_drafter`, `return_to_intent_brief`, `return_to_uniqueness_review`, `return_to_compliance_review`, and `resolve_destination_review`.

## Rewrite Guidance

Prefer specific, plain-language rewrite requirements. Do not invent final claims or source facts while reviewing.

- Name the buyer's task.
- State what the visitor should verify on the official site.
- Use caveats as trust builders.
- Keep paragraphs short.
- Avoid invented social proof, exaggerated certainty, or broad "best tool" framing.
- Include an acceptance check for every required rewrite.
- Route rewrites that require new evidence, compliance review, destination review, or uniqueness changes to the owning gate, then resume this review.
