# 02 — UI/UX Build Plan

## Purpose

Define the MVP user experience for the Controlled Affiliate Intelligence Loop before UI implementation starts. This plan expands `build-pack/08-ui-contract.md` into screen-level workflows, UX rules, validation gates, and task ownership.

## Product UX Posture

This is a single-owner operational tool, not a public SaaS dashboard. The UI should feel:

- Quiet and work-focused.
- Dense but organized.
- Fast to scan.
- Compliance-forward.
- Built for repeated owner review tasks.
- Mobile-safe for public landing pages.

Avoid marketing-dashboard theatrics, oversized decorative cards, generic AI gradients, and public SaaS account-management patterns.

## Primary User Groups

| User | Need | UI Implication |
| --- | --- | --- |
| Owner/operator | Add offers, review evidence, approve pages, monitor jobs | Efficient admin workflows with clear review states and audit trails |
| Public visitor | Understand the offer and click through with disclosure clarity | Mobile-first landing page with disclosure before/near first CTA |
| Hermes worker | Machine API consumer, not a UI user | Status visible through job monitor only |

## Owner Control Plane Information Architecture

### 1. Dashboard Overview

Purpose: show operational state at a glance.

Must show:

- Products needing review.
- Jobs running/stale/failed.
- Draft pages waiting for approval.
- Offers missing destination review.
- Compliance blockers.
- Recent tracking/optimization signals.

UX rules:

- Use compact status tables and summary strips.
- Make blocked states visually distinct from merely pending states.
- Prioritize action queues over vanity metrics.

### 2. Product Vault

Purpose: manage product records and research inputs.

Must support:

- Product create/edit.
- Status lifecycle: draft, active, researching, paused, archived.
- Audience, pricing, commission, keywords, competitors, target countries.
- Link to offer folder and page drafts.

UX rules:

- Use forms with grouped fieldsets, not long unstructured pages.
- Show compliance/profile status before publish-related actions.
- Avoid team, billing, tenant, or public-user concepts.

### 3. Affiliate Link Vault

Purpose: preserve original PartnerStack URLs and link state.

Must support:

- Original PartnerStack URL entry.
- Link type, geo target, page angle, UTM/subid metadata.
- Link status and last check.
- Audit/review prompts for link changes.

UX rules:

- Never visually encourage replacing the original affiliate URL with the final redirect URL.
- Show "original referral URL preserved" state.
- Make disabled/manual-review links obvious.

### 4. Offer Intelligence Folder

Purpose: organize all knowledge for one affiliate offer.

Must show:

- Product.
- Primary affiliate link.
- Program resources.
- Extracted rules.
- Research sources.
- Evidence claims.
- Purchase destination review.
- Page drafts and published state.

UX rules:

- This should be the owner’s central workspace for an offer.
- Use tabs or a left-side section nav for Resources, Rules, Evidence, Destination, Drafts, Jobs, Audit.
- Each tab must show review state and blockers.

### 5. PartnerStack Program Resource Intake

Purpose: manually add program rules and reference material.

Must support:

- Text notes.
- PDF/image/video reference metadata.
- Source links.
- Analysis status.
- Draft extracted rules requiring owner approval.

UX rules:

- Treat uploads/links as untrusted until reviewed.
- Separate "extracted draft rule" from "approved enforceable rule."
- Show source/resource lineage for every extracted rule.

### 6. Purchase Destination Review

Purpose: preserve conversion continuity without copying vendor design.

Must show:

- Affiliate URL checked.
- Redirect chain metadata for audit only.
- Final visible URL for review only.
- Message match cues.
- CTA language.
- Offer promise.
- Pricing/trial/guarantee claims.
- Trust cues.
- Friction notes.
- Visual affinity profile.
- Compliance warnings.
- Current/expired review state.

UX rules:

- Destination review must be visible before first-page approval.
- Owner override must be explicit and audited.
- Do not suggest replacing the original affiliate URL with the final destination.

### 7. Compliance and Manual Review Queue

Purpose: block unsafe publication and make reasons actionable.

Must show:

- Review reason.
- Entity type and entity link.
- Risk level.
- Supporting context.
- Status: open, resolved, rejected, overridden.
- Required owner action.

UX rules:

- Unknown compliance state defaults to blocked.
- High-risk claims need claim-level evidence and approval.
- Publishing controls must show the blocker list before allowing approval.

### 8. Evidence Ledger Browser

Purpose: let the owner inspect claim support.

Must show:

- Claim text.
- Claim type and risk level.
- Source link/title.
- Confidence score.
- Usage allowed state.
- Evidence/source relationship.

UX rules:

- Make unsupported or disallowed evidence visually clear.
- Evidence references must be easy to open from page draft review.

### 9. Page Draft Review

Purpose: review structured page JSON and approve/publish.

Must show:

