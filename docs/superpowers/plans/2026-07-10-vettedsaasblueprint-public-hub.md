# VettedSaaSBlueprint Public Hub and Legal Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the exposed owner dashboard at `/` with a warm editorial VettedSaaSBlueprint review hub, add the required public legal and trust pages, expose only audited approved review artifacts, harden visitor privacy, and release the reviewed Git revision through the existing Vercel production project.

**Architecture:** The Next.js App Router remains the only public application. A typed server-side site profile supplies canonical metadata and the sole-proprietor contact contract; a shared public shell renders the homepage and legal pages; and the static review catalogue accepts only manifests exported from audited Oracle `dynamic_pages` records. Admin routes remain under `/admin`, review bodies retain their existing renderer, and analytics are disabled unless both privacy signals and an externally verified retention control allow them.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS v4, Zod, Node test runner with `tsx`, Oracle-backed publication records, GitHub Actions, and the existing Vercel project `vetted-saa-s-blueprint`.

## Global Constraints

- Public brand and trading name: `VettedSaaSBlueprint`.
- Legal structure: South African sole proprietor; never claim that VettedSaaSBlueprint is a registered company or invent a registration number.
- Public address: `3 Wagner Lane, Sagewood, Johannesburg, Gauteng, South Africa`.
- Initial canonical origin: `https://vetted-saa-s-blueprint.vercel.app`.
- Public telephone: none. Contact, privacy, Information Officer, and PAIA requests use one Proton address supplied before implementation begins.
- Public contact, privacy, Information Officer, and PAIA email: `vettedsaasblueprint@proton.me`.
- `PUBLIC_POLICY_EFFECTIVE_DATE` is a required ISO `YYYY-MM-DD` release value set to the actual production-promotion date; the next review date is computed as one calendar year later.
- `INFORMATION_OFFICER_REGISTRATION_CONFIRMED_AT` is a required ISO timestamp recorded only after the owner has registered as Information Officer with the South African Information Regulator; the site must never claim registration before this value exists.
- Any personal identity required privately by SARS or the Information Regulator stays in those external registrations and is not rendered as the public website name.
- Legal operator wording: `VettedSaaSBlueprint is a South African sole proprietorship operating from 3 Wagner Lane, Sagewood, Johannesburg, Gauteng, South Africa.`
- The site publishes reviews and affiliate links only; it does not sell software, accept payments, form vendor contracts, provide refunds, or supply reviewed products.
- No public signup, teams, billing, newsletter capture, public forms, third-party pixels, fingerprinting, remarketing, raw IP storage, or new identity providers.
- Preserve original PartnerStack URLs and parameters; affiliate links remain `rel="nofollow sponsored"` and disclosures remain before or near the first CTA.
- Review JSON is draft content. Only the audited owner publication path can create catalogue entries, routes, sitemap URLs, or `index,follow` metadata.
- Public raw analytics events: no IP or IP hash, at most 90 days. Daily aggregates: at most 24 months. Analytics remain disabled until the owner separately verifies an Oracle/Hermes retention control and sets `ANALYTICS_RETENTION_VERIFIED_AT`.
- Analytics disablement is enforced at every client and server ingress, including `/ingest/events`, every `/api/events/*` handler, and `/r/affiliate`; affiliate redirects still work when event storage is suppressed.
- Respect Global Privacy Control and Do Not Track by suppressing all nonessential analytics events.
- No cookie banner while public pages set no nonessential cookies; owner authentication cookies are essential and limited to `/admin` workflows.
- Do not run local dependency installs, builds, full typechecks, or dev servers. Validation runs in GitHub Actions and Vercel.
- Preserve all unrelated dirty-worktree changes. Before implementation, the owner must checkpoint the existing Step 2 publication/scanner dependency set or explicitly approve its inclusion; do not silently stage the current `package.json`, workflow, generated-artifact, or scanner changes. After that checkpoint, create `codex/public-review-hub` and stage only files named in this plan.
- Promotion requires legal-profile completion, landing scanner success, audited owner approval for every exposed review, manual accessibility review, and a READY Vercel preview.

---

## File and Interface Map

- `src/lib/site/public-site.ts`: owns the typed public identity, origin, policy dates, analytics policy, release blockers, and metadata helpers.
- `src/lib/publication/landing-artifacts.ts` and `src/lib/generated/landing-pages.ts`: own trusted publication export and read-only public review summaries.
- `src/components/public/*`: owns the warm editorial header, footer, page shell, legal-document layout, and review cards.
- `src/app/page.tsx`, `src/app/layout.tsx`, and `src/app/globals.css`: own homepage composition, root metadata, and scoped public visual tokens.
- `src/app/{privacy,terms,contact,editorial-policy,paia,accessibility,affiliate-disclosure}`: own public policies and trust content.
- `src/app/{robots.ts,sitemap.ts,not-found.tsx,opengraph-image.tsx}`: own discovery, canonical indexing, errors, and social sharing.
- `src/components/landing/DirectReviewPage.tsx` and `src/app/landing-page-builders/[slug]/page.tsx`: add the shared public relationship without rewriting approved review copy.
- `src/lib/tracking/privacy.ts`, `src/components/landing/OracleTracking.tsx`, and `src/lib/tracking/events.ts`: own analytics enablement, privacy signals, and data minimization.
- `tests/public-site-*.test.ts` plus existing publication/tracking tests: own regression and release-gate coverage.

---

### Task 1: Typed public identity and production release gate

**Files:**
- Create: `src/lib/site/public-site.ts`
- Create: `scripts/validate-public-site.ts`
- Create: `tests/public-site-config.test.ts`
- Modify: `.env.example`
- Modify: `package.json`

