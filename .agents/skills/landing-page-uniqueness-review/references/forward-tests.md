# Landing Page Uniqueness Forward Tests

Use these cases after substantial edits to `landing-page-uniqueness-review` or its scanner. Pass raw artifacts, sibling pages, and intent briefs. Do not provide expected answers to the test agent unless grading the result.

## Reliability Targets

- Deterministic RED fixtures fail 100% of runs.
- Semantic RED fixtures fail at least 95% of runs.
- GREEN fixtures pass at least 85% of runs.
- Reason-code sets remain stable across repeated runs.
- Any miss becomes a `landing-page-batch-retro` update trigger.

## Required Commands

```powershell
node .agents/skills/landing-page-uniqueness-review/scripts/summarize-page-duplicates.mjs src/generated/landing-pages --report-only
node .agents/skills/landing-page-uniqueness-review/scripts/summarize-page-duplicates.mjs src/generated/landing-pages --report-only --json
node .agents/skills/landing-page-uniqueness-review/scripts/summarize-page-duplicates.mjs src/generated/landing-pages --target browse-ai-review.json --report-only
```

## RED Cases

| Case | Input pattern | Expected result |
| --- | --- | --- |
| Browse AI duplicate batch | Ten same-product variants repeat title, H1, CTA, first benefit, first limitation, first FAQ, proof angle, and score signature. | Fail with `exact_field_collision`, `thin_keyword_swap`, `same_intent_sibling`, and `copied_score_signature`. |
| Keyword-only variant | New slug differs from sibling only by modifier while buyer task and CTA are the same. | Fail with `thin_keyword_swap`. |
| Near-duplicate visible copy | Titles differ but subheadline, problem/solution, benefits, limitations, and FAQ are normalized near matches. | Fail with `near_duplicate_copy`. |
| Same-intent sibling | Same product, same actor, same decision moment, same CTA verification action, and same proof need. | Fail with `same_intent_sibling`; recommend merge or reject. |
| Audience-only variant | Industry/persona changes but risk, proof, limitation, CTA, and FAQ stay generic. | Fail with `thin_keyword_swap` or `unsupported_reason_to_exist`. |
| Generic CTA reuse | CTA such as "Visit the official offer" repeats and does not preview a page-specific verification action. | Fail with `generic_cta_reuse`. |
| Generic limitation reuse | First limitation is "Vendor pricing and terms can change" across siblings. | Fail with `generic_limitation_reuse` unless tied to distinct risk. |
| Generic FAQ reuse | First FAQ is disclosure or official-page boilerplate across siblings. | Fail with `generic_faq_reuse`. |
| Internal process proof | Public copy uses owner review, publication gates, compliance checks, or affiliate vault as product proof. | Fail with `internal_process_as_public_proof`. |
| Copied score signature | Quality-score signature repeats or all score deltas are within five points without audited rationale. | Fail with `copied_score_signature` or `inflated_or_copied_scores`. |
| Placeholder records | Placeholder UUIDs, generated self-approval, or active-link/compliance self-attestation appear. | Fail with `placeholder_or_self_attested_record`. |
| CTA ID mismatch | Hero CTA id differs from first CTA block affiliate id without reviewed mapping. | Fail with `cta_id_mismatch`. |
| Evidence score without proof | `evidence_score >= 70` and `proof_blocks` is empty or unresolved. | Fail with `inflated_or_copied_scores`. |
| Weak disclosure | Affiliate CTA exists but visible disclosure is vague or conditional. | Fail with `weak_affiliate_disclosure`. |
| Unsupported comparison | Alternative/vs/best/ranking page lacks methodology and comparison evidence. | Fail with `unsupported_sensitive_claim` or `review_basis_overclaim`. |

## GREEN Cases

| Case | Input pattern | Expected result |
| --- | --- | --- |
| Distinct use-case sibling | Same product but distinct actor, trigger, task, constraint, evidence cluster, limitation, FAQ friction, and CTA verification action. | Pass if scanner has no hard findings. |
| Mergeable support section | Keyword is useful but belongs inside an existing review. | Standalone fail, `recommended_action: merge_into_existing`. |
| Rewrite owned intent | Existing sibling owns the decision but visible copy can be improved. | Fail standalone, `recommended_action: rewrite_visible_fields` or `return_to_intent_brief`. |
| Safe decision-stage page | Pricing, demo, setup, or integration page has fresh evidence, destination match, and page-specific limitation. | Pass if no sensitive unsupported claims. |
| Conservative sparse-evidence page | Copy is low-risk, avoids sensitive claims, uses capped scores, and still has distinct buyer decision. | Pass if evidence limits are explicit. |
| Legitimate shared CTA destination | Same affiliate destination but CTA labels/supporting visible context differ by verification action. | Pass if not generic and IDs match. |

## Browse AI Calibration

The Browse AI batch must remain a permanent RED fixture. Correct scanner output should include:

- duplicate title group
- duplicate H1 group
- duplicate CTA group
- duplicate first benefit group
- duplicate first limitation group
- duplicate first FAQ group
- duplicate exact score group
- near-duplicate visible-copy or composite-fingerprint findings

Correct manual review should classify the batch as `doorway_scaled_variant` or `exact_duplicate` and recommend `merge_into_existing`, `noindex_draft`, or `reject`, not broad publication.

## Forward-Test Prompts

- `Use $landing-page-uniqueness-review to review these generated landing-page artifacts for duplicate intent and publish-readiness blockers. Return only the structured review JSON.`
- `Use $landing-page-uniqueness-review on this same-product batch. Stop if the pages differ mainly by keyword or visible-field rewrites.`
- `Use $landing-page-uniqueness-review on this target artifact and its siblings. Include the closest sibling, intent overlap classification, and required changes.`
- `Use $landing-page-uniqueness-review on this page with placeholder IDs, CTA mismatch, and high evidence score. Return pass/fail and reason codes.`

## Source Rationale

- Google review/helpful/spam guidance supports blocking thin affiliate, scaled, and doorway patterns.
- FTC endorsement/substantiation guidance supports disclosure and proof-related blockers.
- NN/g and Baymard guidance supports scan-path, information-scent, FAQ, and decision-friction checks.
- OpenAI and Anthropic eval guidance supports stable RED/GREEN fixtures and regression checks.
