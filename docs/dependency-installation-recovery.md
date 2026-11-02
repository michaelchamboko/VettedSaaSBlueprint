# Recover an incomplete dependency installation

Use this procedure when a mandatory check fails while loading an installed package, before it checks application code. ISSUE-20261102-002 reproduced this with ESLint 9.39.4 missing its internal `shared/ast-utils` module. Adding a substitute `assert.js` did not repair the package.

1. Record the command, error, runtime versions, current commit, and pending manifest changes in the canonical issue log. Preserve local work before reconciling it. Verify that the package and lockfile still describe the intended pinned versions.
2. Finish or stop other package installation processes for the same checkout. Reinstall the complete dependency graph from the committed lockfile with `npm ci`. If the existing cache is suspect, select a new writable cache directory with `--cache <recovery-cache>` and use `--prefer-online`. Wait for a successful exit before testing the installation.
3. Run `npm run lint` without bypasses. Then run `npm run verify:agent-workflow`, `npm run typecheck`, and `npm test`, plus the build and public-release checks required by the changed scope. Record actual outcomes. Restored files alone do not prove the gate passes.
4. Reconcile the scoped changes through the required review, PR, merge, and deployment workflow. Confirm the primary checkout and remote main point to the merged commit, and verify the production deployment's source commit. Preserve audit evidence outside the checkout if it is not a tracked deliverable.
5. Hand continuation back to the existing article supervisor. Resume the same immutable intake through supported operations only after the shared capability failure is resolved. A repaired tool installation does not establish article approval or publication.

Do not implement missing third-party internals by hand, loosen version pins to conceal an installation problem, disable lint rules to avoid a loading failure, or replace actual browser checks with scripts that write passing results. Existing presentation evidence created that way must be replaced by genuine verification before release.

`node_modules` is generated local state and is not committed or uploaded as the repair. The repository's Vercel installation command already uses `npm ci`; its build must independently pass against the merged source.
