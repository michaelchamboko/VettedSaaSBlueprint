# Codex landing-page batches

This directory is the versioned source workspace for Codex-authored landing-page
candidates. Each batch directory name is a UUID and has this contract:

```text
<batch-id>/
  manifest.json
  product-pack.json
  intents/<slug>.json
  drafts/<slug>.json
  reviews/<slug>/uniqueness.json
  reviews/<slug>/compliance.json
  reviews/<slug>/conversion.json
  retro.json
  timing.json
  quality.json
```

`registry.json` is the committed, statically imported catalogue for the
noindex preview route. It contains a `schema_version: 1` object and one preview
entry per draft page, including the batch UUID, page UUID, slug, exact affiliate
URL, and production-renderer blueprint. Keep it in lockstep with committed UUID
batch directories; an empty `previews` array is valid when no batches are
committed. Filesystem discovery remains test/CLI-only so preview builds do not
trace the whole batch workspace.

`quality.json` is the immutable batch quality receipt. It records the exact 16
scanner outcomes and a digest of every referenced input artifact. A failed or
stale receipt remains auditable but cannot advance to release.

Use `npm run validate:codex-batch -- --batch-id <uuid>` while drafting locally.
The manifest `git_commit_sha` is the source-baseline commit from which Codex
authored the batch; it is deliberately not the commit that contains the
manifest itself. Pass `--git-commit-sha <sha>` only when explicitly pinning and
verifying that source baseline. The import audit records the deployed commit
separately.

Run the batch-scoped deterministic gate with
`npm run landing:quality:draft -- --batch-id <uuid>`. Draft mode first validates
the exact workspace and then routes all 16 scanners to that batch's manifest-
referenced draft files. Production mode continues to scan only the audited
published catalogue.

Use `npm run package:codex-batch -- --batch-id <uuid>` to emit the deterministic
import packet under `.stage2/codex-batches/<batch-id>/`.

Generated files are draft evidence only. They must never claim publication,
active-link, asset-approval, or compliance-approved state. The supervised path
binds release authority to an independently verified `LandingReleaseReceiptV1`.
New previews use the production editorial renderer and fixed `gsap_editorial`
motion profile while the preview route stays `noindex,nofollow` and suppresses
production analytics.
