# Historical Full Automation v3 Plan

> **ARCHIVED 2026-07-24.** This document is preserved only as historical planning evidence. It does not control current task status, approval, execution, handoff, or publication. The active URL-to-live contract is the repository-root `planning.md`.

> Historical text below is intentionally unchanged except for this archive banner.

## 0. Document control

| Field | Value |
| --- | --- |
| Plan version | `v3` |
| Overall status | `PLANNING` |
| Base commit | `6973d26886aaa6be67f455880af2e50b5ff6a9ca` (`6973d26`) until `RESEARCH-001` proves otherwise |
| Working branch observed | `codex/autonomous-landing-publication` |
| Current task | `RESEARCH-001` — `READY` |
| Exact next action | The `RESEARCH-001` repository architecture researcher records acceptance and moves `READY → ACTIVE`; from the repository root captures `git rev-parse --show-toplevel`, branch, HEAD, worktrees, and exact dirty-state fingerprint; runs `node .gitnexus/run.cjs analyze`; compares pre/post Git status; maps architecture with GitNexus and verifies important findings in source; updates only `planning.md` plus allowed ignored `.gitnexus/**`; seals `RCPT-RESEARCH-001-001`; moves to `AWAITING_REVIEW`; stops. Any unexpected non-`.gitnexus/**` analyzer change invokes the packet's single recovery action and classified stop. |
| Target | 95% offline test-entry readiness with fresh `TQ-01`–`TQ-19` evidence, followed by separately authorized live activation; `TQ-20` stays `NOT_RUN` until live work is authorized |
| Created | 2026-07-23 |
| Implementation gate | No production implementation starts until `RESEARCH-001`–`RESEARCH-010`, `DESIGN-001`, the independent v3 plan audit, and operator plan approval are all `VERIFIED` |
| Local execution boundary | No local `npm install`, `npm ci`, `npm run build`, local dev server, or full local typecheck without explicit operator opt-in; hosted checks belong to GitHub/Vercel and Oracle checks require their named authorization |
| Live boundary | No DDL, secret placement, repository setting mutation, deployment, promotion, rollback, protected PR, merge, push, provider activation, or canary action without the task-specific `LIVE-001`–`LIVE-007` authorization |

### Overall plan states

`PLANNING → PLAN_READY → IMPLEMENTING → OFFLINE_READY → LIVE_ACTIVATING → COMPLETE`

`BLOCKED` and `EVIDENCE_RECOVERY_REQUIRED` are terminal-for-handoff states until their single prescribed recovery task is reviewed. `OFFLINE_READY` means `TQ-01`–`TQ-19` have fresh passing evidence; it does not mean live readiness.

## 1. Authority, precedence, and historical archive

### 1.1 Precedence

1. This `planning.md` controls v3 task status, evidence acceptance, handoffs, reviews, resume state, and live authorization.
2. `AGENTS.md` and `project_rules.md` control repository and safety constraints. A conflict with this document blocks the task and routes to `RESEARCH-002`; neither document may be silently reinterpreted.
3. Source code, tests, migrations, workflow files, and platform readbacks are primary implementation evidence only when fingerprinted in a verified receipt.
4. Runtime/workflow documentation controls its documented runtime domain but cannot advance a v3 task.
5. The complete v2 package, v1 plans, downloaded plans, historical build pack, and prior audits are historical claims only.

### 1.2 v2 archive location and rule

The preserved v2 package is in the registered worktree:

`<repository>/.worktrees/oracle-github-vercel-readiness-v2/`

Its master plan, v2 requirements, companion package, `P00`, `I01`–`I53`, `L01`–`L07`, `state.md`, `findings.md`, and `task_plan.md` remain intact except for explicit historical/non-authoritative banners and replacement of terminal binding claims. Do not delete, rewrite, normalize, or continue its task ledgers. Future v3 work may cite it only through an evidence record that classifies the cited claim as verified, stale, contradicted, or rejected.

### 1.3 Rejected historical status claims

The following cannot be imported as current status:

| Surface | Historical claim | Conflict | v3 disposition |
| --- | --- | --- | --- |
| Downloaded v3 input plan | `I01` inventory prepared with delta review pending; `I02`–`I53` not started | Conflicts with multiple v2 surfaces | Accepted only as the operator-provided initialization assumption; not execution proof |
| v2 `task_plan.md` | `I01` and `I02` both `in_progress`; `I03` and later not run | Conflicts with `progress.md` and `resume.md` | `contradicted`; rejected as current authority |
| v2 `state.md` | `I01` and `I02` `in_progress` | Conflicts with `progress.md` | `contradicted`; rejected as current authority |
| v2 `progress.md` | `I01`/`I02` verified, `I03` waived, `I04` verified, `I05` prepared | Conflicts with root status ledgers and lacks a v3 receipt chain | Historical evidence only; no task advancement imported |
| v2 `resume.md` | Header says current packet `I02`, body says `I05` active | Internally contradictory | `contradicted`; rejected as current authority |
| v2 `audit.md` | Claims the five status surfaces agree and v2 is `READY` | The surfaces demonstrably disagree | Audit conclusion rejected as current authority |

The v3 initialization state is therefore: no v2 implementation status is trusted; no fresh `TQ-01`–`TQ-19` pass is imported; `TQ-20` is intentionally `NOT_RUN`; discovery starts at `RESEARCH-001` after `PLAN-001` review.

## 2. Task transition and handoff contract

### 2.1 Only valid task transition

`NOT_READY → READY → ACTIVE → AWAITING_REVIEW → VERIFIED`

A task may instead end `BLOCKED` or `EVIDENCE_RECOVERY_REQUIRED`.

| State | Meaning | Who may set it |
| --- | --- | --- |
| `NOT_READY` | Dependency receipt or authorization is absent | Plan authority or reviewer |
| `READY` | The sole predecessor receipt is verified and every entry field is complete | Independent reviewer |
| `ACTIVE` | One named implementer/researcher has accepted the packet | Named implementer/researcher |
| `AWAITING_REVIEW` | Objective is complete and an exit receipt is sealed | Named implementer/researcher |
| `VERIFIED` | Independent reviewer accepts objective, receipt, evidence, and stop-condition compliance | Named independent reviewer only |
| `BLOCKED` | A named blocker prevents the bounded objective | Implementer or reviewer; classification required |
| `EVIDENCE_RECOVERY_REQUIRED` | Material evidence is missing, stale, or contradicted and the bounded recovery protocol is required | Reviewer only |

A task cannot self-advance. An implementer cannot be its reviewer. A successor consumes only the predecessor's verified exit receipt, never narrative, working files, chat history, or an unreviewed status table.

### 2.2 Mandatory entry receipt

Every executable task must have all fields below before `READY`:

- task ID and exact predecessor receipt ID;
- evidence IDs and fingerprints;
- source commit and working-tree snapshot fingerprint;
- exact allowed files or exact read-only/live actions;
- frozen interfaces and explicit non-goals;
- one bounded objective;
- named implementer specialty and different named reviewer specialty;
- validation commands/locations and expected binary result;
- one successor task enabled by a verified receipt;
- one recovery action and the classified stop reached if recovery does not resolve the issue.

