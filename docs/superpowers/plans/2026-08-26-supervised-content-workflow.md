# Supervised Content Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Purge the Neon-authority, Oracle/Hermes-research, and LP002 coordinator system and replace it with a four-stage supervised evidence-to-Vercel workflow.

**Architecture:** Repository files are the reviewable content and evidence record. One descriptive four-stage registry and the existing deterministic quality commands guide an approved agent; Git and Vercel remain the only release state transition. Exact affiliate URLs, honest evidence labels, disclosure, accessibility, build checks, and live verification remain mandatory.

**Tech Stack:** TypeScript, Next.js, Zod, Node test runner, GitHub Actions, Vercel.

**Spec:** `docs/superpowers/specs/2026-08-26-supervised-content-workflow-design.md`

## Global Constraints

- Do not touch the dirty operator checkout; work only in the isolated branch from current `origin/main`.
- Remove every active requirement for Neon landing authority, Oracle/Hermes landing research, or LP002.
- Preserve unrelated application database functionality and Vercel hosting.
- Preserve exact approved affiliate URLs, visible disclosure, claim accuracy, accessibility, and live verification.
- Preserve existing public pages and historical release artifacts.
- Git history is the only archive for deleted workflow material.
- Use tests before behavior changes and keep deletions in independently reviewable commits.

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
- Modify: `.github/workflows/preview-build.yml`
- Delete: all focused tests whose subject is one of the deleted files.

**Interfaces:**
- Removes: every landing research database, worker, activation, coordinator, and migration command.
- Preserves: ordinary Next.js build and landing quality commands.

- [ ] Add a failing repository-boundary test that rejects tracked occurrences of the retired commands, environment names, migration schemas, worker contracts, and LP002 outside the explicit purge spec.
- [ ] Run the test and confirm it lists the current infrastructure files.
- [ ] Delete the subsystem files and their tests, then remove their package scripts and GitHub workflow steps.
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

### Task 6: Remove residual database and deployment references

**Files:**
- Modify: `db/schema.sql`
- Modify: `db/oracle-migration-001.sql`
- Modify or delete: any remaining tracked file found by the purge boundary test.

**Interfaces:**
- Removes: unused `hermes_research_sessions` schema elements if no live application import remains.
- Preserves: unrelated admin, evidence claim, analytics, and publication data structures still used by the application.

- [ ] Use `rg` to prove whether each residual schema object has a runtime consumer.
- [ ] Add a failing schema-source assertion for unused retired landing research objects.
- [ ] Remove only objects with zero remaining runtime consumers.
- [ ] Run database source tests and the purge boundary test.
- [ ] Commit with `refactor: remove residual research schema`.

### Task 7: Full verification and release

**Files:**
- Modify: only files required by failures discovered in this task.

**Interfaces:**
- Produces: a reviewable branch with no active retired authority and a verified four-stage workflow.

- [ ] Run `rg` for every retired symbol and classify any remaining match; only the approved design and implementation plan may describe the removal.
- [ ] Run focused workflow, affiliate URL, quality, generated-page, legal-page, sitemap, and deployment-verifier tests.
- [ ] Run the repository type check, lint, build, and workflow syntax validation once each.
- [ ] Inspect the final diff for accidental deletion of unrelated Neon, Oracle, analytics, or public-page behavior.
- [ ] Commit any final bounded repairs.
- [ ] Push the branch only with explicit push authority, open the accepted pull request, and wait for hosted checks.
- [ ] Merge only after accepted checks, verify the Git-backed Vercel production deployment, and test the homepage, published reviews, robots, sitemap, disclosure, exact affiliate URLs, and deployment identity.

