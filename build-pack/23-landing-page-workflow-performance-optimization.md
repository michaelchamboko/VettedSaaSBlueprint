# 23 - Landing-Page Workflow Performance Optimization

## Purpose

This document remediates the structural execution gaps found in `performance-review.md` for Stage 1, Stage 2, and Stage 4.

The target is workflow performance: smaller reviewable units, deterministic pre-review checks, confidence scoring, and safe parallel validation. It does not change landing-page product scope, publication rules, or public deliverables.

## Stage 1 - Micro-Task / Test / Commit Matrix

Each row is a planned review and commit boundary. The planned commit names are audit labels only; this document does not authorize creating commits.

| Micro-task ID | Scope | Single Responsibility | Validation Check | Planned Commit Boundary | Dependencies | Pass Criteria |
|---|---|---|---|---|---|---|
| LP-T09-BRIEF-01 | Page brief intake / source-of-truth validation | Verify generated page artifacts are indexed, route-addressable, and tied to the static landing-page source of truth. | `npm run scan:landing:route` | `commit: lp-t09-brief-source-validation` | Generated artifact and index exist | Manifest entries resolve to artifacts and `/landing-page-builders/[slug]` can retrieve them. |
| LP-T09-STRUCTURE-01 | Page structure generation | Verify every artifact has the required direct-review sections before page rendering or review. | `npm run scan:landing:structure` | `commit: lp-t09-page-structure-validation` | LP-T09-BRIEF-01 | Required metadata, disclosure, hero, benefits, limitations, FAQ, CTA, and score structures are present. |
| LP-T09-HERO-01 | Hero section validation | Verify hero copy, CTA label, disclosure proximity, and approved hero asset metadata are structurally safe. | `npm run scan:landing:hero` | `commit: lp-t09-hero-validation` | LP-T09-STRUCTURE-01 | Hero headline, subheadline, CTA, disclosure, and approved visual metadata pass blocking checks. |
| LP-T09-CTA-01 | CTA validation | Verify CTA ids, labels, and destination wiring remain consistent with reviewed affiliate link records. | `npm run scan:landing:cta` | `commit: lp-t09-cta-validation` | LP-T09-HERO-01 | Hero CTA and CTA block ids are present and consistent, with no unresolved CTA mapping. |
| LP-T09-SEO-01 | SEO metadata validation | Verify title, meta description, slug, and metadata route wiring before build review. | `npm run scan:landing:seo` | `commit: lp-t09-seo-metadata-validation` | LP-T09-STRUCTURE-01 | SEO fields exist, route metadata uses artifact metadata, and blocking metadata defects are zero. |
| LP-T09-COMPLIANCE-01 | Compliance validation | Run deterministic affiliate disclosure, claim, evidence, PartnerStack, destination, and artifact QA checks. | `npm run scan:landing:compliance` | `commit: lp-t09-compliance-scanner-validation` | LP-T09-CTA-01 | Compliance scanner reports no blocking publication-safety findings. |
| LP-T09-UNIQUENESS-01 | Uniqueness / duplicate content validation | Run deterministic duplicate, sibling-pattern, copied-score, and artifact QA checks. | `npm run scan:landing:uniqueness` | `commit: lp-t09-uniqueness-scanner-validation` | LP-T09-STRUCTURE-01 | Uniqueness scanner reports no duplicate or near-duplicate blocking findings. |
| LP-T09-INSTRUMENTATION-01 | Conversion instrumentation validation | Verify first-party CTA/page tracking hooks are present without adding third-party pixels or profiling. | `npm run scan:landing:conversion` | `commit: lp-t09-conversion-instrumentation-validation` | LP-T09-CTA-01 | CTA tracking attributes and `OracleTracking` integration exist, with no third-party pixel indicators. |
| LP-T09-RESPONSIVE-01 | Responsive layout validation | Verify the renderer has static responsive layout safeguards before screenshot or preview review. | `npm run scan:landing:responsive` | `commit: lp-t09-responsive-static-validation` | LP-T09-STRUCTURE-01 | Static renderer uses responsive layout primitives and no blocking responsive-source defects are found. |
| LP-T09-A11Y-01 | Accessibility validation | Verify static accessibility hooks for headings, disclosure link, image alt text, and semantic sections. | `npm run scan:landing:a11y` | `commit: lp-t09-accessibility-static-validation` | LP-T09-HERO-01 | Required heading, disclosure, alt text, and section checks pass with zero blocking defects. |
| LP-T09-ASSET-01 | Image / asset validation | Verify approved generated images use local public assets and include prompt summary plus alt text. | `npm run scan:landing:assets` | `commit: lp-t09-image-asset-validation` | LP-T09-HERO-01 | Approved visual assets resolve under `public/`, have alt text, and do not rely on remote image hosts. |
| LP-T09-PUBLISH-01 | Publishing-readiness validation | Verify workflow gates, source-of-truth records, and scanner outputs are present before publish approval. | `npm run scan:landing:publish-readiness` | `commit: lp-t09-publish-readiness-validation` | LP-T09-COMPLIANCE-01, LP-T09-UNIQUENESS-01, LP-T09-INSTRUMENTATION-01, LP-T09-ASSET-01 | Publish-readiness documentation and gate wiring exist; unresolved source/evidence/link references remain blocking. |
| LP-T09-PRESHIP-01 | Final pre-ship review gate | Produce the ordered Stage 2 pre-review report before subjective owner or specialist review. | `npm run gate:stage2:pre-review` | `commit: lp-t09-stage2-pre-review-report` | All LP-T09 micro-tasks | Gate report records deterministic check statuses, blocking failures, manual review items, and confidence score. |