### 2.3 Mandatory exit receipt

```text
receipt_id:
task_id:
predecessor_receipt_id:
status: AWAITING_REVIEW | VERIFIED | BLOCKED | EVIDENCE_RECOVERY_REQUIRED
source_commit:
working_tree_snapshot:
changed_paths:
command_results: [{command_or_location, started_at, ended_at, exit, result, evidence_id}]
evidence_fingerprints: [{evidence_id, source, commit_or_timestamp, sha256_or_platform_id, classification}]
frozen_interface_check:
deviations:
stop_condition_check:
reviewer:
review_result:
reviewed_at:
sole_next_task:
exact_next_action:
```

For this document, its own full-file hash is not embedded because that would be self-referential. Receipts fingerprint source evidence, command output, changed non-self files, and a Git commit/blob after a future commit exists.

### 2.4 Evidence classification and routing

| Classification | Definition | Sole routing |
| --- | --- | --- |
| `missing` | Required source, output, readback, or fingerprint does not exist | Run the task's one named recovery action; unresolved result becomes `EVIDENCE_RECOVERY_REQUIRED` |
| `stale` | Evidence predates source commit, interface version, platform state, or task entry snapshot | Re-run the one named producer at the current source/platform state; unresolved result becomes `EVIDENCE_RECOVERY_REQUIRED` |
| `contradicted` | Two sources make mutually exclusive claims | Record both fingerprints and run the one named adjudication action; unresolved result becomes `EVIDENCE_RECOVERY_REQUIRED` |
| `authorization-required` | Evidence requires a live or privileged action not currently authorized | Set `BLOCKED`; route only to the matching `LIVE-*` authorization record |

No classification permits an unbounded repository search, silent retry loop, historical PASS import, or assumption-based advancement.

## 3. Evidence registry

| Evidence ID | Source | Freshness/fingerprint | Classification | Permitted use |
| --- | --- | --- | --- | --- |
| `EVD-PLAN-001` | `C:/Users/micha/Downloads/PLAN (16).md`, 75 lines, read 2026-07-23 | Source file read directly; content identifies v3 structure and base `6973d26` | `verified-input` | Defines this materialization request, not repository implementation truth |
| `EVD-GIT-001` | Root `git rev-parse HEAD`, branch, status, log | HEAD `6973d26886aaa6be67f455880af2e50b5ff6a9ca`; branch `codex/autonomous-landing-publication`; observed 2026-07-23 | `verified-current` | Initial source/base identity only |
| `EVD-WTREE-001` | Root `git status --short --branch` and `git diff --stat` | Dirty root contains tracked and untracked preparation; exact snapshot must be fingerprinted by `RESEARCH-001` | `verified-current-partial` | Proves dirty state exists; does not authorize reuse |
| `EVD-GN-001` | `node .gitnexus/run.cjs status` | Indexed commit/current commit both `6973d26`; reported up to date 2026-07-23 | `verified-current-commit-only` | Proves commit index availability; does not cover dirty changes |
| `EVD-RULE-001` | `AGENTS.md` | Read 2026-07-23; Oracle, GitNexus, privacy, publication, and ownership guardrails | `verified-current-file` | Binding repository constraint input |
| `EVD-RULE-002` | `project_rules.md:48-55` | Read 2026-07-23 | `verified-current-file` | Local/hosted validation boundary |
| `EVD-V2-001` | v2 master plan and package in `oracle-github-vercel-readiness-v2` | Baseline claim `6973d26`; package preserved | `historical` | Discovery leads and provenance only |
| `EVD-V2-STATUS-001` | v2 `progress.md`, `task_plan.md`, `state.md`, `resume.md`, `audit.md` | Mutually inconsistent I01/I02/I03/I04/I05 claims | `contradicted` | Justifies reset to v3 discovery; never advances work |
| `EVD-V2-REQ-001` | v2 requirements FR-001–FR-028/NFR-001–NFR-018 | Historical v2 file, read 2026-07-23 | `historical-candidate` | Candidate requirements register pending `RESEARCH-002` |
| `EVD-V2-HIST-001` | Preserved broad-plan body | Historical digest recorded by v2: `bcddecd0c30b9fd19554938052723a5fd1b48cdde8c29432838f586b22166428` | `historical` | Provenance only |
| `EVD-LIVE-001` | Prior Oracle/GitHub/Vercel claims in v2 docs | No current readback accepted | `stale-or-unverified` | Leads for `RESEARCH-004`, `RESEARCH-006`, `RESEARCH-007`; not authorization |

Evidence is append-only inside this file. Corrections add a superseding row and retain the rejected row.

## 4. PLAN-001 — Preserve and reconcile v2

| Field | Contract |
| --- | --- |
| Status | `VERIFIED` |
| Predecessor | Operator instruction `EVD-PLAN-001` |
| Entry evidence | `EVD-PLAN-001`, `EVD-GIT-001`, `EVD-V2-001`, `EVD-V2-STATUS-001`, `EVD-RULE-001`, `EVD-RULE-002` |
| Source commit | `6973d26886aaa6be67f455880af2e50b5ff6a9ca` plus dirty-root snapshot |
| Allowed files | Create root `planning.md`; replace only the authority/binding headers or terminal binding statements in the v2 top-level master, requirements, companion surfaces, and root v2 ledgers with historical/non-authoritative language |
| Frozen interfaces | v2 bodies, task packets, evidence values, historical digest, source code, tests, workflows, SQL, package files |
| Objective | Make this file the sole future v3 authority; preserve v2 as historical evidence; reject contradictory v2 statuses without deleting evidence |
| Implementer | Planning materialization engineer |
| Independent reviewer | Independent planning-governance reviewer |
| Validation | Static inspection: one root `planning.md`; no current authority claim remains in v2 top-level surfaces; no source/runtime files changed by this task |
| Sole next task | `RESEARCH-001` |
| Recovery action | If any v2 top-level authority claim remains, run one exact text search over the v2 worktree for `Authoritative`, `binding for`, and `single-source status`, classify every hit as runtime-domain or v2-plan authority, and edit only v2-plan-authority hits; any ambiguity ends `EVIDENCE_RECOVERY_REQUIRED` |
| Reviewer result | `PASS` — independent review on 2026-07-23; 7/7 materialization criteria met; minor residual v2 body language is disclaimed by each historical banner and retained as evidence |

### RCPT-PLAN-001-001

