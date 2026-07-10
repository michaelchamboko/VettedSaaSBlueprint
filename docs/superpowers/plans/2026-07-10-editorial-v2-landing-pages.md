# Editorial v2 Landing Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a future-only `editorial_v2` direct-review landing-page renderer and production guardrails, then produce audited pages in capped batches without changing existing live artifacts.

**Architecture:** Existing blueprints without an explicit design profile continue through the current `DirectReviewPage` legacy path. New drafts opt into `metadata.design_profile: "editorial_v2"` and render through a separate scoped component with its own fonts, dark monochrome palette, solid accent CTA, 8px spacing rhythm, compact near-CTA disclosure, and full footer disclosure. The published manifest remains the only public route source of truth; draft artifacts are not public by file presence.

**Tech Stack:** Next.js App Router, React Server Components, Tailwind v4 utilities, scoped CSS, Zod, Node test runner with `tsx`, existing Vercel deployment integration.

## Global Constraints

- Existing published landing-page artifacts, manifest entries, routes, and legacy visual treatment must remain unchanged.
- New pages must explicitly use `metadata.design_profile: "editorial_v2"`; absent profiles default to `legacy`.
- Future typography uses a loaded geometric display/body pairing scoped to `.landing-editorial-v2`; do not change global `body` typography.
- Future pages use a dark monochrome palette with one solid accent; no gradient interactive primitives.
- Future spacing uses 8px-grid values; no sticky or floating mobile CTA.
- CTA markup must include `flex items-center justify-between whitespace-nowrap`; label and arrow/icon are separate children.
- Future hero copy must include a 40–60-word `hero.answer_snippet` under the H1.
- Short disclosure stays visible before/near the first CTA; full disclosure and secondary links move to the footer.
- Keep the ordered landing-page loop: intent brief -> drafter -> uniqueness -> compliance -> conversion -> audited owner approval; run batch retro before the next batch.
- Do not invent product URLs, affiliate link ids, evidence records, destination reviews, program rules, or owner approvals.
- Hosted build/typecheck/deploy validation belongs to Vercel/GitHub; do not run local dependency installs, production builds, dev servers, or full local typechecks.

---

### Task 1: Add the future-only blueprint contract

**Files:**
- Modify: `src/lib/schemas/contracts.ts`
- Create: `src/lib/landing/editorial-v2.ts`
- Create: `tests/editorial-v2-contract.test.ts`

**Interfaces:**
- `pageBlueprintSchema` accepts optional `metadata.design_profile` with default `"legacy"` and optional `hero.answer_snippet`.
- `isEditorialV2Blueprint(blueprint: PageBlueprint): boolean` returns true only for the future profile.
- `validateEditorialV2Copy(input: { answerSnippet: string; ctaLabel: string }): { valid: boolean; reasonCodes: string[] }` enforces the 40–60-word snippet and short CTA label budget.

- [ ] **Step 1: Write the failing contract tests**

```ts
test("legacy blueprints default to the legacy design profile", () => {
  const blueprint = pageBlueprintSchema.parse(existingFixtureWithoutDesignProfile);
  assert.equal(blueprint.metadata.design_profile, "legacy");
});

test("editorial v2 copy requires a 40 to 60 word answer and short CTA", () => {
  assert.deepEqual(validateEditorialV2Copy({ answerSnippet: "one two", ctaLabel: "A" }), {
    valid: false,
    reasonCodes: ["answer_snippet_word_count", "cta_label_too_long"],
  });
});
```

- [ ] **Step 2: Run the focused test and confirm it fails for the missing contract**

Run: `npm test -- tests/editorial-v2-contract.test.ts`

Expected: FAIL because `design_profile`, `answer_snippet`, and `validateEditorialV2Copy` do not exist yet.

- [ ] **Step 3: Implement the minimal schema and pure validation helper**

```ts
design_profile: z.enum(["legacy", "editorial_v2"]).default("legacy")
answer_snippet: z.string().min(1).optional().nullable()
```

The helper must count whitespace-delimited words, reject snippets outside 40–60 words, and reject CTA labels over 32 characters. It must not validate evidence, approval, or publication state.

- [ ] **Step 4: Run the focused test and confirm it passes**

Run: `npm test -- tests/editorial-v2-contract.test.ts`

Expected: PASS with the new contract tests green and no unrelated files changed.

- [ ] **Step 5: Commit the contract change**

```powershell
git add -- src/lib/schemas/contracts.ts src/lib/landing/editorial-v2.ts tests/editorial-v2-contract.test.ts
git commit -m "feat: add editorial v2 landing blueprint contract"
```

### Task 2: Build the scoped editorial v2 renderer

**Files:**
- Create: `src/components/landing/EditorialReviewPage.tsx`
- Modify: `src/components/landing/DirectReviewPage.tsx`
- Modify: `src/app/globals.css`
- Create: `tests/editorial-v2-renderer.test.ts`

