# M05 — Hermes Research and Evidence

**Status**: Initial Step 2 module plan  
**Runtime owner**: Oracle Hermes / Oracle worker environment  
**Validation location**: Oracle runtime after explicit approval, GitHub source review for worker code  

## Responsibility

Own Hermes job queue integration, Oracle worker behavior, budget guard, Scrapling research, research source persistence, and evidence ledger.

## Scope

- `hermes/worker.ts`
- `src/app/api/hermes/*`
- Job lifecycle APIs.
- Research/evidence persistence contracts.
- Budget guard and source policy logic.

## Task Mapping

- `T07` — Hermes job queue and Oracle worker.
- `T08` — Scrapling research and evidence ledger.

## Validation

- GitHub source review/checks for code.
- Oracle runtime checks only after explicit approval.
- Hermes can claim/heartbeat/complete/fail a test job in approved environment.
- No Vercel crawler workloads.
- No local app install/build/typecheck.

## Dependencies

- Upstream: M02 database foundation, M04 offer intelligence.
- Downstream: page drafting, compliance gate, optimization.
