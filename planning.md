# VettedSaaSBlueprint — Hermes Research Authority Repair

## Decision

Research preparation is not activated. Fetched remote `main` is
`b8e21bba7d0a1009f6742e83d4cc16bd400337c8`, and local `main` matches it. The
operator checkout is on `codex/getresponse-artistic-landing-20260802`, two
commits behind remote `main`, with 5 unstaged and 31 untracked entries; it was
left untouched. Research-prep checks ran from a clean disposable worktree at
the fetched remote commit.

The last independently recorded Oracle/Neon audit found healthy Hermes gateway,
dashboard, and workspace services plus an unowned P001 central schema with
`central_orchestrator_v1` disabled and its global kill switch enabled. This run
could not refresh either external state because the approved credentials and
executors are absent. No local file, generated note, or legacy Hermes queue is
workflow authority.

## Authorized URL manifest

`approved-urls.md` is the sole recurring authorization source. Current entries:

- `https://get.carepatron.com/michaelmedium`
- `https://get.datahawk.co/mau0otko9lz4-o5aq3q`
- `https://try.elevenlabs.io/izj2b165mcsj`
- `https://free-trial.adcreative.ai/8phdnllve4xi`
- `https://partners.snowfire.ai/j1a8kovs1uez`
- `https://trymoo.moosend.com/michaelmedium`
- `https://try.getresponsetoday.com/smypvzu98eko-kfze15`

Manifest file SHA-256: `92D0E250749C10E1993DAF59D28C30D8914618C1C5428A23CCDAE9091220FDBE`.
Parser manifest digest: `d426f1b2dcafd812c33937645dcc6995d8d25a93f9179492eb3911c77ed68088`.
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

- `LANDING_CONTROL_DATABASE_URL` and `LANDING_ORACLE_WORKER_DATABASE_URL` are
  absent from the nightly automation environment, so current durable Neon state
  cannot be queried and no research job can be dispatched.
- `HERMES_PRODUCT_IDENTITY_COMMAND` and `HERMES_LANDING_RESEARCH_COMMAND` are
  absent from the nightly automation environment. Wrappers exist in Git, but
  current Oracle deployment and capability probes cannot be verified.
- This run has no current evidence that V001 was applied to a disposable or
  production Neon branch.
- This run has no current Oracle worker artifact, credential, service account,
  systemd unit, monitor, or canary receipt evidence.

These are external authority/deployment blockers, not permission to substitute
local research or claim completion.

## Nightly research-prep verification (2026-08-04)

- `landing:allowlist:validate` passed with seven exact URLs and manifest digest
  `d426f1b2dcafd812c33937645dcc6995d8d25a93f9179492eb3911c77ed68088`.
- `landing:references:validate` passed.
- `landing:research:preflight` failed closed on the four missing named
  authorities above. No Neon query, Hermes executor, job advancement, research,
  draft, release, deployment, or publication occurred.
- Carepatron, DataHawk, AdCreative.ai, Snowfire, and GetResponse have no tracked
  product-evidence artifact. ElevenLabs has three sources/three claims retrieved
  2026-07-24; Moosend has three sources/three claims retrieved 2026-07-26. Both
  legacy receipts report `oracle_sync: not_configured`.
- No tracked `ResearchSourceSnapshotBundleV1` exists for any of the seven URLs.
  Therefore all seven remain research-blocked and ineligible for downstream
  drafting or publication.

## Approved five-URL batch intake design (2026-08-01)

**Goal:** turn an owner-supplied, already allowlisted batch into durable Neon
research jobs without creating a second workflow or treating a preview as a
published page.

**Authorized batch:** Carepatron, DataHawk, ElevenLabs, AdCreative.ai, and
Snowfire are byte-for-byte entries in `approved-urls.md`. The omitted Moosend
and GetResponse entries are outside this batch and remain unchanged.

**Repository addition:** `npm run landing:batch:submit -- --url <exact-url>`
may repeat `--url` up to five times. Inputs must be a non-empty, duplicate-free
subset of this explicit closed batch: Carepatron, DataHawk, ElevenLabs,
AdCreative.ai, and Snowfire. The omitted Moosend and GetResponse URLs are not
valid batch inputs, despite being present in `approved-urls.md`. Each input must
also be byte-for-byte present in the parsed manifest. Before dispatch it runs
the same authority probes as `landing:research:preflight`; a blocked preflight exits nonzero without
creating any Neon job. When ready, it calls only `dispatchLandingResearch` once
per input in supplied order. It emits an immutable `BatchSubmissionReceiptV1`
containing only the manifest digest, source commit, and an input-order-stable list
of exact URL, fingerprint, and Neon job ID. The `created` flag, timestamps,
state, and current stage are excluded. A re-submit has the same receipt and job
IDs only for the same supplied inputs, manifest digest, and source commit (the
same inputs to Neon `input_digest`); a changed manifest or commit is a new
dispatch context. Any observed job state/stage is a separate mutable status
report and is never release-receipt evidence.

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

**Acceptance checks:** cover exact URL preservation, closed-batch rejection of
Moosend and any other manifest entry outside the five named URLs, duplicate
rejection, immutable deterministic receipt construction, and re-submit
idempotency with the same Neon job IDs (not only matching receipt text) for
identical inputs, manifest digest, and source commit. A simulated mid-batch
failure must resume without duplicating the already-dispatched jobs. They also
prove no dispatch on blocked preflight, zero page artifacts/PRs/preview
deployments from batch submission, and preserve existing preview
noindex/not-published behavior. Jimmy's matrix gates the resulting PR; Fizz
verifies its Vercel provenance if a preview is produced by a later
evidence-backed change.
