# Current Workflow

## Status

The public site is static and repository-authored. Vercel builds and deploys `main`.

## Content path

1. Decide the buyer question and exact approved destination.
2. Gather one bounded set of source-linked evidence.
3. Run the consolidated quality decision and repair only the reported fields.
4. Validate in a clean worktree, merge, verify the Vercel deployment, and smoke-test production.

## Lessons retained

- Do not make evidence collection wait for infrastructure.
- Missing low-risk evidence narrows wording; it does not create an endless research loop.
- Keep exact affiliate URLs intact and disclosures visible.
- Vercel deployment and live verification are the release proof.
