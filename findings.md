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

### F-006: T02 Oracle migration artifact created — awaiting operator approval

`db/oracle-migration-001.sql` contains Oracle-compatible DDL for 20 MVP tables with proper constraints, foreign keys, and indexes. The PostgreSQL reference `db/schema.sql` is annotated to indicate it should not be applied to Oracle.

Impact: schema is ready for operator review and approval before application through the approved Oracle connection path.

Status: pushed as commit `16b49aa`. Awaiting operator review.

Next action: operator reviews migration artifact, approves, and applies via Oracle connection path.

### F-007: T03 Database Access Layer complete — hosted build validation pending

`src/lib/db/` module created with Oracle-compatible database access layer. All 10 source files migrated from `@vercel/postgres` to `@/lib/db`. `package.json` dependency changed from `@vercel/postgres` to `oracledb@^6.7.0`.

Impact: the app no longer depends on `@vercel/postgres`. Hosted build validation via GitHub/Vercel confirmed the migration works in the deployment environment.

Status: pushed across commits `16b49aa` through `a5e00be`. Latest `Preview Build` workflow passed successfully.

Remaining risks:
1. `oracledb` thin mode may not support all Oracle features used in queries (e.g., `FOR UPDATE SKIP LOCKED`).
2. `returning *` clause behavior may differ between PostgreSQL and Oracle for complex inserts.
3. The `::text[]` to JSON conversion in the products route may need runtime validation.

### F-008: T04 auth strategy — no owner authentication exists

Admin routes (`/api/admin/*`) and admin pages (`/admin/*`) are currently unauthenticated. The permissions contract requires single-owner password auth with session cookies.

Impact: any visitor can currently access admin APIs and pages. This must be resolved before any production use.

Next action: implement T04 auth strategy with bcrypt password hashing, HTTP-only session cookies, rate limiting, and route protection.

## Resolved Findings

### F-004: Existing scaffold contained Postgres-specific app code — resolved

All `@vercel/postgres` imports have been replaced with `@/lib/db` (T03). The `package.json` dependency has been changed from `@vercel/postgres` to `oracledb@^6.7.0`.

Resolution: commit `16b49aa`.

### F-005: Zod latest API mismatch — resolved

`z.record(z.any())` replaced with `z.record(z.string(), z.any())` for Zod 4 compatibility. Hosted build validation covered by `Preview Build` workflow.
