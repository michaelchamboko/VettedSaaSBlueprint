# Supervised Content Workflow

The workflow is intentionally four steps:

1. **Decide** — define the buyer question, audience, product, exact approved URL, evidence checklist, and internal-link target.
2. **Evidence** — capture bounded, source-linked observations. Use `independently_observed`, `vendor_documented`, `conflicting`, `outdated`, or `not_found`.
3. **Quality** — make one pass, repair, or blocked decision using disclosure, limitations, evidence, accessibility, links, metadata, and scanner findings.
4. **Release** — commit the repository content, validate from a clean worktree, merge to `main`, let Vercel deploy, then smoke-test production.

There is no database transition, remote worker, job lease, coordinator, external CI gate, automated publication, or artifact-upload requirement.
