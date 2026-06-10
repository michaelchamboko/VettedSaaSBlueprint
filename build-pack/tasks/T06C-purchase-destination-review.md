# Task T06C — Purchase Destination Review

## Context Baseline

- `build-pack/17-offer-intelligence-folder-and-conversion-continuity.md`
- `build-pack/08-ui-contract.md`
- `build-pack/09-permissions-contract.md`

## Must-Haves

- Review the page reached by the owner-provided affiliate URL without replacing the original affiliate URL.
- Capture redirect chain metadata for audit/review only.
- Extract message match cues, CTA language, offer promise, pricing/trial/guarantee claims, trust cues, friction notes, visual affinity profile, and compliance warnings.
- Use the review to guide landing-page design variants, motion profile, CTA labels, and expectation alignment.
- Require a current destination review or explicit owner override before first publication.

## Target Artifacts

- Destination review schema/API contract.
- Hermes destination-review job type.
- Owner UI review panel.
- Tests for original affiliate URL preservation and review gating.

## Verification Command

```powershell
npm test -- destination-review conversion-continuity affiliate-url
```

Expected: review data is captured, original affiliate URL is preserved, and page publication is blocked without review or owner override.
