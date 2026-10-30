# Build automation optimisation results

## Status

**Achieved** for two measured bottlenecks; **blocked** for one local gate precondition; **partial** overall because the
full scheduled cycle and the owner-reviewed production release could not be exercised end-to-end in this checkout.

Delivered, measured changes:

1. `.vercelignore` upload context: **15,028 files / 648.1 MB → 1,283 files / 49.0 MB** (−91.5% files, −92.4% bytes).
   `vercel deploy --dry` median **75,400 ms → 4,419 ms** (−94.1%, provisional n=3).
2. `scripts/release-decision-journey.ts`: the authorised release path could not run at all on this platform
   (`spawn npm ENOENT`). Fixed and verified; the script now executes and correctly fails closed.

No release gate, schedule, evidence threshold, or commercial rule was added, removed, or waived.

## Scope and authority

- Plan path: `optimiseplan.md` (untracked at the baseline commit).
- Planning authority: `planning.md` — "Recovery, Phase One Deployment, and Automation Authority v1.1" remains the sole
  planning authority. Not amended.
- Target domain: `https://vettedsaasblueprint.online`. Vercel project `vetted-saa-s-blueprint`
  (`prj_6ymKeAz0lqMs8LYvplkn4AKMya7J`, org `team_0Vjm5yuoHjiIcGq0hoJMm5vC`), region `cpt1`.
