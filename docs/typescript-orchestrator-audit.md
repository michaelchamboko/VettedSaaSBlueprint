# TypeScript article orchestrator audit and issues log

Audit date 24 November 2026.

**Current status.** GitHub release review reopened ORCH-01 after local acceptance of `49cf0a7`. The full suite passed with 598 passes and three Windows symlink skips. ORCH-02 remains open. [Closeout evidence and ORCH-02 handover](orch01-handover.md)

User directive: audit the entire current article workflow, record the issues, and stop after producing this document. Findings below are analysis, not approved implementation changes or amendments to planning authority.

## Scope and evidence limits

### Owner clarification — one TypeScript orchestration authority

The owner requires TypeScript to control the complete article workflow, including dispatch, stage transitions, validation, retries, timeouts, checkpointing, release, and completion. Tools may use other languages. SlopMonster's Python checker is an allowed subordinate tool; its language alone is not a defect and does not justify porting it.

The enforcement question is whether every tool's result returns to the TypeScript engine for validation and state advancement. A subprocess exit code or model message cannot independently approve a stage. Language-independent tool contracts must carry bounded inputs, outputs, failure information, and operation identity.

Acceptance evidence needed: trace one article through every stage and show the same TypeScript controller owns each transition. Inject a failed Python checker, an unsuccessful model call, and a failed rendering check; each must return to the engine's appropriate recovery path. No subordinate tool may mark the article LIVE or independently skip an approval.

The separate owner request to remove the old Python BuildRunner concerns duplicate orchestration machinery. The current SlopMonster dependency remains permitted. The proposed removal is not marked complete by this audit document.

The site's React components are authored in TypeScript/TSX alongside CSS and other assets. Browser output is HTML, CSS, and JavaScript. Those implementation languages do not change the orchestration ownership requirement.

The inspected baseline is the primary checkout at HEAD c8cd290875facb21c92c1474aa965274a70c9d41, including its existing working files. The checkout has pre-existing edits, so findings describe inspected working files rather than a clean immutable release. Earlier candidate-order and research-gate implementation worktrees are excluded from the claimed current behavior. Their unfinished changes do not establish fixes.

This is an end-to-end static and recorded-run audit. It covers intake, research, drafting, Eleanor editing, design-taste and Impeccable presentation, release, production verification, and continuation. Existing test definitions were inspected. No fresh article run, publication, full regression suite, or concurrency reproduction was performed for this audit. No claim of exhaustive correctness is made.

Five retained article records contain 58 failed stage events, including repeated attempts. Of those, 26 are validation, 11 refinement, 7 research, 5 release, 5 repair, and 4 transformation. The Xero article accounts for 35 events, including all 26 validation failures. These are sample counts, not failure rates. Elapsed calendar time includes idle time.

Read-only production queries earlier in this audit found zero rows in each of article_research.sources, source_snapshots, claims, and claim_evidence. The repository intelligence schema had one snapshot. This is a point-in-time observation.

## Current execution path

1. Explicit manual or API-directed intake captures source bytes. Folder intake freezes membership and selects PROCESSING before PENDING.
2. RESEARCHING captures and validates sources, excerpts, claims, and price context.
3. TRANSFORMING creates a supported page artifact and assesses claims, intent, SEO, and answer quality.
4. REFINING applies Eleanor's three full-prose passes, separate Beam review, final fidelity checks, and approved-content binding.
5. VALIDATING captures rendering inputs and requires design-read, context, shape, critique, audit, detect, polish, desktop, mobile, and reduced-motion evidence.
6. RELEASING checks evidence and repository state, runs checks, obtains review of the exact commit, merges, validates the merged checkout, and deploys.
7. VERIFYING checks the production result. Failed deployment verification invokes the release recovery path.
8. LIVE requires retained terminal evidence. Folder intake can then continue. QUARANTINED is a distinct terminal outcome.

For authoring stages, the supervised executor emits a work packet, accepts a bound result, and advances on explicit resume. The model execution and repair work are assigned to a supervisor.

Sources: [CLI](../scripts/import-article.ts), [executor](../src/lib/article-import/supervised-executor.ts), [engine](../src/lib/article-import/engine.ts), [requirements](../src/lib/article-import/workflow-requirements.ts), [intake](../src/lib/article-import/intake.ts).

## Group 1 — Execution ownership and entry points

### ORCH-01 — Work dispatch depends on supervisor continuation

Status: confirmed implementation boundary. Priority: high.

The executor returns a work continuation when the result file is absent. executePendingImport executes one supplied stage action and returns. Saving a packet does not itself launch the author, editor, designer, or repair worker. Progress therefore depends on a supervisor continuing the run. This is consistent with the current supervised design, but falls short of the requested unattended completion behavior.

Acceptance evidence needed: interrupt the supervisor after a packet is saved, restart the authorized run, and prove pickup without duplicate work or selecting another intake entry.

