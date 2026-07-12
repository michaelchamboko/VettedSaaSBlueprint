# Landing-page preview workflow

Use this workflow when the operator supplies a working affiliate URL and wants
to inspect the next editorial v2 page immediately, but the audited Oracle
publication records are not yet resolved.

## Preview behavior

- Create a page-specific editorial v2 preview under
  `src/generated/landing-page-previews/next-50/`.
- Preserve the exact supplied affiliate URL in the preview CTA.
- Render it at `/landing-page-previews/<slug>` on the existing Vercel project.
- Set `robots` to `noindex,nofollow` and label the page as a review preview.
- Keep the VettedSaaSBlueprint home, footer trust links, concise disclosure, and
  one static no-wrap CTA in the preview renderer.
- Share the Vercel preview URL after the deployment reaches `READY`.

## What a preview is not

A preview is not a production review, an approved affiliate-link record, a
compliance pass, a destination approval, or an owner publication decision. It
must not be added to `src/generated/landing-pages/index.json`, the homepage
catalogue, or the sitemap. Existing live pages remain untouched.

## Promotion path

Before promotion to `/landing-page-builders/<slug>`:

1. Resolve the affiliate-link, destination, program-rule, disclosure,
   material-connection, evidence, review-basis, and compliance records.
2. Run the intent, draft, uniqueness, compliance, and conversion gates.
3. Obtain audited owner approval for first publication.
4. Publish through the Oracle atomic transaction and let the artifact exporter
   write genuine publication provenance into the production manifest.
5. Verify the production route, disclosure, sponsored link, sitemap, and public
   catalogue on the exact reviewed Git SHA.
