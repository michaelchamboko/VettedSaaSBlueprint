# Runtime baseline reconciliation

Research date: 2026-10-29, Africa/Johannesburg.

Research window: 2026-09-29 through 2026-10-29.

## Proposed change

- Keep Node.js at `24.x`.
- Keep npm at `12.0.2`, historically verified in `build-pack/receipts/phase-one-release.json` under the stable task identifier `task_evidence.RCV-004`. That receipt records verification, not owner approval.
- Change the stale runtime checker and compatibility document from npm 11 to npm 12.0.2.
- Change the direct Motion declaration from `^12.43.0` to `12.43.0`. The lockfile already resolves `motion`, `framer-motion`, and `motion-dom` to `12.43.0`, so this is a manifest and lockfile-metadata correction rather than a package upgrade.

## Compatibility findings

- **Node.js and npm.** The [npm 12.0.2 changelog](https://docs.npmjs.com/cli/using-npm/changelog/) records the selected npm release. The Phase One release receipt, `build-pack/receipts/phase-one-release.json` under `task_evidence.RCV-004`, records historical verification of Node 24 with npm 12.0.2. The `packageManager` field pins local Corepack selection.
- **Next.js and Vercel.** [Vercel supports Next.js 16.3](https://vercel.com/blog/vercel-supports-next-js-16-3) and [supports Node.js 24.x](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions). Vercel uses the explicit `vercel.json` `installCommand`, `npx --yes npm@12.0.2 ci`; this is separate from the local `packageManager` pin.
- **React and Motion.** The [Motion 12.43.0 changelog](https://motion.dev/changelog?lib=motion) records React-facing fixes in the selected release. Motion had added a React 19 test suite before 12.43.0. The repository already resolves and builds this version; an exact pin does not change runtime code.
- **Playwright and TypeScript.** This repair changes neither package nor their resolved dependency graphs. Their compatibility remains subject to the repository's existing typecheck and test gates.
- **Clean installation.** The [`npm ci` contract](https://docs.npmjs.com/cli/commands/npm-ci/) removes an existing `node_modules`, installs the locked tree, and does not rewrite either manifest file. That is the required recovery from the interrupted installation.

The required `last30days` run returned 51 items across GitHub, Hacker News, and Reddit. Its repository results confirmed the current Motion, npm CLI, and Next.js projects, but its social matches were mostly generic and did not provide stronger compatibility evidence than the primary sources above. The raw report is retained as local research evidence and is not committed because it contains broad untrusted search results.

## Security and breaking-change review

- No new package version or dependency edge is introduced.
- Motion 13 and 14 contain later breaking changes, but this repair stays on 12.43.0.
- npm 12 changed handling for unknown configuration keys. The repository already uses npm 12.0.2 and must prove the exact project configuration through a clean install and the full gate set.
- The clean npm 12.0.2 audit reported five unresolved advisories: one critical advisory affecting the pinned Next.js 16.3.4 baseline and four high-severity advisories affecting `brace-expansion`, `sharp`, `source-map-js`, and `zod`. The proposed fixes change approved direct or transitive versions, so they require a separate planning decision. These advisories block merge approval for this repair.

## Migration and validation

1. Pin the existing Motion resolution in `package.json` and root lockfile metadata.
2. Update the checker and its focused tests to require npm 12.0.2 in both `packageManager` and the Vercel `installCommand`.
3. Run `npm run verify:runtime-contract` before installation.
4. Run `npm ci`, `npm audit`, `npm run verify:agent-workflow`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `npm run validate:public-site`.
5. Verify the Vercel preview before merge because package-manager selection affects deployment installation.

Local results:

- `npm ci`: passed with npm 12.0.2; 423 packages installed in 18 minutes. The delay was local Windows extraction and linking, not a missing package or failed registry download.
- Runtime-contract tests: 6 passed, 0 failed.
- Agent workflow, lint, typecheck, full tests, production build, and public-site validation: passed. Lint retained 15 pre-existing warnings; full tests passed 397 tests with 3 expected Windows symlink skips.
- `npm audit --audit-level=high`: failed with the five advisories listed above.

## Recommendation

`hold`

The repair itself restores the checker and documentation to the historically verified npm 12.0.2 baseline and makes the existing Motion resolution reproducible. It does not claim owner approval or authorize upgrading Motion, npm, Node.js, Next.js, React, Playwright, or TypeScript. Open the repair as a reviewed draft, but do not merge it until the product owner adjudicates the vulnerable dependency baseline and the resulting audit passes.