**Interfaces:**
- `EditorialReviewPage({ blueprint }: { blueprint: PageBlueprint }): JSX.Element` renders only future-profile pages.
- `DirectReviewPage` dispatches to `EditorialReviewPage` when `blueprint.metadata.design_profile === "editorial_v2"`; its existing legacy JSX remains the fallback.

- [ ] **Step 1: Write the failing renderer guard tests**

```ts
test("legacy renderer source remains the fallback for absent design profiles", () => {
  assert.match(directReviewSource, /design_profile/);
  assert.match(directReviewSource, /EditorialReviewPage/);
});

test("editorial v2 renderer contains mobile-safe CTA and no sticky CTA primitive", () => {
  assert.match(editorialSource, /flex items-center justify-between whitespace-nowrap/);
  assert.doesNotMatch(editorialSource, /position:\s*(fixed|sticky)|fixed bottom|sticky bottom/);
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `npm test -- tests/editorial-v2-renderer.test.ts`

Expected: FAIL because the future renderer and profile dispatch do not exist.

- [ ] **Step 3: Implement the future renderer**

The component must render, in order:

1. Simple wordmark/disclosure link navigation.
2. H1.
3. `hero.answer_snippet` immediately under the H1.
4. Existing subheadline as audience/destination context.
5. Compact short disclosure before the single hero CTA.
6. One solid-accent CTA with separate label and arrow/icon spans.
7. Semantic benefit decision cards, workflow steps, limitations, and FAQ `<details>` rows.
8. Footer containing `full_disclosure` and secondary/legal links.

Use `Space_Grotesk` and `DM_Sans` via `next/font/google` only in the future component. Scope every new CSS rule under `.landing-editorial-v2`. Do not modify the legacy JSX classes or global `body` declarations.

- [ ] **Step 4: Run the focused test and confirm it passes**

Run: `npm test -- tests/editorial-v2-renderer.test.ts`

Expected: PASS with the future dispatch and source guards green.

- [ ] **Step 5: Commit the renderer change**

```powershell
git add -- src/components/landing/EditorialReviewPage.tsx src/components/landing/DirectReviewPage.tsx src/app/globals.css tests/editorial-v2-renderer.test.ts
git commit -m "feat: add scoped editorial v2 landing renderer"
```

### Task 3: Add future-profile drafting and static quality gates

**Files:**
- Modify: `project_rules.md`
- Modify: `.agents/skills/direct-review-page-drafter/SKILL.md`
- Modify: `.agents/skills/direct-review-page-drafter/references/output-contract.md`
- Modify: `scripts/scan-landing-static.mjs`
- Modify: `package.json`
- Create: `tests/editorial-v2-static-gate.test.ts`

**Interfaces:**
- `scan-landing-static.mjs editorial-v2 --json` scans only artifacts that declare `metadata.design_profile: "editorial_v2"` and fails malformed future-profile fields without failing legacy artifacts.
- `npm run scan:landing:editorial-v2` runs the new scan mode.

- [ ] **Step 1: Write failing static-gate tests**

```ts
test("future-profile scan ignores legacy artifacts", () => {
  const report = buildLandingStaticReport("editorial-v2", legacyOnlyContext);
  assert.equal(report.status, "pass");
});

