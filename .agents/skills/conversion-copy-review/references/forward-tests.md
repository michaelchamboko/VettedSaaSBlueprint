# Conversion Copy Review Forward Tests

Use these cases after substantial edits to `conversion-copy-review` or its scanner. Pass raw page artifacts, intent briefs, destination notes, evidence notes, sibling summaries, uniqueness output, and compliance output. Do not pass expected answers unless grading the returned result.

## Reliability Targets

- Deterministic RED fixtures fail 100% of runs.
- Semantic RED fixtures fail at least 95% of runs.
- GREEN fixtures pass at least 85% of runs.
- Ten reruns of the same fixture keep pass/fail stable at least 90% of the time.
- Required reason-code coverage for semantic RED cases is at least 90%.
- High-risk false passes are 0.
- Failed reviews always include non-empty `required_rewrites` or `boundary_escalations`.

## Required Commands

```powershell
node .agents/skills/conversion-copy-review/scripts/summarize-conversion-copy-risks.mjs src/generated/landing-pages --report-only
node .agents/skills/conversion-copy-review/scripts/summarize-conversion-copy-risks.mjs src/generated/landing-pages --report-only --json
node .agents/skills/conversion-copy-review/scripts/summarize-conversion-copy-risks.mjs src/generated/landing-pages --target browse-ai-review.json --report-only
```

The existing uniqueness scanner remains useful for sibling collision context:

```powershell
node .agents/skills/landing-page-uniqueness-review/scripts/summarize-page-duplicates.mjs src/generated/landing-pages --report-only
```

## RED Cases

| Case | Input pattern | Expected result |
| --- | --- | --- |
| Browse AI duplicate batch | Same-product variants repeat H1, CTA, first benefit, first limitation, first FAQ, proof angle, and score patterns. | Fail with `sibling_pattern_reuse`, plus field-specific generic findings where visible copy is interchangeable. |
| Generic hero | Hero could fit any SaaS product with a keyword swap. | Fail with `generic_hero` and `vague_buyer_decision`. |
| Site workflow proof | Public copy uses owner approval, compliance checks, affiliate vault, publication gates, or destination-review workflow as product proof. | Fail with `internal_process_as_public_proof`; scanner aliases may still report `site_workflow_over_product_decision`. |
| CTA/evidence mismatch | Hero CTA id differs from first CTA block id, or CTA promises pricing/trial/discount without destination support. | Fail with `rewrite_requires_prior_gate` or `cta_destination_mismatch`. |
| Weak disclosure/CTA relationship | Disclosure exists but is vague, buried, detached from first CTA, or unclear on mobile. | Fail with `weak_disclosure_cta_relationship`. |
| Generic benefits | Benefits praise the product broadly but do not answer the buyer's task, constraint, or product-fit decision. | Fail with `generic_benefit_copy`. |
| FAQ filler | FAQ answers affiliate mechanics, generic reassurance, or "is this worth it" without real pre-click friction. | Fail with `generic_objection_faq`. |
| Generic limitation | Limitation says only "pricing may change" or equivalent boilerplate. | Fail with `generic_limitation`. |
| Hidden proof dependency | Core value appears in `proof_blocks`, `objection_handling`, source IDs, or scores but not in rendered fields. | Fail with `hidden_value_dependency`. |
| Unsupported pressure | Copy uses urgency, scarcity, "best", "#1", guaranteed, proven, trusted, or official endorsement language without prior approval. | Fail with `unsupported_hype_or_pressure` or `overclaimed_independence`. |
| Unverifiable social proof | Copy uses testimonials, ratings, review counts, "trusted by thousands", or review summaries without source/date/context. | Fail with `unverifiable_social_proof`. |
| Destination continuity gap | CTA says "Start free trial" but destination notes show only a demo or pricing page. | Fail with `cta_destination_mismatch` and `destination_continuity_gap`. |
| Missing prior gate context | Page JSON is supplied without intent, uniqueness, compliance, destination, evidence, or sibling context. | Block with `missing_required_context`. |

## GREEN Cases

| Case | Input pattern | Expected result |
| --- | --- | --- |
| Concrete buyer decision | Page names a specific buyer task, audience, constraint, CTA verification action, benefit, limitation, and FAQ friction. | Pass with `publish_readiness: eligible_for_owner_review`. |
| Distinct same-product sibling pair | Two same-product pages differ by actor, trigger, task, evidence need, limitation, FAQ, and CTA verification action. | Pass if prior uniqueness and compliance gates are present. |
| Sparse evidence conservative copy | Evidence is limited but copy avoids sensitive claims and gives a useful low-risk official-site verification path. | Pass if limitations and owner caveats are explicit. |
| Same destination, distinct CTA intent | Same affiliate destination is used, but CTA label and visible context match a page-specific verification action. | Pass if IDs are reviewed and CTA copy does not overpromise. |
| Honest limitation | Limitation names who is affected, what risk matters, and what to verify next. | Pass when it increases trust rather than weakening persuasion. |
| Pricing caveat | Copy says to verify current pricing or plan terms on the official site without stating a concrete price, discount, trial, or guarantee. | Pass if destination notes support the official-site verification action. |
| Fallback hero card | No approved visual asset exists, so rendered `problem_solution` fields carry product-fit value clearly. | Pass if first viewport still communicates the decision. |

## Regression Fixtures

- Browse AI batch: permanent RED for sibling pattern reuse and keyword-swap conversion value.
- `workflow-tools-review.json`: useful RED for CTA/link or evidence-support risks.
- `codex-image-workflow-review.json`: useful RED when generated artifacts self-attest asset approval.
- Any artifact that claims published, owner-approved, active-link, compliance-pass, asset-approved, official endorsement, or verified status without audited external records must fail or escalate.

## Grading Guidance

Assert:

- Expected `status`.
- Required reason codes.
- Forbidden reason codes.
- Allowed `recommended_action`.
- Non-empty `required_rewrites` for copy failures.
- Non-empty `boundary_escalations` for prior-gate failures.
- No unknown reason codes.

Do not assert exact prose in findings. Require field paths, issues, and acceptance checks instead.

## Forward-Test Prompts

- `Use $conversion-copy-review to review this page draft, approved intent brief, destination notes, evidence notes, uniqueness output, compliance output, and sibling summaries. Return only the structured review JSON.`
- `Use $conversion-copy-review on this same-product batch. Fail if the conversion value mainly differs by keyword or repeated section patterns.`
- `Use $conversion-copy-review on this draft where the hero is specific but benefits, FAQ, and limitations are generic.`
- `Use $conversion-copy-review on this sparse-evidence page. Pass only if the copy stays conservative, useful, and destination-matched.`
- `Use $conversion-copy-review on this page where the first mobile viewport has weak disclosure/CTA relationship.`
- `Use $conversion-copy-review on this page that uses internal owner approval and compliance checks as public proof.`

## Source Rationale

- Google review/helpful/spam guidance supports buyer-useful, original, evidence-backed review content and blocks thin affiliate variants.
- FTC endorsement and disclosure guidance supports clear material connection, substantiated claims, and avoiding misleading net impression.
- NN/g information scent and scanning guidance supports first-viewport clarity, specific CTA labels, concise objective copy, and real FAQs.
- Baymard product-page UX guidance supports unanswered-question reduction, product-fit content, limitations, and mobile friction reduction.
- JTBD and Fogg behavior guidance supports buyer job clarity, motivation/ability/prompt fit, and ethical friction reduction.
