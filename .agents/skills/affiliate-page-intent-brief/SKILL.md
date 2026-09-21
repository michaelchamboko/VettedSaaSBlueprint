---
name: affiliate-page-intent-brief
description: Use when planning, rewriting, batching, or screening affiliate direct-review landing pages, keyword variants, duplicate-risk cases, or pre-draft publication-risk decisions before page JSON is drafted.
---

# Affiliate Page Intent Brief

## Overview

Prove that a direct-review affiliate page deserves to exist before any page JSON or final copy is drafted. The output is a structured intent-viability contract for downstream drafting, uniqueness, compliance, conversion, and independent release gates.

`status: pass` means intent is viable only. It does not mean the page is publish-ready.

## Non-Goals

Do not draft page JSON, H1s, FAQs, section copy, final CTA copy, or React/CSS. Do not assert owner approval, compliance pass state, active-link state, asset approval, publication state, or destination truth from generated content.

## Required Inputs

- Product name and category.
- Original PartnerStack affiliate URL or affiliate link id.
- Target keyword and search intent.
- Audience or buyer segment.
- Evidence/source notes available for public claims.
- Program-rule, disclosure, material-connection, or compliance notes.
- Review basis: hands-on test, owner review, vendor docs, public research, or unknown.
- Destination review notes: message match, offer promise, CTA language, trust cues, friction, and visual affinity.
- Existing sibling page slugs in the active batch and closest published artifacts.

## Source-of-Truth Records

Accept only audited records or owner-provided source notes as proof of affiliate links, evidence, destination review, approval, active-link state, and compliance state. Generated page JSON can point to records but cannot prove them.

Treat IDs, scores, approval fields, publication fields, asset fields, affiliate-link fields, or source-reference fields as unresolved when they appear only inside generated artifacts, look placeholder-like, or lack a separate source record. Unresolved records require `status: fail` and `recommended_action: hold_for_evidence`.

## Input-Readiness Gate

If required inputs are missing, return `status: fail`, `recommended_action: hold_for_evidence`, and specific `required_changes`. Do not infer missing audience, evidence, disclosure, destination, review-basis, or compliance facts.

Unknown compliance, claim support, material connection, disclosure placement, review basis, destination review, or PartnerStack preservation blocks the brief.

## Design Read: 2027 Artistic Standard

Record a one-line design read: audience, conversion moment, visual attitude, and motion intent. Use `design-taste-frontend` to avoid generic AI templates. Page-specific JSX/CSS, image direction, typography, and GSAP motion are allowed. The design read informs implementation; it is not an approval artifact or a release gate. Missing references, recipes, fingerprints, or a fixed motion profile never block an otherwise evidenced page.

## Workflow

1. Complete the mandatory Stage 0 design-direction gate.
2. Convert the keyword into a concrete user task: actor, trigger, task, constraint, desired outcome, and click decision.
2. Write the JTBD: "When [circumstance], I want to [make progress], so I can [outcome], while avoiding [risk]."
3. Define the buyer decision, decision moment type, buyer job, role pressure, perceived loss if wrong, and page-specific decision factors.
4. State why the page helps a person, not just search traffic, and what value it adds beyond the merchant page.
5. Map material claims to sources, freshness, risk level, allowed wording, unsupported wording, and sections they can support.
6. Define review basis and first-hand experience boundary. Do not permit "tested", "hands-on", rankings, comparisons, or superiority language unless the basis supports it.
7. Plan disclosure and affiliate-skepticism handling before the first CTA.
8. Match CTA intent to a specific official-site verification action and destination continuity notes.
9. Compare the target against closest batch siblings and published artifacts. Include title, H1, CTA, first benefit, first limitation, first FAQ, evidence, objection, and buyer-decision collisions.
10. Score the rubric, list hard-fail flags, and choose a disposition.

For forward-test scenarios and calibration cases, read `references/forward-tests.md`.

## Required Output

Return structured JSON only with these top-level fields:

