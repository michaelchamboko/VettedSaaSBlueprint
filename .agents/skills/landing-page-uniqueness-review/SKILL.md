---
name: landing-page-uniqueness-review
description: Use when reviewing VettedSaaSBlueprint direct-review affiliate landing-page drafts, generated page JSON, or batches for duplicate intent, visible-field collisions, thin keyword variants, sibling-page repetition, placeholder records, self-attested approvals, or publish-readiness uniqueness gates.
---

# Landing Page Uniqueness Review

## Purpose

Block duplicate, near-duplicate, thin, or same-intent affiliate landing pages before compliance or conversion review. A page passes only when its rendered copy, buyer decision, evidence need, CTA action, limitation, FAQ friction, and score pattern prove a distinct reason to exist.

## Required Inputs

- Target draft or generated page JSON.
- Active batch artifacts and closest sibling or published artifacts.
- Approved intent brief when available.
- Existing duplicate-script output when already run.
- Any reviewed merge/noindex/rewrite justification.
- Validated `DesignDirectionV1`, `PresentationRecipeV1`, selected-reference history, and `VisualDesignReviewV1`.

## Required References

Read `references/review-contract.md` before independent semantic review. It contains the output contract, reason codes, intent-overlap taxonomy, rendered-field priority, and hard gates.

Read `references/forward-tests.md` when validating or improving this skill.

## Deterministic Scan

Run the bundled scanner before independent semantic review:

```powershell
node .agents/skills/landing-page-uniqueness-review/scripts/summarize-page-duplicates.mjs src/generated/landing-pages
```

Use `--report-only` to avoid a failing exit during investigation. Use `--json` for machine-readable output. Use `--target <filename>` to focus the report on one artifact while still comparing against the full batch.

The scanner is necessary but not sufficient. It catches exact duplicate fields, near-duplicate visible copy, visible-page fingerprint similarity, near-copied scores, placeholder IDs, CTA mismatches, high evidence scores without proof, internal-process proof language, weak disclosure text, and generated self-approval. Manual intent review still decides whether a page has a distinct buyer decision.

## Stage 0 Presentation Review (mandatory)

Before semantic uniqueness, validate the local catalogue and stored desktop/mobile capture hashes with `npm run landing:references:validate`; do not recrawl reference sites. Confirm selection from `npm run landing:references:select -- --category <slug> --buyer-decision <text> [--tags <adjacent-tags>]`: three references by default, or two only when they cover at least four unique design dimensions, including one that matches the product category or an adjacent/neighbor category. Confirm explicit `hero/typography`, `sections/CTA`, and `motion/mobile` roles plus reference IDs, entry digests, adopted abstract principles, non-copy boundaries, rationale, one-line design read, and `DesignDirectionV1`.

Require a valid `PresentationRecipeV1` built only from registered tokens: never accept page-specific JSX/CSS/JavaScript or a silent Editorial V2, `editorial_v2`, or legacy fallback. Require the production-identical animated noindex preview with fixed `gsap_editorial` motion and `VisualDesignReviewV1`; a visual status other than `pass` blocks uniqueness, compliance, and conversion gates. Missing, stale, invalid, unsuitable, reuse-limited, recipe/fingerprint-mismatched, or non-passing Stage 0 artifacts are hard failures: return `hold_for_design_direction`. Oracle synchronization is optional for the agent-led release: record `pending` or `not_configured`, and never block local Stage 0, GitHub/Vercel publication, or live verification on Oracle.

## Workflow

1. Complete the Stage 0 presentation review before the deterministic scan.
2. Run the deterministic scan against the batch or artifact directory.
3. Read the target page, the closest sibling pages, and the approved intent brief when available.
4. Review both semantic uniqueness and the seven-axis presentation fingerprint.
5. Compare visible fields first: title, meta description, H1, subheadline, CTA, problem/solution, benefits, limitations, workflow steps, FAQ, and disclosure.
6. Classify intent overlap using `references/review-contract.md`.
7. Fail hard-gate issues before offering copy suggestions.
8. Return the structured review output from `references/review-contract.md`.

