# Landing Workflow

## Outcome and authority

The normal workflow begins with one exact affiliate URL and ends only at a verified production page:

`URL -> research -> structured page -> automatic checks and repairs -> GitHub PR -> Vercel preview -> merge -> production -> live verification -> LIVE receipt`

Submitting the URL to `npm run landing:run -- --url <exact-https-affiliate-url>` authorizes that complete run. Calling the same command again resumes it. Manual review exists only when the operator explicitly asks for it; it is not a stage in the normal path.

The exact URL is recorded in root `approved-urls.md` and must be preserved byte-for-byte in every affiliate CTA. The URL authorizes release work but never replaces evidence, disclosure, compliance, quality, CI, preview, or production checks.

## Coordinator contract

The run coordinator stores a durable `LandingRunV1` record in Neon Postgres and returns exactly one next action. Its public state is one of:

- `WORKING`: research, evidence, authoring, packaging, or verification is in progress.
- `FIXING`: a failed check has been routed to a bounded repair.
- `DEPLOYING`: GitHub or Vercel release work is in progress.
- `LIVE`: the canonical production route passed every live check and the release receipt is recorded.
- `NEEDS_HELP`: all allowed recoveries were attempted and one precise external action is required.
- `STOPPED`: the URL was deliberately stopped by the operator.

Completed stages are fingerprinted and retained. A rerun never discards valid upstream work.

Neon Postgres is the durable workflow authority. No job may advance or publish until the result is recorded in Postgres by the fenced transaction. The Oracle-hosted Hermes worker is mandatory for `product_identity` and `research`; local research and local receipts are not substitutes.
## Automatic stage sequence

### 1. Intake and research

- Validate the exact HTTPS affiliate URL and follow redirects without replacing the supplied CTA value.
- Identify the product honestly and capture current public evidence.
- Retry temporary source/network failures up to three times.
- Stop only if the destination remains unusable or the product cannot be identified honestly.

**Handoff:** a fingerprinted product evidence pack and exact-URL record move directly to design direction.

### 2. Design direction and intent

- Validate the stored reference catalogue.
- Prefer three approved references with explicit hero/typography, sections/CTA, and motion/mobile roles.
- If no exact category match exists, use the closest eligible references or approved house style and record the fallback.
- Produce `DesignDirectionV1`, `PresentationRecipeV1`, and a buyer-specific intent.

**Handoff:** a validated intent and recipe move directly to drafting.

### 3. Draft and preview

- Produce structured JSON only; approved repository code renders it.
- Preserve disclosure and the exact affiliate URL.
- Render the production-identical noindex preview.

**Handoff:** a fingerprinted page plus desktop/mobile preview evidence moves directly to quality checks.

### 4. Quality and repair

- Run visual, uniqueness, compliance, conversion, static, and link checks in order.
- A failure returns the exact field, reason, and repair action.
- Run at most two content/design repair rounds.
- Remove or soften unproved pricing, discount, guarantee, ranking, security, or urgency claims.
- Use the approved simpler layout when optional imagery, motion, or styling fails.

Passing conversion output is `eligible_for_release`. A page cannot mark itself published; independent gate records and the final release receipt provide publication authority.

**Handoff:** matching fingerprints and passing gates move directly to release.

### 5. GitHub and Vercel release

- Create a branch and pull request.
- Run focused landing checks, tests, type checking, linting, build, and Vercel preview.
- Verify preview HTTP status, exact CTA, disclosure, responsive rendering, overflow, browser errors, and robots policy.
- Merge automatically after required checks pass; the existing Vercel Git connection deploys `main`.
- Verify the production commit, deployment, route, exact CTA, disclosure, robots policy, sitemap, desktop/mobile rendering, browser errors, and HTTP success.
- Retry temporary GitHub/Vercel failures up to three times.
- If a real production verification fails, restore the previous working deployment, repair the failed layer, and retry release at most twice. Never manufacture a failure for rollback evidence.

**Handoff:** only a passing canonical production route creates `LandingReleaseReceiptV1` and changes the run to `LIVE`.

## Legitimate `NEEDS_HELP`

`NEEDS_HELP` is valid only after the run records every attempted recovery in plain English and one of these remains:

- GitHub or Vercel access is unavailable.
- The affiliate destination is unusable after three checks.
- The product cannot be identified honestly.
- A useful compliant page cannot be produced after two repair rounds.
- Build or deployment still fails after two distinct repairs.
- A prior working production deployment cannot be restored after a failed release.

The report must say what was tried, what happened, the user impact, and the one exact action required.

## Commands

```text
npm run landing:run -- --url <exact-https-affiliate-url>
npm run landing:research:preflight
npm run landing:workflow:describe -- --json
npm run landing:allowlist:validate
npm run landing:references:validate
```

Preview routes use `/landing-page-previews/<slug>` with `noindex,nofollow`, suppressed analytics, and the exact affiliate destination. Public routes use `/landing-page-builders/<slug>` and are accepted only when the tracked release receipt and all referenced fingerprints match.
