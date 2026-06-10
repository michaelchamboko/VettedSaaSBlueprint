# Task T00 — Step 1 Decision Ledger

## Context Baseline

- `build-pack/01-prd-review-checklist.md`
- `build-pack/02-build-brief.md`

## Must-Haves

- Operator confirmed Oracle Autonomous Database as system of record on 2026-06-10.
- Operator confirmed single-owner personal marketing tool direction on 2026-06-10.
- Operator approved custom owner-only auth with separate Hermes bearer token on 2026-06-10.
- Operator confirmed AI provider boundary on 2026-06-10.
- Operator confirmed Scrapling runtime shape on 2026-06-10.
- Operator approved manual-only PartnerStack intake for MVP on 2026-06-10.
- Operator confirmed existing Oracle Hermes/MiniMax environment on 2026-06-10.
- Operator approved Offer Intelligence Folder and purchase destination review on 2026-06-10.
- Operator approved minimal first-party consent/tracking model on 2026-06-10.

## Target Artifacts

- Updated `build-pack/01-prd-review-checklist.md`
- Updated `build-pack/03-implementation-contract.md`

## Verification Command

```powershell
rg -n "Open Decisions|TBD|Authentication provider|Consent model|PartnerStack API scope" build-pack -g "!**/T00-resolve-step-1-decisions.md"
```

Expected: no active product-direction blockers remain.
