# Topic Selection — Team Shared-Account Access Control

- **Selection run ID:** `R-2026-09-28-DELIVERY-001`
- **Run date:** 2026-09-28 (SAST)
- **Purpose:** select exactly one non-affiliate, high-value SaaS decision question for one connected Decision Hub, Solution Hub, and Decision Scenario release to `https://vettedsaasblueprint.online`, as commissioned by the product owner on 2026-09-28.
- **Scope and stop condition:** reuse the repository evidence record first, then four targeted primary sources. Stop when attributable problem evidence, primary capability documentation, a credible adoption or independent signal, and at least one genuine counter-signal were held.
- **Evidence state:** **partial** (see "Evidence gaps").

## Governing source requirements

This record follows the source-intelligence contract rather than treating a topic idea as a repository fact. Each citation below is a stable section UID in `docs/document-intelligence/SOURCE_MANIFEST.json`, reproducible as `sha256(exact_text)`.

- `D01-S-0a7372c951e0`, *D01 §7.2, The initial wedge*: the wedge must be outcome-shaped and decision-shaped questions, not broad product-review terms. The repository's own worked example list includes "Which type of CRM fits a five-person sales team with no administrator?"
- `D01-S-841116e1ce4e`, *D01 §10.3, Workstream A — Category opportunity assessment*: assess a shortlist against pain, question volume, evidence availability, decision complexity, scenario potential, maintenance burden, and visual potential.
- `D01-S-1b03f16605b0`, *D01 §10.4, Research stop conditions*: complete a defined search strategy and return an honest evidence state rather than search for a favourable answer.
- `D07-S-6cd122ae6051`, *D07 §8.2, Intent record* and `D07-S-a52b46a6e024`, *D07 §9.3, Demand-source rule*: retain question, source, date, persona, buyer state, constraint, and evidence readiness. Demand can establish that a question exists but cannot establish its answer.
- `D07-S-bb5e55f0f4bd`, *D07 §18.2, Priority dimensions* and `D07-S-c87bcf7ab169`, *D07 §18.3, Hard exclusions*: select the most useful answer, not the largest keyword; exclude duplicate primary intent, unsupported claims, affiliate bias, and topics with no decision value. No numerical score is asserted because the versioned weighting baseline (`D07-S-ecd712a40cce`) does not exist.
- `D08-S-3556637051b9`, *D08 §10, Source Roles*, `D08-S-e4b63d794258`, *D08 §11, Source Hierarchy*, and `D08-S-7aa714d7198c`, *D08 §12, Research Acquisition Pipeline*: label demand, evidence, and context roles; prefer the authority appropriate to each claim; preserve provenance and uncertainty.

## Step 1 — Existing knowledge retrieved first

`D08-S-7aa714d7198c` (retrieve existing knowledge first) was satisfied before any new retrieval:

- `docs/research/2026-09-02-e2e-canary-opportunity.md` — `OPP-E2E-CANARY-001`, already implemented and live as the `governed-ai-client-work-preparation` set. Its two rejected candidates were **CRM selection** and **client-portal / project-workspace selection**, each rejected because "no comparably specific, current, primary public demand evidence was acquired within this run's source budget", and each explicitly retained as "valid candidates for later bounded discovery".
- `build-pack/receipts/phase-one-release.json` and `build-pack/receipts/manual-production-deploy-2026-09-21.json` — the live route inventory.
- Route inventory from `src/app` — the complete set of published paths.

## Step 2 — Duplicate-intent screen (D07 §18.3 hard exclusion)

