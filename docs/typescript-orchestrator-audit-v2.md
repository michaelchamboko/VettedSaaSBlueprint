# TypeScript orchestrator issues log v2

24 November 2026. This addendum records findings from the isolated implementation checkout based on `3fde335`. The original fifteen findings remain in [the initial audit](typescript-orchestrator-audit.md). Findings here concern the draft changes. Each is deferred unless selected as the current issue.

| ID | Related finding | Observation and evidence | Closure test |
| --- | --- | --- | --- |
| V2-01 | ORCH-01 | The new worker parser rejected a genuine Beam JSONL stream on line two. The pinned CLI emitted `step_start`, `text`, and `step_finish` events. | Consume a correctly bound result from a representative event stream through the public dispatch command. Reject incomplete or malformed output without advancing. |
| V2-02 | ORCH-04 | A disposable PostgreSQL 17 probe with two products returned one claim for known product A after a correction, but returned both claims for a previously unseen product. The executor also queried without a filter and discarded the result before issuing a research packet. | Inspect the second article’s packet. It contains only relevant, current evidence. A new product receives zero unrelated claims. |
| V2-03 | ORCH-10/11 | The draft journals deploy intent. A journal entry without a returned deployment ID still permits another deploy call. This is a code finding. A production duplicate has not been observed. | Simulate remote success followed by a lost response. Restart and prove one deploy call, with verified reconciliation or an explicit uncertain outcome. |
| V2-04 | ORCH-06/09 | Editorial helper tests and cursor fields have not established restart after an individual accepted pass. A separate blind Beam check judged four faithful and four defective synthetic rewrites correctly. | Interrupt after pass two. Retain the two accepted results and dispatch only pass three with its verified predecessor. Measure full-article judgment separately. |
| V2-05 | ORCH-12/13 | Review found runtime budget and typed error routing gaps. Successful calls were not consistently counted, and continuation selection could still depend on error wording. | Restart after one successful call at a one-turn limit. Changing the environment must not grant another call. Repeat typed errors with rewritten messages and verify identical recovery. |
| V2-06 | ORCH-02/10 | The first combined test run had 603 passes, 16 failures, and three skips. Eight failures encountered a missing publication manifest entry. After corrections the dry-run and external-failure checks passed individually. A subsequent release-suite run passed 76 of 77 tests. | Re-run the affected tests on a fixed revision. Record the outcome and distinguish real contract changes from fixture defects. |

No entry in this addendum authorizes a parallel implementation task. Close the selected issue against its normal entry point, an adverse case, and its regression tests before selecting another.

## ORCH-01 checkpoint, 24 November 2026

The requested current-revision testing action is complete. Remaining dispatch defects and missing acceptance tests stay under original ORCH-01, not new v2 issues. See orch01-handover.md. No original issue is newly closed by this checkpoint.
