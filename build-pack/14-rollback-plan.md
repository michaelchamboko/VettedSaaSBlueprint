# 14 — Rollback Plan

## Database Rollback

- Keep schema migrations versioned once introduced.
- Roll back additive migrations by disabling dependent code first.
- Avoid destructive migrations in MVP unless explicitly approved.
- Back up Oracle Autonomous Database before applying production schema changes, noting Always Free backup/restore limitations.

## Vercel Rollback

- Use Vercel deployment history to roll back app releases.
- Keep environment variables stable across rollbacks.
- Disable publishing actions if a release affects compliance gates.

## Oracle Hermes Rollback

- Stop Hermes service if worker behavior is unsafe.
- Mark active jobs as queued or failed according to retry policy.
- Disable scheduled research cycles before rolling back worker image/code.
- Preserve crawl/evidence audit records.

## Content Rollback

- Pause or noindex affected dynamic pages.
- Revert `dynamic_pages.current_version_id` to a prior approved version.
- Log rollback reason in `audit_log`.
- Create manual review task for republish.

## Affiliate Link Rollback

- Disable suspicious links.
- Restore prior approved PartnerStack referral URL if destination changed.
- Do not substitute final redirected URLs.
