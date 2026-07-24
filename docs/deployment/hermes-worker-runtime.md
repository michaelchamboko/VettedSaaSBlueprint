# Hermes Worker Runtime

Hermes runs outside Vercel as the Oracle worker runtime for queued research, evidence, analysis, scoring, optimization, and publication-artifact export jobs. Page drafting and preview production belong to Codex.

Responsibilities:

- Claim queued jobs with lock-safe semantics.
- Heartbeat running jobs.
- Mark jobs complete or failed.
- Keep bearer-token authentication separate from owner auth.
- Call AI providers only through a generic LLM service interface and injected provider wrapper.
- Treat historical `PAGE_DRAFT_GENERATION` jobs as retired Codex-owned work and complete them without drafting.
- Retain `LANDING_ARTIFACT_PUBLICATION`, including one export job for all pages approved from a Codex batch.

Deployment rule:

- Do not move Hermes into Vercel runtime.
- Do not change Hermes service shape or packages without separate approval.
- Do not import provider SDKs, call provider APIs, or hard-code model names in Hermes job logic. Keep those details inside isolated provider wrappers.
