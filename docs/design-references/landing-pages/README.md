# Landing-page design reference catalogue

This catalogue contains internal-only, captured design references. The operator-supplied 100-source registry is stored in `sources.json`; unavailable sources remain in that registry and are excluded from `catalogue.json` selection.

Prepare a local manifest from `reference-manifest.example.json`. Record the design observations manually; the ingestion command captures images and hashes but does not infer design meaning from pixels.

```powershell
npm run landing:references:ingest -- --manifest <absolute-manifest-path> --dry-run
npx --no-install playwright install chromium
npm run landing:references:ingest -- --manifest <absolute-manifest-path>
npm run landing:references:validate
```

For the supplied 100-reference corpus, run the bounded automated audit. It uses ten-site transactional waves and at most four concurrent browser contexts. It preserves the original URL, records same-site redirects, rejects public-access barriers without bypassing them, measures normal/reduced motion, and maps only observed semantic sections.

```powershell
npx --no-install playwright install chromium
npm run landing:references:audit -- --sources docs/design-references/landing-pages/sources.json --batch-size 10 --concurrency 4
npm run landing:references:validate
```

Retry only a named unavailable class after correcting a bounded implementation or network failure:

```powershell
npm run landing:references:audit -- --sources docs/design-references/landing-pages/sources.json --batch-size 10 --concurrency 4 --retry-failures capture_invalid
```

Run reports are stored under `ingestion-runs/`. Page production reads only the committed catalogue and captures; it never invokes the audit command.

Successful ingestion stores each entry and capture in the internal-only structure:

```text
references/<reference-id>.json
captures/<reference-id>/desktop.webp
captures/<reference-id>/mobile.webp
```

Page generation uses the committed local catalogue and never recrawls a reference. Use `npm run landing:references:select -- --category <slug> --buyer-decision <text>` before drafting.

Every active reference must include desktop and mobile WebP captures and evidence-backed section observations in captured order. Missing semantic sections remain absent. Selection requires the chosen two- or three-reference combination to cover all controlled section keys before it can produce a presentation recipe. Catalogue observations record the controlled variant together with: hero composition, alignment, and media strategy; display/body typography, scale, and weight contrast; per-section composition notes; CTA placement, label pattern, and interaction; motion triggers, intensity, and reduced-motion behavior; and mobile stacking, navigation, CTA, and overflow behavior.

Presentation recipes use only `design_variance`, `motion_intensity`, and `visual_density` dials, each as an integer from 1 through 10. Selection validates the local catalogue and capture hashes before producing output.
