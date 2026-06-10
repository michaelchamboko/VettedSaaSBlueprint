# Dependency Ownership Map

This project is documented and structured so dependencies are installed and executed in the environment that owns each responsibility. The local repository is the source-of-truth for code, schema, configuration, and operating instructions; it is not the required runtime location.

## Environment ownership

| Layer | Owns | Dependency installation location | Source in repo |
| --- | --- | --- | --- |
| Vercel / Next.js app | Public landing pages, single-owner admin control plane, API routes, ISR revalidation, first-party tracking endpoints | Vercel build environment during deployment | `package.json`, `src/app`, `src/components`, `src/lib` |
| Oracle Autonomous Database | Durable system of record for products, affiliate links, jobs, evidence, page versions, metrics, recommendations, audit logs | Oracle managed database; no npm dependencies installed in the database | Oracle-compatible DDL derived from `db/schema.sql` |
| Oracle Hermes worker | 24/7 research, Scrapling crawls, job execution, budget guard, optimization cycles | Oracle worker host/container, colocated with Oracle database where practical | `hermes/worker.ts` plus future worker-specific dependency manifest if separated |
| Local workstation | Documentation, source editing, PR review, optional preview only | Optional developer choice; not required by the PRD setup path | Entire repo |

## Node dependency policy

- `package.json` defines the dependencies Vercel needs to build and run the Next.js application.
- Vercel installs those dependencies during deployment from the repository.
- The repo must not depend on committed `node_modules` or local machine installs.
- Local `npm install` is not part of the default workflow. It requires explicit operator opt-in for local preview and must not be used as the normal validation path.
- If a lockfile is present, it pins the dependency graph for Vercel; it is not evidence that runtime dependencies live locally.

## Database dependency policy

- Oracle Autonomous Database owns database execution and storage.
- SQL schema changes live in `db/schema.sql` until Step 2 converts them to Oracle-compatible DDL and/or a migrations system.
- Application code connects to Oracle Autonomous Database using environment variables and wallet/connection material supplied outside source control.
- Database tables do not install JavaScript dependencies.
- The approved MVP storage target is Oracle Autonomous Database Always Free unless production constraints require a paid Oracle tier.

## Hermes dependency policy

- Hermes runs outside Vercel because the PRD requires continuous and long-running research work.
- Oracle owns worker installation, process management, Scrapling runtime setup, scheduler uptime, and database proximity.
- Hermes calls the authenticated `/api/hermes/*` endpoints exposed by the Vercel app.
- Scrapling should be installed only in the Oracle worker environment or worker container, not as a default local workstation requirement.

## Prohibited assumptions

- Do not treat the local folder as the production runtime.
- Do not commit `node_modules`.
- Do not require local dependency installation before documenting architecture, deployment, or readiness.
- Do not move database runtime responsibilities into the Next.js project folder.
- Do not run Hermes inside Vercel serverless functions.
