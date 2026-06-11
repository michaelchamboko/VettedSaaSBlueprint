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

### F-004: Existing scaffold still contains Postgres-specific app code

Several routes still import `@vercel/postgres`, and the product insert route passes arrays directly to the Postgres template tag. This conflicts with the approved Oracle MVP direction and is expected to be removed during the database access layer task.

Impact: the app is not yet aligned to Oracle access patterns and may fail hosted build/type validation until `T02`/`T03` convert the database layer.

Update: the product array type error was fixed so hosted Next.js build validation passes. The larger Oracle-alignment issue remains until `T02` artifact is complete and `T03` can proceed.

Runtime note: branch-preview smoke testing confirmed static routes can render through Vercel-authenticated fetch, while a sample DB-backed dynamic landing page returns a server error until the database path is connected and converted away from scaffold Postgres access.

### F-006: T02 Oracle migration artifact created but not yet applied

`db/oracle-migration-001.sql` contains Oracle-compatible DDL for all 21 MVP tables with proper constraints, foreign keys, and indexes. The PostgreSQL reference `db/schema.sql` is annotated to indicate it should not be applied to Oracle.

Impact: schema is ready for operator review and approval before application through the approved Oracle connection path.

Next action: operator reviews migration artifact, approves, and applies via Oracle connection path. Then proceed to T03 database access layer.

### F-007: T03 Database Access Layer complete — hosted build validation needed

`src/lib/db/` module created with Oracle-compatible database access layer. All 10 source files migrated from `@vercel/postgres` to `@/lib/db`. `package.json` dependency changed from `@vercel/postgres` to `oracledb@^6.7.0`.

Impact: the app no longer depends on `@vercel/postgres`. Hosted build validation via GitHub/Vercel is required to confirm the migration works in the deployment environment.

Remaining risks:
1. `oracledb` thin mode may not support all Oracle features used in queries (e.g., `FOR UPDATE SKIP LOCKED`).
2. `returning *` clause behavior may differ between PostgreSQL and Oracle for complex inserts.
3. The `::text[]` to JSON conversion in the products route may need runtime validation.

Next action: push to GitHub, let Vercel `Preview Build` workflow validate, fix any type/build errors.

### F-005: Zod latest API mismatch appears in schema contract — resolved

The partial dependency install resolved Zod 4, where `z.record(z.any())` is no longer accepted by the current type definitions.

Resolution: `schema_markup` now uses Zod 4-compatible `z.record(z.string(), z.any())` calls, and hosted build validation is covered by the branch `Preview Build` workflow.