- Page sections rendered in preview.
- Disclosure placement.
- Evidence score.
- Compliance result.
- Destination continuity notes.
- Limitations/caveats.
- High-risk claims and evidence links.
- Publish/noindex/pause controls.

UX rules:

- Disclosure state must never be hidden behind a collapsed panel.
- First publication requires manual approval.
- Owner should see exactly why a draft cannot publish.

### 10. Job Queue Monitor

Purpose: observe Hermes work without becoming a worker UI.

Must show:

- Job type.
- Status.
- Priority.
- Locked by/locked at.
- Retry count.
- Error message.
- Created/started/completed timestamps.

UX rules:

- Stale locks and failed jobs must stand out.
- Machine auth details must never be displayed.

### 11. Optimization Recommendations

Purpose: review low-risk and high-risk improvement suggestions.

Must show:

- Recommendation type.
- Summary.
- Risk level.
- Proposed change.
- Supporting metrics/evidence.
- Approve/reject action.

UX rules:

- Low-risk auto-update remains default-deny unless explicitly enabled.
- High-risk recommendations require manual review.

### 12. Audit Log

Purpose: trace owner, Hermes, compliance, link, and publish actions.

Must show:

- Actor type.
- Action.
- Entity.
- Before/after summary.
- Reason.
- Timestamp.

UX rules:

- Use compact filters and searchable tables.
- Do not expose secrets or raw environment variables.

## Public Landing Page UX

### Page Type

MVP includes only direct-review landing pages.

### Required Sections

- Hero with clear value statement.
- Affiliate disclosure before or near first CTA.
- Problem/solution block.
- Benefits with source references.
- Proof blocks where evidence allows.
- How it works.
- Honest limitations/caveats.
- Objection handling.
- CTA blocks.
- FAQ.

### Conversion Continuity Rules

Landing pages should align with the purchase destination through:

- Message match.
- Information scent.
- Visual congruence.
- Expectation alignment.
- Trust transfer.

They must not:

- Copy protected vendor design/assets.
- Hide affiliate disclosure.
- Invent testimonials, ratings, or proof.
- Generate unreviewed React/CSS at runtime.

### Mobile UX Rules

- First CTA visible without excessive scrolling.
- Disclosure visible before or near first CTA.
- Tap targets are thumb-safe.
- Sticky CTA must not obscure disclosure or content.
- Copy is concise and scannable.
- Motion must respect `prefers-reduced-motion`.

## Visual System Direction

### Owner Admin UI

Direction: controlled operations console.

- Tight typography hierarchy.
- Compact tables.
- Clear badges for states and risk.
- Forms grouped by decision context.
- Side navigation or top-level tabs for repeated workflows.
- Minimal decoration.
- Strong color semantics: blocked, warning, approved, draft, running, failed.
- Avoid consumer SaaS marketing visuals.

### Public Landing UI

Direction: controlled direct-review page system.

- Fixed version-controlled components.
- Structured JSON selects approved variants.
- Motion-aware but restrained.
- Disclosure always prominent.
- Design variants may adapt to offer category and destination affinity.
- Visual variety comes from approved component and motion profiles, not generated code.

## State Language

Use consistent labels:

- Draft.
- In review.
- Approved.
- Published.
- Paused.
- Noindex.
- Archived.
- Blocked.
- Manual review.
- Running.
- Failed.
- Stale.

Avoid vague labels like "ready" without explaining which gate is ready.

## Accessibility and Trust Requirements

- Semantic headings.
- Keyboard-accessible controls.
- Visible focus states.
- Error text tied to form fields.
- Sufficient contrast.
- Reduced-motion support.
- Disclosure readable on mobile.
- No manipulative dark patterns.

## Validation Location

UI/UX validation is deployment-first:

- Source changes: GitHub branch/PR review.
- Hosted app build/render: Vercel preview/production checks.
- Public page visual review: Vercel URL or preview deployment.
- Data-backed flows: Oracle runtime after explicit approval.
- No local app install/build/typecheck unless explicitly approved.

## Task Mapping

| UX Area | Module | Task Cards |
| --- | --- | --- |
| Dashboard and admin shell | M03 | T04, T05, T06 |
| Product and affiliate link workflows | M03 | T05 |
| Compliance/manual review workflows | M03 | T06 |
| Offer Intelligence Folder | M04 | T06A |
| Program resource intake | M04 | T06B |
| Destination review | M04 | T06C |
| Job monitor | M05 | T07 |
| Evidence ledger | M05 | T08 |
| Page draft review and publish | M06 | T09 |
| Public landing renderer | M06 | T09 |
| Tracking and optimization recommendations | M06 | T10 |

## Open UX Decisions

- Final brand identity for owner admin and public page variants.
- Owner login/session screen details.
- Exact admin navigation layout after auth is implemented.
- Whether consent UI is needed in future if tracking expands beyond approved MVP model.

