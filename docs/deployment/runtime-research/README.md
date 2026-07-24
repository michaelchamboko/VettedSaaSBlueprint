# Runtime Upgrade Research Records

Every pull request that changes Node.js, npm, or a direct dependency version must include one research record in this directory.

## Required current research

1. Check whether the `last30days` skill is installed before researching:
   - Codex path: `%USERPROFILE%\\.agents\\skills\\last30days\\SKILL.md`
   - Alternative Codex path: `%USERPROFILE%\\.codex\\skills\\last30days\\SKILL.md`
2. If the skill is installed, read its `SKILL.md` completely and run its engine with a query naming the package, target version, Next.js/Vercel compatibility, and the exact change being considered. Use the skill's current required planning and citation format.
3. If the skill is not installed, do not install it automatically. Request operator approval to install it. Until approval is granted, research only primary sources: official release notes, official migration guides, official security advisories, the package repository release page, and Vercel deployment documentation.
4. Record sources as inline Markdown links. Never place credentials, environment values, cookies, or raw API responses in the record.

## Required record format

- Proposed change and exact before/after versions.
- Research date and the 30-day date range.
- Compatibility findings for Node.js, Next.js, React, Vercel, Playwright, and TypeScript where relevant.
- Security advisories or breaking changes found.
- Migration steps required by primary documentation.
- Validation commands that will prove the upgrade.
- Recommendation: `approve`, `defer`, or `reject`.

## Decision rule

Approve only when the candidate has an explicit compatibility path, no unresolved high-severity advisory, and a complete validation plan. Otherwise defer the upgrade and leave the baseline unchanged.
