# ADR-0001 Use one primary agent by default

- **Status** Accepted in the source strategy (ADR-08-001)
- **Decision date** Unknown
- **Deciders** Unrecorded in the source entry

## Context

The research system needed a default for assigning agent work. Splitting work across agents adds coordination, consumes tokens, and creates handoffs where work can fail.

## Decision

Use one primary agent by default. The strategy gives more weight to keeping work traceable and reducing handoff failures than to running more work in parallel.

## Alternatives considered

Multiple autonomous agents could work concurrently. The strategy reserves that choice for a workload where measurements justify the extra coordination and debugging.

## Consequences

The default limits autonomous parallel execution. Revisit it when measurements of workload, concurrency, isolation, or reliability show a material advantage for multiple agents.

**Inference about reversal cost.** Moving to multiple agents would require defining which agent owns each task and how to diagnose a failed handoff.

## Evidence

Document 8, §37 “Architecture Decision Log”, entry “ADR-08-001 — Single primary agent”, stable ID `D08-S-6fb14f5203e3`. [Original decision and revisit criteria](../Vetted-SaaS-Blueprint-08-Knowledge-Acquisition-and-Research-Operations.md#adr-08-001--single-primary-agent)