| Receipt field | Value |
| --- | --- |
| Status | `VERIFIED` |
| Source commit | `6973d26886aaa6be67f455880af2e50b5ff6a9ca` |
| Working-tree snapshot | Dirty root preserved; no reset, clean, stash, checkout, commit, merge, or push performed |
| Changed paths | Root `planning.md`; historical/non-authoritative banner or terminal binding-line updates in v2 master plan, v2 requirements, preserved broad plan, `state.md`, `findings.md`, `task_plan.md`, and companion `progress.md`, `audit.md`, `resume.md`, `reconciliation.md`, `scope-and-gap.md`, `global-constraints.md`, `context-manifest.md`, and `external-contracts.md` |
| Command results | Root Git identity/status: PASS; GitNexus status: PASS for commit index; static v2 authority search: PASS with no undisclaimed top-level authority/binding header; sole root/all-tree `planning.md` count: 1; local build/typecheck/dev/server: NOT_RUN by rule; live platform actions: NOT_RUN |
| Evidence fingerprints | `EVD-PLAN-001`, `EVD-GIT-001`, `EVD-WTREE-001`, `EVD-GN-001`, `EVD-V2-STATUS-001`, `EVD-V2-HIST-001`; independently reviewed pre-promotion `planning.md` Git blob `fc8f3677b0921e7984afc7f61d290c8b87f480d0` |
| Deviations | None from requested planning scope; no production implementation attempted |
| Stop-condition check | No live action, prohibited local command, source edit, evidence deletion, or v2 task continuation |
| Reviewer | Independent planning-governance reviewer |
| Review result | `PASS` |
| Reviewed at | 2026-07-23 |
| Review evidence | 7/7 criteria met: sole authority, status/base/transition, full packet structure, per-task handoff contract, complete FR/NFR/TQ/recovery/live records, v2 historicalization, and no production/live claim |
| Sole next task | `RESEARCH-001` |
| Exact next action | Execute the document-control action for `RESEARCH-001`, then stop at `AWAITING_REVIEW` |

## 5. Full-profile discovery packets

All research packets are docs-only except the explicitly allowed ignored GitNexus index refresh. They may update only this file. They may read repository/platform documentation and source. They may not edit source, tests, SQL, workflows, package files, settings, secrets, or live infrastructure. Each important GitNexus finding must be verified in source at the same commit/snapshot.

### RESEARCH-001 — Repository architecture and identity

| Field | Contract |
| --- | --- |
| Status | `NOT_READY` until `RCPT-PLAN-001-001` is `VERIFIED` |
| Entry receipt | `RCPT-PLAN-001-001` |
| Entry evidence | `EVD-GIT-001`, `EVD-WTREE-001`, `EVD-GN-001`, `EVD-RULE-001`, `EVD-RULE-002` |
| Source commit | `6973d26`; researcher must record whether branch/HEAD changed |
| Allowed files/actions | Read repository; update `planning.md`; refresh `.gitnexus/**` with `node .gitnexus/run.cjs analyze` before graph mapping; compare pre/post Git status; any non-`.gitnexus/**` analyzer change is a deviation and stop |
| Frozen interfaces | None selected; this task discovers boundaries only |
| Objective | Prove repository root, commit, dirty-state inventory, worktrees, component architecture, actor boundaries, import/process map, and authoritative runtime documents |
| Implementer | Repository architecture researcher |
| Independent reviewer | Source/graph verification reviewer |
| Exit receipt | `RCPT-RESEARCH-001-001`: exact Git/GitNexus outputs, dirty inventory fingerprint, architecture map with source lines, graph-to-source verification, contradictions, deviations |
| Sole next task | `RESEARCH-002` |
| Recovery/stop | Single recovery: rebuild GitNexus once with the project-local runner and verify one representative process in source; if unavailable, inconsistent, or non-index files change unexpectedly, stop `EVIDENCE_RECOVERY_REQUIRED` |

### RESEARCH-002 — Requirements and decision provenance

| Field | Contract |
| --- | --- |
| Status | `NOT_READY` |
| Entry receipt | `RCPT-RESEARCH-001-001` |
| Entry evidence | Verified architecture receipt plus `EVD-V2-REQ-001`, PRD, `AGENTS.md`, `project_rules.md`, approved URL source, current source contracts |
| Source commit | Receipt source commit only |
| Allowed files/actions | Read-only sources; update `planning.md` |
| Frozen interfaces | None; candidate FR/NFR/DEC records are adjudicated here |
| Objective | Revalidate FR-001–FR-028, NFR-001–NFR-018, actor permissions, non-goals, and DEC-001–DEC-017; classify each as confirmed, inferred, proposed, superseded, or decision-required with source evidence |
| Implementer | Requirements provenance analyst |
| Independent reviewer | Requirements and operator-intent reviewer |
| Exit receipt | `RCPT-RESEARCH-002-001`: complete requirement/decision matrix, evidence IDs, unresolved decisions, rejected historical claims |
| Sole next task | `RESEARCH-003` |
| Recovery/stop | Single recovery: compare only the PRD, current repository rules, current contract/source, and the v2 candidate row for each disputed ID; unresolved contradiction stops `EVIDENCE_RECOVERY_REQUIRED` |

### RESEARCH-003 — Current implementation and gap map

| Field | Contract |
| --- | --- |
| Status | `NOT_READY` |
| Entry receipt | `RCPT-RESEARCH-002-001` |
| Entry evidence | Verified requirements matrix and architecture receipt |
| Source commit | Receipt source commit only |
| Allowed files/actions | Read source/tests/workflows/docs; GitNexus query/context; update `planning.md` |
| Frozen interfaces | None; records implemented, partial, absent, dead, bypassed, and duplicate paths |
| Objective | Map every confirmed requirement to current symbols, active execution flows, tests, missing behavior, prepared dirty-root artifacts, and historical-only scaffolds |
| Implementer | Implementation archaeology researcher |
| Independent reviewer | Code-path and reachability reviewer |
| Exit receipt | `RCPT-RESEARCH-003-001`: source-verified implementation matrix and prioritized gaps |
| Sole next task | `RESEARCH-004` |
| Recovery/stop | Single recovery: trace the disputed entry point to terminal behavior once using GitNexus and source; unresolved routing or multiple active authorities stops `EVIDENCE_RECOVERY_REQUIRED` |

### RESEARCH-004 — Oracle readiness and migration safety

| Field | Contract |
| --- | --- |
| Status | `NOT_READY` |
| Entry receipt | `RCPT-RESEARCH-003-001` |
| Entry evidence | Current gap map, migration scripts/SQL, DB client, repository rules, historical T02A claim |
| Source commit | Receipt source commit only |
| Allowed files/actions | Static/source review and approved documentation research; no Oracle connection, DDL, wallet access, or secret read; update `planning.md` |
| Frozen interfaces | Candidate `OracleReadinessReceiptV1`, `OracleMigrationPlanV1`; not frozen until `DESIGN-001` |
| Objective | Prove current T02A path, thin/thick mode boundary, wallet/config safety, DDL auto-commit implications, V003 restart behavior, ledger/guard/verify/teardown gaps, and disposable test needs |
| Implementer | Oracle migration safety researcher |
| Independent reviewer | Independent Oracle migration reviewer |
| Exit receipt | `RCPT-RESEARCH-004-001`: object/step inventory, failure modes, redaction boundary, live authorization boundary, migration test obligations |
| Sole next task | `RESEARCH-005` |
| Recovery/stop | Single recovery: inspect only current migration runner, V003 SQL, verify SQL, DB client, and Oracle documentation for the disputed semantic; any requirement for live metadata becomes `authorization-required` and the task stops `BLOCKED` |

### RESEARCH-005 — Durable publication state and finalization

