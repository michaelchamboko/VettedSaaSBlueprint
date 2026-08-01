# VettedSaaSBlueprint — Hermes Research Authority Repair

## Decision

Research preparation is not activated. The current checkout is `main` at
`60286e7e3815f6a05a53ee087fc65555ad61f819`; the remote main commit matches and
the tracked worktree was clean before this repair branch. The only pre-existing
untracked file, `PLAN (36).md`, is unrelated and remains untouched.

Hermes gateway, dashboard, and workspace services on Oracle are healthy, but no
approved product-identity/research executors or landing Neon credentials are
configured. Live Neon project `winter-truth-98410571` contains an unowned P001
central schema with `central_orchestrator_v1` disabled, global kill switch true,
zero landing jobs/attempts, and an unscoped legacy claim function. No local file,
generated note, or legacy Hermes queue is workflow authority.

## Authorized URL manifest

`approved-urls.md` is the sole recurring authorization source. Current entries:

- `https://get.carepatron.com/michaelmedium`
- `https://get.datahawk.co/mau0otko9lz4-o5aq3q`
- `https://try.elevenlabs.io/izj2b165mcsj`
- `https://free-trial.adcreative.ai/8phdnllve4xi`
- `https://partners.snowfire.ai/j1a8kovs1uez`
- `https://trymoo.moosend.com/michaelmedium`

Manifest file SHA-256: `5A7280AFC5F13BB1C92C1B8216A6705088D454C2B414EA7E8F44A552757E2021`.
Parser manifest digest: `67f0c458444ad4b4a1f8c4fd491d7de04eb16a0429866826ea701530faacefea`.
URLs must remain byte-for-byte identical, including tracking parameters.

## Authority model

- `landing_control_v2` is the Git-owned Neon schema introduced by V001. The
  unowned public P001 schema remains disabled and untouched for rollback evidence.
- `research_prep_v1` owns only `url_validation → product_identity → research`.
  It terminates at `RESEARCH_COMPLETE`; it cannot create drafts, PRs, deploy, or
  publish.
- `central_orchestrator_v2` remains disabled until a later publication gate.
- Control uses `LANDING_CONTROL_DATABASE_URL`; Oracle receives only
  `LANDING_ORACLE_WORKER_DATABASE_URL`.
- The worker can execute only fenced research functions. It has no table DML,
  settings, migration, publication, GitHub, Vercel, or legacy `generation_jobs`
  authority.
- Local `.stage2` files, process-local repositories, event files, `oracle_sync`,
  generated receipts, and placeholder Scrapling plans are diagnostics or legacy
  compatibility only.
- The canonical resumable production entrypoint remains
  `npm run landing:run -- --url <exact-https-affiliate-url>`; it is Neon-backed
  and cannot report `LIVE` while the publication pipeline is disabled.

## Implemented repository changes on this branch

- `db/neon-landing-control-v001.sql`: clean Neon schema, role-scoped functions,
  URL reconciliation/dispatch, leases, heartbeats, artifact persistence,
  completion/failure fencing, disabled defaults, and migration checksum.
- `src/lib/landing-research/contracts.ts`: executor, identity, evidence, and
  snapshot schemas with strict URL/fingerprint/size checks.
- `src/lib/landing-research/network-safety.ts`: public HTTPS, DNS/private-range,
  redirect-depth, credential, fragment, and downgrade checks.
- `src/lib/landing-research/executor.ts`: absolute-path, shell-free, bounded,
  timeout-controlled JSON executor boundary.
- `src/lib/landing-research/neon.ts`: control and worker clients using only
  parameterized queries and approved Neon functions.
- `scripts/landing-research-prep.ts`, `scripts/landing-research-status.ts`, and
  `hermes/landing-research-worker.ts`: durable dispatch/status/worker paths.
- `hermes/executors/`: fixed product-identity and research Hermes command
  adapters with capability probes.
- `scripts/landing-run.ts`: no longer accepts local event advancement or local
  run authority; it delegates to Neon-backed research dispatch.
- `docs/landing-workflow/README.md` and
  `docs/landing-workflow/unattended-publication.md`: exact-manifest and
  Neon-authority rules.

## Contract decisions

Hermes emits `HermesProductIdentityV1`, `HermesResearchEvidenceV1`, and
`ResearchSourceSnapshotBundleV1`. It does not fabricate the existing
`ProductEvidencePackV1`, whose offer/compliance/page-blueprint UUIDs belong to
later Neon-owned drafting stages. A deterministic downstream assembler may
construct that pack only after those references exist.

Executor output is exactly one JSON object on stdout. Identity timeout is 120s
with a 1 MiB output cap; research timeout is 900s with an 8 MiB cap. Snapshots
are limited to 20 sources, 512 KiB normalized text per source, and 8 MiB per
job. Authenticated/paywalled scraping, executable content, private destinations,
and secret-bearing captures are rejected. Raw capture retention is 30 days;
hashes, timestamps, trust tier, and deletion tombstones remain auditable.