**Interfaces:**
- Produces: `loadPublicSiteConfig(env?: NodeJS.ProcessEnv): PublicSiteConfig`.
- Produces: `getPublicLaunchBlockers(config: PublicSiteConfig): string[]`.
- Produces: `assertPublicLaunchReady(config: PublicSiteConfig): void`.
- Produces: `publicSiteMetadata(config: PublicSiteConfig): Metadata`.
- Required environment values: `PUBLIC_POLICY_EFFECTIVE_DATE`, `INFORMATION_OFFICER_REGISTRATION_CONFIRMED_AT`.
- Optional environment values: `PUBLIC_SITE_ORIGIN`, `ANALYTICS_ENABLED`, `ANALYTICS_RETENTION_VERIFIED_AT`.

- [ ] **Step 1: Write the failing configuration tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";

import { getPublicLaunchBlockers, loadPublicSiteConfig } from "../src/lib/site/public-site";

test("sole-proprietor profile uses VettedSaaSBlueprint and the approved Johannesburg address", () => {
  const config = loadPublicSiteConfig({
    PUBLIC_POLICY_EFFECTIVE_DATE: "2026-07-10",
    INFORMATION_OFFICER_REGISTRATION_CONFIRMED_AT: "2026-07-10T08:00:00.000Z",
  });
  assert.equal(config.brandName, "VettedSaaSBlueprint");
  assert.equal(config.operator.structure, "sole_proprietor");
  assert.equal(config.operator.address.line1, "3 Wagner Lane");
  assert.equal(config.operator.address.city, "Johannesburg");
  assert.equal(config.operator.registrationNumber, null);
  assert.equal(config.operator.publicEmail, "vettedsaasblueprint@proton.me");
});

test("release blockers reject missing policy date and Information Officer confirmation", () => {
  const blockers = getPublicLaunchBlockers(loadPublicSiteConfig({}));
  assert.deepEqual(blockers, [
    "PUBLIC_POLICY_EFFECTIVE_DATE must be a valid ISO date.",
    "INFORMATION_OFFICER_REGISTRATION_CONFIRMED_AT must be a valid ISO timestamp.",
  ]);
});