### Micro-Task Execution Contexts

| Micro-task ID | Execution Context |
|---|---|
| LP-T09-BRIEF-01 | GitHub/Vercel source review and docs-only/static inspection. |
| LP-T09-STRUCTURE-01 | GitHub/Vercel static scanner against generated artifacts. |
| LP-T09-HERO-01 | GitHub/Vercel static scanner plus hosted preview review when available. |
| LP-T09-CTA-01 | GitHub/Vercel static scanner; source-of-truth affiliate link state remains audited record review. |
| LP-T09-SEO-01 | GitHub/Vercel route/static metadata scanner. |
| LP-T09-COMPLIANCE-01 | GitHub/Vercel deterministic compliance scanner; owner/specialist review remains manual before approval. |
| LP-T09-UNIQUENESS-01 | GitHub/Vercel deterministic uniqueness scanner and sibling artifact comparison. |
| LP-T09-INSTRUMENTATION-01 | GitHub/Vercel static scanner and tests; no third-party tracking services. |
| LP-T09-RESPONSIVE-01 | GitHub/Vercel static scanner plus hosted preview review when available. |
| LP-T09-A11Y-01 | GitHub/Vercel static scanner plus hosted preview review when available. |
| LP-T09-ASSET-01 | GitHub/Vercel static scanner; owner asset approval must come from audited records. |
| LP-T09-PUBLISH-01 | GitHub/Vercel pre-review scanner; Oracle data-backed proof remains approved-runtime only. |
| LP-T09-PRESHIP-01 | GitHub/Vercel Stage 2 pre-review report before subjective review. |

## Stage 2 - Deterministic Pre-Review Gate

The canonical pre-review command is:

```powershell
npm run gate:stage2:pre-review
```

The gate runs or records checks in this logical order:

| Order | Check | Command / Source | Blocking Before Human Review |
|---:|---|---|---|
| 1 | Static task matrix validation | `npm run validate:landing:matrix` | Yes |
| 2 | Typecheck | `npm run typecheck` | Yes |
| 3 | Lint / static syntax validation | `npm run lint` | Yes |
| 4 | Unit tests | `npm run test` | Yes |
| 5 | Component tests | Not configured yet; recorded as skipped | No |
| 6 | Build validation | `npm run build` | Yes |
| 7 | Landing-page route validation | `npm run scan:landing:route` | Yes |
| 7.1 | Landing-page structure validation | `npm run scan:landing:structure` | Yes |
| 7.2 | Hero section validation | `npm run scan:landing:hero` | Yes |
| 7.3 | CTA validation | `npm run scan:landing:cta` | Yes |
| 8 | SEO metadata scanner | `npm run scan:landing:seo` | Yes |
| 9 | Accessibility scanner | `npm run scan:landing:a11y` | Yes |
| 10 | Link scanner | `npm run scan:landing:links` | Yes |
| 11 | Form validation scanner | `npm run scan:landing:forms` | Yes |
| 12 | Compliance scanner | `npm run scan:landing:compliance` | Yes |
| 12.5 | Uniqueness / duplicate content scanner | `npm run scan:landing:uniqueness` | Yes |
| 13 | Conversion / analytics instrumentation scanner | `npm run scan:landing:conversion` | Yes |
| 13.5 | Conversion-copy scanner | `npm run scan:landing:conversion-copy` | Yes |
| 13.75 | Image / asset validation | `npm run scan:landing:assets` | Yes |
| 14 | Responsive layout or screenshot validation | `npm run scan:landing:responsive` | Yes |
| 14.5 | Publishing-readiness scanner | `npm run scan:landing:publish-readiness` | Yes |
| 15 | Human review | `build-pack/13-review-gate.md` plus specialist skill outputs | Yes before approval, not before deterministic triage |

