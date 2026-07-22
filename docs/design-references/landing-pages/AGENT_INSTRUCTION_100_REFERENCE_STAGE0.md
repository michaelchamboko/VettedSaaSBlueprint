# Agent Instruction: Complete the 100-Reference Stage 0 Library

## Role and objective

Work inside this repository only:

`C:\Users\micha\OneDrive\Desktop\Antigravity Applications Created\VettedSaaSBlueprint`

Complete and independently verify the 100-reference Stage 0 design library. The finished library must let Codex select two or three evidence-backed design references locally before drafting a new `reference_composed_v1` affiliate landing page.

This task covers the reference library and its workflow integration only. Do not create, restyle, publish, or redeploy landing pages. Do not use Oracle or Hermes. Do not modify any live page.

## Mandatory repository rules

1. Read the root `AGENTS.md` before doing anything else.
2. Read `.agents/skills/landing-page-production-orchestrator/SKILL.md` and follow its Stage 0 requirements.
3. Inspect before editing. Use tests first for every behavior change.
4. The working tree contains extensive pre-existing work. Do not reset, revert, delete, overwrite, or reformat unrelated changes.
5. Never use `git reset --hard`, destructive checkout commands, or broad cleanup commands.
6. Preserve all original reference URLs exactly as supplied.
7. Do not bypass authentication, CAPTCHAs, bot protection, paywalls, robots controls, or other public-access barriers.
8. Do not lower the active-reference confidence threshold below `0.75` merely to increase the active count.
9. Do not fabricate missing FAQ, limitation, proof, process, CTA, motion, or mobile observations.
10. Do not copy branding, text, logos, screenshots, imagery, colors, proprietary assets, or exact layouts into public page artifacts.
11. Do not expose the reference library through a public Next.js route or application bundle.
12. Do not print or store secrets, tokens, raw environment variables, connection strings, or private credentials.

## Current resume point

At the time this instruction was created, the source registry contained:

- 100 total supplied sources.
- 47 active references.
- 38 unavailable references.
- 15 pending references.
- 47 records in `catalogue.json`.
- Latest run file: `ingestion-runs/reference-audit-2026-07-14t06-50-24-676z.json`.

The following corrected audit command was still running in the background:

```powershell
npm run landing:references:audit -- --sources docs/design-references/landing-pages/sources.json --batch-size 10 --concurrency 4 --retry-failures capture_invalid
```

Do not assume these counts remain current. Re-read the registry and process state first.

## Required output location

Store the agent's completion evidence only in:

`C:\Users\micha\OneDrive\Desktop\Antigravity Applications Created\VettedSaaSBlueprint\docs\design-references\landing-pages\agent-results\`

Create all of the following files:

```text
agent-results/
  completion-report.md
  completion-report.json
  failure-details.json
  selection-smoke-tests.json
  validation-summary.txt
  implementation-review.md
```

Do not duplicate WebP captures or reference JSON files into `agent-results`. Their canonical locations remain `captures/` and `references/`.

## Phase 1: Establish current state and avoid duplicate workers

Run these read-only checks:

```powershell
git status --short

Get-CimInstance Win32_Process |
  Where-Object { $_.CommandLine -match 'audit-design-references' } |
  Select-Object ProcessId, CommandLine

$registry = Get-Content -Raw docs\design-references\landing-pages\sources.json | ConvertFrom-Json
$registry.sources | Group-Object { $_.audit.status } | Select-Object Name, Count

