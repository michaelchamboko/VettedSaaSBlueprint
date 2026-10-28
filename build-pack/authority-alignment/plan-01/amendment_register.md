# Amendment Register — Plan 1

One entry per resolved finding. Amendments are prose-only within existing sections; no headings were renamed or removed, so stable UIDs are unchanged. Old-to-new heading/ID map: none (no renames).

## M001 — C001: retire daily publishing watchdog and 23:00 SAST premium rescue

- Finding/policy IDs: C001; P02, P03.
- Controlling decision: Owner directive 2026-10-28 (retired schedules stay retired) + planning.md "Product-owner retirement directive" + AGENTS.md.
- File/section/UID: `docs/Vetted-SaaS-Blueprint-03-AI-First-System-Architecture-and-Automation-Blueprint-v1.md` §7.10, §11.3, §11.4, §11.5, §11.6, §23 #15, §23 #16, §24 (scheduler line), Priority 12, TOC lines. UIDs unchanged (headings retained).
- Prior meaning: active operational requirement — scheduler/watchdog owns the daily deadline, 23:00 SAST takeover, premium rescue, pre-deadline checkpoints, completion condition.
- Adopted meaning: retired; retained as headings/lines for traceability only; active release is on-demand via an explicit manual or API trigger (AGENTS.md; planning.md).
- Exact changed scope: §7.10 body replaced with RETIRED note; §11.3 "preserve the daily publishing path" → "preserve the on-demand publishing path"; §11.4 body replaced with RETIRED note; §11.5 + §11.6 block replaced with RETIRED notes (line-sliced); Stage E body replaced with RETIRED note; §23 #15/#16 annotated (RETIRED 2026-10-28); §24 scheduler line annotated (RETIRED 2026-10-28); Priority 12 reason line annotated; two TOC lines annotated.
- Heading/ID change map: none (no renames).
- Affected refs/consumers: D03 only; no runtime/skill/prompt/test references found in the execution checkout (A0001).
- Focused diff: PR #39 on `codex/plan-01-authority-alignment`; historical evidence remains in the append-only ledger.
- Verification: headings retained (D03 heading count unchanged); stable UIDs unchanged; section content SHA changes recorded on regeneration (T05). `npm run verify:agent-workflow`, `npm run lint`, `npm run typecheck`, `npm test` baseline green (A0004-A0008).
- Ledger IDs: A0001, A0002, A0014, C001.
- Candidate: included in PR #39; obtain the exact current head from Git/PR metadata.

## M002 — C002: retire scheduled cloud execution

- Finding/policy IDs: C002; P02, P03.
- Controlling decision: Owner directive 2026-10-28 + planning.md.
- File/section/UID: `docs/Vetted-SaaS-Blueprint-03-…md` Stage E. UID unchanged.
- Prior meaning: Stage E is an authorised next stage ("Scheduled cloud execution").
- Adopted meaning: retired; retained as a heading for traceability; active release on-demand.
- Exact changed scope: Stage E body (6 lines) replaced with RETIRED note.
- Heading/ID change map: none.
- Affected refs/consumers: D03 only.
- Focused diff: PR #39 on `codex/plan-01-authority-alignment`.
- Verification: heading retained; stable UID unchanged.
- Ledger IDs: A0001, A0002, A0014, C002.
- Candidate: included in PR #39; obtain the exact current head from Git/PR metadata.

## M003 — C003: retire scheduled optimisation

