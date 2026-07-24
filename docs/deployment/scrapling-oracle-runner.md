# Scrapling Oracle Runner

Scrapling is an Oracle-hosted worker-side research runner controlled by Hermes.

Rules:

- Do not run Scrapling in Vercel.
- Obey robots, rate limits, and crawl depth policies.
- Persist crawl metadata, source traceability, and extracted evidence in Oracle Database.
- Treat extracted rules as untrusted evidence until source, compliance, and
  release gates pass. An exact allowlisted URL needs no recurring owner handoff.