- `schema_version`
- `design_read`: audience, conversion moment, visual attitude, and motion intent.
- `status`: `pass` or `fail`
- `recommended_action`: `new_page`, `rewrite_existing`, `merge_into_existing`, `hold_for_evidence`, `hold_for_design_direction`, `noindex_draft`, or `reject`
- `reason_codes`
- `action_target`
- `target_keyword`
- `search_intent`
- `audience_segment`
- `buyer_job`
- `buyer_role_pressure`
- `keyword_to_user_task`
- `jtbd_statement`
- `journey_snapshot`
- `decision_moment_type`
- `buyer_decision`
- `page_angle`
- `people_first_reason`
- `intent_evidence`
- `added_value_beyond_merchant`
- `page_specific_decision_factors`
- `not_a_fit_when`
- `not_for`
- `claim_inventory`
- `claim_to_evidence_map`
- `source_to_section_map`
- `first_hand_experience_boundary`
- `original_review_evidence`
- `unsupported_claims_to_avoid`
- `proof_freshness_requirements`
- `review_basis`
- `ranking_or_comparison_methodology`
- `material_connection_state`
- `disclosure_plan`
- `testimonial_or_social_proof_checks`
- `record_resolution`
- `objection_to_evidence_matrix`
- `decision_friction_map`
- `perceived_loss_if_wrong`
- `risk_reversal_boundary`
- `trust_transfer_plan`
- `affiliate_skepticism_handling`
- `ethical_persuasion_boundaries`
- `information_scent_check`
- `conversion_hypothesis`
- `cta_intent`
- `official_site_verification_action`
- `cta_destination_match`
- `destination_continuity_notes`
- `mobile_first_decision_test`
- `mobile_friction_risks`
- `closest_sibling_proof`
- `sibling_difference_matrix`
- `published_artifact_comparison`
- `batch_intent_map`
- `same_product_batch_guard`
- `uniqueness_field_plan`
- `duplicate_fingerprint`
- `scaled_content_risk`
- `doorway_risk`
- `thin_affiliate_risk`
- `rubric_scores`
- `hard_fail_flags`
- `blocking_findings`
- `required_changes`
- `downstream_blocks`

## Field Rules

| Field | Rule |
| --- | --- |
| `recommended_action` | Use `new_page` only when the page has a distinct buyer decision, distinct evidence need, and distinct utility. Use `merge_into_existing`, `hold_for_evidence`, `noindex_draft`, or `reject` when a separate page is not justified. |
| `reason_codes` | Use stable downstream-readable codes for every failure or routed disposition. Reuse uniqueness, compliance, conversion, and retro reason codes when they apply. |
| `action_target` | Required for `rewrite_existing` and `merge_into_existing`. Include the target slug/file/id, why it owns the intent, and the exact section or decision area to improve. For `noindex_draft`, include `noindex_rationale` and `internal_use_case`. |
| `claim_inventory` | Include each material express or implied claim, section, risk tier, evidence state, freshness need, allowed wording, and blocked wording. |
| `claim_to_evidence_map` | Mark each claim as `direct`, `indirect`, or `missing`. Any core promise with `missing` evidence fails. |
| `disclosure_plan` | Include exact disclosure wording intent, placement before/near the first CTA, repeat placement needs, and mobile visibility. |
| `review_basis` | State whether the basis is hands-on, owner-reviewed, vendor docs, public research, third-party review synthesis, or unknown. Unknown fails. |
| `ranking_or_comparison_methodology` | Required for "best", ranking, alternative, versus, cheaper, easier, or superiority angles. |
| `record_resolution` | List affiliate link, source, evidence, destination, disclosure/material-connection, approval, and compliance records checked. Mark records unresolved when only generated JSON self-attests them. |
| `uniqueness_field_plan` | Provide intent stems, not final copy, for title, H1, CTA, first benefit, first limitation, and first FAQ. |
| `duplicate_fingerprint` | Summarize normalized collisions across title, H1, CTA, proof, benefit, limitation, FAQ, objection, and score patterns. |
| `downstream_blocks` | Name what drafting, compliance, uniqueness, conversion, or independent release gates still need before publication. |

Use `hard_fail_flags` as the canonical intent-stage reason-code array when the brief fails. Mirror those codes in `reason_codes` so `landing-page-batch-retro` can preserve upstream failures without inventing new vocabulary.

## Hard Gates