| Candidate primary intent | Existing coverage check | Result |
|---|---|---|
| Governed generative-AI workspace for internal preparation | `/decision-hub/governed-ai-client-work-preparation`, `/solution-hub/…`, `/scenarios/…` live and in sitemap | **Excluded** — duplicate primary intent. |
| Generic "best software approach for a five-person team" | `/decision-hub`, `/solution-hub`, `/scenarios` index guides | **Excluded** — duplicate. |
| Video localisation | `/decision-hub/video-localization`, `/solution-hub/…`, `/scenarios/…` | **Excluded** — duplicate. |
| CRM selection for a small professional-services team | `rg -i "crm"` over `src/app`, `src/lib`, `src/content`: only taxonomy keys (`src/lib/landing-workflow/category-taxonomy.ts:13-15`), a design-reference classifier signal (`src/lib/design-references/classifier.ts:132`), one incidental description string, and an admin placeholder. No decision page. | **Not a duplicate.** |
| Shared team account access / password manager for a team with no administrator | `rg -i "password manager|two-factor|multi-factor"` over `src`: no public page. `src/app/admin/login/page.tsx` is the owner's own sign-in form, not content. | **Not a duplicate.** |
| Email-platform migration | `/email-marketing-software`, `/guides/first-email-automation-workflow`, `getresponse-*`, `moosend-*` pages | **Excluded** — substantial existing coverage; a fourth email decision would repeat the same buyer decision. |

## Step 3 — Bounded candidate comparison and selection

| Candidate decision domain | Direct public-demand evidence acquired | Evidence feasibility for a truthful connected set | Decision usefulness for a five-person team with no administrator | Result |
|---|---|---|---|---|
| **Shared team account access / password manager** | UK DSIT and Home Office, *Cyber Security Breaches Survey 2025 to 2026* (published 2026-04-30): 43% of UK businesses reported a breach or attack in the last 12 months; 74% have a password policy but only 47% require two-factor authentication; micro-business 2FA use rose from 35% to 43%. NCSC publishes a dedicated *Password manager buyers guide*. Hacker News carries dated community selection questions ("Ask HN: Which Password Manager for Teams?", 2017-11-28; "Ask HN: Best password manager for teams?", 2018-12-28). | Strong: official statistics for the problem, a public authority buyers guide for the selection criteria, vendor primary documentation for one product family, and an explicit counter-signal (NCSC passkeys guidance). All four fit one non-affiliate decision. | High: the decision is about who can reach which account, what happens when someone leaves, and how to stop sharing a password spreadsheet — all consequences a five-person team carries without an administrator. | **Selected.** |
| CRM selection for a small professional-services team | No current, primary, population-level CRM adoption statistic could be resolved. The Eurostat CRM software series (`isoc_ib_crm`) returns `ERR_NOT_FOUND_4: ISOC_IB_CRM … is not available for dissemination`, so the natural official source is withdrawn. Vendor explainers (Salesforce, Pipedrive) are marketing pages and cannot establish that the question is being asked at population level. | Weak for demand at this budget. Capability documentation is obtainable, but the honest evidence state would be `insufficient` on the core adoption claim. | High consequence, but the risk of becoming a generic "best CRM" page is exactly why the 2026-09-02 run deferred it. | **Deferred again, honestly.** The absence of a retrievable official adoption statistic is a finding, not a licence to substitute a vendor claim. |
| Client portal / project-workspace selection | No comparably specific current primary demand evidence acquired. | Would need document-sharing, consent, permissions, and client-adoption evidence across several products. | High consequence, broader than this release needs. | **Rejected** for this slice, consistent with the 2026-09-02 disposition. |

The selection is a qualitative application of `D07-S-bb5e55f0f4bd`, not a fabricated ranking.

## Selected opportunity

### Normalised decision question

**Should a five-person business without a technical administrator move shared account access out of a password spreadsheet and into a managed team vault, and what must be true before it does?**

Deliberately non-affiliate. It starts with the shared-credential and account-recovery constraint, not a vendor, price, ranking, or referral destination.

### Structured intent and opportunity record

