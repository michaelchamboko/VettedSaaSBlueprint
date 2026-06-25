# Deployment Architecture

The PRD defines a two-platform deployment model: Vercel for the application and Oracle for both durable database state and Hermes worker execution.

## Vercel application

Vercel builds the Next.js application from this repository.

Production URL:

```text
https://vetted-saa-s-blueprint.vercel.app
```

Note: as of 2026-06-25, runtime probes against this host return `404`/`NOT_FOUND`, so the active Vercel production hostname should be confirmed before final smoke validation.

Responsibilities:

- Render single-owner admin dashboard pages.
- Render public direct-review landing pages from approved structured JSON.
- Serve admin APIs.
- Serve Hermes job APIs.
- Serve tracking APIs.
- Trigger ISR revalidation.
- Enforce disclosure and publication gates in code-controlled components.

Required Vercel runtime variables for Oracle connectivity:

```text
ORACLE_CONNECTION_STRING
ORACLE_DB_USER
ORACLE_DB_PASSWORD
ORACLE_WALLET_LOCATION
ORACLE_SERVICE_ALIAS
TNS_ADMIN
DATABASE_URL
ORACLE_APP_USER
ORACLE_APP_PASSWORD
HERMES_API_TOKEN
ORACLE_SESSION_SECRET
SESSION_SECRET
NEXT_PUBLIC_SITE_URL
```

Vercel dependency source:

```text
package.json
package-lock.json, if committed
```

## Oracle Autonomous Database

Oracle Autonomous Database is the database system of record. For MVP, use Oracle Autonomous Transaction Processing / Autonomous AI Database Always Free where capacity is sufficient.

Responsibilities:

- Products and categories.
- Affiliate links and program rules.
- Compliance profiles and manual review tasks.
- Hermes job queue and locks.
- Research sources and evidence claims.
- Page blueprints, page versions, and dynamic pages.
- Conversion events and daily metrics.
- Optimization recommendations and audit logs.

Schema source:

```text
db/oracle-migration-001.sql
```

## Oracle Hermes worker

Oracle hosts Hermes as the long-running intelligence plane.

Responsibilities:

- Claim queued jobs from Vercel APIs.
- Run 3-hour research refresh cycles.
- Run daily optimization reviews.
- Run weekly/manual deep research passes.
- Execute Scrapling crawls within approved source policies.
- Apply budget guardrails before expensive AI work.
- Create evidence, drafts, scores, recommendations, and manual review tasks.

Required Oracle worker/runtime variables:

```text
ORACLE_CONNECTION_STRING
ORACLE_DB_USER
ORACLE_DB_PASSWORD
ORACLE_WALLET_LOCATION
ORACLE_SERVICE_ALIAS
TNS_ADMIN
DATABASE_URL
ORACLE_APP_USER
ORACLE_APP_PASSWORD
HERMES_API_TOKEN
ORACLE_SESSION_SECRET
SESSION_SECRET
NEXT_PUBLIC_SITE_URL
```

## Deployment order

1. Provision Oracle Autonomous Database.
2. Convert `db/schema.sql` into Oracle-compatible DDL and apply it to Oracle Autonomous Database.
3. Connect the GitHub repository to Vercel.
4. Add Vercel environment variables.
5. Deploy the Next.js app on Vercel.
6. Provision Oracle worker host/container near the Oracle database.
7. Configure Oracle worker environment variables.
8. Start Hermes as a managed service.
9. Create first product, affiliate link, compliance profile, and manual review task.
10. Approve and publish the first direct-review page.

## Local workstation role

Local setup is optional and limited to editing, documentation, and preview. Production dependencies are installed by Vercel and Oracle in their own environments.
