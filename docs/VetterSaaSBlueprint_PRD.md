# Vetted SaaS Blueprint PRD

Vetted SaaS Blueprint is a static, evidence-led SaaS content site. It helps buyers make decisions through reviews, comparisons, alternatives, category guides, implementation guides, and evidence studies.

## Product boundary

- Public pages and source evidence live in the repository.
- Content follows decide, evidence, quality, release.
- Every material claim has source-linked support or is narrowed or removed.
- Reviews show an editorial verdict, fit, poor fit, limitations, update date, sources, disclosures, and internal links.
- Exact approved affiliate URLs are rendered directly. No redirect or click-tracking service exists.
- There is no public account, private admin surface, database, worker, queue, or analytics ingestion runtime.

## Release

An approved content change is validated in a clean worktree, merged to `main`, built and deployed by Vercel, then smoke-tested in production.
