# Project State

## 2026-06-10

- Step 1 build pack reviewed.
- Operator approved proceeding into Step 2 implementation.
- Current implementation branch: `codex/step-2-build`.
- Execution starts with `T00`, `T01`, then `T02A`.
- GitHub repo: `michaelchamboko/VettedSaaSBlueprint`.
- Vercel production URL: `https://vetted-saa-s-blueprint.vercel.app`.
- GlobalSetup repo corrected on 2026-06-10 to require deployment-first validation and module plans.
- Local app builds/installs are no longer part of this project's default execution path.

## Step 2 Progress

| Task | Status | Notes |
| --- | --- | --- |
| T00 Decision Ledger | Complete | Stale implementation-plan wording cleaned up; blocker search returns no active matches outside the task card itself. |
| T01 Governance Files | Complete | `AGENTS.md`, `project_rules.md`, `state.md`, and `findings.md` exist. |
| T02A Oracle DB Connectivity Readiness | Complete | Wallet-based Oracle Autonomous Database connectivity verified with read-only `select 1 from dual`. No schema, Oracle-hosted package, Hermes runtime, service, wallet, or Vercel setting was changed. Temporary local driver tooling was removed after verification. |
| T02 Oracle Schema Migration Foundation | Complete | `db/oracle-migration-001.sql` created with Oracle-compatible DDL for 20 MVP tables. PostgreSQL-to-Oracle conversions: VARCHAR2(36) for UUIDs, CLOB+CHECK(IS JSON) for JSON, TIMESTAMP WITH TIME ZONE, NUMBER(1) for booleans, function-based indexes. `db/README.md` documents migration strategy. Schema NOT yet applied to Oracle — requires operator approval. Pushed as commit `16b49aa`. |
| T03 Database Access Layer | Complete | `src/lib/db/` module: lazy Oracle connection pool (`client.ts`), `sql` tagged template literal wrapper (`query.ts`), barrel export (`index.ts`). Automatic PostgreSQL→Oracle syntax conversion. All 10 source files migrated from `@vercel/postgres` to `@/lib/db`. `package.json`: `@vercel/postgres` → `oracledb@^6.7.0`. Pushed as commit `16b49aa`. |
| T04 Auth Strategy | Complete | Single-owner password auth with bcrypt, HTTP-only signed session cookies, login/logout routes, middleware protection, rate limiting, and admin audit logging. Latest GitHub `Preview Build` passed on commit `1a03e3e`. |
| T05 Product Vault | Complete | Product create/read controls and validation tests added. Hosted build passed on commit `e5d9081`. |
| T06A Offer Intelligence Folder | Complete | Offer folder schema, admin API, UI surface, and relationship tests added. Hosted build passed on commit `f9a7c98`. |
| T06B PartnerStack Program Resource Intake | Complete | Program resource intake schema, admin API, UI surface, and validation tests added. Hosted build passed on commit `cd0a4fa`. |
| T06C Purchase Destination Review | Complete | Purchase review schema, admin API, UI surface, and destination-review gate helper added. Hosted build passed on commit `cb224b8`. |
| T07 Hermes Job Queue and Oracle Worker | Complete | Hermes job lifecycle helpers and non-Vercel runtime documentation added. Hosted build passed on commit `8160e3e`. |
| T08 Scrapling Research and Evidence Ledger | Complete | Research source/evidence ledger APIs, admin surface, and budget tests added. Hosted build passed on commit `3fa14d6`. |
| T09 Page Drafting, Compliance Gate, Publishing | Complete | Page blueprint/version workflow routes and publish-gate helper added. Hosted build passed on commit `e5a6e90`. |
| T10 Tracking and Optimization Loop | Complete | Tracking recommendations loop and admin surface added. Hosted build passed on commit `cbe657d`. |
| T11 Budget Guard | Not started | Next task. |
| Module Plans | Complete / initial | Added `build-pack/module-plans/` to make the implementation plan modular and validation-location aware. |
| Build Plans | Complete / initial | Added `build-pack/build-plans/`, including the UI/UX build plan for owner workflows and public landing pages. |

## Hosted Validation

- GitHub Actions workflow `Preview Build` added on 2026-06-10.
- Hosted build validation for `codex/step-2-build` is enforced by the `Preview Build` workflow (`npm ci`, then `npm run build`).
- Latest hosted build on commit `cbe657d` passed in GitHub Actions.
- Latest Vercel preview deployment for commit `cbe657d` is `READY`.
- Vercel preview validation for `codex/step-2-build` is handled by the Vercel GitHub integration for the branch HEAD.
- Vercel Deployment Protection still blocks unauthenticated automated page fetches for the preview URL; rendered smoke testing needs an approved Vercel bypass/auth path or interactive logged-in browser access.
- Vercel-authenticated smoke checks can render static branch-preview routes; DB-backed dynamic page routes remain blocked until Oracle schema is applied.
- T02A operator handoff checklist: `docs/deployment/oracle-t02a-operator-handoff.md`.

## Current Boundaries

- No Oracle schema has been applied.
- No Oracle instance, network, storage, firewall, package, or Hermes service setting has been changed.
- No secrets or wallet files have been added to the repository.
- No local app dependency install/build/typecheck should be used as a delivery gate.
- Owner/admin auth is implemented and admin routes/pages are protected.
