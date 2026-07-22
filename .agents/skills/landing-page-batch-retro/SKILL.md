---
name: landing-page-batch-retro
description: Use when a landing-page batch finishes, reviews find repeated failures, or the next batch would repeat known correction work.
---

# Landing Page Batch Retro

## Overview

Turn repeated landing-page corrections into durable process controls before another batch starts. Treat repeated corrections as process failures: the failure must be fixed, converted into a stronger control, explicitly deferred with owner-facing risk, or accepted with a capped next batch.

`status: pass` means the next batch can start under the stated cap. It does not mean any page is publish-ready.

## Non-Goals

Do not draft or rewrite page JSON, approve publication, infer owner approval, assert active affiliate-link state, assert compliance pass state, edit application/runtime code, change schemas, install dependencies, run deployments, modify Oracle/Hermes/Vercel infrastructure, or provide legal/search-ranking guarantees.

## Required References

Always read `references/retro-contract.md` before producing a retro. It defines the required output contract, reason codes, severity levels, ownership rules, deferral rules, and pass standard.

Read `references/forward-tests.md` when validating this skill, improving this skill, or converting repeated failures into regression coverage.

## Required Inputs

- Generated page artifacts or draft summaries.
- Intent output and either downstream gate reports or explicit branch-stop records explaining why downstream gates were intentionally skipped.
- Drafter or blocked-drafter output when drafting was eligible.
- Uniqueness, compliance, and conversion review reports when those gates were reached.
- Deterministic uniqueness, compliance, and conversion scanner output when generated artifacts exist.
- Owner feedback, owner decisions, and explicit owner overrides.
- Time spent by page and by phase when available.
- List of recurring failures or repeated correction loops.
- Prior retro outputs, prior deferrals, and prior skill/process updates when available.
- Local catalogue validation output, selected-reference history, `DesignDirectionV1`, `PresentationRecipeV1`, fingerprints, noindex preview artifacts, and `VisualDesignReviewV1` for every drafted page.

## Input-Readiness Gate

Return `status: fail`, `go_no_go: "blocked"`, and precise missing inputs when the retro lacks any required input needed to identify process failure and next-batch safety.

Fail readiness when:

- Batch artifacts or draft summaries are missing.
- Gate outputs from intent and reached downstream gates are missing.
- Downstream gates are skipped without `branch_disposition`, `skipped_gates`, `skip_reason`, and `required_next_handoff`.
- Owner feedback is missing or ignored.
- Recurring failures are asserted without page, gate, or evidence references.
- Uniqueness, compliance, or conversion scanner output is missing when generated artifacts are available and the corresponding gate was reached or needed for batch safety.
- Time-loss or process notes are missing for repeated correction loops.
- Prior deferrals or prior fixes are unknown when the same failure recurs.
- Stage 0 artifacts, selected-reference history, recipe/fingerprint evidence, or visual reports are missing for generated drafts.

## Stage 0 Design Failure Review (mandatory)

Before summarizing batch results, confirm each wave ran `npm run landing:references:validate` against the local catalogue and stored desktop/mobile capture hashes without recrawling reference sites, then used `npm run landing:references:select -- --category <slug> --buyer-decision <text> [--tags <adjacent-tags>]`. Selection is three references by default; two only when they cover at least four unique design dimensions and include one that matches the product category or an adjacent/neighbor category. Confirm `hero/typography`, `sections/CTA`, and `motion/mobile` roles plus IDs, entry digests, adopted abstract principles, non-copy boundaries, rationale, design read, and `DesignDirectionV1`.

Confirm each direction became a valid `PresentationRecipeV1` with registered tokens only: never accept page-specific JSX/CSS/JavaScript or a silent Editorial V2, `editorial_v2`, or legacy fallback. Confirm a production-identical animated noindex preview with fixed `gsap_editorial` motion and `VisualDesignReviewV1`; a visual status other than `pass` blocks uniqueness, compliance, and conversion gates. Missing, stale, invalid, unsuitable, reuse-limited, recipe/fingerprint-mismatched, or non-passing artifacts require `hold_for_design_direction`. Oracle remains required only for audited final approval/publication; it does not block local Stage 0, noindex drafting, or visual preview.

## Fan-Out / Fan-In Rules

Use subagents only when the retro involves at least two pages, at least two independent review lanes, or repeated failures that need bounded specialist review. For a single narrow correction, run the retro inline.

Before launching reviewers, define a shared review packet with raw artifacts, intent briefs, sibling summaries, source/evidence notes, destination notes, owner feedback, prior gate outputs, prior retro findings, and excluded assumptions. Each reviewer must have a narrow role, scope, expected output, stop condition, and escalation rule.

The main agent owns final synthesis. Normalize reviewer outputs into the failure ledger, resolve conflicts with hard-gate precedence, and record the audit trail. A single optimistic review never overrides compliance, unresolved evidence, placeholder records, affiliate-link risk, duplicate-intent findings, or owner feedback.

## Retro Flow

