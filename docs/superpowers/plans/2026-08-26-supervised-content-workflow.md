# Supervised Content Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Purge Neon, Oracle, Hermes, LP002, database-backed application services, and GitHub-hosted automation, then replace them with a four-stage supervised evidence-to-Vercel workflow.

**Architecture:** Repository files are the content, evidence, and publication record. One four-stage registry and deterministic local checks guide an approved agent. GitHub stores and merges source; Vercel builds and deploys `main`. No database, remote worker, job queue, admin/auth runtime, analytics ingestion service, GitHub Actions runner, bot publisher, or workflow artifact is in the release path.

**Tech Stack:** TypeScript, Next.js, Zod, Node test runner, Git, Vercel.

**Spec:** `docs/superpowers/specs/2026-08-26-supervised-content-workflow-design.md`

## Global Constraints

- Do not touch the dirty operator checkout; work only in the isolated branch from current `origin/main`.
- Remove every active requirement and runtime dependency for Neon, Oracle, Hermes, LP002, GitHub Actions, and hosted runners.
- Remove database-backed admin, authentication, publication, tracking, redirect, and evidence services because the database no longer exists.
- Preserve Vercel hosting and GitHub only as the source repository and merge point.
- Preserve exact approved affiliate URLs, visible disclosure, claim accuracy, accessibility, and live verification.
- Preserve existing public pages and historical release artifacts.
- Git history is the only archive for deleted workflow material.
- Use tests before behavior changes and keep deletions in independently reviewable commits.

---

## Repository-wide audit findings

The audit covered all 611 tracked files on current remote `main`, including 201 source files, 186 documentation files, 81 tests, 53 project-local skill files, 34 scripts, database definitions, workflows, operations files, and root instructions.

### Proven causes of the delivery failure

1. `landing:run` is not a publication command. It dispatches only the V001 research path and terminates at `RESEARCH_COMPLETE`.
2. The documented LP002 publication coordinator does not exist as an executable implementation.
3. The V001 research command refuses to start without a separate PostgreSQL control database, applied migrations, active pipeline state, and a fresh remote-worker capability.
4. The required remote worker is split across Oracle-hosted service instructions, Hermes executors, a systemd unit, PostgreSQL leases, and protected activation commands.
5. Repository history records repeated nightly and recovery attempts stopping at the same infrastructure preflight before selecting a URL or gathering evidence.
6. Five approved products have no tracked evidence pack. The two published products use small three-source, three-claim packs, demonstrating that publication quality never required the surrounding control plane.
7. The active registry contains fourteen sequential stages, while the useful human-visible outcome has only four responsibilities: choose the decision, establish evidence, validate the page, and release it.
8. The active rules duplicate authority across `AGENTS.md`, `project_rules.md`, two orchestrator skills, specialist skills, workflow docs, deployment docs, the PRD, and a planning document with twenty-seven mandatory tasks.
9. Current instructions conflict: the artistic landing skill treats design references as advisory, while active workflow documentation still prescribes reference-catalogue selection and recipe artifacts.
10. Batch retro, multiple independent review artifacts, database fingerprints, worker attestations, and coordinator receipts became publication authorities instead of diagnostic aids.

### Dependency classification

