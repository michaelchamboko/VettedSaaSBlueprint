# Agent Operating Rules

This repository implements the Controlled Affiliate Intelligence Loop from `docs/VetterSaaSBlueprint_PRD.md` through the Step 2 build pack in `build-pack/`.

## Project Boundary

- Treat this as a single-operator personal marketing tool, not a public SaaS product.
- Build only owner/admin surfaces and anonymous public landing-page visitor flows.
- Do not add public signup, teams, tenants, seats, billing, roles, or third-party identity providers unless the operator changes direction.

## Step 2 Execution Order

- Follow `build-pack/11-task-graph.md`.
- Complete `T02A - Oracle Database Connectivity Readiness` before schema migration or DB-connected Hermes work.
- Do not apply database schema until the approved Oracle connection path has passed a read-only verification query.
- Keep task changes small enough to review independently.

## Oracle Guardrails

- Do not change Oracle instance shape, Always Free posture, networking, firewall, storage, packages, systemd services, or existing Hermes runtime without explicit separate approval.
- Do not modify `/michael-core/hermes` or replace the existing Hermes installation without explicit separate approval.
- Do not expose new Oracle-hosted public services.
- Do not print secrets, wallet paths, connection strings, tokens, raw environment variables, or key material in logs or chat.

## Implementation Rules

- Runtime AI may produce structured JSON only; approved code renders pages.
- Preserve original PartnerStack affiliate URLs and tracking parameters.
- First publication and high-risk changes require manual approval.
- Unknown compliance state must block publication.
- Public tracking remains minimal first-party only: page view, CTA click, affiliate click, link error, and FAQ expand.
- Do not add third-party pixels, fingerprinting, raw IP storage, remarketing, newsletter capture, or profiling in MVP.

## Dependency Ownership

- Vercel owns Next.js application dependencies.
- Oracle Autonomous Database owns durable data.
- Oracle Hermes owns worker and Scrapling runtime dependencies.
- Local application dependency installs, production builds, dev servers, and full local typechecks are prohibited by default.
- Validation happens through GitHub/Vercel for the app and approved Oracle runtime checks for database/Hermes work.
- Local workstation work is limited to source editing, documentation, git operations, and docs-only/static inspection unless the operator explicitly opts into local preview.
