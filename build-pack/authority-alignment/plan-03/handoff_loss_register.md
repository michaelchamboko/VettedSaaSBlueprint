# Handoff-loss register

Record only observed evidence loss, duplicated work, contradictory authority, retry amplification, or context pressure. Unknown remains unknown.

| Finding ID | Observation | Raw evidence | Classification | Consequence | Status |
|---|---|---|---|---|---|
| H-001 | Plan 2 results contain historical blocked entries followed by a corrected current summary | `build-pack/authority-alignment/plan-02/implementation_results.md` A0001–A0009 | Evidence discoverability risk | A reader could repeat completed Neon work without reading the full ledger | Observed; corrected in Plan 2, retained as a measurement input |
| H-002 | Plan 2 required a new review after the head changed | Greptile review IDs `36526354` (`361a558`) and `36529676` (`fb97304`), retained in `evidence/plan2-release-receipt.md` | Correct current-head invalidation | Review evidence must follow immutable head identity | Observed from connected review records; provider payloads are not locally retained |
| H-003 | Raw conversational/tool timeline is not stored in the repository | `evidence_index.md` E-007; repository file inventory | Missing telemetry | Context pressure, handoff latency, and retry cost cannot be quantified | Open data gap |
| H-004 | Plan 2 used Greptile even though current repository guidance requires Codex review and rejects requiring an external review service | `.agents/skills/code-review/SKILL.md` lines 12, 29–56; Plan 2 review receipt | Historical execution deviation, not unresolved authority | Historical receipt must not be reused as the controlling reviewer policy | Resolved by current `AGENTS.md` and code-review skill; no Plan 3 execution edit |