test("analytics cannot enable without verified retention", () => {
  const config = loadPublicSiteConfig({
    PUBLIC_POLICY_EFFECTIVE_DATE: "2026-07-10",
    INFORMATION_OFFICER_REGISTRATION_CONFIRMED_AT: "2026-07-10T08:00:00.000Z",
    ANALYTICS_ENABLED: "true",
  });
  assert.equal(config.analytics.enabled, false);
});
```

- [ ] **Step 2: Commit the failing test only and push for CI evidence**

```powershell
git add tests/public-site-config.test.ts
git commit -m "test: define public site identity contract"
git push -u origin codex/public-review-hub
gh pr create --draft --base codex/step-2-build --head codex/public-review-hub --title "Build VettedSaaSBlueprint public hub" --body "Implements the approved public hub, legal pages, publication provenance, privacy hardening, and Vercel release gates."
```

Expected GitHub result: the draft pull request starts the existing `pull_request` workflow and the test job fails because `src/lib/site/public-site.ts` does not exist. Every later push updates this same draft pull request.

- [ ] **Step 3: Implement the configuration contract**

Use a Zod-backed type with these exact stable values:

```ts
export type PublicSiteConfig = {
  brandName: "VettedSaaSBlueprint";
  canonicalOrigin: string;
  operator: {
    structure: "sole_proprietor";
    tradingName: "VettedSaaSBlueprint";
    registrationNumber: null;
    publicEmail: "vettedsaasblueprint@proton.me";
    phone: null;
    informationOfficer: {
      displayName: "Information Officer, VettedSaaSBlueprint";
      email: "vettedsaasblueprint@proton.me";
      registrationConfirmedAt: string;
    };
    address: {
      line1: "3 Wagner Lane";
      suburb: "Sagewood";
      city: "Johannesburg";
      province: "Gauteng";
      country: "South Africa";
    };
  };
  analytics: {
    enabled: boolean;
    rawEventRetentionDays: 90;
    aggregateRetentionMonths: 24;
  };
  policies: {
    effectiveDate: string;
    reviewDate: string;
  };
};
```

`loadPublicSiteConfig` must use the fixed public brand, email, and address above; normalize `PUBLIC_SITE_ORIGIN` to an HTTPS origin; validate `PUBLIC_POLICY_EFFECTIVE_DATE` as a real ISO calendar date; compute `reviewDate` one calendar year later; validate the Information Officer confirmation timestamp; and set `analytics.enabled` only when `ANALYTICS_ENABLED === "true"` and `ANALYTICS_RETENTION_VERIFIED_AT` is a valid ISO timestamp. `assertPublicLaunchReady` must throw one combined error containing every blocker. Do not import this module from client components.

- [ ] **Step 4: Add public environment documentation and a validation command**

Add these non-secret names to `.env.example` without example personal data:

```dotenv
PUBLIC_SITE_ORIGIN="https://vetted-saa-s-blueprint.vercel.app"
PUBLIC_POLICY_EFFECTIVE_DATE=""
INFORMATION_OFFICER_REGISTRATION_CONFIRMED_AT=""
ANALYTICS_ENABLED="false"
ANALYTICS_RETENTION_VERIFIED_AT=""
```

Add `validate:public-site` to `package.json` using the existing `tsx` runtime and a small `scripts/validate-public-site.ts` entrypoint that calls `assertPublicLaunchReady(loadPublicSiteConfig())`. The script exits zero only when the fixed public identity is intact and policy date, Information Officer registration confirmation, and HTTPS origin are valid; analytics may remain disabled.

- [ ] **Step 5: Push the implementation and require green CI**

```powershell
git add .env.example package.json scripts/validate-public-site.ts src/lib/site/public-site.ts tests/public-site-config.test.ts
git commit -m "feat: add public site identity gate"
git push
```

Expected GitHub result: configuration tests pass; existing jobs remain unchanged.

---

### Task 2: Audited publication provenance and safe review catalogue

**Files:**
- Modify: `src/lib/db/query.ts`
- Modify: `src/lib/db/index.ts`
- Modify: `src/lib/auth/audit.ts`
- Create: `src/lib/pages/publish-transaction.ts`
- Modify: `src/app/api/admin/pages/[id]/route.ts`
- Modify: `src/lib/publication/landing-artifacts.ts`
- Modify: `src/lib/generated/landing-pages.ts`
- Modify: `src/app/api/hermes/landing-artifacts/route.ts`
- Modify: `src/app/landing-page-builders/[slug]/page.tsx`
- Modify: `scripts/scan-landing-static.mjs`
- Modify: `.agents/skills/affiliate-compliance-review/scripts/summarize-compliance-risks.mjs`
- Modify: `.agents/skills/landing-page-uniqueness-review/scripts/summarize-page-duplicates.mjs`
- Modify: `.agents/skills/conversion-copy-review/scripts/summarize-conversion-copy-risks.mjs`
- Modify: `tests/publication-artifacts.test.ts`
- Modify: `tests/generated-landing-pages.test.ts`
- Modify: `tests/stage2-pre-review-gate.test.ts`
- Modify: `tests/page-publish.test.ts`
- Create: `tests/publication-provenance.test.ts`
- Create: `tests/landing-scanner-empty-state.test.ts`

**Interfaces:**
- Produces: `withTransaction<T>(work: (tx: TransactionSql) => Promise<T>): Promise<T>`; every statement uses one Oracle connection with `autoCommit: false`, then commits once or rolls back on any error.
- Produces: `publishApprovedPageAtomically(input: PublishApprovedPageInput): Promise<PublishedPageResult>` that creates one immutable `page_versions` row and updates the dynamic page, generation job, and audit in the same transaction.
- Produces: `requireAdminAudit(tx: TransactionSql, action: string, details: AuditDetails): Promise<string>` returning the persisted audit ID and never swallowing failure.
- Produces manifest entries with `publication_source: "oracle_dynamic_pages"`, `published_at: string`, `current_version_id: string`, and `owner_publish_audit_id: string`.
- Produces: `PublicReviewSummary` with `slug`, `path`, `title`, `description`, `categorySlug`, `decisionCue`, `limitationCue`, and `publishedAt`.
- Produces: `listPublishedLandingPageSummaries(): PublicReviewSummary[]`.
- A missing manifest means zero public reviews; it is not a build error and never falls back to draft files.

- [ ] **Step 1: Write failing provenance tests**

Add transaction tests proving that page version, dynamic-page status, generation job, and audit either all commit or all roll back. Add explicit cases for a failed re-publish, a stale audit tied to an older version, duplicate historical audits, and an audit for another dynamic page. Add export fixtures proving that only the audit matching both `dynamic_pages.id` and `dynamic_pages.current_version_id` authorizes export. Add a generated-loader test proving that a missing manifest returns `[]`, while a manifest entry missing any provenance field is rejected.

```ts
await assert.rejects(() => publishApprovedPageAtomically(failingAuditInput), /audit write failed/i);
assert.deepEqual(transaction.committedStatements, []);
assert.equal(buildPublishedLandingArtifactsPayload([staleAuditRow]).index.pages.length, 0);
assert.equal(buildPublishedLandingArtifactsPayload([currentVersionAuditRow]).index.pages.length, 1);
assert.deepEqual(loadPublishedLandingPageSummariesFromDirectory(emptyDirectory), []);
```

- [ ] **Step 2: Push the failing provenance tests**

```powershell
git add tests/publication-artifacts.test.ts tests/generated-landing-pages.test.ts tests/publication-provenance.test.ts tests/page-publish.test.ts tests/landing-scanner-empty-state.test.ts
git commit -m "test: require audited publication provenance"
git push
```

Expected GitHub result: targeted tests fail because transaction support, current-version correlation, and zero-directory scanner behavior do not exist.

- [ ] **Step 3: Add one-connection transaction support**

Refactor `src/lib/db/query.ts` to expose `TransactionSql`, a tagged-template executor bound to one acquired connection, and `withTransaction`. Statements inside the callback use `autoCommit: false`; success calls `connection.commit()`, any error calls `connection.rollback()`, and `finally` closes the connection. Existing `sql` behavior remains unchanged for unrelated callers.

- [ ] **Step 4: Publish the current immutable version atomically**

Implement `publishApprovedPageAtomically` with this exact transaction order: lock the approved blueprint row; calculate the next version number; insert a new `page_versions` row containing the structural copy, gate result, scores, `approved_by = "owner"`, and one captured `publishedAt`; insert or update `dynamic_pages` with that version ID and timestamp; insert the `LANDING_ARTIFACT_PUBLICATION` job; insert `publish_page` audit data keyed to the dynamic-page ID and containing `blueprint_id`, `page_id`, `current_version_id`, and `published_at`; commit. Replace the route's separate writes with this function. No success response is returned until commit completes.

- [ ] **Step 5: Export only the current audited version**

Change the Oracle query to join the current page version and exactly one matching audit:

```sql
select dp.path,
       dp.published_at,
       dp.current_version_id,
       pb.id as blueprint_id,
       pv.structural_copy as structural_json,
       json_value(al.after_state, '$.current_version_id') as audit_current_version_id,
       al.id as owner_publish_audit_id
