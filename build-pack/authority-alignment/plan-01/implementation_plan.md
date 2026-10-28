# Plan 1 — Map and Reconcile Repository Authority

## Scope

The owner approves three passes:
1. Map and reconcile authority.
2. Fix contradictory execution guidance.
3. Measure and simplify actual agent boundaries.

Execute only pass 1. Amend living source strategy, AGENTS.md, planning.md, and directly derived intelligence/requirement records. Read subordinate skills, prompts, runtime code, tests and release configuration as evidence; defer their implementation changes to Plan 2. Agent consolidation belongs to Plan 3.

Use karpathy-guidelines. No new framework, schedule, service, product requirement, runtime refactor or production-content change is authorized by this packet. If a generator or validator needs code changes beyond document regeneration, record the precise blocker and obtain a scope decision before making those changes.

Established owner decisions:
- Retired research/editorial/optimisation/watchdog schedules remain retired.
- Article-to-page execution requires an explicit manual or API trigger.
- Passing all required gates and independent review of the current PR head permits automatic merge and deployment.
- Independent code review and different-model-family editorial cleanse remain mandatory.
- Preserve evidence, disclosure, commercial integrity and traceability requirements.
- Source documents are living documents; obsolete requirements must not remain active instructions.
- planning.md is the sole planning authority; this folder is subordinate supporting detail.

## Continuous logging — required throughout

Initialize actual current-state fields in plan_results.md before substantive work. Record each task start before performing it.

Append one ledger entry immediately after every independently verifiable outcome: a source inspection establishing a conclusion; a finding; a policy resolution; a bounded edit; artifact generation; check result; or verified release action. Update before beginning unrelated work.

Several reads supporting one conclusion can share an entry if all sources are listed. Separate independent outcomes from compound commands. Log concrete evidence and conclusions, not keystrokes or internal reasoning.

Each entry must include:
- Sequential ID (A0001), task ID, short outcome title.
- Actual ISO 8601 timestamp with timezone.
- PASS, FAIL, BLOCKED or OBSERVED.
- Action, input paths/headings/stable IDs/commits.
- Exact command and working directory, or direct inspection.
- Expected result and actual result, including exit code.
- Relative links to retained evidence.
- Changed files or none.
- Supported decision, limitations, and exact next action.

Use evidence/ for long outputs and focused diffs. Never store credentials. Never replace failures with later successes. Append corrections referencing the original entry. Do not retroactively claim contemporaneous logging.

Record dispatch separately from completion for long operations: a process ID is not success. At interruption record incomplete work and a resume point. On restart reconcile Git and evidence against the ledger before repeating anything.

After three unsuccessful fixes for the same issue, stop editing and investigate the doubtful assumption. If logging was missed, acknowledge the gap and reconstruct only facts supported by retained evidence.

## T01 — Establish baseline

1. Read applicable AGENTS.md files, planning.md, installed karpathy-guidelines and C:/Users/micha/.codex/RTK.md. Follow RTK command conventions.
2. Inspect directory, branch, HEAD, status, remotes and worktrees. Record commands/output. Preserve unrelated changes.
3. Fetch origin/main and create a fresh codex/ branch/worktree from it following repository rules. Do not execute on the old purge branch. The previously inspected purge checkout was 3f1fc2b; this is historical context, not a current baseline.
4. Copy this handoff into the isolated checkout if absent. Record source/destination and compare file hashes. Continue execution logging in that copy and report its absolute path.
5. Record tool versions and required baseline checks. Distinguish pre-existing failures from introduced failures; dependency failures are not source-code failures.

Proof: isolated baseline SHA, preserved unrelated work, instruction inventory, truthful check results. If isolation or baseline cannot be established, stop dependent work.

## T02 — Inventory authority and consumers

1. Read all twelve registered original strategy documents using SOURCE_MANIFEST.json to locate them. Record IDs, paths, hashes, inspected headings and coverage. Generated summaries do not substitute for original text.
2. Inspect AGENTS.md, planning, relevant skills/prompts, runtime entry points, configuration, tests and release receipts.
3. Populate authority_map.md per policy: authoritative source/section/UID, owner directive, subordinate consumers, observed behaviour, evidence and unresolved precedence.
4. Inventory generated artifacts by actual producer, inputs, command/parameters, output, consumers and validator. Read scripts; do not guess from names.
5. Distinguish separate model contexts from tools, skills and fixed code stages. Note available traces and missing evidence without inventing measurements.

Proof: all sources accounted for; audited policies traced to consumers; generation dependencies established.

## T03 — Establish and resolve contradictions

