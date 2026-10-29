# Permission and authority matrix

| Boundary ID | Can decide product/source policy? | Can mutate code or instructions? | Can mutate external state? | Independent of implementer? | Evidence |
|---|---:|---:|---:|---:|---|
| B-01 Main loop | No; must cite owner/source authority | Yes, within approved scope | Via approved release adapters | No | `AGENTS.md`; `planning.md` |
| B-02 Current-head reviewer | No | Findings only; no implementation authority | No merge authority inferred | Yes by design | `AGENTS.md`; `.agents/skills/code-review/SKILL.md`; Greptile Plan 2 receipt |
| B-03 Skills | No | Guidance only unless invoked by main loop | No | No | Skill files |
| B-04 Neon evidence tool | No; evidence cannot override sources | No | Database reads/writes only through explicit authenticated operations | No | `AGENTS.md`; Plan 2 Neon records |
| B-05 BuildRunner state | No | Stores lifecycle state | No autonomous publication authority | N/A | `planning.md`; execution-state contract |
| B-06 Handoff packet | No | Records evidence and proposed next work | No | N/A | Plan 1/2 packets |
| B-07 Release adapters | No | No source-policy authority | Yes, authenticated merge/deploy | No | GitHub/Vercel receipts and `AGENTS.md` |

No permission boundary is being changed in Plan 3. No quantitative performance claim is required for the terminal decision.