from dynamic_pages dp
join page_blueprints pb on pb.id = dp.blueprint_id and pb.status = 'approved'
join page_versions pv on pv.id = dp.current_version_id
                     and pv.blueprint_id = pb.id
                     and pv.published_at = dp.published_at
join (
  select id, entity_id, after_state,
         row_number() over (
           partition by entity_id, json_value(after_state, '$.current_version_id')
           order by created_at desc, id desc
         ) as audit_rank
  from audit_log
  where action = 'publish_page'
) al on al.entity_id = dp.id
    and al.audit_rank = 1
    and json_value(al.after_state, '$.page_id') = dp.id
    and json_value(al.after_state, '$.blueprint_id') = pb.id
    and json_value(al.after_state, '$.current_version_id') = dp.current_version_id
where dp.status = 'published'
  and dp.published_at is not null
order by dp.updated_at desc
```

The payload builder must independently reject a row when `audit_current_version_id !== current_version_id`. The writer copies all public provenance fields into `index.json` and writes `pv.structural_copy`, never the mutable blueprint body. The reader requires the provenance fields before loading an artifact. Old or duplicate audits cannot match a newer `current_version_id`. Do not stage the current unverified `src/generated/landing-pages/index.json` or its 12 candidate artifacts as part of this task.

- [ ] **Step 6: Make every scanner safe for a genuine zero-artifact state**

Before editing the project-local skill scripts, invoke `superpowers:writing-skills` plus the uniqueness, affiliate-compliance, and conversion-copy review skills. Update each scanner's `readJsonFiles` to return `[]` when the target directory is absent, while still failing malformed JSON and missing named targets. Update `scripts/scan-landing-static.mjs` and `landingArtifactCount()` similarly. `tests/landing-scanner-empty-state.test.ts` must execute all 15 matrix commands against a temporary empty directory/report fixture and require schema version 1, `status: "pass"`, and `scanned_count: 0`; it must separately prove that a manifest referencing a missing artifact fails.

- [ ] **Step 7: Provide safe summary behavior**

Make the generated loader accept an injected directory for tests and return an empty map when `index.json` is absent. Derive summaries from schema-valid artifacts only; use `metadata.title_tag`, `metadata.meta_description`, `metadata.category_slug`, `problem_solution.problem`, the first limitation, and the manifest timestamp. Sort newest first, then slug for stable ties.

- [ ] **Step 8: Push implementation and require publication tests plus every scanner to pass**

```powershell
git add src/lib/db/query.ts src/lib/db/index.ts src/lib/auth/audit.ts src/lib/pages/publish-transaction.ts src/app/api/admin/pages/[id]/route.ts src/lib/publication/landing-artifacts.ts src/lib/generated/landing-pages.ts src/app/api/hermes/landing-artifacts/route.ts src/app/landing-page-builders/[slug]/page.tsx scripts/scan-landing-static.mjs .agents/skills/affiliate-compliance-review/scripts/summarize-compliance-risks.mjs .agents/skills/landing-page-uniqueness-review/scripts/summarize-page-duplicates.mjs .agents/skills/conversion-copy-review/scripts/summarize-conversion-copy-risks.mjs tests/publication-artifacts.test.ts tests/generated-landing-pages.test.ts tests/publication-provenance.test.ts tests/stage2-pre-review-gate.test.ts tests/page-publish.test.ts tests/landing-scanner-empty-state.test.ts
git commit -m "feat: gate public reviews on audited publication"
git push
```

Expected GitHub result: transaction/provenance tests pass; every landing scanner passes with zero artifacts and evaluates only separately approved artifacts when present.

---

### Task 3: Warm editorial public shell and homepage

**Files:**
- Create: `src/components/public/PublicHeader.tsx`
- Create: `src/components/public/PublicFooter.tsx`
- Create: `src/components/public/PublicPageShell.tsx`
- Create: `src/components/public/PublicReviewCard.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`
- Create: `tests/public-home.test.ts`

**Interfaces:**
- `PublicPageShell` accepts `{ children, tone?: "light" | "dark" }` and renders skip link, header, main landmark, and footer.
- `PublicReviewCard` accepts one `PublicReviewSummary`; it never accepts raw draft JSON.
- Homepage calls only `listPublishedLandingPageSummaries()`.

- [ ] **Step 1: Write failing homepage source and behavior tests**

Tests must assert that `/` contains no `/admin/` links, displays the VettedSaaSBlueprint brand and trust promise, calls the approved summary API, provides an honest zero-review state, and has one H1. Static source checks must also require a skip link and footer links to every legal route.

- [ ] **Step 2: Push the failing homepage tests**

```powershell
git add tests/public-home.test.ts
git commit -m "test: define public editorial homepage"
git push
```

Expected GitHub result: the homepage test fails because the current root exposes admin cards.

- [ ] **Step 3: Implement shared public components**

Use semantic landmarks and these navigation labels: `Reviews`, `How we vet`, `Editorial policy`, and `Affiliate disclosure`. The brand links to `/`. The footer links to `/privacy`, `/terms`, `/contact`, `/affiliate-disclosure`, `/editorial-policy`, `/paia`, and `/accessibility`.

Use scoped `.public-site` tokens rather than changing admin colors globally:

```css
.public-site {
  --paper: #f5f0e7;
  --paper-strong: #fffdf8;
  --ink: #1d211d;
  --muted-ink: #61675f;
  --rule: #d8d0c2;
  --sage: #667b68;
  --clay: #a8664b;
  background: var(--paper);
  color: var(--ink);
}
```

Use an editorial system-font stack with no font download, external font stylesheet, stock-photo dependency, glassmorphism, or decorative gradients. Motion is limited to CSS hover/focus transitions and respects `prefers-reduced-motion`.

- [ ] **Step 4: Replace `/` with the integrated editorial hub**

Compose these sections in order: concise hero, visible affiliate statement, approved review catalogue, `How we vet` four-point trust section, and editorial/disclosure callout. Review cards show title, description, category, decision cue, limitation cue, and `Read review`. When the summary list is empty, render: `No reviews are publicly approved yet. VettedSaaSBlueprint publishes a review only after evidence, compliance, and owner checks are complete.`

- [ ] **Step 5: Add canonical root metadata**

Use `metadataBase` from the site config, title template `%s | VettedSaaSBlueprint`, default title `VettedSaaSBlueprint — Practical SaaS reviews`, description focused on evidence-backed software decisions, Open Graph type `website`, and Twitter card `summary_large_image`.

- [ ] **Step 6: Push and require homepage/a11y/build checks to pass**

```powershell
git add src/components/public src/app/page.tsx src/app/layout.tsx src/app/globals.css tests/public-home.test.ts
git commit -m "feat: build VettedSaaSBlueprint public hub"
git push
```

Expected GitHub result: homepage tests, lint, typecheck, build, and static accessibility scanner pass.

---

### Task 4: Legal, privacy, editorial, PAIA, and accessibility pages

**Files:**
- Create: `src/components/public/LegalDocument.tsx`
- Create: `src/app/privacy/page.tsx`
- Create: `src/app/terms/page.tsx`
- Create: `src/app/contact/page.tsx`
- Create: `src/app/editorial-policy/page.tsx`
- Create: `src/app/paia/page.tsx`
- Create: `src/app/accessibility/page.tsx`
- Modify: `src/app/affiliate-disclosure/page.tsx`
- Create: `tests/public-legal-pages.test.ts`

**Interfaces:**
- Every policy imports `loadPublicSiteConfig()` and renders the same operator identity, public address, Proton mailto link, effective date, and review date.
- `LegalDocument` accepts `title`, `summary`, `effectiveDate`, `reviewDate`, and children; it uses `PublicPageShell`.
- Contact is email-only and contains no form, database write, or newsletter consent.

- [ ] **Step 1: Write failing legal-page coverage tests**

Tests must verify all seven routes exist, import `LegalDocument`, include the brand/operator relationship, and contain no temporary-copy markers or sample-domain values. Privacy tests require data categories, purposes, lawful basis, app analytics versus hosting-infrastructure processing, processors, cross-border processing, retention, rights, security, children, and complaint routes. Terms tests require no-sale/payment language and third-party vendor responsibility. PAIA tests require every private-body manual section listed in Step 5 and must fail if Information Officer registration confirmation is missing.

- [ ] **Step 2: Push the failing legal tests**

```powershell
git add tests/public-legal-pages.test.ts
git commit -m "test: define public legal page requirements"
git push
```

Expected GitHub result: missing-route assertions fail.

- [ ] **Step 3: Implement the privacy notice**

Identify VettedSaaSBlueprint as the responsible South African sole proprietorship through the exact wording from `PublicSiteConfig`. Describe the five possible first-party events (`page_view`, `cta_click`, `affiliate_click`, `link_error`, `faq_expand`), page URL, referrer, and user agent; explicitly state that the application stores no raw IP or IP hash. State legitimate-interest purposes for security, link reliability, and aggregated improvement; disclose Vercel hosting, Oracle storage/worker processing, and the separate PartnerStack/vendor destination after a click. Distinguish disabled application analytics from network, security, and operational metadata that Vercel or network providers may process under their own infrastructure duties. State the 90-day raw and 24-month aggregate limits only for enabled app analytics, GPC/DNT behavior, essential owner-session cookie, international processing, POPIA access/correction/deletion/objection rights where applicable, and complaint contact to the South African Information Regulator.

- [ ] **Step 4: Implement terms and affiliate disclosure**

Terms must say VettedSaaSBlueprint is informational, is not the vendor or seller, accepts no payment, does not control vendor pricing/trials/refunds/security, and forms no purchase contract. Cover acceptable use, intellectual property, third-party links, evidence freshness, lawful warranty/liability limits, changes, severability, and South African law with Gauteng venue. The affiliate disclosure must plainly say commissions may be earned at no extra cost, compensation does not guarantee a positive review, and in-page disclosures remain near affiliate CTAs.

- [ ] **Step 5: Implement contact, editorial, PAIA, and accessibility pages**

Contact exposes the Proton mailto link and Johannesburg address only. Editorial policy explains evidence, limitations, corrections, AI structured-JSON boundaries, owner approval, and affiliate independence. Accessibility states WCAG 2.2 AA as the target—not a guaranteed certification—and documents keyboard, focus, contrast, reduced-motion, and feedback behavior.

Implement `/paia` as the full printable Section 51 private-body manual, not a summary page. It must contain: body name `VettedSaaSBlueprint`; head designation `Sole Proprietor, VettedSaaSBlueprint`; Information Officer display name `Information Officer, VettedSaaSBlueprint`; the approved email/address; manual purpose and effective/review dates; availability of the Information Regulator PAIA guide; records automatically available without a request; records held under applicable legislation; subjects and categories of business records; POPIA purposes, data-subject categories, personal-information categories, recipient categories, cross-border flows, and security safeguards; Form 2 request procedure, submission address, proof/authority requirements, prescribed fees, decision timing, possible grounds for refusal, internal-remedy limitation, Regulator complaint/court remedies; manual availability and update history. Link the official forms and guide at `https://inforegulator.org.za/paia/`. Add print CSS so the HTML page itself is a usable manual. Do not state or imply Information Officer registration unless `INFORMATION_OFFICER_REGISTRATION_CONFIRMED_AT` passed the production release gate.