test("future-profile scan blocks gradient, sticky CTA, missing answer snippet, and long CTA", () => {
  const report = buildLandingStaticReport("editorial-v2", invalidEditorialContext);
  assert.deepEqual(report.issues.map((issue) => issue.code), [
    "editorial_answer_snippet_invalid",
    "editorial_cta_label_too_long",
    "editorial_gradient_interactive",
    "editorial_sticky_cta",
  ]);
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `npm test -- tests/editorial-v2-static-gate.test.ts`

Expected: FAIL because the new scan mode and future-profile checks do not exist.

- [ ] **Step 3: Implement the scanner and workflow instructions**

The scanner must inspect source and artifact content, skip legacy artifacts, and enforce:

- `metadata.design_profile` is `editorial_v2`.
- `hero.answer_snippet` is 40–60 words.
- CTA label is at most 32 characters and contains no embedded arrow glyphs or `->` fragments.
- Future renderer source contains `flex items-center justify-between whitespace-nowrap`.
- Future renderer/source has no fixed/sticky bottom CTA and no gradient on interactive primitives.
- Future CSS remains scoped to `.landing-editorial-v2` and does not replace global `body` font/background.
- Full disclosure is rendered in the future footer while compact disclosure remains before the CTA.

Add the exact matrix to `project_rules.md` and the drafter output contract. Keep existing intent, evidence, compliance, link, and owner-approval rules unchanged.

- [ ] **Step 4: Run the focused test and static matrix validation**

Run: `npm test -- tests/editorial-v2-static-gate.test.ts`

Run: `npm run validate:landing:matrix`

Expected: both commands exit 0.

- [ ] **Step 5: Commit the gate change**

```powershell
git add -- project_rules.md .agents/skills/direct-review-page-drafter/SKILL.md .agents/skills/direct-review-page-drafter/references/output-contract.md scripts/scan-landing-static.mjs package.json tests/editorial-v2-static-gate.test.ts
git commit -m "chore: gate editorial v2 landing drafts"
```

### Task 4: Produce the exemplar from audited intake records

**Files:**
- Create: `src/generated/landing-page-drafts/next-50/` artifacts only after audited intake exists.
- Review: `src/generated/landing-pages/index.json` and closest published artifacts without modifying them until the page passes every gate.
- Review: source-of-truth product, affiliate-link, evidence, disclosure, program-rule, and destination-review records.

**Interfaces:**
- The exemplar must carry `metadata.design_profile: "editorial_v2"` and a valid answer snippet.
- No generated JSON may self-attest publication, approval, active-link, compliance, asset, or evidence state.

- [ ] **Step 1: Resolve the exemplar inputs**

Require the product name/category, original PartnerStack URL or audited affiliate-link id, target keyword/search intent, buyer segment, evidence/source notes, program rules, disclosure/material-connection state, review basis, destination review, and sibling/published-artifact context. Do not substitute the Vercel site URL for these records.

- [ ] **Step 2: Run `affiliate-page-intent-brief`**

Stop for `merge_into_existing`, `hold_for_evidence`, or `reject`. Continue only for an eligible new page or explicitly targeted rewrite/noindex draft.

- [ ] **Step 3: Run `direct-review-page-drafter` with the editorial v2 contract**

Require the answer snippet, future design profile, short CTA label, page-specific limitation, page-specific FAQ, and matching CTA/link ids.

- [ ] **Step 4: Run uniqueness, compliance, and conversion scanners/reviews**

Use the exact project-local skills and preserve all reason codes, source records, and blocking findings.

- [ ] **Step 5: Obtain audited owner approval before publication**

Only after approval may the artifact be copied into the published artifact source and added to `index.json` with the required provenance fields. Existing entries must not be rewritten.

- [ ] **Step 6: Run the editorial v2 static scan and hosted pre-review gate**

Run: `npm run scan:landing:editorial-v2 -- --json`

Run in GitHub/Vercel: `npm run gate:stage2:pre-review`

- [ ] **Step 7: Commit only the approved exemplar artifact and provenance**

Use a focused commit containing the new page artifact, manifest entry, and audited gate record. Do not include unrelated worktree changes.

### Task 5: Deploy each approved page and share the verified page URL

**Files:**
- No source-file changes required beyond the approved page artifact and manifest entry.
- Deployment evidence: Vercel deployment record and route check.

**Interfaces:**
- Canonical site origin: `https://vetted-saa-s-blueprint.vercel.app`.
- Page URL format: `https://vetted-saa-s-blueprint.vercel.app/landing-page-builders/<slug>`.

- [ ] **Step 1: Resolve the Vercel build blocker before deployment**

The latest deployment failed because `PUBLIC_POLICY_EFFECTIVE_DATE` and `INFORMATION_OFFICER_REGISTRATION_CONFIRMED_AT` are not valid ISO values. Do not invent legal dates. Configure the actual operator-approved values in Vercel or stop the deploy handoff with those exact missing inputs.

- [ ] **Step 2: Deploy the approved page change to a Vercel preview**

Use the connected Vercel deployment tool or Vercel CLI from the linked project. Do not promote to production without the explicit publication/owner gate for that page.

- [ ] **Step 3: Verify deployment state and route**

Require `READY` deployment state and a successful fetch of the page path. If the deployment is protected, create a temporary Vercel access URL only for verification; share the canonical page path after the deployment is ready.

- [ ] **Step 4: Share the page link immediately**

Report the page slug, canonical page URL, deployment URL, deployment state, commit SHA, and gate statuses before starting the next page.

- [ ] **Step 5: Repeat only after the page-level handoff**

Continue in batches of one exemplar, then at most three pages until the workflow passes without major rework.

### Task 6: Run the batch retro and final requirement audit

**Files:**
- Create: `docs/superpowers/reports/2026-07-10-editorial-v2-next-50-retro.json` after a batch exists.
- Review: all page-level gate outputs, Vercel deployment evidence, and owner decisions.

- [ ] **Step 1: Run `landing-page-batch-retro` after each batch**

Convert recurring CTA, typography, spacing, disclosure, duplicate-intent, evidence, or Vercel failures into exact skill/scanner/process changes or owner-approved deferrals.

- [ ] **Step 2: Verify the 50-page objective requirement-by-requirement**

Confirm every page has a distinct buyer decision, editorial v2 profile, audited evidence/link/destination/compliance records, owner approval, a READY Vercel deployment, and a shareable canonical URL.

- [ ] **Step 3: Report any unresolved intake or deployment blockers explicitly**

Do not claim all 50 pages are complete when the required page-level source inputs or Vercel legal environment values are missing.
