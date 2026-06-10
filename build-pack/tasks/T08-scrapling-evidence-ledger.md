# Task T08 — Scrapling Research and Evidence Ledger

## Context Baseline

- `build-pack/05-architecture-map.md`
- `build-pack/06-database-contract.md`
- `build-pack/12-test-plan.md`

## Must-Haves

- Scrapling runs only in Oracle worker environment.
- Scrapling is implemented as an Oracle-hosted Python runner/container controlled by Hermes.
- Crawl policies store robots, rate limit, depth, mode, and status.
- Evidence claims include source traceability and risk level.

## Target Artifacts

- Worker research modules.
- Source/evidence persistence.
- Budget guard tests.

## Verification Command

```powershell
npm test -- research evidence budget
```

Expected: research policy, evidence, and budget tests pass.