| Area | Current role | Decision | Reason |
| --- | --- | --- | --- |
| PostgreSQL `pg` dependency | Used only by `src/lib/landing-research/neon.ts` | Delete | It has no remaining consumer outside the retired landing control plane. |
| Neon V001/R001 migrations | Research jobs, leases, artifacts, worker capability, activation | Delete | They implement the retired authority model. |
| Landing research scripts | Preflight, prep, status, activation, migration verification | Delete | Every command exists to service Neon or the remote worker. |
| Landing research contracts | Hermes executor capabilities and durable research snapshots | Delete | The replacement uses repository evidence records and does not need remote attestation. |
| Oracle-hosted Hermes research worker | Product identity and research executor | Delete | Supervised agents gather bounded evidence directly. |
| General `hermes/worker.ts` | Placeholder jobs, old automation transition, database artifact export | Delete | The worker and its database no longer exist. |
| `/api/hermes/jobs/**` | Queue claim, heartbeat, completion and failure | Delete with the general worker | No remaining supervised workflow consumer is expected. |
| `/api/hermes/landing-artifacts` and revalidation | Remote-worker publication support | Delete | Git commits and Vercel deployment replace worker-driven artifact export and revalidation. |
| Oracle application database | Admin, auth, evidence ledger, publication records, metrics | Delete | The database has already been removed and these consumers are dead runtime paths. |
| Admin and authentication surfaces | Owner login and database-backed administration | Delete | A static public content site does not need a private application runtime. |
| First-party tracking ingestion | Database-backed events and daily metrics | Delete | Static delivery must not depend on a missing database; Vercel traffic data can be assessed separately later. |
| Affiliate redirect endpoint | Database-backed click logging before redirect | Delete and render direct URLs | Existing generated pages already support exact affiliate destinations. |
| Exact affiliate URL parser | Byte-preserved CTA authorization | Move and preserve | This is a useful compliance control, not infrastructure complexity. |
| Product evidence JSON | Source and claim trace for existing pages | Preserve and simplify prospectively | Existing pages depend on it and it supports honest editorial decisions. |
| Unique/compliance/conversion scanners | Diagnostic checks | Preserve internally, remove sequential authority | Their findings are useful when combined into one quality result. |
| Visual and accessibility checks | Responsive, overflow, reduced-motion and browser health | Preserve | These detect real user-facing defects. |
| GitHub repository | Source storage and merge history | Preserve | This is the only GitHub responsibility retained. |
| GitHub Actions and hosted runners | CI checks, bot publication, production verification and artifact uploads | Delete | They have blocked releases before executing useful work; local checks plus Vercel build and live verification replace them. |
| Vercel | Preview, build, production deployment and live hosting | Preserve | It is the sole deployment platform. |
| Reference catalogue and artistic guidance | Optional design inspiration | Preserve as advisory | It must never block evidence gathering or publication. |
| Batch retro | Recurring-failure learning | Make conditional | It is valuable only after the same failure recurs, not after every batch. |

### Files scheduled for deletion

The purge must include the complete contents of these dedicated subsystems, subject to the zero-consumer check in each task:

- `src/lib/landing-research/`
- obsolete `src/lib/landing-automation/` modules after moving `approved-urls.ts`
- `hermes/landing-research-worker.ts`
- `hermes/executors/`
- `hermes/worker.ts` and `src/app/api/hermes/` when the final consumer audit confirms no independent use
- `src/lib/db/`, `src/types/oracledb.d.ts`, and all Oracle schemas and migrations
- `src/app/admin/`, `src/app/api/admin/`, `src/lib/auth/`, and database authentication middleware
- `src/app/api/events/`, `src/app/ingest/events/`, database tracking handlers, and `OracleTracking`
- `src/app/r/affiliate/route.ts` after direct affiliate destinations are verified
- database-backed publication modules and API routes after generated content is repository-native
- `.github/workflows/preview-build.yml` and `.github/workflows/landing-production-verify.yml`
- tests whose only subject is GitHub runner configuration, workflow artifacts, or required hosted checks
- `ops/systemd/vettedsaas-hermes-research-worker.service`
- V001 and R001 Neon migration and rollback files
- landing research, activation, remote-worker bundle, and migration scripts
- tests dedicated to those deleted modules
- obsolete unattended-publication and Oracle-runner documentation
- the historical full-automation planning document, because Git retains its history

### Files scheduled for focused rewriting

- `AGENTS.md` and `project_rules.md`: one supervised content rule set.
- `planning.md`: concise current status, decisions, lessons, and next action.
- both production orchestrator skills: the same four-stage workflow for reviews and visibility clusters.
- specialist review skills: repair lenses under one quality gate.
- `docs/VetterSaaSBlueprint_PRD.md`: remove retired publication authority without changing the product boundary.
- deployment and dependency-ownership docs: describe a static-first Next.js site deployed only by Vercel.
- `.env.example`: remove all database, wallet, worker, token, artifact-export, and database-public-base variables.
- `package.json` and lockfile: remove PostgreSQL, Oracle, remote-worker, migration, activation, and database-only dependencies and commands.
- generated landing-page contracts and release artifacts: remove Oracle publication fields and recalculate affected repository fingerprints without changing public copy or destinations.

