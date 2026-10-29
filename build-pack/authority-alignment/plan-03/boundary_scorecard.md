# Boundary scorecard

## Decision rules

- Retain a separate boundary only when it has demonstrated distinct permission, authority, or independent-verification value that the main loop cannot provide without weakening a gate.
- Fold a boundary only when the counterfactual preserves authority, review independence, release safeguards, and evidence continuity, and measured cost or duplication is non-trivial.
- A missing measurement is `UNKNOWN`, not zero. Unknowns block a consolidation recommendation when the decision could weaken safety or independence.

| Boundary ID | Authority / permission value | Independent verification value | Context-pressure reduction | Duplicate-work cost | Latency / operational cost | Rollback difficulty | Current disposition |
|---|---|---|---|---|---|---|---|
| B-01 Main loop | HIGH — source and release accountability | LOW — implementer context | UNKNOWN | UNKNOWN | UNKNOWN | HIGH | Retain |
| B-02 Current-head review | UNKNOWN for numeric reduction; distinct review context observed | HIGH — separate reviewer and immutable head | UNKNOWN | LOW — rerun required after changed head is a safeguard | UNKNOWN | MEDIUM | Retain pending cost data |
| B-03 Progressive-disclosure skills | LOW — no independent authority | LOW | UNKNOWN | UNKNOWN | LOW | LOW | Prefer skill/tool over agent; no implementation decision yet |
| B-04 Neon evidence tool | MEDIUM operational access; no policy authority | MEDIUM evidence reproducibility | UNKNOWN | UNKNOWN | UNKNOWN | HIGH for production writes | Retain as tool/data boundary |
| B-05 BuildRunner state | LOW policy authority; durable state only | LOW | UNKNOWN | UNKNOWN | UNKNOWN | MEDIUM | Retain as state, not agent |
| B-06 Handoff packet | LOW authority; high traceability value | MEDIUM reproducible evidence handoff | UNKNOWN | H-001 observed discoverability risk | UNKNOWN | LOW | Retain, improve indexing later if approved |
| B-07 Release adapters | HIGH external mutation permission, constrained by gates | LOW | UNKNOWN | LOW | UNKNOWN | HIGH | Retain as authenticated adapter |

These are evidence classifications, not a mandate to modify any boundary. Numeric context and latency fields remain unknown because raw session telemetry is not stored.