### ORCH-02 — Mutation entry points have inconsistent locking and preflight

Status: confirmed code inconsistency; lost-update scenario not reproduced. Priority: high.

The main CLI applies checkout and capability checks. Normal execution holds an import lease. The separate record-article-presentation command calls load, approval, presentation, and advancement directly. saveImport checks ownership only when an active lease exists. Two callers can therefore reach writes without a shared mandatory ownership boundary. Atomic replacement protects a single file write, but does not serialize an entire read-modify-write operation.

Acceptance evidence needed: run presentation recording concurrently with resume and verify one accepted state transition without overwriting another result. Exercise every supported mutation entry point.

Sources: [presentation command](../scripts/record-article-presentation.ts), [engine saveImport and executePendingImport](../src/lib/article-import/engine.ts), [CLI main](../scripts/import-article.ts).

### ORCH-03 — Preflight proves installed configuration more than execution readiness

Status: confirmed coverage limit. Priority: medium.

Preflight hashes required skills, checks tool versions, and checks the model-family mapping. It does not establish that the exact model can currently execute a request, that browser inspection works, or that GitHub and deployment access will succeed. Some release checks happen later. A preflight pass can therefore precede a late shared-capability stop.

Acceptance evidence needed: distinguish local configuration validity from current provider, browser, review, and deployment availability.

Source: [preflight](../src/lib/article-import/preflight.ts).

## Group 2 — Research and drafting

### ORCH-04 — Verified article research does not enter the reusable database

Status: confirmed code gap and empty-table observation. Priority: high.

The supervised research handoff validates a local evidence reference and advances. Mandatory Neon retrieval, persistence, and readback are absent from that path. Reuse is described in stage instructions, leaving the supervisor responsible for finding earlier evidence.

Source authority: D08 section 12, Retrieve existing knowledge first, D08-S-5f5f88f1d93f. D08 section 29 describes prepared knowledge, gap research, context packaging, and page assembly.

Acceptance evidence needed: a second article retrieves a current finding saved by the first; outages, stale evidence, duplicate delivery, and restart after commit have explicit outcomes.

Sources: [research handoff](../src/lib/article-import/supervised-executor.ts), [D08](Vetted-SaaS-Blueprint-08-Knowledge-Acquisition-and-Research-Operations.md).

### ORCH-05 — Research and assessment bindings fail after work has accumulated

Status: observed in saved runs. Priority: high.

Receipts show source-hash mismatches, excerpt mismatches, absent pricing context, and assessment-to-artifact mismatches. The engine correctly rejects these, but the handoff permits the supervisor to assemble mutually inconsistent files before submission. Research invalidation can reopen downstream work.

Acceptance evidence needed: catch mismatched source bytes and assessment versions at their producing step; preserve earlier immutable evidence and identify the exact dependent work invalidated.

Sources: [evidence validation](../src/lib/article-import/workflow-evidence.ts), [saved article records](../.automation/article-imports/).

## Group 3 — Eleanor, design-taste, Impeccable, and rendering

### ORCH-06 — Editorial execution has a substantial fixed cost

Status: confirmed owner-required behavior; optimization question. Priority: medium.

Eleanor requires every editable prose field to change, three rewrite passes, distinct Beam review, and final fidelity evidence. The execution validator also binds pass inputs, outputs, instructions, and judgments. Even a strong incoming draft incurs this work. This is a policy cost, not evidence that the rule should be removed. Changing it requires a deliberate owner decision.

Acceptance evidence needed: measure model time, assembly time, retry time, and editorial improvement separately before changing the procedure.

Source: [Eleanor skill](../.agents/skills/eleanor-editorial/SKILL.md). Its cited authorities are D07 section 32, D07-S-761a1d533ac1, and D10 section 9.4, D10-S-574481d73201.

### ORCH-07 — Editorial negative outcomes have a weaker result contract than design

Status: confirmed schema difference; recovery impact needs testing. Priority: medium.

Editorial pass judgments require a literal pass verdict and resolved findings. Design judgments explicitly represent pass, fail, and insufficient-evidence before advancement is decided. A negative editorial result consequently fails the successful-evidence schema. This is fail-closed, but the inspected contract does not give negative editorial results the same structured recovery representation as design.

Acceptance evidence needed: retain a truthful failing editorial judgment and route its findings into a bounded repair without asking the worker to manufacture success.

Sources: [editorial and presentation validators](../src/lib/article-import/workflow-evidence.ts), [design judgment contract](../.agents/skills/external-article-import/references/design-judgment.md).

### ORCH-08 — Rendering evidence is coupled to a broad source inventory

Status: confirmed implementation; unnecessary rework is a risk. Priority: medium.

RenderingInputsV1 covers broad directories including src/lib, src/generated, src/content, components, app, styles, and public assets. Changes to inventory or file bytes invalidate the manifest. This protects integrity but can also reopen presentation for a change outside the affected page's actual dependencies.

