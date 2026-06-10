# 10 — Implementation Plan

## Stage 0 — Planning Approval

- Review build pack with operator.
- Confirm approved Step 1 decisions remain current, including custom owner-only auth and minimal first-party tracking.
- Freeze Step 1 documents before implementation except for explicit Step 2 readiness notes.

## Stage 1 — Repository Governance

- Add project-specific `AGENTS.md`, `project_rules.md`, `state.md`, and `findings.md` if approved.
- Ensure `.gitignore` excludes local runtime artifacts.
- Confirm deployment-first dependency ownership.

## Stage 2 — Database Foundation

- Complete Oracle Database Connectivity Readiness before any schema application.
- Convert schema contract into versioned migrations.
- Apply migrations to Oracle Autonomous Database.
- Add seed data for local/preview environments only if explicitly approved.
- Validate indexes and job-lock queries.

## Stage 3 — Application Foundation

- Finalize Next.js App Router structure.
- Add typed database access layer with lazy initialization.
- Add auth guard strategy for admin routes and Hermes APIs.
- Add structured validation and error handling helpers.

## Stage 4 — Admin Control Plane

- Product Vault CRUD.
- Affiliate Link Vault CRUD and link rule validation.
- Offer Intelligence Folder linking affiliate URL, resources, research, rules, evidence, and destination review.
- PartnerStack program/resource upload and link intake.
- Hermes analysis workflow for uploaded program resources.
- Purchase destination review workflow for affiliate links.
- Compliance profile/program rule management.
- Manual review task queue.

## Stage 5 — Hermes Job Plane

- Job creation and queue monitoring.
- Authenticated job claim/heartbeat/complete/fail endpoints.
- Existing Oracle Hermes integration.
- Budget guard configuration.

## Stage 6 — Research and Evidence

- Oracle-hosted Python Scrapling runner/container controlled by Hermes.
- Scrapling crawl policy and run persistence.
- Research source store.
- Evidence claim extraction and approval states.
- Evidence graph relations via Oracle relational tables and Oracle JSON columns.

## Stage 7 — Page Drafting and Review

- Direct review page JSON schema validation.
- Conversion-continuity guidance from purchase destination review.
- Page blueprint and version workflow.
- Quality/compliance scoring.
- Approval and publication state transitions.

## Stage 8 — Public Rendering and Tracking

- Dynamic landing page rendering.
- Disclosure enforcement.
- PartnerStack redirect wrapper preserving original links.
- First-party event capture and daily metrics.

## Stage 9 — Optimization Loop

- Daily metrics review.
- Recommendation generation.
- Low-risk auto-update lane with default-deny safeguards.
- Manual approval for high-risk changes.

## Stage 10 — Pre-Ship Verification

- Typecheck.
- Build.
- Route/API contract tests.
- Database migration validation.
- Compliance gate tests.
- Security/privacy review.
- Deployment smoke test on Vercel.
