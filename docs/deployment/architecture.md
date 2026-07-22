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
- Render committed Codex batch drafts through production-identical noindex preview routes without production analytics.
- Import committed Codex batches and present owner selection/approval controls.

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
AI_PROVIDER
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
- Use the configured AI provider only through the decoupled LLM service wrapper boundary.
- Create evidence, scores, recommendations, and manual review tasks.
- Export approved publication artifacts, including one multi-page Codex batch per publication job.
- Never generate or rewrite landing-page drafts; `PAGE_DRAFT_GENERATION` is retired Codex-owned work.

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
AI_PROVIDER
```

Provider-specific secret variables, such as API keys, are required only for the selected provider and must be stored through the approved secret path. ChatGPT account OAuth is not a backend worker credential.

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
10. Use Codex to validate the local design-reference catalogue, select a `DesignDirectionV1`, confirm a product evidence pack, and produce one visually reviewed `reference_composed_v1` animated exemplar preview.
11. Import the committed batch into Oracle, approve the selected exemplar, export its artifact, and deploy it through Vercel.

## Local workstation role

The local workstation is the Codex-owned landing-page production environment. It owns the internal design-reference catalogue, deterministic reference selection, structured batch authoring, validation and packaging, focused checks, and bounded production-identical noindex previews with visual review artifacts. Oracle availability does not block those local stages. The workstation does not grant publication authority: Oracle remains canonical for durable records and owner approval, GitHub repeats release gates, and Vercel owns deployment.
