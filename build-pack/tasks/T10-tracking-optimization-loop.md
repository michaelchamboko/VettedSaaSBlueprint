# Task T10 — Tracking and Optimization Loop

## Context Baseline

- `build-pack/07-api-contract.md`
- `build-pack/12-test-plan.md`
- `build-pack/16-definition-of-done.md`

## Must-Haves

- Track page views, CTA clicks, affiliate clicks, link errors, and FAQ expands.
- Avoid sensitive personal information.
- Generate daily optimization recommendations.
- Low-risk auto-update lane remains default-deny unless enabled.

## Target Artifacts

- Tracking tests.
- Daily metrics aggregation.
- Recommendation queue implementation.

## Verification Command

```powershell
npm test -- tracking optimization
```

Expected: tracking and recommendation tests pass.
