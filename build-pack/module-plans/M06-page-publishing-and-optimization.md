# M06 — Page Publishing and Optimization

**Status**: Initial Step 2 module plan  
**Runtime owner**: Vercel / GitHub, with Oracle data source  
**Validation location**: Vercel and GitHub checks; Oracle runtime for data-backed flows after approval  

## Responsibility

Own structured page drafting, compliance gate, approval/publishing workflow, public renderer, first-party tracking, and optimization recommendations.

Detailed owner review and public landing-page UX requirements are defined in `build-pack/build-plans/02-ui-ux-build-plan.md`.

## Scope

- `src/components/landing/*`
- `src/app/landing-page-builders/*`
- `src/app/api/events/*`
- Page blueprint/version APIs and ISR revalidation.
- Optimization recommendation workflow.

## Task Mapping

- `T09` — Page drafting, compliance gate, publishing.
- `T10` — Tracking and optimization loop.
- Later split tasks from graph nodes `T11` through `T20` when execution reaches grouped work.

## Validation

- GitHub/Vercel hosted build/deploy checks.
- Hosted preview review for disclosure placement and mobile rendering.
- Oracle runtime checks only for data-backed flows after approval.
- No local app install/build/typecheck.

## Dependencies

- Upstream: M02 database foundation, M03 control plane, M04 offer intelligence, M05 evidence.
- Downstream: release readiness.