| Field | Contract |
| --- | --- |
| Status | `NOT_READY` |
| Entry receipt | `RCPT-RESEARCH-004-001` |
| Entry evidence | Current implementation map and Oracle safety receipt |
| Source commit | Receipt source commit only |
| Allowed files/actions | Read repository/state/publication/admin/orchestration code and tests; update `planning.md` |
| Frozen interfaces | Candidate automation states, repository, gate, release, and publication receipts; not frozen until `DESIGN-001` |
| Objective | Identify every publication mutation path; prove durability/restart/CAS/atomicity behavior; define release-pending and receipt-bound finalization gaps; detect process-local or generated-artifact authority |
| Implementer | Publication-state researcher |
| Independent reviewer | Data-integrity and publication-authority reviewer |
| Exit receipt | `RCPT-RESEARCH-005-001`: mutation-path inventory, invariant map, bypass findings, transaction/concurrency test obligations |
| Sole next task | `RESEARCH-006` |
| Recovery/stop | Single recovery: trace each disputed `published` write from caller to storage once; an unresolvable dynamic path or conflicting authority stops `EVIDENCE_RECOVERY_REQUIRED` |

### RESEARCH-006 — GitHub security and release plane

| Field | Contract |
| --- | --- |
| Status | `NOT_READY` |
| Entry receipt | `RCPT-RESEARCH-005-001` |
| Entry evidence | Current workflow/client/outbox files, repository rules, publication receipt contract |
| Source commit | Receipt source commit only |
| Allowed files/actions | Static workflows/code review and current official documentation research; no GitHub setting/API mutation, token mint, PR, merge, push, or secret read; update `planning.md` |
| Frozen interfaces | Candidate JCS/Ed25519 envelope, outbox, GitHub App token, evidence refs, PR/check/merge client |
| Objective | Prove trusted/untrusted separation, action pinning, least permissions, App topology, signing/key custody, replay/idempotency, deterministic refs/PRs, exact checks, and legacy workflow reachability |
| Implementer | CI/application-security researcher |
| Independent reviewer | Independent GitHub Actions and supply-chain reviewer |
| Exit receipt | `RCPT-RESEARCH-006-001`: workflow threat model, permissions matrix, key boundary, transport contract candidates, retirement inventory |
| Sole next task | `RESEARCH-007` |
| Recovery/stop | Single recovery: evaluate the one disputed workflow/job against current source and official GitHub documentation; any needed live setting readback becomes `authorization-required` and stops `BLOCKED` |

### RESEARCH-007 — Vercel deployment, verification, promotion, rollback

| Field | Contract |
| --- | --- |
| Status | `NOT_READY` |
| Entry receipt | `RCPT-RESEARCH-006-001` |
| Entry evidence | Current Vercel config/routes/verifiers/workflows and release-plane receipt |
| Source commit | Receipt source commit only |
| Allowed files/actions | Static code/config review and current official documentation research; no deployment, promotion, rollback, alias mutation, token use, or project setting change; update `planning.md` |
| Frozen interfaces | Candidate release manifest, staged receipt, production receipt, publication audit, deployment metadata |
| Objective | Prove preview/production boundaries, protected staging, metadata/SHA binding, route verification, promotion semantics, canonical readback, rollback eligibility, convergence timeouts, and compensation |
| Implementer | Deployment/reliability researcher |
| Independent reviewer | Independent Vercel deployment and rollback reviewer |
| Exit receipt | `RCPT-RESEARCH-007-001`: deployment state model, verification matrix, current-vs-live-readback split, rollback triggers and bounded timing |
| Sole next task | `RESEARCH-008` |
| Recovery/stop | Single recovery: evaluate only the disputed endpoint/config behavior against current official Vercel documentation; any project-specific fact requiring live readback becomes `authorization-required` and stops `BLOCKED` |

### RESEARCH-008 — Test strategy and evidence gates

| Field | Contract |
| --- | --- |
| Status | `NOT_READY` |
| Entry receipt | `RCPT-RESEARCH-007-001` |
| Entry evidence | Receipts `RESEARCH-001`–`RESEARCH-007`, current package scripts, tests, CI, project validation rules |
| Source commit | Receipt source commit only |
| Allowed files/actions | Static test/command inspection; only commands allowed by repository rules and explicit operator opt-in; update `planning.md` |
| Frozen interfaces | `TQ-01`–`TQ-20` candidate definitions |
| Objective | Define fresh binary evidence for each gate, correct execution location, fixtures/adapters/disposable Oracle boundary, negative/failure-injection matrix, and clean-checkout proof |
| Implementer | Test architecture researcher |
| Independent reviewer | Independent verification-evidence reviewer |
| Exit receipt | `RCPT-RESEARCH-008-001`: executable test matrix with command/location, owner, fingerprint, expected result, and freshness rule |
| Sole next task | `RESEARCH-009` |
| Recovery/stop | Single recovery: inspect the declared script, its direct config, and the targeted test files once; missing command or forbidden location stops `EVIDENCE_RECOVERY_REQUIRED` |

### RESEARCH-009 — Operational risk, observability, and recovery

| Field | Contract |
| --- | --- |
| Status | `NOT_READY` |
| Entry receipt | `RCPT-RESEARCH-008-001` |
| Entry evidence | Architecture, platform, migration, publication, and test receipts |
| Source commit | Receipt source commit only |
| Allowed files/actions | Static source/docs review; no live alerts, kill switch, platform, or secret mutation; update `planning.md` |
| Frozen interfaces | Candidate reason-code, status projection, retry/lease/cap/alert/recovery contracts |
| Objective | Bound retries, leases, caps, timeouts, alert ownership, kill-switch races, redaction, restart recovery, preactivation teardown, postactivation forward-fix, and operator runbooks |
| Implementer | Site-reliability and operations researcher |
| Independent reviewer | Independent failure-recovery reviewer |
| Exit receipt | `RCPT-RESEARCH-009-001`: risk register, reason/alert matrix, recovery decision tree, and measurable timing obligations |
| Sole next task | `RESEARCH-010` |
| Recovery/stop | Single recovery: model the disputed failure from last durable state to terminal/compensated state once; an unbounded or ownerless outcome stops `EVIDENCE_RECOVERY_REQUIRED` |

### RESEARCH-010 — Adversarial feasibility and lower-capability handoff

| Field | Contract |
| --- | --- |
| Status | `NOT_READY` |
| Entry receipt | `RCPT-RESEARCH-009-001` |
| Entry evidence | All prior verified research receipts |
| Source commit | Receipt source commit only |
| Allowed files/actions | Read-only adversarial analysis; update `planning.md` |
| Frozen interfaces | None; challenges candidate design |
| Objective | Attempt to break evidence handoffs, migration recovery, security boundaries, deployment/rollback, publication authority, offline/live separation, and one-task executability by a lower-capability agent |
| Implementer | Adversarial systems analyst |
| Independent reviewer | Independent feasibility and handoff reviewer |
| Exit receipt | `RCPT-RESEARCH-010-001`: attack cases, unresolved defects, bounded corrections, and `PASS`/`FAIL` recommendation for `DESIGN-001` |
| Sole next task | `DESIGN-001` |
| Recovery/stop | Single recovery: run the 15-assignment recovery record in §6; any incomplete assignment leaves the task `EVIDENCE_RECOVERY_REQUIRED` and `DESIGN-001` `NOT_READY` |

