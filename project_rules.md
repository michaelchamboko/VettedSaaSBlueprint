# Project Rules

## Current Build Approval

The operator approved moving from Step 1 build-pack review into Step 2 implementation on 2026-06-10.

Step 2 approval does not automatically approve Oracle infrastructure changes, schema application, wallet placement, driver installation, service restarts, package upgrades, or secrets handling. Those actions require the separate approvals described in `build-pack/19-oracle-infrastructure-review-and-guardrails.md`.

## Required Gates

- `T00` decisions must stay resolved in the build pack.
- `T01` governance files must exist before implementation expands.
- Module plans under `build-pack/module-plans/` must stay aligned with the task graph.
- `T02A` must pass a read-only Oracle connection test before `T02` schema migration.
- Schema changes must be reviewable and reversible or explicitly covered by rollback notes.
- Any page publication path must enforce disclosure, active affiliate link, evidence threshold, destination review or override, and owner approval.

## Prohibited MVP Scope

- Public account creation.
- Multi-user SaaS account structures.
- Paid billing/subscription features.
- PartnerStack API automation.
- Vercel-hosted crawler workloads.
- Third-party analytics pixels.
- Unreviewed runtime React/CSS generation.

## Verification Expectations

- Every task card must declare a validation location: GitHub, Vercel, Oracle, another approved runtime, or docs-only/static inspection.
- Hosted application build/typecheck validation belongs in Vercel/GitHub, not on the local workstation.
- Oracle database/Hermes validation belongs in the approved Oracle runtime after explicit approvals.
- Do not run local `npm install`, `npm ci`, `npm run build`, local dev servers, or full local typechecks unless the operator explicitly opts into local preview.
- Record known blockers in `findings.md`.
- Keep generated local artifacts out of git.
