# Agent Instruction — Stage 0 Reference Library Correction Pass

## Repository and authority

Work only in this repository:

```text
C:\Users\micha\OneDrive\Desktop\Antigravity Applications Created\VettedSaaSBlueprint
```

This is a corrective continuation of:

```text
docs/design-references/landing-pages/AGENT_INSTRUCTION_100_REFERENCE_STAGE0.md
```

The owner authorizes the changes required by this correction pass, including updates to Stage 0 generated registry, catalogue, reference JSON, captures, ingestion-run records, tests, and agent-result evidence. Do not change or republish existing live landing pages. Do not touch Oracle, Hermes, Vercel deployment state, affiliate URLs, or unrelated dirty-worktree files.

Read the repository `AGENTS.md` and the original instruction completely before editing. Treat the current agent reports as claims to verify, not as authoritative state.

## Why this correction is required

The first pass is not operationally complete even though its catalogue integrity checks pass:

1. All seven selection smoke tests return `hold_for_design_direction`; therefore no new page can enter Stage 1.
2. `src/lib/design-references/selector.ts` requires selected references to contain observations for every semantic page section, including `limitations`. No active reference contains a limitations observation.
3. `observations.sections` correctly contains partial evidence, but the selector incorrectly treats those observations as if they must supply every semantic content section in the final page.
4. Category classification uses the first matching broad regular expression. This misclassifies product categories. For example, the committed catalogue labels Stripe and Shopify as `developer-tools`, while no active reference is labelled `commerce-payments`.
5. Section-family classification is over-collapsed. In the current catalogue, 48 active references support `closing_manifesto`, while only four total section families appear. The rule `if (section.has_cta) return "closing_manifesto"` treats ordinary sections containing any CTA as closing sections.
6. The required 365-day stale exclusion is missing.
7. The required oldest-20 refresh/replace workflow is missing.

Do not declare completion until these defects are corrected and the acceptance commands below pass.

## Required outcome

Deliver an operational local Stage 0 library where:

- The 100 supplied source IDs and original URLs remain unchanged and ordered.
- Active reference observations remain evidence-backed and partial; missing FAQ, limitation, proof, or process observations are never invented.
- Reference selection succeeds for the seven required category smoke tests using stored active references.
- Selected references collectively cover the seven presentation axes and the three reference roles.
- A final page recipe can contain all required semantic page sections without falsely claiming that each selected reference contained those semantic sections.
- Category classification is deterministic, evidence-based, and not controlled by broad first-match regexes.
- Section-layout observations are diverse enough to be meaningful and are not collapsed merely because a section contains a CTA.
- References older than 365 days are excluded from new selection.
- The audit CLI can deliberately refresh the oldest 20 active references and replace their records/captures transactionally without duplicate IDs or URLs.
- Draft-time selection remains local-only and never triggers crawling.
- Existing `legacy` and `editorial_v2` pages remain unchanged.

## Phase 1 — Reproduce and preserve evidence

Before editing:

1. Run:

   ```powershell
   npm run landing:references:validate
   npm run landing:references:select -- --category analytics --buyer-decision "choose an analytics platform for ecommerce decisions"
   npm run landing:references:select -- --category commerce-payments --buyer-decision "choose an ecommerce or payments platform"
   ```

2. Record the initial outputs in:

   ```text
   docs/design-references/landing-pages/agent-results/correction-pass/before.txt
   ```

3. Record the current category counts and section-family counts in the correction completion report.
4. Inspect the existing tests and implementation before changing behavior.

Do not launch a second full audit if another reference-audit process is running. Check the process list first. Do not recrawl unavailable sources unless a targeted retry or refresh is required by this instruction.

## Phase 2 — Correct the selection model

The contracts must distinguish between these two concepts:

1. **Observed reference semantics** — what the source page visibly contained. These remain partial and evidence-backed in `DesignReferenceV1.observations.sections`.
2. **Internal presentation recipe** — how the approved renderer lays out the original affiliate page's required semantic content. This may use registered internal layout families without asserting that a selected reference contained the same semantic section.

Implement the smallest coherent contract/selector change that enforces the following:

- Selection requires collective coverage of all seven presentation axes:
  `hero`, `typography`, `section_order`, `section_variants`, `cta`, `motion`, and `mobile`.
- Three references are selected by default. Two remain allowed only when they collectively cover at least four design dimensions and all required role coverage can be represented.
- At least one selected reference matches or closely neighbours the requested product category.
- Roles remain explicit:
  `hero_typography`, `sections_cta`, and `motion_mobile`.
