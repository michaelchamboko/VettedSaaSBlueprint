# Plan 4 handoff

Plan 4 implementation may begin with a bounded path-discovery task for P4-002 after owner authorization. Consolidation decisions remain blocked until telemetry measurements exist and are independently reviewed.

## Disposition P4-001 — No reviewer-policy implementation candidate

- Evidence: H-004; `AGENTS.md` build-faster workflow; `.agents/skills/code-review/SKILL.md` lines 4–56.
- Current behaviour: Current guidance already requires Codex current-head review and rejects requiring an external review service; Greptile appears only in historical Plan 2 evidence.
- Required behaviour: Preserve the current Codex policy. Do not add a test or runtime path for Greptile because no active consumer accepts it as the controlling gate.
- Permission impact: None.
- Migration/rollback: None; this is a closed finding, not an implementation task.
- Tests and evidence to recollect: If a future release adapter changes reviewer handling, inspect that exact adapter and its regression tests before proposing a bounded amendment.
- Acceptance: No Plan 4 code change is required for this finding; active guidance remains internally consistent.

## Candidate P4-002 — Add boundary telemetry

- Evidence: E-007 and H-003.
- Current behaviour: transcripts, tool timelines, context pressure, retries, and handoff latency are not retained in the repository.
- Required behaviour: retain privacy-safe event timestamps, boundary IDs, retry counts, and review/deployment identities for future measurement.
- Exact files/symbols: first task must run `rg --files scripts build-pack .agents | rg -i 'telemetry|event|receipt|ledger'` and record the selected producer path and symbol in the Plan 4 ledger. If no producer exists, propose `scripts/record-boundary-event.mjs` and `build-pack/authority-alignment/plan-04/telemetry-schema.md` as the smallest new paths for owner approval; do not create them during discovery.
- Permission impact: must not grant new product, publication, database, or release authority.
- Migration/rollback: additive evidence-only record; rollback is deletion of only records created by the new producer, with no runtime behaviour change.
- Existing tests: `npm run verify:agent-workflow`; discovery must also identify the nearest existing receipt/ledger test path. If none exists, propose `tests/boundary-telemetry.test.ts` for owner approval; do not claim coverage before it exists.
- Evidence to recollect: event counts, retry counts, boundary IDs, elapsed intervals, and context-pressure measurements from at least one complete workflow.
- Acceptance: discovery records one exact approved producer path, one exact test path, their permissions, and rollback; later implementation is separately authorized and a subsequent boundary audit can calculate cost and context-pressure metrics without relying on summaries.

## Candidate P4-003 — Improve handoff discoverability

- Evidence: H-001.
- Current behaviour: append-only history can contain stale blockers before later corrections.
- Required behaviour: current status, blockers, and next action remain machine- and human-discoverable without deleting history.
- Exact files/symbols: first task must locate the canonical packet template or validator with `rg --files build-pack .agents/templates | rg -i 'plan|packet|ledger|result|handoff'`. If none exists, propose `build-pack/authority-alignment/packet-template.md` and `scripts/verify-authority-packet.mjs` as the smallest new paths for owner approval; do not create them during discovery.
- Permission impact: documentation-only; no authority or runtime permissions change.
- Migration/rollback: additive template/index change; rollback restores the prior template without deleting historical ledger entries.
- Existing tests: packet consistency check and `npm run verify:agent-workflow`; discovery must identify the exact validator/test path or record that no validator exists and propose `tests/authority-packet.test.ts` for approval.
- Evidence to recollect: a fresh-reader walkthrough showing current state can be identified without scanning historical entries.
- Acceptance: discovery records one exact template/validator path and one test path; later implementation proves an independent reader identifies current state and exact next action from the top-level summary and ledger index.

No candidate authorizes schedules, autonomous publication, product features, or agent creation.
