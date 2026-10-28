# Consumer Trace — Plan 1 Source Amendments

## Proven producer and consumer chain

| Record | Producer | Current consumer | Plan 1 disposition |
|---|---|---|---|
| `docs/document-intelligence/SOURCE_MANIFEST.json` | `build-document-inventory.ps1` | relationship, graph, bridge, intake producers | Regenerated from 12 registered sources |
| `build-pack/source-manifest.json` | source-manifest functions in `generate-globalsetup-intake.py` | BuildRunner context and candidate digest | Reconciled from current inventory |
| `build-pack/requirements.json` | requirement functions in `generate-globalsetup-intake.py`; execution fields maintained by `prepare-vetted-execution-state.mjs` | execution-state preparation and BuildRunner | Source fields reconciled; execution fields preserved |
| `build-pack/requirements-phase-map.json` | execution-state preparation; bounded source reconciliation | execution traceability | Source evidence refreshed; task, disposition, and acceptance identifiers preserved |
| `build-pack/execution-state.json` | `prepare-vetted-execution-state.mjs` | BuildRunner | Unchanged; Plan 1 did not rewrite release state |

## Bounded reconciliation

`scripts/reconcile-build-pack-source-projections.py` reuses the existing intake
producer functions. It updates only source-projected fields and preserves
status, tasks, acceptance identifiers, Phase One authorization, phase-map
dispositions, receipts, capabilities, and execution state. It has separate
`--check` and `--write` modes and fails on ambiguous identities or unexplained
requirement removal.

The final reconciliation contains 799 requirements. The explicitly retired
D03 watchdog and D04 scheduled-optimisation requirements keep their
`owner-retired` disposition while their statements now quote the current
retirement text. The unrelated D05 requirement remains present because its
source section and hash are unchanged.

## Stable identity

D02-H006 retains `D02-S-0951e69fb4b0`. The temporary renamed-heading UID
`D02-S-e9102f3d6d0a` is not an active source identity. Active producers and
consumers agree on the original UID.

## Verification

- A pre-write check reported all three source projections stale.
- Write mode reconciled them without changing execution state.
- A subsequent check reported `stale: []`.
- Focused tests prove execution fields survive reconciliation and current
  retired source text replaces obsolete active statements.
