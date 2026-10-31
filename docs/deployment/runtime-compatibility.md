# Runtime Compatibility Policy

## Approved baseline

- Node.js: 24.x
- npm: 12.x (the repository installer is npm@12.0.2)
- Lockfile: npm lockfileVersion 3
- Application runtime: Vercel builds the Next.js application using `npm ci`.
- Local runtime: optional for review and validation only; it is not the production runtime.

## Contract checks

Run `npm run verify:runtime-contract` before any install, test, build, or deployment review. It verifies the direct manifest versions, lockfile versions, Node policy, and `.nvmrc`.

## Allowed baseline maintenance

- Documentation-only changes.
- Lockfile metadata updates that do not change a resolved package version, integrity value, or dependency edge.

## Controlled upgrades

Every Node.js, npm, or direct dependency upgrade requires:

1. A dedicated pull request.
2. A current record under `docs/deployment/runtime-research/`.
3. Exact direct versions in `package.json` and a reviewed `package-lock.json` diff.
4. Passing `npm run verify:runtime-contract`, `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`.
5. Passing `npm run landing:visual` and `npm run landing:quality:production` when the upgrade can affect rendering, routing, builds, or browser execution.
6. A Vercel preview deployment verified with HTTP 200 for `/`, `/admin/login`, and every changed preview route.

## Rollback

If any required check fails, restore the previous approved `package.json` and `package-lock.json` together. Do not hand-edit transitive lockfile entries to force a passing build.