- [ ] **Step 6: Push and require legal/links/a11y checks to pass**

```powershell
git add src/components/public/LegalDocument.tsx src/app/privacy src/app/terms src/app/contact src/app/editorial-policy src/app/paia src/app/accessibility src/app/affiliate-disclosure/page.tsx tests/public-legal-pages.test.ts
git commit -m "feat: add public legal and trust pages"
git push
```

Expected GitHub result: legal tests and landing link/accessibility scanners pass with no placeholder finding.

---

### Task 5: Search discovery, social sharing, and public error state

**Files:**
- Create: `src/app/robots.ts`
- Create: `src/app/sitemap.ts`
- Create: `src/app/not-found.tsx`
- Create: `src/app/opengraph-image.tsx`
- Create: `tests/public-discovery.test.ts`

**Interfaces:**
- Sitemap consumes `listPublishedLandingPageSummaries()` and the static public route list.
- Robots allows public routes, disallows `/admin/` and `/api/`, and references the canonical sitemap.
- OG image uses only bundled/system fonts and VettedSaaSBlueprint visual tokens.

- [ ] **Step 1: Write failing discovery tests**

Tests must assert that sitemap contains the homepage and all legal routes, contains only audited review paths, and never contains `/admin`, `/api`, an unapproved slug, or a draft artifact. Robots must disallow admin/API paths. The 404 page must use the public shell and link home.

