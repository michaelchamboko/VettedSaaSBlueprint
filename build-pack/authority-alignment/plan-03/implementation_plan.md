# Implementation plan

## Objective

Measure which current boundaries provide distinct authority, permission, isolation, or independent-verification value, and which duplicate main-loop work or merely compensate for context pressure. Produce decisions for a later, separately approved implementation.

## Boundaries

- The main loop remains accountable for authority, implementation, verification, release, and durable evidence.
- Independent current-head review may remain separate where context or verification independence is demonstrated.
- Neon is a data and impact-analysis boundary, not an agent.
- BuildRunner is durable lifecycle state, not an agent.
- No consolidation or execution-surface changes are authorized in this pass.

## Ordered tasks

### T01 — Establish evidence baseline

Read `AGENTS.md`, `planning.md`, RTK instructions, Plan 1 records, Plan 2 records, and applicable skills. Record the fresh branch, baseline SHA, repository status, merged Plan 2 SHA, production receipt, available telemetry, and data gaps.

### T02 — Inventory actual boundaries

Inspect executable agents, reviewers, skills, tools, workflow state, prompts, permissions, handoffs, and release adapters. For each, record exact paths, inputs, outputs, authority, permissions, consumers, and whether it is executable, progressive-disclosure guidance, external tooling, or durable state.

### T03 — Reconstruct observed behaviour

Use raw transcripts, tool timelines, Git history, review records, test logs, deployment receipts, and Plan 1/2 ledgers to record duplicate work, evidence loss, context pressure, retries, delays, and isolation value. Link every observation to raw evidence.

### T04 — Score value and cost

For each boundary record authority separation, independent-review value, error reduction, context reduction, latency, duplicate work, evidence-loss risk, operational complexity, and rollback difficulty. Use measured values or `UNKNOWN`; never invent telemetry. Define retention/consolidation thresholds before applying them.

### T05 — Evaluate counterfactuals

For each candidate, compare retain-as-reviewer, fold into main loop, replace with skill, replace with tool, and retain-as-state. Test preservation of authority, permissions, review, release gates, evidence continuity, retries, idempotency, and rollback. Do not edit execution surfaces.

Record the comparison in `counterfactual_analysis.md`.

### T06 — Independent review

Submit the complete evidence index, matrix, scorecard, and decisions for independent review. Record disagreements and resolve them or carry them forward explicitly.

### T07 — Terminal closeout

Record the retained-boundary decision, reconcile the live status and next action, and close the evidence packet. Do not create another plan or implementation handoff.

## Success criteria

- Every claimed boundary is backed by a source path and raw observation.
- Every decision uses an explicit rule and exposes missing data.
- Counterfactuals preserve authority, permissions, review, release, and evidence safeguards.
- Independent review is recorded against the exact evidence packet.
- The repository has a terminal Plan 3 decision and no further plan is created.