### Explicit preservation boundary

The purge must not accidentally remove:

- public reviews, blog posts, visibility-page renderers, sitemap, robots, metadata, legal pages, or social images;
- existing exact affiliate destinations and disclosure placement;
- evidence wording or historical release files used to render the two published reviews;
- accessibility, responsive, link, quality, local build, Vercel build, and live-deployment checks; or
- unrelated design and media-generation skills.

## Optimized target workflow

### Input contract

An agent receives one `ContentAssignmentV1` containing:

- buyer question;
- audience and workflow;
- VettedSaaSBlueprint editorial angle;
- content type: review, comparison, alternatives, category guide, implementation guide, or evidence study;
- product names and exact approved affiliate URL when applicable;
- evidence checklist;
- maximum source passes and elapsed-time budget; and
- intended internal-link cluster.

The assignment never says only “research this product.”

### Evidence sprint

The default evidence sprint is bounded to one working session. The agent checks official product documentation, official pricing and legal material when relevant, authorized first-party observations, and high-quality independent context. Each claim ends with one allowed status. Unavailable evidence is recorded once and does not trigger recursive research.

Low-risk missing evidence removes or softens one claim. High-risk missing evidence blocks only the affected claim unless that claim is the page's core reason to exist. This replaces all-or-nothing product blocking.

### Content construction

The agent creates one citeable decision record containing a direct answer, explicit editorial verdict, evidence table, best-fit and poor-fit users, limitations, methodology, update date, sources, and relevant internal links. Page structure follows the buyer decision rather than a fixed number of sections or FAQs.

### One quality decision

One command returns:

- `pass`: eligible for the normal Git release path;
- `repair`: exact fields and bounded automatic corrections; or
- `blocked`: fabricated, unresolved high-risk, legally unsafe, or technically broken content.

Uniqueness, compliance, conversion, accessibility, link, responsive, and metadata scanners contribute findings to that result but do not create separate publication states or handoffs.

### Release path

The approved agent commits content and evidence on a branch, runs focused validation in a clean worktree, pushes or merges through the normal Git path, inspects the Vercel preview when available, and verifies production. The Git commit, Vercel deployment, production commit match, and live smoke result are the full release record. GitHub Actions and required hosted checks are not part of the contract.

### Operational target

- Evidence and first candidate: within one bounded working session when public sources are available.
- No infrastructure preflight before evidence gathering.
- No database state transition to draft or publish content.
- No remote worker, capability heartbeat, lease, activation command, coordinator, or second deployment promotion.
- No GitHub Actions job, hosted runner, bot PR, workflow artifact, or required-check dependency.
- No mandatory retro unless a stable failure fingerprint recurs.
- No repeated search after `not_found`; the public wording is narrowed instead.

---

### Task 1: Make the four-stage registry the executable workflow contract

**Files:**
- Modify: `src/lib/landing-workflow/registry.ts`
- Modify: `scripts/describe-landing-workflow.ts`
- Modify: `tests/landing-workflow-registry.test.ts`
- Delete: `tests/landing-workflow-authority-contract.test.ts`

**Interfaces:**
- Produces: `landingWorkflowRegistry` with exactly `decide`, `evidence`, `quality`, and `release`.
- Produces: workflow descriptions that contain no database or remote-worker prerequisites.

- [ ] Write a failing registry test asserting the exact four IDs, supervised ownership, and absence of the retired fourteen IDs.
- [ ] Run `npm test -- tests/landing-workflow-registry.test.ts` and confirm the current fourteen-stage registry fails.
- [ ] Replace the registry entries and simplify the description command to report the four stages.
- [ ] Run the focused test and `npm run landing:workflow:describe -- --json`; confirm both pass and report no retired authority.
- [ ] Commit with `refactor: collapse landing workflow to four stages`.