- The sections/CTA reference must contain at least one evidence-backed section observation and CTA evidence.
- Missing semantic observations such as `limitations` must not be created in a reference record.
- A missing `limitations` observation alone must not make every recipe impossible.
- `PresentationRecipeV1` must still include every required semantic page section and may use only registered `sectionFamilies`.
- No section-layout family may repeat within one recipe.
- Recipe synthesis must be deterministic for the same catalogue, request, and history.
- Use selected references' observed/supported families first. Fill remaining recipe slots only from the approved internal `sectionFamilies` registry using a deterministic composition rule based on selected reference IDs/digests and the requested buyer decision.
- Preserve traceability: the output must distinguish directly observed/adopted layout principles from internally composed assignments. Do not claim that a reference contained a section it did not contain.
- Preserve exact-fingerprint, sibling-axis, primary-reference, recent-use, and reference-combination diversity rules.
- Unsupported tokens remain hard failures. Do not add a fallback to `editorial_v2`, `legacy`, or custom page JSX/CSS/JavaScript.

Add or update behavior tests before or alongside the implementation. Replace the current test that asserts all semantic section observations are required with tests for the corrected distinction between partial source observations and complete internal recipes.

## Phase 3 — Correct category classification

Replace first-match category classification with deterministic evidence scoring.

Requirements:

- Use page title, description, structured metadata when available, visible product copy, and supplied source identity as evidence.
- Weight specific phrases above ambiguous single words.
- Avoid broad triggers such as `review`, `api`, `data`, or `customer` deciding the category alone.
- Comparison-media classification must require evidence that the site is itself editorial/review/comparison media, not merely that a SaaS product displays customer reviews or comparison copy.
- Developer-tools classification must require developer-product evidence, not merely the presence of the word `API`.
- Commerce/payments must recognize evidence for payment processing, checkout, ecommerce storefronts, merchant tools, and related commerce infrastructure.
- Keep normalized categories and flexible adjacent tags.
- Do not hard-code a map of the 100 brand names to desired categories merely to pass tests.
- Add representative synthetic-fixture tests that prove SaaS pages containing customer reviews are not automatically comparison media and commerce pages mentioning APIs are not automatically developer tools.
- Add a test showing a genuine editorial comparison page remains `comparison-media`.
- Record category score evidence and confidence sufficient to explain the selected category.

After the classifier is corrected, update active canonical records from retained audit evidence if sufficient evidence is stored. If the required source evidence is not retained, perform a targeted refresh of only affected active records. Use direct HTTP retrieval first when sufficient; use the existing browser audit only when dynamic DOM measurement is required. Respect timeouts, rate limits, redirects, robots restrictions, and public access controls.

At minimum, independently verify the classifications for the supplied references around Stripe, Shopify, Wise, Mercury, Ramp, Brex, Deel, Gusto, and Rippling. Their final categories must follow captured evidence, not this instruction's expectation.

## Phase 4 — Correct section-family classification

The current rule that any section containing a CTA is `closing_manifesto` is invalid.

Implement evidence-backed family classification that:

- Treats a section as a closing CTA only when its position and composition support it being the final/closing decision block.
- Uses measurable DOM evidence such as section position, columns, cards/items, ordered steps, details/accordion elements, comparison/table structure, media/text split, alignment, and proof/testimonial signals.
- Extends the viewport snapshot contract only where required to retain this evidence.
- Does not infer an unobserved layout family from heading keywords alone.
- Produces materially useful section-family diversity while failing closed when confidence is insufficient.
- Keeps every observation's evidence summary and confidence traceable.

Add focused fixtures for each family that the classifier can genuinely support. Do not add a test that merely checks a static list. Test classification behavior from measured fixture inputs.

The correction report must include before/after family counts and explain any registered family that remains unobserved. Recipe synthesis may use an unobserved registered internal family, but the catalogue must never represent it as directly observed.

## Phase 5 — Implement stale exclusion

Implement the 365-day rule:

- A reference is stale when `captured_at` is more than 365 days before the selection time.
- Stale references remain in the internal registry/catalogue for audit history but are ineligible for new selection.
- Selection must return an explicit hold reason when category coverage exists only in stale references.
- Inject or pass the current time in selector tests so tests are deterministic.
- Boundary tests must cover exactly 365 days, just under, and just over the threshold.
- Catalogue validation should report stale counts without pretending that unchanged historical files are corrupt.
- Drafting and selection must not refresh stale references automatically.

## Phase 6 — Implement transactional oldest-20 refresh

Extend the existing audit CLI with an explicit option equivalent to:

```powershell
npm run landing:references:audit -- --sources docs/design-references/landing-pages/sources.json --refresh-oldest 20 --batch-size 10 --concurrency 4
```

Required behavior:

- `--refresh-oldest` accepts a positive integer and defaults to no refresh.
- It selects the requested number of oldest active references by `captured_at`, with stable ID as the tie-breaker.
- It preserves stable ID and original supplied URL.
- It replaces the existing reference JSON and desktop/mobile captures in place only after the refreshed record and both captures validate.
- It updates registry audit metadata, entry digest, capture hashes, byte sizes, catalogue hash, and run summary.
- It never creates duplicate IDs or duplicate source URLs.
- A failed refresh retains the last valid active record and captures, records the refresh failure in the run report, and does not leave the source pending or unavailable merely because refresh failed.
- Replacement is transactional across each committed wave and restores prior bytes if post-write validation fails.
- Add mocked-adapter tests for selection order, replacement, no duplicates, failed-refresh preservation, and rollback.
- Do not run a real oldest-20 refresh solely to prove the command. The mocked tests are the required proof. Perform real targeted refreshes only where Phase 3 or Phase 4 needs new evidence.

