---
name: direct-review-page-drafter
description: Use when drafting or redrafting VettedSaaSBlueprint direct_review page JSON from an approved affiliate intent brief; not for intent validation, compliance approval, owner approval, or publication-readiness review.
---

# Direct Review Page Drafter

## Purpose

Convert only eligible approved intent briefs into structured `direct_review` page JSON. The draft must make buyer value visible in the current renderer, preserve evidence discipline, avoid generic batch patterns, keep CTA/link integrity, and leave compliance/publication approval to later gates.

## Non-Goals

Do not validate whether a keyword deserves a page, draft React/CSS/runtime layout, edit app code, change schemas, create generated page artifacts, install dependencies, touch Oracle/Vercel, publish pages, assert owner approval, assert active-link state, assert compliance pass state, or fill secrets.

## Required Inputs

- Approved output from `affiliate-page-intent-brief`.
- Page contract from `src/lib/schemas/contracts.ts`.
- Affiliate disclosure text and resolved affiliate link id.
- Approved evidence/source records and claim-level usage notes.
- Destination review notes, CTA continuity notes, and compliance warnings.
- Existing sibling page summaries and closest published artifacts.
- Rewrite target when `recommended_action` is `rewrite_existing`.
- Intent `action_target` when `recommended_action` is `rewrite_existing`, `merge_into_existing`, or `noindex_draft`.
- A concise design read describing audience, conversion moment, visual attitude, and motion intent.

## Required References

Always read `references/output-contract.md` before drafting. It contains the fragile schema-field rules, renderer-visible field map, evidence score bands, CTA contract, and hard gates.

Read `references/forward-tests.md` when validating, forward-testing, or improving this skill.

## Workflow

1. Record a concise 2027 artistic design read before drafting. Use `design-taste-frontend` to select hierarchy, whitespace, imagery, typography, and motion appropriate to the buyer and conversion moment.
2. Build original page-specific JSX/CSS, image art direction, and GSAP motion when they improve the experience. Do not default to generic card grids, centered dark-gradient heroes, or feature-essay templates.
4. Run the input-readiness gate.
5. Build a claim manifest from `claim_inventory`, `claim_to_evidence_map`, `source_to_section_map`, `record_resolution`, `review_basis`, and `unsupported_claims_to_avoid`.
6. Compare sibling and published artifacts before drafting visible copy.
7. Map the approved brief into the schema using `references/output-contract.md`.
8. Draft renderer-visible fields first: hero, fallback problem/solution, benefits, limitations, how-it-works when useful, and FAQ.
9. Add proof, objection, CTA, schema-markup, and quality-score fields only when their supporting inputs are resolved.
10. Run the final preflight. Emit either page JSON or blocked output. Do not emit partial page JSON when blocked.
11. Inspect desktop and mobile rendering when available. Motion must preserve CTA access and honor `prefers-reduced-motion`.

Before downstream handoff, resolve evidence, disclosure, affiliate-link, accessibility, and uniqueness blockers. Original art direction is not a blocker.

Default output mode is page JSON or blocked output. If the user explicitly asks for a diagnostic verdict instead of JSON, return a concise decision report using the same gates, reason codes, and required fixes.

## Input-Readiness Gate

Block drafting unless all conditions are true:

- Intent brief has `status: pass`.
- `recommended_action` is `new_page`, `rewrite_existing` with an explicit target artifact, or `noindex_draft` with explicit internal/noindex mode and `action_target`.
- `hard_fail_flags` is empty.
- `record_resolution` proves affiliate, source, evidence, destination, disclosure, and compliance inputs outside generated page JSON.
- `required_changes` does not include evidence, disclosure, destination, compliance, affiliate-link, or uniqueness blockers.
- Sibling and published-artifact context is available for duplicate checks.
- The design read is clear and the rendered hierarchy keeps the CTA and disclosure usable.

Block `merge_into_existing`, `hold_for_evidence`, and `reject`. Return blocked output instead of forcing a page JSON draft. A passing draft advances to independent review; generated JSON must not self-attest approval, compliance pass, publication state, active-link state, or asset approval.

Handle `noindex_draft` narrowly:

