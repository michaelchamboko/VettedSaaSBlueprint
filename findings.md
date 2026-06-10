# Findings

## Active Findings

### F-001: Local dependency install was attempted in error and must not be continued

`npm ci` cannot run because `package-lock.json` is out of sync with `package.json`. `npm install` was attempted with network approval but timed out twice, leaving local dependency setup incomplete. This was the wrong validation path for this project.

Impact: local dependency state is not trustworthy and must not be used as a readiness signal. Vercel/GitHub should perform hosted app install/build validation from the repository.

Update: a GitHub-hosted `Preview Build` workflow now runs `npm ci` and `npm run build` for branch validation; local installs remain out of scope by default.

### F-002: Oracle database connectivity is not ready

The Step 1 read-only review found no Oracle DB client/driver/wallet/env setup for the approved Autonomous Database path.

Impact: schema migration and DB-connected Hermes work are blocked until `T02A` succeeds.

Next action: complete the redacted readiness worksheet and get explicit approval for connection material placement and any driver/client installation.

Update: the operator-provided SSH launcher workflow can reach the Oracle host for read-only metadata checks, but sanitized probing still found no Oracle client tools, Python Oracle driver, wallet/config candidates, or Oracle connection environment names. The database read-only query remains blocked.

### F-003: Task graph and task-card numbering differ

`build-pack/11-task-graph.md` describes tasks through `T20`, while `build-pack/tasks/` currently stops at `T10` and groups later graph work into broader cards.

Impact: not a product-direction blocker, but later Step 2 execution may need task-card splitting before implementation to satisfy the pack's task sizing rule.

Next action: split or supplement task cards before starting grouped high-blast-radius work.

### F-004: Existing scaffold still contains Postgres-specific app code

Several routes still import `@vercel/postgres`, and the product insert route passes arrays directly to the Postgres template tag. This conflicts with the approved Oracle MVP direction and is expected to be removed during the database access layer task.

Impact: the app is not yet aligned to Oracle access patterns and may fail hosted build/type validation until `T02`/`T03` convert the database layer.

Update: the product array type error was fixed so hosted Next.js build validation passes. The larger Oracle-alignment issue remains until `T02A`, `T02`, and `T03` can proceed.

Runtime note: branch-preview smoke testing confirmed static routes can render through Vercel-authenticated fetch, while a sample DB-backed dynamic landing page returns a server error until the database path is connected and converted away from scaffold Postgres access.

### F-005: Zod latest API mismatch appears in schema contract — resolved

The partial dependency install resolved Zod 4, where `z.record(z.any())` is no longer accepted by the current type definitions.

Resolution: `schema_markup` now uses Zod 4-compatible `z.record(z.string(), z.any())` calls, and hosted build validation is covered by the branch `Preview Build` workflow.
