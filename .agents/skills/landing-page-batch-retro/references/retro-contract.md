# Landing Page Batch Retro Contract

Use this contract after a landing-page batch, repeated correction loop, or failed review cycle. The retro exists to convert repeated failures into durable controls before another batch starts.

## Output Contract

Return structured JSON only:

```json
{
  "contract_version": 1,
  "status": "fail",
  "batch_summary": {
    "batch_id": "",
    "page_count": 0,
    "pages_reviewed": [],
    "elapsed_time_notes": "",
    "skills_used": [],
    "gate_statuses": [],
    "branch_disposition": "",
    "skipped_gates": [],
    "required_next_handoff": "",
    "publish_readiness_result": "blocked",
    "owner_decisions": []
  },
  "input_readiness": {
    "status": "fail",
    "missing_inputs": [],
    "scanner_required": false,
    "scanner_result_summary": null,
    "blocking_notes": []
  },
  "fan_out_plan": {
    "used_subagents": false,
    "reason": "",
    "review_packets": [],
    "reviewer_lanes": [],
    "manager_synthesis_owner": "main_agent"
  },
  "review_lanes": [],
  "failure_ledger": [],
  "recurring_failures": [],
  "root_causes": [],
  "search_quality_risks": [],
  "compliance_risks": [],
  "conversion_risks": [],
  "cross_page_patterns": [],
  "action_items": [],
  "forward_tests": [],
  "deferred_items_with_reason": [],
  "go_no_go": "blocked",
  "next_batch_cap": 0,
  "next_batch_readiness_checklist": [],
  "audit_trail": []
}
```

Allowed values:

- `status`: `pass`, `fail`
- `publish_readiness_result`: `blocked`, `eligible_for_next_gate`, `eligible_for_conversion_review`, `eligible_for_release`, `live`, `not_applicable`
- `input_readiness.status`: `pass`, `fail`
- `go_no_go`: `blocked`, `exemplar_only`, `go_with_cap`, `go`
- `severity`: `critical`, `high`, `medium`, `low`
- `control_strength`: `instruction_only`, `checklist_gate`, `deterministic_scan`, `fixture`, `blocker`
- `action_type`: `skill_update`, `process_doc_update`, `deterministic_check`, `source_record_requirement`, `owner_decision`, `fixture_update`, `block_next_batch`
- `action status`: `required`, `complete`, `deferred`, `blocked`

## Failure Ledger Items

Each item in `failure_ledger` must include:

- `failure_id`
- `summary`
- `affected_pages`
- `review_gate`
- `source_report`
- `upstream_reason_codes`
- `upstream_action_target`
- `skip_reason`
- `required_next_handoff`
- `evidence_excerpt`
- `occurrence_count`
- `first_seen`
- `seen_before`
- `previous_fix`
- `why_previous_fix_failed`
- `root_cause_category`
- `root_cause_detail`
- `severity`
- `control_strength`
- `owner_feedback_reference`
- `target_skill_or_process`
- `exact_instruction_delta`
- `validation_check`
- `verifiable_done_state`
- `blocks_publication`
- `blocks_next_batch`

Do not use vague failures such as "copy is generic" without the field, page, review gate, evidence excerpt, and required process control.

## Action Items

Each item in `action_items` must include:

- `action_id`
- `failure_ids`
- `action_type`
- `target_file`
- `target_section`
- `exact_instruction_delta`
- `rationale`
- `owner_role`
- `priority`
- `severity`
- `tracking_id`
- `acceptance_criteria`
- `validation_check`
- `verifiable_done_state`
- `due_before_next_batch`
- `owner_decision_needed`
- `status`

Use `owner_role` for the responsible lane or artifact, not a person, unless the owner has explicitly made a decision.

## Reason Codes

Reuse downstream reason codes when possible. Preserve exact upstream reason codes in `upstream_reason_codes`; do not collapse them into umbrella labels. Use `root_cause_category` and `root_cause_detail` for normalized analysis when upstream skills use aliases or legacy codes.