### Task 2: Remove the infrastructure-only research and coordinator subsystems

**Files:**
- Delete: `db/neon-landing-control-v001.sql`
- Delete: `db/neon-landing-control-v001-rollback.sql`
- Delete: `db/neon-landing-research-authority-r001.sql`
- Delete: `db/neon-landing-research-authority-r001-rollback.sql`
- Delete: `src/lib/landing-research/**`
- Delete: `src/lib/landing-automation/research-preflight.ts`
- Delete: `src/lib/landing-automation/repository.ts`
- Delete: `src/lib/landing-automation/run.ts`
- Delete: `src/lib/landing-automation/state-machine.ts`
- Delete: `src/lib/landing-automation/release.ts`
- Delete: `src/lib/landing-automation/publication-policy.ts`
- Delete: `hermes/landing-research-worker.ts`
- Delete: `hermes/executors/product-identity.ts`
- Delete: `hermes/executors/landing-research.ts`
- Delete: `hermes/executors/hermes-command-adapter.ts`
- Delete: `ops/systemd/vettedsaas-hermes-research-worker.service`
- Delete: `scripts/activate-landing-research.ts`
- Delete: `scripts/apply-neon-research-authority-migration.ts`
- Delete: `scripts/build-hermes-worker.mjs`
- Delete: `scripts/landing-research-prep.ts`
- Delete: `scripts/landing-research-status.ts`
- Delete: `scripts/landing-run.ts`
- Delete: `scripts/validate-landing-research-preflight.ts`
- Delete: `scripts/verify-neon-landing-research-authority-source.ts`
- Delete: `scripts/verify-neon-migration-source.ts`
- Delete: `scripts/verify-neon-migration.ts`
- Modify: `package.json`
- Delete: all focused tests whose subject is one of the deleted files.

**Interfaces:**
- Removes: every landing research database, worker, activation, coordinator, and migration command.
- Preserves: ordinary Next.js build and landing quality commands.

- [ ] Add a failing repository-boundary test that rejects tracked occurrences of the retired commands, environment names, migration schemas, worker contracts, and LP002 outside the explicit purge spec.
- [ ] Run the test and confirm it lists the current infrastructure files.
- [ ] Delete the subsystem files and their tests, then remove their package scripts.
- [ ] Inspect imports with `rg` and remove every dangling reference.
- [ ] Run the boundary test and `npm install --ignore-scripts`; confirm package metadata remains valid.
- [ ] Commit with `refactor: remove landing control infrastructure`.

### Task 3: Preserve exact affiliate URLs without the obsolete automation namespace

**Files:**
- Move: `src/lib/landing-automation/approved-urls.ts` to `src/lib/affiliate/approved-urls.ts`
- Modify: `src/lib/generated/landing-pages.ts`
- Modify: `tests/approved-urls.test.ts`
- Modify: any remaining import returned by `rg "landing-automation/approved-urls"`.

**Interfaces:**
- Preserves: `parseApprovedUrls`, `loadApprovedUrls`, and exact byte-for-byte matching behavior.
- Removes: the final legitimate dependency on `src/lib/landing-automation`.

- [ ] Change the test import first and run `npm test -- tests/approved-urls.test.ts`; confirm it fails because the new module is absent.
- [ ] Move the parser and update production imports without changing behavior.
- [ ] Run the approved-URL and generated-page tests; confirm all exact URL cases pass.
- [ ] Delete the now-empty `src/lib/landing-automation` directory.
- [ ] Commit with `refactor: isolate affiliate URL validation`.

### Task 4: Replace active rules, skills, workflow docs, and planning authority

**Files:**
- Modify: `AGENTS.md`
- Modify: `project_rules.md`
- Modify: `.agents/skills/landing-page-production-orchestrator/SKILL.md`
- Modify: `.agents/skills/visibility-page-production-orchestrator/SKILL.md`
- Replace: `docs/landing-workflow/README.md`
- Delete: `docs/landing-workflow/unattended-publication.md`
- Delete: `docs/deployment/scrapling-oracle-runner.md`
- Modify: `docs/deployment/architecture.md`
- Replace: `planning.md`
- Delete: `docs/archive/2026-07-23-full-automation-v3-planning.md`
- Modify: `docs/VetterSaaSBlueprint_PRD.md`

