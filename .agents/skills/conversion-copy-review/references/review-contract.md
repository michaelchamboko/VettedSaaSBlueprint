# Conversion Copy Review Contract

Use this contract when reviewing VettedSaaSBlueprint direct-review page drafts after intent, drafting, uniqueness, and compliance gates. The conversion review decides whether visible copy helps a specific buyer make a clean pre-click decision.

## Boundary

Conversion review owns:

- Buyer decision clarity.
- Renderer-visible copy strength.
- CTA intent fit and destination continuity.
- Mobile scan path.
- Trust net impression.
- Field-level rewrite requirements.

Conversion review does not approve:

- Page intent viability.
- Duplicate-page strategy.
- Legal/compliance state.
- Evidence, source, affiliate link, or asset records.
- Release authorization, publication state, or final page JSON.

When a fix would change one of those owned states, fail and escalate to the owning gate.

## Input-Readiness Gate

Return `status: "blocked"` when any required input is missing:

- Page draft JSON.
- Approved intent brief.
- Destination review notes or explicit owner override.
- Evidence/source notes.
- Sibling page summaries.
- Uniqueness review result.
- Compliance review result.

Blocked output must use `missing_required_context` and name each missing input in `boundary_escalations`.

## Renderer-Visible Field Priority

Review rendered and search-visible fields before hidden support fields:

- `metadata.title_tag`
- `metadata.meta_description`
- `hero.headline`
- `hero.subheadline`
- `affiliate_disclosure.short_disclosure`
- `hero.primary_cta_label`
- `hero.primary_cta_link_id`
- `hero.risk_reversal`
- fallback `problem_solution.problem`
- fallback `problem_solution.solution`
- `benefits[].benefit_title`
- `benefits[].benefit_description`
- `how_it_works[].title`
- `how_it_works[].description`
- `limitations[].limitation`
- `limitations[].mitigation`
- `faq[].question`
- `faq[].answer`

