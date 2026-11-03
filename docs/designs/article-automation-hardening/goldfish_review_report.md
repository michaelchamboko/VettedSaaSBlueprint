# Goldfish annotated review report

Status: round-three focused fresh-context review completed; previous post-review corrections verified. One additional Major lease finding was accepted, corrected and verified against the exact revised text by its reviewer. No open findings within this focused scope. Convergence is not claimed. Earlier round results are retained as history.

Target: automation-hardening-plan.md, full file. This report summarizes actual prior reviewer findings retained in conversation; it does not claim verbatim transcripts or newly completed reviews. All listed corrections were PROPOSE FIX and accepted by the user's auto-accept instruction. No findings were contested, escalated or declined.

## Accepted corrections and implementation in the revised plan

| Prior reviewer / ID | Severity | Discrepancy and rationale | Applied plan correction |
|---|---|---|---|
| codebase B1 | Blocker | Contracts, versioning, storage and ownership were insufficiently specified for implementation | Sections 4 and 8 define strict companions, V1/V2 dispatch, storage and file ownership |
| zoom Z1-1 | Major | Current-file checks could invalidate a legitimate historical completion | Sections 4 and 7 freeze terminal bytes, dispatch historical policy, separate current reuse eligibility |
| zoom Z1-2; design D3 | Major | Hashes and invocation records cannot establish semantic truth | Sections 2 and 5 retain scoped findings/judgments and state the trust boundary |
| comprehension C1-1 | Major | Intake/import/packet/editorial contracts unclear | Sections 3–5 and 7–8 specify identities, versions and binding |
| comprehension C1-2; readiness I3; style T1-2 | Major | Diagnosis fields, transition effects and retry counters unclear | Section 7 specifies byte digests, one-shot consumption, unchanged-input rejection and preserved counters |
| comprehension C1-3 | Major | Prose/structure versus presentation invalidation unclear | Section 7 defines dependency invalidation without weakening full-artifact editorial fingerprint rules |
| comprehension C1-4; readiness I1 | Major | Rule applicability, strength and recommendation semantics unclear | Section 3 specifies registry metadata and mandatory assessment versus adoption |
| design D1; structure S1 | Major | Alternative designs lacked rationale | Section 2 compares separate verifier and isolated terminal checks with selected shared evaluator |
| design D2 | Major | Intake writes race through caller-owned stale snapshots | Section 7 specifies run leases, reload/validate/write, revision comparison and crash reconciliation |
| zoom Z2-1 | Major | Valid early quarantine must not require publication evidence | Section 7 uses distinct live/quarantine predicates and exception accounting |
| readiness I2 | Major | OpenCode adapter shape, bindings and family resolution unspecified | Section 5 pins supported export version, scoped projections, parent/session linkage and exact family map |
| readiness I4 | Major | Legacy schema tags and fallback parsing conceal invalid evidence | Section 4 retains raw diagnostics and requires explicit future upgrade, no automatic approval migration |
| readiness I5 | Major | Capability provenance/restoration versus read-only preflight unclear | Section 6 records observed pins, manifest generation, explicit restoration and no implicit download |
| codebase B2 | Major | Duplicate creation copies old proof under new identity; deleted source loses binding | Sections 4 and 7 preserve raw source, reference origin terminal proof and require current reuse eligibility |
| codebase B3 | Major | Record-only submission digest misses changed evidence bytes | Section 7 binds transitive referenced bytes and diagnosis to exact replacement submission |
| codebase B4 | Major | Fake positive fixtures and discarded production verifier output perpetuate bypasses | Sections 8–9 replace fixtures, retain production output and test all format bindings |
| style T1-1 | Major | Scope wording confused synthetic tests and real release | Sections 1, 8 and 9 explicitly prohibit live actions in current task and distinguish future implementation |
| zoom Z1-3 | Nit | Avoid a parallel framework | Sections 2 and 7 reuse stage handlers and existing validators |
| comprehension C1-5 | Nit | Capability locations imprecise | Section 6 names exact bundle paths, pins and restoration semantics |
| feature-style F1–F3; implementation-style T1-3/T1-4 | Nit | Unclear packet/trust-boundary shorthand and recommendation disposition | Revised prose uses explicit definitions and explains non-adoption |

All original finding groups have corresponding edits. This mapping records resolution of the proposed text changes, not proof that those changes are sufficient; that is the purpose of the focused re-review below.

## Focused fresh-context re-review

All three reviewers completed with fresh context (`fork_turns: none`), the full target file, bundled personas/standards and selected primary repository paths. All were read-only. Reviewed target is preserved as automation-hardening-plan.reviewed-r2.md (130 lines at review time); the current plan includes subsequent corrections.

### readiness-r2-1 — Major — legacy intake reconciliation

Reviewer: implementation_readiness. Reviewed target lines 46, 87–100, 111. Import upgrade moves a legacy import to an unsatisfied nonterminal stage without changing intake status; existing intake selection only considers PROCESSING/PENDING. A legacy LIVE entry could therefore be skipped. Intake upgrade invocation and state policy were unspecified.

