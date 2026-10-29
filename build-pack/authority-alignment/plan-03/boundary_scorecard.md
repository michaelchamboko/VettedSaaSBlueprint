# Boundary scorecard

## Decision rules

- Retain a separate boundary only when it has demonstrated distinct permission, authority, or independent-verification value that the main loop cannot provide without weakening a gate.
- Fold a boundary only when the counterfactual preserves authority, review independence, release safeguards, and evidence continuity, and measured cost or duplication is non-trivial.
- The terminal decision is based on observed authority and verification value; no quantitative performance claim is required.

| Boundary ID | Authority / permission value | Independent verification value | Decision-cost factor | Duplicate-work cost | Latency / operational cost | Rollback difficulty | Current disposition |
|---|---|---|---|---|---|---|---|
| B-01 Main loop | HIGH — source and release accountability | LOW — implementer context | Not used for terminal decision | Not used for terminal decision | Not used for terminal decision | HIGH | Retain |
| B-02 Current-head review | Distinct verification boundary observed | HIGH — separate reviewer and immutable head | Not used for terminal decision | LOW — rerun after changed head is a safeguard | Not used for terminal decision | MEDIUM | Retain |
| B-03 Progressive-disclosure skills | LOW — no independent authority | LOW | Not used for terminal decision | Not used for terminal decision | LOW | LOW | Retain as skills; no agent required |
| B-04 Neon evidence tool | MEDIUM operational access; no policy authority | MEDIUM evidence reproducibility | Not used for terminal decision | Not used for terminal decision | Not used for terminal decision | HIGH for production writes | Retain as tool/data boundary |
| B-05 BuildRunner state | LOW policy authority; durable state only | LOW | Not used for terminal decision | Not used for terminal decision | Not used for terminal decision | MEDIUM | Retain as state, not agent |
| B-06 Handoff packet | LOW authority; high traceability value | MEDIUM reproducible evidence handoff | Not used for terminal decision | H-001 observed discoverability risk | Not used for terminal decision | LOW | Retain |
| B-07 Release adapters | HIGH external mutation permission, constrained by gates | LOW | Not used for terminal decision | LOW | Not used for terminal decision | HIGH | Retain as authenticated adapter |

These are final evidence classifications, not a mandate to modify any boundary.