- Files changed (all within the assignment's authorised list, plus one new test covering the changed behaviour):
  - `.vercelignore` (modified)
  - `scripts/release-decision-journey.ts` (modified)
  - `tests/release-decision-journey.test.ts` (new)
  - `vercel.json`, `scripts/run-landing-quality.mjs`, `scripts/stage2-pre-review-gate.mjs`: **inspected, not changed**;
    reasons in "Hypotheses and experiments" and "Final decision".
- Authorised production release path (`planning.md` "Operational contract"): local `Mike Jones <michaelchamboko@gmail.com>`
  commit → every repository gate including the local Next.js production build → `vercel deploy --prod --yes` → `Ready`
  → independent route verification → `DeploymentReceiptV1`. Native Vercel recovery or fix-forward is the only recovery.
- `build-pack/execution-state.json` `automation_authority.publication.enabled = false` and `P2-ACT-001 = blocked` are
  preserved unchanged. Nothing here declares activation complete; automatic publication remains disabled.
- Unresolved authority conflict (recorded, not adjudicated): `planning.md` "Phase One release gates" and the current
  `vercel.json` pre-deployment `validate:public-site` gate coexist with D10 `D10-S-659ee8e5398d` ("deploy first, improve
  continuously": Build → Deploy → Confirm production → Inspect → Classify → Improve → Recheck → Record) and D10
  `D10-S-f1c5ab220adc` ("Deployment confirmation is not a QA gate"). Both authorities are preserved.
- No-waiver decisions: no gate added, removed, or waived for any benchmark. Landing compliance blockers were left
  fail-closed (see Failures).
- Checkout mismatch recorded: `automation/codex/manifest.json` working-directory metadata points at `.worktrees/phase-two`;
  **every** run in this file used the repository root checkout
  `c:\Users\micha\.buzz\REPOS\Antigravity Applications Created\Vetted SaaS B - Content Strategy and Growth Strategy`.
  Authority was not retargeted.

## Environment and reproducibility

| Item | Value |
| --- | --- |
| Date (UTC) | 2026-09-28 |
| Commit SHA | `f994c672f992fc07e552018afb82b99e050c6898` (`main`) |
| Checkout | repository root (see mismatch above) |
| Git state at baseline | clean except untracked `optimiseplan.md` |
| Node / npm (local) | v24.18.0 / 12.0.0 |
| packageManager / Vercel install | `npm@12.0.2` / `npx --yes npm@12.0.2 ci` |
| OS / RAM / logical CPUs | Windows 11 Pro / 10,107 MB / 4 |
| `package-lock.json` SHA-256 | `557B21620EAA57D76C50695F6626877FE80201B721F4C9769BA5960FE8B66057` |
| Vercel CLI | 54.21.1, authenticated `michaelchamboko-8191` |
| Next.js / TypeScript / tsx | 16.3.4 / 6.0.3 / 4.22.4 |
| Git | 2.55.0.windows.2 |
| Evidence directory | `build-pack/evidence/OPTIMISATION-20260928/` |
| Timing harness (outside the repo, reversible) | `time-stage.ps1`, `exp3.ps1`, `exp4.ps1` in the session folder; no product code depends on them |

Raw records (`stage-timings.jsonl`, `parallel-harness.jsonl`, `install-samples.jsonl`) carry
`run_id, variant, stage, command, utc_start, utc_end, duration_ms, exit_code, cache_state, attempt, commit`
plus stdout/stderr file paths. No tokens, credentials, or secrets were captured.

## Baseline raw timings

All samples warm, same fixture, same command line, same commit, 4-core Windows. Local samples only — never mixed with
Vercel samples.

| Stage | Command | Samples (ms) | Median (ms) | Exit |
| --- | --- | --- | ---: | --- |
| install | `npm ci --no-audit --no-fund` | 276,773 | 276,773 | 0 |
| validate | `npm run validate:public-site` | 4,523 / 2,273 | 4,523 | 0 |
| typecheck | `npm run typecheck` | 18,635 / 10,246 | 18,635 | 0 |
| lint | `npm run lint` | 88,929 / 33,158 (clean tree) | 88,929 | 0 |
| test | `npm test` | 37,512 | 37,512 | **1** (pre-existing, see Failures) |
| build | `npm run build` | 102,593 / 58,103 | 102,593 | 0 |
| landing quality | `npm run landing:quality:production` | 226,761 | 226,761 | **1** (see Failures) |
| Stage 2 gate alone | `npm run validate:stage2` | 186,638 / 138,735 / 304,224 | 186,638 | **1** |
| upload scan | `vercel deploy --dry --yes` | 97,336 / 75,400 / 16,624 | 75,400 | 0 |

Statistics are **provisional**: every series has fewer than 20 comparable samples, so the maximum is reported instead of
p95. Baseline variance is high (lint 33.2–88.9 s, build 58.1–102.6 s, dry-run 16.6–97.3 s) on a 4-core machine with other
sessions active; medians are reported alongside every sample so no comparison relies on a single number.

### Upload context attribution (measured via `vercel deploy --dry`, not inferred)

`build-pack/evidence/OPTIMISATION-20260928/vercel-dry-before.txt` — the CLI's own `directories` array:

| Path | Files | MB | Read by the Vercel build? |
| --- | ---: | ---: | --- |
| `.automation/` | 13,736 | 568.9 | **No** |
| `.opencode/` | 65 | 16.1 | No |
| `docs/` | 227 | 10.4 | No (not imported by app code) |
| `.stage2/` | 100 | 7.4 | **Yes — see below** |
| `public/` | 23 | 7.0 | Yes |
| `build-pack/` | 257 | 5.1 | partially |
| `src/` | 290 | 1.2 | Yes |
| `.agents/` | 168 | 0.6 | Yes (scanner scripts) |
| `scripts/` + `tests/` | 125 | 0.7 | Yes |
| **Total** | **15,028** | **648.1** | |

Largest single uploaded file: `.automation/publisher-v4/reviews-navigation-20260915/interrupted-node-modules/@next/swc-win32-x64-msvc/next-swc.win32-x64-msvc.node` = **130.5 MB**.
`.automation/` alone is 91.4% of uploaded files and 87.8% of uploaded bytes.

### `.codegraph` junction (pre-existing local state)

Probe output in the evidence directory: of the 933 files the mandatory `vendor-removal` test walks, exactly **one** entry
throws on read — `.codegraph`, a Windows **junction** to `C:\Users\micha\.omo\codegraph\projects\Vetted-SaaS-B-...`,
untracked and excluded via `.git/info/exclude` (not `.gitignore`). It is absent from a clean checkout.

## Hypotheses and experiments

Formula throughout: `(before - after) / before * 100`.

### Rank 5 — Upload context / `.vercelignore` — **APPLIED, largest measured win**

- Hypothesis: the Vercel upload context carries large local-only runtime state that is not a build input.
- One variable: `.vercelignore` contents. Control: identical commit, identical read-only `vercel deploy --dry --yes`.
- Evidence that `.automation/` is not a build input: it is referenced by exactly one module,
  `src/lib/automation/local-store.ts:24` (`path.resolve(store.root, ".automation")`), imported only by
  `src/lib/automation/workflows.ts`. No `src/app/**` route imports `@/lib/automation/*`, and
  `scripts/validate-public-site.ts` imports only `src/lib/site/public-site` (`next` + `zod`). The Vercel build command is
  `npm run validate:public-site && next build`, so `.automation/` is unreachable from it.
- Result:

| Measure | Before | After | Change |
| --- | ---: | ---: | ---: |
| Uploaded files | 15,028 | 1,283 | **−91.5%** |
| Uploaded bytes | 648.1 MB | 49.0 MB | **−92.4%** |
| `vercel deploy --dry` median | 75,400 ms | 4,419 ms | **−94.1%** (provisional, n=3) |
| `vercel deploy --dry` best case | 16,624 ms | 4,419 ms | −73.4% |

- Independent confirmation: a real Vercel **preview** deployment with the reduced context reached `READY`
  (`dpl_ipB7DL92no6pJ7MB8k5KpqTDbShj`, 135,525 ms wall including upload) — the excluded content is genuinely not needed
  to install and build server-side. Production was never targeted by this deploy.
- Cross-check: `git archive HEAD` extracts 1,104 files; the final upload context is 1,283 files, i.e. it now approximates
  tracked repository content instead of local scratch state.
- Decision: **keep**.

### Rank 2 / 3 — Repeated and independent check work — **MEASURED, NOT APPLIED**

- Measured structure of `npm run landing:quality:production` (226,761 ms): the 16 registered scanners are **already**
  shared-context and `Promise.all`-parallel and cost only **1,908 ms** in total (13 in-process static scans ≈55 ms each;
  3 specialist Node scans at 288/248/278 ms). The Stage 2 gate then cost **224,935 ms** because it re-runs
  `typecheck` + `lint` + `test` + `build` **serially** via `spawnSync` (`scripts/stage2-pre-review-gate.mjs:469-473`).
  Hypothesis 2 ("repeated scanner work") is therefore **already solved** in the current code — no redundant scanner
  invocation was found; the cost is the duplicated deterministic checks.
- Experiment (hypothesis 3, isolation proven first): ran `lint` + `typecheck` + `test` + `build` concurrently.
  Wall **107,305 ms** vs serial sum ~**247,600 ms** → **−56.7%**, with identical outcomes
  (lint 128 problems/0 errors, typecheck clean, test pass 270/fail 1, build succeeded).
- Restricted experiment: ran only the provably read-only checks (`lint` + `test` + `validate:public-site`) concurrently.
  Wall **56,015 ms** vs serial sum ~**130,964 ms** → **−57.2%**, identical outcomes again.
- Decision: **not applied**, for two explicit reasons:
  1. `npm run typecheck` is `next typegen && tsc --noEmit`, which writes into `.next/types`, while `next build` writes
     `.next`. The plan forbids typegen/build races, so typecheck cannot be co-scheduled with build without a separate
     `.next` location — a structural change to the gate, not a bounded parallelism flag.
  2. The gate is the release authority and its **PASS path cannot be exercised in this checkout** (see Failures:
     `npm test` fails on `.codegraph`, and the compliance scan fails closed on commercial evidence). A change to its
     execution structure therefore could not be verified against a passing baseline. Per the non-deviation rule this is
     recorded as a quantified opportunity (−56.7% / −57.2% measured) plus an exact blocker, not silently shipped.

### Rank 4 — Duplicate build — **QUANTIFIED, NOT CHANGED**

- Measured duplication: one release performs the production Next.js build **twice** — locally as a mandatory gate
  (`npm run build`, 58,103–102,593 ms) and again on Vercel (`vercel.json` `buildCommand`), plus `validate:public-site`
  both locally (`scripts/release-decision-journey.ts`) and inside the Vercel build command.
- Decision: **no change**. `planning.md` mandates the local production build as a gate while the D10 conflict above is
  unresolved; removing it would delete a mandatory gate. Owner adjudication required.

### Rank 1 — Install / input reuse — **MEASURED, NO SAFE CHANGE**

- Warm `npm ci --no-audit --no-fund` (default cache): 276,773 ms (n=1).
- Cold `npm ci --no-audit --no-fund --cache <isolated empty dir>`: 289,864 / 308,407 / 274,425 ms, median **289,864 ms**,
  all exit 0 (`install-samples.jsonl`). No global cache was deleted; the isolated cache location was used per the plan.
- Measured cache effect: (289,864 − 276,773) / 289,864 × 100 = **4.5%** — below the 20% target, and the single warm sample
  makes even that provisional.
- Decision: **no change**. The Vercel install is `npx --yes npm@12.0.2 ci`; Vercel's dependency caching is
  platform-managed and cannot be tuned from this repository without changing the release contract. The only local
  alternatives would weaken the contract: replacing `ci` with a mutable install breaks integrity checks, and `--omit=dev`
  is invalid because `lint`, `typecheck`, `test`, and `build` all require devDependencies (`eslint`, `typescript`, `tsx`,
  the Next toolchain, `@playwright/test`). No saving is claimed.

### Rank 6 — Retry / idempotency — **NOT AN ACTIVE COST**

- Confirmed the plan's caution: `runFullCycle` (`src/lib/automation/workflow-engine.ts:276`) has **no caller** anywhere
  in `src/` or `scripts/` — only its own definition matches. It is not an active bottleneck and was not optimised or
  instrumented.

### Assignment-defect fix — `scripts/release-decision-journey.ts` — **APPLIED**

- Measured defect: on Windows `npm` and `vercel` are `.cmd` shims. Probes recorded `execFile("npm", …)` →
  `spawn npm ENOENT` and `execFile("npm.cmd", …)` → `spawn EINVAL` (Node 24 blocks `.cmd` without a shell);
  `execFile("git", …)` → OK. The script called `run("npm", …)` for all five gates and `run("vercel", …)` for
  deploy/inspect, so **the authorised release path could not execute any gate on this platform**.
- Fix: enable the shell on `win32` only, quote every argument, and reject arguments containing shell metacharacters
  (fail closed) because shell arguments are concatenated rather than escaped. Added an entrypoint guard so the module is
  importable for tests, matching the existing pattern in `scripts/run-landing-quality.mjs`.
- Verification: `npm --version` now resolves through `run()`; a spaced commit message survives quoting byte-exact
  (compared against `.git/COMMIT_EDITMSG`); 3/3 new focused tests pass; full suite 273 pass / 1 pre-existing fail.
- Behaviour preserved: the gates, their order, the allowlist assessment, the `--execute` requirement, and the
  `DeploymentReceiptV1` shape are unchanged. With a non-allowlisted working tree the real script still returns
  `{"eligible": false, "reasons": ["OUTSIDE_STRUCTURED_CONTENT_ALLOWLIST"]}` and performs **no commit and no deploy**
  (`build-pack/evidence/OPTIMISATION-20260928/release-assess.txt`).

## Coverage and reliability

- Required checks after the changes (Phase D): `npm run lint` exit 0 (35,986 ms), `npm run typecheck` exit 0 (10,250 ms),
  `npm run build` exit 0 (58,103 ms), `npm run validate:public-site` exit 0 (2,508 ms), `npm test` 273 pass / 1 fail /
  3 skipped (40,653 ms) — the single failure is the pre-existing `.codegraph` EISDIR, unchanged from baseline
  (baseline 270 pass / 1 fail; the +3 are the new tests).
- Final clean-tree re-verification after the cold-install samples had finished replacing `node_modules`:
  `npm run lint` exit 0 (101,561 ms), `npm run typecheck` exit 0 (22,980 ms), and the four affected suites
  (`release-decision-journey`, `stage2-pre-review-gate`, `run-landing-quality`, `automation-release-policy`)
  **25/25 pass, 0 fail** (6,732 ms).
- Three runs were discarded as environmental, not product failures, and are recorded rather than hidden:
  `final-lint-01`, `final-typecheck-01`, and `final-focused-01` all exited 1 in ~2 s with `'eslint' is not recognized` /
  `'next' is not recognized` because the background cold `npm ci` samples were replacing `node_modules` concurrently.
  They were re-run cleanly as `final2-*` above.
- Full-suite contention flake: `final2-test-01` reported 272 pass / 1 fail but listed two names —
  `home-section-separators` (20,018 ms) and `vendor-removal`. `home-section-separators` passes in isolation in 1,060 ms,
  so it is a CPU-contention timing flake on this 4-core machine, not a regression. Only the pre-existing `.codegraph`
  EISDIR failure persists.
- First-pass success: install, validate, typecheck, build, dry-run, and the preview deploy all succeeded on first attempt
  after the changes. Two **self-inflicted** failures are recorded under Failures rather than hidden.
- Duplicate runs / deployments: no production deployment was created. Two Vercel previews were created (one successful,
  one failed through my own file-restore error); production identity was unchanged throughout.
- Output/receipt equivalence: gate and scanner report schemas were not modified; the 16-scanner contract, the
  `landing-quality-summary.json` fields, and `DeploymentReceiptV1` are untouched.
- Idempotency: `.vercelignore` is declarative and adds no state; the release-script change adds no new run state.
- `vercel.json` deliberately **not** changed: its `buildCommand`/`installCommand`/`regions` are the release contract and
  are bound by `build-pack/receipts/phase-one-release.json`. No measured bottleneck justified altering it.
- `npm audit`: 1 high advisory, `sharp < 0.35.4` (repo pins 0.35.3), pre-existing. **Not** auto-fixed — `npm audit fix
  --force` would change the dependency manifest and the recorded lock hash, outside this assignment's authority.

## Production deployment and domain verification

**No production deployment was performed.** Reasons: `execution-state.json` records `publication.enabled = false` and
`P2-ACT-001 = blocked`; the mandatory `npm test` gate does not pass in this checkout; and `optimiseplan.md` section 5
forbids benchmarking by repeatedly deploying production. The change was instead validated with a read-only dry-run plus
one Vercel **preview** build, which proves the reduced upload context installs and builds server-side. End-to-end
start-to-production-confirmation time is therefore reported as **partial**, never as a false outcome.

Independent verification of the live domain (unaffected by this work),
`build-pack/evidence/OPTIMISATION-20260928/domain-verify.txt`, 2026-09-28T19:10:54Z:

Current production identity: `dpl_CHTbWYWtNMKDfQDH6U7SXJky5mXK` (from `vercel inspect --json`,
`build-pack/evidence/OPTIMISATION-20260928/prod-inspect.json`), target `production`, state **READY**, region `cpt1`,
deployment URL `vetted-saa-s-blueprint-lgdgcl0rp-michaelchamboko-gravityclaw.vercel.app`, aliased to
`https://vettedsaasblueprint.online`, `https://www.vettedsaasblueprint.online`, and
`https://vetted-saa-s-blueprint.vercel.app`. No production deployment was created or promoted by this work, so this
identity is unchanged from before the first experiment.

| Route | Status | Cache | Bytes | Principal content |
| --- | ---: | --- | ---: | --- |
| `/` | 200 | HIT | 48,957 | title "VettedSaaSBlueprint — Practical SaaS reviews" |
| `/decision-hub` | 200 | HIT | 37,804 | h1 "How should a five-person team choose software without a technical administrator?" |
| `/solution-hub` | 200 | HIT | 30,377 | h1 "Which software approach fits a five-person team that cannot maintain its own systems?" |
| `/scenarios` | 200 | HIT | 38,079 | h1 "For a five-person team with no technical administrator, what should guide the next software choice?" |

`X-Content-Type-Options: nosniff` confirmed on every route; all served from `cpt1`. Re-checked after all experiments:
all four routes still 200 with identical byte counts. No route was changed by this work, so there are no changed-route
checks beyond these.

Changed-file runtime verification instead of a production deploy:

- `.vercelignore` → proven by the `vercel deploy --dry` composition (1,283 files with all required inputs present: `src`,
  `public`, `docs`, `build-pack`, `.agents`, `scripts`, `tests`, `package.json`, `package-lock.json`, `vercel.json`,
  `next.config.ts`, `.stage2`) and by the `READY` preview build.
- `scripts/release-decision-journey.ts` → proven by executing the real script with fixtures (fails closed, no deploy) and
  by 3 passing tests.

## Post-deployment QA (separate)

Kept separate from build critical-path timing; not converted into a new gate. D10 references `D10-S-659ee8e5398d`,
`D10-S-f1c5ab220adc`.

Observations on the existing production deployment (unchanged by this work):

| D10 step | Observation | Classification |
| --- | --- | --- |
| Confirm production | All four routes `Ready` + HTTP 200 with principal content | Pass |
| Inspect | Homepage 48,957 bytes; three decision-journey routes render server-first with distinct h1s; `nosniff` present | Pass |
| Inspect | `/scenarios` returned no `<title>` match in the fetched HTML while the other three routes did | Follow-up: verify metadata on that route; not a build-path issue |
| Classify | Availability proven; content depth and motion quality remain the watchdog's existing remit | No change proposed |
| Improve | Upload-context reduction and release-script portability are this cycle's improvements | Recorded |
| Recheck | Domain re-verified after all experiments: 4/4 routes 200, identical byte counts | Pass |

The existing watchdog already parallelises its catalog pilot route checks; that work was not re-proposed. Its wall time
was not re-measured because no new production deployment was made.

## Failures, blockers, and skips

1. **`npm test` fails at baseline and after the change** — `tests/vendor-removal.test.ts:27` throws
   `EISDIR: illegal operation on a directory, read` on `.codegraph`, an untracked local junction excluded via
   `.git/info/exclude` and absent from a clean checkout. Proven by moving the junction outside the repository tree: the
   test then passes **1/1**, and the junction was restored afterwards. Repository content itself is compliant (933 files
   scanned, 0 filename hits, 0 content hits). **Blocker remains:** the fix is a one-entry addition to that test's existing
   `excludedDirectories` set, which already documents "workspace-local artifact directories are not repository content",
   but `tests/` is outside this assignment's authorised file list, so it was not edited. Independent work continued.
   Consequence: the mandatory release gate cannot pass here, which is why no production deploy was attempted.
2. **`npm run landing:quality:production` / `npm run validate:stage2` exit 1** — causes: (a) the `npm test` failure above;
   (b) `typecheck`/`build` reported "did not emit valid JSON" because the gate parses stdout as JSON for checks that emit
   text; (c) the compliance scanner legitimately fails closed with `partnerstack_url_integrity_unknown`,
   `program_rules_unknown`, `destination_review_missing`, `release_authorization_missing`, `inflated_or_copied_scores` on
   `elevenlabs-ai-voice-generator.json` and `moosend-email-marketing-automation.json`. (c) is the correct commercial
   fail-closed state while `publication.enabled = false`; it was **not** weakened. The gate's PASS path is therefore
   unverifiable in this checkout — the blocker recorded under Rank 2/3.
3. **Self-inflicted, recorded honestly:** the timing harness initially lived at `.stage2/opt/*.cjs`. Vercel and ESLint do
   not honour `.gitignore` and `.stage2/**` is not ESLint-ignored, so those `require()`-style files injected 8 lint
   **errors** and made `base-lint-02` exit 1 (true baseline is 128 problems / **0** errors). Fixed by relocating the
   harness outside the repository; lint then returned to exit 0 with 128 warnings. This is why the two lint samples differ.
4. **Self-inflicted, recorded honestly:** restoring the baseline `.vercelignore` with `Set-Content -NoNewline` collapsed it
   onto a single line, and the paired baseline preview deploy exited 1 (154,062 ms). The final `.vercelignore` was restored
   from a saved copy and re-verified. A paired baseline-vs-final **deploy** comparison is therefore not established; only
   the `--dry` context comparison and the successful preview build are claimed.
5. **Incidental generated edit reverted:** `next-env.d.ts` was modified by `next typegen` during measurement runs and
   restored with `git checkout`, so the diff contains only authorised changes.
6. **Skipped:** `vercel build --prod` (known `spawn cmd.exe ENOENT` on Windows per `planning.md`);
   `--ci-parallel-core` (explicitly disallowed — no `.github` workflow exists to enforce the delegated sibling checks);
   the scheduled-cycle end-to-end run (publication disabled, `P2-ACT-001` blocked); and the production deploy (see above).
7. **Tooling limits:** the `explore`/`task` subagents returned unavailable-model errors, so all reachability analysis was
   done directly with `rg`, import inspection, and route inventories rather than delegated. A clean-checkout test run via
   `git archive` + `tsx` was started but hung on tsx resolution and was stopped; the equivalent proof was obtained by
   moving the junction out of the tree instead.

## Rollback

Not required. No production deployment was made, so production remains `dpl_CHtbWYwNMKfQDH6U7SXJk2mXK` (`Ready`) and was
re-verified after every experiment. Both changes are independently revertible: `git checkout -- .vercelignore` restores
the upload context, and `git checkout -- scripts/release-decision-journey.ts` restores the script. If a future release
with the reduced context misbehaves, native Vercel recovery is the only mechanism and its receipt must be recorded here.

## Final decision

**What changed**

- `.vercelignore`: added `.automation/`, `.codegraph`, `.impeccable/`, `.opencode/`, `*.log`, `tsconfig.tsbuildinfo`.
  `.stage2/` was deliberately **not** excluded: `src/lib/visibility-pages/catalogue.ts:138` reads
  `.stage2/visibility-publications.json` at module load (currently absent → fails closed per
  `build-pack/receipts/manual-production-deploy-2026-09-21.json`), and because Vercel ignores `.gitignore`, excluding it
  would permanently remove a real app input path. `.opencode/`, `.impeccable/`, `*.log`, and `tsconfig.tsbuildinfo` are
  read by no `src/` module, and the preview build with them excluded reached `READY`.
- `scripts/release-decision-journey.ts`: Windows-safe child-process invocation (shell on `win32` only, quoted arguments,
  metacharacters rejected fail-closed) plus an entrypoint guard for testability.
- `tests/release-decision-journey.test.ts`: 3 new tests for shim resolution, space preservation, and quoting safety.

**Measured result:** upload context −91.5% files / −92.4% bytes; `vercel deploy --dry` median −94.1% (provisional, n=3);
the release path moved from "cannot execute any gate" to executing and correctly failing closed. Stage 2 gate
parallelism quantified at −56.7% (all four core checks) / −57.2% (isolated subset) with identical outcomes, but **not
applied**.

**Remaining risk**

- The upload/deploy saving is measured on the CLI scan and proven buildable by a preview, not on a production deploy;
  absolute production wall time is **not** claimed.
- The mandatory `npm test` gate still fails in this checkout until `.codegraph` is added to
  `tests/vendor-removal.test.ts`'s `excludedDirectories` (or the local junction is removed). Until then the authorised
  release path cannot complete locally.
- The Stage 2 gate's PASS path remains unverifiable here, so the duplicated deterministic checks (~225 s per landing
  quality run) are still paid.
- The `sharp` advisory remains unpatched by design; the D10-vs-`planning.md` gate conflict remains for owner adjudication.

**Exact next actions**

1. Owner decision: add `.codegraph` to `tests/vendor-removal.test.ts` `excludedDirectories` (or remove the local
   junction) so the mandatory test gate passes in this checkout.
2. Owner decision: adjudicate `planning.md`'s pre-deployment gates against D10 `D10-S-659ee8e5398d` /
   `D10-S-f1c5ab220adc`, which determines whether the duplicated local production build and the serial Stage 2 core
   checks are removed or parallelised.
3. Then run one authorised release through `vercel deploy --prod --yes` (owner-reviewed, never the content-only
   allowlist), record the deployment ID, `Ready` state, UTC timings, and the four-route checks into a
   `DeploymentReceiptV1`, and re-measure start-to-production-confirmation against this baseline.
