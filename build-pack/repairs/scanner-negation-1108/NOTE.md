# Scanner negation repair (SCANNER-NEGATION-1108)

Classification: user directive (narrow corrective maintenance enabling existing article quality gate).

Branch: codex/scanner-negation-1108 from origin/main 53fada61a29ce555ea41b540c40fc9e4a32a33e8.

## Problem

All three specialist scanners flagged the frozen FAQ denial "Yes. Check the inboxes your readers use and review the final message before sending. A visual editor alone cannot guarantee consistent rendering." as an affirmative guarantee/pricing/hype claim. The wording is a denial, not an offer or promised outcome.

## Changes

- `scripts/scanner-negation.mjs`: one shared lexical helper exporting `isNegatedGuaranteeTerm` and `hasFlaggablePatternMatch`; consumed by all three scanners.
- `.agents/skills/affiliate-compliance-review/scripts/summarize-compliance-risks.mjs`: imports shared helper; `scanClaims` uses `hasFlaggablePatternMatch`.
- `.agents/skills/conversion-copy-review/scripts/summarize-conversion-copy-risks.mjs`: imports shared helper; `OVERCLAIM_PATTERNS` and `SENSITIVE_CTA_PATTERNS` checks use `hasFlaggablePatternMatch`.
- `.agents/skills/landing-page-uniqueness-review/scripts/summarize-page-duplicates.mjs`: imports shared helper; `RISKY_OVERCLAIM_PATTERNS` check uses `hasFlaggablePatternMatch`.
- `tests/scanner-negated-guarantee.test.ts`: 35 focused regression tests using clones of the existing valid elevenlabs fixture, exact `faq.0.answer` field assertions, scanner-specific price/refund/discount retention tests, helper edge cases.

No skill policies, detector pins, model configs, schema/evidence validators, thresholds, report-only behavior, page artifacts, credentials, source documents, intake, or import records changed.

## Verification

- `node --check` passed for all three scripts.
- Focused regression suite: 35 tests, 35 pass.
- Related scanner tests: 22 pass.
- verify:agent-workflow pass; lint pass (0 errors); typecheck pass.
- Full npm test/build/public-site not run in this bounded correction; parent-owned final gates pending.
- Required repository gates run separately (see REPORT).
