# ESLint recovery and required-check repairs

Owner scope: repair ISSUE-20261102-002, include the eight release-blocking test failures, and ship through the normal reviewed release workflow. No article intake or publication receipt was changed.

## Before and after

Before: primary lint failed loading ESLint internal modules. A fresh locked installation restored lint without changing package versions. Primary lint passed with zero errors and 109 warnings, including ignored local OpenCode tools. Isolated lint passed with zero errors and 15 existing warnings.

The original full suite had 407 passes, eight failures, and three skips. Intake fixtures lacked their scratch parent. Retry tests assumed nine speculative executions and immediate external retries despite the existing diagnosis and wait guards. Tests now verify the three-failure stop, retained source, saved deadlines, no early execution/deployment, and one commit/deployment after recovery.

The homepage retained two guide rows whose styles had been removed in `fed1abd`. Restored only their heading, navigation, grid, and mobile styles. Production browser inspection showed body-sized headings and links running together. Candidate desktop 1265x713 and mobile 390x844 inspections showed clear headings, separated links, correct reading order, no category overflow, and visible keyboard focus. All six links measured approximately 44.46px high. Screenshots were inspected in native browser output; no screenshot files are claimed.

Removed retired graph-tool references under the explicit repository-wide directive in planning.md. Historical evidence retains its meaning, and the one redacted patch context is labelled as historical redaction. Original bytes remain in Git history. Source-strategy documents and canonical intelligence records were not edited.

## Verification

- `npm run verify:agent-workflow`: pass.
- `npm run lint`: pass, zero errors.
- `npm run typecheck`: pass.
- `npm test`: pass, 418 total, 415 passed, zero failed, three skipped.
- `npm run validate:public-site`: pass.
- `npm run build`: pass, 139 generated pages.
- `git diff --check`: pass.

Failed verification attempts are retained in debug.md. The incomplete checkout-local dependency tree caused three CLI fixture failures and an initial Next workspace-resolution failure. After the dependency copy completed, a stale Turbopack cache caused a generated PostCSS module error. Preserving `.next` under `.automation/next-recovery-before-clean` and rebuilding resolved it. No build option, test exclusion, or production gate was weakened.

## Independent design assessment

Method: two isolated agents, `guide_design_review` and `guide_detector_review`, using the restored Impeccable references and the existing visual identity. Assessment A did not see detector output. Its desktop/mobile review found no material scoped defects, with a heuristic score of 23/28 and clear groups of three links. Questions skipped because it found no priority issues within the approved repair.

The actual detector command returned an empty findings array for `src/app/page.tsx`. Literal CLI `critique` and `audit` commands are unsupported in this installed bundle; the reference-guided reviews are used instead. Browser APIs prohibit mutable script injection, so no live detector overlay is claimed. This design assessment is separate from the required current-head Codex PR code review.

Assessment B independently inspected desktop 1280px, mobile 390px, and just above the 800px breakpoint. It confirmed the intended columns and stacking, six 44.46px link targets, visible keyboard focus, no horizontal overflow, and no browser warnings/errors. Token contrast ratios were 14.09:1 for main text, 5.06:1 for muted text, and 4.55:1 for clay hover/focus. It found no introduced issues.

## Handoff and release evidence

The continuation instruction is `docs/opencode-webcatalog-continuation.md`. It requires a clean aligned main checkout, verified deployment commit, genuine editorial/presentation evidence, and issue-log updates after each repair and verification. The archived helper that wrote passing assertions must not be used as evidence.

The final PR, reviewed SHA, merge SHA, deployment identity, canonical URL verification, and clean-checkout result are recorded after release under ignored `.automation/recovery/` and in the final run report. This avoids changing the deployed commit merely to record its own identifier. Do not infer merge or deployment success from this pre-release verification document alone.
