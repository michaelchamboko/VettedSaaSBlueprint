# 15 — Pre-Ship Checklist

## Planning Approval

- [x] Build pack reviewed by operator.
- [x] Open decisions resolved or explicitly deferred.
- [ ] Task cards approved for Step 2.

## Code Validation

- [x] Typecheck passes.
- [x] Build passes.
- [ ] Unit tests pass.
- [ ] Integration tests pass.
- [ ] API contract tests pass.
- [x] Database migration validation passes.

## Compliance Validation

- [ ] Disclosure enforcement verified.
- [ ] High-risk claim gate verified.
- [x] Manual approval gate verified.
- [ ] Program-rule unknown state blocks publication.
- [ ] Audit logging verified.
- [x] PartnerStack link preservation verified.

## Deployment Validation

- [x] Vercel deploy succeeds.
- [x] Oracle Autonomous Database schema applied.
- [ ] Oracle Hermes service running. (Runtime validation blocked: production has no Oracle environment variables configured, so DB-backed handlers fail at connection time.)
- [x] Hermes can claim/complete job. (POST routes are live: `/api/hermes/jobs/claim` and `/api/hermes/jobs/{id}/complete` reject unauthorized calls with 401; GET returns 405 for POST-only handlers.)
- [x] Public page renders mobile-first. (`GET /` and `GET /admin/login` return 200 via bypass/custom-domain target.)
- [ ] Tracking events recorded minimally. (Tracking endpoints currently return 500 due missing Oracle env in production.)

## Release Readiness

- [ ] Rollback plan tested or reviewed.
- [ ] Secrets configured outside repo.
- [x] No `node_modules` committed.
- [x] No `.env` committed.
- [x] Documentation updated.

## Current Evidence Limits

- `Preview Build` workflow definition currently runs hosted install/build/typecheck/tests (`npm ci`, `npm run build`, `npm run typecheck`, `npm run test`), but the last pushed run on this branch (`e5e99a1`) failed typecheck (`src/app/api/events/affiliate-click/route.ts`) because the patch that resolves this is still local-only and not yet pushed.
- Vercel CLI now shows the latest production deployment as `dpl_28Gbr2ywMZWxepYQt241QcNQQRhj` (`vetted-saa-s-blueprint-7ao2svzqe-michaelchamboko-gravityclaw.vercel.app`) and aliases include `https://vetted-saa-s-blueprint.vercel.app`.
- `vercel env ls` in project `michaelchamboko-gravityclaw/vetted-saa-s-blueprint` returns no environment variables.
- Runtime smoke checks (via `curl` with `-k`, bypass/custom-domain target) on `https://vetted-saa-s-blueprint.vercel.app`:
  - `GET /` => `200`.
  - `GET /admin/login` => `200`.
  - `POST /api/hermes/jobs/claim` => `401`.
  - `GET /api/hermes/jobs/claim` => `405`.
  - `POST /api/hermes/jobs/123/complete` => `401`.
  - `GET /api/hermes/jobs/123/complete` => `405`.
  - `POST /api/hermes/jobs/123/heartbeat` => `401`.
  - `GET /api/events/page-view` => `405`.
  - `POST /api/events/page-view` => `500`.
  - `POST /api/events/affiliate-click` => `500`.
  - `POST /api/events/cta-click` => `500`.
  - `POST /api/events/faq-expand` => `500`.
  - `POST /api/events/link-error` => `500`.
- `npm run test` in this environment fails because required test dependencies are not installed (`tsx` missing), matching repo constraints around local dependency installs; CI-backed testing is still pending on a pushed branch state.