**Interfaces:**
- Produces: one active supervised workflow definition shared by reviews and clusters.
- Removes: instructions that tell future agents to wait for or rebuild the retired system.

- [ ] Extend the boundary test to scan active Markdown for retired authority language while exempting only the approved purge spec and plan.
- [ ] Run it and capture all current rule and documentation failures.
- [ ] Rewrite active instructions around the four stages, bounded evidence statuses, one quality gate, Git/Vercel release, and field-level repair.
- [ ] Replace `planning.md` with a concise current-status and lessons-learned record; delete the obsolete archived plan because Git history preserves it.
- [ ] Remove retired landing requirements from the PRD without altering unrelated product and data requirements.
- [ ] Run the boundary test and workflow matrix validation.
- [ ] Commit with `docs: purge obsolete landing authority`.

### Task 5: Consolidate editorial validation and bounded evidence rules

**Files:**
- Create: `src/lib/landing-workflow/evidence.ts`
- Create: `src/lib/landing-workflow/quality.ts`
- Create: `tests/supervised-content-quality.test.ts`
- Modify: `scripts/run-landing-quality.mjs`
- Modify: `.agents/skills/affiliate-compliance-review/SKILL.md`
- Modify: `.agents/skills/landing-page-uniqueness-review/SKILL.md`
- Modify: `.agents/skills/conversion-copy-review/SKILL.md`
- Modify: `.agents/skills/landing-page-batch-retro/SKILL.md`

**Interfaces:**
- Produces: `EvidenceStatus = "independently_observed" | "vendor_documented" | "conflicting" | "outdated" | "not_found"`.
- Produces: `evaluateSupervisedContentQuality(input): { status: "pass" | "repair" | "blocked"; findings: QualityFinding[] }`.
- Consumes: visible claims, evidence records, disclosure, exact destination, limitations, metadata, and deterministic scan results.

- [ ] Write failing tests for supported low-risk wording, omitted unsupported wording, blocked high-risk claims, missing disclosure, missing limitation, duplicate intent, and bounded `not_found` evidence.
- [ ] Run the focused tests and confirm the new contract does not exist.
- [ ] Implement the minimal evidence types and pure quality evaluator.
- [ ] Make `landing:quality` emit one consolidated status while retaining the existing deterministic scanners as internal checks.
- [ ] Change the three specialist skills into repair lenses used by the consolidated gate, not sequential publication authorities; make retro conditional on recurrence.
- [ ] Run the focused quality tests and existing scanner tests.
- [ ] Commit with `feat: add supervised evidence quality gate`.

### Task 6: Convert the application to a database-free static site

**Files:**
- Delete: `src/lib/db/**`
- Delete: `src/types/oracledb.d.ts`
- Delete: `db/**`
- Delete: `src/app/admin/**`
- Delete: `src/app/api/admin/**`
- Delete: `src/lib/auth/**`
- Delete or simplify: `src/middleware.ts`
- Delete: `src/app/api/hermes/**`
- Delete: `src/lib/hermes/**`
- Delete: `src/app/api/events/**`
- Delete: `src/app/ingest/events/**`
- Delete: `src/components/landing/OracleTracking.tsx`
- Delete: `src/lib/tracking/oracle-public-endpoints.ts`
- Delete: `src/lib/tracking/oracle-public-event-handler.ts`
- Delete or simplify: `src/lib/tracking/events.ts`
- Delete: `src/app/r/affiliate/route.ts`
- Delete: database-backed publication modules and routes with zero static consumers
- Modify: `src/lib/generated/landing-pages.ts`
- Modify: generated product evidence, release, and quality artifacts that encode Oracle publication fields
- Modify: `.env.example`
- Modify: `package.json`
- Modify: package lockfile
- Modify: privacy and legal copy that describes removed application tracking
- Modify or delete: any remaining tracked file found by the purge boundary test.

