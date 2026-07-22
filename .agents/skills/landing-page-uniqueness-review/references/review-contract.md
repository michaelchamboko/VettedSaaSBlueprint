# Landing Page Uniqueness Review Contract

Use this contract after running `summarize-page-duplicates.mjs`. The scanner catches deterministic risk; this rubric catches buyer-intent and semantic duplication.

## Output Contract

Return structured JSON only:

```json
{
  "schema_version": 1,
  "status": "fail",
  "publish_readiness": "blocked",
  "reason_codes": [],
  "review_scope": {
    "target_file": null,
    "artifact_count": 0,
    "closest_siblings": []
  },
  "scanner_result": {
    "status": "not_run",
    "summary": {}
  },
  "duplicate_fields": [],
  "near_duplicate_patterns": [],
  "intent_overlap": {
    "classification": "unknown",
    "closest_sibling": null,
    "buyer_decision_tuple": {
      "actor": "",
      "trigger": "",
      "task": "",
      "constraint": "",
      "desired_outcome": "",
      "perceived_loss_if_wrong": "",
      "decision_moment": "",
      "cta_verification_action": ""
    },
    "overlap_summary": ""
  },
  "thin_variant_risk": "high",
  "distinct_intent_summary": "",
  "sibling_difference_matrix": [],
  "hard_gate_failures": [],
  "required_changes": [],
  "recommended_action": "return_to_intent_brief",
  "source_recommended_action": "",
  "action_target": null,
  "handoff_to": "",
  "handoff_reason": ""
}
```

Allowed values:

- `status`: `pass`, `fail`
- `publish_readiness`: `blocked`, `eligible_for_next_gate`
- `thin_variant_risk`: `low`, `medium`, `high`
- `intent_overlap.classification`: `exact_duplicate`, `contained_variant`, `audience_only_variant`, `decision_stage_variant`, `comparison_variant`, `distinct_use_case`, `unsupported_claim_variant`, `doorway_scaled_variant`, `unknown`
- `recommended_action`: `pass`, `rewrite_visible_fields`, `return_to_intent_brief`, `merge_into_existing`, `noindex_draft`, `reject`

`publish_readiness` may be `eligible_for_next_gate` only when `status` is `pass`, no hard-gate failures exist, scanner status is pass or report-only with no findings, and manual intent review proves distinct value.

## Reason Codes

Use these codes where applicable:

| Reason code | Use when |
| --- | --- |
| `exact_field_collision` | Title, H1, CTA, first benefit, first limitation, first FAQ, or other exact visible field repeats. |
| `near_duplicate_copy` | Normalized visible text is materially similar even when not exact. |
| `same_intent_sibling` | A sibling page serves the same buyer decision or CTA action. |
| `thin_keyword_swap` | The page differs mainly by keyword, slug, modifier, audience noun, or industry noun. |
| `copied_score_signature` | Quality scores are identical or near-identical without audited rationale. |
| `generic_cta_reuse` | CTA is repeated or too vague for the page-specific destination check. |
| `generic_benefit_reuse` | Lead benefit could fit siblings by swapping only the keyword. |
| `generic_limitation_reuse` | Limitation is generic, such as pricing may change, without page-specific risk. |
| `generic_faq_reuse` | FAQ answers affiliate mechanics or boilerplate instead of page-specific friction. |
| `unsupported_reason_to_exist` | The page lacks evidence-backed value beyond the vendor or sibling page. |
| `internal_process_as_public_proof` | Public copy uses owner review, compliance checks, publication gates, affiliate vaults, or destination-review workflow as product proof. |
| `missing_sibling_context` | The review lacks active-batch or published sibling context. |
| `placeholder_or_self_attested_record` | Generated JSON invents IDs or approval/compliance/active-link/asset state. |
| `cta_id_mismatch` | Hero CTA id differs from CTA block affiliate id without reviewed mapping. |
| `inflated_or_copied_scores` | Evidence or quality scores exceed support or repeat sibling patterns. |
| `weak_affiliate_disclosure` | Affiliate CTA exists but visible disclosure is conditional, vague, or lacks commission/earning language. |
| `unsupported_sensitive_claim` | Pricing, discount, guarantee, security, privacy, ranking, comparison, urgency, or superiority claims lack evidence. |
| `review_basis_overclaim` | Copy implies first-hand testing, independence, verification, trust, recommendation, or best status beyond review basis. |
| `visual_asset_unapproved` | Visual assets claim owner approval without audited external approval. |

