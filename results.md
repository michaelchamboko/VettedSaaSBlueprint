# Page delivery results — 2026-09-28

**Three new pages are live on `https://vettedsaasblueprint.online`.** One connected Decision Hub,
Solution Hub, and Decision Scenario for the shared-team-account decision, released through the
authorised production path and independently verified.

| Delivered URL | Status |
| --- | --- |
| <https://vettedsaasblueprint.online/decision-hub/team-shared-account-access-control> | 200, 12 sections |
| <https://vettedsaasblueprint.online/solution-hub/team-shared-account-access-control> | 200, 7 sections |
| <https://vettedsaasblueprint.online/scenarios/team-shared-account-access-control> | 200, 12 sections + printable report |

| Item | Result |
| --- | --- |
| Release commit | `526a3b3aa11e14d43ca1b11cfe9a07212687d315`, authored and committed as `Mike Jones <michaelchamboko@gmail.com>` |
| Production deployment | `dpl_FoVXNKqCcN9vRc4vywXgcJZctj2G`, target `production`, state `READY`, region `cpt1`, aliased to the custom domain |
| Previous production deployment | `dpl_CHTbWYWtNMKDfQDH6U7SXJky5mXK` |
| Browser verification | 21 of 21 route/profile combinations passed, 42 screenshots |
| Existing routes | 21 re-verified at 200; the 404 path still returns 404 |
| Elapsed to verified production | **88.6 minutes** from owner commission to completed verification |
| Durable receipt | `build-pack/receipts/page-delivery-2026-09-28.json` |

The optimisation work from the previous cycle is retained and is part of this release commit. Its
measured build-machine result is carried forward in "Retained automation improvements" below, with
corrections. The previous cycle's report is archived at
`build-pack/evidence/OPTIMISATION-20260928/results-2026-09-28-optimisation-cycle.md`.

## Scope and authority

- Commission: product-owner directive of 2026-09-28 — deliver one new connected set, with an explicit
  note that the previous five-file restriction does not apply.
- Planning authority: `planning.md`, "Recovery, Phase One Deployment, and Automation Authority v1.1"
  and the Phase Two operational contract. Not amended.
- Topic selection authority: `D01-S-0a7372c951e0` (§7.2 The initial wedge), `D01-S-841116e1ce4e`
  (§10.3 Workstream A), `D07-S-bb5e55f0f4bd` / `D07-S-c87bcf7ab169` (§18.2/18.3), and
  `D08-S-3556637051b9` / `D08-S-e4b63d794258` / `D08-S-7aa714d7198c` (§10–12). Each UID was resolved
  against `docs/document-intelligence/SOURCE_MANIFEST.json`, whose `content_sha256` reproduces as
  `sha256(exact_text)`.
- Release route: owner-commissioned production release, **not** the content-only automatic allowlist.
  `automation_authority.publication.enabled` remains `false` and `P2-ACT-001` remains `blocked`.
  Verified: `npm run automation:release` against this change set returns `eligible: false`, reasons
  `CHANGE_REQUIRES_REVIEW` and `OUTSIDE_STRUCTURED_CONTENT_ALLOWLIST`, and performs no commit and no
  deploy (`build-pack/evidence/DELIVERY-20260928/release-fail-closed-check.txt`).
- No gate, schedule, evidence threshold, or commercial rule was added, removed, or waived.

## Topic selection

Record: `docs/research/2026-09-28-team-access-control-topic-selection.md`.
Evidence ledger: `docs/research/2026-09-28-team-access-control-evidence-ledger.json`.

Selected: **should a five-person business without a technical administrator move shared account access
out of a password spreadsheet and into a managed team vault, and what must be true before it does?**

A duplicate-intent screen first excluded the governed-AI topic (already live as
`governed-ai-client-work-preparation`), the generic five-person software question (the three index
guides), video localisation, and email-platform migration (substantial existing coverage). Two
candidates survived the screen and were tested against a bounded evidence budget:

| Candidate | Outcome |
| --- | --- |
| Shared team account access | **Selected.** Current official population statistics, a public-authority buyers guide for this exact product class, vendor primary documentation for the capability the decision turns on, dated community selection questions, and a genuine counter-signal. |
| CRM selection | **Deferred again, honestly.** The natural official source is withdrawn: Eurostat returns `ERR_NOT_FOUND_4: ISOC_IB_CRM … is not available for dissemination`. Vendor explainers cannot establish population-level demand, so the core adoption claim would have been `insufficient`. This is the same reason the 2026-09-02 run deferred it. |

Evidence acquired (all retrieved 2026-09-28, hashed reproducibly):

