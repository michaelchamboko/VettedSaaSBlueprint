# Vetted SaaS B Spec Kit Execution Authority

## Product-owner retirement directive — 2026-10-28

Classification: user directive.

The repository-local multi-stage automation programme is retired in full. The retired runner, schedules, prompts, manifest, local state chain, workflow services, tests, package commands, generated task mappings, and activation claims are not part of the current product or execution path.

The source strategy documents remain unchanged as historical product inputs. Their workflow language does not reactivate the retired implementation. Any future automation requires a new, explicit product-owner directive and a new planning amendment before code, configuration, schedules, or release authority may be added.

## Current state

### Runtime contract reconciliation — 2026-10-31

Classification: explicit product-owner directive.

Keep npm 12.0.2, align the runtime compatibility policy and validator with npm 12.x, and pin Motion to its existing locked version. Scope is limited to the manifest, lockfile root metadata, runtime validator, focused tests, compatibility policy, and release evidence. This maintenance change introduces no new automation, schedule, product requirement, or publication authority.

- Phase One is complete and verified in production.
- There is no active retired multi-stage automation programme, scheduled research/editorial/optimisation/watchdog cycle, or publication path owned by that programme. The separate article-to-page workflow remains available only through an explicit manual or API trigger under `AGENTS.md`.
- No later-phase packet is dependency-ready or authorised.
- The next implementation packet must be created by an explicit product-owner planning amendment.

### Article intake completion amendment — 2026-10-31

The explicit manual article trigger now supports a fixed snapshot of the files present in `Article Intake` at start time. The snapshot is processed in stable order through the existing research, transformation, Eleanor editorial, validation, release, merge, deployment, and production-verification gates. Article-specific blockers continue to the next entry; shared release or capability failures stop the run. New files wait for the next manual start. Processing completion with exceptions is distinct from an all-published result.

The supervisor must finish each work packet and resume the same import before selecting another entry. Executor output errors remain repair work at the productive stage; filesystem and state-write failures remain external blockers. Intake state records blocker scope and bound import integrity, and explicit retry is required to clear an article blocker.

### Local article loop continuation amendment — 2026-11-01

Classification: explicit product-owner directive with pre-approved merge and deployment after all required gates pass.

Packet `ARTICLE-LOOP-001` authorizes completion of the existing local supervising-agent loop for the article-to-page workflow. The selected local agent must execute each bound packet, persist its result atomically, repair changed failures, wait and resume external checks, and continue the same fixed snapshot until `LIVE`, `QUARANTINED`, processing completion with exceptions, or a durable blocker. Existing lifecycle stages, receipts, editorial requirements, review gates, primary-checkout execution, fixed-snapshot ordering, and shared-failure rules remain authoritative.

This amendment authorizes only backward-compatible continuation metadata, read-only completion inspection, wait/repair/reconciliation behavior, focused tests, and the associated documentation. It does not add a stage, scheduler, paid service, model client, Durable Harness, or second article orchestrator. The approved brief, implementation plan, and actual EGM findings are persisted under `docs/designs/article-loop-continuation/`. The exact reviewed PR head may be merged into `main` and the exact merged commit deployed once every required gate passes.

### Editorial work continuation amendment, 2026-11-01

Classification: explicit product-owner directive.

Clarify supervisor instructions for existing manual/API article imports. Missing or invalid `EditorialEvidenceV2` requires completion of `.agents/skills/eleanor-editorial/SKILL.md` before another validation submission. Keep editorial mechanics in that skill. The supervisor must repair the relevant artifact, evidence, or bound packet before retrying; unchanged failing submissions are prohibited. After three unsuccessful repairs, investigate the underlying assumption and continue only when a verified remedy is available. Preserve existing retry counters.

Unfinished editorial work alone is not a durable blocker. A demonstrated obstacle must record its cause, attempted recovery, and exact requirement for resumption. Genuine article-specific blockers retain the existing continuation policy; shared capability, model-access, integrity, or release failures stop the run. Resolve an article blocker's cause before explicit intake retry, preserving the same snapshot and publication gates.

