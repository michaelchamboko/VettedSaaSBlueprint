# Direct Review Page Output Contract

Read this before using `direct-review-page-drafter`. The live source of truth remains `src/lib/schemas/contracts.ts`; this file summarizes fragile drafting rules agents often get wrong.

## Renderer-Visible Field Map

Visible in the current `DirectReviewPage` renderer:

- `hero.headline`
- `hero.subheadline`
- `affiliate_disclosure.short_disclosure`
- `hero.primary_cta_label`
- `hero.risk_reversal`
- fallback panel: `problem_solution.problem`, `problem_solution.solution`
- approved `hero.visual_asset`
- approved `benefits[].visual_asset`
- `benefits[].benefit_title`
- `benefits[].benefit_description`
- `how_it_works[]`
- `limitations[].limitation`
- `limitations[].mitigation`
- `faq[].question`
- `faq[].answer`

Not visibly rendered, or not visible as persuasion in the current component:

- `proof_blocks`
- `objection_handling`
- `cta_blocks[].supporting_text`
- `hero.social_proof_summary`
- most source ids and evidence ids
- `quality_scores`

Rule: put core buyer value, proof implications, objections, and friction into rendered fields first. Hidden fields support the draft; they do not rescue weak visible copy.

## Intent-To-Schema Mapping

| Schema area | Required source from approved brief |
| --- | --- |
| `metadata.target_keyword`, `metadata.search_intent` | `target_keyword`, `search_intent` |
| `metadata.title_tag`, `metadata.meta_description` | `buyer_decision`, `page_angle`, `uniqueness_field_plan`, `people_first_reason` |
| `hero.headline`, `hero.subheadline` | `buyer_decision`, `keyword_to_user_task`, `audience_segment`, `page_angle`, `journey_snapshot` |
| `hero.primary_cta_label`, `cta_blocks[]` | `cta_intent`, `official_site_verification_action`, `cta_destination_match`, `destination_continuity_notes` |
| `affiliate_disclosure` | `disclosure_plan`, `material_connection_state` |
| `problem_solution` | `jtbd_statement`, `perceived_loss_if_wrong`, `added_value_beyond_merchant`, `people_first_reason` |
| `benefits[]` | `page_specific_decision_factors`, `source_to_section_map`, claim-level allowed wording |
| `proof_blocks[]` | `claim_to_evidence_map`, `claim_inventory`, approved source/evidence records |
| `how_it_works[]` | Product-use steps from the buyer task, not site publishing workflow |
| `limitations[]` | `not_a_fit_when`, `not_for`, `first_hand_experience_boundary`, `decision_friction_map` |
| `objection_handling[]` | `objection_to_evidence_matrix`, `decision_friction_map`, destination friction |
| `faq[]` | Remaining pre-click friction, destination mismatch risks, buyer doubts, limitations |
| `quality_scores` | Resolved evidence, originality, compliance, conversion, readability, and SEO safety signals |

## Fragile-Field Matrix

| Field | Allowed source | Banned shortcut |
| --- | --- | --- |
| `hero.primary_cta_link_id` | Resolved affiliate link id from audited records | Placeholder UUID or generated JSON self-assertion |
| `cta_blocks[].affiliate_link_id` | Same as hero CTA id unless reviewed mapping exists | Mismatch without mapping |
| `source_reference_ids` | Approved source records mapped to the section claim | Reusing one source across unrelated claims |
| `proof_blocks[].evidence_claim_id` | Approved claim record for the exact claim | Score-only proof |
| `limitations[].evidence_claim_id` | Approved evidence when limitation asserts a factual claim | Generic caveat with unrelated evidence |
| `visual_asset` | Approved generated asset record with valid local path | Self-attested `approved_by_owner: true` |
| `schema_markup` | Supported structured data matching visible content | Invented review/rating/pricing/breadcrumb markup |
| `quality_scores` | Conservative scores from resolved evidence and uniqueness | Copied batch signatures |
| `metadata.robots` | Follow the approved brief or contract default for eligible `new_page` drafts; use `noindex,nofollow` only for explicit internal/noindex drafts with no publication claims | Treating any draft request as automatic noindex, using noindex to bypass evidence/compliance/link safety, or making unresolved records indexable |
| `affiliate_disclosure.placement` | Must be `above_first_cta` | Footer-only, FAQ-only, icon-only, or hover-only disclosure |

