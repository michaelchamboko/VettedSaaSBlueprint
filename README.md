# GlobalSetup / Controlled Affiliate Intelligence Loop

This repository is the source blueprint for the PRD in `docs/VetterSaaSBlueprint_PRD.md`.

This is a **single-operator personal marketing tool**, not a public SaaS application. The only authenticated human user is the owner/operator; public visitors are anonymous landing-page visitors.

The project is not intended to make the local folder the runtime. Dependencies and services are installed where the PRD assigns responsibility:

- Vercel builds and runs the Next.js application.
- Oracle Autonomous Database stores durable product, evidence, page, job, tracking, and audit data.
- Oracle runs the long-lived Hermes worker and Scrapling research process.
- The local workstation is for source editing, documentation, review, and optional preview only.

## Current repo contents

- `src/app` — Next.js App Router control plane, public page routes, and API routes.
- `src/components` — Fixed landing-page components that render structured JSON.
- `src/lib` — PRD contracts, compliance gates, Hermes auth, and tracking helpers.
- `db/schema.sql` — draft database schema; Step 2 must convert it to Oracle Autonomous Database DDL before applying.
- `hermes/worker.ts` — Oracle-side Hermes worker skeleton.
- `docs/deployment/dependency-ownership.md` — Defines where dependencies are installed and owned.
- `docs/deployment/architecture.md` — Defines Vercel and Oracle deployment responsibilities.

## Deployment-first setup

1. Provision Oracle Autonomous Database, preferably Always Free Autonomous Transaction Processing for MVP.
2. Convert `db/schema.sql` to Oracle-compatible DDL and apply it to Oracle Autonomous Database.
3. Connect `michaelchamboko/VettedSaaSBlueprint` to the Vercel project serving `https://vetted-saa-s-blueprint.vercel.app`.
4. Configure Vercel environment variables from `.env.example`.
5. Let Vercel install `package.json` dependencies during deployment.
6. Provision the Oracle Hermes worker environment near the Oracle database.
7. Install Hermes/Scrapling worker dependencies on Oracle, not in the local repo folder.
8. Start Hermes as a managed Oracle service after the Vercel app is live.

## Optional local preview

Local dependency installation is optional and only for developer preview or validation. It is not part of the required deployment path.

If you choose to preview locally, install dependencies locally at your discretion and do not commit `node_modules`.

## MVP boundaries

- AI outputs structured JSON only; React layout is fixed in code.
- First publication and high-risk changes require manual approval.
- Affiliate links preserve original PartnerStack referral URLs.
- Tracking is minimal first-party event storage.
- Scrapling crawlers belong to the Oracle Hermes environment.
- Vercel serverless functions must not become the 24/7 research worker.