The gate records each deterministic check as `pass`, `fail`, `skipped`, or `blocked`, records the failure reason, and stops approval when a blocking deterministic check fails.

## Confidence Scoring Model

### High Confidence

Use only when build, typecheck, lint, tests, landing-page scanners, compliance gate, and parallel execution safety all pass, and no blocking manual-review items remain. A skipped non-blocking check, such as component tests before a component-test target exists, does not by itself prevent High confidence.

### Medium Confidence

Use when core deterministic checks pass, no known blocking defect exists, but some scanner coverage is skipped or subjective manual review remains required.

### Low Confidence

Use when any core deterministic check fails or is skipped, landing scanners are missing or unavailable, compliance cannot be verified, test isolation is unclear, commit boundaries are not auditable, or parallel execution would introduce unsafe shared state.

## Stage 4 - Safe Parallel Execution Plan

CI should avoid serializing independent validation tracks after dependency installation. The safe split is:

| Track | Runs Concurrently With | Command / Runtime | Shared-State Rule |
|---|---|---|---|
| Typecheck | Lint, tests, build, landing scanners | `npm run typecheck` in GitHub/Vercel | Fresh checkout and `npm ci` per job; no shared mutable workspace. |
| Lint / syntax | Typecheck, tests, build, landing scanners | `npm run lint` in GitHub/Vercel | Fresh checkout and `npm ci` per job. |
| Unit/integration tests | Typecheck, lint, build, landing scanners | `npm run test` in GitHub/Vercel | Run as one process until env/fetch-mutating tests are isolated into separate shards. |
| Build validation | Typecheck, lint, tests, landing scanners | `npm run build` in GitHub/Vercel | Fresh `.next` output per job; do not share `.next` across jobs. |
| Landing static scanners | Typecheck, lint, tests, build | Scanner matrix jobs emit JSON reports; `npm run gate:stage2:pre-review -- --ci-prechecked --scanner-report-dir <dir>` verifies and aggregates them after parallel app checks pass. | Scanner reads source and artifacts only; no service startup. Final gate fails closed on missing, malformed, inconsistent, or non-pass scanner reports. |
| Preview smoke review | After hosted deployment is available | Vercel preview URL and review-gate checklist | Do not start local dev servers by default; use hosted preview evidence. |
| Oracle schema / Hermes checks | Sequential after T02A and explicit approval | Approved Oracle runtime only | No schema/Hermes mutation until read-only DB verification and separate approval. |

### Stage 4 Resource-Isolation Rules

- Environment variables: CI jobs must not share mutable process state. Tests that mutate `process.env` remain in the single test job until they restore original values, including deleting variables that were originally undefined.
- Fetch and global mocks: tests that replace `global.fetch` or other globals must run in the unsharded test job until cleanup helpers guarantee restoration in `finally` blocks.
- Ports and services: Stage 4 parallel jobs must not run `npm run dev`, `npm run start`, `npm run hermes`, local preview servers, Oracle clients, or long-lived background services.
- Temp files and reports: every job writes only to its own fresh checkout. Matrix scanner reports use unique artifact names, and any future temp directories must be per-job or `mkdtemp`-scoped with cleanup.
- Build/cache state: jobs may use the package-manager cache from `actions/setup-node`, but must not share `.next`, test output, generated reports, or mutable build artifacts across jobs.
- Network and external APIs: static scanners read local source and generated artifacts only. Oracle, Hermes, DB-backed checks, crawlers, and live third-party API checks remain sequential approval-gated work outside the default CI split.
- Gate authority: report-only scanner matrix jobs provide early parallel signal and JSON evidence. `landing-workflow` remains the authoritative blocking Stage 2 gate and must verify scanner report identity, schema, coverage, summary consistency, and pass/fail state before approval.

## CI Wiring

`.github/workflows/preview-build.yml` uses separate jobs for typecheck, lint, tests, build, parallel landing scanner signal, and landing workflow validation. The scanner matrix runs report-only and uploads one report artifact per scanner, so reviewers get early parallel signal without bypassing approval gates. The Stage 2 report job depends on those checks, downloads the same-run scanner artifacts, and runs with `--ci-prechecked --scanner-report-dir`, so it can record app checks as already passed by required CI jobs while making the final ordered blocking decision from verified scanner evidence.

## Review-Gate Reporting

`build-pack/13-review-gate.md` must treat the Stage 2 pre-review report as required evidence before specialist or owner review. A page is not approval-ready when the report status is `FAIL`, confidence is `Low`, or any blocking deterministic failure remains.