1. Run the input-readiness gate and scanner-readiness check.
2. Summarize batch size, elapsed time, skills used, gate statuses, publish-readiness result, and owner decisions.
3. Normalize all findings into `failure_ledger` entries using `references/retro-contract.md`.
4. Cluster cross-page patterns by repeated field, buyer decision, claim type, CTA mismatch, evidence gap, disclosure issue, destination continuity gap, score signature, owner feedback miss, process handoff gap, catalogue gaps, reference reuse, recipe collisions, renderer-token failures, mobile/CTA/overflow/motion failures, or visual-report quality.
5. Assign root cause and target owner: intent, drafter, uniqueness, compliance, conversion, orchestrator, deterministic scanner, process doc, source record, or owner decision.
6. Mark severity and control strength: `instruction_only`, `checklist_gate`, `deterministic_scan`, `fixture`, or `blocker`.
7. For every recurring failure, perform a recurrence audit: seen before, previous fix, why it failed, and stronger control needed.
8. Produce exact catalogue, contract, renderer, or skill updates, deterministic scanner requests, source-record requirements, or explicit deferrals. Convert recurring design failures into those updates or explicitly defer them before another wave.
9. Convert each repeated high/critical failure into a forward-test fixture or explain the owner-approved deferral.
10. Decide `go_no_go`, `next_batch_cap`, and required preconditions before any next batch.

## Update Ownership Matrix

| Failure pattern | Default owner |
| --- | --- |
| Vague buyer decision, weak JTBD, keyword-only page, missing batch intent map | `affiliate-page-intent-brief` |
| Ineligible draft, hidden proof, copied visible fields, inflated scores, placeholder records in generated JSON | `direct-review-page-drafter` |
| Exact field collision, near-duplicate copy, same-intent sibling, thin keyword swap, copied score signature | `landing-page-uniqueness-review` or deterministic scanner |
| Weak disclosure, unknown program rules, unsupported sensitive claim, review-basis overclaim, claim substantiation gap | `affiliate-compliance-review` |
| Hero decision unclear, CTA intent mismatch, weak mobile scan, generic objections, generic limitations, message-match gap | `conversion-copy-review` |
| Skipped sequence, missing shared review packet, missing owner approval, unresolved handoff, ignored retro gate | `landing-page-production-orchestrator` |
| Placeholder IDs, CTA id mismatch, self-attested approvals, high evidence score without proof, repeated static duplicate pattern | deterministic scanner or schema/static check |
| Missing source/evidence/destination/program records | source-record process or owner decision |
| Time loss caused by unclear sequence, repeated manual fixes, or poor review packet quality | process documentation |

## Required Output

Return structured JSON only using `references/retro-contract.md`. Required top-level fields include:

- `contract_version`
- `status`: `pass` or `fail`
- `batch_summary`
- `input_readiness`
- `fan_out_plan`
- `review_lanes`
- `failure_ledger`
- `recurring_failures`
- `root_causes`
- `search_quality_risks`
- `compliance_risks`
- `conversion_risks`
- `cross_page_patterns`
- `action_items`
- `forward_tests`
- `deferred_items_with_reason`
- `go_no_go`
- `next_batch_cap`
- `next_batch_readiness_checklist`
- `audit_trail`

For each proposed update, include `target_file`, `target_section`, `exact_instruction_delta`, `rationale`, `validation_check`, `owner_decision_needed`, and `status`.

## Hard Gates

Fail the retro when:

- Recurring failures are described but no skill, process, scanner, source-record, fixture, or owner-approved deferral is proposed.
- A new batch is recommended while duplicate intent, copied visible fields, thin-affiliate risk, or scaled-content risk remains unresolved.
- Owner feedback is ignored or summarized without a corresponding action/deferral.
- Time loss is attributed only to page artifacts rather than production process.
- Generated artifacts are trusted for publication, owner approval, asset approval, active-link state, compliance pass state, or source/evidence proof.
- Weak disclosure, unsupported high-risk claims, unknown compliance/program rules, affiliate-link continuity gaps, placeholder IDs, CTA mismatches, or unresolved evidence records remain open.
- High/critical recurring failures lack a forward-test fixture, deterministic check, stronger gate, or explicit owner-approved deferral.
- Another wave is proposed before recurring catalogue gaps, reference reuse, recipe collisions, renderer-token failures, mobile/CTA/overflow/motion failures, or visual-report quality failures are updated or explicitly deferred.

## Default Policy

- Cap the next batch at 3 pages until one exemplar and one small batch pass all gates without major rework.
- Shrink to one exemplar when critical/high recurrence, scaled-content risk, thin-affiliate risk, duplicate-intent risk, unsupported claims, or unresolved records recur.
- Block the next batch when critical failures remain unresolved and are not explicitly owner-accepted with a safe cap.
- Prefer fewer high-quality pages over broad keyword coverage.
- Use deterministic checks for structural recurrence and human review for semantic buyer-intent, compliance, and owner-judgment calls.
- Track whether each ten-page wave achieved unique fingerprints without live per-page browsing.

## Common Mistakes

| Mistake | Required response |
| --- | --- |
| Saying "improve prompts" without exact instruction text. | Fail; require target file, section, instruction delta, and validation. |
| Blaming the drafter/model or page artifact only. | Identify the missing input, weak gate, poor packet, absent fixture, or scanner gap. |
| Treating a well-written retro as a pass. | Pass only when next-batch risks are controlled, deferred, or blocked. |
| Deferring recurring failures without owner-facing risk and expiry. | Fail unless deferral has owner acceptance, risk, cap, and review trigger. |
| Recommending another batch while duplicate-page risks remain. | Block or cap at one exemplar until fixed. |
| Trusting generated approval, compliance, link, source, evidence, or asset fields. | Require audited owner/gate/source records outside generated JSON. |
| Treating scanner output as the entire retro. | Use scanner findings as inputs; still synthesize process root cause and semantic risk. |
| Letting batch pressure override gates. | Keep publication and next-batch readiness blocked or capped. |