$catalogue = Get-Content -Raw docs\design-references\landing-pages\catalogue.json | ConvertFrom-Json
$catalogue.references.Count
```

If the audit command is still running:

1. Do not launch another audit.
2. Monitor `sources.json` and the newest `ingestion-runs/*.json` every 60 seconds.
3. Treat changing counts or a changing run file as progress.
4. Wait until the exact audit process exits.
5. Only consider stopping it if no registry or run-file change occurs for ten consecutive minutes. Before stopping anything, re-read the full command line and target only that exact audit process.

If the process has exited and pending sources remain, resume only the pending sources with:

```powershell
npm run landing:references:audit -- --sources docs/design-references/landing-pages/sources.json --batch-size 10 --concurrency 4
```

Do not use `--retry-failures` for every unavailable source. Retry a failure class only after proving the cause was transient or was an implementation defect. Genuine `cross_domain_redirect`, `bot_challenge`, `login_required`, and `paywall` records normally remain unavailable.

## Phase 2: Inspect the implementation

Review these implementation areas:

```text
docs/design-references/landing-pages/sources.json
docs/design-references/landing-pages/catalogue.json
src/lib/design-references/source-registry.ts
src/lib/design-references/classifier.ts
src/lib/design-references/audit.ts
src/lib/design-references/playwright-audit.ts
src/lib/design-references/contracts.ts
src/lib/design-references/selector.ts
src/lib/design-references/ingestion.ts
scripts/audit-design-references.ts
scripts/ingest-design-references.ts
scripts/validate-design-reference-catalogue.ts
scripts/select-design-references.ts
tests/design-reference-audit.test.ts
tests/design-reference-contract.test.ts
tests/task-3-ingestion.test.ts
```

Confirm the implementation satisfies all of the following:

### Source registry

- `DesignReferenceSourceRegistryV1` contains exactly 100 ordered sources.
- IDs are exactly `lp-ref-0001` through `lp-ref-0100`.
- Supplied names and original URLs remain unchanged.
- Every source ends in `active` or `unavailable`; final `pending_count` must be zero.
- Each unavailable source has a supported failure reason, timestamp, attempt count, resolved URL when known, and response status when known.
- Active source registry records correspond one-to-one with `catalogue.json` records.

### Capture and audit behavior

- Audits run in ten-source transactional waves.
- Maximum browser concurrency is four.
- Desktop capture is exactly 1440×900.
- Mobile capture is exactly 390×844.
- Playwright PNG output is converted to real WebP.
- Compression tries quality 82, then 72, then 64 and rejects files still over 2 MB.
- Font readiness is bounded and awaited.
- Normal-motion and reduced-motion measurements are recorded.
- Privacy handling only attempts rejection or essential-only choices.
- Same-site canonical redirects preserve the supplied original URL.
- Unrelated cross-domain redirects remain unavailable.
- One transient timeout receives one bounded retry.
- Failed sites do not corrupt earlier committed waves.
- A failed catalogue write restores overwritten files and removes new orphan files.

### Evidence-backed classification

- Hero, typography, section order, section families, CTA, motion, and mobile axes contain evidence and confidence values.
- Active automated records have overall confidence of at least `0.75`.
- Section semantics are based on actual visible headings/content.
- Missing semantic sections remain absent.
- Category and tags come from captured page metadata and visible product copy.
- Reusable principles are abstract and include explicit non-copy boundaries.
- Low-confidence records remain unavailable.

### Selection and drafting integration

- Only active references with complete captures can be selected.
- Selection validates the local catalogue and capture hashes before use.
- Three references are selected by default; two are allowed only with at least four covered design dimensions.
- At least one reference matches or neighbors the requested product category.
- The chosen combination collectively covers every controlled section key and required presentation axis.
- Incomplete coverage returns `hold_for_design_direction` instead of using fallback layout tokens.
- Roles remain hero/typography, sections/CTA, and motion/mobile.
- Reference IDs, entry hashes, adopted principles, prohibited elements, recipe ID, and fingerprint flow into `DesignDirectionV1`.
- Existing exact-fingerprint, reference-reuse, combination-reuse, and sibling-diversity rules still pass.
- Existing `legacy` and `editorial_v2` pages remain unchanged.

### Maintenance behavior

The approved plan also requires these items. Implement them test-first if they are missing:

- A reference becomes stale 365 days after `captured_at` and is excluded from new selection.
- The audit command can deliberately refresh the oldest 20 active references without creating duplicate catalogue IDs or URLs.
- Refresh replaces the exact existing reference and capture records transactionally.
- Page drafting never performs a live refresh or recrawl.
- Aggregate capture size is calculated.
- If aggregate capture size exceeds 100 MB, enable Git LFS only for the reference WebP files and document that action. Do not enable broad repository-wide LFS patterns.

## Phase 3: Complete the live audit safely

After the currently running process exits, calculate:

```powershell
$registry = Get-Content -Raw docs\design-references\landing-pages\sources.json | ConvertFrom-Json
$catalogue = Get-Content -Raw docs\design-references\landing-pages\catalogue.json | ConvertFrom-Json

$registry.sources | Group-Object { $_.audit.status } | Select-Object Name, Count
$registry.sources | Where-Object { $_.audit.status -eq 'unavailable' } |
  Group-Object { $_.audit.failure_reason } | Select-Object Name, Count
$catalogue.references.Count
```

Rules for retries:

- `network_timeout`: one targeted retry is allowed.
- `capture_invalid`: investigate first. Retry only when a concrete implementation defect is fixed and covered by a failing-then-passing test.
- `classification_low_confidence`: do not lower the threshold. Inspect whether evidence extraction is wrong; otherwise retain unavailable.
- `insufficient_design_evidence`: retain unavailable unless the extractor demonstrably missed public content.
- `cross_domain_redirect`: retain unavailable unless the redirect is proven to be the same brand's canonical public domain and the original URL is still preserved.
- `bot_challenge`, `login_required`, `paywall`, `http_error`: do not bypass. Retain unavailable unless a later normal public request succeeds.

Completion does not require all 100 sources to be active. Completion requires all 100 to have truthful final states and every active record to pass validation.

## Phase 4: Required validation

Run all commands from the repository root. Do not omit failures from the evidence report.

```powershell
node --test --import tsx tests/design-reference-audit.test.ts tests/design-reference-contract.test.ts tests/task-3-ingestion.test.ts tests/reference-composed-renderer.test.ts tests/landing-skill-stage0-contract.test.ts

npm run typecheck
npm run lint
npm run landing:references:validate
git diff --check
```

Lint must have zero errors. Existing warnings must be listed, not hidden.

Also verify mechanically:

- Exactly 100 unique source IDs, ordinals, names, and URLs.
- Final pending count is zero.
- Active source count equals catalogue count.
- Every catalogue entry has matching `references/<id>.json`.
- Every active entry has valid `captures/<id>/desktop.webp` and `mobile.webp`.
- Every file byte size and SHA-256 hash matches the catalogue.
- No individual capture exceeds 2 MB.
- No capture/reference path escapes the library directory or traverses a symlink.
- Aggregate capture bytes and whether Git LFS is required.
- Latest catalogue SHA-256 digest.

## Phase 5: Selection smoke tests

Run category checks using the committed local catalogue only. Do not browse the reference sites again.

Use these buyer decisions:

```text
analytics: choose an analytics platform for ecommerce decisions
marketing-tools: choose a marketing platform for campaign production
video-audio: choose a voice or video creation workflow
sales-crm: choose a sales and CRM workflow
developer-tools: choose a developer platform
commerce-payments: choose an ecommerce or payments platform
comparison-media: structure a trustworthy affiliate comparison decision
```

For each category, run:

```powershell
npm run landing:references:select -- --category <category> --buyer-decision "<buyer decision>"
```

Record the exact status, selected reference IDs, roles, recipe ID, fingerprint, or `hold_for_design_direction` reasons. Do not describe a hold as a pass.

## Phase 6: Evidence files

### `completion-report.json`

Use this exact top-level structure:

```json
{
  "schema_version": "ReferenceIngestionAgentCompletionV1",
  "completed_at": "ISO-8601 timestamp",
  "source_count": 100,
  "active_count": 0,
  "unavailable_count": 0,
  "pending_count": 0,
  "catalogue_count": 0,
  "failures_by_reason": {},
  "category_coverage": [],
  "aggregate_capture_bytes": 0,
  "catalogue_sha256": "64 lowercase hex characters",
  "git_lfs": {
    "required": false,
    "enabled_for_reference_webp": false
  },
  "validation": {
    "focused_tests": "pass or fail",
    "typecheck": "pass or fail",
    "lint": "pass or fail",
    "catalogue_validation": "pass or fail",
    "diff_check": "pass or fail"
  },
  "selection_smokes": [],
  "files_changed": [],
  "unresolved_findings": []
}
```

Populate real values. Do not leave placeholders.

### `failure-details.json`

Include one record for every unavailable source:

```json
{
  "id": "lp-ref-0000",
  "ordinal": 0,
  "name": "Name",
  "source_url": "original supplied URL",
  "resolved_url": null,
  "response_status": null,
  "failure_reason": "supported reason",
  "attempts": 0,
  "audited_at": "ISO-8601 timestamp"
}
```

### `selection-smoke-tests.json`

Include all seven category checks with exact command inputs and outputs.

### `validation-summary.txt`

Record command, exit code, pass/fail, test counts, skipped-test reasons, lint warning/error counts, and catalogue validator output. Do not copy secrets or unrelated environment output.

### `implementation-review.md`

Report findings ordered by severity. Include file and line references for unresolved defects. Explicitly review stale handling, refresh replacement, access-boundary behavior, partial observations, selection coverage, and legacy-page preservation.

### `completion-report.md`

Provide a concise human summary of:

- What was completed.
- Final active/unavailable counts.
- Failure distribution.
- Category coverage.
- Validation results.
- Any remaining holds or operational limitations.
- Confirmation that live pages, Oracle, and Hermes were untouched.

## Stop conditions

Do not claim completion when any of these is true:

- The audit process is still running.
- Any source remains pending.
- Active count differs from catalogue count.
- Catalogue validation fails.
- TypeScript fails.
- Focused Stage 0 tests fail.
- An active record has missing captures, stale hashes, confidence below 0.75, or invented observations.
- Required evidence files are absent.

If completion is blocked, write `agent-results/blocked-report.md` containing the exact blocker, commands attempted, affected IDs, safe work completed, and the next required action. Do not invent a successful result.

## Final response to the operator

Return only:

1. Final active, unavailable, and pending counts.
2. Validation pass/fail summary.
3. Any unresolved blocker.
4. Absolute path to `agent-results/completion-report.md` or `agent-results/blocked-report.md`.

The operator will ask Codex to independently double-check the repository and evidence package afterward.
