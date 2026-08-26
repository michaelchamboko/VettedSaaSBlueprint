# Vetted SaaS Blueprint

This is a static, single-operator affiliate-content site deployed by Vercel.

## Working rules

- Keep the solution small, direct, and verifiable.
- Public pages are rendered only from repository content. There is no database, worker, queue, admin runtime, login, analytics ingestion, or affiliate redirect service.
- Preserve exact approved affiliate URLs, visible disclosures, honest claim wording, accessibility, metadata, sitemap, robots, and existing public routes.
- Use the four-stage workflow: decide, evidence, quality, release.
- Evidence is bounded. Mark unavailable material `not_found`; narrow or remove unsupported low-risk claims and block unsupported high-risk claims.
- One consolidated quality result is authoritative: pass, repair, or blocked. Specialist scanners are repair aids, not sequential publication authorities.
- GitHub stores and merges code. Run focused validation in a clean worktree. Vercel is the sole hosted build and deployment system; verify the live deployment after merge.
- Do not add external release gates, automated publication, databases, remote workers, queues, or external tracking without explicit approval.
- Never print secrets or change external infrastructure without explicit approval.