This instruction-only amendment authorizes changes to `AGENTS.md`, the external-article-import skill, and supporting review/evidence documents. It also authorizes recovery inspection and completion of the existing import `article-c23a6320-0ba7-45e3-88dd-9160ce979f18` in snapshot `intake-c8e12e5b-e280-41d4-8cf5-e10a780cb9d1`, subject to verified persisted state and available capabilities. It adds no runtime code, schema, schedule, source-strategy change, or release authority. Intake execution remains confined to the primary checkout. The agreed brief, plan, and actual EGM findings are in `docs/designs/editorial-work-continuation/`.

### Research recovery and dependency security amendment, 2026-11-03

Classification: explicit product-owner directive.

Combine the remaining dependency security repairs from PR #45 with mandatory research recovery in the existing article-to-page workflow. Missing or invalid research must require actual research and revalidation. Return downstream work to RESEARCHING and invalidate dependent approvals before release starts; preserve existing release attempts for verified integrity recovery. Preserve valid evidence reuse, source snapshots, retry/diagnosis rules, model identities, independent review and release gates. Add focused regression tests and explicit supervisor instructions. This authorizes the combined PR, merge and deployment after required checks and current-head review, followed by cleanup of obsolete clean merged worktrees. Preserve dirty or unmerged worktrees. Provide a continuation instruction for the existing automation after deployment; do not run real article imports or create schedules during implementation.

### Beam policy and OpenCode 2.2.6 support, 2026-11-08

Classification: explicit product-owner directive (BEAM-POLICY-001).

Owner directs use of only `opencode-go/beam-free` for the build and a truthful separate Beam review pass in a distinct OpenCode session/exchange with exact model identity, replacing the different-model-family cleanse. OpenCode 2.2.6 is the supported runtime after capturing a harmless real Beam export. Preserve legacy historical evidence interpretation; new policy is explicit/versioned through the `beamReview` pass name and same-family attestation. No model fallback, no real article imports, no merge/deploy in this cell. Packet `BEAM-POLICY-001` is registered in `build-pack/execution-state.json`.

## Binding scope

### Verified automation model configuration, 2026-11-03

Classification: explicit product-owner directive. Configure `opencode-go/beam-free` for the supervising automation and `nvidia/minimaxai/minimax-m3.1-flash` for Eleanor's different-family cleanse. Verify both with harmless synthetic prompts and retain exact identity evidence. Add only the installed OpenCode 2.2.5 receipt adapter and executable selection needed for this configuration; preserve existing evidence and editorial gates. The owner's subsequent "merge and deploy" directive authorizes release of these automation changes after required checks and current-head review. Article authoring, import start/resume, actual record migration, and article publication remain unauthorized.

### Article automation hardening, 2026-11-03

Classification: explicit product-owner directive. Packet `ARTICLE-HARDENING-002` implements the reviewed plan in `docs/designs/article-automation-hardening/automation-hardening-plan.md`. Its actual EGM review findings are retained alongside it. Scope is local validated evidence, mandatory Eleanor/SEO/AEO sequencing, versioned state compatibility, intake/source concurrency, diagnosis, retained production-verifier output, capability checks, and synthetic regression tests.

The owner explicitly prohibits article authoring, real import execution or resumption, live state migration, publication, merge, and deployment during this implementation. This overrides the standing automatic release rule for this packet. No schedule, model client, service, or source-strategy amendment is authorized. The deliverable is tested automation code and review evidence in an isolated checkout. Existing public pages and primary-checkout intake state stay unchanged.

This file is the only repository planning authority. It governs implementation sequencing and release decisions, subject to `AGENTS.md`, the source-intelligence records, and the non-inference gate.

Source strategy documents are semantic inputs, not executable instructions. Historical receipts prove only the work named in those receipts. They do not authorise a new workflow or revive retired work.

## Registered implementation scopes

### Plan 2 — Neon repository intelligence replacement (registered 2026-10-28)

