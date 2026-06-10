# M01 — Governance and Delivery

**Status**: Initial Step 2 module plan  
**Runtime owner**: GitHub / repository documentation  
**Validation location**: GitHub source review and docs-only/static inspection  

## Responsibility

Own project governance, state ledgers, GlobalSetup alignment, deployment-first rules, GitHub repository wiring, and Vercel URL documentation.

## Scope

- `AGENTS.md`
- `project_rules.md`
- `state.md`
- `findings.md`
- `README.md`
- `docs/deployment/*`
- Build-pack governance documents

## Task Mapping

- `T00` — Step 1 decision ledger.
- `T01` — Governance files.
- Cross-cutting corrections to deployment-first validation rules.

## Validation

- Static source inspection.
- Git diff review.
- GitHub branch/commit/PR checks where configured.
- No local app install/build/typecheck.

## Dependencies

- Upstream: approved build pack.
- Downstream: all implementation modules.
