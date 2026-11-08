# BEAM-POLICY-001 implementation plan

Classification: explicit product-owner directive (planning.md, "Beam policy and OpenCode 2.2.6 support, 2026-11-08"; AGENTS.md "Repository boundaries" owner directive for supervised authoring).

## Sequencing note (honest)
Implementation began before packet registration in planning.md and build-pack/execution-state.json. This plan and the packet registration are recorded after the initial code edits; the sequencing gap is logged as issue BEAM-ISSUE-001.

## Objective
Make the editorial workflow truthful under an owner-directed Beam-only policy: a separate Beam review pass in a distinct OpenCode session/exchange with exact `opencode-go/beam-free` identity, replacing the different-model-family cleanse. Add verified OpenCode 2.2.6 runtime support. Preserve legacy rival-family evidence interpretation.

## Source citations
- AGENTS.md "Repository boundaries" owner directive for supervised authoring (different-model-family cleanse requirement, superseded by this directive).
- planning.md "Verified automation model configuration, 2026-11-03" (configured `opencode-go/beam-free` and `nvidia/minimaxai/minimax-m3.1-flash`).
- planning.md "Article automation hardening, 2026-11-03" (ARTICLE-HARDENING-002).
- src/lib/editorial/refinement.ts (EDITORIAL_REVISION, rewritePassesSchema, editorialEvidenceSchema).
- src/lib/article-import/opencode-runtime.ts (openCodeVersionSchema, normalizeOpenCodeVersion).
- src/lib/article-import/execution-evidence.ts (dedicatedV2Exchange, extractOpenCodeExecution).
- src/lib/article-import/workflow-evidence.ts (validateEditorialExecution, passes).
- src/lib/article-import/preflight.ts (inspectArticlePreflight).

## Changes
1. refinement.ts: add `beamReview` pass alternative to `rivalFamilyCleanse`; family rule conditional on pass name.
2. opencode-runtime.ts: add `2.2.6` to version enum; narrow normalizer; export args.
3. execution-evidence.ts: 2.2.6 dedicated exchange support; reject nonempty user files; enforce Beam model for beamReview passes.
4. workflow-evidence.ts: positional pass allows beamReview at index 3; distinct session from all prior passes; receipt policy match.
5. preflight.ts: require exact Beam entry; family count >= 1.
6. AGENTS.md, planning.md, execution-state.json, skills updated.

## Proposed config changes (for parent/Codex, cannot edit config here)
- config/article-workflow-capabilities.json: openCodeVersion -> "2.2.6"; remove "nvidia/minimaxai/minimax-m3.1-flash" from modelFamilies (Beam only). Eleanor SKILL.md pinned hash changed to `dbbecfc9fb6acc11f0ea21bae53472849d0625831780847bf18c19c021329fac` (this cell edited SKILL.md). Parent must update that pin. Other pinned files unchanged.