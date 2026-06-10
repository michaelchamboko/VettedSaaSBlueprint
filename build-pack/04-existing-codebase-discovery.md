# 04 — Existing Codebase Discovery

## Repository State

The current repository contains an initial documentation-first scaffold aligned to the PRD. It is not yet an approved Step 2 implementation.

## Files Observed

- `docs/VetterSaaSBlueprint_PRD.md` — source PRD.
- `docs/deployment/dependency-ownership.md` — runtime ownership map.
- `docs/deployment/architecture.md` — Vercel/Oracle deployment model.
- `db/schema.sql` — initial SQL schema draft requiring Oracle-compatible conversion in Step 2.
- `src/app` — Next.js App Router pages and route handlers.
- `src/components/landing` — direct review landing renderer and disclosure component.
- `src/lib/schemas/contracts.ts` — Zod contracts for products, affiliate links, and page blueprints.
- `src/lib/compliance/gate.ts` — initial compliance gate helper.
- `src/lib/hermes/auth.ts` — Hermes token auth helper.
- `src/lib/tracking/events.ts` — tracking event helper.
- `hermes/worker.ts` — Oracle worker skeleton.

## Technology Detection

- Frontend/App: Next.js App Router + TypeScript + Tailwind.
- Database: Oracle Autonomous Database target approved; current SQL draft needs Oracle DDL conversion.
- Worker: TypeScript skeleton, intended for Oracle; Scrapling integration not yet implemented.
- Validation: Zod contracts.
- Deployment: Vercel for app, Oracle Autonomous Database for DB, Oracle for worker.

## Discovery Findings

1. Current code exists before this protocol run; Step 1 should treat it as draft source context, not approved production implementation.
2. No committed `node_modules` exists. Dependency installation is environment-owned.
3. `package.json` remains necessary for Vercel build metadata.
4. PRD scope is larger than the current scaffold; task graph must split work into independent cards.
5. Core Step 1 review decisions are approved. Remaining items are Step 2 implementation follow-ups, not product-direction blockers.

## Impact Boundary

Blueprint work may create or modify `build-pack/**` and planning documentation. Production source files under `src/**`, `db/**`, and `hermes/**` should not be changed during Step 1 unless the operator explicitly approves a planning-to-code transition.
