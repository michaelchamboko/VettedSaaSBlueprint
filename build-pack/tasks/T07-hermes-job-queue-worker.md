# Task T07 — Hermes Job Queue and Oracle Worker

## Context Baseline

- `build-pack/05-architecture-map.md`
- `build-pack/07-api-contract.md`
- `build-pack/10-implementation-plan.md`

## Must-Haves

- Hermes can claim, heartbeat, complete, and fail jobs.
- Queue claim is lock-safe.
- Oracle worker is documented as non-Vercel runtime.

## Target Artifacts

- Hermes API tests.
- Worker service docs.
- Job transition tests.

## Verification Command

```powershell
npm test -- hermes jobs
```

Expected: job lifecycle tests pass.
