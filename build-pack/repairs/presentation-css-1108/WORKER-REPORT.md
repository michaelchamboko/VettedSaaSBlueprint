# Repair demonstrated CSS presentation-gate failures — FINAL REPORT

## Scope and changed paths
Owned source changes:
- src/app/globals.css
- src/app/gr-premium-styles.css
- src/components/landing/LandingPageMotion.tsx
- src/components/landing/split-reveal-offset.ts
- tests/split-reveal-offset.test.ts

Registration/evidence:
- planning.md
- build-pack/execution-state.json
- build-pack/repairs/presentation-css-1108/* (evidence, verification logs)

No source strategy, other pages/components, article/import/public JSON, release receipts, policy/validators/detector/config, dependencies changed.

## Design context
- Design read: refinement of existing warm editorial site; preserved incumbent identity, palette, layout, and reduced-motion behavior.
- D04 source authority: §6.2 (UID c52a0e3d7a64) and §32 Stage 4 (UID 1daaf8613a03).
- Impeccable context run against src/app/globals.css; craft-floor read before edits.
- design-taste-frontend: refinement, not redesign.

## Source hashes (final)
- src/app/globals.css: f09a3fdd98e477a980a878dd47a4a3502f44386b125f16de640eb26db56a6c2d
- src/app/gr-premium-styles.css: e084e93c5e0cc639185b4f3d3c8958e00dbad13b0ae50ad0c2681ba6698f721c
- src/components/landing/LandingPageMotion.tsx: c49b037afee4a21adb081023b549f74c1495789f7b7e6aa7a31d03cab30ed5b3
- src/components/landing/split-reveal-offset.ts: be43c1d6506ce9a8e4035f60a348e56a89dc1d53928415a978a6e763dfefff50
- Base globals.css: 2ff872ab199fad875c4e433f917288f606bfcd25b10ee9829d1d63ed04b8817e
- Base gr-premium-styles.css: 88657607c3dbd8ea0c55a4789ad96a512fcf04f26f3eb232f54049a0b3c2b3fb

## Corrections implemented
- 7 thick side-tab borders in globals.css reduced to 1px (lines 238, 340, 345, 579, 594, 611, 614).
- 3 overused font declarations (Arial line 21; Inter lines 45, 672) replaced with Manrope Variable / Source Sans 3 Variable.
- .gr-stat-value gradient-text replaced with solid color.
- LandingPageMotion split_reveal x travel bounded to available gutter; media gutter uses document.documentElement.clientWidth.

## Detector
- impeccable 0.1.5 detect over 14 targets (original 13 plus split-reveal-offset.ts): exit 0, 0 findings.
## Builds
- Final build exit 0, BUILD_ID wfAfF_vSiWRPri8N0XcP2.

## Required gates
- verify:agent-workflow: exit 0
- lint: exit 0
- typecheck: exit 0
- validate:public-site: exit 0
- focused motion test: exit 0
- npm test: independently run by Codex (parent): 521 total, 518 pass, 0 fail, 3 skip. Worker did not run.
## Runtime proof
- Baseline (valid): evidence/runtime-v2/before
- Final after (narrow viewport): evidence/runtime-v2/after-final (HTTP 200, no console/page/request errors, no horizontal overflow)
- Final after supplemental (Pixel 5 device emulation): evidence/runtime-v2/after-final/supplemental (HTTP 200, expected H1, FAQ touch/keyboard pass, no overflow)
- Motion overflow sampling: evidence/motion-overflow-final (no overflow across widths 390/393/1440, normal/reduced, 5 samples each)
- Historical invalid/failed captures preserved unchanged under evidence/before, evidence/after, evidence/runtime-v2/after, evidence/runtime-v2/after-motion-fix, evidence/motion-overflow.

## Deterministic intelligence
- intelligence:sync dry-run exit 0; snapshot key c72f7b957f882ee4877149c0c916d996f1a624ed69589acdf9302314934df126; 3577 nodes, 12684 edges. DB connection unavailable; no fabricated query evidence.

## Design Taste / Impeccable observations
- Detector CLI is detect-only (0.1.5); critique/audit/polish performed as manual reference review against craft-floor.
- No blanket overflow:hidden, no redesign, no new dependencies.
- Reduced-motion global CSS preserved; motion sampling confirms reduce media active.
- No contrast certification claimed from screenshots.

## Known limitations
- npm test pending parent execution.
- Contrast not measured instrumentally.
- Historical mobile 15px overflow was reproduced and fixed; final sampling shows no overflow.

## Owned server cleanup
- Final server PID 21732 stopped.
- Prior owned PIDs stopped: 11292, 22744, 8012, 17788, 9364, 16956, 25352, 16400, 21320.
- Port listeners verified free after cleanup.

## Source authority citations
- D04 §6.2 UID c52a0e3d7a64 (design direction/visual references)
- D04 §32 Stage 4 UID 1daaf8613a03 (page-type direction)

## Evidence classifications
- runtime-v2/before: valid narrow-viewport baseline.
- runtime-v2/after-final: valid narrow-viewport final capture.
- runtime-v2/after-final/supplemental: valid genuine Pixel 5 device emulation final capture.
- motion-overflow-verified: valid through-animation sampling (HTTP 200, expected H1, no Next overlay).
- evidence/before and evidence/after (original dev-mode): invalid provenance (preserved).
- runtime-v2/after and runtime-v2/after-motion-fix: valid but superseded (some supplemental captures demonstrated overflow); preserved.
- motion-overflow-verified/motion-overflow-verified.invalid-binding.json: invalid binding (preserved).
- historical-invalid-metadata/: stale metadata archive (preserved).
## Session ID
ses_e464c0ad5ffehmF3ZWfsSnx3Oy
