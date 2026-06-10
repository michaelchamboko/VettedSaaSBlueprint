# PRD-to-Blueprint Build Pack

This directory is the Step 1 output of the GlobalSetup PRD-to-Blueprint protocol for `docs/VetterSaaSBlueprint_PRD.md`.

## Operator Gate

This pack is not an implementation approval by itself. Step 2 coding/deployment begins only after the operator reviews and approves the final build pack.

## Core Documents

1. `00-confirmed-prd-summary.md`
2. `01-prd-review-checklist.md`
3. `02-build-brief.md`
4. `03-implementation-contract.md`
5. `04-existing-codebase-discovery.md`
6. `05-architecture-map.md`
7. `06-database-contract.md`
8. `07-api-contract.md`
9. `08-ui-contract.md`
10. `09-permissions-contract.md`
11. `10-implementation-plan.md`
12. `11-task-graph.md`
13. `12-test-plan.md`
14. `13-review-gate.md`
15. `14-rollback-plan.md`
16. `15-pre-ship-checklist.md`
17. `16-definition-of-done.md`
18. `17-offer-intelligence-folder-and-conversion-continuity.md`
19. `18-final-build-pack-review.md`
20. `19-oracle-infrastructure-review-and-guardrails.md`
21. `20-security-threat-model.md`
22. `21-oracle-database-setup-readiness-review.md`
23. `22-t02a-database-connectivity-preflight-result.md`

## Build Plans

Build plans live in `build-plans/` and make Step 2 execution visible before task cards:

1. `build-plans/01-build-plan-index.md`
2. `build-plans/02-ui-ux-build-plan.md`

## Task Cards

Task cards live in `tasks/` and are ordered from `T00` through `T10`, with `T06A`, `T06B`, and `T06C` inserted for offer folders, program-resource intake, and purchase destination review.

## Module Plans

Module plans live in `module-plans/`. They provide the missing modular layer between architecture/contracts and task cards. Each module plan defines responsibility, runtime owner, validation location, dependencies, and mapped task cards.

Step 2 validation is deployment-first:

- Vercel/GitHub validates the Next.js app.
- Oracle validates database and Hermes runtime work after explicit approvals.
- Local app dependency installs, local production builds, local dev servers, and full local typechecks are not default validation gates.

## Current Status

`STEP_1_BUILD_PACK_READY_FOR_FINAL_OPERATOR_APPROVAL`

## Approved Decisions

- 2026-06-10: Use Oracle Autonomous Database as the MVP system of record. Neon is removed from the approved MVP architecture.
- 2026-06-10: Treat the product as a single-operator personal marketing tool, not a public SaaS application.
- 2026-06-10: Use MiniMax only through Oracle Hermes for budget-gated structured generation; allow AI-assisted React/CSS only for reviewed component development.
- 2026-06-10: Use a controlled motion-aware landing component library for page variety.
- 2026-06-10: Run Scrapling as an Oracle-hosted Python runner/container controlled by Hermes; no Vercel crawling.
- 2026-06-10: Existing Oracle Hermes is already configured with MiniMax; integrate with it rather than provisioning a new Hermes/MiniMax stack.
- 2026-06-10: PartnerStack data is manual-entry/manual-upload for MVP, with Hermes analysis of PDFs, images, links, and video references/uploads where practical. PartnerStack API is ignored for MVP.
- 2026-06-10: Each affiliate offer needs an Oracle-owned Offer Intelligence Folder linking affiliate URL, resources, rules, research, evidence, and purchase destination review.
- 2026-06-10: Landing pages should use conversion continuity: message match, information scent, visual congruence, expectation alignment, and trust transfer into the purchase destination.
- 2026-06-10: Use custom owner-only auth for MVP, with no public signup, roles, teams, or third-party auth provider.
- 2026-06-10: Use minimal first-party tracking only for MVP; no third-party pixels, no fingerprinting, no raw IP storage, and no cookie banner unless tracking expands.
- 2026-06-10: Oracle Always Free posture is a golden rule. Do not change instance shape, billing-affecting settings, networking, storage, or existing Hermes block-volume installation without explicit separate approval.
- 2026-06-10: Oracle compute/Hermes host is partially ready, but database connectivity is not ready yet: no Oracle client/driver/wallet/DB env was found during read-only review.
- 2026-06-10: T02A preflight is blocked until Oracle Autonomous Database wallet/service details are provided or a walletless connection method is explicitly approved.
