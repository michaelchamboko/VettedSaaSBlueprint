# Contradiction Register — Plan 1

Findings are numbered C001… and linked to amendment-register entries M001… (see amendment_register.md) and to Plan 2 candidates P2-… (see plan_02_handoff.md).

## C001 — Retired daily publishing watchdog and 23:00 SAST premium rescue still described as active

- Classification: stale wording (operational requirement superseded by owner directive).
- Statement A: D03 §7.10 "Daily publishing watchdog" (UID `D03-S-…`, lines 477-485) states "A scheduler or watchdog monitors whether the required three-page set has reached production" and owns the daily deadline, the 23:00 SAST takeover trigger, freezing optional work, invoking the premium rescue path, post-deployment verification, failure logging and retry. D03 §11.4 (lines 911-918) requires configurable warning checkpoints before 23:00 SAST. D03 §23 locked decisions #15 (line 1686) and #16 (line 1687) mandate the 23:00 SAST premium rescue and the rescue's simplification/replan authority. D03 Stage E (line 1627) defines "Scheduled cloud execution" as a stage.
- Statement B: Owner directive 2026-10-28 (planning.md "Product-owner retirement directive") — retired research/editorial/optimisation/watchdog schedules stay retired; article-to-page requires an explicit manual or API trigger; no active multi-stage automation programme; AGENTS.md build-faster block and planning.md "Current state"/"Binding scope".
- Runtime behaviour: No scheduler, watchdog, or 23:00 rescue exists in the execution checkout (`package.json` has no `automation:*` scripts; no scheduler code present; Phase One shipped on-demand). Observed in A0001/A0002.
- Impact: Source docs still read as an active operational contract for a retired automation programme; risks re-activation by inference (violates AGENTS.md non-inference gate and automation non-deviation rule).
- Controlling authority: Owner directive (2026-10-28) + planning.md + AGENTS.md (execution checkout).
- Replacement meaning: D03 §7.10, §11.4, Stage E and §23 #15/#16 are retained as headings for traceability but their bodies are marked RETIRED and point to AGENTS.md/planning.md for the active on-demand trigger policy.
- Authoritative files to amend: D03 (this pass). Subordinate consumers (skills, prompts, runtime) deferred to Plan 2.
- Execution corrections deferred to Plan 2: none identified; no runtime code references the retired watchdog.
- Acceptance check: Amended D03 sections contain a "RETIRED" marker and a pointer to AGENTS.md/planning.md; heading count unchanged (165); stable UIDs unchanged; `verify-document-intelligence.ps1` section count still 1424.
- Ledger/evidence refs: A0001, A0002, A0014, M001.

## C002 — Retired scheduled cloud execution described as a delivery stage

- Classification: stale wording (operational requirement superseded by owner directive).
- Statement A: D03 Stage E (line 1627) — "Scheduled cloud execution: Run proven background work without the owner's computer remaining active. Result: Reliable scheduled research, refresh, generation, and rescue monitoring." Also D03 §24 lists "the scheduler used for the 23:00 watchdog" as an open implementation decision.
- Statement B: Owner directive + planning.md — no active automation programme; future automation requires a new explicit product-owner directive and planning amendment; article-to-page only via explicit manual/API trigger.
- Runtime behaviour: No cloud scheduler or background worker exists in the execution checkout; Phase One shipped on Vercel on-demand. Observed in A0001/A0002.
- Impact: Stage E reads as an authorised next stage; risks scheduling work without a new owner directive.
- Controlling authority: Owner directive + planning.md.
- Replacement meaning: Stage E heading retained for traceability; body marked RETIRED; §24 open-decision line for the 23:00 watchdog scheduler marked RETIRED.
- Authoritative files to amend: D03 (this pass).
- Execution corrections deferred to Plan 2: none.
- Acceptance check: Stage E and the §24 scheduler line carry a RETIRED marker; heading count unchanged.
- Ledger/evidence refs: A0001, A0002, A0014, M002.

## C003 — Retired scheduled optimisation described as an active design step

- Classification: stale wording (operational requirement superseded by owner directive).
- Statement A: D04 §26.10 (line 1754) "Step 10 - Scheduled optimisation: Design improvements may run in scheduled evening optimisation windows. The exact schedule will be selected during implementation and coordinated with the existing 23:00 SAST publishing-rescue policy." D04 §5.9 (line 278) "Those states publish on schedule…" D04 §27 item 7 (line 2123) "Exact scheduled times for evening design-improvement runs." D04 §26.9 (line 1751) "Post-publication design evaluation" feeds the scheduled optimisation step.
- Statement B: Owner directive + planning.md — optimisation schedules retired; no active automation programme.
- Runtime behaviour: No scheduled design-optimisation job exists; design improvements are applied in normal change windows. Observed in A0001/A0002.
- Impact: D04 still authorises a scheduled optimisation window and an exact schedule to be selected, contradicting the retired-schedules directive.
- Controlling authority: Owner directive + planning.md.
- Replacement meaning: §26.10 and §27 item 7 marked RETIRED; §5.9 reworded from "publish on schedule" to "publish when approved and released".
- Authoritative files to amend: D04 (this pass).
- Execution corrections deferred to Plan 2: any design-optimisation automation code, if added later, requires a new owner directive.
- Acceptance check: Amended D04 sections carry RETIRED/updated wording; heading count unchanged (210).
- Ledger/evidence refs: A0001, A0002, A0014, M003.

