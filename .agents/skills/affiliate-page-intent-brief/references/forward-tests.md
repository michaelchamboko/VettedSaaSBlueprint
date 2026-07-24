# Affiliate Page Intent Brief Forward Tests

Use these cases to pressure-test `affiliate-page-intent-brief` after edits or batch retros. Pass raw product, keyword, evidence, destination, and sibling artifacts to the test agent. Do not provide the expected answer unless grading the returned result.

## Reliability Targets

- Browse AI calibration fixture fails 100% of runs.
- RED cases fail at least 95% of runs.
- GREEN cases pass at least 85% of runs.
- Repeated pass/fail on the same case should stay stable, with rubric scores within five points.
- Any miss becomes a `landing-page-batch-retro` update trigger.

## RED Cases

| Case | Input Pattern | Expected Result |
| --- | --- | --- |
| Browse AI duplicate batch | Same product with 10 keyword variants repeating title, H1, CTA, proof summary, first benefit, limitation, FAQ, and score signature. | `status: fail`; duplicate, thin-affiliate, scaled-content, and sibling-collision flags; `recommended_action: merge_into_existing` or `reject`. |
| Keyword-only variant | New slug differs from a published sibling only by modifier, while buyer task and CTA are the same. | Fail for non-distinct JTBD and sibling collision. |
| Vague intent | Target decision is "learn about Product" or "see if Product is good." | Fail for vague buyer decision. |
| Unsupported pricing | Keyword promises pricing, discounts, free trial, or current offer without fresh source and destination confirmation. | Fail or hold for evidence; no pricing CTA. |
| Unsupported ranking | Page claims "best", "top", "better than", "alternative to", or "vs" without methodology and comparison sources. | Fail for missing methodology and claim evidence. |
| Missing destination review | Destination notes are missing and there is no explicit owner override. | Fail with destination review in `required_changes`. |
| Destination mismatch | Page promises "free trial" but destination only supports "book demo." | Fail for CTA/destination mismatch. |
| Testimonial-only proof | Material claim relies only on rating, testimonial, or social proof. | Fail for insufficient objective evidence. |
| First-hand overclaim | Brief says "tested", "hands-on", or "we found" but review basis is public research only. | Fail for review-basis mismatch. |
| Generic limitation | Limitation could apply to every SaaS page, such as "pricing may change." | Fail unless a page-specific limitation is added. |
| Generic CTA | CTA is "Get Started", "Learn More", or "Try It Now" without a specific official-site verification action. | Fail or require safer CTA intent. |
| Missing disclosure plan | Material connection is known but disclosure wording, placement, or mobile visibility is absent. | Fail for compliance readiness. |
| Dark-pattern pressure | Intent relies on urgency, scarcity, hidden disclosure, fake proof, shame, or pressure. | Fail for ethical persuasion boundary. |
| Placeholder records | Affiliate/source/evidence ids are placeholder-like, unresolved, or self-attested by generated content. | Fail for unresolved record state. |
| Batch without map | Same-product batch has multiple proposed pages but no batch intent map. | Fail until the map proves non-overlapping buyer decisions and proof needs. |
| Generated self-approval | Generated JSON claims published, approved, compliant, active-link, or asset-approved state without audited external records. | Fail for self-attested state. |

## GREEN Cases

| Case | Input Pattern | Expected Result |
| --- | --- | --- |
| Distinct use-case page | Product has a specific buyer role, task, constraint, destination match, mapped evidence, page-specific limitation, and clear sibling contrast. | `status: pass`, `recommended_action: new_page`, score `>=85`, no hard-fail flags, downstream blocks listed. |
| Rewrite owned intent | Existing sibling owns the buyer decision, but evidence and CTA can be improved. | `status: pass` or `fail` depending evidence readiness; `recommended_action: rewrite_existing`, not `new_page`. |
| Mergeable support section | Keyword is useful but belongs as a section in an existing review page. | `status: fail` for standalone page; `recommended_action: merge_into_existing`. |
| Evidence hold | Intent is distinct, but claim evidence or destination review is missing. | `status: fail`, `recommended_action: hold_for_evidence`, precise `required_changes`. |
| Safe official-site CTA | CTA asks visitor to verify a non-risky official-site fact that the destination supports. | CTA fields pass if other hard gates pass. |
| Three-page batch | Same product has three non-overlapping buyer decisions, each with distinct proof needs, limitations, FAQs, and CTA verification actions. | Each page may pass intent only if batch map and sibling matrices prove separation. |

## Browse AI Calibration Notes

The Browse AI batch is the permanent failure fixture. A correct skill must not allow all Browse AI variants to become separate publish-ready pages when they repeat:

- Title or H1 intent.
- CTA wording or action.
- Proof summary.
- First benefit.
- First limitation.
- FAQ pattern.
- Objection pattern.
- Quality score signature.

The expected safe dispositions are `merge_into_existing`, `hold_for_evidence`, `noindex_draft`, or `reject`, depending on available evidence and owner intent. The default must not be `new_page`.

When a batch contains one plausible base review plus keyword variants, split disposition by role: the base exemplar is usually `hold_for_evidence` until source-of-truth records exist, while variants are usually `merge_into_existing`, `noindex_draft`, or `reject` unless the batch intent map proves genuinely separate buyer decisions.

## Source Rationale

- Google people-first content guidance: require page-specific value for users, not search engines.
- Google spam policies: block scaled, doorway, and thin affiliate patterns.
- Google review guidance: require original evidence, comparison logic, and decision-useful review material.
- FTC endorsement and disclosure guidance: require material-connection disclosure and claim substantiation planning.
- NN/g task, JTBD, journey, and information-scent guidance: require buyer task clarity and CTA/destination continuity.
- Evals guidance: keep RED/GREEN cases, calibration fixtures, and regression targets so skill quality improves over time.
