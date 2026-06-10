# Task T09 — Page Drafting, Compliance Gate, Publishing

## Context Baseline

- `build-pack/08-ui-contract.md`
- `build-pack/09-permissions-contract.md`
- `build-pack/13-review-gate.md`

## Must-Haves

- Direct-review page JSON validates before persistence.
- Publication requires disclosure, evidence score, limitations, active affiliate link, and manual approval.
- Published pages use ISR and approved version state.

## Target Artifacts

- Page blueprint/version APIs.
- Approval/publish/noindex/pause APIs.
- Compliance gate tests.

## Verification Command

```powershell
npm test -- pages publish compliance
```

Expected: unsafe page drafts are blocked; approved safe drafts publish.