Acceptance evidence needed: compare an unrelated-source change with a genuine renderer change. Any narrowing must preserve dependency coverage.

Source: [rendering inventory](../src/lib/article-import/rendering-inputs.ts).

### ORCH-09 — Evidence validity does not establish evaluator accuracy

Status: verification gap. Priority: medium.

The code checks bound executions and rejects failing design judgments. A small editorial calibration fixture exists. This audit did not establish false-pass rates, false-failure rates, or reviewer agreement across the supported formats. A 5/5 checker score is explicitly limited by the Eleanor skill.

Acceptance evidence needed: independently labeled good and bad articles and rendered pages, including known factual, accessibility, disclosure, and design defects. Measure whether the evaluations detect them.

Sources: [editorial tests](../tests/editorial-refinement.test.ts), [workflow evidence](../src/lib/article-import/workflow-evidence.ts), [design requirements](../src/lib/article-import/workflow-requirements.ts).

## Group 4 — Publication and terminal verification

### ORCH-10 — Release prerequisites are discovered after presentation approval

Status: confirmed recorded failure pattern. Priority: high.

Xero repeatedly passed presentation, failed release for missing publication membership, and then lost presentation validity after index changes. Other events include duplicate slugs and a mismatched affiliate destination. The binding checks are useful; their late discovery causes repeated review.

Acceptance evidence needed: missing, duplicate, or mismatched publication inputs prevent presentation work from being issued. The reviewed candidate remains bound through release and restart.

Sources: [release checks](../src/lib/article-import/release.ts), [Xero receipts](../.automation/article-imports/article-60131cda-b56b-456f-acd5-a2bbc00ffea6.json).

### ORCH-11 — Complete-run recovery remains unproven by this audit

Status: verification gap. Priority: high.

The release code includes exact-commit review checks, production verification, rollback, and a journal. Existing tests cover several failures. This audit did not execute one continuous intake-to-LIVE recovery scenario covering worker death, duplicate results, stale evidence, uncertain deployment outcome, and restart.

Acceptance evidence needed: one controlled synthetic run proving each interruption resumes correctly, preserves the rollback target, and reaches LIVE only after production proof. A quarantined or blocked outcome must remain distinct from publication.

Sources: [release](../src/lib/article-import/release.ts), [local adapter](../src/lib/article-import/local-release-adapter.ts), [completion](../src/lib/article-import/completion.ts).

## Group 5 — Cross-stage recovery, observability, and cost

### ORCH-12 — Error classification relies on message wording

Status: confirmed implementation. Priority: high.

The engine uses regular expressions and exact phrases to classify several infrastructure failures. Equivalent provider failures with different wording can enter the general repair path. Capability blockers also record a generic attempted-recovery sentence; that sentence alone does not prove a retry occurred.

Acceptance evidence needed: typed failure categories and execution-bound recovery evidence distinguish outage, invalid output, integrity failure, and uncertain side effects consistently.

### ORCH-13 — Repair diagnostics and strategy accounting are inconsistent

Status: confirmed code inconsistency. Priority: medium.

recordImportRepair counts failures by stage and error fingerprint, and requires diagnosis after three total stage repairs. Its message calls them three unchanged repairs. Normal execution separately rejects unchanged submissions. Strategy selection reads the group counter while repair recording writes repair-prefixed counters, so automatic strategy progression cannot be assumed from the strategy array alone.

Acceptance evidence needed: trace three distinct repairs, repeated identical input, a successful diagnosis, and another failure; assert the exact strategy, counter, and next action at each point.

Source for ORCH-12 and ORCH-13: [engine](../src/lib/article-import/engine.ts).

### ORCH-14 — Completion inspection partly extracts machine paths from prose

Status: confirmed implementation coupling. Priority: medium.

Completion inspection parses work and result paths from nextAction text even though structured continuation records exist. A wording change can remove those convenience fields from the inspection result. This is an avoidable dependency between human instructions and machine consumers.

Acceptance evidence needed: change nextAction wording while retaining structured continuation and confirm completion reporting remains correct.

Source: [completion inspection](../src/lib/article-import/completion.ts).

### ORCH-15 — Fully local and zero-cost operation is not established

Status: confirmed external dependencies; account costs unverified. Priority: medium.

The TypeScript controller, local files, Python editorial checker, and browser tools can run locally. The current path also depends on remote Beam execution, GitHub review, Neon, and Vercel. A free model name or local CLI does not prove provider entitlement or unlimited availability. No billing or entitlement audit was performed.

Acceptance evidence needed: inventory current entitlements, quotas, outage behavior, and required remote calls. Distinguish zero orchestration service fees from a fully local pipeline.

Sources: [capability configuration](../config/article-workflow-capabilities.json), [release adapter](../src/lib/article-import/local-release-adapter.ts), [Eleanor skill](../.agents/skills/eleanor-editorial/SKILL.md).

## Existing protections worth preserving

