# Independent verification — presentation repair

Codex independently ran the complete suite on the final application source: 521 tests, 518 passed, zero failed, three skipped; process exit 0. Started 2026-11-08T06:34:16.8583824Z; ended 2026-11-08T06:46:25.2536532Z. Raw results are in verification/parent-full-suite.stdout.log and parent-full-suite-result.json. All five owned source/test byte hashes matched the pre-run manifest after completion. No application edits occurred during the run.

The independent pinned Impeccable 0.1.5 detector ran separately against 14 files; every run returned [] and exit 0. verification/parent-detector-14/results.json records exact arguments, timestamps, source and output hashes. The scope comprises the original 13 targets, including LandingPageMotion.tsx, plus split-reveal-offset.ts.

Worker logs retain successful build, lint, typecheck, verify:agent-workflow and validate:public-site. The final build ID is wfAfF_vSiWRPri8N0XcP2. Existing lint warnings are not a clean-warning claim. The 4 focused motion tests also passed independently.

The root cause of mobile overflow was reproduced independently: a fixed 36px entrance offset exceeded the 16px gutter. The repair bounds horizontal travel to available layout-viewport space, keeping the duration, easing and reduced-motion behavior. Baseline and final screenshots cover three representative routes, with additional genuine Pixel 5 emulation and keyboard checks. Static correction in gr-premium-styles.css has no currently imported runtime route.

Historical evidence is preserved for audit. Original dev-mode before/after captures were not a genuine before/after baseline. Later baseline and CSS-after captures are valid but superseded; some supplemental before-fix captures demonstrate mobile overflow. Stale metadata and the initial malformed motion binding must not be used as current proof. A dedicated corrected motion capture is reviewed separately before acceptance.

All implementation was delegated to OpenCode using opencode-go/beam-free. Codex investigated, directed corrections, independently tested, and assembled this review note. Passing this repair does not establish article publication or a run without intervention. Independent current-head PR review and production verification remain separate release requirements.

Final evidence acceptance: motion-overflow-verified/motion-overflow-verified.json captured 2026-11-08T06:50:37.725Z through 06:51:34.799Z; actual five source hashes all match, build ID matches, all six mode combinations / 30 navigations return HTTP200 and expected H1 with no recorded overflow or hard errors. Parent verified these fields directly. Source section identifiers in full: D04-S-c52a0e3d7a64 and D04-S-1daaf8613a03. Worker report's abbreviated identifiers are shorthand only.
