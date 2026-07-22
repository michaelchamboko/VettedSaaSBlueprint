# Landing Page Batch Retro Forward Tests

Use these cases after substantial edits to `landing-page-batch-retro` or after repeated correction loops. Pass raw artifacts, gate reports, scanner output, owner feedback, and prior retro findings. Do not provide expected answers to the test agent unless grading the result.

## Reliability Targets

- Deterministic RED fixtures fail 100% of runs.
- Semantic RED fixtures fail at least 95% of runs.
- GREEN fixtures pass at least 85% of runs.
- Reason-code sets remain stable across repeated runs.
- Every repeated high/critical failure becomes a fixture, deterministic check, stronger gate, or explicit owner-approved deferral.
- `next_batch_cap` does not increase while unresolved recurring failures remain.

## Required Scanner Commands

Run these when generated artifacts exist and local Node execution is allowed by the current workflow:

```powershell
node .agents/skills/landing-page-uniqueness-review/scripts/summarize-page-duplicates.mjs src/generated/landing-pages --report-only
node .agents/skills/landing-page-uniqueness-review/scripts/summarize-page-duplicates.mjs src/generated/landing-pages --report-only --json
node .agents/skills/landing-page-uniqueness-review/scripts/summarize-page-duplicates.mjs src/generated/landing-pages --target browse-ai-review.json --report-only
node .agents/skills/affiliate-compliance-review/scripts/summarize-compliance-risks.mjs src/generated/landing-pages --report-only --json
node .agents/skills/affiliate-compliance-review/scripts/summarize-compliance-risks.mjs src/generated/landing-pages --target browse-ai-review.json --report-only --json
node .agents/skills/conversion-copy-review/scripts/summarize-conversion-copy-risks.mjs src/generated/landing-pages --report-only --json
node .agents/skills/conversion-copy-review/scripts/summarize-conversion-copy-risks.mjs src/generated/landing-pages --target browse-ai-review.json --report-only --json
```

Scanner output is necessary but not sufficient. The retro still must identify process root cause, owner/action ownership, recurrence, and next-batch safety.

## RED Cases

| Case | Input pattern | Expected result |
| --- | --- | --- |
| Browse AI duplicate batch passes retro | Scanner reports repeated Browse AI title, H1, CTA, first benefit, first limitation, first FAQ, and score signatures, but retro returns `status: pass` or recommends broad batching. | Fail with duplicate/scaled/thin-affiliate reason codes; `go_no_go: "blocked"` or `exemplar_only`; next batch capped at `0` or `1`. |
| Recurring failures without updates | Retro lists duplicate, disclosure, CTA, evidence, or conversion recurrence but proposes no exact skill/process/scanner/source-record update. | Fail with `missing_regression_fixture` or process-update reason; no next batch. |
| Next batch while duplicates remain | Known duplicate intent, copied visible fields, near-duplicate copy, or copied scores remain unresolved. | Fail; require merge/reject/noindex/exemplar-only decision and target skill/scanner update. |
| Owner feedback ignored | Owner notes are supplied but omitted from actions, deferrals, or readiness decision. | Fail with `owner_feedback_ignored`. |
| Time loss blamed on artifacts only | Retro attributes cycle time only to weak drafts and ignores missing inputs, weak gates, review packet quality, or absent fixtures. | Fail with `process_handoff_gap`; require process/root-cause action. |
| Weak disclosure treated as acceptable | Disclosure exists but is vague, hidden, not before/near CTA, or lacks clear commission/material-connection language. | Fail with `weak_affiliate_disclosure` and `disclosure_quality`. |
| Generated self-attestation trusted | Generated artifact claims owner approval, compliance pass, active-link state, source/evidence proof, publication state, or asset approval. | Fail with `placeholder_or_self_attested_record`; require audited record. |
| Unsupported sensitive claims unmapped | Pricing, ranking, security, privacy, guarantee, comparison, urgency, or superiority claims appear without claim-level evidence. | Fail with `unsupported_sensitive_claim` and `claim_substantiation_gap`. |
| Review-basis overclaim recurs | Copy or brief implies tested, independent, recommended, verified, best, or hands-on review without matching basis. | Fail with `review_basis_overclaim`; require compliance/drafter/intent update. |
| Missing scanner when artifacts exist | Generated artifacts are available but no deterministic duplicate/static scanner output is provided. | Fail input readiness unless scanner is impossible and owner accepts a manual-only review cap. |
| Deferral without risk and cap | A high/critical issue is deferred without owner acceptance, expiry, risk, review trigger, and batch-cap impact. | Fail deferral discipline. |
| Fan-out without packet discipline | Multiple reviewers are used but inputs, scopes, excluded assumptions, or merge decisions are not recorded. | Fail audit trail with `process_handoff_gap`. |

