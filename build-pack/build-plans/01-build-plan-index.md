# 01 — Build Plan Index

## Purpose

This index makes the Step 2 build plan visible at a modular level. Each module has a clear owner runtime, validation location, and relationship to task cards.

## Build Modules

| Module | Build Area | Runtime Owner | Validation Location | Primary Tasks |
| --- | --- | --- | --- | --- |
| M01 | Governance and Delivery | GitHub / docs | GitHub source review and docs-only static inspection | T00, T01 |
| M02 | Oracle Database Foundation | Oracle Autonomous Database | Oracle runtime after explicit approval | T02A, T02, T03 |
| M03 | Owner Control Plane | Vercel / GitHub | Vercel and GitHub checks | T04, T05, T06 |
| M04 | Offer Intelligence | Vercel plus Oracle runtime | Vercel/GitHub and approved Oracle checks | T06A, T06B, T06C |
| M05 | Hermes Research and Evidence | Oracle Hermes / worker | Oracle runtime after explicit approval | T07, T08 |
| M06 | Page Publishing and Optimization | Vercel / GitHub plus Oracle data | Vercel/GitHub and approved Oracle checks | T09, T10, later split T11-T20 |

## Required Plan Cross-References

- `build-pack/module-plans/M01-governance-and-delivery.md`
- `build-pack/module-plans/M02-oracle-database-foundation.md`
- `build-pack/module-plans/M03-owner-control-plane.md`
- `build-pack/module-plans/M04-offer-intelligence.md`
- `build-pack/module-plans/M05-hermes-research-and-evidence.md`
- `build-pack/module-plans/M06-page-publishing-and-optimization.md`
- `build-pack/build-plans/02-ui-ux-build-plan.md`

## Execution Rules

- Start with T02A before schema migration or DB-connected Hermes work.
- Do not collapse modules into a single large task.
- Split grouped task cards before implementation if they exceed the three-file or three-step sizing rule.
- Every task card must declare a validation location.
- Hosted app validation belongs to Vercel/GitHub, not the local workstation.

