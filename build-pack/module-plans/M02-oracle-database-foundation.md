# M02 — Oracle Database Foundation

**Status**: Initial Step 2 module plan  
**Runtime owner**: Oracle Autonomous Database  
**Validation location**: Oracle runtime after explicit approval  

## Responsibility

Own Oracle database connectivity readiness, Oracle-compatible schema migration design, database access strategy, and database safety guardrails.

## Scope

- `T02A` Oracle connectivity readiness.
- `T02` Oracle schema migration foundation.
- `T03` database access layer.
- Oracle wallet/secret placement documentation only, never secrets in repo.

## Task Mapping

- `T02A` — Confirm target DB/service, connection method, secret/wallet path, and read-only query.
- `T02` — Convert schema contract into Oracle-compatible migrations.
- `T03` — Implement lazy DB access layer after connection path is approved.

## Validation

- `T02A`: read-only `select 1 from dual` in Oracle after explicit approval.
- `T02`: migration review and approved Oracle application path.
- `T03`: GitHub/Vercel app validation for source build behavior, Oracle runtime checks for DB calls.
- No local app install/build/typecheck.

## Dependencies

- Upstream: M01 governance.
- Downstream: admin control plane, Hermes jobs, evidence, publishing, tracking.