- Finding/policy IDs: C003; P02, P06.
- Controlling decision: Owner directive 2026-10-28 + planning.md.
- File/section/UID: `docs/Vetted-SaaS-Blueprint-04-Design-System-and-Experience-Standards-v1.md` §5.9 (two sentences), §26.10, §27 item 7. UIDs unchanged (§26.10 heading retained).
- Prior meaning: §26.10 authorises scheduled evening optimisation windows coordinated with the 23:00 SAST rescue; §5.9 says states "publish on schedule" and "must not miss the daily release"; §27 item 7 asks for exact scheduled times.
- Adopted meaning: §26.10 retired; §5.9 reworded to "publish when approved and released" and "may not block an approved on-demand release"; §27 item 7 annotated (RETIRED 2026-10-28).
- Exact changed scope: two sentence edits in §5.9; §26.10 body replaced with RETIRED note; §27 item 7 annotated.
- Heading/ID change map: none.
- Affected refs/consumers: D04 only.
- Focused diff: PR #39 on `codex/plan-01-authority-alignment`.
- Verification: heading retained; stable UID unchanged.
- Ledger IDs: A0001, A0002, A0014, C003.
- Candidate: included in PR #39; obtain the exact current head from Git/PR metadata.

## M004 — C004: remove stale daily publishing obligation

- Finding/policy IDs: C004; P02, P04.
- Controlling decision: Owner directive 2026-10-28 + planning.md (Phase One complete).
- File/section/UID: D01 §1.1; D02 §3.2; D03 §2 and §23 #3/#15/#16; D04 §2 and §5.9; D05 §1; D06 §2; D07 §2; D08 §1; D09 §2; D10 §1. Headings and stable UIDs remain unchanged.
- Prior meaning: active daily/active-publishing-day obligation to deploy the three-page set.
- Adopted meaning: three-page release unit retained as a build-phase obligation satisfied by completed Phase One; ongoing releases on-demand via explicit manual/API trigger.
- Exact changed scope: D01 §1.1 sentence reworded; D02 §3.2 blockquote and explanatory body amended; D03 §23 #3 annotated; D04 §5.9 reworded (shared with M003); D01-D10 each receive the same explicit cadence-supersession rule within an existing authoritative section.
- Heading/ID decision: D02 §3.2 retains `3.2 Daily shipping rule` and stable UID `D02-S-0951e69fb4b0`. The abandoned intermediate UID `D02-S-e9102f3d6d0a` remains only in audit evidence.
- Affected refs/consumers: D01-D10 and their generated source/intelligence/build-pack projections.
- Focused diff: PR #39 on `codex/plan-01-authority-alignment`.
- Verification: heading count unchanged; D02 §3.2 retains its original stable UID after regeneration.
- Ledger IDs: A0001, A0002, A0012, A0014, C004.
- Candidate: included in PR #39; obtain the exact current head from Git/PR metadata.

## M005 — C005: retire remaining fixed-time programme boundaries

- Finding/policy IDs: C005; P02, P03.
- Controlling decision: Owner directive 2026-10-28 + `planning.md` + `AGENTS.md`.
- File/section/UID: D03 §20.1, §25, §26, §27; D06 §17.5, §22.2, §33.7; D07 §1, §19, Stage 8, §37, §38.9; D08 §4.4, §34, §35, ARR-001, Stage 10. Headings and stable UIDs remain unchanged.
- Prior meaning: active 06:00 editorial brief, 20:00 rescue checkpoint, 23:00 watchdog/rescue, and fixed-time optimisation requirements.
- Adopted meaning: all fixed-time programme boundaries are retired. Equivalent schemas or recovery mechanics may be used only within an explicit manual or API-triggered run.
- Exact changed scope: active fixed-time sentences and acceptance items replaced or annotated with `RETIRED 2026-10-28`; D08 ARR-001 changed from OPEN to CLOSED; no heading was renamed or removed.
- Affected refs/consumers: D03, D06, D07, D08; generated inventory, candidates, graph, bridge, active requirements, phase map, and source manifest.
- Verification: regression test requires the cross-document cadence rule and local retirement context for every 06:00, 20:00, and 23:00 occurrence; source count remains 12 and heading count remains 1,424.
- Ledger IDs: A0048 onward; C005.
- Candidate: included in PR #39; obtain the exact current head from Git/PR metadata.
