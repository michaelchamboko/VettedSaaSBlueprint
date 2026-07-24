# VettedSaaSBlueprint public-site release

This runbook releases the public review hub through the existing Vercel project
`vetted-saa-s-blueprint`. It does not create a new Vercel or Sites project.

## Fixed public identity

- Trading name: VettedSaaSBlueprint
- Structure: South African sole proprietorship
- Public email: vettedsaasblueprint@proton.me
- Public address: 3 Wagner Lane, Sagewood, Johannesburg, Gauteng, South Africa
- Registration number and public telephone: not applicable

The site is an editorial affiliate publication. It does not sell products,
accept payments, or control transactions completed on a vendor site.

## Required release values

Configure these names in GitHub Actions repository variables and in both the
Vercel Preview and Production environments:

- `PUBLIC_POLICY_EFFECTIVE_DATE`: the scheduled promotion date in `YYYY-MM-DD`
- `INFORMATION_OFFICER_REGISTRATION_CONFIRMED_AT`: the evidence timestamp in ISO 8601 format
- `PUBLIC_SITE_ORIGIN`: `https://vetted-saa-s-blueprint.vercel.app`

Use the Vercel environment-variable listing to confirm that each name exists in
both scopes. Do not print, copy into logs, or commit the values. If the promotion
date changes, update GitHub and both Vercel scopes, then rebuild the preview.

Application analytics remains disabled unless `ANALYTICS_ENABLED=true` and a
valid `ANALYTICS_RETENTION_VERIFIED_AT` is configured. Keep analytics disabled
for the initial release.

## Evidence required before preview release

Record the following against the reviewed Git SHA:

- the exact allowlisted affiliate URL and its URL fingerprint
- the independently checked brand, identity, legal, disclosure, and Information
  Officer configuration used by the build
- passing intent, uniqueness, compliance, conversion, route, SEO, accessibility,
  responsive, asset, link, and publication-readiness scanner reports
- a fingerprint-bound `LandingReleaseReceiptV1` for every agent-led review
  exposed by the catalogue, or the existing audited Oracle publication record

Zero eligible review artifacts is a valid release state. In that state the
homepage must show the honest empty state, dynamic review routes must not be
generated, and the sitemap must contain no review URL.

## Preview procedure

1. The URL-to-live coordinator opens a ready pull request from the release branch.
2. Require all GitHub checks and confirm the Vercel preview was built from the
   reviewed Git SHA and reached `READY`.
3. Record the preview URL and Vercel deployment identity in the release receipt.
4. Automatically verify at 360, 768, 1024, and 1440 CSS pixels: navigation, catalogue or empty
   state, legal pages, keyboard operation, focus visibility, 200% zoom, reduced
   motion, disclosure proximity, review return navigation, and horizontal overflow.
5. Confirm no public page links to the owner console and `/admin` remains protected.
6. If a check fails, repair the named page or release layer and rerun the same
   coordinator. A preview check is not a routine human handoff.

## Production procedure

After the required checks pass, merge the reviewed pull request automatically
and let the existing Vercel Git connection deploy `main`. Never deploy a dirty
local working tree. Confirm that the production deployment:

- reports the same Git SHA as the approved preview
- passes `npm run validate:public-site` before `next build`
- reaches `READY` and serves the canonical production alias

Record the production URL, deployment identity, Git SHA, release receipt, and
scanner evidence. Oracle synchronization may be `pending` or `not_configured`;
that state does not block a fingerprint-bound agent release.

## Production smoke checks

Require HTTP 200 for:

- `/`
- `/privacy`
- `/terms`
- `/contact`
- `/affiliate-disclosure`
- `/editorial-policy`
- `/paia`
- `/accessibility`
- `/robots.txt`
- `/sitemap.xml`

Also verify `/admin` authentication isolation. If an audited review exists, its
route must return 200 with a visible affiliate disclosure and sponsored link. If
none exists, the sitemap review set must be empty. Confirm the browser emits no
application analytics request while analytics is disabled and when GPC or DNT is active.

## Rollback

Only after a real production smoke, legal identity, admin isolation, affiliate
routing, or authorized-only indexing failure, restore the previously working
production deployment. Leave analytics disabled. Record the failed deployment
and exact check, repair the failed layer, rerun preview verification, and retry
production at most twice. Do not manufacture a failure merely to demonstrate rollback.
