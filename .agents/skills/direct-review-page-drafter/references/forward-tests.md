# Direct Review Page Drafter Forward Tests

Use these cases after substantial edits to `direct-review-page-drafter`. Pass raw approved briefs, records, sibling summaries, and artifacts. Do not provide expected answers to the test agent unless grading the result.

## Reliability Targets

- Deterministic RED preflight failures: 100%.
- Semantic RED failures: at least 95%.
- GREEN pass rate: at least 85%.
- Unsupported risky claims: 0.
- Batch hard-field collisions after drafting: 0.
- Unjustified identical score signatures: 0.
- Ten reruns of the same fixture keep pass/fail stable at least 90% of the time and score deltas within five points.

## RED Cases

| Case | Input Pattern | Expected Result |
| --- | --- | --- |
| Non-pass brief | Intent brief status is `fail` or missing. | Blocked output; no page JSON. |
| Wrong disposition | Brief action is `merge_into_existing`, `hold_for_evidence`, or `reject`. | Blocked output with `next_action` and `recommended_action` matching the disposition. |
| Hard fail flags | Brief has non-empty `hard_fail_flags`. | Blocked output listing the flags. |
| Unresolved records | Evidence, disclosure, destination, affiliate link, or compliance records exist only inside generated JSON. | Blocked output with unresolved inputs. |
| Browse AI duplicate batch | Same-product Browse AI variants repeat title, H1, CTA, first benefit, first limitation, first FAQ, and scores. | Blocked or merge/noindex/reject path; no standalone publish-style page JSON batch. |
| Unsupported sensitive claims | Brief or draft asks for pricing, security, privacy, ranking, guarantee, discount, or competitor copy without claim-level evidence. | Blocked output or draft omits claim and uses conservative scores. |
| Fake proof | Draft would use testimonials, ratings, screenshots, urgency, scarcity, vendor assets, or social proof as objective support. | Blocked output. |
| Internal workflow copy | Visible fields talk mainly about affiliate vaults, publication checks, compliance gates, or destination-review workflow for a normal product page. | Blocked output. |
| CTA/link/id failure | CTA id mismatch, placeholder UUID, generic CTA without official-site verification action, or active-link self-attestation. | Blocked output. |
| Inflated or copied scores | `evidence_score >= 70` with no claim-level proof, or identical score signatures across sibling drafts. | Blocked output or capped scores with justification. |
| Ambiguous noindex request | User asks for a normal page JSON draft but the brief action is `new_page`. | Valid draft must not infer internal/noindex mode solely from the word "draft". |
| Risky official wording | Copy implies official approval, official recommendation, official partner status, or official verification without program evidence. | Blocked output or wording rewritten to neutral destination language. |

## GREEN Cases

| Case | Input Pattern | Expected Result |
| --- | --- | --- |
| Approved new page | Brief has `status: pass`, `recommended_action: new_page`, resolved records, distinct buyer task, and mapped evidence. | Valid page JSON with visible buyer value and no hard-gate issues. |
| Rewrite existing | Brief has `recommended_action: rewrite_existing` and an explicit target artifact. | Valid page JSON for the target or blocked output if records are unresolved. |
| Internal noindex draft | Brief or user explicitly sets `recommended_action: noindex_draft` or internal/noindex draft mode, with no publish claims and `metadata.robots: "noindex,nofollow"`. | Valid noindex draft if evidence/disclosure/link safety are adequate. |
| Sparse evidence safe CTA | Evidence is limited but enough for low-risk copy; no sensitive claims. | Conservative page JSON, generic official-site verification CTA, capped scores. |
| Neutral official destination CTA | Destination review confirms the CTA points to the product's own site, with no endorsement or verification claim. | Valid page JSON may use neutral "official site/page" language. |
| Distinct same-product sibling | Same product, but buyer task, proof needs, limitation, CTA verification action, and FAQ friction are distinct. | Valid page JSON with non-colliding visible fields. |
| First-hand boundary respected | Review basis is public research or vendor docs only. | Draft avoids hands-on/tested/independent/best language and states only supported claims. |

## Forward-Test Prompts

- `Use $direct-review-page-drafter to draft direct-review page JSON from this approved brief and sibling summary. Return only valid page JSON or blocked output.`
- `Use $direct-review-page-drafter on these three same-product Browse AI briefs. Stop if the pages would duplicate visible buyer value.`
- `Use $direct-review-page-drafter on this brief with unresolved pricing and security claims. Return blocked output or a draft that omits unsupported claims and caps scores.`
- `Use $direct-review-page-drafter to redraft this existing page from the approved rewrite brief. Preserve only claims supported by the supplied records.`

## Regression Fixtures

- Browse AI batch: must fail as standalone page batch.
- `workflow-tools-review.json`: must fail on CTA id mismatch, placeholder ids, and high evidence score without proof.
- `codex-image-workflow-review.json`: must fail if generated assets self-attest owner approval.
- Any generated artifact that claims published, owner-approved, active-link, compliance-pass, or asset-approved state without audited records must fail.

## Source Rationale

- Google people-first and review guidance support product-under-review substance, original evidence, and buyer-useful review material.
- Google spam policies support blocking scaled, doorway, and thin affiliate page patterns.
- FTC endorsement/disclosure and substantiation guidance support disclosure proximity, material-connection clarity, and claim-level evidence.
- NN/g and Baymard UX guidance support scannable copy, information scent, visible product-fit answers, and buyer-friction FAQs.
- Eval guidance supports stable RED/GREEN fixtures and measurable pass/fail targets.
