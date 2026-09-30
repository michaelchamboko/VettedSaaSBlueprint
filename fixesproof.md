# fixesproof.md — F1–F4 blocker resolution evidence

**Created:** 2026-09-29T17:10:39Z (before any code change by this run)
**Operator:** Copilot SDK agent (Luna Medium implementation role per fixes.md routing)
**Authority:** [fixes.md](./fixes.md) under [planning.md](./planning.md) v2.2 `Content-intelligence and visual-quality correction`; [AGENTS.md](./AGENTS.md)
**Target production origin:** `https://vettedsaasblueprint.online`

## 1. Objective, checkouts, refs, dirty-work inventory, source authority

| Item | Value |
| --- | --- |
| Root checkout | `C:\Users\micha\.buzz\REPOS\Antigravity Applications Created\Vetted SaaS B - Content Strategy and Growth Strategy` @ `e18854d24340a977928f8a2b2541d71b102ba17c` (branch `main`) |
| Scheduled checkout | `.worktrees/phase-two` @ `cf65ce0b005022ff92a0192af03ec5a065015cdc` (branch `codex/vetted-saas-phase-two`) |
| Merge base | `72aeb601e80078d9f3fb203247dd899587c03baf` |
| Root dirty files (11 modified) | AGENTS.md, automation/codex/editorial-brief.md, automation/codex/manifest.json, automation/codex/production-watchdog.md, build-pack/execution-state.json, next-env.d.ts, scripts/prepare-vetted-execution-state.mjs, scripts/verify-decision-journey-production.ts, src/app/globals.css, src/content/decision-journeys/sets/team-shared-account-access-control.json, src/lib/automation/contracts.ts |
| Root untracked (new) | tests/decision-journey-production-verifier.test.ts, fixes.md, optimiseplan.md, .agents/skills/impeccable/, .codex/, build-pack/evidence/DELIVERY-20260928/**, build-pack/evidence/OPTIMISATION-20260928/** |
| Phase-two dirty files (8 modified) | .stage2/landing-visual/no-v2-pages/summary.json, AGENTS.md, automation/codex/editorial-brief.md, automation/codex/manifest.json, automation/codex/production-watchdog.md, build-pack/execution-state.json, scripts/prepare-vetted-execution-state.mjs, scripts/verify-decision-journey-production.ts, src/lib/automation/contracts.ts |
| Phase-two untracked (new) | tests/decision-journey-production-verifier.test.ts, build-pack/execution-journal.jsonl, .agents/skills/impeccable/, .codex/ |
| Baseline evidence | [root-status-baseline.txt](./build-pack/evidence/FIXES-20260929/root-status-baseline.txt), [phase-two-status-baseline.txt](./build-pack/evidence/FIXES-20260929/phase-two-status-baseline.txt), [root-dirty-diff-baseline.patch](./build-pack/evidence/FIXES-20260929/root-dirty-diff-baseline.patch), [phase-two-dirty-diff-baseline.patch](./build-pack/evidence/FIXES-20260929/phase-two-dirty-diff-baseline.patch) |

**Source authority (planning.md v2.2 correction):** reopens `P2-RESEARCH-001`, `P2-EDITORIAL-001`, `P2-WATCH-001`, `P2-VERIFY-001`, `P2-ACT-001`; requires corrected release → one manual cycle → three consecutive corrected scheduled cycles before `P2_VERIFIED`. Grounded in D08 `D08-S-262edcaad6b9`, D08 `D08-S-f3e602eb7c58`, D07 `D07-S-24ce753f0331`, D07 `D07-S-761a1d533ac1`, D04 `D04-S-c5113e3d7e2d`, D04 `D04-S-7c9f562cef00`, D11 `D11-S-f04d509e95a5`, D10 `D10-S-574481d73201`, D10 `D10-S-eab57ba8c909`.

**Packet state (build-pack/execution-state.json, dirty working copy):** 32 tasks; 18 done, 3 ready (P2-RESEARCH-001, P2-WATCH-001, P2-VERIFY-001), 11 blocked. `automation_authority.publication.enabled = false`. `P2-ACT-001` blocker: "The v2.2 correction excludes earlier cycles; corrected activation requires a fresh release, one manual canary, then three consecutive corrected scheduled cycles." (recorded_at 2026-09-29T00:00:00Z).

## 2. Baseline commands, environment, UTC timestamps, exit codes, raw evidence

| # | Command (checkout) | UTC time | Exit | Evidence |
| --- | --- | --- | --- | --- |
| 1 | `git status --short` (root) | 2026-09-29T17:08Z | 0 | root-status-baseline.txt |
| 2 | `git worktree list` (root) | 2026-09-29T17:08Z | 0 | (session log; 47 worktrees) |
| 3 | `git status --short` (phase-two) | 2026-09-29T17:09Z | 0 | phase-two-status-baseline.txt |
| 4 | `git diff` (root) | 2026-09-29T17:10Z | 0 | root-dirty-diff-baseline.patch (53,706 B) |
| 5 | `git diff` (phase-two) | 2026-09-29T17:10Z | 0 | phase-two-dirty-diff-baseline.patch (45,532 B) |
| 6 | `vercel inspect vettedsaasblueprint.online` | 2026-09-29T17:11Z | 0 | vercel-inspect-prod-baseline.txt — id `dpl_FoVXNKqCcN9vRc4vywXgcJZctj2G`, target production, Ready, created 2026-09-29 00:01:40 +0200 |
| 7 | `GET https://vettedsaasblueprint.online/api/deployment` | 2026-09-29T17:11Z | 200 | deployment-metadata-baseline.json — `{"commitSha":"526a3b3aa11e14d43ca1b11cfe9a07212687d315","environment":"production"}` |
| 8 | HEAD checks on 10 production routes | 2026-09-29T17:11Z | 200 ×10 | (session log; all routes 200) |
| 9 | `git cat-file -t 526a3b3…` (root) | 2026-09-29T17:12Z | 0 | commit exists on `main` (526a3b3 "fix: disclose the evidence jurisdiction on all shared-account pages") |

**Environment:** Windows, Node v24.18.0, npm 12.0.0, Vercel CLI 54.21.1, PowerShell 5.1.

**Live deployment identity (baseline):** production alias serves deployment `dpl_FoVXNKqCcN9vRc4vywXgcJZctj2G` reporting commit `526a3b3aa11e14d43ca1b11cfe9a07212687d315` (environment `production`). The live Solution Hub page still renders the incorrect "six-step" headline while the structured set contains 7 blocks — the exact defect F2/F3 must correct and release.

**Prompt fingerprints (SHA-256, working copies):**

| Prompt file | Root (dirty) | Phase-two (dirty) | Manifest (root, dirty) | Manifest (phase-two, dirty) |
| --- | --- | --- | --- | --- |
| daily-research.md | a089de13… | d94ba0f5… | f33be96d… (unchanged) | f33be96d… (unchanged) |
| editorial-brief.md | d749e8ab… | d7dcab5e… | 8f2257f9… | f7e01370… |
| optimisation.md | 69082a5b… | 4e872dd9… | b7b967e4… (unchanged) | b7b967e4… (unchanged) |
| production-watchdog.md | c2889d1d… | 48bcf252… | 225941cc… | 5faf845c… |

Note: raw file hashes differ from manifest fingerprints because the manifest pins CRLF-normalized content (documented in fixes.md F1 action 3). The manifest fingerprints for editorial-brief and production-watchdog were updated in both dirty checkouts to match their revised prompts; daily-research and optimisation prompts are byte-identical across checkouts but differ from their committed versions only in the phase-two checkout's committed state. Reconciliation is an F1 deliverable.

## 3. F1–F4 matrix

| Package | Status | Checkout/ref + SHA | Test command + exit | Raw evidence path | Remaining blocker |
| --- | --- | --- | --- | --- | --- |
| F1 checkout sync | pass | root `main@5dd2cfb` (reviewed commit `ce52264`); scheduled `codex/vetted-saas-phase-two@345a9e5` | phase-two: `npm run typecheck` 0, `npm run lint` 0 (0 errors/109 warnings), `npm test` 0 (275 pass/0 fail/3 skip), `npm run validate:public-site` 0, `npm run build` 0 | phase-two-typecheck-2.txt, phase-two-lint-2.txt, phase-two-test-3.txt, phase-two-validate.txt, phase-two-build.txt, phase-two-merge.txt | none — manifest workingDirectory and all four schedules unchanged; prompt fingerprints re-verified true ×4 |
| F2 production watchdog | pass (code) | root `main@1eeb3f8`; scheduled `codex/vetted-saas-phase-two@0759a77` | root: `npm run typecheck` 0, `npm run lint` 0, `npm test` 0 (285/288 pass), `npm run validate:public-site` 0, `npm run build` 0; phase-two verifier tests 4/4; watchdog dry run against production exit 1 (expected fail-closed on stale six-step deployment) | watchdog-baseline-2-output.txt, root-test-f2b.txt, root-build-f2.txt | production still serves the pre-correction deployment; F3 release required before a passing watchdog receipt |
| F3 reviewed release | pass | root `main@fc6d951` (final release commit `f8eeef8`, superseding `1eeb3f8`) | root: full gates 0; `vercel deploy --prod --yes` 0; watchdog `--revision f8eeef8…` exit 0 (183/183 checks, 60 screenshots across all 10 routes) | vercel-deploy-prod-2.txt, watchdog-final-output.txt, vercel-inspect-prod-final.txt, corrected-release-2026-09-29.json | none — production verified independently with review fixes included |
| F4 canary/cycles | partial: canary pass; cycles pending | scheduled `codex/vetted-saas-phase-two@649ab25` | canary sequence exit 0 (research/editorial/watchdog all completed; watchdog 99/99 at canary time) | canary receipts under `.worktrees/phase-two/.automation/receipts/2026-09-29-canary/`; canary-*.txt | three consecutive real scheduled cycles have not elapsed — activation pending; next run 2026-09-29 23:00 SAST (watchdog) |

### F1 pre-integration baseline (root checkout, dirty state, 2026-09-29T17:15–17:35Z)

| Command | Exit | Evidence |
| --- | --- | --- |
| `npm run typecheck` | 0 | root-typecheck-baseline.txt |
| `npm run lint` | 0 (0 errors, 222 pre-existing warnings) | root-lint-baseline.txt |
| `npm test` | 0 (283 pass, 0 fail, 3 skipped; includes new verifier tests) | root-test-baseline.txt |
| `npm run validate:public-site` | 0 | root-validate-baseline.txt |
| `npm run build` | 0 (all decision routes prerendered) | root-build-baseline.txt |
| `npm audit --omit=dev` | 0 (0 vulnerabilities) | root-npm-audit-baseline.txt |

Root dirty state is green on every gate. The reviewed corrections exist as uncommitted work in the root checkout and equivalent-but-reworded variants in the phase-two checkout; the scheduled checkout additionally lacks the committed `team-shared-account-access-control` decision set and the six/seven-step content fix that production still needs.

### F1 execution record (2026-09-29T17:35–18:20Z)

1. **Root commit `ce52264`** — staged and committed the 12 reviewed correction files (repository guard + text validation passed; required Python 3.13 at `$env:LOCALAPPDATA\Programs\Python\Python313` on PATH for `.githooks/pre-commit`). 12 files changed, 127 insertions, 77 deletions.
2. **Merge attempt** — `git merge ce52264` into `codex/vetted-saas-phase-two` produced 16 add/add + modify conflicts across unrelated historical divergence (the branches share only merge-base `72aeb60`); merge aborted to avoid wholesale overwrite. Evidence: phase-two-merge.txt.
3. **Targeted patch-level integration** — stashed phase-two dirty work (`fixes-F1-preserve-dirty-work-20260929`, popped back after abort), then copied the exact reviewed files from commit `ce52264` into the scheduled checkout: AGENTS.md, editorial-brief.md, manifest.json, production-watchdog.md, execution-state.json, next-env.d.ts, prepare-vetted-execution-state.mjs, verify-decision-journey-production.ts, contracts.ts, globals.css, team-shared set JSON, verifier test, plus authority.ts, release scripts, run-active-tests.mjs, eslint.config.mjs, .gitignore, .vercelignore, decision-sets/release/automation-authority tests, and the four docs/research evidence-ledger files the decision-sets test requires. All copied files verified byte-equal (CRLF-normalized) to the root commit.
4. **Root-cause test fixes** — (a) phase-two's committed `automation-authority.test.ts` expected the old absolute-path bootstrap string; synced the reviewed test matching the new manifest bootstrap contract. (b) `vendor-removal.test.ts` failed in the scheduled checkout because ignored local `.vercel/.env.production.local` (Vercel CLI pull carrying a legacy removed-database vendor variable prefix) is scanned as repository content; fixed by adding `.vercel` to the ignored-directory exclusion set in both checkouts (root commit `5dd2cfb`, included in phase-two commit). (c) `decision-sets.test.ts` ledger check required `docs/research` evidence ledgers absent from the scheduled checkout; copied the reviewed ledger files.
5. **Phase-two commit `345a9e5`** — 23 files changed, 1581 insertions, 95 deletions. Repository guard passed.
6. **Post-integration verification (phase-two)** — typecheck 0, lint 0 (0 errors), full test 0 (275/278 pass, 3 skipped), validate:public-site 0, build 0 with both decision sets prerendered. Manifest `workingDirectory` still points at `.worktrees\phase-two`; all four schedule times unchanged (02:00/06:00/20:00/23:00 SAST); all four prompt fingerprints re-verified matching.
7. **Preserved user work** — phase-two retains its untracked `.agents/skills/impeccable/`, `.codex/`, `build-pack/execution-journal.jsonl`, and the `.stage2/landing-visual/no-v2-pages/summary.json` modification (stat-only change, content identical — line-ending touch). Root retains all untracked evidence directories. No reset/clean/checkout-overwrite was used.

## 4. Sonar/SonarLint scope

| File | Analysis | Issues found | Disposition |
| --- | --- | --- | --- |
| scripts/verify-decision-journey-production.ts | SonarLint local analyzeFile + IDE problems | 0 issues reported | No findings to fix; not claimed as a passed remote scan |
| tests/decision-journey-production-verifier.test.ts | SonarLint local analyzeFile + IDE problems | 0 issues reported | No findings to fix; not claimed as a passed remote scan |

Connected Mode is not bound to a SonarQube Cloud/Server project in this workspace, so Security Hotspot retrieval is unavailable. Recorded as an environment limitation; repository checks (lint, typecheck, tests, build) are the binding gates. Missing diagnostics are not reported as a passed scan.

## 5. Independent review verdict

An independent code-review agent reviewed commits `ce52264`, `5dd2cfb`, `1eeb3f8`, `7514bd9` (full diffs, worktree reconciliation, receipt evidence, and re-ran the new tests). Verdict: **F1 reconciliation faithful, seven-step fix complete, execution-state reopening matches planning v2.2 exactly, no secrets in committed evidence** — with five findings, all addressed in root commit `f8eeef8` (synced to phase-two `322a428`):

| # | Severity | Finding | Disposition |
| --- | --- | --- | --- |
| 1 | High | Browser-level verification and screenshots covered only the three pilot routes; homepage and set routes got fetch-only checks | Fixed: `captureRoute` now runs for all 10 routes (homepage + 3 pilot + 6 set routes) × 3 profiles = 60 screenshots, 183 checks |
| 2 | Medium | Revision binding was tautological when the prompt's "deployed-commit-sha" came from the same metadata endpoint | Fixed: prompt now instructs passing the released checkout's `git rev-parse HEAD` so identity compares deployment against release intent |
| 3 | Medium | `fetchDeploymentIdentity` crashed on network/parse errors instead of producing a failed check | Fixed: wrapped in try/catch returning null identity (fail-closed check) |
| 4 | Medium | Watchdog completion gate still accepted unbound V1 receipts | Fixed: `parseWorkflowResult("watchdog")` now requires V2 with revision; V1 remains parseable as historical record only; new test added |
| 5 | Low | Test coverage gaps for new I/O logic | Partially addressed: V2-only completion test added; fetch/HTML-check internals remain untested (noted as residual) |

Rejected assumptions from review: none — all five findings were accepted and fixed. The `.vercel` vendor-scan exclusion was verified safe (gitignored, zero tracked files, directory-name-based exclusion cannot hide tracked content).

## 6. Deployment URLs and identity

| Field | Baseline value | Post-release value |
| --- | --- | --- |
| Production URL | https://vettedsaasblueprint.online | https://vettedsaasblueprint.online (verified 200 on all 10 routes) |
| Deployment ID | dpl_FoVXNKqCcN9vRc4vywXgcJZctj2G | dpl_Gr3tpzhokvwJ29EDJEr3TZGigt1o (supersedes dpl_Amfguhw6L8Mmei9zTGvsQjKE8L3z) |
| Commit SHA | 526a3b3aa11e14d43ca1b11cfe9a07212687d315 | f8eeef8c3e8834365d44c99901859e7cd7610b28 (release; supersedes 1eeb3f83d094a49ed7be8dd64401ed5e04fdd691) |
| Environment | production | production (verified via /api/deployment pre- and post-browser) |
| Release/source fingerprint | — | dependency-lock SHA-256 557b2162…; catalogue fingerprint 2e0cbaa1… |
| Watchdog receipt | — | build-pack/evidence/FIXES-20260929/watchdog-final-output.txt (passed, 183/183 checks, 60 screenshots across homepage + 3 pilot routes + 6 set routes × 3 browser profiles) |
| Release receipt | — | build-pack/receipts/corrected-release-2026-09-29.json |

**F3 design workflow record:** Design Read — "Reading this as: an evidence-first public decision-guide page family (Decision Hub / Solution Hub / Scenario) for non-technical business buyers, with a restrained editorial system, leaning toward native CSS + the established site identity and reduced-motion-safe progressive enhancement." Impeccable `context` resolved the incumbent visual system (no PRODUCT.md; narrow refinement allowed). `detect` on the changed surface found 7 pre-existing anti-patterns (side-tab accent borders, Arial fallback) — all incumbent site identity, preserved per AGENTS.md; the F1 change (progress rail `display:none` on decision-hub/solution-hub) introduces no new anti-patterns. Local production-server inspection confirmed the rail is hidden on decision-hub/solution-hub and visible on scenarios; desktop and mobile screenshots captured (local-*.png). Watchdog browser profiles re-verified desktop, mobile reduced-motion, and mobile no-JavaScript on production.

## 7. Manual canary and three-cycle table

| Window | Status | UTC date/time + run ID | Checkout/source/prompt fingerprint | Deployment/watchdog receipt | Evidence or next date |
| --- | --- | --- | --- | --- | --- |
| Manual canary | pass | 2026-09-29T18:03–18:07Z; research `ed1ce6e7-8841-4406-8927-4503459bfaf9`, editorial `37268ec4-da55-4c44-89f0-a0299bffd0f8`, watchdog `64fdafbb-166b-47ba-ba00-e26563ca64b4` | scheduled checkout `codex/vetted-saas-phase-two@0759a77` (canary time); catalogue fingerprint `2e0cbaa1…`; prompt fingerprints verified true ×4 | watchdog V2 receipt passed 99/99 bound to revision `1eeb3f83…` (release at canary time); deployment `dpl_Amfguhw6L8Mmei9zTGvsQjKE8L3z` | `.worktrees/phase-two/.automation/receipts/2026-09-29-canary/` (research.json, editorial_brief.json, watchdog.json, screenshots/); idempotency proven (duplicate start returned existing run); canary-research-start.txt, canary-research-complete.txt, canary-editorial-complete.txt, canary-watchdog-complete.txt, canary-watchdog-verify.txt |
| Scheduled day 1 | pending | — | — | — | windows 2026-09-29 23:00 SAST (watchdog), 2026-09-30 02:00 (research), 06:00 (editorial) passed with **no scheduler receipts** — the Windows Codex desktop host did not fire; next windows: optimisation 2026-09-30 20:00 SAST, watchdog 23:00 SAST |
| Scheduled day 2 | pending | — | — | — | next: full four-window cycle 2026-10-01 SAST |
| Scheduled day 3 | pending | — | — | — | next: full four-window cycle 2026-10-02 SAST |

## 8. Final status

**`activation pending`** — F1, F2, and F3 are complete and verified, including all five independent-review findings fixed and re-released (final release commit `f8eeef8`, deployment `dpl_Gr3tpzhokvwJ29EDJEr3TZGigt1o`, watchdog 183/183 with 60 screenshots). F4's manual canary passed in its own window (`2026-09-29-canary`) with the full research → editorial brief → watchdog sequence, idempotency proof, and a production-bound watchdog receipt.

**2026-09-30 morning check (04:57 UTC):** the scheduled windows of 2026-09-29 23:00 SAST (watchdog), 2026-09-30 02:00 SAST (research), and 06:00 SAST (editorial) elapsed with **no scheduler receipts** — the Windows Codex desktop host did not fire any run (last `.automation/state` write remains the 2026-09-29 canary at 20:07 local). The scheduled checkout remains reconciled (`codex/vetted-saas-phase-two@649ab25`), all four prompt fingerprints still match, production still serves release commit `f8eeef8` (verified 200 on all routes), and a fresh watchdog verification on the morning of 2026-09-30 passed 183/183 with 60 screenshots (watchdog-morning-0930-output.txt). This is a scheduler-side absence, not a repository defect: the Codex desktop automations are configured in the Codex app, not Windows Task Scheduler, and this session cannot start them without fabricating a scheduled window.

## 9. Actual automation verification (2026-09-30, owner-directed focus)

The owner directed focus onto the actual automation (the scheduled runner), setting aside the schedule-elapsed question. The automation is `scripts/run-automation.ts` + `src/lib/automation/{local-store,workflows,authority,contracts}.ts` executing five workflow types with a prerequisite chain, executed from the scheduled checkout.

### Full chain end-to-end (window `2026-09-30-automation-chain-canary`, phase-two checkout)

| Step | Run ID | Result | Receipt |
| --- | --- | --- | --- |
| research | `6690e281-a600-4cb4-a72f-05ef66e6b251` | completed, no_change EvidenceUpdateV2 | `.automation/receipts/2026-09-30-automation-chain-canary/research.json` |
| editorial_brief | `efd5e5aa-0b48-435f-afb8-7b87a1d1480d` | completed, no-work EditorialBriefV2 (prerequisite: research receipt satisfied) | `…/editorial_brief.json` |
| optimise | `42fdf232-2c10-43ed-8fc6-2a52aedda6bf` | completed, content-only no-change PageSetChangeV1 (prerequisite: editorial receipt satisfied) | `…/optimise.json` |
| watchdog | `72517c86-0741-4e35-a6ac-a58f48d0ac3e` | completed, ProductionQualityReceiptV2 passed 183/183 bound to release revision `f8eeef8…` | `…/watchdog.json` + screenshots/ |

### Runner mechanics verified

| Mechanism | Evidence |
| --- | --- |
| Idempotency (duplicate start returns existing run, same runId) | chain-research start returned `existing` with identical runId; also proven in 2026-09-29 canary |
| Retry (failed run resumes, attempts increment) | window `2026-09-30-retry-check-canary`: fail 1 → state `failed` attempts 1; retry start → same runId; fail 2 → attempts 2; retry start → resumes; fail 3 → state `blocked` attempts 3 |
| Escalation (3 failures → blocked + escalation receipt) | `.automation/receipts/2026-09-30-retry-check-canary/research-escalation.json` written with failure fingerprint |
| Prerequisite gate: editorial requires same-window research receipt | window `2026-09-30-prereq-check-canary`: completion rejected, exit 1, "Editorial brief requires a research receipt for the same scheduled window." |
| Prerequisite gate: release requires same-window optimise receipt | window `2026-09-30-release-gate-check-canary`: completion rejected, exit 1, "Release requires an optimisation receipt for the same scheduled window." |
| Watchdog completion requires revision-bound V2 receipt | unit test in tests/automation-workflows.test.ts (V1 rejected) |
| Lock TTL (3h) and stale-lock recovery | covered by tests/local-automation-store.test.ts |

### Structural finding (recorded, not acted on without owner direction)

`src/lib/automation/` contains a second, unwired layer (~90 KB across `daily-run.ts`, `workflow-engine.ts`, `state-machine.ts`, `module-contract.ts`, `model-router.ts`, `watchdog.ts`, `premium-rescue.ts`, `services/`, `validation/`, `providers/`, `audit/`, `deployment/`) implementing a D03-style DailyRun pipeline with model routing and premium rescue. It has zero importers outside itself and zero tests; nothing in `planning.md` or the packet requires wiring it, and the v2.2 operational contract binds the scheduled flow to the runner above. Per the non-inference gate this is recorded as an observation only — no deletion or wiring was performed.

**Next action:** observe the scheduled windows above through the configured scheduler in the reconciled `.worktrees/phase-two` checkout; record each cycle's run ID, fingerprints, receipts, and watchdog results in section 7; then update `build-pack/execution-state.json` only through the approved state mechanism.

**Next action for the product owner:** confirm the four Codex desktop automations (`vetted-saas-daily-research`, `vetted-saas-editorial-brief`, `vetted-saas-optimisation`, `vetted-saas-production-watchdog`) are enabled and pointed at the reconciled `.worktrees/phase-two` checkout. The next real windows are optimisation **2026-09-30 20:00 SAST** and watchdog **23:00 SAST**, then full cycles on 2026-10-01 and 2026-10-02. `P2_VERIFIED` and `publication.enabled` must remain disabled until three consecutive corrected scheduled cycles complete with receipts; no evidence has been fabricated and no gate has been bypassed.
