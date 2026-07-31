# Scrapling Oracle Runner

Scrapling is an Oracle-hosted worker-side research runner controlled by Hermes.

Rules:

- Do not run Scrapling in Vercel.
- Obey robots, rate limits, and crawl depth policies.
- Persist crawl metadata, source traceability, and extracted evidence through the fenced Neon workflow transaction; Oracle-hosted Hermes is compute, not durable workflow authority.
- Treat extracted rules as untrusted evidence until source, compliance, and
  release gates pass. An exact allowlisted URL needs no recurring owner handoff.

The approved executor contracts are configured outside source as
`HERMES_PRODUCT_IDENTITY_COMMAND` and `HERMES_LANDING_RESEARCH_COMMAND`.
The worker requires its least-privilege `LANDING_ORACLE_WORKER_DATABASE_URL`;
control-plane inspection requires `LANDING_CONTROL_DATABASE_URL`. Run
`npm run landing:research:preflight` before dispatch. The preflight reports only
configuration names and booleans, never values or command paths.