## Hard Gates

Fail when any condition is true:

- Exact duplicate or near-duplicate visible fields are found without explicit reviewed justification.
- The page differs from a sibling mainly by keyword, slug, title modifier, audience noun, or industry noun.
- A same-product sibling owns the same buyer decision, CTA action, evidence need, limitation, FAQ friction, or proof angle.
- The title, H1, CTA, first benefit, first limitation, first FAQ, or score signature repeats without a clear reason.
- A generic CTA, benefit, limitation, or FAQ could move to sibling pages by changing only the keyword.
- Hidden fields, proof blocks, source IDs, or scores are used to compensate for weak rendered copy.
- Quality scores are copied, near-copied, or higher than the available proof supports.
- Public copy uses internal workflow, owner approval, compliance checks, affiliate vault, or publication process as product proof.
- Placeholder IDs, self-attested approvals, CTA ID mismatches, weak disclosures, or high evidence scores without proof appear.
- Sibling or published-artifact context is missing.
- There is exact fingerprint reuse; same-wave pages differ on fewer than three axes; a primary reference is used more than once per ten-page wave; a reference is used more than twice in the previous ten drafts; or a reference combination repeats within twenty drafts.
- One reference influences more than two axes, one page matches more than three structural axes from one reference, or a section family appears more than once per page.
- Declared abstract principles are not adopted, or copied branding, content, or assets are presented as inspiration. Pixel similarity is never the success criterion.
- Copy, accent, or keyword changes are treated as structural variation.

## Presentation Fingerprint Rules

- No exact fingerprint reuse.
- Same-wave pages differ on at least three axes.
- A primary reference appears once per ten-page wave; any reference appears at most twice in the previous ten drafts.
- A reference combination is not repeated within the previous twenty drafts.
- One reference influences no more than two axes, and no page matches more than three structural axes from one reference.
- Use a section family once per page.
- Verify that declared abstract principles are adopted without copying branding, content, or assets. Pixel similarity is never the success criterion.

## Output

Return structured JSON only. `publish_readiness` stays `blocked` unless scanner findings are clear, manual intent review passes, and every hard gate passes.

Required top-level fields are defined in `references/review-contract.md`: `schema_version`, `status`, `publish_readiness`, `reason_codes`, `review_scope`, `scanner_result`, `duplicate_fields`, `near_duplicate_patterns`, `intent_overlap`, `thin_variant_risk`, `distinct_intent_summary`, `sibling_difference_matrix`, `hard_gate_failures`, `required_changes`, and `recommended_action`.

Allowed `recommended_action` values: `pass`, `rewrite_visible_fields`, `return_to_intent_brief`, `hold_for_design_direction`, `merge_into_existing`, `noindex_draft`, `reject`.

For non-pass outputs, include `source_recommended_action`, `action_target`, `handoff_to`, and `handoff_reason` so the orchestrator and retro can preserve the branch decision.

## Common Mistakes

| Mistake | Required response |
| --- | --- |
| Treating the scanner as the whole review. | Still perform manual intent review. |
| Passing a page because the slug or keyword differs. | Require a distinct buyer decision. |
| Accepting repeated CTA, benefit, limitation, FAQ, or score patterns. | Block unless explicitly justified. |
| Trusting generated approval fields, IDs, or scores. | Require audited source-of-truth records. |
| Comparing only the active batch. | Include closest published and sibling artifacts. |
| Downgrading hard-gate duplicates to copy suggestions. | Keep `publish_readiness: blocked`. |
| Treating evidence scores as proof. | Require proof blocks or resolvable evidence records. |

## Calibration

The Browse AI batch is the permanent RED fixture. A correct review must fail it for repeated title, H1, CTA, first benefit, first limitation, first FAQ, score signature, and same-intent keyword-variant behavior.
