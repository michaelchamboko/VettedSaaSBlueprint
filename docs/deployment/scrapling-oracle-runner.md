# Scrapling Oracle Runner

Scrapling is an Oracle-hosted worker-side research runner controlled by Hermes.

Rules:

- Do not run Scrapling in Vercel.
- Obey robots, rate limits, and crawl depth policies.
- Persist crawl metadata, source traceability, and extracted evidence in Oracle Database.
- Keep extracted rules in draft or review state until owner approval.
