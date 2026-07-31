# URL-to-Live Landing Automation

## Outcome

Giving a repository-capable AI agent one exact affiliate URL authorizes the complete normal run:

`URL -> research -> structured page -> automatic checks and repairs -> GitHub change -> Vercel preview -> production deployment -> live verification -> recorded result`

A draft, preview, plan, review report, pull request, successful build, or deployment request is not completion. Completion is `LIVE`: the canonical Vercel route responds successfully, renders the reviewed page, shows the affiliate disclosure, preserves the exact affiliate URL on every CTA, passes desktop and mobile verification, and records the production commit and deployment.

## One entry point

Run:

```text
npm run landing:run -- --url <exact-https-affiliate-url>
```

Running the same command again resumes the existing URL run. The command must return one current state and one exact next action.

## Durable authority and research prep

Neon Postgres is the sole durable workflow and publication authority. The
Oracle-hosted Hermes worker owns product identity and research compute but may
not advance state from local files or receipts. Before research dispatch, run:

```text
npm run landing:research:preflight
```

The preflight validates `approved-urls.md` and reports whether the control Neon
credential, least-privilege Oracle-worker Neon credential, and both approved
Hermes executor contracts are configured. It never prints their values. A
blocked preflight is an exact external configuration blocker, not permission to
substitute local research.

Status on 2026-07-31: the repository preflight is implemented. Activation
remains blocked until the four named authorities are configured outside source.
No Hermes research or Neon workflow transition has been claimed from the
preflight implementation.

## Zero recurring approval

- Submitting the exact URL is the recurring authorization to create the page, add the URL to `approved-urls.md` when absent, create and merge the GitHub change, deploy to the existing Vercel project, verify production, repair failures, and restore the previous production deployment when necessary.
- Normal URL runs never stop at a human-review or publication-handoff stage.
- Manual review is an exception used only when the operator explicitly requests it.
- Zero approval does not remove disclosure, evidence, link-integrity, quality, CI, preview, or live verification checks. Those checks repair and continue whenever a safe repair exists.

## Automatic recovery

- Retry temporary source or network failures at most three times.
- Repair page content or design at most twice per failed quality cycle.
- Remove or soften unproved pricing, discount, guarantee, ranking, security, or urgency claims and continue.
- Use the closest approved design references or approved house style when no exact category match exists.
- If Neon or an approved Hermes executor is unavailable, pause at the durable stage and report the exact missing authority. Do not substitute local state or research.
- If production verification fails, restore the previous working deployment, repair the failed layer, and retry at most twice.

## Legitimate stop

`NEEDS_HELP` is allowed only when the run records what it tried and one of these remains true:

- GitHub or Vercel access is unavailable.
- The required Neon authority or approved Hermes research executor is unavailable.
- The exact affiliate URL remains unusable after three checks.
- The product cannot be identified honestly from public evidence.
- A useful compliant page cannot be produced after two repair cycles.
- Build or deployment still fails after two distinct repairs.
- The previous production deployment cannot be restored after a failed release.

The report must use plain English and include: what was attempted, what happened, what was repaired or retried, the user impact, and the one exact human action required.

## Current exemplar

The first proof is the approved ElevenLabs URL:

```text
https://try.elevenlabs.io/izj2b165mcsj
```

Expected production route:

```text
/landing-page-builders/elevenlabs-ai-voice-generator
```
