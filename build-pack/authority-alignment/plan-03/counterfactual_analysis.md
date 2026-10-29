# Counterfactual boundary analysis

| Boundary | Smallest alternative | Safeguards that must remain | Evidence result | Decision |
|---|---|---|---|---|
| B-02 independent review | Fold review into the main loop | Immutable-head review, context independence, current-head invalidation, no implementer self-approval | Plan 2 proves independent review value; cost telemetry absent | Retain until a provider-neutral equivalent is accepted |
| B-03 skills | Fold guidance into main loop or expose through tools | Source traceability, required sequence, no new authority | Skills contain progressive-disclosure guidance and no release permissions | Prefer skill/tool; no agent justified |
| B-04 Neon evidence | Main loop queries database directly | Authenticated endpoint binding, source authority remains above rows, bounded queries | Plan 2 proves Neon operational value and cleanup | Retain as tool/data boundary |
| B-05 BuildRunner state | Main loop stores state in ad hoc notes | Durable lifecycle identity, recovery, no publication authority | Planning explicitly defines durable state | Retain as state, not agent |
| B-06 handoff packet | Main loop carries all context in one session | Append-only evidence, exact next action, reproducibility after interruption | H-001 shows discoverability risk but no proof of packet redundancy | Retain and improve indexing only if approved |
| B-07 release adapter | Main loop performs raw external mutations | Authenticated adapter, reviewed SHA binding, deployment receipt, rollback | Plan 2 merge and Vercel receipt demonstrate the boundary | Retain as adapter |

No alternative is approved for implementation in Plan 3. A counterfactual is acceptable only if it preserves every listed safeguard and has evidence for lower cost or lower duplication.
