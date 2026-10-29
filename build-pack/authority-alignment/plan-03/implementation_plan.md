# Implementation plan

## Objective

Measure which current boundaries provide distinct authority, permission, isolation, or independent-verification value, and which duplicate main-loop work. Produce the terminal boundary decision for this review.

## Boundaries

- The main loop remains accountable for authority, implementation, verification, release, and durable evidence.
- Independent current-head review may remain separate where context or verification independence is demonstrated.
- Neon is a data and impact-analysis boundary, not an agent.
- BuildRunner is durable lifecycle state, not an agent.
- No consolidation or execution-surface changes are authorized in this pass.

## Ordered tasks

### T01 — Establish evidence baseline

Read `AGENTS.md`, `planning.md`, RTK instructions, Plan 1 records, Plan 2 records, and applicable skills. Record the fresh branch, baseline SHA, repository status, merged Plan 2 SHA, production receipt, and evidence limits.

### T02 — Inventory actual boundaries

Inspect executable agents, reviewers, skills, tools, workflow state, prompts, permissions, handoffs, and release adapters. For each, record exact paths, inputs, outputs, authority, permissions, consumers, and whether it is executable, progressive-disclosure guidance, external tooling, or durable state.

### T03 — Reconstruct observed behaviour

Use retained Git history, review records, test logs, deployment receipts, and Plan 1/2 ledgers to record duplicate work, evidence loss, retries, review invalidation, and isolation value. Link every observation to retained evidence.

### T04 — Score value and cost

For each boundary record authority separation, independent-review value, evidence-loss risk, operational complexity, and rollback difficulty. Use only observed evidence. Define the retained-boundary decision before applying it.

### T05 — Evaluate counterfactuals

For each candidate, compare retain-as-reviewer, fold into main loop, replace with skill, replace with tool, and retain-as-state. Test preservation of authority, permissions, review, release gates, evidence continuity, retries, idempotency, and rollback. Do not edit execution surfaces.

Record the comparison in `counterfactual_analysis.md`.

### T06 — Independent review

Submit the complete evidence index, matrix, scorecard, and decisions for independent review. Record disagreements and resolve them or carry them forward explicitly.

### T07 — Terminal closeout

Record the retained-boundary decision, reconcile the live status and next action, and close the evidence packet. This is the terminal plan; do not create another plan or implementation handoff.

## Success criteria

- Every claimed boundary is backed by a source path and raw observation.
- Every decision uses an explicit rule and states any evidence limitation without leaving the disposition unresolved.
- Counterfactuals preserve authority, permissions, review, release, and evidence safeguards.
- Independent review is recorded against the exact evidence packet.
- The repository has a terminal Plan 3 decision and no further plan is created.
