# Issue 109 recovery reconciliation and future WebCatalog demonstration

Date: 27 November 2026

Issue: [#109](https://github.com/michaelchamboko/VettedSaaSBlueprint/issues/109), child of [#96](https://github.com/michaelchamboko/VettedSaaSBlueprint/issues/96)

Investigated product revision: `f026bca8b53aecca829262e9a27820ac6d078892`

## Scope and authority

This report reconciles the twelve synthetic investigation tickets, the 28 user stories, testing decisions 1 through 11, interview coverage Q1 through Q48, Original Q41 and Q41a through Q41c, and the 38-item WebCatalog inventory. The full machine-readable account is [traceability.json](./traceability.json).

The current task is investigation and documentation only. No product fix, real article execution, database mutation, artifact cleanup, merge, deployment, publication, or issue-status change occurred. `planning.md` remains the only implementation authority. Its `ARTICLE-HARDENING-002` scope permits automation-code work and synthetic tests, while prohibiting real article work, migration, merge, deployment, and publication. The accepted directions in primary-checkout ADR-0002, ADR-0003, and ADR-0004 remain implementation pending a planning amendment. Those ADRs were untracked in the dirty primary checkout during this investigation, so the committed branch evidence relies on the matching accepted design in issue #96 and records the ADR location without presenting it as part of the investigated revision.

Expected behavior comes from issue #96 and the cited source-strategy sections in [the 38-finding inventory](../108/webcatalog-finding-traceability.md). Observed behavior comes from the prerequisite probes. A future check is not an observed pass. Issue #107 binds its synthetic judgments to frozen packets. The fresh inventory in issue #108 has a date and mutable public URL but no commit, deployment identity, or capture fingerprint, so its exact revision binding is unavailable. Neither supplies historical review or approval.

Q40 remains undecided. It concerns legacy access, current compliance, and routing of legacy defects. The future demonstration must not invent a policy. It should request owner adjudication only if a concrete legacy-routing choice cannot proceed without it.

## Reconciled result

The investigation established real safeguards worth preserving. Selected negative evidence blocks advancement. Research reuse fails closed on relevance, support, integrity, and freshness. Stage repair totals survive changed labels and reloads. The lease protocol fences recovery until the old owner exits. The public catalogue serves independently of mutable import state. Pre-publication repair remains separate from post-publication IMPROVE. Frozen references can preserve exact bytes. Six genuine blinded judgments passed the accepted defective and adequate pairs.

Those protections do not amount to the accepted recovery design. The current controller has no activity checkpoint identity, stable pre-publication finding and resolution contract, intentional-repair predecessor identity, late-result candidate reconciliation, wording-independent failure category, falsifiable diagnosis fields with a separate remedy check, general canonical evidence register, unified publication reconciler, per-gate handoff and cleanup operation, or Q44/Q48 crash and retry state. These are product gaps or unreachable states at the investigated revision. This report does not authorize or claim their repair.

The evidence resolves several apparent inconsistencies by revision and scope:

- Issue #103's final evidence includes an actual isolated Next HTTP request with 200 responses and serving independence. The older `publicRoute.httpObserved: false` field describes the direct component-render subcase, not the later HTTP subcase retained in `http-observations.json`. Its deployment probe calls the local synthetic adapter's `deploy(expectedCommit)` and retains the intended-versus-observed commit mismatch; it is not a supervised restart or external deployment.
- Issue #105's controlled-time classifier is test-only expected behavior. It does not prove automatic/manual trigger equivalence, persisted cleanup identity, retry-state preservation, article-repair count preservation, or worker-call preservation.
- Issue #102 separates static boundary inventory, exact-byte freezing, and actual product-boundary exercise. Only research exercised a first-class canonical register. The other five evidence classes remain unreachable through a register boundary.
- Issue #107 postdates the #108 inventory. It updates reviewer-effectiveness evidence for findings 12, 19, and 31 from absent to six accurate blinded judgments across the three defective/adequate pairs. It does not change #108's historical-causation conclusions.
- Lost-response and indeterminate release cases each made one deployment attempt and one rollback attempt, then held without resuming verification. The hard-exit case also held while the lease was owned; after verified owner exit, the controller issued a second deployment because the first identity had not been saved.

## Mechanism evidence

| Ticket | Current observation | Unreachable or missing proof | Future acceptance |
| --- | --- | --- | --- |
| [#97](https://github.com/michaelchamboko/VettedSaaSBlueprint/issues/97) | Lost and indeterminate responses each made one deployment attempt and one rollback attempt, then held; hard exit stayed fenced until owner recovery. | No provider lookup or one-call verification resume. | Reconcile the first remote identity, complete all production checks, and reach LIVE with one deploy call. |
| [#98](https://github.com/michaelchamboko/VettedSaaSBlueprint/issues/98) | Approval-level reuse, stale invalidation, and blocking work. | No activity identity or earliest-unfinished selection. | Interrupt after each accepted activity and prove no repeated accepted worker call. |
| [#99](https://github.com/michaelchamboko/VettedSaaSBlueprint/issues/99) | Rejection blocks and unchanged resubmission fails. A passing replacement can erase the obligation in practice. | No stable finding, resolution, owner referral, or affected-regression record. | Carry the same finding through bound repair and independent closure. |
| [#100](https://github.com/michaelchamboko/VettedSaaSBlueprint/issues/100) | Cumulative stage total and diagnosis gate work. Routing varies with wording. | No prediction/disproof fields, separate remedy check, or measurement-change approval. | Prove category stability, falsifiable diagnosis, independent remedy verification, and measurement review. |
| [#101](https://github.com/michaelchamboko/VettedSaaSBlueprint/issues/101) | Lease fencing and cached-result validation work. Interrupted and intentional work share identity. | No active replacement or late candidate protocol. | Deliver A after B starts and require an explicit, recorded controller decision. |
| [#102](https://github.com/michaelchamboko/VettedSaaSBlueprint/issues/102) | Research registry decisions and controller research recovery work; exact bytes freeze. | Five non-research canonical register boundaries and an independent approval survivor are absent. | Exercise all evidence classes through real register boundaries and dependency rules. |
| [#103](https://github.com/michaelchamboko/VettedSaaSBlueprint/issues/103) | Catalogue route served 200 independently of mutable import; direct approval and validator probes caught artifact, intended-commit, and production-proof disagreements. | No single five-identity publication reconciler. | Compare serving, approval, commit, production proof, and terminal state before LIVE. |
| [#104](https://github.com/michaelchamboko/VettedSaaSBlueprint/issues/104) | Pre-publication repair and post-publication IMPROVE remain distinct; original LIVE proof stayed unchanged. | Pre-publication owner and obligation are only generic stage text. | Route a named failed acceptance check to its owning activity and preserve history. |
| [#105](https://github.com/michaelchamboko/VettedSaaSBlueprint/issues/105) | Full-record handoff and readable hash references exist; cleanup marker does not block. | No per-gate declaration, trigger, archive expiry, or preservation proof. | Use one durable operation for automatic and manual cleanup and block dispatch until verified. |
| [#106](https://github.com/michaelchamboko/VettedSaaSBlueprint/issues/106) | Q44 markers are ignored; generic transient attempts are not Q48 attempts; shared integrity stops. | No interruptible cleanup operation. | Interrupt all three boundaries and exhaust exactly three operation attempts across restarts. |
| [#107](https://github.com/michaelchamboko/VettedSaaSBlueprint/issues/107) | Six of six blinded judgments were accurate, with zero misses and zero false alarms. | General reviewer reliability and history remain unknown. | Preserve the six-case threshold against the future reviewer configuration. |
| [#108](https://github.com/michaelchamboko/VettedSaaSBlueprint/issues/108) | All 38 findings have source, purpose, owner, observation, coverage, gap, and causation confidence. | Missing historical provenance cannot be recreated. | Bind a fresh 38-row demonstration ledger to the exact demonstrated revision. |

## Traceability

[traceability.json](./traceability.json) contains one record for every prerequisite, story, testing decision, interview question, and inventory finding. [verify.test.mjs](./verify.test.mjs) checks counts, uniqueness, coverage, required fields, and the bounded demonstration headings.

The 28 stories divide into four evidence states:

- Observed safeguards: stage-wide repair totals, four-dimension research reuse, post-publication history preservation, the six revision-bound blinded judgments, and the 38-row inventory. The inventory's fresh live-page judgments are not revision-bound.
- Partial current behavior: rejection blocking, exact-byte retention, missing-observation blocking, pre-publication versus IMPROVE separation, and separate publication validators.
- Unreachable before implementation: activity restart, finding-bound resolution, intentional replacement identity, late-result selection, non-research canonical registration, and cleanup crash recovery.
- Future only: a corrected WebCatalog run across all 38 findings. Issue #109 specifies that run but does not authorize it.

Testing decisions 1 through 11 are each tied to prerequisite evidence in the JSON. Testing decision 11 controls the interpretation: prior evidence, new reproduction, unreachable scenario, and future acceptance remain separate. A supplied verdict exercises controller selection only. Issue #107's six genuine blinded judgments alone satisfy Q45-Q46's reviewer threshold.

Interview coverage follows the parent issue's groupings. Q1-Q39 and Q42-Q48 have recorded design answers. Original Q41 and Q41a-Q41c establish database-first validated reuse and broader evidence registration while preserving source strategy as requirement authority. Q40 remains an open owner decision, not missing test evidence.

The 38-finding section in the JSON adds a measurable future check and retained artifact to each #108 row. Historical attribution stays explicit. Findings 36 and 38 are later owner directives and are not retroactive release-era criteria. Finding 26's exact craft-floor threshold is current local guidance, not proven 13 October authority. Findings 12, 19, and 31 now have synthetic reviewer-effectiveness evidence, not historical WebCatalog approval evidence.

## Future WebCatalog demonstration

The demonstration is a release-quality evidence exercise after separately authorized implementation. The real run requires separate authorization. It should run one corrected WebCatalog candidate through the normal supervised workflow in the primary checkout and keep an unaffected article as the catalogue and presentation control. Fault injection belongs in isolated synthetic acceptance cases before the real run. The real run must not manufacture a crash, duplicate a remote action, or mutate production merely to demonstrate recovery.

### Entry conditions

1. `planning.md` contains an explicit dependency-ready implementation packet for the accepted ADR-0002, ADR-0003, and ADR-0004 behavior. The exact implemented head has focused acceptance tests for every currently unreachable path, required repository gates, and an independent current-head review. Issue labels and ADR status alone do not satisfy this condition.
2. A separate owner directive authorizes the WebCatalog demonstration itself, including the exact article revision, allowed real mutations, model or reviewer calls, database target, GitHub operations, artifact handling, and release boundary. Authorization to investigate or implement synthetic tests is insufficient.
3. The run starts from the primary checkout through the existing manual or API trigger. Preflight confirms no conflicting owner or lease, a fixed immutable input snapshot, exact source and product revision, branch and commit, research-registry target, WebCatalog canonical route, production alias, rollback target, and an unaffected control article. Secondary-worktree and scheduled execution remain prohibited.
4. All required capabilities are available and verified without a paid fallback: worker and reviewer contexts, built-in ImageGen, browser interaction capture, database connection, GitHub access, Vercel lookup/deploy/alias access, and retained-evidence storage. Missing shared capability stops the run before mutation.
5. The baseline ledger binds all 38 findings to the exact candidate, applicable source criterion, purpose, format, owning activity, expected observation, and historical disposition. Any Q40-dependent legacy routing choice is resolved by the owner before that branch of the run proceeds. Otherwise Q40 stays open.

### Measurable checks

The implementation acceptance suite runs before the real article. It must prove activity checkpoint resume, finding continuity and evidenced closure, distinct intentional-repair identity, late-result selection, wording-independent categories, cumulative diagnosis with separate remedy verification, all canonical register classes, five-identity publication reconciliation, automatic/manual cleanup parity, Q44 crash recovery, and exactly three Q48 pre-mutation attempts. Each case records stage and activity identity, worker calls, remote calls, retry totals, journal contents, evidence references, and next action before and after restart.

The WebCatalog content pass closes or explicitly leaves open findings 1-13, 20-24, and 30-36. The machine-readable finding ledger must contain the final observation, reviewer, examined revision, resolution or justified inapplicability, and evidence reference for each row. A passing replacement cannot omit an older finding. Every semantic repair reruns the original defect check and directly affected regressions.

The presentation pass exercises findings 14-19, 25-29, 37, and 38 at desktop, 390x844, and 320x800. It records full-page and first-screen captures, substantive rectangles and computed type roles, keyboard focus and scroll movement, accordion state, normal-motion elapsed samples, reduced-motion meaning preservation, decoded visible media, alternative text, and independent visual judgments. A visible, usable CTA must appear inside the initial viewport at both 390x844 and 320x800. Findings 12, 19, and 31 rerun the unchanged blinded defective/adequate pairs; the threshold remains six of six, with misses and false alarms reported separately.

The publication pass compares the target and unaffected control for one-at-a-time content, renderer, style, asset, and rule changes. It records why each approval is reused or invalidated. Before LIVE, one reconciliation must agree on served article revision, content and presentation approval revision, intended merged commit, deployment and production assignment, retained production observations, and terminal record. A lost or indeterminate deployment outcome holds release and performs lookup before any retry.

The run succeeds only when every applicable finding has a fresh bound observation, every open rejection has an evidenced disposition, all required next-gate inputs resolve, no cleanup operation is incomplete, the six blinded cases pass, the unaffected control behaves as predicted, all required repository and production checks pass, and the terminal record agrees with public HTTP evidence. Processing completion or a clean detector alone is not success.

### Retained artifacts

- Run manifest: authorization reference, fixed snapshot, exact commit, configuration and tool identities, environment, database branch, target and control routes, production alias, rollback target, and preflight result.
- Evidence register: research snapshots and decisions, article and renderer fingerprints, all activity attempts, rejected findings, resolutions, diagnosis and remedy checks, editorial and browser judgments, applicable criteria, integrity hashes, and retention dependencies.
- Presentation proof: early and settled desktop/mobile captures, complete visible-text projection, geometry and computed styles, accessibility and keyboard traces, motion and reduced-motion samples, ImageGen provenance and byte bindings, and the six blinded review results.
- Handoff and cleanup journals: accepted outputs, required next inputs, retained evidence, archive and disposal candidates, unclassified items, durable operation intent, retry totals, byte and reference reconciliation, day-30 eligibility recheck, and verified downstream readability.
- Release proof: exact-head review, merge commit, repository checks, deployment lookup and journal, alias assignment, rollback evidence, target and control HTTP responses, all production checks, five-identity reconciliation, terminal bundle, and any later IMPROVE history kept separate.

### Permissions and explicit exclusions

The owner must separately authorize implementation, the real WebCatalog run, and each external mutation category the run needs. That includes real article and import state changes, model or reviewer execution, database registration or migration, artifact archive or deletion, GitHub branch/PR/merge actions, and Vercel deployment, alias, or rollback actions. Existing credentials and access are prerequisites, not authorization.

No schedule, new lifecycle stage, secondary-worktree execution, paid fallback, retrospective historical approval, fabricated database row, forced lease takeover, or cleanup based only on age is permitted. The demonstration cannot rewrite historical receipts or present a fresh pass as proof that the historical workflow caught a defect. Any historical gap retains its own `unknown` or `unverified` disposition beside the new run's result.

## Verification record

The TDD red receipt is [red-output.txt](./red-output.txt). The passing focused result is retained in `test-output.txt` after the final integrated head is verified. General repository gates and independent current-head review remain the coordinating task's responsibility.