## Rendered-Field Priority

Review rendered and search-visible fields first:

- `metadata.title_tag`
- `metadata.meta_description`
- `hero.headline`
- `hero.subheadline`
- `affiliate_disclosure.short_disclosure`
- `hero.primary_cta_label`
- `hero.risk_reversal`
- fallback `problem_solution.problem` and `problem_solution.solution`
- `benefits[].benefit_title`
- `benefits[].benefit_description`
- `how_it_works[].title`
- `how_it_works[].description`
- `limitations[].limitation`
- `limitations[].mitigation`
- `faq[].question`
- `faq[].answer`

Hidden fields do not rescue generic visible copy: `proof_blocks`, `objection_handling`, source IDs, evidence IDs, `hero.social_proof_summary`, `cta_blocks[].supporting_text`, `schema_markup`, and `quality_scores`.

## Intent-Overlap Taxonomy

Classify before pass/fail:

| Classification | Meaning | Default action |
| --- | --- | --- |
| `exact_duplicate` | Same product, buyer task, CTA action, proof need, and visible structure. | `merge_into_existing` or `reject` |
| `contained_variant` | Modifier belongs as a section, FAQ, limitation, or paragraph in an existing review. | `merge_into_existing` |
| `audience_only_variant` | Persona or industry changes but decision, proof, limitation, and CTA stay generic. | `return_to_intent_brief` or `reject` |
| `decision_stage_variant` | Pricing, trial, demo, security, migration, setup, or integration decision. | pass only with fresh evidence and destination match |
| `comparison_variant` | Alternative, vs, best, top, or ranking intent. | fail without methodology and comparison evidence |
| `distinct_use_case` | Different actor, trigger, task, constraint, evidence cluster, risk, FAQ, and CTA verification action. | possible `pass` |
| `unsupported_claim_variant` | Page exists mainly to make a risky claim without evidence. | `return_to_intent_brief` or `reject` |
| `doorway_scaled_variant` | Similar pages targeting related queries and funneling to the same destination. | `reject` or `noindex_draft` |

## Manual Review Tests

- Search-result scent test: from title, meta, H1, and subheadline alone, identify the exact buyer task and why this page is different.
- 10-second scan test: from headings, CTA, benefit titles, limitation titles, and FAQ questions, summarize the distinct decision.
- Sibling substitution test: replace the keyword with a sibling keyword. If the page still works, fail.
- Buyer-decision tuple test: actor, trigger, task, constraint, desired outcome, perceived loss, decision moment, and CTA verification action must differ where a sibling exists.
- Evidence-need test: a standalone page needs distinct proof needs, not just distinct phrasing.
- Limitation trust test: limitation must name who is affected and what to verify or do next.
- FAQ usefulness test: at least one FAQ must remove page-specific pre-click friction.

## Pass Standard

A page passes only if:

- It has no deterministic hard-gate findings.
- It has a distinct buyer decision and reason to exist.
- Same-product siblings differ by buyer task, evidence need, limitation, CTA verification action, and FAQ friction.
- Visible copy carries the value; hidden fields only support it.
- Scores are page-specific and conservative.
- The recommended next step is `pass`.

## Source Rationale

- Google high-quality review guidance: require user-perspective evaluation, evidence, differentiators, and decision usefulness.
- Google helpful-content and spam guidance: block people-unhelpful, scaled, doorway, or thin affiliate variants.
- FTC endorsement and substantiation guidance: visible disclosure and objective claims need reasonable support.
- NN/g and Baymard UX guidance: users scan, rely on information scent, and need specific FAQs/limitations to make decisions.
- Eval guidance: keep RED/GREEN fixtures and reason-code assertions so failures become regression tests.
