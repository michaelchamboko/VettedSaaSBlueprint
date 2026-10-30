# Dependency security remediation

Research date: 2026-10-30, Africa/Johannesburg.

Research window: 2026-09-30 through 2026-10-30.

## Proposed change

- Upgrade `next` and `eslint-config-next` from `16.3.4` to `16.4.3`.
- Upgrade direct `sharp` from `0.35.3` to `0.35.5`.
- Upgrade direct `zod` from `4.4.3` to `4.6.7`.
- Resolve vulnerable nested `brace-expansion` copies to `1.1.21` and nested `source-map-js` copies to `1.2.2` through npm's compatible lockfile resolution.
- Preserve Node 24, npm 12.0.2, React 19.2.7, Motion 12.43.0, and unrelated dependencies.

## Evidence and compatibility

- The refreshed npm audit identified five package groups: one critical `next` group and high-severity groups for `brace-expansion`, `sharp`, `source-map-js`, and `zod`.
- The [Next.js advisory](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j) affects `next` versions `16.2.0` through `16.3.5` and lists `16.3.6` as the patch for that advisory. The selected `16.4.3` target is also above the additional `next` ranges through `16.4.0` and is the current repository-approved target from the security plan.
- The [Zod advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) affects versions below `4.6.6`; `4.6.7` is above the patched boundary.
- The [Sharp advisory](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c) affects versions below `0.35.4`; npm metadata confirms `0.35.5` supports Node 20.9 and newer.
- npm metadata confirms `next@16.4.3` supports React 18 or 19 and Node 20.9 or newer. `eslint-config-next@16.4.3` accepts the existing ESLint 9 and TypeScript 6.
- The required `last30days` run returned 19 items across GitHub and Hacker News. Recent dependency-fix pull requests independently used the same Next.js 16.4.3, Sharp 0.35.5, Zod 4.6.7, and source-map-js 1.2.2 target set. Social coverage was sparse and was not treated as authority.

## Security and migration review

- `npm audit fix --package-lock-only` resolved the remaining nested vulnerabilities without adding overrides or changing source code.
- A clean npm 12.0.2 install completed with 419 packages.
- The lockfile must be reviewed for all platform-specific Sharp packages and native postinstall scripts.
- Next.js changes require route, metadata-image, middleware, and production-build verification. Sharp changes require WebP/contact-sheet coverage. Zod changes require valid, invalid, and oversized-input schema tests.
- No database migration, content migration, API change, or design change is required.

## Validation

1. Run `npm ci` with npm 12.0.2.
2. Require `npm audit --audit-level=high` and production-only audit output to report zero high or critical vulnerabilities.
3. Run `npm run verify:runtime-contract`, `npm run verify:agent-workflow`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `npm run validate:public-site`.
4. Run `npm run landing:visual` and `npm run landing:quality:production`.
5. Exercise `/opengraph-image`, Sharp WebP/contact-sheet paths, and representative Zod validation paths.
6. Verify the Vercel preview at `/`, `/admin/login`, `/decision-hub`, and changed landing routes with desktop and mobile browser evidence.

## Local verification results

- `npm ci --no-audit --no-fund --foreground-scripts`: passed, 419 packages installed.
- `npm audit --audit-level=high`: passed, zero vulnerabilities.
- `npm audit --omit=dev --audit-level=high`: passed, zero vulnerabilities.
- `npm run verify:agent-workflow`, `npm run lint`, `npm run typecheck`, and `npm test`: passed (401 tests, 398 passed, 3 platform-specific skips).
- `npm run build`: passed with existing Next.js middleware and Edge Runtime deprecation warnings.
- `npm run validate:public-site`: passed.
- `npm run landing:visual`: passed as the repository's zero-page visual no-op.
- `npm run landing:quality:production`: blocked by the existing Stage 2 runner. Its npm subcommands did not emit the JSON shape expected by the runner, and its consolidated scanner summary contained a non-pass compliance report. No dependency or product code was changed to bypass this gate.

## Recommendation

`approve`

The direct versions are compatible with the existing Node, React, ESLint, TypeScript, and Vercel baseline. Merge remains conditional on the complete validation list, zero high or critical audit findings, independent current-head review, and exact-commit deployment verification.