## GREEN Cases

| Case | Input pattern | Expected result |
| --- | --- | --- |
| Duplicate batch correctly blocked | Browse AI-style duplicate batch has scanner findings, repeated root causes, exact downstream updates, and regression fixture actions. | `status: fail`, `go_no_go: "blocked"` or `exemplar_only`, no broad batch, exact action items. |
| Distinct same-product small batch | Three pages have distinct buyer decisions, proof needs, limitations, FAQ friction, CTA verification actions, clean scanner output, and passing gate reports. | `status: pass`, `go_no_go: "go_with_cap"`, `next_batch_cap <= 3`, audit trail complete. |
| Owner-approved safe deferral | Medium or high non-publication issue is deferred with owner risk acceptance, expiry, next review trigger, and cap. | Pass only if critical blockers are absent and cap reflects remaining risk. |
| Structural recurrence gets scanner work | Placeholder IDs, CTA mismatch, copied scores, weak disclosure, or evidence-score-without-proof repeats. | Action item targets deterministic scanner/static check or fixture, not only instruction text. |
| Conversion recurrence gets exact patch text | Mobile scan, generic objections, generic limitations, or message-match failures recur. | Action item includes exact target skill section and instruction delta. |
| Compliance recurrence gets substantiation mapping | Unsupported sensitive claims or review-basis overclaims recur. | Action item includes claim-level mapping requirement and compliance/drafter/intent owner. |
| Prior fix failed and escalates control | Same failure was previously addressed by instruction-only guidance and recurs. | Recurrence audit escalates to checklist gate, deterministic scan, fixture, or blocker. |
| Single narrow correction stays inline | One page, one non-recurring issue, no independent review lanes. | No subagents required; output still uses contract and action/deferral discipline. |

## Browse AI Calibration

The Browse AI batch is the permanent RED fixture. A correct retro must not recommend broad publication or a new same-pattern batch when the scanner reports repeated:

- title
- H1
- CTA
- first benefit
- first limitation
- first FAQ
- visible-copy fingerprint
- proof angle
- quality-score signature

Expected dispositions are `blocked`, `exemplar_only`, `merge_into_existing`, `noindex_draft`, or `reject`, depending on owner intent and available records. The default must not be broad `go`.

If one base page could become a useful exemplar, the retro must split the disposition: base exemplar may continue only after evidence, destination, disclosure, and record readiness are resolved; variants must merge, noindex, reject, or wait for a proven batch intent map.

## Forward-Test Prompts

- `Use $landing-page-batch-retro on this page batch, scanner output, gate reports, owner feedback, and prior retro notes. Return only the structured retro JSON.`
- `Use $landing-page-batch-retro on this Browse AI duplicate batch. Block the next batch unless recurring failures become exact skill/process/scanner/fixture updates or owner-approved deferrals.`
- `Use $landing-page-batch-retro on these repeated compliance and conversion failures. Include recurrence audit, control strength, exact downstream patch text, and next-batch cap.`
- `Use $landing-page-batch-retro on this small same-product batch that claims distinct use cases. Verify scanner status, buyer-decision separation, CTA/destination continuity, owner feedback, and fixture coverage.`

## Validation Checklist

- `git diff --check`
- `Test-Path '.agents/skills/landing-page-batch-retro/references/retro-contract.md'`
- `Test-Path '.agents/skills/landing-page-batch-retro/references/forward-tests.md'`
- `Select-String -Path '.agents/skills/landing-page-batch-retro/SKILL.md' -Pattern 'Required References|Input-Readiness Gate|Update Ownership Matrix|Common Mistakes'`
- `rg -n "failure_ledger|exact_instruction_delta|next_batch_cap|go_no_go|scaled_content_abuse|disclosure_quality|forward_tests" .agents/skills/landing-page-batch-retro`

Do not run local dependency installs, app builds, typechecks, dev servers, or deployments for this docs-only skill validation unless the owner explicitly opts in.

## Source Rationale

- Google SRE postmortem guidance supports system-focused root cause, action ownership, and reviewed action plans.
- FTC endorsement and disclosure guidance supports blocking unclear material-connection disclosure and unsupported endorsement/review claims.
- Google spam, helpful-content, review, and outbound-link guidance supports blocking scaled, thin affiliate, doorway, search-engine-first, and affiliate-link hygiene failures.
- Structured-output and eval guidance supports stable contracts, RED/GREEN fixtures, and regression checks.
- Multi-agent orchestration guidance supports bounded specialist lanes with manager-owned fan-in synthesis.