Classification: explicit product-owner directive.

Replace both document-intelligence persistence/query and repository code-impact/navigation with the existing Neon Postgres project. Remove the retired repository graph tool from the entire tracked tree, including configuration, generated bridges, scripts, tests, prompts, skills, planning records, manifests, evidence text, and active instructions. Preserve the twelve source strategy documents and the deterministic source manifest and canonical graph as auditable inputs. Store versioned semantic and code relationships in schema `repository_intelligence_v1`, prove migration and impact queries on an isolated Neon branch, obtain an independent review of the exact candidate head, then merge, apply the reviewed migration and snapshot, deploy the merged application commit, and verify production. This directive authorises no schedules, autonomous publication, or new product requirement.

#### Plan 2 closeout — execution-guidance reconciliation (registered 2026-10-29)

Classification: explicit product-owner directive.

The post-migration acceptance audit and implementation packet are maintained under build-pack/authority-alignment/plan-02/. The closeout deepens evidence for the completed Neon replacement, reconciles outstanding Plan 1 findings, and limits the next implementation to confirmed contradictions C-201 through C-204: release guidance, explicit named article triggers, mandatory design-skill routing, and isolated transactional rollback proof. It introduces no schedule, product feature, publication authority, source-strategy amendment, or Plan 3 agent-boundary change.

### Plan 1 — Authority alignment (registered 2026-10-28)

Classification: user-approved scope (owner approves amendments to living source strategy documents within this plan).

Scope is limited to pass 1: map and reconcile authority. Amendments are applied to living source strategy documents (D01-D04), the execution `AGENTS.md` (none required this pass), and `planning.md` (this registration). Derived intelligence records are regenerated. Subordinate skills, prompts, runtime code, tests and release configuration are read as evidence only; their implementation changes are deferred to Plan 2. Agent consolidation belongs to Plan 3. No new framework, schedule, service, product requirement, runtime refactor or production-content change is authorised.

Registered contradictions: C001-C005 (contradiction_register.md). Registered amendments: M001-M005 (amendment_register.md). Plan 2 candidates: P2-001 onward (plan_02_handoff.md).

## Non-inference gate

Before treating a statement as a repository fact:

1. cite the exact source document, heading, and stable source identifier;
2. label user directives, inferences, proposals, and external evidence;
3. keep unresolved conflicts unresolved until the product owner adjudicates them;
4. do not infer a prerequisite, service, schedule, release channel, workflow stage, or capability;
5. keep commercial intent subordinate to evidence, disclosure, ranking independence, and anti-deception requirements.

## Active BuildRunner state

`build-pack/execution-state.json` contains only the completed Phase One packets. Source requirements remain in the requirements ledger for traceability, but requirements outside Phase One have no executable task assignment. Retired workflow requirements are marked `owner-retired`; other future requirements are marked `separate-authority-required`.

The generic publication-authority field remains disabled because the BuildRunner schema requires an explicit value. It does not authorise automation or publication.

## Phase One production receipt

The authoritative receipt is `build-pack/receipts/phase-one-release.json`.

Verified public routes:

- https://vettedsaasblueprint.online/
- https://vettedsaasblueprint.online/prepare-ai-client-work
- https://vettedsaasblueprint.online/reviews-navigation
- https://vettedsaasblueprint.online/guides/ai-software-buying-safety

Phase One has no pending acceptance item. Its completed packets are retained only as verified history.

## Release rule

Repository changes still require the isolate, build, prove, and ship workflow in `AGENTS.md`. When the exact reviewed head passes every required gate, merge and deploy the reviewed change. A production deploy must use the merged commit and record independent verification evidence.

## Registered implementation scopes (continued)

### Scanner negation repair (SCANNER-NEGATION-1108) (registered 2026-11-08)

Classification: user directive (narrow corrective maintenance enabling existing article quality gate).

