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

The URL-to-live release lane does not wait for Oracle. Its order is:

1. Connect the GitHub repository to the existing Vercel project and configure
   the required Preview and Production environment values.
2. Submit one exact affiliate URL with
   `npm run landing:run -- --url <exact-affiliate-url>`.
3. Validate the design catalogue, produce the evidence-backed
   `reference_composed_v1` page, and run automatic repair and quality checks.
4. Open the GitHub pull request, verify the Vercel preview, merge after required
   checks pass, and let the Vercel Git connection deploy `main`.
5. Verify the canonical production route and record `LIVE`.
6. Synchronize the durable run to Oracle when Oracle is configured; otherwise
   record `pending` or `not_configured` without blocking the release.

Oracle Autonomous Database and Hermes can be provisioned independently for
durable research, scoring, optimization, and later synchronization. Their
availability is not a prerequisite for the agent-led release receipt path.

## Local workstation role

The local workstation is the agent-owned landing-page production environment.
It owns the internal design-reference catalogue, deterministic reference
selection, structured authoring, validation and packaging, focused checks, and
bounded production-identical noindex previews with visual review artifacts. The
exact URL submission supplies release authorization; independently verified
fingerprints and `LandingReleaseReceiptV1` supply publication provenance.
GitHub repeats release gates, Vercel owns deployment, and Oracle remains the
durable synchronization target when configured.
