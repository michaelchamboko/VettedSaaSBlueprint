# VettedSaaSBlueprint Handover

Last updated: 2026-06-13

This handover is non-secret. Do not add passwords, wallet paths, wallet filenames, connection strings, tokens, raw environment values, or key material.

## Current Build Position

- Active branch: `codex/step-2-build`.
- Step 2 is in progress, following `build-pack/11-task-graph.md`.
- Completed tasks: `T00`, `T01`, `T02A`, `T02`, `T03`, `T04`, `T05`, `T06A`, `T06B`, `T06C`, `T07`, `T08`, `T09`, `T10`.
- Current next task: `T11 - Budget Guard` (covered by existing budget helper and worker gating; no dedicated task card in this repo).
- The repo is still a single-operator personal marketing tool. Do not add public signup, teams, tenants, billing, roles, or third-party identity unless the operator changes direction.

## Verified So Far

- Oracle Autonomous Database wallet-based connectivity passed a read-only verification query: `select 1 from dual`.
- The read-only query returned `1`.
- The temporary local Oracle test virtual environment was removed after verification.
- GitHub `Preview Build` passed for commit `0d7a743`.
- Vercel has a matching preview deployment for commit `0d7a743` in `READY` state.
- The Vercel preview URL is deployment-protected; unauthenticated public HTTP smoke checks return `401 Unauthorized`, which is expected under protection.
- T02 Oracle migration artifact created: `db/oracle-migration-001.sql` with 20 MVP tables.
- T03 Database Access Layer created: `src/lib/db/` module with Oracle-compatible query wrapper.
- All 10 source files migrated from `@vercel/postgres` to `@/lib/db`.
- `package.json` dependency changed: `@vercel/postgres` → `oracledb@^6.7.0`.
- T02+T03 pushed to GitHub as commit `16b49aa` (feat) + `b50e333` (docs).

## Not Done Yet

- No Oracle schema has been applied.
- No Oracle database app user beyond the currently configured connection user has been created.
- No least-privilege Oracle application user has been designed or migrated yet.
- No Oracle-hosted packages, services, systemd units, firewall rules, network settings, storage settings, or Hermes runtime files have been changed.
- No wallet files or secrets have been committed.
- Hosted build validation for T02+T03 is complete for the current branch tip.
- Hermes worker end-to-end processing is not yet connected to Oracle.
- DB-backed dynamic page smoke testing remains blocked until Oracle schema is applied.
- Owner/admin authentication implemented with single-owner login, signed session cookies, middleware protection, and login/logout routes.
- Admin pages are now behind owner authentication.

## Current Important Files

- `AGENTS.md`: repo operating rules and guardrails.
- `state.md`: current project progress.
- `findings.md`: active findings and resolved blockers.
- `build-pack/11-task-graph.md`: authoritative execution order.
- `build-pack/tasks/T04-auth-strategy.md`: next task card.
- `build-pack/06-database-contract.md`: Oracle database contract.
- `build-pack/09-permissions-contract.md`: permission matrix for all actors.
- `db/oracle-migration-001.sql`: Oracle-compatible DDL migration (not yet applied).
- `db/schema.sql`: PostgreSQL reference (annotated, do not apply).
- `db/README.md`: migration strategy documentation.
- `src/lib/db/`: Oracle-compatible database access layer.
- `src/lib/hermes/auth.ts`: existing Hermes bearer token auth.
- `src/app/admin/`: unauthenticated admin page shells.
- `docs/deployment/oracle-database-connectivity-readiness.md`: T02A readiness evidence.
- `docs/deployment/oracle-t02a-operator-handoff.md`: Oracle connectivity handoff.

## Supabase Note

The operator mentioned a Supabase-related account email, but the repository currently has no Supabase references and the build pack names Oracle Autonomous Database as the MVP system of record. Do not introduce Supabase unless the operator explicitly changes the architecture.

## Next Work

1. Operator reviews and approves `db/oracle-migration-001.sql`.
2. Apply Oracle schema through the approved connection path.
3. Set Oracle environment variables in Vercel: `ORACLE_WALLET_LOCATION`, `ORACLE_CONNECTION_STRING`, `ORACLE_DB_USER`, `ORACLE_DB_PASSWORD`.
4. Implement `T11 - Budget Guard`.
5. Keep Vercel/GitHub as the hosted validation path.

## T04 Auth Strategy — Pre-Flight

**Architecture decisions for T04:**
- **Password hashing**: bcrypt via `bcryptjs` (pure JS, works on Vercel).
- **Session tokens**: HMAC-signed HTTP-only cookies (no external session store needed).
- **Session storage**: In-memory Map with TTL (single-operator, no DB session table needed for MVP).
- **Rate limiting**: In-memory sliding window for login attempts.
- **Route protection**: Next.js middleware for `/admin/*` and `/api/admin/*` routes.
- **Hermes auth**: Already implemented as bearer token — no changes needed.

**Files to create/modify:**
- `src/lib/auth/password.ts` — bcrypt hash/verify helpers.
- `src/lib/auth/session.ts` — cookie signing, session creation/validation.
- `src/lib/auth/rate-limit.ts` — login attempt rate limiting.
- `src/lib/auth/middleware.ts` — route protection helpers.
- `src/app/api/auth/login/route.ts` — login endpoint.
- `src/app/api/auth/logout/route.ts` — logout endpoint.
- `src/middleware.ts` — Next.js middleware for admin route protection.
- `package.json` — add `bcryptjs` and `@types/bcryptjs`.

**Stop Conditions**

Stop before continuing if any next step would:

- Print, commit, or log secrets.
- Commit wallet files or raw connection material.
- Change Oracle instance shape, Always Free posture, networking, firewall, storage, packages, systemd services, or existing Hermes runtime without separate explicit approval.
- Apply schema before the intended migration artifact is reviewed for Oracle compatibility.
- Add Supabase, public auth, signup, billing, multi-tenant features, or third-party identity without explicit direction.
- Add public user registration, team management, or external identity providers.