## C004 — Stale daily publishing obligation in source strategy

- Classification: stale wording (operational requirement superseded by owner directive).
- Statement A: D01 §1.1 (line 38) "Every active publishing day must deploy one Decision Hub, one Solution Hub, and one Decision Scenario." D02 §3.2 (line 59) "During active implementation and content-production work: Every build day MUST end with one complete three-page decision set live and working on Vercel." D03 §23 locked decision #3 (line 1674) "Every active build day ends with one Decision Hub, one Solution Hub, and one Decision Scenario live on Vercel." D04 §5.9 (line 276) "They must not turn design review into a reason to miss the daily release."
- Statement B: Owner directive + planning.md — Phase One complete and verified in production; no active multi-stage automation programme or publication path owned by it; article-to-page only via explicit manual/API trigger.
- Runtime behaviour: The three-page release unit was delivered once as Phase One (verified public routes in planning.md and `build-pack/receipts/phase-one-release.json`); no daily automated publish is active. Observed in A0001/A0002.
- Impact: The "daily" framing reads as an ongoing automated obligation and can reactivate retired scheduling by inference.
- Controlling authority: Owner directive + planning.md (Phase One complete).
- Replacement meaning: The three-page release unit and truthfulness rules remain valid; the "daily/active publishing day" cadence is reworded to a build-phase obligation that is now satisfied by the completed Phase One, with ongoing releases on-demand via explicit manual/API trigger. Wording change is prose-only; headings and UIDs preserved.
- Authoritative files to amend: D01-D10 (this pass). D01-D04 receive local wording changes; D01-D10 receive one explicit cadence-supersession rule so later legacy “daily” wording cannot be read as current scheduling authority.
- Execution corrections deferred to Plan 2: none.
- Acceptance check: Every operational source D01-D10 contains the same cadence-supersession rule; amended passages no longer assert an active daily publish obligation; the three-page release unit and truthfulness rules remain; heading count unchanged.
- Ledger/evidence refs: A0001, A0002, A0012, A0014, M004.

## C005 — Retired 06:00, 20:00, and residual 23:00 programme boundaries still described as active

- Classification: contradiction and stale wording.
- Statement A: D07 §19 and §38.9 require a 06:00 SAST editorial brief and scheduler; D08 §4.4, ARR-001, acceptance criteria, and Stage 10 require a 20:00 SAST rescue checkpoint; D03 and D06 retain active 23:00 watchdog/rescue metrics, acceptance items, escalation, and optimisation wording.
- Statement B: Owner directive 2026-10-28 and `planning.md` retire the research/editorial/optimisation/watchdog programme in full; `AGENTS.md` permits article-to-page work only through an explicit manual or API trigger.
- Actual behaviour: No 06:00, 20:00, or 23:00 scheduler exists in the current execution path. Repository search and the active automation contract show only explicit trigger execution.
- Controlling authority: Owner directive + `planning.md` + `AGENTS.md`.
- Replacement meaning: Fixed-time programme boundaries are retired. Brief schemas, recovery principles, and release units may be reused only inside an explicitly triggered run; they do not authorise recurring execution.
- Authoritative files to amend: D03, D06, D07, D08, with the cross-document cadence rule in D01-D10.
- Execution corrections deferred to Plan 2: remove or reconcile subordinate skill, prompt, test, and runtime references that still imply scheduled/heartbeat execution.
- Acceptance check: every D01-D10 source declares the cadence supersession; every 06:00, 20:00, or 23:00 source occurrence is locally marked RETIRED; fixed-time headings remain for stable-UID traceability; source count remains 12 and heading count remains 1,424.
- Ledger/evidence refs: A0048 onward; M005.

## Findings considered and classified as non-contradictions

- F-merge: "no merge without owner approval" vs "merge and deploy automatically" — the only "no merge" text is the unrelated local edit to the source checkout's `AGENTS.md` (left untouched). Execution `AGENTS.md` and `planning.md` agree on auto-merge on passing gates. Classified: not a repository contradiction; recorded as B003.
- F-phase1: D06 §9.1 (line 473) "It is not a reason to delay Phase One publication" is forward-looking/informational and consistent with Phase One being complete. Classified: intentional distinction.
- F-daily-build: D02 §3.1 three-page release unit and §3.4 failure response remain valid delivery rules and are not retired. Classified: intentional distinction (only the "daily/active publishing day" cadence is retired, not the unit).