## 6. Fifteen-assignment evidence recovery record

This protocol runs only when a research reviewer sets `EVIDENCE_RECOVERY_REQUIRED`. It is one bounded record, not fifteen open-ended searches. Each assignment receives one question, one source set, one output fingerprint, and one conclusion. No assignment may recurse.

| Assignment | Bounded question | Allowed source set | Required output |
| --- | --- | --- | --- |
| `ER-01` | Is the repository/worktree/commit identity correct? | Git metadata and registered worktrees | Root, branch, commit, snapshot fingerprint |
| `ER-02` | What dirty/prepared paths exist and who owns them? | `git status`, `git diff`, untracked path inventory | Exact path/disposition table |
| `ER-03` | What is v2 provenance and which claims are historical? | v2 master/package/ledgers only | Source/fingerprint/claim classification |
| `ER-04` | What is each disputed FR/NFR source? | PRD, repository rules, current source contract, one v2 candidate row | One adjudication row per disputed ID |
| `ER-05` | What is the actual architecture/process entry point? | Fresh GitNexus graph and matching source | Graph path plus source verification |
| `ER-06` | Which interface version is currently active? | Current contracts, parsers, producers, consumers | Version/producer/consumer matrix |
| `ER-07` | What is current Oracle migration shape? | Migration runner, V003 SQL, verify SQL, DB client | Named-step and guard inventory; no live claim |
| `ER-08` | What writes publication state? | Publication/admin/repository/storage code | Complete write-path list |
| `ER-09` | Is the GitHub boundary trusted and replay-safe? | Workflow files, clients, envelope/outbox code | Job/permission/secret/data-flow matrix |
| `ER-10` | Are Vercel stage/promotion/rollback semantics supported? | Current config/verifier and official docs | Supported operation/readback matrix |
| `ER-11` | What fresh test evidence can be produced where? | Package scripts, tests, CI, project rules | Command/location/freshness table |
| `ER-12` | Are retries, leases, caps, alerts, and recovery bounded? | Current operational code/docs | Timing/owner/terminal-state table |
| `ER-13` | Which facts require live authorization? | Candidate live facts and `LIVE-*` scopes | `authorization-required` routing table |
| `ER-14` | Which sources still contradict? | Outputs `ER-01`–`ER-13` only | Contradiction matrix with no new search |
| `ER-15` | Can an independent adjudicator select implementation safely? | Completed recovery record only | `PASS`, `BLOCKED`, or one decision request |

If `ER-15` is not `PASS`, no implementation/design selection occurs. The reviewer records exactly one blocker or operator decision request and stops.

## 7. Candidate requirements register

These candidate requirements are embedded so one task handoff is self-contained. Their source is historical `EVD-V2-REQ-001`; none becomes frozen until `RESEARCH-002` verifies it and `DESIGN-001` maps it to tests/tasks.

### Functional requirements

| ID | Candidate requirement | Candidate acceptance |
| --- | --- | --- |
| `FR-001` | Exact byte-preserved allowlist authorization | Only validated exact URLs create unattended runs; digest and durable identity exist |
| `FR-002` | Authorization never replaces evidence/quality/release gates | One negative test per gate prevents a release request |
| `FR-003` | Correct state transition chain | Gate, merge, deploy, and publish cannot be skipped or reordered |
| `FR-004` | Redacted Oracle T02A readiness before migration | Approved runtime returns `1` from a read-only query; no secret/path disclosure |
| `FR-005` | Restart-safe, ledgered V003 migration | Failure after each DDL boundary resumes without loss |
| `FR-006` | Complete Oracle publication guards | Insert/status/published-at/current-version changes require matching passing receipt |
| `FR-007` | Oracle remains authoritative after restart | A second repository instance reads and continues prior state |
| `FR-008` | CAS transitions and atomic release header/items | One concurrent winner; stale conflict; injected failure leaves no partial release |
| `FR-009` | One receipt-gated publication service | Manual/unattended produce release-pending; only receipt finalizes published |
| `FR-010` | Repository-scoped GitHub App protected-PR flow | No broad admin/PAT; no merge while required checks fail/pending |
| `FR-011` | Trusted/untrusted workflow separation | No untrusted code executes with secrets/write; immutable action pins |
| `FR-012` | Authenticated replay-resistant workflow transport | Invalid signature/audience/time/nonce/digest causes no transition |
| `FR-013` | Vercel provenance and complete route verification | Wrong host/SHA/route/robots/disclosure/CTA/sitemap/tracking/readback blocks publish |
| `FR-014` | Separately controlled one-time configuration gates | Preflight, scoped authorization, action, rollback trigger, and readback are recorded |
| `FR-015` | Durable `1 + 3 + 1` canary order | Each wave waits for prior production receipts and retro |
| `FR-016` | Executable reconciliation and durable child scheduling | Replayed outbox creates no duplicate parent/child run |
| `FR-017` | Ordered Stage 0 through retro sequence | Missing producer terminates with named block/failure |
| `FR-018` | Durable wave barriers | No release before predecessor wave receipt and retro |
| `FR-019` | Batch V3 per-product identity | Three calibration products cannot alias; mixed versions rejected |
| `FR-020` | Immutable complete `GateBundleV1` | Exactly one passing bound receipt per independent gate |
| `FR-021` | End-to-end commit/artifact/evidence provenance | Conflicting immutable ref/tree/digest identity is rejected |
| `FR-022` | Operator-visible state, version, reason, and next action | Version advances only on accepted durable state change |
| `FR-023` | State-specific allowlist revocation | Removal blocks new/finalizing work and records cancellation/noindex atomically |
| `FR-024` | Exact signed outbox and command transport | Expired/mismatched/replayed artifacts or commands are rejected |
| `FR-025` | Independent gate producers | One producer cannot self-attest another; missing producer blocks bundle |
| `FR-026` | Atomic deployed artifact set | Stage/canonical/finalization consume the same immutable release manifest |
| `FR-027` | Five-URL injected/disposable simulation | Five distinct end-to-end chains, zero recurring owner page approvals |
| `FR-028` | Evidence-insufficient products fail closed | Insufficient evidence blocks; sufficient audited evidence may advance without fabrication |

### Non-functional requirements