Investigate: automatic versus owner merge; manual/API versus heartbeat execution; primary-checkout ownership versus isolated worktrees; completed Phase One versus pending instructions; conflicting design procedures; independent review/editorial cleanse; retired programme claims; duplicated rule ownership.

One contradiction-register entry per finding. Include both statements and precise source locations, runtime evidence or unobserved status, impact, classification, controlling authority, replacement meaning, affected authoritative files, deferred Plan 2 changes and acceptance criteria.

Classifications: confirmed contradiction, stale wording, intentional distinction, unresolved decision. Existing code establishes behaviour, not authority. Resolve only from established owner decisions and documented precedence.

Ask for a specific missing decision when a consequential conflict cannot be settled. Block only dependent amendments and continue independent findings.

Proof: each proposed amendment has a resolved finding, authority and acceptance check.

## T04 — Amend authoritative documents

1. Register this approved scope in planning.md without authorizing later-plan implementation.
2. Apply one resolved finding at a time across affected source strategy, AGENTS.md and planning.md.
3. Log immediately; add amendment-register entries with prior/new meaning, finding/policy IDs, authority, changed references, focused diff and verification.
4. Remove obsolete operational requirements from active instructions. Retain concise historical explanation in amendment records and Git.
5. Preserve headings/ancestry where possible. IDs derive from document ID, full heading ancestry and duplicate occurrence. Renames/moves require an old-to-new identifier map and consumer checks.
6. Defer subordinate skills/prompts/runtime corrections to Plan 2. Do not report complete execution alignment while those mismatches remain.

Proof: bounded diffs linked to resolved findings, consistent authority, no unrelated semantic edits.

## T05 — Regenerate and verify derived records

Read full scripts and actual parameters before invocation. Establish producer order from T02. Confirmed entry points to inspect:
- scripts/build-document-inventory.ps1
- scripts/extract-relationship-candidates.ps1
- scripts/build-document-graph.ps1
- scripts/impact-document-change.ps1
- scripts/verify-document-intelligence.ps1

Run documented inventory/verification commands from the repository root, using RTK as required. Inspect usage before stable-UID impact analysis. Discover bridge and requirement-generation dependencies from code. Never invent flags or manually patch generated output to make checks pass.

The inspected verifier expects twelve documents and 1,424 headings. Prose-only edits should preserve counts. A structural amendment requires justified expected counts and explicit identifier migration; do not weaken verification to hide failures. Follow the scope rule if validator code changes are required.

Verify source text, hashes, identifiers, references and requirement dispositions. Preserve unrelated reliability/review/release requirements and mappings. For deterministic artifacts, regenerate twice and compare outputs; explain any volatile differences.

Proof: reproducible outputs, fresh hashes, valid references, accounted-for ID changes, no unexplained mapping changes.

## T06 — Validate and independently review

Run required checks from the implementation checkout (prefix with RTK under local instructions):
- npm run verify:agent-workflow
- npm run lint
- npm run typecheck
- npm test

Record each exit code and result. Add build/public-site/runtime verification where the changed surface and repository contract require it. Do not repeat successful checks without new changes or unresolved concerns.

Review final diffs against finding IDs. Obtain the required independent Codex review of the current commit. OpenCode must not label its own review independent. If the reviewer capability is unavailable, complete unaffected work, mark REVIEW BLOCKED, and supply the exact commit and review request. Never bypass the gate.

Follow repository PR/release rules only after required gates and review. Record actual branch, PR head, merge commit, deployment and production-verification evidence where applicable. Dispatch is not completion.

Proof: checks and independent review tied to the current commit, accurate release status. Missing required checks block completion.

## T07 — Prepare Plan 2 handoff

Maintain plan_02_handoff.md as findings emerge. Each candidate must include finding/policy IDs, exact execution location, current/required behaviour, bounded change, dependencies, relevant tests, missing coverage, acceptance criteria and unresolved decisions.

Include baseline/final commits, authoritative amendments, evidence, release status and limitations. Order candidates by dependency and risk. Do not execute Plan 2 or prescribe unmeasured agent consolidation.

Proof: another planner can prepare Plan 2 without repeating the authority investigation.

## Completion

Every task requires evidence. All amendments must trace to resolved decisions; derived records must pass validation; independent review findings must be resolved or explicitly blocking. Remaining execution contradictions must have precise Plan 2 entries.

Finalize current status, completed work, unresolved work and next action in plan_results.md. A blocked review or unresolved required authority means Plan 1 is not complete.

Final chat response: short pointers to the absolute plan_results.md and plan_02_handoff.md paths plus concrete blockers. Return the whole folder including evidence.
