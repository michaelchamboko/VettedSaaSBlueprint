# Research recovery and dependency security

Research date: 2026-11-03. Window: 2026-10-04 through 2026-11-03.

The owner authorized combining PR #45 with mandatory article research recovery, then review, merge, deployment and cleanup of obsolete clean merged worktrees.

## Dependency changes

| Package | Before | After |
| --- | --- | --- |
| next | 16.3.4 | 16.4.5 |
| eslint-config-next | 16.3.4 | 16.4.5 |
| sharp | 0.35.3 | 0.35.5 |
| zod | 4.4.3 | 4.6.7 |

PR #45 proposed Next.js 16.4.3. Current research found the [16.4.5 security release](https://github.com/vercel/next.js/releases/tag/v16.4.5), so this combined repair uses the newer patch. Its release API lists seven moderate cache, response, image and cookie advisories. The [16.4.3 notes](https://github.com/vercel/next.js/releases/tag/v16.4.3) describe backported fixes.

The [Sharp 0.35.5 release](https://github.com/lovell/sharp/releases/tag/v0.35.5) updates bundled native dependencies and array bounds checks. The baseline audit identifies patched Sharp versions for the affected native libraries. The [Zod advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) affects versions below 4.6.6; [4.6.7](https://github.com/colinhacks/zod/releases/tag/v4.6.7) is the selected fixed patch.

Official npm metadata for Next.js 16.4.5 declares Node >=20.9.0, React/React DOM ^19.0.0 and Playwright ^1.51.1 support. Sharp 0.35.5 also requires Node >=20.9.0. This repository uses Node 24, React/React DOM 19.2.7 and Playwright 1.61.1. The pinned npm 12.0.2 clean install, production build and typecheck passed with these versions. No application migration is assumed; TypeScript 6 compatibility is checked with the repository typecheck. The [Next.js upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16) provides the major-version requirements. The application already uses Next.js 16.

The runtime validator changes from PR #45 check the npm@12.0.2 package-manager pin and Vercel's matching install command. Retain main's npm 11 rejection test. Regenerate lockfiles using npm; do not hand-merge them. Do not use audit --force to downgrade ESLint.

## Research execution and limitations

Ran the installed last30days 3.8.0 engine with an explicit query plan naming the package versions, Next.js/Vercel compatibility and the security upgrade. Targeted vercel/next.js, lovell/sharp and colinhacks/zod, plus nextjs/reactjs/webdev/javascript communities. Quick mode selected the primary subquery. The first run completed search but hit the Windows path-length limit when saving. The retry saved to a short temporary path.

The successful run returned 13 items across GitHub, Hacker News and Reddit. Several Reddit results were unrelated and were excluded from compatibility conclusions. A GitHub connection reset limited coverage of Zod; official release and advisory pages supplied that evidence. No paid research provider or model fallback was used. Raw output is retained with the local evidence bundle. Official package metadata, release notes, audit output and repository checks determine compatibility.

The initial npm ci audit reported 21 affected packages: 1 critical, 4 high and 16 moderate. An intermediate constrained audit fix removed the critical/high findings, while the development lint dependency graph still reported minimatch's moderate advisory. Final audit results are recorded in the verification evidence; do not infer zero vulnerabilities from the older PR.

## Research recovery verification

The initial focused tests failed because the research packet did not explicitly require conducting research, and TRANSFORMING with missing evidence stayed at TRANSFORMING. The repair adds explicit research instructions and returns pre-release work to RESEARCHING when retained research fails validation. Valid existing evidence remains reusable.

Tests cover invalid excerpts, unchanged-submission rejection, valid repaired evidence, missing/corrupted research at every downstream stage, preservation of diagnosis gates and preservation of existing release journals and fresh result bindings after semantic research recovery. A research-only recovery generation prevents replaying old research results while retaining those files for history. Downstream packets retain their existing identity contract and must pass their evidence-binding checks again. An existing release with invalid research is an integrity-recovery case. The workflow retains its PR/commit/rollback state and prohibits further release actions until explicit verified recovery.

Semantic freshness and claim sufficiency remain scoped research and assessment judgments. The byte/schema validator does not claim to prove those judgments automatically.

## Validation and decision

Required: runtime contract, workflow checks, lint, typecheck, all tests, build, public-site validation, audit at high severity, independent review of the final head and production verification of the merged commit.

Recommendation: approve only after those checks and review pass. Preserve any remaining moderate development-tool advisory as an explicit limitation; do not weaken the research or release gates.