**Interfaces:**
- Removes: all PostgreSQL and Oracle clients, schemas, migrations, environment variables, admin/auth APIs, job APIs, tracking ingestion, database publication, and database redirect behavior.
- Produces: public pages entirely from tracked repository content and exact affiliate URLs rendered directly.
- Preserves: the current public routes, copy, evidence, disclosure, metadata, sitemap, robots, and affiliate destinations.

- [ ] Add a failing static-runtime boundary test that rejects `pg`, `oracledb`, Oracle/Neon environment names, database imports, admin/auth routes, event ingestion, Hermes APIs, and database publication modes.
- [ ] Inventory every public route that currently touches a database and record its static replacement or deletion before changing it.
- [ ] Make generated reviews render exact approved affiliate URLs directly, then verify both published reviews before deleting the redirect endpoint.
- [ ] Remove Oracle publication fields such as dynamic publication sources and synchronization receipts; regenerate repository fingerprints deterministically.
- [ ] Delete the database, admin/auth, worker API, tracking ingestion, and database publication trees and remove their dependencies and scripts.
- [ ] Update privacy and legal copy to match the resulting absence of application-level visitor tracking.
- [ ] Run the static boundary test, public-page tests, affiliate URL tests, legal-page tests, type check, lint, and local production build.
- [ ] Commit with `refactor: make public site database free`.

### Task 7: Remove GitHub Actions and runner-based release authority

**Files:**
- Delete: `.github/workflows/preview-build.yml`
- Delete: `.github/workflows/landing-production-verify.yml`
- Delete: `tests/preview-build-workflow.test.ts`
- Modify or delete: GitHub-runner assertions in `tests/public-release-gate.test.ts`
- Modify or delete: workflow assertions in `tests/runtime-contract.test.ts`
- Modify: `AGENTS.md`
- Modify: `project_rules.md`
- Modify: deployment and release documentation returned by the boundary scan

**Interfaces:**
- Preserves: GitHub as source storage, branch history, pull requests when useful, and merge to `main`.
- Removes: Actions jobs, hosted runners, required workflow checks, bot PR/publish automation, workflow artifact uploads, and GitHub deployment-status authority.
- Replaces them with: clean-worktree local validation, Vercel build/preview, merge to `main`, Vercel production deployment, and live smoke verification.

- [ ] Add a failing repository test that rejects tracked GitHub Actions workflows and active instructions requiring hosted checks, bot publication, or runner artifacts.
- [ ] Delete both workflows and tests whose only purpose is to assert their structure.
- [ ] Rewrite release rules so an approved operator or agent can push or merge after local validation; do not require a pull request when repository policy permits direct merge.
- [ ] Verify Vercel remains connected to the production branch and that its build is the sole hosted build gate.
- [ ] Run the runner boundary test and search for `runs-on`, `workflow_run`, `upload-artifact`, required-check, bot-PR, and hosted-runner references.
- [ ] Commit with `ci: remove github runner dependency`.

### Task 8: Full verification and release

**Files:**
- Modify: only files required by failures discovered in this task.

**Interfaces:**
- Produces: a reviewable branch with no database, worker, coordinator, or GitHub runner authority and a verified four-stage workflow.

- [ ] Run `rg` for every retired symbol and classify any remaining match; only the approved design and implementation plan may describe the removal.
- [ ] Run focused workflow, affiliate URL, quality, generated-page, legal-page, sitemap, and deployment-verifier tests.
- [ ] Run the repository type check, lint, and production build once each in a clean worktree.
- [ ] Inspect the final diff for accidental deletion of public pages, exact destinations, disclosures, evidence, metadata, sitemap, robots, or accessible behavior.
- [ ] Commit any final bounded repairs.
- [ ] Push the branch only with explicit push authority and merge through the repository's accepted Git path; no GitHub Actions check is required.
- [ ] Verify Vercel accepts and builds the merged commit, then test the homepage, published reviews, robots, sitemap, disclosure, exact affiliate URLs, browser health, and production deployment identity.
- [ ] Record the merge commit, Vercel deployment result, and live smoke result as the complete release evidence.
