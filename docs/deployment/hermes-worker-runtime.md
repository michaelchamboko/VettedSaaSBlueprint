# Hermes Worker Runtime

Hermes runs outside Vercel as the Oracle worker runtime for queued research, analysis, and page-processing jobs.

Responsibilities:

- Claim queued jobs with lock-safe semantics.
- Heartbeat running jobs.
- Mark jobs complete or failed.
- Keep bearer-token authentication separate from owner auth.

Deployment rule:

- Do not move Hermes into Vercel runtime.
- Do not change Hermes service shape or packages without separate approval.