- [ ] **Step 2: Push the failing discovery tests**

```powershell
git add tests/public-discovery.test.ts
git commit -m "test: define public discovery boundaries"
git push
```

Expected GitHub result: tests fail because sitemap, robots, OG image, and public 404 do not exist.

- [ ] **Step 3: Implement discovery and sharing files**

Use Next.js metadata route types. Set legal page `lastModified` to the policy review date and review entries to `publishedAt`. Use conservative change frequencies (`weekly` for `/`, `monthly` for policies, `weekly` for reviews) without fabricated priority claims. The OG image is 1200×630, uses the warm paper/ink/sage palette, and contains the brand plus `Practical SaaS reviews for real buying decisions`.

- [ ] **Step 4: Push and require SEO/build checks to pass**

```powershell
git add src/app/robots.ts src/app/sitemap.ts src/app/not-found.tsx src/app/opengraph-image.tsx tests/public-discovery.test.ts
git commit -m "feat: add public discovery metadata"
git push
```

Expected GitHub result: discovery tests, SEO scanner, route scanner, and build pass.

---

### Task 6: Review-page relationship and privacy-safe analytics

**Files:**
- Create: `src/lib/tracking/privacy.ts`
- Modify: `src/components/landing/OracleTracking.tsx`
- Modify: `src/components/landing/DirectReviewPage.tsx`
- Modify: `src/lib/tracking/events.ts`
- Modify: `src/lib/tracking/oracle-public-endpoints.ts`
- Modify: `src/lib/tracking/oracle-public-event-handler.ts`
- Modify: `src/app/ingest/events/route.ts`
- Modify: `src/app/r/affiliate/route.ts`
- Modify: `src/app/api/events/page-view/route.ts`
- Modify: `src/app/api/events/cta-click/route.ts`
- Modify: `src/app/api/events/affiliate-click/route.ts`
- Modify: `src/app/api/events/link-error/route.ts`
- Modify: `src/app/api/events/faq-expand/route.ts`
- Modify: `src/app/landing-page-builders/[slug]/page.tsx`
- Create: `tests/tracking-privacy.test.ts`
- Modify: `tests/oracle-public-route-handler.test.ts`
- Modify: `tests/generated-landing-pages.test.ts`

**Interfaces:**
- Produces: `analyticsAllowedByPrivacySignals(input: { globalPrivacyControl?: boolean; doNotTrack?: string | null }): boolean`.
- Produces: `publicTrackingAllowed(request: Request, config: PublicSiteConfig): boolean`, requiring configured enablement and rejecting `Sec-GPC: 1` or `DNT: 1`.
- `OracleTracking` accepts `enabled: boolean`, `pageSlug: string`, and `ctaLinkId: string`.
- Server computes `enabled` from `PublicSiteConfig.analytics.enabled`; the client cannot override it.
- Every server event ingress calls `publicTrackingAllowed` before forwarding or storing. `/r/affiliate` always preserves the approved redirect even when tracking is suppressed.
- Review metadata parses `blueprint.metadata.robots` and canonical URL instead of hard-coding `index: true`.

- [ ] **Step 1: Write failing privacy tests**

```ts
assert.equal(analyticsAllowedByPrivacySignals({ globalPrivacyControl: true }), false);
assert.equal(analyticsAllowedByPrivacySignals({ doNotTrack: "1" }), false);
assert.equal(analyticsAllowedByPrivacySignals({ doNotTrack: "0" }), true);
```

Add route/source assertions that no request header named `x-forwarded-for` is read and no `hashIp` function remains. Add review metadata tests for `noindex,nofollow`, canonical fallback to the configured origin, and the absence of unpublished sitemap/route params.