## Phase 7 — Canonical validation and smoke tests

Run all of these commands after implementation:

```powershell
npm run landing:references:validate
node --test --import tsx tests/design-reference-audit.test.ts tests/design-reference-contract.test.ts tests/task-3-ingestion.test.ts tests/reference-composed-renderer.test.ts tests/landing-skill-stage0-contract.test.ts
npm run typecheck
npm run lint
git diff --check
```

Run these seven selections exactly:

```powershell
npm run landing:references:select -- --category analytics --buyer-decision "choose an analytics platform for ecommerce decisions"
npm run landing:references:select -- --category marketing-tools --buyer-decision "choose a marketing platform for campaign production"
npm run landing:references:select -- --category video-audio --buyer-decision "choose a voice or video creation workflow"
npm run landing:references:select -- --category sales-crm --buyer-decision "choose a sales and CRM workflow"
npm run landing:references:select -- --category developer-tools --buyer-decision "choose a developer platform"
npm run landing:references:select -- --category commerce-payments --buyer-decision "choose an ecommerce or payments platform"
npm run landing:references:select -- --category comparison-media --buyer-decision "structure a trustworthy affiliate comparison decision"
```

Acceptance requires all seven to return:

```json
{
  "status": "selected"
}
```

Each result must include:

- Two or three valid active, non-stale reference IDs.
- Three explicit roles when three references are selected.
- Entry digests and adopted principles.
- A complete valid `PresentationRecipeV1`.
- A non-empty recipe ID and seven-axis fingerprint.
- No repeated section family within the recipe.
- No fabricated source observations.

If any smoke test still holds, the correction pass is not complete. Do not relabel the hold as an acceptable limitation. Record the exact blocker in `blocked-report.md` and stop without claiming success.

## Phase 8 — Results and evidence

Store all correction-pass results in:

```text
docs/design-references/landing-pages/agent-results/correction-pass/
```

Create these files:

```text
before.txt
completion-report.md
completion-report.json
implementation-review.md
selection-smoke-tests.json
validation-summary.txt
classification-summary.json
section-family-summary.json
refresh-tests.json
```

If blocked, also create:

```text
blocked-report.md
```

### `completion-report.json`

Use:

```json
{
  "schema_version": "ReferenceIngestionCorrectionCompletionV1",
  "completed_at": "ISO-8601 UTC",
  "source_count": 100,
  "active_count": 0,
  "unavailable_count": 0,
  "pending_count": 0,
  "catalogue_count": 0,
  "stale_count": 0,
  "failures_by_reason": {},
  "category_counts": {},
  "section_family_counts": {},
  "aggregate_capture_bytes": 0,
  "catalogue_sha256": "lowercase sha256",
  "validation": {
    "focused_tests": "pass|fail",
    "typecheck": "pass|fail",
    "lint": "pass|fail",
    "catalogue_validation": "pass|fail",
    "diff_check": "pass|fail"
  },
  "selection_smokes": [],
  "files_changed": [],
  "unresolved_findings": []
}
```

### `selection-smoke-tests.json`

For every required category include:

- Exact command.
- Status.
- Selected IDs.
- Assigned roles.
- Recipe ID.
- Fingerprint.
- Section-family sequence.
- Stale eligibility result.
- Failure reasons when not selected.

### `classification-summary.json`

Include before/after category counts, affected reference IDs, evidence scores, and whether each change used retained evidence or a targeted refresh.

### `section-family-summary.json`

Include before/after family counts, affected references, direct-observation evidence, and registered families that remain unobserved.

### `refresh-tests.json`

Include mocked test names/results for oldest ordering, stable replacement, duplicate prevention, failed-refresh preservation, and rollback.

## Prohibited shortcuts

Do not:

- Mark the task complete while all selections are held.
- Add fabricated `limitations` or other semantic observations to reference records.
- Hard-code category labels by reference ID or brand solely to pass smoke tests.
- Weaken active-reference confidence below 0.75.
- Permit stale references to be selected.
- Reuse a section family within one recipe.
- Remove diversity-history rules.
- Trigger live crawling from page drafting or selection.
- Bypass bot challenges, authentication, paywalls, robots restrictions, or access controls.
- Modify existing live pages, Oracle, Hermes, deployment configuration, or unrelated files.
- Claim tests passed unless their commands were actually run.

## Final response format

When finished, report only:

1. Outcome: complete or blocked.
2. Root causes corrected.
3. Canonical source/active/unavailable/pending/stale counts.
4. Seven-selection result summary.
5. Validation commands and actual results.
6. Files changed.
7. Exact correction-results directory.
8. Any unresolved risks.

Do not claim operational completion unless all seven selection smoke tests return `selected` and all required validation commands pass.