| Field | Record |
|---|---|
| Opportunity ID | `OPP-DELIVERY-2026-09-28-001` |
| Original question | No verbatim five-person buyer question was acquired in this bounded run. The Hacker News threads are community selection questions, not five-person-team questions. |
| Normalised question | The question above. |
| Persona/context | Owner or operations lead of a five-person business; no technical administrator; shared logins for banking, marketing, hosting, and supplier accounts. Team size is the requested scenario constraint, not a sourced segment. |
| Buyer state | Risk-aware buyer; internal champion; problem-aware and solution-uncertain. |
| Decision stage | Deciding whether to replace informal shared-credential handling with a governed team vault, and what controls must exist first. |
| Pain and desired outcome | Stop password reuse and spreadsheet sharing; keep access revocable when someone leaves; survive the loss of one person's memory or device. |
| Category | Team password manager / shared-credential governance. |
| Demand evidence | Official UK business population statistics for breach prevalence and control gaps; a public-authority buyers guide; dated community selection questions. No query volume and no five-person-specific rate. |
| Evidence readiness | Partial. Prevalence, control gaps, selection criteria, and one documented capability set are supportable. Product comparison, pricing, security outcomes, and South African jurisdictional fit are not. |
| Current site coverage | None (see Step 2). |
| Commercial relevance | High decision value; no affiliate relationship used or assumed. `automation_authority.publication.enabled` remains `false`. |
| Freshness | High. The survey series is annual; the NCSC passkeys position is newer than its password-administration collection, last reviewed 2018. |
| Duplication risk | Low for this primary intent. |
| Recommended action | Build one connected set at `team-shared-account-access-control`; keep every vendor-specific statement at its documented evidence state; disclose the UK evidence base and the passkeys counter-signal. |

## Intended production URLs and files (recorded before implementation)

| Route | Page |
|---|---|
| `https://vettedsaasblueprint.online/decision-hub/team-shared-account-access-control` | Decision Hub, 12 blocks |
| `https://vettedsaasblueprint.online/solution-hub/team-shared-account-access-control` | Solution Hub, 7 blocks |
| `https://vettedsaasblueprint.online/scenarios/team-shared-account-access-control` | Decision Scenario, 12 blocks, plus the printable decision report |

Content record: `src/content/decision-journeys/sets/team-shared-account-access-control.json` (new).
Evidence record: `docs/research/2026-09-28-team-access-control-evidence-ledger.json` (new).

Components reused unchanged, because `src/lib/decision-journey/sets.ts` and the existing routes are already data-driven over `src/content/decision-journeys/sets/`:

- `src/app/decision-hub/[setSlug]/page.tsx`, `src/app/solution-hub/[setSlug]/page.tsx`, `src/app/scenarios/[setSlug]/page.tsx`
- `src/components/public/DecisionJourneyPage.tsx`, `src/components/public/DecisionJourneyMotion.tsx`, `src/components/public/DecisionReport.tsx`, `src/components/public/PublicPageShell.tsx`
- `src/lib/decision-journey/sets.ts`, `presentation.ts`, `presentation-options.ts`
- `src/app/sitemap.ts`, `src/app/page.tsx` (both enumerate `listDecisionSets()`)

## Evidence gaps, contradictions, and handling

| Item | State | Handling |
|---|---|---|
| Exactly five-person adoption rate for team password managers | Missing. The survey reports micro, small, medium, and large bands, not team size. | Team size stays a scenario constraint only. No rate is attributed to a five-person business. |
| Direct public query volume | Missing. Community threads are dated signals, not counts. | No query volume is claimed. `D07-S-a52b46a6e024` applies: demand proves the question exists, not its answer. |
| Best product, plan, price, or outcome | Not researched. | No ranking, price, product test, or return-on-investment claim. Vendor documentation is used only for documented capability, labelled as vendor statements. |
| Apparent contradiction inside the authority's own advice | Real. The same publisher advises on password managers while separately stating that passkeys should be the default and that passwords are no longer resilient enough. Its password-administration collection was last reviewed 19 November 2018. | Represented in the conclusion rather than hidden, per `D08-S-7aa714d7198c`. The set frames a vault as a bridge for accounts that do not yet support passkeys, not as an endpoint. |
| Jurisdiction | Insufficient. Every acquired statistic and authority is UK-based; the operator is South African. | Disclosed on every page as a stated limitation, not silently generalised. |
| Independent testing of any vault | Absent. | No security guarantee, audit result, or breach-resistance claim. |

## Run disposition

**Go, with disclosed partial evidence.** The topic is selected because a current official population statistic establishes the problem and a named control gap, a public authority publishes selection criteria for this exact product class, one vendor family documents the collaboration capability the decision turns on, and a genuine counter-signal exists that the page can represent honestly. Under `planning.md` "Phase Two repository-local automation authority v2.1", a bounded decision set may release from partial evidence when it has attributable problem evidence, attributable capability evidence, a credible adoption signal, and a clearly labelled inference. It is not permission to state that any named product is secure, best, affordable, or compliant.
