# Unattended landing-page publication

Submitting an exact affiliate URL for recurring research is permitted only when the byte-for-byte URL is already present in `approved-urls.md`; the Neon control transaction records the manifest digest and source commit alongside the job. Local run files never authorize or advance it. The URL string, including tracking parameters, is preserved exactly.

An allowlisted URL is not a permission to bypass safety. Automation may open a bot PR and publish only when independent durable records prove: research evidence passed, compliance passed, the page artifact has resolved evidence and CTA mappings with no placeholder identifiers, required visual/uniqueness/conversion reviews passed, daily limits remain, the global kill switch is off, and required CI plus preview deployment pass.

Unknown, missing, ambiguous, stale, or failed state enters a bounded repair route. It blocks release only when it remains unresolved after the allowed attempts. Generated JSON is never accepted as proof of release authorization, publication, evidence, or compliance.

Passing quality output is `eligible_for_release`, not a human-review handoff. The independent `LandingReleaseReceiptV1` binds the exact authorized URL, reviewed commit, artifact fingerprints, check results, and verified deployment.

Neon Postgres is the durable workflow authority. No job may advance or publish until the result is recorded in Postgres by the fenced transaction. The Oracle-hosted Hermes worker is mandatory for product identity and research; local research and local receipts are not substitutes.

## Manifest grammar

Only blank lines, comments beginning with `#`, and one URL per markdown bullet are accepted:

```md
- https://partner.example.com/referral?ref=exact-value&campaign=exact-value
```

Only HTTPS URLs are accepted. Fragments, embedded credentials, duplicate exact URLs, and prose entries fail validation. Removing a URL causes the corresponding page to be noindexed immediately and scheduled for archive after seven days. Removing at least two URLs and more than 25% of the prior manifest requires the explicit `ALLOW_BULK_ALLOWLIST_REVOCATION=true` CI override.

## Agent contract

Any repository-capable agent may run
`npm run landing:research:prep -- --url <exact-url>` for an allowlisted URL.
The command validates the manifest and resumes durable Neon state. It must stop
with the exact missing authority when Neon or an approved Hermes executor is
unavailable; it may not substitute local research or claim publication.

The startup wave is one exemplar, then three calibration pages. After a clean calibration batch, a wave is capped at ten URLs, with provider calls retried at most three times for transient failures and semantic repair capped at two attempts.
