# Supervised Evidence and Content Publication Workflow

## Decision

Replace the unfinished infrastructure-dependent landing workflow with one supervised repository workflow for direct reviews and evidence-led visibility clusters.

The active workflow must not require:

- Neon as workflow or publication authority.
- Oracle or Hermes as the research executor.
- LP002 or another durable publication coordinator.

These dependencies created a permanent pre-research block without improving the accuracy of the two pages that were actually published.

## Outcome

An operator can give an approved agent one buyer decision and receive a review or cluster candidate within a bounded session. The agent gathers current evidence, labels uncertainty honestly, produces structured repository artifacts, runs one consolidated content-quality gate, and releases through the existing GitHub and Vercel path.

The target flow is:

`buyer decision -> bounded evidence sprint -> structured content -> consolidated quality gate -> GitHub/Vercel release -> live verification`

## Scope

This change owns direct-review and visibility-cluster content production. It removes active landing-workflow code, commands, tests, skills, and documentation that exist only to impose the three deleted dependencies.

It does not remove Neon from unrelated application data features, Oracle from unrelated infrastructure, or Vercel from hosting. Git history remains the historical record; active documentation must not instruct agents to restore the retired control plane.

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
2. Open the repository's accepted pull-request path.
3. Run focused tests, type checking, linting, build, and a Vercel preview.
4. Verify disclosure, exact CTA, canonical and robots values, desktop/mobile rendering, links, and browser health.
5. Merge and allow the Vercel Git integration to deploy `main`.
6. Verify the canonical production route and sitemap entry.

The merge commit, deployed commit, and live verification result are sufficient release evidence. No separate database publication authority or coordinator receipt is required.

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
- remove the obsolete authority sections from active planning material;
- add a bounded evidence contract and consolidated quality result;
- adapt direct reviews and visibility clusters to the shared supervised workflow; and
- preserve existing published pages, affiliate URLs, disclosures, metadata, and release receipts as historical publication artifacts.

## Verification

The change is complete only when:

- repository search finds no active landing or cluster requirement for Neon authority, Oracle/Hermes research, or LP002;
- the workflow description exposes exactly four stages;
- a fixture can move from buyer decision to release eligibility without database or remote-worker configuration;
- unsupported high-risk claims fail or are omitted;
- exact affiliate URLs and disclosure remain enforced;
- existing published review and blog tests pass;
- focused workflow tests, type checking, linting, and build pass; and
- the Git-backed Vercel deployment is verified after merge.

## Explicit non-goals

- Fully autonomous unattended publishing.
- Reintroducing a workflow database or remote research worker.
- Fabricating hands-on evidence when product access is unavailable.
- Weakening affiliate disclosure, evidence accuracy, accessibility, or deployment verification.