Scope: repair demonstrably false positive in three specialist scanners for clearly negated guarantee wording. Owned files: scripts/scanner-negation.mjs (shared helper), the three scanner scripts, tests/scanner-negated-guarantee.test.ts, build-pack/repairs/scanner-negation-1108/* evidence, planning/execution-state registration. No source strategy amendments, no new automation programme, no article execution in this worktree. Evidence: build-pack/repairs/scanner-negation-1108/.

### Presentation CSS repair (PRESENTATION-CSS-1108) (registered 2026-11-08)

Classification: user directive (narrow corrective maintenance enabling existing article quality gate).

Scope: repair demonstrated CSS presentation-gate failures and the related mobile split-reveal entrance overflow. Owned changes: src/app/globals.css, src/app/gr-premium-styles.css, src/components/landing/LandingPageMotion.tsx, src/components/landing/split-reveal-offset.ts, and tests/split-reveal-offset.test.ts. Corrections replace thick side-tab borders with 1px boundaries, replace Arial/Inter declarations with installed faces, replace gradient text with solid color, and bound horizontal split-reveal travel to available viewport gutter. Evidence and registration only; no source strategy amendments, no new automation programme, no article execution in this worktree. Evidence: build-pack/repairs/presentation-css-1108/.

### Candidate contract repair (CANDIDATE-CONTRACT-1108) (registered 2026-11-08)

Classification: user directive (narrow corrective maintenance enabling existing article quality gate).

Scope: repair contradictory candidate direct-review verification predicates and private-source release path handling. Owned files: scripts/verify-landing-deployment.ts; src/lib/article-import/{verification-evidence,presentation,workflow-evidence,rendering-inputs,format-validation,release,local-release-adapter,candidate-route}.ts; relevant tests; planning.md/build-pack/execution-state.json; build-pack/repairs/candidate-contract-1108/. No source strategy amendments, no new automation programme, no article execution in this worktree. Evidence: build-pack/repairs/candidate-contract-1108/.

### Review outcomes repair (REVIEW-OUTCOMES-1110) (registered 2026-11-10)

Classification: user directive (narrow corrective maintenance enabling existing article quality gate).

Scope: fix forced-pass review instructions so reviewers may fail or report insufficient evidence; parse truthful negative reviews as valid but block advancement; pass with unresolved findings blocks. Owned files: src/lib/article-import/workflow-evidence.ts, workflow-requirements.ts, one narrow review contract/helper if justified; tests/article-workflow-evidence.test.ts and relevant lifecycle integration tests/fixture only as needed; .agents/skills/external-article-import/SKILL.md and a focused reference file; planning.md, build-pack/execution-state.json; build-pack/repairs/review-outcomes-1110/ evidence; .mece/cells/REVIEW-OUTCOMES-1110/ report/scripts. No UI edits. Synthetic tests only; real article run remains paused; no article start/resume/capture/review or modifications of primary checkout, article artifacts, .automation data, historical receipts or source documents. Evidence: build-pack/repairs/review-outcomes-1110/.

### Capture replay repair (CAPTURE-REPLAY-1110) (registered 2026-11-10)

Classification: user directive (narrow corrective maintenance enabling existing article quality gate).

Scope: retain exact selected message text and original identity, linkage and completion metadata in captured OpenCode evidence; require replay through the same extractor when validating a handoff. Owned files: src/lib/article-import/execution-evidence.ts, src/lib/article-import/workflow-evidence.ts, scripts/capture-article-execution.ts; tests/capture-replay-1110.test.ts, tests/opencode-v2-evidence.test.ts, tests/article-workflow-evidence.test.ts, tests/article-content-approval.test.ts, tests/beam-review-policy.test.ts, tests/article-import.test.ts and their synthetic fixture helpers; .agents/skills/external-article-import/SKILL.md; planning.md, build-pack/execution-state.json; build-pack/repairs/capture-replay-1110/ evidence; .mece cell reports. No UI or source-strategy changes. Synthetic tests only; real article run remains paused. Evidence: build-pack/repairs/capture-replay-1110/.

### Dev-only approved-article preview (ARTICLE-PREVIEW-001) (registered 2026-11-17)

Classification: explicit user directive (2026-11-17). Dev-only renderer; no article execution or publication.

Scope: implement a dev-only preview route that renders a frozen approved artifact through the existing ReferenceComposedReviewPage, reusing current style system. The route validates import ID, work packet, contentApproval path and SHA256, PageBlueprintV1 schema, and valid slug; rejects traversal, mismatches, wrong stage, missing evidence. Never exposes source/research/work packet fields, never writes article/receipt/import/result state, no caching, returns 404 in production. No arbitrary file-path/URL input, no public production publication API, no new automation stage/scheduler. Preserve exact article bytes and approval. Owned files: src/lib/article-import/approved-article-preview.ts; src/app/dev/approved-article-preview/[slug]/page.tsx; tests/approved-article-preview.test.ts; planning.md; build-pack/execution-state.json. Synthetic tests only; no private real article data in PR. Evidence: .automation/article-imports/work/article-ea8e4b04-.../presentation-evidence/.

Source strategy documents remain unchanged. No source strategy amendments.

### Approval receipts repair (APPROVAL-RECEIPTS-1124) (registered 2026-11-24)

Classification: user directive (narrow corrective maintenance enabling existing article quality gate).

Scope: make content approval yield the parsed artifact for presentation and dev preview without a second artifact-file read; split pure historical-receipt allowlist decision from filesystem read; use named historical context in internal call graph while preserving legacy positional call orders. Owned files: src/lib/article-import/{content-approval,presentation,approved-article-preview,verification-evidence}.ts; optional adjacent pure historical receipt matcher; tests/approved-article-preview.test.ts, tests/article-content-approval.test.ts, tests/article-candidate-verification-regression.test.ts. Synthetic tests only; no private real article data in PR. Evidence: build-pack/repairs/approval-receipts-1124/verification.md.

### Article mutation ownership (ORCH-02), 24 November 2026

Owner directive. Implement ORCH-02 in the existing TypeScript controller. Use disposable articles for acceptance. The materialized packet is `ORCH-02-MUTATION-OWNERSHIP`.

| Command | Checkout and capabilities | Ownership and acceptance |
| --- | --- | --- |
| Source start, intake start/resume, import resume, import and intake dispatch (command and callable paths) | Primary checkout and execution preflight | Bind source allocation, intake changes and import transitions to their respective leases. Resume reports contention. |
| Record presentation | Primary checkout and execution preflight | Load under the import lease. Only VALIDATING accepts bound receipts. Race against resume in both orders and verify one accepted transition. Late submission preserves a pending journal, rollback target and terminal proof. |
| Execute release or record exact-head review | Primary checkout and execution preflight on the release command | Hold the import lease across journal updates and external operations. A stale or competing writer cannot issue another effect. |
| Upgrade evidence/intake, reconcile, retry, submit diagnosis, recover lease | Primary checkout and operation-specific evidence | Check ownership at each affected record. Explicit recovery requires verified owner exit. |
| Describe workflow, preflight report, intake check/status, completion and release dry-run | Inspection | Read busy or historical records without writing, claiming ownership or initiating external release actions. |

The verification covers the command and callable paths, including stale submissions, failed preflight, nested ownership and restart. For V2-06, exercise missing publication membership and declared-file mismatch independently, then run the required suites on the same revision.

### Validation slim corrections (VALIDATION-SLIM-1124) (registered 2026-11-24)

Classification: user directive (narrow corrective maintenance enabling existing article quality gate).

Scope: remove the loop requiring viewport words in page design notes while retaining required notes and unavailable-check rejection; use a single read of each research snapshot at the content-assessment review input builder and research validator through shared readVerifiedEvidenceBytes; preserve browser checks, affiliate verification, and editorial passes. Owned files: src/lib/article-import/{contracts,execution-evidence,workflow-evidence}.ts; tests/validation-slim-corrections.test.ts; planning.md; build-pack/execution-state.json. Synthetic tests only; no real article run. Evidence: build-pack/repairs/validation-slim-1124/verification.md.