## Editorial v2 renderer contract

Future next-50 drafts must set `metadata.design_profile: "editorial_v2"`. The renderer contract for that profile is:

- `hero.answer_snippet` is required and must be 40–60 words under the H1.
- CTA labels are limited to 32 characters and contain no embedded arrow glyphs or `->` fragments.
- The primary CTA uses separate label and arrow/icon children with `flex items-center justify-between whitespace-nowrap`, a solid accent fill, and no fixed/sticky/floating mobile placement.
- The page uses a scoped loaded geometric font pairing, dark monochrome surfaces, one solid accent, and an 8px spacing grid.
- Benefits render as semantic decision cards and FAQs as accessible `<details>` rows. Blind text pills are not a valid component.
- The short disclosure remains visible before/near the first CTA. The full disclosure and secondary/legal links render in the footer. Unknown disclosure state remains a hard block.

Run `npm run scan:landing:editorial-v2 -- --json` before uniqueness, compliance, conversion, or owner review. Artifacts with the default `legacy` profile are outside this scan and remain visually unchanged.

## Evidence Rules

- Every major visible section needs product-under-review substance.
- Every material express or implied claim must map to `claim_inventory`, `claim_to_evidence_map`, and approved source/evidence records.
- Source ids can support only the section claims they are mapped to.
- Do not use testimonials, ratings, social proof, screenshots, vendor assets, or scores as substitute proof for objective claims.
- No `evidence_score` above 39 when `proof_blocks` is empty.
- No `evidence_score` above 59 when proof is indirect or non-claim-specific.
- `evidence_score` 70 or higher requires claim-level support for all material claims.
- Any unsupported sensitive claim is a hard fail, regardless of score.

## Uniqueness Rules

- First visible fields must encode the unique buyer decision.
- Same-product siblings cannot reuse title, H1, first benefit, first limitation, first FAQ, or CTA label without explicit merge/justification.
- The page must differ by buyer task, evidence need, limitation, CTA verification action, and decision friction, not just keyword or slug.
- The Browse AI duplicate batch is the permanent RED fixture.

## Compliance Rules

Ban these unless claim-level evidence and approval exist:

- Pricing, discounts, free trials, guarantees, refunds.
- Rankings, "best", "#1", recommendations, superiority, alternatives, or competitor comparisons.
- Security, privacy, compliance, integrations, geo availability.
- Customer counts, review scores, performance outcomes.
- Testimonials, ratings, urgency, scarcity, screenshots, or vendor assets as proof.

Gate these terms: `independent`, `best`, `recommended`, `trusted`, `evidence-backed`, `direct comparison`, `hands-on`, `tested`, `verified`, `guaranteed`.

Use `official` carefully:

- Allowed: neutral destination phrases such as "official site", "official setup page", or "official offer page" when destination review supports that the CTA leads to the product's own destination.
- Block unless approved: "officially approved", "official recommendation", "official partner", "officially verified", or any wording that implies endorsement, authorization, preferential status, or completed verification.

Do not use public-facing internal governance/process proof such as owner approval, compliance checks, publication gates, affiliate-link vaults, or destination-review workflow unless the approved page intent is specifically about that workflow.

## CTA And Disclosure Contract

- Disclosure placement must be `above_first_cta`.
- Hero CTA label and first CTA block label must match unless reviewed mapping exists.
- Hero CTA link id and first CTA block affiliate link id must match unless reviewed mapping exists.
- CTA must preview the destination verification action, often with neutral official-site language.
- Use generic destination or official-site CTA language unless current pricing/current-offer evidence is approved.
- Do not claim PartnerStack preservation, active link state, or destination truth without audited records.

## Schema Markup

Default to:

```json
{
  "faq_schema": {},
  "breadcrumb_schema": {}
}
```

Only emit non-empty structured data when it exactly matches visible page content and a supported type. Do not invent review, rating, pricing, FAQ, or breadcrumb markup for SEO decoration.
