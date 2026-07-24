# Unattended landing-page publication

Submitting the exact affiliate URL through `npm run landing:run -- --url <url>` authorizes the complete normal production run. The coordinator records it in `approved-urls.md`, and each active markdown bullet may result in at most one canonical public landing page. The URL string, including tracking parameters, is preserved exactly.

An allowlisted URL is not a permission to bypass safety. Automation may open a bot PR and publish only when independent durable records prove: research evidence passed, compliance passed, the page artifact has resolved evidence and CTA mappings with no placeholder identifiers, required visual/uniqueness/conversion reviews passed, daily limits remain, the global kill switch is off, and required CI plus preview deployment pass.

Unknown, missing, ambiguous, stale, or failed state enters a bounded repair route. It blocks release only when it remains unresolved after the allowed attempts. Generated JSON is never accepted as proof of release authorization, publication, evidence, or compliance.

Passing quality output is `eligible_for_release`, not a human-review handoff. The independent `LandingReleaseReceiptV1` binds the exact authorized URL, reviewed commit, artifact fingerprints, check results, and verified deployment.

Oracle synchronization is optional for this path. Oracle pending or unavailable does not block GitHub/Vercel release; the receipt records `oracle_sync` as `pending` or `not_configured` and synchronization may complete later.

## Manifest grammar

Only blank lines, comments beginning with `#`, and one URL per markdown bullet are accepted:

```md
- https://partner.example.com/referral?ref=exact-value&campaign=exact-value
```

Only HTTPS URLs are accepted. Fragments, embedded credentials, duplicate exact URLs, and prose entries fail validation. Removing a URL causes the corresponding page to be noindexed immediately and scheduled for archive after seven days. Removing at least two URLs and more than 25% of the prior manifest requires the explicit `ALLOW_BULK_ALLOWLIST_REVOCATION=true` CI override.

## Agent contract

Any repository-capable agent may run `npm run landing:run -- --url <url>`. The coordinator validates the manifest, resumes durable state, routes failed checks to repairs, creates the GitHub change, verifies Vercel preview and production, and records `LIVE`. The agent remains responsible for performing the returned next action until the run is live or a legitimate `NEEDS_HELP` result is recorded.

The startup wave is one exemplar, then three calibration pages. After a clean calibration batch, a wave is capped at ten URLs, with provider calls retried at most three times for transient failures and semantic repair capped at two attempts.
