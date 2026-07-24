---
name: affiliate-compliance-review
description: Use when reviewing affiliate landing-page drafts, generated page artifacts, rewrites, or publication readiness for disclosure, substantiation, PartnerStack link integrity, evidence-ledger, destination-review, renderer-static, or compliance safety gates.
---

# Affiliate Compliance Review

## Purpose

Block unsafe affiliate page publication. This is a hard gate for disclosure, claim support, affiliate-link integrity, program rules, destination review, independently audited gate state, and generated-artifact safety. A compliance pass makes a draft eligible for conversion review; final release eligibility belongs to `conversion-copy-review`.

## Required Inputs

- Target page draft JSON or generated page artifact.
- Affiliate link source-of-truth record: original PartnerStack/referral URL, active state, redirect review, and reviewed mapping.
- Program rules or explicit unknown-rule state.
- Destination review or audited owner override.
- Evidence/source records: usage-allowed state, claim mapping, freshness, review basis, and approval state.
- Disclosure plan and rendered/static disclosure evidence when available.
- Independent asset and publication gate records when the task asks for release readiness.

## Required References

Read `references/compliance-contract.md` before returning a review. Read `references/forward-tests.md` when improving or validating this skill.

Also inspect these project contracts when relevant:

- `src/lib/compliance/gate.ts`
- `src/lib/schemas/contracts.ts`
- `.agents/skills/direct-review-page-drafter/references/output-contract.md`
- `.agents/skills/landing-page-uniqueness-review/references/review-contract.md`

## Deterministic Scan

Run the skill-owned scanner before independent compliance review when page artifacts are available:

```bash
node .agents/skills/affiliate-compliance-review/scripts/summarize-compliance-risks.mjs src/generated/landing-pages --report-only --json
```

Use `--target <filename>` for one page. Use `--report-only` while researching or calibrating. Omit `--report-only` when the scanner should fail the command on blockers.

The scanner is necessary but not sufficient. It finds deterministic artifact risks; it cannot prove external source-of-truth records, legal compliance, or rendered mobile visibility by itself.

## Workflow

1. Run the scanner and keep its reason codes.
2. Review rendered and search-visible fields first: title, meta, H1, subheadline, short disclosure, CTA, risk reversal, benefits, how-it-works, limitations, and FAQ.
3. Check disclosure, claim risk, evidence, PartnerStack link integrity, destination review, artifact QA, independent release authorization when release readiness is requested, and renderer/static gates.
4. Treat unknown external state as blocked.
5. Return the structured output from `references/compliance-contract.md`.

## Hard Gates

Fail publication readiness when:

- Visible disclosure is missing, weak, conditional, hidden, footer-only, or not before/near the first affiliate CTA.
- Original PartnerStack/referral URL preservation, active link state, or reviewed mapping is unknown.
- Program rules, compliance profile, source usage, or destination review state is unknown.
- Independent URL authorization or asset approval state is unknown when the task asks for release readiness or asset use.
- Hero CTA id and CTA block affiliate id differ without audited mapping.
- Product, affiliate link, source, evidence, or asset ids are placeholders or unresolved.
- Page JSON self-attests published state, owner approval, compliance pass, active link, owner override, or asset approval.
- Evidence score is below threshold or asserted without proof blocks and claim-level evidence.
- Compliance score is below threshold or used to bypass missing external records.
- High-risk claims lack claim-level evidence, usage permission, freshness, and approval.
- The page uses fake testimonials, ratings, review counts, invented statistics, deceptive urgency, unsupported "best" language, or copied vendor/competitor content.
- Renderer/static evidence shows affiliate links missing `rel="sponsored"` or disclosure not visible before CTA on mobile and desktop.

## High-Risk Claim Triggers

Treat these as high risk:

- Pricing, discounts, free trials, guarantees, refunds.
- Rankings, "best", "#1", superiority, competitor comparisons.
- Security, privacy, compliance, integrations, geo availability.
- Customer counts, review scores, performance outcomes.
- Urgency or scarcity language.
- "Independent", "tested", "hands-on", "verified", "trusted", "recommended", or "proven" review-basis language.

Neutral caveats such as "confirm pricing on the official site" are allowed only when they do not imply a current price, discount, guarantee, trial, or ranking claim.

## Required Output

Return structured JSON using `references/compliance-contract.md`:

- `status`: `pass` or `fail`
- `publish_readiness`: `blocked` or `eligible_for_conversion_review`
- `reason_codes`
- `scanner_result`
- `disclosure_review`
- `claim_risks`
- `evidence_review`
- `partnerstack_review`
- `destination_review`
- `artifact_qa`
- `renderer_static_gates`
- `hard_gate_failures`
- `required_changes`
- `recommended_action`
- `source_recommended_action`
- `action_target`
- `handoff_to`
- `handoff_reason`

## Common Mistakes

| Mistake | Correction |
| --- | --- |
| Treating generic pricing CTAs as pricing claims | Generic official-site CTAs are preferred when current pricing evidence is absent. |
| Allowing unknown program rules | Unknown state blocks publication. |
| Reviewing copy but not link safety | Link preservation and tracking parameters are part of compliance. |
| Accepting generated JSON approval fields | Approval, active-link, compliance, and publish state must come from audited records. |
| Letting scores replace evidence | Scores are advisory; material claims need claim-level proof. |
