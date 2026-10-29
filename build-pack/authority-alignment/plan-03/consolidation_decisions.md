# Consolidation decisions

## Current decisions

1. Retain one accountable main loop. The authority contract is explicit and no evidence supports delegating product, source, implementation, verification, or release accountability.
2. Retain independent current-head review. Plan 2 demonstrates a real review rerun after the candidate head changed; this is a verification boundary, not duplicated implementation.
3. Do not create a repository-intelligence agent. Neon is an evidence and impact-analysis tool, and BuildRunner is durable state.
4. Prefer skills and tools over permanent subagents where no distinct permissions or independent-verification value is demonstrated.
5. Treat Codex current-head review as the controlling policy. Plan 2’s Greptile use is historical execution evidence and a deviation to record, not a competing authority or an unresolved owner decision.

## Not yet decided

- Whether skills measurably reduce context pressure compared with a separate agent.
- Whether handoff packet indexing should change.

These remain open because the repository lacks raw session timelines, invocation counts, latency, and context-pressure telemetry.