| ID | Candidate requirement and measurable acceptance |
| --- | --- |
| `NFR-001` | Fail closed on unknown authorization, evidence, compliance, receipt, or external state |
| `NFR-002` | Restart/retry durability with no duplicate page, release, reservation, or receipt |
| `NFR-003` | No secrets, wallet paths, tokens, keys, connection strings, raw bodies, or environment values in logs/artifacts/chat |
| `NFR-004` | Five-minute signed-command window, nonce replay rejection, exact-event idempotency |
| `NFR-005` | Transactional capacity reservation, bounded Oracle connections, cap at ten pages per batch/day |
| `NFR-006` | V1/V2 and `landing_workflow_v4` remain readable; no existing production row is rewritten/deleted by V003 |
| `NFR-007` | Immutable full-SHA Actions and least-privilege workflow permissions |
| `NFR-008` | Redacted correlation IDs for run/version/release/PR/deployment/retry/reason |
| `NFR-009` | Teardown only preactivation with empty-data proof; postactivation recovery is forward-fix |
| `NFR-010` | First-party-only page/CTA/affiliate/link-error/FAQ tracking; no third-party profiling |
| `NFR-011` | Bounded production convergence at ten minutes; timeout never falsely publishes |
| `NFR-012` | Injected repositories, token clients, verifiers, and isolated provider/infrastructure adapters |
| `NFR-013` | Fresh clean-checkout, GitNexus-indexed evidence; no normalized historical baseline |
| `NFR-014` | Every external stage declares timeout, jitter/backoff, exhaustion, and terminal state |
| `NFR-015` | Versioned stable statuses/reason codes; unknown versions fail closed |
| `NFR-016` | Desktop, mobile, reduced-motion, and accessibility checks pass before gate bundle |
| `NFR-017` | Measurable alerts with owner/reason for migration, replay, CAS, lease, cap, provider, App, verifier, receipt, rollback, kill switch |
| `NFR-018` | Regression proof that legacy bearer callback automation is unreachable |

## 8. DESIGN-001 — Freeze the automation contract

| Field | Contract |
| --- | --- |
| Status | `NOT_READY` |
| Entry receipt | `RCPT-RESEARCH-010-001` with reviewer `PASS` |
| Entry evidence | All ten verified research receipts and any completed recovery record |
| Source commit | Research receipt source commit; a changed commit invalidates entry |
| Allowed files/actions | Update `planning.md` only; no source implementation |
| Frozen interfaces | Oracle/Hermes control plane; GitHub App/outbox release plane; Vercel serving plane; publication lifecycle; state/event/reason model; receipt schema; offline/live boundary; exact file ownership |
| Objective | Select one coherent architecture, freeze all versions and invariants, map every verified FR/NFR to tests and implementation packets, split milestones into non-overlapping exact-file child packets, and define migration/deploy/rollback handoffs |
| Implementer | Automation architecture designer |
| Independent reviewer | Cross-plane architecture and requirements reviewer |
| Exit receipt | `RCPT-DESIGN-001-001`: frozen contract digest, FR/NFR matrix, exact path ownership, dependency DAG, test commands/locations, live boundary, rejected alternatives |
| Sole next task | `AUDIT-PLAN-001` |
| Recovery/stop | Single recovery: return the disputed interface to the owning research receipt and re-adjudicate that interface once; unresolved conflict stops `EVIDENCE_RECOVERY_REQUIRED` |

### Candidate interface inventory to freeze or reject

- `AutomationEventV1`
- `AutomationRunStateV1`
- `PagePublicationStateV1`
- stable reason-code enum
- `OracleReadinessReceiptV1`
- `OracleMigrationPlanV1`
- `LandingAutomationRepositoryV1`
- `EvidenceBundleV1`
- `AuthoringCommandV1`
- `CodexLandingBatchV3`
- `GateBundleV1`
- `SignedWorkflowEnvelopeV1`
- `GitHubOutboxArtifactV1`
- `GitHubReleaseClientV1`
- `ReleaseManifestV1`
- `StagedVerificationReceiptV1`
- `ProductionVerificationReceiptV1`
- `PublishedLandingAuditV1`

Unknown versions fail closed. V1/V2 page artifacts and `landing_workflow_v4` remain read-compatible unless verified research and operator approval explicitly supersede that compatibility requirement.

## 9. Offline implementation milestones

These are dependency-complete milestones, not executable source-edit packets yet. Each is `NOT_READY` with allowed implementation files `NONE` until `DESIGN-001` replaces the candidate ownership field with exact disjoint paths and embedded child packets. No milestone may overlap another milestone's files without an explicit sequential dependency in the frozen design receipt.

| ID | Bounded objective | Candidate requirement groups | Entry receipt | Allowed files now | Independent reviewer | Exit receipt / sole next | Recovery/stop |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `BUILD-001` | Clean baseline; correct state, status, reason, and contract surfaces | FR-003; NFR-013, NFR-015, NFR-018 | Operator-approved `RCPT-AUDIT-PLAN-001` | `NONE` | Contract/state reviewer | `RCPT-BUILD-001` enables `BUILD-002` | Revalidate exact changed interface once; unresolved drift → `EVIDENCE_RECOVERY_REQUIRED` |
| `BUILD-002` | T02A contract and restart-safe V003 plan/ledger/steps/guards/verify/preactivation path | FR-004–FR-006; NFR-003, NFR-009 | `RCPT-BUILD-001` | `NONE` | Oracle migration reviewer | `RCPT-BUILD-002` enables `BUILD-003` | Run one disposable failure-boundary reproduction; unresolved → `EVIDENCE_RECOVERY_REQUIRED`; live need → `BLOCKED` |
| `BUILD-003` | Durable Oracle repository, CAS, atomic release, and receipt-bound publication | FR-007–FR-009, FR-022–FR-023; NFR-001–NFR-002, NFR-005 | `RCPT-BUILD-002` | `NONE` | Persistence/publication reviewer | `RCPT-BUILD-003` enables `BUILD-004` | Run one injected transaction/restart reproduction; unresolved → `EVIDENCE_RECOVERY_REQUIRED` |
| `BUILD-004` | Reconciliation, waves, research/evidence, V3 authoring, independent gates, immutable gate bundle | FR-001–FR-002, FR-015–FR-020, FR-025, FR-028; NFR-006, NFR-010, NFR-012, NFR-016 | `RCPT-BUILD-003` | `NONE` | Research/quality-gate reviewer | `RCPT-BUILD-004` enables `BUILD-005` | Reproduce one failing producer boundary; unresolved → `EVIDENCE_RECOVERY_REQUIRED` |
| `BUILD-005` | JCS/Ed25519 envelope, replay protection, durable outbox, evidence refs, App token and release client | FR-010, FR-012, FR-021, FR-024; NFR-003–NFR-004, NFR-007–NFR-008 | `RCPT-BUILD-004` | `NONE` | Cryptographic transport/App reviewer | `RCPT-BUILD-005` enables `BUILD-006` | Run one tamper/replay/idempotency reproduction; unresolved → `EVIDENCE_RECOVERY_REQUIRED` |
| `BUILD-006` | Trusted GitHub workflows and complete legacy workflow retirement | FR-010–FR-012, FR-024; NFR-007, NFR-018 | `RCPT-BUILD-005` | `NONE` | CI supply-chain reviewer | `RCPT-BUILD-006` enables `BUILD-007` | Run one static workflow trust-boundary analysis; unresolved → `EVIDENCE_RECOVERY_REQUIRED` |
| `BUILD-007` | Vercel protected staging, route verification, promotion lease, canonical verify, rollback, finalization | FR-013, FR-026; NFR-011, NFR-014, NFR-017 | `RCPT-BUILD-006` | `NONE` | Deployment/rollback reviewer | `RCPT-BUILD-007` enables `BUILD-008` | Run one fake-adapter compensation scenario; project readback need → `BLOCKED authorization-required` |
| `BUILD-008` | Injected/disposable five-URL E2E and fresh 19-gate audit | FR-001–FR-028; NFR-001–NFR-018 | `RCPT-BUILD-007` | `NONE` | Independent integration/release-readiness reviewer | `RCPT-BUILD-008` enables `LIVE-001` preflight only and may set `OFFLINE_READY` | Re-run only the failed gate producer once; unresolved → `EVIDENCE_RECOVERY_REQUIRED` |