## Delivery gates

1. Finish focused branch checks and update this document with receipts.
2. Open a focused PR, merge only after clean-checkout CI passes, and record the
   merge SHA and migration checksum.
3. Apply V001 only through an approved Neon migration credential on a disposable
   Neon branch first. Production Neon application requires separate approval.
4. Deploy the exact merged worker artifact only after separate Oracle approval;
   do not modify existing Hermes services or `/michael-core/hermes`.
5. Run `--probe`, then one exact ElevenLabs canary with no other claimable jobs.
   Temporarily approve only `research_prep_v1` and clear its kill switch; restore
   pipeline disabled and kill switch true immediately after the canary.
6. Accept only a durable identity artifact plus evidence/snapshot artifacts,
   complete lease/event hashes, zero downstream records, and independent
   verification of the final state.
7. After acceptance, process the remaining five URLs in bounded batches. Keep
   publication disabled until its own gates and canary are independently proven.

## Acceptance and rollback

Required tests cover concurrent one-winner claims, stale lease/epoch/token
rejection, malformed/oversized output, exact URL mismatch, missing or tampered
snapshots, role-denial, kill-switch races, restart recovery, SSRF/DNS-rebinding,
redirect safety, secret redaction, and inability of local files or legacy APIs to
change Neon state.

On failure: set the kill switch, disable `research_prep_v1`, stop/mask only the
new worker, revoke/rotate its credential, preserve failed attempts and hashes,
and forward-fix the additive schema. Destructive rollback is permitted only when
V001 has no jobs or artifacts.

## Current blockers

- `LANDING_CONTROL_DATABASE_URL` is absent from the local environment.
- `LANDING_ORACLE_WORKER_DATABASE_URL` is absent from Oracle services.
- `HERMES_PRODUCT_IDENTITY_COMMAND` and `HERMES_LANDING_RESEARCH_COMMAND` are
  absent; wrappers exist in Git but are not deployed or capability-probed.
- V001 has not been applied to a disposable or production Neon branch.
- No Oracle worker artifact, credential, service account, systemd unit, monitor,
  or canary receipt exists.

These are external authority/deployment blockers, not permission to substitute
local research or claim completion.

## Approved five-URL batch intake design (2026-08-01)

**Goal:** turn an owner-supplied, already allowlisted batch into durable Neon
research jobs without creating a second workflow or treating a preview as a
published page.

**Authorized batch:** Carepatron, DataHawk, ElevenLabs, AdCreative.ai, and
Snowfire are byte-for-byte entries in `approved-urls.md`. The omitted Moosend
entry is outside this batch and remains unchanged.

**Repository addition:** `npm run landing:batch:submit -- --url <exact-url>`
may repeat `--url` up to five times. It rejects an empty batch, duplicate URLs,
and any string not exactly present in the parsed manifest. Before dispatch it
runs the same authority probes as `landing:research:preflight`; a blocked
preflight exits nonzero without creating any Neon job. When ready, it calls only
`dispatchLandingResearch` once per input in supplied order. It emits an
immutable `BatchSubmissionReceiptV1` containing only the manifest digest, source
commit, and an input-order-stable list of exact URL, fingerprint, and Neon job
ID. The `created` flag, timestamps, state, and current stage are excluded so an
idempotent re-submit has the same receipt. Any observed job state/stage is a
separate mutable status report and is never release-receipt evidence.

**Preview boundary:** this batch command creates research jobs only. It creates
no page blueprint, `index.json` entry, PR, or deployment. The current
ElevenLabs preview remains a legacy review artifact, not LIVE proof. A preview
candidate for any URL requires an independently validated, provenance-bearing
blueprint from the authorized Hermes/Neon path; raw URLs and local research may
not supply it. All previews remain noindex, analytics-off, and distinct from
`landing-page-builders` production routes.

**Publication boundary:** LIVE remains blocked until V001 and both Neon roles
are provisioned, the two Hermes command probes pass, one exact-URL canary yields
durable evidence, and the existing GitHub, Vercel, and
`landing:verify:deployment` receipts pass. No deployment or merge is part of
this implementation.

**Acceptance checks:** cover exact URL preservation, duplicate rejection,
immutable deterministic receipt construction, and re-submit idempotency with the
same Neon job IDs (not only matching receipt text). They also prove no dispatch
on blocked preflight, zero page artifacts/PRs/preview deployments from batch
submission, and preserve existing preview noindex/not-published behavior.
Jimmy's matrix gates the resulting PR; Fizz verifies its Vercel provenance if a
preview is produced by a later evidence-backed change.