- UK DSIT and Home Office, *Cyber Security Breaches Survey 2025 to 2026* (published 2026-04-30;
  fieldwork Aug–Dec 2025): 43% of businesses identified a breach or attack; 74% have a password policy
  but only 47% require two-factor authentication; micro-business 2FA rose 35% → 43%.
- NCSC *Password manager buyers guide*: password overload produces reuse and other insecure
  workarounds; on-device versus cloud-sync trade-offs; a manager is a natural target; effective
  single sign-on can make one unnecessary.
- NCSC *Password administration for system owners*: published and reviewed 19 November 2018, written
  for system owners at large organisations and the public sector.
- NCSC, 2026-04-23: no longer recommends passwords where passkeys are available.
- Bitwarden organisation documentation: organisation-owned items shared to named users, administered
  from a console.
- Hacker News (Algolia archive): "Ask HN: Which Password Manager for Teams?" (2017-11-28), "Ask HN:
  Best password manager for teams?" (2018-12-28).

**Evidence state: `partial`, and disclosed as such.** Honest limits carried on the pages: no
five-person adoption rate exists (the survey uses size bands); no query volume is claimed, because
`D07-S-a52b46a6e024` makes demand proof of a question, not of an answer; no product is ranked, priced,
tested, or recommended; per-provider support for individual logins was not verified for any account in
the scenario; no reduction in breach likelihood is claimed.

Two contradictions are represented rather than resolved:

1. The same authority publishes the password-manager buyers guide and now says passwords lack
   relative resilience and passkeys should be the default. The pages frame a vault as a bridge for
   accounts that do not yet support passkeys, and mark the pair `conflicting`.
2. Every statistic and authority is United Kingdom based while the operator is South African. This is
   disclosed on each page as an `insufficient` evidence state, not silently generalised.

## What was built

Content record: `src/content/decision-journeys/sets/team-shared-account-access-control.json` — one
`DecisionSetV2`, 12 / 7 / 12 blocks, 35 source-bound claims (15 validated, 14 partial, 4 insufficient,
2 conflicting), `sourceFingerprint`
`01c093c3e8b748efa1fce4dda450f2be957a3f2f2b15e0b1aa1ab68181e0ce4a` derived from its declared sources.

**No application component, route, layout, or stylesheet was added or modified.** The architecture was
already data-driven: `src/lib/decision-journey/sets.ts` enumerates the `sets/` directory, the three
`[setSlug]` routes render any set through `src/components/public/DecisionJourneyPage.tsx`, and both
`src/app/sitemap.ts` and `src/app/page.tsx` call `listDecisionSets()`. Adding the set was a content
change, so homepage discovery, sitemap discovery, canonical metadata, reciprocal links, motion anchors,
and the printable report came from the existing contract rather than new code.

Distinct approved compositions per page: `diagnostic-split`, `fit-map`, `constraint-bento`, each with
catalogue references from `src/lib/decision-journey/presentation-options.ts`.

## Defects fixed

### 1. Junction traversal — the mandatory test gate could not pass

`tests/vendor-removal.test.ts` walks the repository and threw `EISDIR: illegal operation on a
directory, read` on `.codegraph`, a Windows junction present in this checkout.

**The previous cycle's proposed remedy would not have worked.** Its report recommended adding
`.codegraph` to the test's `excludedDirectories` set. That guard is
`entry.isDirectory() && excludedDirectories.has(entry.name)`, and Node reports this junction as
`isSymbolicLink()` — neither `isDirectory()` nor `isFile()`. A name-based exclusion would have been
skipped by the same condition that failed to catch it. Verified directly:

```
exists true  isDirectory false  isSymbolicLink true  isFile false
readFileSync('.codegraph') -> EISDIR
```

Root cause fixed instead: the walker now skips reparse points. This is safe because Git stores no
junctions (`git ls-files -s` shows 0 mode-`120000` entries), so repository content never depends on
one. A regression test creates a real junction and asserts the walk returns only ordinary files, using
the existing `EPERM` skip convention where Windows symlink privilege is unavailable.

### 2. Test-gate contention — the gate failed on scheduling, not behaviour

After defect 1 was fixed, `npm test` began failing `home-section-separators` consistently at its hard
20 s timeout (2.7 s at baseline). This was **caused by my own fix**, not pre-existing: the junction
failure had aborted that suite in ~274 ms, so the Playwright launch never competed with anything. With
the suite completing, Node's default test concurrency (one worker per core) oversubscribed this 4-core
host.

