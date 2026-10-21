# Unpublished editorial calibration

Six passages were revised in memory: two decision passages, two landing passages and two blog passages. No public artifact was changed. passages.json records the exact text; the three receipts record full-artifact fingerprints, allowed changed paths, actual checker output and semantic review notes.

The decision checker stayed at 4/5, landing at 5/5 and blog at 3/5. The edits make the decision question and practical conditions easier to read. They do not establish better factual accuracy or human authorship. Specific retained findings are explained in each receipt.

The checker ran with Python 3.13 and the unchanged SlopMonster source pinned in .agents/skills/eleanor-editorial/UPSTREAM.json. The comparison validated both drafts against existing schemas and rejected protected-field changes. Focused tests cover that rejection separately.

Source authority: D07 §32 Editorial Quality Standard (D07-S-761a1d533ac1) and D10 §9.4 Content and editorial quality (D10-S-574481d73201). The owner authorized this supervised integration. Calibration text is a proposal, not approved production copy.

scripts/calibrate-editorial-refinement.ts reproduces these transformations from the referenced repository artifacts. Existing receipts are intentionally not overwritten. Semantic review must confirm that rewritten prose preserves meaning and item order; the checker cannot prove either.

## Delivery and workflow map

For decision, landing, blog and visibility content, the supervised authoring sequence is: evidence-backed structured draft → before snapshot and checker → one Eleanor refinement by the existing writer → schema and protected-field comparison, checker and semantic review → editorial receipt → existing candidate validation and independent review. Publication still follows the existing approval and release process. This pass adds no model, service, scheduled stage or release authority.

| Format | Exact integration location and insertion point |
| --- | --- |
| DecisionSetV2 and individual BlogPostV1 | AGENTS.md, Repository boundaries, owner directive for supervised authoring. Apply the shared skill after drafting and before candidate validation. |
| Direct-review landing blueprint | .agents/skills/direct-review-page-drafter/SKILL.md, after draft instructions; .agents/skills/landing-page-production-orchestrator/SKILL.md, within authoring before candidate validation. |
| Landing authoring handoff | src/lib/landing-automation/run.ts, destination_verified event, next_action.kind author_page description. This points the existing writer to the skill without changing state transitions. |
| VisibilityPageV1 | .agents/skills/visibility-page-drafter/SKILL.md, after draft instructions; .agents/skills/visibility-page-production-orchestrator/SKILL.md, within authoring before candidate validation. |

The shared adapter is .agents/skills/eleanor-editorial/SKILL.md. UPSTREAM.json in that directory pins the upstream commit and file hashes; LICENSE retains MIT attribution. src/lib/editorial/refinement.ts owns format allowlists and comparison. scripts/compare-editorial-artifacts.ts records evidence, and tests/editorial-refinement.test.ts checks the boundaries.

Calibration lives in build-pack/editorial/calibration-2026-10-21/: passages.json contains six categorized passages, while decision.json, landing.json and blog.json contain comparison receipts and checker findings. scripts/calibrate-editorial-refinement.ts reproduces the examples. Its intermediate before/after files are working evidence under build-pack/runtime/editorial-calibration/.

Integrity: this integration leaves planning.md, build-pack/execution-state.json, package.json, package-lock.json, source strategy documents, public content and schedules unchanged. Production runtime imports are unchanged; the new comparison code is invoked by local authoring scripts. Paused automation remains paused.

## Rollback

Revert only this integration's edits in AGENTS.md, the four drafter/orchestrator skill files listed above and the author_page description in src/lib/landing-automation/run.ts. Remove the added .agents/skills/eleanor-editorial/ directory, src/lib/editorial/refinement.ts, both editorial scripts and tests/editorial-refinement.test.ts. Remove this integration's calibration receipts and intermediate working evidence from the two build-pack paths above when they are no longer needed.

Preserve unrelated edits and evidence. Rollback needs no published-content migration, schema change, schedule change or deployment action because this integration has not rewritten or published content.
