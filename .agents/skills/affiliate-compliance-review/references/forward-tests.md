# Affiliate Compliance Review Forward Tests

Use these tests when validating or improving `affiliate-compliance-review`. Pass raw artifacts and the skill path to subagents; do not give them the expected answer.

## Required Scanner Commands

```bash
node .agents/skills/affiliate-compliance-review/scripts/summarize-compliance-risks.mjs src/generated/landing-pages --report-only
node .agents/skills/affiliate-compliance-review/scripts/summarize-compliance-risks.mjs src/generated/landing-pages --report-only --json
node .agents/skills/affiliate-compliance-review/scripts/summarize-compliance-risks.mjs src/generated/landing-pages --target browse-ai-review.json --report-only --json
node .agents/skills/affiliate-compliance-review/scripts/summarize-compliance-risks.mjs src/generated/landing-pages --target workflow-tools-review.json --report-only --json
node .agents/skills/affiliate-compliance-review/scripts/summarize-compliance-risks.mjs src/generated/landing-pages --target codex-image-workflow-review.json --report-only --json
```

## RED Fixtures

### Browse AI Batch

Expected status: `fail`

Expected reason codes include:

- `internal_process_as_public_proof`
- `inflated_or_copied_scores`
- `self_attested_approval`
- `partnerstack_url_integrity_unknown`
- `program_rules_unknown`
- `destination_review_missing`
- `renderer_missing_rel_sponsored`

Why: the pages may have acceptable short disclosure and matching CTA IDs, and neutral pricing caveats should not hard-fail by themselves. They still use owner-review/internal-process proof, copied score signatures, manifest-published self-attestation, and external link/program/destination states that generated JSON cannot prove.

### `workflow-tools-review.json`

Expected status: `fail`

Expected reason codes include:

- `weak_affiliate_disclosure`
- `placeholder_or_self_attested_record`
- `cta_id_mismatch`
- `unsupported_sensitive_claim`
- `review_basis_overclaim`
- `evidence_score_without_proof`
- `partnerstack_url_integrity_unknown`
- `program_rules_unknown`
- `destination_review_missing`
- `renderer_missing_rel_sponsored`

Why: it has weak disclosure, placeholder IDs, mismatched CTA IDs, high evidence/compliance scores with no proof blocks, and unsupported independent/recommended/best framing.

### `codex-image-workflow-review.json`

Expected status: `fail`

Expected reason codes include:

- `weak_affiliate_disclosure`
- `self_attested_approval`
- `visual_asset_unapproved`
- `placeholder_or_self_attested_record`
- `unsupported_sensitive_claim`
- `evidence_score_without_proof`
- `claim_evidence_unresolved`
- `partnerstack_url_integrity_unknown`
- `program_rules_unknown`
- `destination_review_missing`
- `renderer_missing_rel_sponsored`

Why: it has conditional disclosure, placeholder IDs, generated JSON self-attesting visual approval, proof with missing evidence claim IDs, and no external owner/destination/link state.

## Synthetic RED Cases

- Agent receipt tamper: change any receipt-bound page, product-evidence, review, or quality artifact after the receipt is written; expect `release_authorization_missing` with a fingerprint mismatch.
- Weak disclosure: `Some links on this page are affiliate links.`
- Conditional disclosure: `This page may include affiliate links if an offer is attached.`
- Missing placement: disclosure not `above_first_cta`.
- CTA mismatch: `hero.primary_cta_link_id` differs from `cta_blocks[].affiliate_link_id`.
- Placeholder IDs: repeated `11111111`, `22222222`, `aaaaaaaa`, nil UUID, or fixture UUIDs.
- Self-attestation: `approved_by_owner: true`, `approval_status: "approved"`, `status: "published"`, `compliance_pass: true`, `affiliate_link_status: "active"`, `owner_override: true`, or generated manifest `status: "published"`.
- Evidence score `>= 70` with no proof blocks.
- Proof blocks with missing or placeholder `source_reference_id` or `evidence_claim_id`.
- Pricing/offer claim: `Get 50% off today`, `free trial`, `money-back guarantee`, `lock in this price`.
- Ranking/comparison claim: `#1`, `best`, `top`, `better than`, `vs`, `alternative to`.
- Security/privacy claim: `SOC 2`, `GDPR`, `HIPAA`, `secure`, `encrypted`, `privacy`.
- Review-basis overclaim: `independent`, `tested`, `hands-on`, `verified`, `trusted`, `recommended`, `proven`.
- Fake social proof: star ratings, review counts, customer counts, testimonials, or screenshots without proof.

## GREEN Fixtures

A page can pass only when all of these are true:

- An `agent_verified_release` may supply external state through a valid `LandingReleaseReceiptV1` whose exact URL is independently allowlisted and whose product evidence, reviews, quality receipt, and page fingerprints all verify.
- Short disclosure clearly says commission, earn, paid, compensated, or referral fee.
- Disclosure is before/near first CTA on mobile and desktop.
- Hero CTA and CTA block use the same reviewed affiliate link ID or have audited mapping.
- No placeholder IDs or generated approval self-attestation.
- Affiliate link record is active and preserves original PartnerStack/referral URL and tracking parameters.
- Program rules are reviewed and allow the page, CTA, link type, and any offer language.
- Destination review is current or owner override is audited and narrowly scoped.
- High-risk claims have claim-level evidence, freshness, usage permission, and approval.
- Evidence score is supported by proof blocks and resolved evidence records.
- Renderer/static evidence confirms affiliate links use `rel="sponsored"`.
- Neutral caveats such as "confirm pricing on the official site" do not become hard failures unless paired with a specific price, discount, trial, refund, guarantee, ranking, or urgency claim.

## Forward-Test Prompts

Use prompts like:

```text
Use $affiliate-compliance-review at .agents/skills/affiliate-compliance-review to review src/generated/landing-pages/workflow-tools-review.json for publication readiness. Run the skill scanner if appropriate. Return only the structured compliance review JSON.
```

```text
Use $affiliate-compliance-review at .agents/skills/affiliate-compliance-review to review the Browse AI generated landing-page artifacts in src/generated/landing-pages. Identify blockers and required changes. Do not edit files.
```

## Stability Targets

- Deterministic RED fixtures fail 100% of runs.
- `--target` reports only target-specific issues while preserving full scanned count.
- Reason codes remain stable across 10 reruns.
- Scanner does not hard-fail neutral official-site pricing caveats unless the page makes a specific price, discount, trial, refund, guarantee, ranking, or urgency claim.
- Unknown external records still block the gate even if the scanner finds no copy-level issues; return the exact gap to the evidence-repair route.
