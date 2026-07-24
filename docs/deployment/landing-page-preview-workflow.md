# Landing-page preview workflow

Use this workflow when the operator supplies a working affiliate URL and wants
to inspect the next reference-composed page immediately, but the audited Oracle
publication records are not yet resolved. Existing live pages remain unchanged.

## Stage 0: design direction

Before drafting:

1. Validate `docs/design-references/landing-pages/catalogue.json` and every
   stored desktop/mobile capture hash. Ingestion is incremental; page generation
   does not browse the reference sites again.
2. Select three references by default. Two are allowed only when they cover at
   least four design dimensions, and at least one reference must match or closely
   neighbour the product category.
3. Assign roles for hero/typography, sections/CTA, and motion/mobile. Record the
   IDs, hashes, adopted abstract principles, non-copy boundaries, rationale, and
   one-line design read in `DesignDirectionV1`.
4. Stop with `hold_for_design_direction` if the catalogue cannot supply a valid
   selection. Do not fall back to a generic template.

## Preview behavior

- Create a validated `PageBlueprint` draft under
  `src/generated/landing-page-batches/<batch-id>/drafts/<slug>.json` with its
  product pack, design-directed intent, `PresentationRecipeV1`, and separate
  gate reports in the same batch workspace.
- Use `reference_composed_v1` for new drafts. The recipe selects only registered
  hero, typography, section, CTA, motion, and mobile variants; it cannot contain
  page-specific JSX, CSS, or JavaScript and cannot silently fall back to an older
  profile.
- Preserve the exact supplied affiliate URL in the preview CTA.
- Render it locally and on Vercel at `/landing-page-previews/<slug>` through the
  same static renderer and `LandingPageMotion` component as production.
- Force the preview route to `noindex,nofollow`, suppress production analytics,
  and keep the visible disclosure, content, CTA, reduced-motion behavior, and
  fixed `gsap_editorial` motion profile production-identical.
- Generate desktop/mobile first-viewport and full-page captures, 320px/360px
  CTA and overflow checks, motion/reduced-motion frames, and contact sheets
  against the selected references. Retain the compact `VisualDesignReviewV1`
  report in the batch and upload raw visual artifacts for review.
- Share the Vercel URL only after the committed preview deployment is `READY`.
- Keep the five legacy simplified previews available through the fallback loader;
  all new previews use real page blueprints.

## What a preview is not

A preview is not a production review, an approved affiliate-link record, a
compliance pass, a destination approval, or an owner publication decision. It
must not be added to `src/generated/landing-pages/index.json`, the homepage
catalogue, or the sitemap. Existing live pages remain untouched.

## Promotion path

Before promotion to `/landing-page-builders/<slug>`:

1. Resolve the affiliate-link, destination, program-rule, disclosure,
   material-connection, evidence, review-basis, and compliance records.
2. Run deterministic batch validation plus the intent, draft, visual,
   uniqueness, compliance, and conversion gates. Visual must pass first and
   cannot override a later evidence, compliance, or approval failure.
3. Import the committed batch idempotently into Oracle and obtain audited owner
   approval for the selected pages.
4. Publish through the Oracle atomic transaction and let one batch artifact exporter
   write genuine publication provenance into the production manifest.
5. Verify the production route, disclosure, sponsored link, robots policy,
   sitemap/catalogue inclusion rules, and final URL on the exact reviewed Git SHA.
