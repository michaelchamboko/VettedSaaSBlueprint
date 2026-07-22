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

## Evidence required before preview approval

Record the following against the reviewed Git SHA:

- owner approval of the rendered brand, email, home address, sole-proprietor
  wording, email-only contact, no-payment language, and policy effective date
- legal approval of the privacy notice, terms, affiliate disclosure, editorial
  policy, full PAIA manual, accessibility statement, and Information Officer evidence
- passing intent, uniqueness, compliance, conversion, route, SEO, accessibility,
  responsive, asset, link, and publication-readiness scanner reports
- audited owner publication evidence for every review exposed by the catalogue

Zero eligible review artifacts is a valid release state. In that state the
homepage must show the honest empty state, dynamic review routes must not be
generated, and the sitemap must contain no review URL.

## Preview procedure

1. Open a draft pull request from the release branch and require all GitHub checks.
2. Confirm the preview was built from the reviewed Git SHA and reached `READY`.
3. Record the preview URL and its Vercel deployment/build URL in the release record.
4. Verify at 360, 768, 1024, and 1440 CSS pixels: navigation, catalogue or empty
   state, legal pages, keyboard operation, focus visibility, 200% zoom, reduced
   motion, disclosure proximity, review return navigation, and horizontal overflow.
5. Confirm no public page links to the owner console and `/admin` remains protected.

## Production procedure

Build the reviewed branch head using Production-scoped Vercel values. Do not
deploy the dirty local working tree. Confirm that the production-target build:

- reports the same Git SHA as the approved preview
- passes `npm run validate:public-site` before `next build`
- reaches `READY` before the canonical alias is assigned

Record the production build URL, deployment URL, Git SHA, approvals, and scanner
evidence. Then assign `https://vetted-saa-s-blueprint.vercel.app` to that deployment.

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

If any production smoke, legal identity, admin isolation, affiliate routing, or
approved-only indexing check fails, immediately promote the previously `READY`
production deployment. Leave analytics disabled. Record the failed deployment
URL and failing check, fix the release branch, and repeat preview approval before
another production promotion.
