# M03 — Owner Control Plane

**Status**: Initial Step 2 module plan  
**Runtime owner**: Vercel / GitHub  
**Validation location**: Vercel and GitHub checks  

## Responsibility

Own owner-only admin routes, owner auth, Product Vault, Affiliate Link Vault, compliance profiles, manual review queues, and admin UI surfaces.

Detailed UI/UX workflow requirements are defined in `build-pack/build-plans/02-ui-ux-build-plan.md`.

## Scope

- `src/app/admin/*`
- `src/app/api/admin/*`
- `src/lib/hermes/auth.ts`
- `src/lib/compliance/*`
- Owner-only auth/session helpers when implemented

## Task Mapping

- `T04` — Owner and Hermes auth strategy.
- `T05` — Product and affiliate vaults.
- `T06` — Compliance profiles and manual review.

## Validation

- GitHub source checks.
- Vercel hosted build/deploy checks.
- Auth and admin route validation through hosted/preview environment.
- No local app install/build/typecheck.

## Dependencies

- Upstream: M02 database access foundation.
- Downstream: offer intelligence, page publishing, tracking.
