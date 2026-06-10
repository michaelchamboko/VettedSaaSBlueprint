# Build Plans

This directory contains the human-readable Step 2 build plans. These plans sit between the contracts and the task cards:

```text
PRD -> contracts -> build plans -> module plans -> task cards -> GitHub/Vercel/Oracle validation
```

The build plans are intentionally deployment-first:

- Source and plans are updated in GitHub.
- Vercel validates the Next.js application.
- Oracle validates database/Hermes work after explicit approvals.
- Local application installs, local production builds, local dev servers, and full local typechecks are not default validation gates.

## Plans

1. `01-build-plan-index.md` — module-level build plan index.
2. `02-ui-ux-build-plan.md` — owner control plane and public landing-page UX plan.

