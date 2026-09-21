# Vetted SaaS Blueprint

This repository is the Spec Kit, application, local automation, and production-deployment workspace for Vetted SaaS Blueprint.

The application is a single-operator content and decision-support system:

- Vercel builds and serves the Next.js application.
- The configured PostgreSQL-compatible `DATABASE_URL` stores persistent application and automation records.
- Codex desktop runs the four project-scoped research, editorial, optimisation, and watchdog schedules on the operator's computer.
- Local verified commits deploy directly to Vercel production.

## Repository contents

- `src/app` — Next.js App Router routes and authenticated administration pages.
- `src/components` — shared public and administrative components.
- `src/lib` — content, evidence, automation, authentication, database, and tracking contracts.
- `scripts` — deterministic validation, automation, and deployment commands.
- `planning.md` — the single planning and execution authority.
- `docs/document-intelligence` — source inventory and stable source identifiers.

## Local verification

Use Node 24 and npm 12.0.2, then run:

```powershell
npm ci
npm run lint
npm run typecheck
npm test
npm run validate:public-site
npm run build
```

Secrets remain outside Git. Persistent features use `DATABASE_URL`; authentication uses `APP_USER`, `APP_PASSWORD_HASH`, and `SESSION_SECRET`.

## Production boundary

- Production deployment is direct to the existing Vercel project.
- Automatic release is limited to validated structured-content JSON.
- Dependencies, routes, authentication, migrations, rankings, prices, affiliate claims, and conflicting evidence require owner review.
- Tracking is minimal, first-party, and resilient when its configured endpoint is unavailable.
