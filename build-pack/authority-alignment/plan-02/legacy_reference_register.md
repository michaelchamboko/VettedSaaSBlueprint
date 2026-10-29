# Legacy reference register

## Search scope

Baseline: ccc2e1de3206f21b4e710fbc70c1e783079e0b69.

The audit covered tracked content and tracked paths, then separately searched active instructions, runtime code, tests, package scripts, and active execution-state records for retired schedules and recovery semantics.

| ID | Surface | Observation | Classification | Plan 2 action |
| --- | --- | --- | --- | --- |
| L-01 | Retired graph-provider token in tracked content | Direct case-insensitive Git search returned no matches | Removed | Keep the existing regression test |
| L-02 | Retired graph-provider token in tracked paths | Two tracked-path searches returned no matches | Removed | None |
| L-03 | docs/document-intelligence | Sources, manifest, canonical graph, inventory, relationship records, and verifiers remain | Intentional auditable input | Preserve; clarify that persistence/query ownership is Neon |
| L-04 | planning.md watchdog wording | Explicitly states the programme is retired | Current retirement authority | Preserve |
| L-05 | prepare-vetted-execution-state.mjs retired IDs | Names retired requirements so they remain unmapped | Historical traceability with active protection | Preserve and retain negative mapping tests |
| L-06 | authority closeout tests | Assert retired times and watchdog requirements cannot regain task mappings | Enforcement evidence | Preserve |
| L-07 | article-import heartbeat and resume-pending command | Can advance every pending import without a named run | Active prohibited execution semantic | Remove or replace with explicit named-run resume |
| L-08 | generated publication timestamp containing 20:00 | ISO timestamp, unrelated to the retired checkpoint | False positive | None |

## Coverage limit

This register covers the current repository tree. Git history is retained. Installed user-global skills and tools are outside repository ownership and were not deleted.