Hidden fields do not rescue weak visible copy: `proof_blocks`, `objection_handling`, source IDs, evidence IDs, `cta_blocks[].supporting_text`, `hero.social_proof_summary`, schema markup, and quality scores.

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
    "closest_siblings": [],
    "prior_gate_state": {
      "intent": "unknown",
      "uniqueness": "unknown",
      "compliance": "unknown",
      "destination": "unknown"
    }
  },
  "scanner_result": {
    "status": "not_run",
    "summary": {}
  },
  "hero_findings": [],
  "cta_findings": [],
  "benefit_findings": [],
  "objection_faq_findings": [],
  "limitation_findings": [],
  "mobile_scan_findings": [],
  "destination_continuity_findings": [],
  "trust_findings": [],
  "hard_gate_failures": [],
  "required_rewrites": [],
  "boundary_escalations": [],
  "release_notes": [],
  "recommended_action": "rewrite_visible_fields",
  "source_recommended_action": "",
  "action_target": null,
  "handoff_to": "",
  "handoff_reason": ""
}
```

Allowed values:

- `status`: `pass`, `fail`, `blocked`
- `publish_readiness`: `blocked`, `eligible_for_release`
- `recommended_action`: `pass`, `rewrite_visible_fields`, `return_to_drafter`, `return_to_intent_brief`, `return_to_uniqueness_review`, `return_to_compliance_review`, `resolve_destination_review`

`publish_readiness` may be `eligible_for_release` only when `status` is `pass`, all prior gate inputs are present, `reason_codes` is empty, `hard_gate_failures` is empty, and no required rewrites remain.

Each finding should include:

```json
{
  "reason_code": "generic_hero",
  "severity": "high",
  "field_path": "hero.headline",
  "issue": "",
  "acceptance_check": ""
}
```

Use `severity: "high"` for hard gates, `severity: "medium"` for non-blocking rewrite issues, and `severity: "low"` for release notes.

## Canonical Reason Codes

| Reason code | Use when |
| --- | --- |
| `missing_required_context` | Required input, prior gate result, destination notes, evidence/source notes, or sibling context is missing. |
| `generic_hero` | Hero could fit any product, keyword, or generic affiliate page. |
| `vague_buyer_decision` | Copy does not name the buyer task, decision, use case, or workflow constraint. |
| `audience_not_narrowed` | Subheadline or first screen fails to narrow who the page is for and what they should expect. |
| `internal_process_as_public_proof` | Public copy explains owner review, compliance checks, affiliate vaults, publication gates, or internal workflow more than the product decision. |
| `site_workflow_over_product_decision` | Legacy scanner alias for `internal_process_as_public_proof`; do not introduce it in new independent reviews. |
| `generic_benefit_copy` | Benefits describe generic product praise or site mechanics instead of buyer outcomes and product-fit decision factors. |
| `generic_objection_faq` | FAQ or objections are boilerplate, affiliate disclaimers, or generic reassurance instead of real buyer friction. |
| `generic_limitation` | Limitations are copied, evasive, or generic, such as "pricing may change," without a page-specific risk. |
| `cta_intent_mismatch` | CTA label does not match the visitor's likely next step, commitment level, or intent brief CTA intent. |
| `cta_destination_mismatch` | CTA copy promises a pricing, trial, demo, discount, guarantee, official status, or verification state not supported by destination notes. |
| `weak_disclosure_cta_relationship` | The first mobile scan does not clearly connect material connection disclosure and the first affiliate CTA. |
| `mobile_scan_unclear` | First viewport or scan path fails to make the decision, audience, next step, and trust cue clear. |
| `sibling_pattern_reuse` | Visible copy repeats sibling patterns enough to feel generic, even if formal uniqueness review owns the duplicate decision. |
| `hidden_value_dependency` | Critical value, proof, objection handling, or CTA support appears only in non-rendered fields. |
| `unsupported_hype_or_pressure` | Persuasion depends on urgency, scarcity, inflated certainty, unsupported superlatives, or fake proof. |
| `overclaimed_independence` | Copy implies independent, unbiased, official, verified, tested, hands-on, recommended, or best status beyond approved review basis. |
| `weak_trust_net_impression` | Copy technically includes caveats but still feels biased, evasive, one-sided, or hard to verify. |
| `unverifiable_social_proof` | Copy uses testimonials, ratings, user counts, review summaries, or trust claims without source/date/context. |
| `unanswered_buyer_question` | Page leaves obvious pre-click friction unanswered, such as plan limits, setup, integrations, support, cancellation, security, pricing, or what to verify next. |
| `destination_continuity_gap` | Page promise, CTA, or expectation does not match the reviewed destination path. |
| `rewrite_requires_prior_gate` | Required rewrite would change intent, uniqueness, compliance, evidence, affiliate link, destination, asset, or owner-approval state. |
| `missing_required_rewrites` | Review fails but does not provide field-level rewrite requirements and acceptance checks. |

Do not invent new reason codes during normal review. If a new repeated failure appears, route it to `landing-page-batch-retro` as a skill update candidate.

## Hard Gates

Fail conversion QA when any condition is true:

- Required context is missing.
- H1 or hero could fit any product, keyword, or sibling page.
- Buyer decision is vague, such as "learn about Product" or "see if Product is good."
- First mobile viewport does not quickly answer: what is this, who is it for, why trust it, what happens next.
- Disclosure and first CTA are separated or framed in a way that weakens trust.
- CTA does not match the intent brief, likely buyer next step, or destination notes.
- CTA implies pricing, trial, discount, guarantee, official approval, or verification not approved by prior gates.
- Benefits do not connect to buyer outcomes or product-fit decision factors.
- FAQ or objections are filler instead of real pre-click friction.
- Limitations do not name who is affected and what to verify or do next.
- Public copy uses internal governance or site workflow as product proof.
- Critical value is hidden in non-rendered fields.
- Copy needs hype, pressure, fake proof, unsupported certainty, or overclaimed independence to feel persuasive.
- Required rewrites would require rerunning intent, uniqueness, compliance, destination, evidence, link, or asset gates.

## Independent Review Tests

- First-viewport test: from disclosure, H1, subheadline, CTA, and risk reversal alone, identify the buyer, decision, material connection, and next step.
- 10-second scan test: from headings, CTA, benefit titles, limitations, and FAQ questions, summarize who should click and who should not.
- CTA out-of-context test: the CTA label should predict the official-site action without surrounding copy.
- Buyer-friction test: FAQ and limitations should answer real hesitation before the click.
- Sibling substitution test: if replacing the product or keyword with a sibling still works, fail.
- Trust net-impression test: the page should feel more credible because it is specific, bounded, and transparent.

## Pass Standard

Pass only when:

- Required context and prior gate outputs are present.
- Scanner output has no unresolved high-severity advisory findings or those findings are explained by prior gate context.
- Visible copy carries the buyer decision and product-fit value.
- CTA, disclosure, and destination expectation are aligned.
- Benefits, limitations, and FAQ answer buyer-specific friction.
- No hard gate failures remain.
- `required_rewrites` is empty.

## Source Rationale

- Google review/helpful/spam guidance supports user-perspective reviews, added value, evidence, tradeoffs, and blocking thin affiliate or scaled cookie-cutter pages.
- FTC endorsement, substantiation, native advertising, and disclosure guidance supports clear material-connection disclosure, truthful net impression, substantiated claims, and no fake or unverifiable social proof.
- NN/g guidance supports information scent, concise objective copy, specific link labels, scanning behavior, and useful FAQs.
- Baymard product-page UX guidance supports answering buyer questions, product-fit content, concrete limitations, mobile friction reduction, and CTA confidence.
- JTBD and Fogg behavior guidance supports buyer job clarity, motivation/ability/prompt fit, and friction reduction without dark patterns.
