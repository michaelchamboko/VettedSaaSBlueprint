# Runtime contract reconciliation with npm 12.0.2

Approved EGM plan, 2026-10-31.

Keep npm 12.0.2. Pin Motion to the existing locked 12.43.0 release. Align `package.json`, the runtime validator, runtime tests, deployment policy, and planning authority. Preserve Node 24.x, lockfileVersion 3, exact direct dependency checks, and rollback of manifest and lockfile together.

Implementation files: `package.json`, `package-lock.json`, `scripts/verify-runtime-contract.mjs`, `tests/runtime-contract.test.ts`, `docs/deployment/runtime-compatibility.md`, `planning.md`.

Verification: runtime contract, focused tests, verify:agent-workflow, lint, typecheck, npm test, build, public-site validation, exact-head independent review, PR checks, merge identity, Vercel deployment identity, and production HTTP checks.

Release constraint: inspect and authorize the exact GitHub payload; do not bypass egress review.

Drafted with EGM.
