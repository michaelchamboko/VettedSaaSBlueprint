# Task T03 — Database Access Layer

## Context Baseline

- `build-pack/06-database-contract.md`
- `build-pack/07-api-contract.md`

## Must-Haves

- Add lazy database initialization for Vercel build safety.
- Centralize query helpers and error mapping.
- Avoid module-scope client initialization that requires env vars during build.

## Target Artifacts

- `src/lib/db/*`
- Tests for missing env and basic query helper behavior.

## Verification Command

```powershell
npm run typecheck
```

Expected: typecheck exits 0 in Vercel/local validation environment.