Add direct-request tests for `/ingest/events`, all `/api/events/*` handlers, and `/r/affiliate`. With analytics disabled, `Sec-GPC: 1`, or `DNT: 1`, the fetch/database spy must remain untouched. The affiliate route must still return the approved 302 destination.

- [ ] **Step 2: Push the failing privacy tests**

```powershell
git add tests/tracking-privacy.test.ts tests/oracle-public-route-handler.test.ts tests/generated-landing-pages.test.ts
git commit -m "test: define privacy-safe public tracking"
git push
```

Expected GitHub result: privacy tests fail because IP hashing and unconditional tracking remain.

- [ ] **Step 3: Remove IP-derived storage and gate every client and server ingress**

Delete `hashIp`, never read `x-forwarded-for`, and insert `null` for `ip_hash` on the legacy DB path. Before attaching any listeners or sending a page view, `OracleTracking` must require `enabled` and check `navigator.globalPrivacyControl !== true` plus `navigator.doNotTrack !== "1"`. At the server, `/ingest/events`, the common Oracle event handler, every `/api/events/*` method, and `/r/affiliate` must require `publicTrackingAllowed`; suppressed event endpoints return a successful `202` without forwarding or writing, while `/r/affiliate` skips the event call and still redirects. Continue allowlisting only the five approved event types and existing minimal fields.

- [ ] **Step 4: Integrate the shared brand relationship without rewriting reviews**

Change the review header brand from unlinked `GlobalSetup` text to a link labeled `VettedSaaSBlueprint` pointing to `/`. Add a dark-compatible public footer with home and legal links after the review body. Preserve disclosure placement, CTA IDs, affiliate redirects, approved assets, section order, structured content, and motion hooks.

- [ ] **Step 5: Honor blueprint canonical and robots metadata**

Parse the comma-separated robots value. Only `index,follow` may produce index/follow; any other or unknown value defaults to noindex/nofollow. Use the blueprint canonical only when it is HTTPS and matches the configured canonical origin; otherwise construct `${origin}/landing-page-builders/${slug}`. Do not trust arbitrary external canonical URLs.

- [ ] **Step 6: Push and require every landing gate to pass**

```powershell
git add src/lib/tracking/privacy.ts src/components/landing/OracleTracking.tsx src/components/landing/DirectReviewPage.tsx src/lib/tracking/events.ts src/lib/tracking/oracle-public-endpoints.ts src/lib/tracking/oracle-public-event-handler.ts src/app/ingest/events/route.ts src/app/r/affiliate/route.ts src/app/api/events/page-view/route.ts src/app/api/events/cta-click/route.ts src/app/api/events/affiliate-click/route.ts src/app/api/events/link-error/route.ts src/app/api/events/faq-expand/route.ts src/app/landing-page-builders/[slug]/page.tsx tests/tracking-privacy.test.ts tests/oracle-public-route-handler.test.ts tests/generated-landing-pages.test.ts
git commit -m "feat: harden review privacy and navigation"
git push
```

Expected GitHub result: tracking tests and all 15 landing scanners pass. If any candidate artifact fails uniqueness, compliance, conversion, asset, link, or publish-readiness review, exclude it rather than weakening the scanner.

---

### Task 7: CI release gate, Vercel preview, production promotion, and rollback

**Files:**
- Modify: `.github/workflows/preview-build.yml`
- Modify: `package.json`
- Modify: `vercel.json`
- Create: `tests/public-release-gate.test.ts`
- Create: `docs/deployment/public-site-release.md`

**Interfaces:**
- CI and Vercel Preview/Production require `PUBLIC_POLICY_EFFECTIVE_DATE` and `INFORMATION_OFFICER_REGISTRATION_CONFIRMED_AT`; the approved brand, address, and Proton email are fixed in the public-site contract.
- `gate:public-release` runs `validate:public-site` before the existing Stage 2 gate.
- Production target remains the existing Vercel project and canonical `vetted-saa-s-blueprint.vercel.app` domain.

- [ ] **Step 1: Write failing release-gate tests**

Tests must read the workflow, `package.json`, and `vercel.json`; assert that build/final gates receive both release values; require the fixed brand, address, and Proton email in the public-site contract; require `validate:public-site` inside the Vercel build command; require `gate:public-release` before `gate:stage2:pre-review`; and prove that no deploy step targets a new Vercel/Sites project.

- [ ] **Step 2: Push the failing release test**

```powershell
git add tests/public-release-gate.test.ts
git commit -m "test: define public release gate"
git push
```

Expected GitHub result: the release-gate test fails because the workflow lacks public identity validation.

- [ ] **Step 3: Add the CI release gate and operator runbook**

Add repository variables to the build and landing-workflow environments:

```yaml
env:
  CI: true
  PUBLIC_SITE_ORIGIN: https://vetted-saa-s-blueprint.vercel.app
  PUBLIC_POLICY_EFFECTIVE_DATE: ${{ vars.PUBLIC_POLICY_EFFECTIVE_DATE }}
  INFORMATION_OFFICER_REGISTRATION_CONFIRMED_AT: ${{ vars.INFORMATION_OFFICER_REGISTRATION_CONFIRMED_AT }}
```

Add `npm run gate:public-release` before the build and before Stage 2 report generation. Make Vercel run `npm run validate:public-site && next build` so a deployment cannot bypass the identity/Information-Officer gate. Configure the policy date and Information Officer confirmation in both Vercel Preview and Production scopes and verify them through the Vercel environment-variable listing without printing their contents. The runbook must document: fixed public identity, environment scopes, zero-artifact behavior, owner/legal approval evidence, scanner evidence, preview URL, production build URL, smoke URLs, analytics-disabled default, and rollback.