Disposition: PROPOSE FIX, applied under auto-accept. Section 7 now defines `--upgrade-intake`, archive/idempotency behavior, a fail-closed scan of terminal-labeled entries before selection, INTAKE_TERMINAL_PROOF_INVALID, and explicit `--reconcile-intake-entry` with conflict handling. Reconciliation records original status, restores PROCESSING only for matched upgraded records, and never executes work. Section 9 adds the regression test.

### codebase-r2-1 — Major — source identity race before import lease

Reviewer: codebase_details. Reviewed target lines 98–100, 111. Existing engine.ts acquires leases by allocated random import ID, while createArticleImport scans before UUID allocation. Different snapshots or direct-source/intake calls can reserve separate IDs for identical bytes before either import lease exists.

Disposition: PROPOSE FIX, applied under auto-accept. Section 7 now requires a source-fingerprint claim, durable source-to-import reservation before record creation, same-ID crash recovery, fail-closed legacy conflicts and explicit sequential lease order. Section 9 tests simultaneous initial creation and reservation crashes.

### readiness-r2-2 — Nit — diagnosis aggregation

Reviewer: implementation_readiness. Reviewed target line 102. Existing repair counts key by strategy/error-message fingerprint, so changing error messages could avoid three-failure escalation.

Disposition: PROPOSE FIX, applied under auto-accept. Section 7 aggregates unsuccessful repairs by import and productive stage while retaining detailed history; explicit upgrade derives counts and rejects incomplete history. Section 9 adds three different error messages at the same stage. Codebase reviewer also noted missing intake-upgrade syntax, consolidated into readiness-r2-1 rather than counted twice.

### zoom_out — completed, no Major or Blocker findings

Confirmed historical/current eligibility separation, genuine quarantine and duplicate boundaries, semantic-proof limitations, Eleanor/SEO/AEO sequence and no-live-action scope. No additional findings returned.

## Result and limits

The requested focused review ran to completion: zero Blockers, two Majors, one distinct Nit. All received concrete plan corrections, but corrections after that review are not a clean reviewed round. No code implementation, test execution, article authoring, intake mutation, publication, merge or deployment was performed. A future focused review should target only source reservation/lease ordering, legacy intake migration/reconciliation and stage-level repair counting. This document review does not replace required independent current-head code review after implementation.

## Round three — final-correction review

User explicitly requested this focused review and automatic acceptance of necessary fixes. Two native reviewers started with `fork_turns: none`, read the full target and required bundled persona/standard, and inspected relevant primary code. Target snapshot is automation-hardening-plan.reviewed-r3.md, SHA256 437705df1611ec2b0854a08541d8fb363963130fca9c16bcd4896bb8a16184ff. Scope: source reservation, legacy intake reconciliation, repair aggregation and associated tests; no unrelated full audit.

* implementation_readiness (`r3_readiness`): completed, no Major or Blocker findings. Confirmed source reservation/crash recovery, explicit intake migration/reconciliation, stage-level counts, file ownership and synthetic tests were actionable.
* codebase_details (`r3_recovery`): completed, one Major finding. Confirmed those corrections otherwise close their intended gaps.

### codebase-r3-1 — Major — expiry cannot fence a paused writer

Reviewed target lines 98–100 and tests 130–131. engine.ts performs ownership assertion separately from atomic rename. A worker can pause after assertion, expire and resume writing after a successor takes over. Exclusive generation claims do not make state replacement atomic with the ownership check.

Disposition: PROPOSE FIX, accepted and applied under auto-accept. The reviewer explicitly assessed the minimal remedy as sufficient for local state writers: expiry alone never permits takeover; claims bind machine/PID/process-start identity; protected writes remain in the owner process; explicit recovery requires positive proof that the prior owner exited; live, remote, partial, unknown or unverifiable ownership remains stopped. The plan now specifies the recovery command, PID-reuse checks and paused-writer/competing-recovery tests. This deliberately favors safe stopping over speculative lock deletion. Exact-text verification requested from the originating reviewer after applying the correction.

No runtime behavior has been tested or changed. Plan artifacts only; no article/import/publication actions.

### Exact-text verification result

`r3_recovery` completed the requested narrow verification after rereading revised lines 98–100 and test line 131: **Resolved at plan level; no residual gap in this narrow finding.** It confirmed no expiry-only takeover, verified local owner exit with process-start identity, source-claim application and paused-writer/competing-recovery/PID-reuse tests. This follow-up verifies the applied fix; it is not a second independent clean round. The readiness reviewer completed its initial round with no Major or Blocker findings. All requested reviews completed; no failed or missing reviewers.

Final outcome: necessary plan fixes applied and checked; no outstanding finding in the requested focused scope. Implementation, runtime tests and independent current-head code review remain future work. Repository status stayed unchanged: only pre-existing untracked scripts/_mark_live.ts and scripts/_mark_live2.ts.
