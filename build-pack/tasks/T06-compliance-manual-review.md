# Task T06 — Compliance Profiles and Manual Review

## Context Baseline

- `build-pack/09-permissions-contract.md`
- `build-pack/13-review-gate.md`

## Must-Haves

- Compliance profiles default to incomplete/restricted.
- Manual review tasks are created for uncertain states.
- High-risk changes cannot auto-publish.

## Target Artifacts

- Compliance profile APIs/UI.
- Manual review APIs/UI.
- Gate tests.

## Verification Command

```powershell
npm test -- compliance review
```

Expected: default-deny and manual review tests pass.