- [ ] **Step 4: Push and require the complete GitHub gate to pass**

```powershell
git add .github/workflows/preview-build.yml package.json vercel.json tests/public-release-gate.test.ts docs/deployment/public-site-release.md
git commit -m "ci: gate VettedSaaSBlueprint public release"
git push
```

Expected GitHub result: typecheck, lint, tests, build, all landing scanners, public release gate, and Stage 2 gate are green.

- [ ] **Step 5: Complete manual preview acceptance**

On the Vercel preview, verify at 360, 768, 1024, and 1440 CSS pixels: navigation, catalogue/empty state, all legal pages, keyboard-only operation, visible focus, 200% zoom, reduced motion, disclosure proximity, review return navigation, and no horizontal overflow. Verify `/admin` still redirects unauthenticated users to owner login and no public page links into the owner console.

- [ ] **Step 6: Record owner/legal approvals**

The owner must confirm the rendered VettedSaaSBlueprint name, `vettedsaasblueprint@proton.me`, public home address, sole-proprietorship wording, email-only contact, Information Officer registration evidence, full PAIA manual, no-sale/payment language, and policy effective date. Each exposed review must have intent, uniqueness, compliance, conversion, scanner, and owner publication evidence. With zero eligible reviews, approve the honest empty-state launch. Set the GitHub and Vercel `PUBLIC_POLICY_EFFECTIVE_DATE` values to the scheduled production-promotion date; if promotion slips, update both values and rebuild the preview before approval.

- [ ] **Step 7: Build the reviewed Git revision with production-scoped Vercel values**

Use the connected Vercel project; do not create a Sites project and do not deploy the dirty local filesystem. Create the production-target deployment from the reviewed branch head after all preview approvals. Treat this as a separate production build because production-scoped environment values may differ from Preview. Verify the production deployment reports the same Git SHA as the approved preview, reaches READY, passes the Vercel-side public-site build gate, and only then assign the canonical production alias.

- [ ] **Step 8: Run production smoke checks**

Require HTTP 200 for `/`, `/privacy`, `/terms`, `/contact`, `/affiliate-disclosure`, `/editorial-policy`, `/paia`, `/accessibility`, `/robots.txt`, and `/sitemap.xml`. Require `/admin` authentication isolation. If an audited review exists, require its route to return 200 with disclosure and sponsored affiliate link; otherwise require an empty sitemap review set. Confirm analytics emits no request while disabled and while GPC/DNT is active.

- [ ] **Step 9: Roll back on any blocking failure**

If production smoke, legal identity, admin isolation, affiliate routing, or approved-only indexing fails, immediately promote the previously READY production deployment in Vercel. Leave analytics disabled, record the failed deployment URL and check, fix on the branch, and repeat preview approval before another promotion.

---

## Acceptance Criteria

- `/` is a warm light VettedSaaSBlueprint editorial hub with no owner/admin cards.
- Every public page has shared home/legal navigation and a visible affiliate relationship.
- Missing or unapproved artifacts never create homepage cards, route params, or sitemap URLs.
- VettedSaaSBlueprint is presented as a trading name, never as a registered company.
- Legal pages render VettedSaaSBlueprint, `vettedsaasblueprint@proton.me`, the approved Johannesburg address, and no telephone or registration number.
- Terms clearly state that the site does not sell products, accept payments, or control vendor transactions.
- Privacy copy matches actual behavior: no application raw IP/hash, analytics disabled until retention proof, all client/server event ingress gated, GPC/DNT respected, hosting-infrastructure processing distinguished, and no nonessential cookies.
- `/paia` is a complete printable Section 51 private-body manual and production is blocked until Information Officer registration is confirmed.
- A current immutable `page_versions` snapshot, dynamic-page state, publication job, and matching page/version audit commit atomically before export.
- All GitHub checks and landing-page gates pass; manual owner/legal/accessibility review is recorded.
- The reviewed Git SHA is rebuilt with production-scoped Vercel values, assigned to `https://vetted-saa-s-blueprint.vercel.app`, and passes production smoke checks.

## Explicit Assumptions and Deferred Items

- The public identity is fixed as VettedSaaSBlueprint with `vettedsaasblueprint@proton.me`; implementation must not substitute another brand or contact.
- The owner will register as Information Officer and provide the confirmation date before Task 1 implementation; this plan does not self-attest or automate that external registration.
- The existing dirty Step 2 publication/scanner work will be checkpointed or explicitly approved before implementation; this plan does not authorize bundling unrelated working-tree changes into its branch or deployment.
- The provided home address is intentionally authorized for public display on contact, privacy, and PAIA pages.
- VettedSaaSBlueprint remains an affiliate editorial publisher without checkout, subscriptions, paid services, or direct product supply.
- No current local generated review artifact is approved by this plan. Existing candidates must pass the repository landing-page skill loop and audited publication workflow independently.
- Analytics launches disabled. Enabling it requires separate explicit approval and verified Oracle/Hermes deletion of raw events older than 90 days; this website plan does not modify Oracle infrastructure or the existing Hermes runtime.
- Company registration, custom domain, custom-domain email, public telephone, cookie consent UI, newsletter capture, comparison tools, and homepage search are outside this release.
- Legal text is a compliance-oriented implementation draft and requires owner review; specialist legal advice remains appropriate if the business model, jurisdictions, data collection, or direct selling changes.
