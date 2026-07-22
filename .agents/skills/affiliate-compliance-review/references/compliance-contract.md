# Affiliate Compliance Review Contract

Use this contract after running `summarize-compliance-risks.mjs`. The scanner catches deterministic artifact risk; this rubric decides publication-readiness against external records and rendered/static evidence.

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
    "external_records_reviewed": []
  },
  "scanner_result": {
    "status": "not_run",
    "summary": {}
  },
  "disclosure_review": {
    "status": "fail",
    "visible_before_first_cta": false,
    "short_disclosure_assessment": "",
    "required_changes": []
  },
  "claim_risks": [],
  "evidence_review": {
    "status": "fail",
    "score_assessment": "",
    "unresolved_claims": [],
    "source_usage_gaps": []
  },
  "partnerstack_review": {
    "status": "fail",
    "affiliate_link_state": "unknown",
    "program_rules_state": "unknown",
    "url_integrity_state": "unknown",
    "required_changes": []
  },
  "destination_review": {
    "status": "fail",
    "current_review_state": "unknown",
    "owner_override_state": "none",
    "message_match_gaps": [],
    "required_changes": []
  },
  "artifact_qa": {
    "status": "fail",
    "placeholder_records": [],
    "self_attested_records": [],
    "cta_mapping_gaps": []
  },
  "renderer_static_gates": {
    "status": "fail",
    "disclosure_visibility_state": "unknown",
    "rel_sponsored_state": "unknown",
    "required_changes": []
  },
  "hard_gate_failures": [],
  "required_changes": [],
  "recommended_action": "resolve_external_records",
  "source_recommended_action": "",
  "action_target": null,
  "handoff_to": "",
  "handoff_reason": ""
}
```

Allowed values:

- `status`: `pass`, `fail`
- `publish_readiness`: `blocked`, `eligible_for_conversion_review`
- `recommended_action`: `pass`, `revise_copy`, `resolve_external_records`, `return_to_drafter`, `reject`, `static_renderer_fix_required`

`publish_readiness` may be `eligible_for_conversion_review` only when every pre-owner hard gate passes, the scanner is pass or report-only with no blockers, and external source-of-truth records prove disclosure, link, program, evidence, and destination states. Missing final owner approval blocks final publication readiness, first publication, high-risk changes, and asset approval, but it does not by itself block pre-owner conversion review unless generated JSON self-attests approval or publication. Do not use compliance output to claim final owner-review eligibility; `conversion-copy-review` owns `eligible_for_owner_review`.

## Reason Codes

Use these stable codes. Do not rename a code without a schema version bump.

| Reason code | Use when |
| --- | --- |
| `unresolved_disclosure` | Disclosure is missing or rendered/static visibility cannot be proven. |
| `weak_affiliate_disclosure` | Visible disclosure lacks plain commission, paid, compensated, earn, or referral-fee language. |
| `missing_visible_disclosure` | The visible short disclosure is empty or absent. |
| `disclosure_not_before_first_cta` | Disclosure placement is not before or near the first affiliate CTA, or mobile/desktop order is unknown. |
| `unresolved_affiliate_link` | Affiliate CTA exists but active link state, redirect review, or reviewed mapping is missing. |
| `partnerstack_url_not_preserved` | Original PartnerStack/referral URL or tracking parameters changed. |
| `partnerstack_url_integrity_unknown` | Original referral URL preservation cannot be proven from external records. |
| `unresolved_program_rules` | Program restrictions, deep-link rules, coupon rules, paid-ad rules, or disclosure rules are unknown. |
| `program_rules_unknown` | Same as unresolved program rules; use when scanner emits a generic missing-state finding. |
| `unresolved_destination` | Destination review, final visible destination, or message match is unknown. |
| `destination_review_missing` | No current destination review and no audited owner override. |
| `owner_override_insufficient` | Owner override is missing audit metadata or is used to bypass non-overridable gates. |
| `unsupported_sensitive_claim` | Pricing, discount, guarantee, security, privacy, ranking, comparison, urgency, or superiority claim lacks support. |
| `high_risk_claim_unapproved` | A high-risk claim lacks claim-level evidence, usage permission, freshness, or manual approval. |
| `high_risk_claim_without_evidence` | Scanner found high-risk language and no matching evidence record is available. |
| `review_basis_overclaim` | Copy implies first-hand testing, independent judgment, verification, trust, recommendation, or best status without basis. |
| `fake_review_or_social_proof_risk` | Testimonials, ratings, review counts, customers, users-love copy, screenshots, or social proof lack proof. |
| `testimonial_or_rating_risk` | Similar to fake review/social proof risk; use for rating/testimonial-specific blockers. |
| `placeholder_or_self_attested_record` | Generated JSON invents placeholder IDs or approval/compliance/active-link/published state. |
| `self_attested_approval` | Artifact claims owner approval, compliance pass, published state, owner override, active link, or asset approval. |
| `visual_asset_unapproved` | Visual asset approval is self-attested or not backed by audited owner records. |
| `owner_approval_missing` | First publication, major rewrite, strong claim, asset use, or recommendation direction lacks owner approval. |
| `inflated_or_copied_scores` | Scores are high, repeated, or unsupported by proof/evidence records. |
| `evidence_score_without_proof` | `evidence_score >= 70` but proof blocks or claim-level evidence are missing/unresolved. |
| `claim_evidence_unresolved` | Source/evidence IDs do not resolve to usage-allowed, current, approved records. |
| `cta_id_mismatch` | Hero CTA id differs from CTA block affiliate id without reviewed mapping. |
| `cta_destination_mismatch` | CTA label/supporting copy promises something not verified at the final destination. |
| `internal_process_as_public_proof` | Public copy uses owner review, compliance gates, affiliate vaults, or destination-review workflow as product proof. |
| `renderer_missing_rel_sponsored` | Rendered affiliate CTA lacks `rel="sponsored"` or static evidence is missing. |
| `thin_affiliate_review_risk` | Page is thin, scaled, generic, or mainly a keyword swap without useful review substance. |

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
- `cta_blocks[].label`
- `cta_blocks[].supporting_text`
- `faq[].question`
- `faq[].answer`

Hidden fields such as `proof_blocks`, source IDs, evidence IDs, schema markup, `quality_scores`, and asset approval fields support review but do not make public copy compliant by themselves.

## Source Of Truth

Generated page JSON is draft content only. It cannot prove:

- owner approval;
- compliance pass state;
- published state;
- active affiliate link state;
- original referral URL preservation;
- PartnerStack program-rule review;
- source usage permission;
- claim approval;
- destination review;
- visual asset approval.

Generated manifests such as `src/generated/landing-pages/index.json` also cannot prove published state. Treat manifest `status: "published"` or similar generated state as self-attestation unless an audited owner/gate record is supplied.

Require audited records for these states when they are in scope. Missing link, program, source, claim, destination, disclosure, or compliance records block `eligible_for_conversion_review`. Missing final owner approval blocks final publication readiness, not pre-owner conversion review, unless generated JSON self-attests approval or publication.

## FTC Disclosure Rules

- The visible short disclosure must clearly communicate the material connection using plain commission, paid, compensated, earn, or referral-fee language.
- The disclosure must appear before or near the first affiliate CTA and be visible on mobile and desktop.
- Footer-only, legal-page-only, hover-only, modal-only, hidden, collapsed, or click-to-reveal disclosure fails.
- "Affiliate link" alone, "commissionable link", "partner link", "sponsored links", or conditional wording such as "may include affiliate links if..." is weak when an affiliate CTA exists.
- A valid disclosure does not replace claim substantiation, PartnerStack rules, or link integrity.

## FTC Substantiation And Review Integrity

- Objective claims need a reasonable basis before publication.
- Block claims about pricing, savings, rankings, performance, security, privacy, integrations, customer counts, ratings, or superiority unless claim-level evidence exists before publication.
- Do not imply hands-on use, testing, independent review, verification, trusted status, recommendation, or "best" status without a review-basis record.
- Do not publish fake testimonials, invented reviewers, star ratings, review counts, customer counts, screenshots, or social proof.

## Google Review And Affiliate Quality

- Require people-first review substance: useful decision factors, drawbacks, fit/non-fit guidance, and evidence-backed analysis.
- Block thin affiliate, scaled-content, doorway, or sibling keyword-swap pages.
- Affiliate outbound links must be qualified in rendered output with `rel="sponsored"`; `nofollow sponsored` is acceptable.
- `rel="sponsored"` is not a consumer-facing disclosure and does not satisfy FTC disclosure rules.
- Review/rating structured data must match visible, supported review content.

## PartnerStack And Link Rules

- Preserve the original PartnerStack/referral URL and tracking parameters exactly.
- Store the final destination as destination-review evidence, not as a replacement for the original referral URL.
- Block if active link state, program rules, custom/deep-link permission, coupon rules, discount permission, or paid-ad/brand-bidding rules are unknown.
- Hero CTA id and CTA block affiliate id must match unless an audited mapping exists.
- Generated JSON with only an `affiliate_link_id` is not enough to prove active link or URL integrity.

## Evidence Ledger Rules

- Scores are advisory. They do not prove compliance.
- `evidence_score < 70` fails publication readiness.
- `evidence_score >= 70` requires proof blocks plus claim-level evidence for every material visible claim.
- Source IDs must resolve to current, usage-allowed sources.
- Evidence claim IDs must resolve to usage-allowed, approved claim records.
- Evidence freshness must match claim risk; pricing, offer, trial, discount, guarantee, security, privacy, compliance, ranking, and comparison claims require current evidence and approval.
- Internal process proof, such as owner review or compliance gates, cannot be used as product proof for the visitor.

## Destination Review Rules

- Require a current destination review or an audited owner override.
- Owner override can cover a missing destination review only when explicitly scoped; it cannot bypass disclosure, active link, program rules, suspicious redirects, unsupported claims, self-attestation, or fake social proof.
- CTA copy must not promise more than the final visible destination offers.
- Pricing, trial, discount, refund, guarantee, money-back, urgency, or scarcity claims require destination match, claim-level evidence, freshness, and approval.
- Redirect chain should start with the original referral URL and end at the reviewed final destination.

## Pass Standard

A page passes only if:

- deterministic scanner blockers are absent;
- visible disclosure is clear and before/near the first CTA;
- external records resolve link, program, source, evidence, destination, and any asset state used by the draft;
- final owner approval is resolved when final publication readiness, first publication, high-risk changes, or asset approval is in scope;
- high-risk claims are supported and approved;
- no generated artifact self-attests approval or publication;
- rendered/static checks confirm disclosure visibility and sponsored affiliate links;
- recommended action is `pass`.

## Source Rationale

- FTC Endorsement Guides and staff FAQs: disclose material affiliate relationships clearly, conspicuously, and near endorsement/CTA.
- FTC Advertising Substantiation Policy: objective express and implied claims need a reasonable basis before publication.
- FTC Consumer Reviews and Testimonials Rule: fake or misleading reviews, testimonials, ratings, and falsely independent review sites are high-risk.
- Google Search Central: high-quality reviews need user-centered evidence and decision usefulness; affiliate/paid links should use `rel="sponsored"`; spam policies target scaled, thin, and doorway content.
- Project PRD sections 18, 24, 25, and 26: compliance is default-deny; unknown state blocks publication.
