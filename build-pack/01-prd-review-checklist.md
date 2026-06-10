# 01 — PRD Review Checklist

**Source**: `docs/VetterSaaSBlueprint_PRD.md`  
**Review Status**: Actionable for Step 1 blueprinting; several implementation decisions require operator approval before Step 2.

## Completeness Review

- [x] Product objective is explicit.
- [x] MVP scope and exclusions are explicit.
- [x] Deployment split is explicit: Vercel app, Oracle Autonomous Database, Oracle Hermes worker.
- [x] Core data entities are listed.
- [x] API route families are listed.
- [x] Page JSON contract is provided.
- [x] Compliance requirements are detailed.
- [x] Tracking requirements are scoped to minimal first-party events.
- [x] Success metrics are documented.
- [x] Key risks and mitigations are documented.

## Resolved Decisions

1. **Database platform**: Approved 2026-06-10. Use Oracle Autonomous Database, preferably Always Free Autonomous Transaction Processing / Autonomous AI Database for MVP. Oracle owns durable data. Neon is not part of the approved MVP architecture.
2. **Product user model**: Approved 2026-06-10. This is a single-operator personal marketing tool, not a public SaaS product. Only the owner/operator authenticates. Public visitors are anonymous landing-page visitors.
3. **AI provider boundary**: Approved 2026-06-10. Use MiniMax from the Oracle Hermes worker only. AI calls are budget-gated by cheap checks and Scrapling extraction. AI may generate reviewed React/CSS during application development, but runtime page generation must use approved, version-controlled components and structured JSON.
4. **Landing page variety model**: Approved 2026-06-10. Use a controlled, motion-aware component library with design variants, interaction variants, and animation profiles. Templates may include tasteful scroll movement, reveals, sticky CTA behavior, accordions, counters, and section transitions while respecting mobile performance, disclosure visibility, and `prefers-reduced-motion`.
5. **Scrapling runtime shape**: Approved 2026-06-10. Run Scrapling as an Oracle-hosted Python runner/container controlled by Hermes. Vercel must not run crawlers. MVP crawls use public, permitted, rate-limited sources only; aggressive stealth/proxy bypass is excluded by default.
6. **Existing Hermes environment**: Confirmed 2026-06-10. Hermes already exists in the operator's Oracle instance and is already configured with MiniMax. Step 2 should integrate with the existing Hermes/MiniMax setup rather than provisioning a new one.
7. **PartnerStack MVP scope**: Approved 2026-06-10. Use manual PartnerStack program/link/resource entry for MVP. Ignore PartnerStack API integration for MVP. Manual intake must support text fields, PDFs, images/screenshots, links, and video references/uploads where practical.
8. **Program-resource analysis**: Approved 2026-06-10. Uploaded PartnerStack rules/resources must be stored in Oracle and analyzed by Hermes/MiniMax where needed to extract restrictions, disclosures, allowed channels, link rules, brand/coupon/paid-ad rules, and manual review tasks.
9. **Offer intelligence folder**: Approved 2026-06-10. Oracle must link the affiliate URL, uploaded resources, extracted rules, affiliate research, evidence, and purchase destination review under a single offer folder concept.
10. **Purchase destination review / conversion continuity**: Approved 2026-06-10. Before publishing, the affiliate destination page should be reviewed so the landing page can preserve message match, information scent, visual congruence, trust continuity, and expectation alignment without copying protected vendor design or hiding affiliate disclosure.
11. **Owner authentication**: Approved 2026-06-10. Use custom owner-only auth for MVP: one owner login, no public signup, no teams/roles, strong password hash, secure HTTP-only signed session cookie, optional Oracle session/audit records, and separate `HERMES_API_TOKEN` for Hermes.
12. **Consent and tracking model**: Approved 2026-06-10. Use minimal first-party tracking for MVP: page view, CTA click, affiliate click, link error, and FAQ expand. No third-party pixels, no fingerprinting, no raw IP storage, and no cookie banner unless tracking expands to cookies, remarketing, newsletter capture, profiling, or third-party analytics.

## Ambiguities Requiring Human Decision

None remaining for Step 1 review.

## Planning Gate

Step 1 review decisions are resolved. Proceed to final build-pack review and operator approval before Step 2 implementation begins.
