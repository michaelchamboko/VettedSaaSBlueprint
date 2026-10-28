# Stable Identity Record — D02 section 3.2

## Resolution

- Stable UID: `D02-S-0951e69fb4b0`
- Stable heading: `3.2 Daily shipping rule`
- Amended meaning: the obligation applied during the completed build phase;
  subsequent releases require an explicit manual or API trigger.
- Reason: the policy changed in the section body. Renaming the heading was not
  required and created avoidable identifier churn.
- Controlling authority: owner directive 2026-10-28, `planning.md`, and
  `AGENTS.md`.

## Consumers

The original stable UID remains current in the document inventory, canonical
graph, GitNexus bridge, build-pack source manifest, requirements ledger,
phase map, and historical task record. `D02-S-e9102f3d6d0a` identifies the
abandoned intermediate heading and is retained only in Plan 1 audit evidence.

## Verification

- The registered-source and build-pack projection producers were rerun.
- All active D02-H006 consumers resolve to `D02-S-0951e69fb4b0`.
- Source text and requirement statements contain the amended build-phase and
  on-demand meaning.
- No active identifier migration is required.

## Historical evidence

`evidence/A0030-uid-old-search.txt` and `evidence/A0031-uid-new-search.txt`
record the superseded intermediate candidate. They are historical observations,
not the final identity state.