| Reason code | Use when |
| --- | --- |
| `exact_field_collision` | Title, H1, CTA, first benefit, first limitation, first FAQ, or other visible field repeats. |
| `near_duplicate_copy` | Normalized visible copy is materially similar across pages. |
| `same_intent_sibling` | A sibling owns the same buyer decision, proof need, CTA action, or decision moment. |
| `thin_keyword_swap` | The page differs mainly by keyword, slug, modifier, audience noun, or industry noun. |
| `copied_score_signature` | Scores are identical or near-identical without audited rationale. |
| `scaled_content_abuse` | Batch creates many pages from the same pattern without distinct people-first value. |
| `thin_affiliation` | Affiliate page lacks original added value beyond merchant/vendor content. |
| `doorway_variant` | Similar pages funnel related queries to the same destination without distinct utility. |
| `copied_or_paraphrased_mc` | Main content is copied, lightly rewritten, or stitched from sources without original value. |
| `search_engine_first` | The page exists mainly for keyword coverage rather than direct visitor usefulness. |
| `link_spam_hygiene` | Affiliate links lack appropriate sponsored/nofollow treatment or use manipulative anchors. |
| `weak_affiliate_disclosure` | Disclosure is vague, hidden, conditional, footer-only, or not clear before/near CTA. |
| `disclosure_quality` | Disclosure exists but does not clearly communicate material connection or commission. |
| `claim_substantiation_gap` | Express or implied material claim lacks claim-level support. |
| `net_impression_risk` | Qualified words do not fix an unsupported or misleading overall impression. |
| `unknown_program_rules` | Partner/program rules are missing, stale, or unresolved. |
| `unresolved_program_rules` | Alias for `unknown_program_rules`; preserve if emitted upstream. |
| `program_rules_unknown` | Scanner alias for `unknown_program_rules`; preserve if emitted upstream. |
| `affiliate_link_continuity` | PartnerStack URL, tracking parameters, link status, redirect, or destination continuity is uncertain. |
| `cta_id_mismatch` | Hero CTA id and CTA block affiliate id differ without reviewed mapping. |
| `placeholder_or_self_attested_record` | Generated JSON invents or self-attests ids, approval, compliance, active-link, source, evidence, or asset state. |
| `unsupported_sensitive_claim` | Pricing, guarantee, security, privacy, integration, ranking, comparison, urgency, or superiority claim lacks support. |
| `review_basis_overclaim` | Copy implies hands-on use, independent verification, testing, recommendation, or "best" status beyond the review basis. |
| `hero_decision_unclear` | First viewport does not make the buyer decision clear. |
| `generic_hero` | Conversion alias for `hero_decision_unclear`; preserve if emitted upstream. |
| `vague_buyer_decision` | Conversion alias for `hero_decision_unclear`; preserve if emitted upstream. |
| `message_match_gap` | Keyword/search intent, H1, subheadline, CTA, and destination expectation do not align. |
| `cta_intent_mismatch` | CTA does not match the visitor's likely next verification action. |
| `internal_process_as_public_proof` | Public copy uses owner review, compliance gates, affiliate vaults, or destination-review workflow as product proof. |
| `cta_destination_mismatch` | CTA copy promises a destination, offer, or verification state not supported by destination notes. |
| `destination_continuity_gap` | Page promise, CTA, or expectation does not match the reviewed destination path. |
| `generic_objection_faq` | Objections or FAQs are boilerplate rather than page-specific buyer friction. |
| `generic_limitation` | Limitation is generic or copied instead of building trust for this page angle. |
| `generic_objections` | Legacy alias for `generic_objection_faq`; do not use in new independent reviews. |
| `weak_limitations` | Legacy alias for `generic_limitation`; do not use in new independent reviews. |
| `poor_mobile_scan` | Disclosure, H1, subheadline, CTA, or next-section cue fails the first mobile viewport. |
| `mobile_scan_unclear` | Conversion alias for `poor_mobile_scan`; preserve if emitted upstream. |
| `thin_affiliate_review_risk` | Compliance alias for thin affiliate risk; preserve if emitted upstream. |
| `thin_affiliate_risk` | Intent alias for thin affiliate risk; preserve if emitted upstream. |
| `visible_field_collision` | Drafter alias for `exact_field_collision`; preserve if emitted upstream. |
| `sibling_duplicate_batch` | Drafter alias for batch-level duplicate or same-intent sibling risk; preserve if emitted upstream. |
| `owner_feedback_ignored` | Owner feedback is omitted, contradicted, or not mapped to an action or deferral. |
| `process_handoff_gap` | Review packet, skill sequence, gate output, or next-step ownership was unclear. |
| `missing_regression_fixture` | Repeated high/critical failure lacks a forward test, deterministic check, or explicit deferral. |

