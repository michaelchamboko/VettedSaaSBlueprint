# Reviewer-effectiveness investigation #107

This evidence bundle measures six independent, blinded judgments at the reviewer boundary accepted in GitHub issue #96 and required by issue #107. It contains paired synthetic examples for CTA destination clarity, rewrite fidelity, and keyboard access to an internally scrolling region. It does not change product code, execute a real article, or perform a live operation.

## Procedure

1. Assign exactly one path from `reviewer-manifest.json` to a fresh reviewer.
2. Give the reviewer only that packet and its adjacent evidence files. Do not identify the inventory number, pair, expected outcome, or `evaluation/answer-key.json`.
3. Require the reviewer to save an observation, `meets` or `does_not_meet` verdict, and explanation before any comparison.
4. Store each original response separately under `results/` with its reviewer identity and reviewed revision.
5. Compare all six only after every response is frozen. Report misses and false alarms separately; the accepted threshold is six accurate verdicts with evidence-matching explanations.

## Authority and scope

- User directive: GitHub issue #107, acceptance criteria.
- Accepted design: GitHub issue #96, testing decision 5 and ADR-0002 Q45–Q46.
- Investigation revision: `f026bca8b53aecca829262e9a27820ac6d078892`.
- Source criteria are quoted in each packet with exact document heading and stable source identifier.
- Synthetic evidence is intentionally small. Passing measures only recognition of these six examples, not general reviewer reliability or historical WebCatalog causation.

## Verification

Run `node --test docs/designs/recovery-evidence/107/verify.test.mjs`. The focused test verifies packet count, answer separation, paired coverage, and retained rendered interaction for both keyboard cases. It joins the manifest, frozen result, answer key, and retained comparison by case ID; derives verdict accuracy, misses, false alarms, and the pass threshold from those joined records; and proves that a mutated frozen verdict fails verification. Explanation accuracy remains the retained post-freeze human judgment and is not presented as a mechanically derived semantic score.
