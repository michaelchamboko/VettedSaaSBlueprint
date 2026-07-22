# Unattended landing-page publication

`approved-urls.md` is the sole recurring human authorization. Each active markdown bullet is one exact HTTPS affiliate URL and may result in at most one canonical public landing page. The URL string, including tracking parameters, is preserved exactly.

An allowlisted URL is not a permission to bypass safety. Automation may open a bot PR and publish only when independent durable records prove: research evidence passed, compliance passed, the page artifact has resolved evidence and CTA mappings with no placeholder identifiers, required visual/uniqueness/conversion reviews passed, daily limits remain, the global kill switch is off, and required CI plus preview deployment pass.

Unknown, missing, ambiguous, stale, or failed state blocks the URL. Generated JSON is never accepted as proof of approval, publication, evidence, or compliance.

## Manifest grammar

Only blank lines, comments beginning with `#`, and one URL per markdown bullet are accepted:

```md
- https://partner.example.com/referral?ref=exact-value&campaign=exact-value
```

Only HTTPS URLs are accepted. Fragments, embedded credentials, duplicate exact URLs, and prose entries fail validation. Removing a URL causes the corresponding page to be noindexed immediately and scheduled for archive after seven days. Removing at least two URLs and more than 25% of the prior manifest requires the explicit `ALLOW_BULK_ALLOWLIST_REVOCATION=true` CI override.

## Agent contract

Any agent begins with `npm run landing:workflow:describe -- --json`, validates the manifest with `npm run landing:allowlist:validate`, then follows the Stage 0-to-quality sequence in the landing production skill. Agents create drafts and evidence packages only; the reconciler owns state transitions, bot PR creation, and release promotion.

The startup wave is one exemplar, then three calibration pages. After a clean calibration batch, a wave is capped at ten URLs, with provider calls retried at most three times for transient failures and semantic repair capped at two attempts.
