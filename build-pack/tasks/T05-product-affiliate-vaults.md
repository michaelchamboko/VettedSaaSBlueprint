# Task T05 — Product and Affiliate Vaults

## Context Baseline

- `build-pack/06-database-contract.md`
- `build-pack/07-api-contract.md`
- `build-pack/08-ui-contract.md`

## Must-Haves

- Product CRUD supports required PRD fields.
- Affiliate Link Vault preserves original PartnerStack URLs.
- Link changes create audit or review records.

## Target Artifacts

- Admin APIs.
- Admin UI screens.
- Validation tests.

## Verification Command

```powershell
npm test -- product affiliate
```

Expected: product and affiliate vault tests pass.