Every future embedded child packet must repeat the full entry/exit/reviewer/next/recovery contract from §2. A milestone receipt is invalid if any child receipt is missing, self-reviewed, stale, or has overlapping unapproved file ownership.

## 10. Fresh test-quality gates

No historical test count or PASS is accepted. `RESEARCH-008` freezes exact commands, locations, fixtures, and fingerprints; `DESIGN-001` maps them to child packets.

| Gate | Evidence obligation | Status |
| --- | --- | --- |
| `TQ-01` | Clean checkout, commit, dirty-path disposition, GitNexus freshness | `NOT_RUN` |
| `TQ-02` | Hosted typecheck, lint, build, and runtime contract | `NOT_RUN` |
| `TQ-03` | Exact allowlist and revocation | `NOT_RUN` |
| `TQ-04` | Transition/status/reason model | `NOT_RUN` |
| `TQ-05` | Complete independent gate bundle | `NOT_RUN` |
| `TQ-06` | Offline T02A contract and redaction | `NOT_RUN` |
| `TQ-07` | V003 parser/plan/ledger/idempotency unit contract | `NOT_RUN` |
| `TQ-08` | Disposable migration failure/resume | `NOT_RUN` |
| `TQ-09` | Oracle publication guard behavior | `NOT_RUN` |
| `TQ-10` | Repository restart/CAS/atomicity | `NOT_RUN` |
| `TQ-11` | Unified receipt-gated publication | `NOT_RUN` |
| `TQ-12` | Signed transport, replay, expiry, idempotency | `NOT_RUN` |
| `TQ-13` | GitHub App token/release client | `NOT_RUN` |
| `TQ-14` | Workflow trust, permissions, immutable pins, legacy retirement | `NOT_RUN` |
| `TQ-15` | Protected staged multi-route verifier | `NOT_RUN` |
| `TQ-16` | Vercel provenance, promotion, canonical verification, rollback | `NOT_RUN` |
| `TQ-17` | Failure injection, retries, leases, compensation | `NOT_RUN` |
| `TQ-18` | Secret/privacy safety, desktop/mobile/reduced-motion/accessibility | `NOT_RUN` |
| `TQ-19` | Complete five-URL injected/disposable E2E and 19-gate audit | `NOT_RUN` |
| `TQ-20` | Separately authorized live `LIVE-001`–`LIVE-007` evidence | `NOT_RUN` — must remain so until live activation |

`OFFLINE_READY` requires all `TQ-01`–`TQ-19` `PASS` against one reviewed source commit and complete receipt chain. A waiver, skip, historical output, stale hosted check, or partial platform readback is not a PASS.

## 11. Separately authorized live activation

Live packets are sequential and do not inherit authorization. A packet is read-only/preflight while `authorization_status` is not `GRANTED`. No approval in chat or another packet is reusable. Each authorization records exact scope, actor, time, target IDs, preflight receipt, rollback trigger, expiry, and post-action readback.

| ID | Live objective | Predecessor | Authorization status | Preflight receipt | Rollback/stop trigger | Post-action readback | Sole next |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `LIVE-001` | Approved-runtime T02A; separately authorize V003 apply/verify | `RCPT-BUILD-008`, all TQ-01–19 PASS | `NOT_GRANTED` | Oracle runtime/config/schema/checksum/kill-switch/backup evidence | Any T02A fail, ambiguous schema, checksum drift, partial step; forward-fix after activation | Redacted T02A, migration ledger, object/behavior verification | `LIVE-002` |
| `LIVE-002` | GitHub plan, repository-only App, keys, protection, exact checks, auto-merge | `RCPT-LIVE-001` | `NOT_GRANTED` | Repo/plan/App permission/secret-name/protection plan | App over-scope, missing protection, secret exposure, failed readback | App install scope, protection, checks, auto-merge state | `LIVE-003` |
| `LIVE-003` | Provider credential/model/quota/budget activation behind wrapper | `RCPT-LIVE-002` | `NOT_GRANTED` | Wrapper/host/model/schema/quota/budget/redaction | Host/model/schema/credential/quota/budget mismatch | Redacted provider health and budget/quota presence | `LIVE-004` |
| `LIVE-004` | Vercel project/protection/staging/token/rollback eligibility/settings | `RCPT-LIVE-003` | `NOT_GRANTED` | Project/team/alias/tier/Git integration/env-name/protection/previous deployment | Wrong project/host/tier, missing eligible rollback, protection failure | Redacted setting names, canonical alias, tier, eligible rollback ID | `LIVE-005` |
| `LIVE-005` | Protected non-production App PR and full required-check proof | `RCPT-LIVE-004` | `NOT_GRANTED` | Exact test branch/commit/checks/no-production target/kill switch | Secret exposure, untrusted execution, failed/pending check, unexpected deploy | PR/check/App-token/preview readback; no production mutation | `LIVE-006` |
| `LIVE-006` | Real `1 + 3 + 1` five-URL canary with promotion/rollback controls | `RCPT-LIVE-005` | `NOT_GRANTED` | All prior live receipts, kill switch, cap, evidence, previous deployment, operator window | Any gate/receipt/route/provenance/alias failure; re-enable kill switch and rollback when eligible | Per-URL run/gate/PR/SHA/deploy/receipt and 1+3+1 barrier readbacks | `LIVE-007` |
| `LIVE-007` | Final requirements, security, migration, and release audit | `RCPT-LIVE-006` | `NOT_GRANTED` | Complete immutable live receipt chain | Any critical/important defect, missing evidence, stale fingerprint | Final FR/NFR/TQ/security/migration/rollback audit | `COMPLETE` only on independent PASS |

### Live authorization record schema

```text
authorization_id:
live_task:
status: NOT_GRANTED | GRANTED | EXPIRED | CONSUMED | REVOKED
scope:
explicit_exclusions:
actor:
granted_at:
expires_at:
target_ids:
preflight_receipt_id:
rollback_trigger:
rollback_target:
post_action_readback_required:
consumed_at:
reviewer:
review_result:
```

Current authorization records: none. `LIVE-001`–`LIVE-007` remain `NOT_READY` and `NOT_GRANTED`.

## 12. Independent plan audit and approval

### AUDIT-PLAN-001