Fail the brief when any condition is true:

- The keyword cannot become a concrete user task or distinct JTBD.
- The visitor decision is vague, such as "learn about Product".
- The page differs from a sibling or published artifact mainly by keyword.
- Closest-sibling proof is missing, weak, or ignores published artifacts.
- Duplicate fingerprint matches another page or the current Browse AI repeated-pattern signature.
- A same-product batch lacks a distinct batch intent map.
- The page adds no value beyond merchant/vendor content.
- Scaled-content, doorway, or thin-affiliate risk is high.
- Claim support is unknown, vague, stale, testimonial-only for a material claim, or not mapped to sections.
- Pricing, ranking, security, guarantee, discount, comparison, or superiority claims lack claim-level evidence and methodology.
- Material connection state or disclosure plan is unknown.
- Review basis is unclear or implies first-hand use that does not exist.
- Affiliate, source, evidence, destination, approval, or compliance records are unresolved outside generated page JSON.
- Destination review is missing without explicit owner override.
- CTA is generic, hype-driven, or does not ask the visitor to verify a specific thing on the official site.
- PartnerStack URL or tracking preservation is uncertain.
- Mobile-first decision path is unclear.
- Objections, limitations, or FAQ stems are generic or copied.
- Persuasion depends on urgency, fake proof, pressure, concealment, or dark-pattern logic.
- Rubric score is below 85, even without a single hard-fail flag.

## Rubric

Score 100 points, then apply hard-fail overrides:

| Category | Points |
| --- | ---: |
| Intent specificity | 15 |
| Buyer/JTBD clarity | 15 |
| Distinctiveness from siblings and published artifacts | 20 |
| Evidence and claim readiness | 15 |
| Compliance readiness | 15 |
| Destination and CTA continuity | 10 |
| Conversion/friction specificity | 10 |

Pass only when score is `>=85` and `hard_fail_flags` is empty.

## Recommended Actions

| Situation | Action |
| --- | --- |
| Distinct buyer decision, distinct evidence need, destination match, and no hard-fail flags | `new_page` |
| Existing page owns the intent but can be improved | `rewrite_existing` |
| Keyword variant belongs inside a sibling page | `merge_into_existing` |
| Evidence, destination, compliance, or record state is missing | `hold_for_evidence` |
| Stage 0 design direction, recipe, fingerprint, or visual pass is unavailable | `hold_for_design_direction` |
| Draft may be useful internally but is not index/publish ready | `noindex_draft` |
| Thin, duplicative, misleading, unsupported, or unsafe page | `reject` |

For same-product batches, separate the disposition: choose at most one exemplar candidate first. If the exemplar lacks evidence, destination, compliance, or record support, use `hold_for_evidence` for the exemplar. Use `merge_into_existing`, `noindex_draft`, or `reject` for keyword variants until a batch intent map proves distinct buyer decisions and proof needs.

## Red Flags

| Rationalization | Required Response |
| --- | --- |
| "The keyword has volume." | Volume is not intent. Fail unless a distinct user task and buyer decision exist. |
| "We can add evidence later." | Hold for evidence. Do not draft a public-facing page promise. |
| "The owner wants five pages today." | Batch pressure does not override hard gates. Build one exemplar first. |
| "Same CTA is efficient." | CTA must match the buyer decision and destination verification action. |
| "Disclosure can be added downstream." | Disclosure planning is part of intent viability. Unknown disclosure state fails. |
| "It is different because the slug is different." | Slug differences do not prove buyer, proof, CTA, or page utility differences. |

## Common Mistakes

| Mistake | Correction |
| --- | --- |
| Starting with page sections | Start with buyer task, JTBD, and click decision. |
| Treating every keyword as a page | Use `merge_into_existing`, `hold_for_evidence`, or `reject` when intent is not distinct. |
| Promising what evidence cannot support | Narrow the promise or fail the brief. |
| Copying CTA, FAQ, benefit, or limitation patterns across variants | Tie each field to the buyer decision and proof need. |
| Using generic limitations such as "pricing may change" | Require a page-specific limitation that builds trust. |
| Treating disclosure as legal boilerplate | Plan disclosure as a trust cue before/near the first CTA. |