- A normal request to "draft page JSON" does not imply `noindex_draft`.
- Use `metadata.robots: "noindex,nofollow"` only when the approved brief or user explicitly requests an internal/noindex draft.
- For eligible `new_page` drafts, create the intended page blueprint without asserting publish-readiness. Publication approval happens after downstream gates, regardless of the robots value.
- If `recommended_action` is `noindex_draft` but internal/noindex mode is not explicit, block with `noindex_draft_not_explicit`.

## Drafting Rules

- Keep public copy about the product under review and the buyer decision. Do not use internal publishing workflow, affiliate vault, owner approval, compliance checks, or destination-review process as public proof unless the approved intent is specifically about that workflow.
- Put the critical buyer value in rendered fields. Do not hide the key value, proof, objection, or friction only in `proof_blocks`, `objection_handling`, `cta_blocks.supporting_text`, `hero.social_proof_summary`, or source ids.
- Hero must act as a first-viewport decision bundle: product, buyer/use case, decision, next step, and what the visitor should verify on the official destination.
- Use destination-matched CTA language. Hero CTA label, hero CTA link id, and the first `cta_blocks` label/link id/`placement: "hero"` must match unless an explicit reviewed mapping exists.
- Benefits must describe buyer outcomes and product-fit decision factors, not site mechanics.
- Limitations must name who is affected and what to verify or do next. Generic limitations such as "pricing may change" fail unless tied to a page-specific decision risk.
- FAQ exists to answer remaining pre-click buyer friction. Default to 4-7 questions. Use 2 only with explicit justification. Do not use generic process-disclaimer FAQs as filler.
- Use at least 2 benefits. Use `how_it_works: []` or exactly 3 product-use steps.
- Keep copy concise and scannable: short H1, 1-2 sentence subheadline, short benefit cards, and FAQ answers that answer directly in the first sentence.
- Treat `quality_scores` as provisional signals derived from resolved evidence. Never copy score signatures across sibling drafts without explicit justification.

## Artistic Presentation Contract

Each new draft uses an original visual system. Custom composition, typography, imagery, and GSAP motion are first-class implementation choices. Preserve semantic structure, CTA clarity, disclosure visibility, keyboard access, contrast, and reduced-motion behavior; do not reintroduce a token registry or fixed presentation profile as a release gate.

## Hard Gates

Fail and return blocked output when any condition is true:

- The brief is not eligible under the input-readiness gate.
- Required fields cannot be traced to approved brief fields and source records.
- Visible sections could fit a sibling page with only keyword swaps.
- Title, H1, CTA, first benefit, first limitation, first FAQ, or score signature repeats a sibling without explicit merge/justification.
- Material claims appear in hero, problem/solution, benefits, limitations, FAQ, CTA, proof, or meta fields without mapped evidence and allowed wording.
- Pricing, discount, free trial, guarantee, security, privacy, integration, ranking, competitor, testimonial, urgency, scarcity, or superiority claims lack claim-level evidence and approval.
- Review framing implies hands-on use, independent evaluation, testing, direct comparison, recommendation, trust, or "best" status without matching review basis and methodology.
- Disclosure is missing or not `above_first_cta`.
- Affiliate link id, source id, evidence id, destination state, active-link state, or compliance state is unresolved, or generated JSON self-attests owner approval, publication state, asset approval, active-link state, or compliance state.
- Placeholder-looking UUIDs are used.
- Hero CTA id and first CTA block affiliate id differ without reviewed mapping.
- Visual assets claim `approved` or `approved_by_owner: true` without audited owner approval.
- `schema_markup` invents unsupported or invisible structured data.
- `evidence_score` is high without proof support, or scores are copied across siblings.

## Blocked Output

When blocked, return this envelope only:

```json
{
  "status": "blocked",
  "skill": "direct-review-page-drafter",
  "reason_codes": [],
  "blocking_findings": [
    {
      "input_path": "",
      "issue": "",
      "required_fix": ""
    }
  ],
  "missing_or_unresolved_inputs": [],
  "next_action": "return_to_intent_brief",
  "recommended_action": "return_to_intent_brief",
  "source_recommended_action": "",
  "action_target": null,
  "handoff_to": "",
  "handoff_reason": ""
}
```

