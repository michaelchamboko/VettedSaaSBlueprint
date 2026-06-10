# 08 — UI Contract

## Single-Owner Control Plane

### Required Areas

- Dashboard overview.
- Product Vault.
- Affiliate Link Vault.
- Compliance profile/program rule review.
- Evidence ledger browser.
- Page draft review.
- Manual approval queue.
- Job queue monitor.
- Optimization recommendations.
- Audit log.
- PartnerStack program/resource intake with text fields, file upload, link entry, and analysis status.
- Offer Intelligence Folder view linking affiliate URL, resources, rules, research, evidence, destination review, and page drafts.
- Purchase destination review panel showing message match, visual affinity, trust continuity, friction, and compliance warnings.

### Owner UI Rules

- Must show compliance state before publish actions.
- Must distinguish draft, review, approved, published, paused, noindex, and archived states.
- Must expose evidence links for high-risk claims.
- Must never hide affiliate disclosure state.
- Must make manual review reasons visible.
- Must not include team, tenant, seat, billing, or public user account surfaces.
- Must allow owner to upload or reference PartnerStack PDFs, images/screenshots, links, and video resources.
- Must show extracted program rules and require owner review before they become enforceable.
- Must show the affiliate purchase destination review before landing-page approval.
- Must help landing pages feel continuous with the purchase destination without copying protected vendor design or assets.

## Public Landing Page

### Page Type

Only direct-review landing pages are in MVP 1.

### Required Sections

- Hero with clear value statement.
- Affiliate disclosure before/near first CTA.
- Problem/solution block.
- Benefits with source references.
- Proof blocks where evidence allows.
- How it works.
- Honest limitations/caveats.
- Objection handling.
- CTA blocks.
- FAQ.

### Mobile Requirements

- First CTA visible without excessive scrolling.
- Disclosure visible before or near first CTA.
- Tap targets are thumb-safe.
- Sticky CTA does not obscure disclosure or content.
- Copy is concise and scannable.

## Rendering Boundary

- Components are fixed in code.
- Page content comes from validated structured JSON.
- Runtime page generation must not create unreviewed React, CSS, or layout code.
- AI may help create React/CSS for reviewed component development during Step 2.
- Published pages must render through approved version-controlled components.
- AI-generated testimonials, fake screenshots, and unsupported ratings are prohibited.

## Design Variant Contract

Structured page JSON may select approved variants such as:

- `design_variant`
- `hero_variant`
- `proof_variant`
- `benefit_layout`
- `limitation_layout`
- `faq_interaction`
- `motion_profile`
- `sticky_cta`

Templates may include scroll reveals, section transitions, accordions, counters, sticky CTA behavior, lightweight parallax, and CTA micro-interactions when they are reviewed, performant, mobile-safe, and accessible.

## Step 2 Design Follow-Ups

- Final brand visual identity.
- Owner login/session UX.
- Future consent banner behavior only if tracking expands beyond approved MVP model.