The engine has explicit stage transitions, shared predecessor evidence checks, immutable evidence references, unchanged-submission rejection, lease ownership on normal execution, retained terminal proof, and deployment verification with rollback. Design reviews support honest negative outcomes. Intake preserves captured ordering. These controls are implemented; their presence does not establish universal enforcement across every entry point.

## External benchmark

Durable workflow systems persist execution progress and dispatch recoverable tasks. Repair loops require explicit evaluation feedback and limits. Repeated external side effects require deduplication or reconciliation. These are evaluation criteria for this audit, not a recommendation to install another framework.

- [Temporal durable execution](https://docs.temporal.io/durable-execution)
- [Temporal idempotent activities](https://docs.temporal.io/activity-definition)
- [LangGraph workflow and evaluator–optimizer patterns](https://docs.langchain.com/oss/python/langgraph/workflows-agents)
- [AWS error handling](https://docs.aws.amazon.com/step-functions/latest/dg/concepts-error-handling.html)
- [AWS recovery preserving successful steps](https://docs.aws.amazon.com/step-functions/latest/dg/redrive-executions.html)

## Handoff

## Supplied checklist coverage

### Detailed end-to-end micro-step audit

Completed static contract audit on 24 November 2026 following the owner's request to check every stage for bounded single-purpose work. The requirement is interpreted as every node having one purpose with explicit inputs and validated outputs.

**Verdict: partially satisfied.** The engine enforces stage-specific submissions. It does not decompose every model assignment into independently dispatched, validated, resumable micro-steps. One JSON result per stage does not establish one purpose per model assignment.

| Stage or boundary | Actual input | Actual output and gate | Micro-step finding |
| --- | --- | --- | --- |
| Folder intake | Directory and captured file list | Intake record, captured bytes, source fingerprints, stable selection | Bounded deterministic operations exist. This is not an open-ended model task. Claiming an entry and creating its import remain related operations that need crash-consistency proof. |
| Article ingestion | Captured source and approved URL list | Parsed import record, source reference, transformation metadata | Deterministic parsing and schema checks exist. The supervisor is not asked to invent the entire workflow at ingestion. |
| Research | Source path, full import record, stage instructions, strategy, requirements | evidencePath pointing to ResearchEvidenceV2; source/excerpt/price checks | One packet bundles reuse discovery, question assessment, acquisition, claim verification, freshness, and potentially finding a fresh topic. No per-source or per-claim task dispatch/checkpoint contract was found in the executor. |
| Drafting | Full stage record and evidence references | artifactPath, assessmentPath, format; artifact and assessment validation | Draft creation, intent work, claim assessment, and SEO/AEO evaluation share one packet. Each artifact is structured, but drafting and judging are not separate dispatched engine nodes. |
| Eleanor purpose/structure | Before artifact and pinned instructions, supplied inside the refinement assignment | Captured after artifact, execution and judgment references | A per-pass evidence contract exists. The engine dispatches the encompassing REFINING packet rather than launching this pass as its own task. |
| Eleanor meaning/evidence | Previous pass output and protected fields | Next artifact and bound judgment | Pass ordering is validated in the submitted execution manifest. Automatic per-pass scheduling and recovery are delegated to the supervisor. |
| Eleanor wording/rhythm | Previous pass output | Next artifact and bound judgment | Same distinction between validated pass evidence and independently runnable node. |
| Separate Beam review | Rewritten artifact and review instructions | Distinct-session execution, reviewed output, judgment | Model and session constraints are checked. The separate review is still part of a multi-operation refinement assignment. |
| Final fidelity and approval | Complete before/after artifacts, checker evidence, final assessment and quality receipt | Editorial execution manifest and frozen content approval | Multiple checks aggregate into a strong approval boundary. The input assignment still combines rewriting, reviews, checker execution, reassessment, and receipt assembly. |
| Design Read and design-taste | Approved artifact, source identity, design references and instructions | Bound design-read judgment | A required result exists. Selection and execution of this design activity are supervised within the larger VALIDATING packet. |
| Impeccable context, shape, critique, audit, polish | Artifact, rendering manifest, relevant renderer sources and pinned instructions | Rule-specific captured judgments | Rule evidence is distinguished, but the executor does not independently dispatch and checkpoint every rule. The supervisor manages the sequence. |
| Impeccable detect | Required detector targets and pinned executable/version | Captured command execution and coverage checks | A concrete command contract exists. Execution and capture remain assigned within the validation packet. |
| Browser validation | Candidate routes, frozen artifact and rendering identity | Desktop, mobile, reduced-motion browser evidence and verifier receipt | Clear required observations exist. Individual browser checks share the validation assignment; autonomous repair of one failed check is not expressed as an independently dispatched node here. |
| Publication preparation | Approved artifact, supplied changedFiles, optional slug and code-review path | Release assessment and state | This boundary is structured. Publication membership and receipt checks can surface after design evidence, as shown by ORCH-10. |
| Repository checks, PR and review | Candidate checkout and approved evidence | Validation results, commit identity, PR/review evidence | ReleaseOperations exposes individual typed operations. These are real code-controlled suboperations, unlike model prose instructions. Worker-supplied file selection is inspected against Git. |
| Merge and deploy | Reviewed head, merge result, previous deployment | Merged commit and deployment identity | Code defines order and retains pending-release information. Side effects and recovery are explicit, although crash coverage is not proven by this static audit. |
| Production verification | Deployment, expected commit, artifact and routes | Bound verifier output and production checks | Concrete verification contract exists. An HTTP success alone is insufficient. Failure routes include rollback verification. |
| LIVE and next intake entry | Valid production evidence and terminal bundle | Immutable terminal reference and intake outcome | Completion is checked. Dispatch of subsequent work still depends on supervisor continuation. |
| Repair | Current record, failed submission identity, error and strategy | Repair continuation and required change | Unchanged submissions are blocked. General repair wording and broad strategies do not guarantee a single-defect assignment with restricted outputs. |
| External wait and recovery | Saved dependency, resume stage, deadlines or recovery evidence | Wait, blocked, or resumed state | Structured state exists. It needs a continuing dispatcher to perform checks at the saved times. |

#### Confirmed scope weaknesses

1. The work packet contains the entire record, all workflow requirements, and the full multi-stage result-schema union. Runtime checks reject a result for the wrong stage, but the model-facing contract is broader than its current assignment.
2. Research may expand from checking the supplied article to researching a fresh topic within the same packet. This is allowed by the current research instructions, but it is a broad recovery scope requiring an explicit bounded subtask to meet the new micro-step criterion.
3. Drafting and assessment are assigned together. Refinement combines five passes, judgments, checking, reassessment, and approval evidence. Validation combines many design and browser activities.
4. Individual editorial passes and design rules have evidence schemas, but their intermediate completion does not automatically advance an engine-owned substep cursor. The main continuation identity is at stage/strategy/research-generation level.
5. Most stage outputs are references to files that the supervisor must assemble. The referenced contents are checked, but producing and binding those files remains part of the worker's compound task.
6. Recovery messages commonly identify a stage rather than a narrowly owned artifact path and exact permitted change. A stage-specific repair is not necessarily a micro-scoped repair.

#### What the code does enforce

The executor checks the submitted stage, source fingerprint, and idempotency key. Zod rejects unrecognized result fields. Referenced research, assessment, editorial, presentation, and production evidence receives additional validation. Editorial pass order and input/output bindings are checked. Release operations have typed interfaces and explicit code order. These controls should not be described as absent.

#### Verification needed before claiming full compliance

For every independently repairable model activity, demonstrate a bounded input contract, one named responsibility, a typed output, an external verifier, a persisted accepted result, and a defined repair destination. Demonstrate that failing the mobile check does not request an unrestricted full article rewrite, that a failed editorial pass resumes with its verified predecessor, and that a worker cannot submit another stage's output. Keep intermediate results only while their inputs and governing revisions remain valid.

The audit criterion does not require splitting every deterministic helper into another persisted node. The useful boundary is an independently failing, expensive, or side-effecting activity whose retry can otherwise waste or corrupt accepted work.

Evidence inspected: [supervised executor](../src/lib/article-import/supervised-executor.ts), [stage instructions](../src/lib/article-import/workflow-requirements.ts), [pass and rule evidence schemas](../src/lib/article-import/workflow-evidence.ts), [packet identity](../src/lib/article-import/packet-binding.ts), [approval contract](../src/lib/article-import/content-approval.ts), [intake](../src/lib/article-import/intake.ts), [release operations](../src/lib/article-import/release.ts), [production verifier](../src/lib/article-import/verification-evidence.ts), and [continuation schemas](../src/lib/article-import/contracts.ts).

User supplied this checklist after the initial audit. The following assessment covers the active TypeScript article path, not every capability of the external OpenCode application. Status describes inspected code; no new execution tests were run.

| Checklist item | Coverage | Evidence and qualification |
| --- | --- | --- |
| Micro-scoped steps with one input and JSON output | Partial | supervised-executor.ts has a strict discriminated result schema and one work packet per stage. REFINING bundles five editorial passes; VALIDATING bundles many design/browser evaluations. Individual activities are not all independently dispatched and checkpointed by this engine. |
| Model-agnostic adapter and final-retry escalation | Absent in this path; policy conflict | The engine delegates work to a supervisor and validates pinned OpenCode execution identity. It does not implement a router for the listed providers. Current Beam policy explicitly prohibits model substitution. Automatic escalation would need a deliberate policy change and confirmed cost authorization. |
| Forced submit_step completion tool | Absent as a model tool; equivalent acceptance boundary partly exists | A worker submits a bound result file, parsed with Zod and checked before advancement. Conversational filler cannot satisfy that result schema. The engine does not run the model turn loop, detect finish_reason, or automatically reprompt a non-submitting model. |
| Strict schemas and deterministic gates | Substantial, with a boundary | Zod validates results and evidence; deterministic functions validate identity, predecessor bindings, artifacts, and production proof. This does not demonstrate input validation for every tool invoked inside an external model session or objective accuracy of model judgments. |
| Duplicate tool-call blocker | Partial at workflow level; absent per model tool call | Stable packet identifiers, leases, and unchanged-submission rejection exist. No general toolName-plus-arguments cache was found in the active article engine. Workflow idempotency and model-loop repetition detection are distinct controls. |
| Context pruning on retry | Not owned by this engine | The executor provides instructions and durable state. No model conversation pruning or retry error-compression implementation was found in the inspected path. External agent behavior remains unverified. |
| Run-wide maxSteps, maxRetries, maxTokens, timeoutMs | Partial | The code has lease timing, external-wait limits, individual command timeouts, and repair diagnosis thresholds. It lacks one enforced run budget covering model turns, tokens, retries, and elapsed execution together. Diagnosis thresholds do not impose a total run budget. |
| Verified step checkpointing in SQLite/Postgres | Partial through local files | The engine saves validated stage state and evidence with atomic file replacement. It does not transactionally checkpoint every model substep into SQLite or Postgres. Existing local persistence is real; multi-file crash consistency and finer-grained resume still need proof. |

Sources: [supervised executor](../src/lib/article-import/supervised-executor.ts), [packet identity](../src/lib/article-import/packet-binding.ts), [engine](../src/lib/article-import/engine.ts), [leases](../src/lib/article-import/workflow-lease.ts), [Eleanor policy](../.agents/skills/eleanor-editorial/SKILL.md).

### Five proposed core components

1. Provider router — absent in the article engine; the current exact-model requirement constrains substitution.
2. Tool registry with Zod guards — stage result/evidence guards exist; a general guarded model-tool registry is not implemented here.
3. Loop deduplicator and error compressor — unchanged-submission protection exists; model-call deduplication and conversation compression are missing from this layer.
4. Deterministic gate verifier — implemented across shared evidence, approval, presentation, and release functions; universal entry-point enforcement remains affected by ORCH-02.
5. Bounded state-machine loop — transitions and persistence exist; autonomous dispatch and comprehensive run budgets are incomplete.

### Checklist qualifications

These five components are a proposed design decomposition, not a universal requirement that all production orchestrators use those exact blocks or one physical runner file.

- A typed result submission can enforce completion without a tool literally named submit_step. Rejecting every turn without a tool call can create another endless loop; the completion contract must include a bounded failure outcome.
- Identical reads and polls can be legitimate after external state changes. Side-effecting calls need durable idempotency and reconciliation. A blanket duplicate ban can prevent valid recovery. Argument hashing should use canonical serialization if object-key order is semantically irrelevant.
- Model escalation is optional. It must respect fixed-model policy, availability, and cost limits; an additional paid provider is not assumed.
- Keep complete diagnostics in audit storage while providing compact actionable feedback to the model. Pruning must preserve decisions, successful tool effects, and the evidence needed to recover.
- SQLite or Postgres can provide transactional checkpoints. Durable atomic files can also support local execution when ownership, crash recovery, and multi-file consistency are explicitly handled.
- Model pricing alone does not establish reliability or filler frequency. Measure failure categories with the actual configured model and representative tasks.

The checklist adds three explicit verification priorities within the existing five issue groups: per-activity dispatch/checkpointing under Group 1, guarded model-tool interaction and contextual retry behavior under Group 3, and aggregate run budgets under Group 5. These are audit findings and proposals only.

All fifteen entries remain open findings or verification questions. They are grouped into five areas for discussion and do not assert fifteen independently proven runtime defects. This document does not mark earlier implementation attempts complete. The requested deliverable ends with this issues log.

## Implementation evidence, 24 November 2026

The isolated hardening checkout starts at `3fde335`. The following observations supplement the original audit.

- **ORCH-02, partial.** The standalone presentation command now runs checkout and capability preflight and holds the import lease while validating receipts and saving state. Three focused tests passed for a competing holder, nested ownership, and read-only inspection. Independent review also identified a separate stage-order defect. A stale presentation request can enter recovery helpers that clear a release journal. This finding stays open until out-of-order requests preserve pending releases and terminal records.
- **ORCH-06, measured baseline.** Five historical execution files bound by `editorial-execution-manifest-verified.json` for import `article-fc4a3924-7ddd-47a2-af19-85deb18785d7` matched their manifest digests. Purpose, meaning, wording, separate review, and fidelity took 18.60, 11.14, 16.16, 21.00, and 33.73 seconds respectively. The 100.63 seconds of recorded execution span roughly 37 minutes elapsed. The receipts do not explain the intervening time or establish a monetary cost.
- **ORCH-09, measurement gap.** The six passages in `build-pack/editorial/calibration-2026-10-21/README.md` exercised a superseded procedure. Current semantic false-approval and false-rejection rates require independently labeled examples evaluated through the current path.
- **ORCH-15, external dependencies confirmed.** The Eleanor skill fixes the editorial model to remote Beam. The local release adapter uses GitHub and Vercel. Repository intelligence has a separate Neon integration. Local execution of the controller establishes neither provider entitlements nor account-specific quotas. Those remain unverified.
- **ORCH-02 follow-up.** Presentation now rejects stages other than `VALIDATING` immediately after loading under the lease. The initial rejection test proves a `RELEASING` record survives byte-for-byte. A second test labeled `LIVE` also used `RELEASING`, so it cannot establish terminal-state coverage. Actual `LIVE` and journal-bearing records remain acceptance cases.
- **ORCH-04, PostgreSQL 17 probe.** A disposable loopback database held two synthetic products and the recorded table constraints. Three writes produced exactly two distinct evidence links. A lookup restricted to the URL of product A returned both products. The research gate remains open.
- **ORCH-04, follow-up.** After the query correction, the same PostgreSQL fixture returned one claim for the known product and two unique links after retry. Empty matches, source freshness, and receipt binding remain separate checks.
- **ORCH-09, blinded synthetic model check.** A tool-disabled session using the pinned Beam model judged eight fictional rewrites against a supplied reference about per-seat pricing, export access, link expiry and uptime guarantees. Labels were withheld. All four faithful and four defective rewrites were classified correctly (zero false approvals, zero false rejections, zero missing judgments). This one batch tests the model on simple factual changes. It does not establish full-article editorial accuracy or production executor wiring. Local raw-event SHA-256: 203fe83e4bc89cb4720ba2053b9c17da3ed39f7f1453708c3bb09e67329a4bc9.


## Appendix — Approved sequential implementation plan (ORCH-01 first)

This appendix records the product-owner-approved sequence. All fifteen findings remain open unless a later amendment closes them. Only ORCH-01 is authorized for implementation now; subsequent IDs require their own explicit authorization.

| ID | Minimal correction direction | Affected paths | Compatibility and acceptance evidence | Status |
| --- | --- | --- | --- | --- |
| ORCH-01 | Add local controller dispatch through the normal CLI/handler; reuse existing work packets, results, leases, intake claims; consume valid existing results with zero model calls; invoke one bounded worker with an explicitly configured model for absent results using shell:false and actual OpenCode JSONL envelopes; preserve checkpoint identity and existing gates. | `scripts/import-article.ts`; `src/lib/article-import/dispatch.ts`; `src/lib/article-import/worker-runner.ts`; `src/lib/article-import/engine.ts`; `src/lib/article-import/intake.ts`; `src/lib/article-import/supervised-executor.ts`; `src/lib/article-import/contracts.ts`; focused tests/fixtures. | Persisted packet restart; consume existing result zero calls; absent result one configured process; malformed/wrong-stage/stale output rejected; due/future waits; two dispatchers one worker effect; interrupted PROCESSING entry before importId linked; stable snapshot order; synthetic full article to LIVE; blocked path explicit; no real articles/Neon/Vercel actions. | Reopened during PR #69 release review. |
| ORCH-02 | Shared mandatory ownership boundary across mutation entry points. | `scripts/import-article.ts`, `scripts/record-article-presentation.ts`, `src/lib/article-import/engine.ts` | Concurrent presentation/resume does not overwrite state. | Open |
| ORCH-03 | Distinguish local configuration validity from provider/browser/review/deployment availability. | `src/lib/article-import/preflight.ts` | Preflight reports execution readiness separately. | Open |
| ORCH-04 | Persist verified research into reusable database and read it back. | `src/lib/article-import/supervised-executor.ts`, `src/lib/article-import/research-database.ts` (if present) | Second article retrieves current finding; outage/stale/duplicate/restart outcomes explicit. | Open |
| ORCH-05 | Bind source bytes and assessment versions at producing step. | `src/lib/article-import/workflow-evidence.ts`, `src/lib/article-import/supervised-executor.ts` | Mismatched source bytes/assessment versions caught before submission. | Open |
| ORCH-06 | Measure editorial cost before changing policy. | `.agents/skills/eleanor-editorial/SKILL.md`, `src/lib/article-import/workflow-evidence.ts` | Separate model/assembly/retry/editorial-improvement measurements. | Open |
| ORCH-07 | Structured recovery representation for negative editorial outcomes. | `src/lib/article-import/workflow-evidence.ts`, `src/lib/article-import/workflow-requirements.ts` | Failing editorial judgment retained and routed to bounded repair. | Open |
| ORCH-08 | Compare unrelated-source change with genuine renderer change before narrowing. | `src/lib/article-import/rendering-inputs.ts` | Narrowing preserves dependency coverage. | Open |
| ORCH-09 | Independently labeled calibration fixtures for evaluators. | `tests/editorial-refinement.test.ts`, `src/lib/article-import/workflow-evidence.ts`, `src/lib/article-import/workflow-requirements.ts` | False-pass/false-failure rates measured. | Open |
| ORCH-10 | Move publication-input checks before presentation work. | `src/lib/article-import/release.ts`, `src/lib/article-import/supervised-executor.ts` | Missing/duplicate/mismatched publication inputs prevent presentation issuance. | Open |
| ORCH-11 | Execute one controlled synthetic intake-to-LIVE recovery scenario. | `src/lib/article-import/release.ts`, `src/lib/article-import/local-release-adapter.ts`, `src/lib/article-import/completion.ts` | Worker death, duplicate results, stale evidence, uncertain deployment, restart all resume correctly. | Open |
| ORCH-12 | Typed failure categories and execution-bound recovery evidence. | `src/lib/article-import/engine.ts` | Typed errors produce identical recovery despite wording changes. | Open |
| ORCH-13 | Align repair counter and strategy accounting. | `src/lib/article-import/engine.ts` | Three distinct repairs, repeated input, diagnosis, next failure traced exactly. | Open |
| ORCH-14 | Remove nextAction prose parsing from completion inspection. | `src/lib/article-import/completion.ts` | Wording changes do not break completion reporting. | Open |
| ORCH-15 | Inventory entitlements, quotas, outage behavior, required remote calls. | `config/article-workflow-capabilities.json`, `src/lib/article-import/local-release-adapter.ts`, `.agents/skills/eleanor-editorial/SKILL.md` | Zero orchestration service fees distinguished from fully local pipeline. | Open |

Major independent findings are deferred to `docs/typescript-orchestrator-audit-v2.md`. No other issue is closed by this ORCH-01 slice.
## ORCH-01 closure review, 24 November 2026

Status: partially implemented, not complete. Option A remains approved: extend the existing TypeScript executor with model-agnostic configured worker dispatch. No later issue is authorized in this delivery.

Independent review rejected the current patch after three implementation passes. Remaining acceptance failures are within ORCH-01: implicit Beam fallback in dispatch.ts; worker prompt forbidding required artifact creation; no persisted child-process identity for safe controller-death recovery; direct terminal return and intake paths bypassing retained-proof checks; ignored worker-agent configuration; incomplete normal-handler, subprocess, restart, due-wait, and verified-LIVE tests.

Independent execution reported six passing dispatch tests in .mece/orch01-final-focused.log, but the combined supervised test run has not returned a completion result. These six tests do not establish closure: the missing-worker case stops before invoking a worker and the wait case covers only a future deadline. Full repository checks and full synthetic LIVE proof remain outstanding. Worker report claims are not acceptance evidence.

Reviewed SHA256 values:
- dispatch.ts: DF47961AD5FC487D92F88E8A0B2B825C8FEAF8AE8558BC2A07ADD368CBA7CF42
- worker-runner.ts: 418597C74BF448A40DAC6CB8EBD5A4AF7AB87D3554496309E881F459F95AA11B
- scripts/import-article.ts: AC1CD7B347B02900BBC1787380D8BB2A135213EA669B424CDDF2956BD6AA5720
- tests/article-import-dispatch.test.ts: A13738F3EEAFD6E4EEFBD51EE314C17B94DFAFC66194F81163D195D7B0AD8E6F

The earlier appendix's pinned worker-model wording is superseded by the owner's model-agnostic directive. The current production fallback is a defect, not an approved requirement. Earlier implementation observations for other issues describe the preserved prior worktree, not verified changes in this ORCH-01 checkout. No issue is closed by those observations.

## Current-revision test results, 24 November 2026

Independent checks used Node 24.22.3 and npm 12.0.2 in the ORCH-01-only worktree after removal of the implicit Beam fallback and restoration of terminal proof/intake claiming.

- verify:agent-workflow: passed, exit 0.
- typecheck: passed, exit 0.
- lint: failed, exit 1; 3 no-explicit-any errors in the new dispatch tests and 26 warnings.
- npm test: passed, exit 0; 588 tests, 585 passed, 3 skipped, 0 failures, duration 444817.6664 ms.

Logs: .mece/testing-verify-agent-workflow.log, .mece/testing-typecheck.log, .mece/testing-lint.log, .mece/testing-test.log.

ORCH-01 remains partially implemented. Passing the existing suite does not supply the missing full-dispatch LIVE, subprocess-death recovery, and actual worker-permission acceptance coverage. Lint must also pass before closure. No ORCH-02 implementation occurred.

## Handover checkpoint

Testing action: COMPLETE. ORCH-01: PARTIALLY IMPLEMENTED. ORCH-02: NOT STARTED.
See docs/orch01-handover.md for the exact checkout, user-approved direct implementation override, test results, remaining acceptance criteria, and resumption instructions. Completion of testing is not closure of ORCH-01.
