# Deployment Architecture

VettedSaaSBlueprint uses three execution boundaries with one durable authority:

- Vercel builds and serves the Next.js application from reviewed Git commits.
- Neon Postgres owns durable workflow, evidence, gate, and publication state.
- Oracle-hosted Hermes owns product identity, research, evidence collection,
  scoring, optimization, artifact export, and Scrapling execution.

## Durable workflow authority

Neon Postgres is the system of record for landing jobs. Workers claim only
their permitted stages through least-privilege database credentials. A worker
may complete an already-dispatched idempotent side effect during an outage, but
no job may advance, publish, or report completion until a fenced Postgres
transaction records the result.

Local JSON, generated receipts, prompts, and agent notes are artifacts, not
workflow authority. They may not substitute for Neon state.

## Vercel application

Vercel renders owner/admin surfaces and anonymous public landing pages from
approved repository code and structured artifacts. GitHub CI repeats the
application and landing-quality checks from a clean checkout; the Vercel Git
integration owns preview and production deployments.

Production completion requires a clean Git-backed deployment whose
`/api/deployment` response matches the reviewed commit and reports non-dirty
Vercel Git provenance.

## Oracle-hosted Hermes

Hermes owns the `product_identity` and `research` stages. It must use only the
approved `HERMES_PRODUCT_IDENTITY_COMMAND` and
`HERMES_LANDING_RESEARCH_COMMAND` contracts and must persist results through
the fenced Neon transaction. Local research is not a fallback.

Do not change Oracle instance shape, networking, firewall, storage, packages,
systemd services, or `/michael-core/hermes` without separate approval.

## Research-prep configuration

Run `npm run landing:research:preflight` before dispatch. It validates the
exact `approved-urls.md` manifest and reports whether these external
authorities are configured without printing their values:

- `LANDING_CONTROL_DATABASE_URL`
- `LANDING_ORACLE_WORKER_DATABASE_URL`
- `HERMES_PRODUCT_IDENTITY_COMMAND`
- `HERMES_LANDING_RESEARCH_COMMAND`

A blocked result pauses the durable stage and names the external configuration
required to resume. It does not authorize drafting, publication, or a local
receipt.