Allowed `next_action` and `recommended_action` values: `return_to_intent_brief`, `hold_for_design_direction`, `resolve_evidence`, `resolve_disclosure`, `resolve_destination`, `resolve_affiliate_link`, `resolve_compliance`, `merge_into_existing`, `return_to_uniqueness_review`.

Use these canonical `reason_codes` where applicable:

| Reason code | Use when |
| --- | --- |
| `missing_approved_intent_brief` | No approved `affiliate-page-intent-brief` output is supplied. |
| `ineligible_recommended_action` | The brief action is not draftable as a standalone page. |
| `missing_rewrite_target` | `rewrite_existing` has no explicit target artifact. |
| `noindex_draft_not_explicit` | `noindex_draft` is implied or requested ambiguously. |
| `hard_fail_flags_present` | The brief contains unresolved hard-fail flags. |
| `missing_record_resolution` | Required source, destination, link, disclosure, or compliance records are missing. |
| `missing_claim_manifest_inputs` | Claim inventory, claim-to-evidence map, source-to-section map, review basis, or avoid-list inputs are missing. |
| `unresolved_evidence` | Evidence is missing, stale, indirect, or unmapped for a material claim. |
| `unresolved_disclosure` | Disclosure text or placement is missing or unsafe. |
| `unresolved_destination` | Destination review or CTA continuity is unresolved. |
| `unresolved_compliance` | Program, legal, or publishing-safety state is unknown. |
| `sibling_duplicate_batch` | Sibling artifacts duplicate visible fields or score signatures. |
| `visible_field_collision` | Title, H1, CTA, benefit, limitation, FAQ, or hero value collides with a sibling. |
| `internal_process_as_public_proof` | Public copy uses owner/compliance/publishing workflow as proof for a normal product page. |
| `public_copy_uses_internal_process_proof` | Legacy alias for `internal_process_as_public_proof`; do not introduce it in new independent reviews. |
| `unsupported_sensitive_claim` | Pricing, discount, guarantee, security, privacy, integration, ranking, competitor, testimonial, urgency, scarcity, or superiority claims lack approved evidence. |
| `review_basis_overclaim` | Copy implies first-hand testing, independence, verification, trust, recommendation, or best status beyond the review basis. |
| `cta_destination_mismatch` | CTA language does not match the destination verification action. |
| `cta_id_mismatch` | Hero CTA id and first CTA block affiliate id differ without reviewed mapping. |
| `placeholder_or_self_attested_record` | Generated JSON invents or self-attests ids, approval, active-link, asset, or compliance state. |
| `inflated_or_copied_scores` | Scores exceed support bands or repeat sibling signatures without justification. |
| `schema_markup_unsupported` | Structured data is invented, invisible, or unsupported. |
| `visual_asset_unapproved` | Visual assets claim approval without audited owner approval. |

## Final Preflight

Before emitting page JSON, verify:

- JSON shape matches `pageBlueprintSchema`.
- Disclosure placement is `above_first_cta`.
- Hero CTA and first CTA block match.
- No placeholder ids or generated self-attestations.
- Renderer-visible sections carry the buyer decision and product-fit value.
- First visible fields differ from siblings for the exact reasons in the approved brief.
- Every material claim maps to approved evidence, allowed wording, and freshness requirements.
- Sensitive claims are omitted unless approved.
- Scores follow the evidence bands in `references/output-contract.md`.
- `schema_markup.faq_schema` and `schema_markup.breadcrumb_schema` are empty unless they exactly mirror supported visible content.

## Red Flags

| Rationalization | Required Response |
| --- | --- |
| "We can fill IDs later." | Block. Never invent or placeholder ids. |
| "The brief passed, so drafting must proceed." | Block if records, evidence, destination, disclosure, or sibling context are unresolved. |
| "Different slug means different page." | Block unless visible buyer value and evidence needs are distinct. |
| "The score proves evidence quality." | Scores are not evidence. Map claims to records. |
| "Generic official-site CTA is safe enough." | CTA must still match the buyer decision and destination verification action. |
| "Proof can live in hidden fields." | Critical value and friction must appear in rendered fields. |