Confirmed by measurement, not assumption: the two Playwright files together run in 4.4 s; the full
suite at `--test-concurrency=2` gives 283 tests, 0 fail, **0 cancelled**. `scripts/run-active-tests.mjs`
now bounds concurrency. I did not raise the 20 s timeout, which would have hidden a real gate
reliability problem.

### 3. Jurisdiction disclosure — found by my own verification, after release

The first release (`51619279` → `dpl_DMt9N9MzjmzHw8z6Cov7JY2M27mT`) reached `READY` with all three
routes at 200. Independent verification then found that the jurisdiction limit appeared on only **one**
of the three pages: the printable report that carries the limitations renders only on the scenario
page. My selection record had promised "disclosed on every page".

Fixed forward with a claim on each page naming the United Kingdom basis and stating that no South
African law, reporting duty, or regulator position is asserted, labelled `insufficient`. Block counts
stayed 12/7/12 and the source fingerprint is unchanged, because these are added claims against sources
already declared. A test now asserts the disclosure per page so it cannot silently return. The test is
scoped to this set: the earlier governed-AI set uses sector context rather than headline statistics, and
retroactively changing published claims is owner-adjudicable work, not a silent fix.

`planning.md` names fix-forward as the only recovery mechanism, so no rollback was attempted. Both
deployments are recorded in the receipt lineage.

## Retained automation improvements

Both changes from `build-pack/evidence/OPTIMISATION-20260928` are retained and shipped in this release
commit. The headline build-machine result holds, with corrections below.

| Measure | Before | After | Change |
| --- | ---: | ---: | ---: |
| Upload files | 15,028 | 1,283 (at the optimisation commit) | −91.5% |
| Upload bytes | 648.1 MB | 49.0 MB (at the optimisation commit) | −92.4% |
| `vercel deploy --dry` median | 75,400 ms | 4,419 ms | **−94.1%** |

Re-measured at this release commit, with three new samples
(`vercel-dry-at-release-0{1,2,3}.txt`): median **5,436 ms** (5,390 / 5,436 / 5,890), context
1,390 files / 59.7 MB. Still **−92.8%** against the baseline median. The context grew from 1,283 files
because this cycle added its own evidence files under `build-pack/`, which the Vercel build legitimately
receives; `build-pack` is now the largest remaining uploaded directory at 31.9 MB.

The Windows release-script fix (`spawn npm ENOENT` → executes correctly) is retained and exercised:
`npm run automation:release` ran the real script end-to-end for the fail-closed check above.

### Corrections to the previous report

These are reporting errors, not hidden regressions. Raw evidence supports every figure here.

1. **Several baseline medians were wrong.** Even-count series were reported using the upper of the two
   samples instead of the mean of the middle pair. Recomputed from `stage-timings.jsonl`:

   | Stage | Samples (ms) | Reported | True median |
   | --- | --- | ---: | ---: |
   | lint | 40,192 / 88,929 | 88,929 | **64,560** |
   | typecheck | 10,246 / 18,635 | 18,635 | **14,440** |
   | validate:public-site | 2,273 / 4,523 | 4,523 | **3,398** |
   | final-tree lint | 2,088 / 101,561 | 101,561 | **51,825** |
   | final-tree typecheck | 2,301 / 22,980 | 22,980 | **12,641** |

   The `vercel-dry` figures are unaffected — all three series have odd counts, so 75,400 → 4,419 is a
   genuine median comparison.
2. **The 57% parallel-check improvement was never implemented.** It was a measured experiment that the
   previous report itself marked "not applied". Any statement that the gate was parallelised, or that
   ~225 s per run was saved in shipped code, is wrong. It remains an unapplied opportunity.
3. **The proposed test-blocker fix was wrong**, as described in defect 1 above. The "one-entry addition
   to `excludedDirectories`" would not have fixed the traversal.
4. **`/scenarios` does expose a `<title>`.** The previous cycle logged this as a follow-up after a fetch
   found no match. Production now returns
   `For a five-person team with no technical administrator, what should guide the next software choice? | VettedSaaSBlueprint`.
   That was a match artifact, not a page defect. Closed.
5. **End-to-end delivery speed was unproven then; it is now measured.** Two real production deployments
   were performed and timed (1.8 min each). The upload-context reduction is no longer proven only by a
   preview build.

## Verification

Method: independent HTTP and Playwright checks against the custom domain after Vercel reported `Ready`.
No worker self-reporting.

**Content, per new page:** single `h1`; canonical exactly matches the served URL; server-rendered section
counts 12 / 7 / 12; rendered evidence-state markers 15 / 8 / 12, at least one per claim; distinct
composition families;
reciprocal links to the other two pages; the printable report and the "How to use this guide" disclosure
on the scenario page; the jurisdiction text in server-rendered HTML; zero console errors; no horizontal
overflow.

