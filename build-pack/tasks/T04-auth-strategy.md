# Task T04 — Owner and Hermes Auth Strategy

## Context Baseline

- `build-pack/07-api-contract.md`
- `build-pack/09-permissions-contract.md`

## Must-Haves

- Implement selected single-owner auth mechanism.
- Protect owner/admin APIs and owner/admin pages.
- Keep Hermes token auth separate from admin auth.
- Do not implement public signup, teams, roles, tenants, or external identity provider integration for MVP.

## Target Artifacts

- Owner auth helpers for password verification, secure HTTP-only session cookies, session expiry, login rate limiting, and audit logging.
- Protected route/API checks.
- Tests for unauthorized access.

## Verification Command

```powershell
npm run typecheck
npm test
```

Expected: auth tests pass and typecheck exits 0.
