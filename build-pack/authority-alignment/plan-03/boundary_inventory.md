# Boundary inventory

Inventory status: final source-backed rows for the terminal boundary decision.

| Boundary ID | Kind | Exact source / consumer | Inputs and outputs | Authority / permissions | Evidence-backed interpretation | Terminal disposition |
|---|---|---|---|---|---|---|
| B-01 | Main execution loop | `AGENTS.md` workflow contract; `planning.md` authority sections | Source authority, implementation, checks, release receipts | Owns sequencing and final accountability | Explicitly retained as the single accountable loop | Retain; no additional measurement required |
| B-02 | Independent current-head review | `AGENTS.md` build-faster workflow; `.agents/skills/code-review/SKILL.md`; Plan 2 review receipt | Immutable candidate commit in; findings out | Review must be independent of implementation context; no merge authority inferred | Distinct verification boundary with demonstrated Plan 2 use | None required for terminal decision |
| B-03 | Progressive-disclosure skills | `.agents/skills/external-article-import/SKILL.md`; `.agents/skills/landing-page-production-orchestrator/SKILL.md` | Task context in; constrained guidance out | No independent release or product authority | Retain as skills; no permanent agent required | None required for terminal decision |
| B-04 | Evidence and impact tool boundary | `AGENTS.md` source-intelligence workflow; Neon schema references; `planning.md` Plan 2 | Committed snapshot and source digests in; bounded query/evidence out | Evidence only; cannot override source authority | Tool/data boundary, not an agent | Retain; no additional measurement required |
| B-05 | Durable lifecycle state | `planning.md` BuildRunner section; `build-pack/execution-state.json` | Packet state in; durable status out | Stores lifecycle state; no autonomous authority | State machine, not an agent | Retain as state; no additional measurement required |
| B-06 | Handoff packet boundary | `build-pack/authority-alignment/plan-01/`; `plan-02/`; this packet | Evidence and decisions in; terminal decision out | No new authority; preserves traceability | Durable evidence boundary intended to prevent lossy handoff | None required for terminal decision |
| B-07 | Release adapter boundary | GitHub/Vercel receipts and Plan 2 implementation records | Reviewed SHA and release request in; merge/deploy receipt out | Authenticated external mutation; constrained by reviewed head and gates | Operational permission boundary, not a reasoning agent | Retain as authenticated adapter; no additional measurement required |
