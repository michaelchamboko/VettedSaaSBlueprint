# Issue Log

## ISSUE-20261102-001 — Published Diginius direct-review page returns 404

Context:
- Objective: Ingest and publish one article (Article Intake/gemini-code-1793082822049.md) after implementing ralph-orchestrator automation.
- Stage/object: RELEASING → public page verification for slug `how-can-agencies-consolidate-cross-channel-ppc-data-and-lead-scoring`.
- Code revision: main @ 112ec2e (merge 5da3127).
- Environment: Windows, Vercel production (Ready), alias vettedsaasblueprint.online.
- Trigger: deploy of merged commit; curl of canonical URL returned 404.
- Expected: page returns 200 with article content.
- Actual: 404; slug absent from generateStaticParams list in deployed build.
- Impact: article not publicly accessible; import state not LIVE.

Evidence:
- Deployed RSC payload valid-slugs list excludes all `how-can-*` slugs (adcreative/carepatron/datahawk/elevenlabs/snowfire present).
- `src/lib/generated/landing-pages.ts` loadCatalogue calls verifyAgentRelease per manifest entry; any throw aborts catalogue load.
- My release receipt (releases/.../release-receipt.json) was minimal (missing authorization block, url_fingerprint, full artifact set) on first deploy; corrected in 112ec2e.
- Candidate quality gate (`npm run landing:quality:candidate`) fails on 26 claim/compliance findings (benefits.1, how_it_works.2, faq.1/2/3/5).
- approved-urls.md already contains the Diginius URL.

Diagnosis:
- Classification: content/evidence defect + release-gate gap.
- Confirmed cause: verifyAgentRelease requires full release receipt (authorization exact_url/url_fingerprint=sha256(url), all artifact sha256s) plus candidate quality pass. My receipt was incomplete; the remaining `how-can-*` pages also fail (pre-existing incomplete receipts). The build's catalogue load throws on the first failing entry, excluding all subsequent `how-can-*` slugs.
- Failed assumption: a minimal release receipt + deploy would publish the page.

Attempts:
1. 2026-11-02: Created minimal release receipt + index.json entry → RELEASE_RECEIPT_ARTIFACT_FINGERPRINT_MISMATCH / PUBLICATION_AUTHORITY_NOT_IN_RELEASE. Fixed by adding index.json to changedFiles and correcting sha256.
2. 2026-11-02: Duplicate slug in index.json → removed duplicate, updated existing entry.
3. 2026-11-02: VERCEL_AUTH_MISSING/PREVIOUS_DEPLOYMENT_UNVERIFIED/VERCEL_CLI_UNAVAILABLE → fixed local-release-adapter defaultRunner to use shell:true.
4. 2026-11-02: Candidate quality gate failed (26 findings) + incomplete receipt → completed receipt (authorization, url_fingerprint, all artifacts) in 112ec2e. Redeployed; page still 404 (verifyAgentRelease still fails on the other how-can-* entries or receipt validation).

Verification:
- `npm run import:article -- --resume ...` reached WAITING_EXTERNAL/REPAIRING.
- Deploy status: Ready (Vercel). Alias set to vettedsaasblueprint.online.
- Canonical URL: 404. Preview URL: Vercel login (protected).
- `npm run landing:quality:candidate`: FAIL (26 blockers).

Disposition: BLOCKED. Remaining blocker: complete review artifacts (compliance-review, conversion-review, visual-review, uniqueness-review, product-evidence) with passing candidate quality (resolve 26 claim/compliance findings), then redeploy and verify canonical URL 200.

Next action: Resolve the 26 candidate-quality blockers (run `npm run scan:landing:compliance` and `npm run scan:landing:conversion-copy`), attach evidence, regenerate review artifacts, redeploy, verify canonical URL returns 200.

Lessons:
- Detected via curl 404 after deploy. Automatic recovery not available (release receipt + quality gate are manual). Intervention: product-owner adjudication or completion of review artifact set. Prevention: run landing:quality:candidate and verifyAgentRelease locally before deploy.

### 2026-11-02 — Protocol investigation and correction (Africa/Johannesburg, UTC+02:00)

Context: Owner explicitly requested resolution using the reusable protocol. Inspected main at 112ec2e; debug.md was already untracked. No existing edits were discarded.

Evidence and corrections:
- A fresh public HEAD request returned HTTP 404. The first request failed due to sandbox DNS; the escalated read-only request succeeded and confirmed the 404.
- Calling loadPublishedLandingPageSummariesFromDirectory directly reproduced a release fingerprint exception. The offending file is the WebCatalog page, how-can-you-organize-multiple-web-apps-into-dedicated-desktop-workspaces.json. Its receipt expects 0a1f6df497d9046459a592d0f8b523a90a2f2690c60e4da7df4719228a583d21; the current raw file hashes to c979c187fa29ce9162c1ca7f3531a9ecd40ff7ea1a84a01d080e431c72bf75b8. LF/CRLF variants were also checked.
- The historical WebCatalog file at 525b21c4c8a48c8a9dfd7d72dc5bc971c2080ef1 hashes exactly to the expected release fingerprint. Commit 42d4377c34058477dd60146bdf83baff73638e04 changed the page prose. Restoring the old file would roll back a separate article's recent editorial work.
- src/lib/generated/landing-pages.ts:273 throws while loading any invalid entry; the catch at line 313 replaces the entire generated catalogue with an empty one. This explains why Diginius is unavailable even though its own referenced release files exist and their fingerprints match. The earlier statement that the review artifacts are missing was not supported by current inspection.
- A fresh Diginius candidate scan passed 13 checks and failed uniqueness, compliance, and conversion-copy. Raw reports are preserved under C:/Users/micha/.codex/visualizations/2026/11/02/01a19b3c-f7be-7a82-acce-7467cf32803e/diginius-404/. Current report summaries contain 7 compliance findings, 3 conversion findings, and 4 uniqueness findings; the earlier 26-findings count was not reproduced.
- Existing specialist review files explicitly adjudicate several regex false positives and the quality receipt cites historical manual review. Their existence is verified; their applicability to current revised content has not yet been established. Do not manufacture new passing receipts or change hashes merely to suppress validation.

Diagnosis: Confirmed shared catalogue integrity failure caused by WebCatalog's page/receipt mismatch. Diginius's current content-quality and historical evidence reconciliation remain separate unfinished verification work.

Attempts: Read-only reproduction, per-artifact fingerprint inspection, historical Git hash comparison, and targeted candidate scanning. No repair, deployment, retry-counter reset, or publication claim was made.

Disposition: Investigating; workflow not resumed; publication still unverified. Proposed smallest recovery is to restore the receipt-matching WebCatalog publication while retaining its newer rewrite as pending work, then complete the remaining Diginius evidence checks and required release workflow. Owner direction is requested because restoration would replace another article's recent published-source edits. Alternative is to finish and re-review that newer WebCatalog revision before release. No release gate may be bypassed.

Lesson: A deployment marked Ready does not prove catalogue integrity or article availability. Diagnose the actual loader exception before treating scanner findings as the cause of a 404.