## Failure Ownership Matrix

| Root cause | Primary target |
| --- | --- |
| Intent specificity, buyer decision, JTBD, same-product batch map | `affiliate-page-intent-brief` |
| Draft eligibility, visible field mapping, hidden proof, copied scores, placeholder records | `direct-review-page-drafter` |
| Duplicate fields, near-duplicate copy, same-intent siblings, thin variants | `landing-page-uniqueness-review` |
| Disclosure, claim support, program rules, review-basis overclaim, affiliate link safety | `affiliate-compliance-review` |
| Hero clarity, CTA fit, mobile scan, objections, limitations, message match | `conversion-copy-review` |
| Sequence, review packets, release-receipt gate, fan-out/fan-in coordination | `landing-page-production-orchestrator` |
| Exact duplicates, placeholder IDs, CTA mismatch, score/proof mismatches | deterministic scanner/static check |
| Missing source, evidence, destination, program, or approval records | source-record process or owner decision |
| Repeated time loss, unclear handoff, skipped checks | process documentation |

## Severity Rules

Use `critical` when a failure blocks publication and next-batch safety, including unresolved compliance, duplicate publication risk, unsupported high-risk claims, placeholder/self-attested records, CTA/link mismatch, unknown program rules, or ignored owner feedback.

Use `high` when publish-readiness is blocked but an exemplar-only next step may be safe after a targeted fix or owner-approved deferral.

Use `medium` when the failure causes repeated rework or quality degradation but does not by itself create immediate publication risk.

Use `low` for non-recurring polish/process notes. Escalate to `medium` if the same issue recurs.

## Deferral Rules

Every deferral must include:

- `deferred_item`
- `failure_ids`
- `reason`
- `risk`
- `risk_accepted_by`
- `why_safe_to_defer`
- `expiry_condition`
- `next_review_trigger`
- `next_batch_cap_impact`

Do not defer unresolved compliance, duplicate publication risk, unsupported high-risk claims, placeholder/self-attested records, CTA/link mismatch, missing owner feedback, or unresolved evidence records unless the owner explicitly accepts the risk and the next batch remains blocked or capped at one exemplar.

## Go / No-Go Rules

Use `blocked` when any critical failure remains unresolved without explicit owner acceptance.

Use `exemplar_only` when high/critical recurrence has a targeted fix path but broad batching would repeat the failure.

Use `go_with_cap` only when recurring failures are fixed, fixture-backed, or explicitly deferred with risk and cap.

Use `go` only after one exemplar and one small batch pass all gates without major rework, no critical/high recurrence remains, and forward tests or deterministic checks cover recent recurring failures.

## Pass Standard

`status: pass` requires:

- Input readiness passed.
- All recurring failures are mapped to action items, deterministic checks, source-record requirements, fixture updates, or explicit owner-approved deferrals.
- High/critical failures are fixed, blocked, or capped with owner-accepted risk.
- Scanner findings are included when generated artifacts exist.
- Owner feedback is represented in actions or deferrals.
- `next_batch_cap` is justified by severity, recurrence, fixture status, and prior batch outcomes.
- No generated artifact self-attestation is treated as proof of publication, owner approval, compliance, active-link state, asset approval, source support, or evidence support.

## Source Rationale

- Blameless postmortems focus on system causes and concrete action plans, not blame.
- FTC endorsement and disclosure guidance supports clear material-connection disclosure and substantiated, non-misleading claims.
- Google search guidance supports blocking scaled, thin affiliate, doorway, and search-engine-first batches without original added value.
- Structured output and eval practice supports stable schemas, RED/GREEN fixtures, and regression checks for repeated failures.
- Multi-agent orchestration guidance supports bounded specialist lanes with manager-owned synthesis.
