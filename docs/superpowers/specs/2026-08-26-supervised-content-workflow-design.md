# Supervised Evidence and Content Publication Workflow

## Decision

Replace the unfinished infrastructure-dependent landing workflow with one supervised repository workflow for direct reviews and evidence-led visibility clusters.

The active workflow must not require:

- Neon as workflow or publication authority.
- Oracle as an application database, publication store, analytics store, or runtime dependency.
- Hermes as a local or remote worker.
- LP002 or another durable publication coordinator.
- GitHub Actions, hosted runners, bot publication, required checks, or workflow artifact uploads.

These dependencies created a permanent pre-research block without improving the accuracy of the two pages that were actually published.

## Outcome

An operator can give an approved agent one buyer decision and receive a review or cluster candidate within a bounded session. The agent gathers current evidence, labels uncertainty honestly, produces structured repository artifacts, runs one consolidated content-quality gate, and releases through GitHub source control and Vercel deployment.

The target flow is:

`buyer decision -> bounded evidence sprint -> structured content -> consolidated quality gate -> Git merge -> Vercel deploy -> live verification`

## Scope

This change owns the complete static-site publication path. It removes active code, commands, tests, skills, workflows, database assets, and documentation that depend on the deleted infrastructure.

The resulting product is a static-first public content site. It has no application database, admin or authentication surface, remote worker, job queue, analytics ingestion endpoint, or GitHub-hosted CI requirement. GitHub stores and merges source; Vercel builds and deploys `main`. Git history remains the archive; active documentation must not instruct agents to restore the retired systems.

## Four-stage workflow

### 1. Decide

Record one buyer question, intended audience, editorial angle, content type, exact affiliate URL when applicable, and a short design read. Reject only duplicate or incoherent intent.

### 2. Gather evidence

Run a bounded source sprint against a fixed evidence checklist. Prefer official sources and authorized first-party observations. Each material claim receives:

- claim text;
- evidence status: `independently_observed`, `vendor_documented`, `conflicting`, `outdated`, or `not_found`;
- source URL or repository artifact;
- retrieval or test date;
- observation;
- limitation; and
- allowed public wording.

Missing low-risk evidence causes the claim to be omitted or softened, not the whole page to stall. Missing evidence for pricing, discounts, guarantees, rankings, security, regulated claims, or hands-on assertions blocks only that claim. The agent stops after the configured evidence budget and records unresolved items.

### 3. Validate content

Replace sequential uniqueness, compliance, and conversion handoffs with one consolidated editorial-quality result. It checks:

- the page answers a distinct buyer decision;
- material claims resolve to evidence and use allowed wording;
- the assessment is clearly VettedSaaSBlueprint's editorial judgment;
- limitations and uncertainty are visible;
- affiliate disclosure and the exact approved destination are correct;
- metadata, links, accessibility, responsive layout, and robots behavior pass; and
- no placeholder, fabricated evidence, hidden approval, or self-attested publication state exists.

The validator returns `pass`, `repair`, or `blocked`, with field-level findings. The agent receives at most two repair rounds. A retro is created only for a repeated failure pattern, not after every batch.

### 4. Release

Use a normal Git-backed release:

1. Commit the structured evidence and content artifacts.
2. Run focused tests, type checking, linting, and build locally in a clean worktree.
3. Push or merge through the repository's accepted Git path and inspect the Vercel preview when one is produced.
4. Verify disclosure, exact CTA, canonical and robots values, desktop/mobile rendering, links, and browser health.
5. Merge and allow the Vercel Git integration to deploy `main`.
6. Verify the canonical production route and sitemap entry.

The merge commit, deployed commit, and live verification result are sufficient release evidence. No database publication authority, coordinator receipt, GitHub Actions check, or runner artifact is required.

## Error handling

- Temporary source failures receive bounded retries.
- An inaccessible source becomes `not_found`; it does not cause recursive research.
- Unsupported high-risk wording is removed or softened automatically.
- A failed content check is repaired at the named field.
- A failed build or deployment blocks release and is handled through the ordinary Git/Vercel repair path.
- The workflow never substitutes a local preview for a live deployment claim.

## Repository changes

Implementation will:

- replace the fourteen-stage landing registry with the four stages above;
- replace the active workflow documentation and skill instructions;
- remove landing research commands, contracts, migrations, worker code, operational files, and tests whose sole purpose is Neon, Oracle/Hermes, or LP002 authority;
- remove the Oracle application database, admin/auth surfaces, database-backed tracking and redirect routes, database publication code, schemas, migrations, drivers, and environment variables;
- remove GitHub Actions workflows, hosted-runner expectations, bot publication, and workflow artifact handling;
- remove the obsolete authority sections from active planning material;
- add a bounded evidence contract and consolidated quality result;
- adapt direct reviews and visibility clusters to the shared supervised workflow; and
- preserve existing published pages, affiliate URLs, disclosures, metadata, and useful release history while migrating render-time data to repository files.

## Verification

The change is complete only when:

- repository search finds no active requirement or runtime dependency for Neon, Oracle, Hermes, LP002, GitHub Actions, or hosted runners;
- the workflow description exposes exactly four stages;
- a fixture can move from buyer decision to release eligibility without database or remote-worker configuration;
- unsupported high-risk claims fail or are omitted;
- exact affiliate URLs and disclosure remain enforced;
- existing published review and blog tests pass;
- focused workflow tests, type checking, linting, and build pass locally from a clean checkout; and
- the Git-backed Vercel deployment is verified after merge.

## Explicit non-goals

- Fully autonomous unattended publishing.
- Reintroducing a workflow database or remote research worker.
- Reintroducing application database, admin/auth, database analytics, or GitHub Actions infrastructure.
- Fabricating hands-on evidence when product access is unavailable.
- Weakening affiliate disclosure, evidence accuracy, accessibility, or deployment verification.
