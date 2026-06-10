# 03 — Implementation Contract

## Contract Principle

Implementation must follow the PRD's controlled automation boundary: runtime AI creates structured data, approved version-controlled code renders pages, and compliance gates block unsafe publication.

Implementation must also follow the approved user model: this is a one-owner personal marketing system, not a public SaaS application.

## Phase Boundary

This build pack is Step 1 only. The following are allowed now:

- Documentation.
- Architecture maps.
- Interface contracts.
- Task graph and task cards.
- Test planning.
- Risk and rollback planning.

The following require explicit operator approval before Step 2:

- Production code edits.
- Schema application to Oracle Autonomous Database.
- Vercel deployment.
- Oracle worker installation.
- External API credential configuration.

## Runtime Ownership

- Vercel owns Next.js build/runtime dependencies.
- Oracle Autonomous Database owns database execution.
- Oracle owns Hermes/Scrapling runtime dependencies.
- Local workstation is not a required runtime.

## Quality Rules

- Claims must be traceable to evidence records.
- High-risk claims require claim-level evidence and manual approval.
- Affiliate disclosure must appear before or near the first CTA.
- PartnerStack referral URLs must remain original and unstripped.
- Unknown compliance state blocks publication.
- Tracking must remain minimal and consent-aware.
- Do not implement public signup, user management, teams, tenant isolation, SaaS billing, role hierarchies, or seat-based permissions unless the operator later changes product direction.
- AI-generated React/CSS is allowed during reviewed application development, but not as unreviewed per-page runtime generation.
- Landing page variety must come from approved component variants, design profiles, and motion profiles selected by structured page JSON.
- Motion patterns must preserve disclosure visibility, mobile usability, performance, and `prefers-reduced-motion`.
- Scrapling runs only in an Oracle-hosted Python runner/container controlled by Hermes.
- Vercel must not run crawler workloads.
- MVP crawl policy is public, permitted, rate-limited sources only; stealth/proxy bypass requires future explicit operator approval.
- Hermes/MiniMax is already configured in the operator's Oracle instance; implementation should integrate with the existing environment.
- PartnerStack program data is manually entered or uploaded in MVP, then analyzed into structured compliance rules before use.
- PartnerStack API integration is out of scope for MVP.
- Owner auth is custom and owner-only for MVP. Do not add public signup, third-party identity providers, roles, teams, or tenant abstractions.
- Hermes machine auth remains separate through `HERMES_API_TOKEN`.
- MVP tracking is minimal first-party only: page view, CTA click, affiliate click, link error, and FAQ expand.
- Do not add third-party pixels, fingerprinting, raw IP storage, remarketing, newsletter capture, or profiling in MVP.
- Do not add a cookie banner unless tracking expands beyond the approved minimal first-party model.

## Implementation Sequencing

1. Documentation and contracts.
2. Schema/migration setup.
3. Database access layer.
4. Admin CRUD and compliance profile workflows.
5. Hermes job queue APIs.
6. Oracle worker scheduler and budget guard.
7. Scrapling crawl persistence.
8. Evidence ledger.
9. Page JSON validation and landing renderer.
10. Approval/publishing workflow.
11. Tracking and recommendations.
12. Review, test, deploy.