**Browser profiles:** desktop 1440×1000, mobile 390×844 with reduced motion, mobile 390×844 with
JavaScript disabled — 21 of 21 combinations passed, 42 screenshots
(`build-pack/evidence/DELIVERY-20260928/browser/receipt.json`).

**Discovery:** all three paths appear in the live sitemap with `lastmod 2026-09-28` (URLs rose from 27
to 30, `build-pack/evidence/DELIVERY-20260928/sitemap.xml`), and the set title plus all three paths
appear in the served homepage HTML.

**No regression:** 21 existing routes re-verified at 200, including both other decision sets and all
legal pages. `/nonexistent-route-check` still returns 404. Homepage, `/decision-hub`, `/solution-hub`
and `/scenarios` retain their original `h1` and title text. Byte counts differ slightly from the
previous cycle's record, which is expected: the homepage gained a section and asset hashes changed with
a new build. No content regression was claimed or found.

**Repository gates at the release commit:** lint 0 errors / 128 pre-existing warnings; typecheck pass;
284 tests, 281 pass, 0 fail, 0 cancelled, 3 expected Windows privilege skips; `validate:public-site`
pass; `next build` pass with all three routes prerendered as static HTML. Dependency lock unchanged
(`557b2162…6057`, identical to the recorded Phase Two hash).

## Elapsed delivery time

Measured from the owner commission (2026-09-28T20:41:05Z) to completed independent verification
(2026-09-28T22:09:39Z).

| Phase | Minutes |
| --- | ---: |
| Topic selection, evidence pass, content authoring, gate runs | 67.7 |
| First production deploy | 1.8 |
| Defect found by verification, fixed, revalidated | 8.7 |
| Fix-forward production deploy | 1.8 |
| Independent verification | 6.4 |
| **Total to verified production** | **88.6** |

The two-deploy path cost ~10 minutes. It was caused by a real disclosure defect that verification
caught, so it is reported rather than smoothed over. A single-deploy run of this slice would be
approximately 78 minutes.

## Remaining work and open decisions

1. **Owner decision, still unresolved from the previous cycle:** `planning.md` mandates the local
   production build as a pre-deployment gate, while D10 `D10-S-659ee8e5398d` ("deploy first, improve
   continuously") and `D10-S-f1c5ab220adc` ("Deployment confirmation is not a QA gate") describe the
   opposite order. One release therefore builds Next.js twice — locally (`npm run build`, 58.1–102.6 s)
   and again on Vercel — and runs `validate:public-site` in both places. Both authorities are preserved;
   neither was deleted to save the time. Adjudication determines whether the duplicate is removed.
2. **Unapplied measured opportunity:** parallelising the Stage 2 gate's deterministic checks measured
   −56.7% / −57.2% with identical outcomes, but was not applied. `npm run typecheck` (`next typegen`)
   writes `.next/types` while `next build` writes `.next`, so co-scheduling needs a separate build
   location — a structural change, not a flag.
3. **`landing:quality:production` and `validate:stage2` still exit 1** on legitimate commercial
   fail-closed findings (`partnerstack_url_integrity_unknown`, `program_rules_unknown`,
   `destination_review_missing`, `release_authorization_missing`, `inflated_or_copied_scores`) while
   `publication.enabled = false`. Correct behaviour; not weakened. These are not part of the
   `planning.md` release gate, which is why the release proceeded.
4. **`sharp` advisory:** one high (`sharp < 0.35.4`, repo pins 0.35.3). Not auto-fixed — `npm audit fix
   --force` would change the dependency manifest and the recorded lock hash.
5. **Follow-up research for this set:** validate the intent from a second approved demand-source type;
   acquire a South African or vendor-neutral equivalent for the jurisdiction gap; verify per-provider
   individual-login support for the accounts named in the scenario; recheck the NCSC position, since its
   passkey guidance is newer than the credential guidance the pages also cite.
6. **Not claimed:** page speed, ranking, conversion, or traffic. The delivered pages were verified for
   correctness, not measured for Core Web Vitals. No Lighthouse or LCP figure is recorded for the new
   pages.

## Rollback

Not required and not performed. Production is `dpl_FoVXNKqCcN9vRc4vywXgcJZctj2G` at commit `526a3b3aa`,
verified above. `planning.md` names native Vercel recovery or fix-forward as the only mechanism;
fix-forward was used once, for the defect my own verification found. The content slice is revertible as
one file (`src/content/decision-journeys/sets/team-shared-account-access-control.json`), which returns
the site to 27 sitemap URLs and removes three routes without touching application code.