| Field | Contract |
| --- | --- |
| Status | `NOT_READY` |
| Entry receipt | `RCPT-DESIGN-001-001` |
| Allowed files | `planning.md` only |
| Objective | Challenge evidence freshness/provenance, handoff sufficiency, task/file ownership, migration safety/recovery, publication authority, GitHub security, Vercel staging/promotion/rollback, TQ coverage, live authorization separation, and lower-capability executability |
| Review panel | Requirements auditor; Oracle migration auditor; application-security/CI auditor; deployment/rollback auditor; lower-capability handoff auditor; none may be a `RESEARCH-*` or `DESIGN-001` implementer |
| PASS metric | Every criterion below PASS, no critical/important finding open, all corrections independently re-reviewed |
| Exit receipt | `RCPT-AUDIT-PLAN-001` with panel results and operator approval field |
| Sole next task | Operator plan approval, then `BUILD-001` |
| Recovery/stop | One correction task per failed criterion, sequentially; any unresolved critical/important finding leaves overall status `PLANNING` and stops implementation |

Audit criteria:

1. `planning.md` is the sole active v3 planning/execution authority and v2 is historical-only.
2. Every executable packet has exact predecessor evidence, source commit, allowed files/actions, frozen interfaces, one objective, independent reviewer, exit receipt, sole successor, and one recovery action.
3. No successor can consume narrative or an unverified receipt.
4. All verified FR-001–FR-028 and NFR-001–NFR-018 map to implementation packets and fresh tests.
5. File ownership is exact, disjoint, and sequential where overlap is unavoidable.
6. Oracle T02A precedes live DDL; V003 is resumable; guards are behavioral; pre/postactivation recovery is explicit.
7. Oracle is durable publication authority; no process-local/generated/client self-attestation can publish.
8. GitHub trust, App scope, signing, replay, refs, PRs, checks, and legacy retirement fail closed.
9. Vercel staging, verification, promotion, canonical readback, rollback eligibility, compensation, and timeouts are supported and bounded.
10. `TQ-01`–`TQ-19` require fresh evidence at one reviewed commit; `TQ-20` remains `NOT_RUN` before live activation.
11. Every `LIVE-*` packet has distinct authorization, preflight, rollback trigger, and post-action readback.
12. A lower-capability agent given one task packet can identify permitted changes, required evidence, binary success, sole successor, and exact stop without repository rediscovery.
13. Evidence recovery is bounded to the 15-assignment record and cannot recurse.
14. No local or live rule is weakened by waiver or historical PASS import.
15. Operator explicitly approves the verified v3 plan after panel PASS.

`PLAN_READY` is forbidden until `RCPT-AUDIT-PLAN-001` is independently `VERIFIED` and the operator approval field is populated.

## 13. Progress ledger

| Task | Status | Predecessor receipt | Reviewer | Review result | Sole next |
| --- | --- | --- | --- | --- | --- |
| `PLAN-001` | `VERIFIED` | `EVD-PLAN-001` | Independent planning-governance reviewer | `PASS` (2026-07-23) | `RESEARCH-001` |
| `RESEARCH-001` | `READY` | `RCPT-PLAN-001-001` | Source/graph verification reviewer | `PENDING` | `RESEARCH-002` |
| `RESEARCH-002` | `NOT_READY` | `RCPT-RESEARCH-001-001` | Requirements/operator-intent reviewer | `PENDING` | `RESEARCH-003` |
| `RESEARCH-003` | `NOT_READY` | `RCPT-RESEARCH-002-001` | Code-path/reachability reviewer | `PENDING` | `RESEARCH-004` |
| `RESEARCH-004` | `NOT_READY` | `RCPT-RESEARCH-003-001` | Oracle migration reviewer | `PENDING` | `RESEARCH-005` |
| `RESEARCH-005` | `NOT_READY` | `RCPT-RESEARCH-004-001` | Publication/data-integrity reviewer | `PENDING` | `RESEARCH-006` |
| `RESEARCH-006` | `NOT_READY` | `RCPT-RESEARCH-005-001` | GitHub/CI security reviewer | `PENDING` | `RESEARCH-007` |
| `RESEARCH-007` | `NOT_READY` | `RCPT-RESEARCH-006-001` | Vercel deployment/rollback reviewer | `PENDING` | `RESEARCH-008` |
| `RESEARCH-008` | `NOT_READY` | `RCPT-RESEARCH-007-001` | Verification-evidence reviewer | `PENDING` | `RESEARCH-009` |
| `RESEARCH-009` | `NOT_READY` | `RCPT-RESEARCH-008-001` | Failure-recovery reviewer | `PENDING` | `RESEARCH-010` |
| `RESEARCH-010` | `NOT_READY` | `RCPT-RESEARCH-009-001` | Feasibility/handoff reviewer | `PENDING` | `DESIGN-001` |
| `DESIGN-001` | `NOT_READY` | `RCPT-RESEARCH-010-001` | Architecture/requirements reviewer | `PENDING` | `AUDIT-PLAN-001` |
| `AUDIT-PLAN-001` | `NOT_READY` | `RCPT-DESIGN-001-001` | Independent panel | `PENDING` | Operator approval / `BUILD-001` |
| `BUILD-001`–`BUILD-008` | `NOT_READY` | Sequential verified receipts | Per §9 | `PENDING` | Sequential |
| `LIVE-001`–`LIVE-007` | `NOT_READY`, authorization `NOT_GRANTED` | Sequential verified receipts | Per §11 | `PENDING` | Sequential |

## 14. Resume context

On every new session, read only this file first. Do not resume from v2 `resume.md`, `state.md`, `progress.md`, `task_plan.md`, `findings.md`, or `audit.md`.

Resume checklist:

1. Confirm root, branch, HEAD, and dirty-state fingerprint match the current task entry receipt.
2. Read the current task packet and its sole predecessor receipt in this file.
3. Confirm the current task is `READY`; if not, do not work around the dependency.
4. Accept the task by recording implementer identity and moving it to `ACTIVE`.
5. Change/read only allowed paths/actions.
6. Seal the exit receipt and move to `AWAITING_REVIEW`.
7. Stop. Only the independent reviewer may mark `VERIFIED` and enable the sole successor.

Current resume state:

- Overall: `PLANNING`.
- Current: `RESEARCH-001` `READY`.
- Allowed action: execute only the exact `RESEARCH-001` action in §0 and its packet; after sealing `RCPT-RESEARCH-001-001`, stop at `AWAITING_REVIEW`.
- Forbidden: production implementation, local prohibited commands, live actions, v2 task continuation, evidence status import, self-review.
- Sole next after independent `RESEARCH-001` reviewer PASS: `RESEARCH-002`.

## 15. Approval record

| Approval | Status | Actor | Scope | Evidence |
| --- | --- | --- | --- | --- |
| Materialize v3 planning authority | `GRANTED` by user request | Repository operator | Create this plan and historicalize v2; no production/live action | `EVD-PLAN-001` |
| v3 plan implementation approval | `NOT_GRANTED` | Repository operator | `BUILD-001`–`BUILD-008` after independent plan audit | Pending `RCPT-AUDIT-PLAN-001` |
| Any live approval | `NOT_GRANTED` | Repository operator | Must be one distinct `LIVE-*` record | None |

No approval is implied, inherited, or broadened beyond its exact row.
