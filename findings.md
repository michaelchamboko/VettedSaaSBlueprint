# Findings

## Active Findings

### F-001: Local dependency install was attempted in error and must not be continued

`npm ci` cannot run because `package-lock.json` is out of sync with `package.json`. `npm install` was attempted with network approval but timed out twice, leaving local dependency setup incomplete. This was the wrong validation path for this project.

Impact: local dependency state is not trustworthy and must not be used as a readiness signal. Vercel/GitHub should perform hosted app install/build validation from the repository.

Update: a GitHub-hosted `Preview Build` workflow now runs `npm ci` and `npm run build` for branch validation; local installs remain out of scope by default.

### F-002: Oracle database connectivity readiness verified

The Step 1 read-only review found no Oracle DB client/driver/wallet/env setup for the approved Autonomous Database path.

Impact: schema migration and DB-connected Hermes work were blocked until `T02A` succeeded.

Resolution: wallet-based Oracle Autonomous Database connectivity was verified with read-only `select 1 from dual`. No schema was applied, no Oracle-hosted client tooling was installed, and the temporary local test virtual environment was removed after verification.

Next action: proceed to `T02` schema migration planning and execution using the approved connection path, with separate approval before any Oracle-hosted runtime or Hermes dependency changes.

### F-003: Task graph and task-card numbering differ

`build-pack/11-task-graph.md` describes tasks through `T20`, while `build-pack/tasks/` currently stops at `T10` and groups later graph work into broader cards.

Impact: not a product-direction blocker, but later Step 2 execution may need task-card splitting before implementation to satisfy the pack's task sizing rule.

Next action: split or supplement task cards before starting grouped high-blast-radius work.

### F-006: T02 Oracle migration artifact created and applied

`db/oracle-migration-001.sql` contains Oracle-compatible DDL for 20 MVP tables with proper constraints, foreign keys, and indexes. The PostgreSQL reference `db/schema.sql` is annotated to indicate it should not be applied to Oracle.

Impact: the reviewed migration artifact is now the live Oracle schema baseline for the MVP tables through the approved connection path.

Status: initial artifact pushed as commit `16b49aa`; operator approval has been granted and the schema now applies successfully to the live Oracle Autonomous Database service.

Next action: keep rollback notes and downstream runtime validation aligned with this schema baseline.

### F-007: T03 Database Access Layer complete — hosted build validation recorded

`src/lib/db/` module created with Oracle-compatible database access layer. All 10 source files migrated from `@vercel/postgres` to `@/lib/db`. `package.json` dependency changed from `@vercel/postgres` to `oracledb@^6.7.0`.

Impact: the app no longer depends on `@vercel/postgres`. GitHub/Vercel hosted build validation confirms the branch builds in the deployment pipeline, while DB-backed runtime behavior still depends on Oracle runtime validation.

Status: pushed across commits `16b49aa` through `a5e00be`. Latest `Preview Build` workflow passed successfully.

Remaining risks:
1. `oracledb` thin mode may not support all Oracle features used in queries (e.g., `FOR UPDATE SKIP LOCKED`).
2. `returning *` clause behavior may differ between PostgreSQL and Oracle for complex inserts.
3. The `::text[]` to JSON conversion in the products route may need runtime validation.

### F-008: T04 auth strategy — no owner authentication exists

Admin routes (`/api/admin/*`) and admin pages (`/admin/*`) were previously unauthenticated. The permissions contract requires single-owner password auth with session cookies.

Impact: any visitor could previously access admin APIs and pages. This was resolved by the owner-session middleware and login/logout routes on commit `1a03e3e`.

Status: resolved on commit `1a03e3e`.

### F-009: Pre-ship evidence gaps remain after core implementation

The repository now has enough evidence to mark operator review, hosted build success, Oracle schema application, manual approval gating, PartnerStack link preservation, repo hygiene, and documentation upkeep as complete in `build-pack/15-pre-ship-checklist.md`.

Impact: release readiness is still blocked on proof gaps, not on missing core implementation. The unchecked items still require explicit evidence for automated test execution, API contract coverage, disclosure-failure verification, high-risk claim verification, unknown program-rule publication blocking, audit-log verification, rollback review, secret configuration, and explicit Step 2 task-card approval. Hermes route contract is now verified for auth/method behavior; public-page render and build/runtime availability are now also confirmed.

Next action: collect or record the missing validation evidence through the approved GitHub, Vercel, and Oracle runtime paths before treating the pre-ship checklist as complete.

### F-010: Runtime validation partially blocked by missing production secrets

The live production alias `https://vetted-saa-s-blueprint.vercel.app` resolves to deployment `https://vetted-saa-s-blueprint-esed4x4lm-michaelchamboko-gravityclaw.vercel.app` (`dpl_KZWG5jes8N5CBbHF4Y1WKvbqwdw3`).

`vercel inspect dpl_KZWG5jes8N5CBbHF4Y1WKvbqwdw3 --logs` shows this deployment passes build and typecheck and has the route map for the current workspace tree.

Bypassed runtime probes against this deployment now return:

- `/` => `200`
- `/admin/login` => `200`
- `/api/hermes/jobs/claim` => `401` (POST), `405` (GET)
- `/api/hermes/jobs/123/complete` => `401` (POST), `405` (GET)
- `/api/events/page-view` => `500` due missing Oracle env in runtime

Impact: the deployment is current, but DB-backed event tracking and Hermes job state workflows cannot be fully validated until Oracle Vercel environment variables are configured.

Status: partially resolved; remaining runtime gap is production secret wiring for Oracle connectivity.

Next action: configure Oracle env vars on Vercel and re-run Hermes+tracking endpoint smoke probes with valid auth/fixtures.

## Resolved Findings

### F-004: Existing scaffold contained Postgres-specific app code — resolved

All `@vercel/postgres` imports have been replaced with `@/lib/db` (T03). The `package.json` dependency has been changed from `@vercel/postgres` to `oracledb@^6.7.0`.

Resolution: commit `16b49aa`.

### F-005: Zod latest API mismatch — resolved

`z.record(z.any())` replaced with `z.record(z.string(), z.any())` for Zod 4 compatibility. Hosted build validation covered by `Preview Build` workflow.

