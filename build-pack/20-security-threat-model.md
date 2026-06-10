# Repository Threat Model — VettedSaaSBlueprint

## Scope

This threat model covers the Controlled Affiliate Intelligence Loop repository and its planned deployment surfaces:

- Vercel-hosted Next.js application and public landing pages.
- Oracle Autonomous Database as system of record.
- Existing Oracle Hermes/MiniMax worker environment on the operator's Oracle instance.
- Oracle-hosted Python Scrapling runner/container controlled by Hermes.
- Manual PartnerStack resource intake, file uploads, purchase destination review, and affiliate redirects.

## Primary Assets

- Oracle Always Free infrastructure posture and billing safety.
- Existing Hermes installation under `/michael-core` block volume.
- Oracle database data: products, affiliate links, resources, rules, evidence, page drafts, events, audit logs.
- Affiliate URLs and PartnerStack attribution integrity.
- MiniMax/API credentials and Hermes secrets.
- Owner-only admin session and password hash.
- Uploaded PartnerStack PDFs/images/videos/links and extracted rules.
- Public visitor trust, disclosure compliance, and minimal tracking guarantees.

## Trust Boundaries

- Public visitors to Vercel landing pages are untrusted.
- Owner/admin routes are trusted only after owner-only auth.
- Hermes API calls are trusted only with valid `HERMES_API_TOKEN`.
- Uploaded files and links are untrusted until analyzed and approved.
- Scraped web content is untrusted and must not become claims without evidence/compliance checks.
- Oracle infrastructure is protected production-like infrastructure, not a disposable sandbox.
- Existing Hermes block-volume files are protected and must not be overwritten.

## Attacker-Controlled Inputs

- Public tracking requests.
- Affiliate redirect query parameters.
- Admin login attempts.
- Uploaded PDFs/images/videos if an attacker obtains owner access or if future upload surfaces are exposed.
- External web pages crawled by Scrapling.
- Redirect chains from affiliate URLs.
- Referrer and user-agent headers.

## Security Invariants

- Never change Oracle instance away from Always Free settings without explicit separate operator approval.
- Do not expose new public Oracle-hosted services by default.
- Do not store secrets in the repo.
- Do not print secrets, keys, wallet material, or raw environment variables.
- Do not replace original PartnerStack affiliate URLs with final redirected URLs.
- Do not publish pages without disclosure, evidence, owner approval, and destination review or override.
- Do not store raw IP addresses for MVP tracking.
- Do not add third-party pixels, fingerprinting, or cookie tracking in MVP.
- Do not run crawler workloads on Vercel.
- Do not modify existing Hermes runtime files without explicit approval.

## Key Failure Modes

- Oracle billing/configuration drift from Always Free posture.
- Compromise through public SSH, leaked SSH keys, leaked Hermes/MiniMax tokens, or exposed admin routes.
- Unsafe file upload handling leading to malware storage, parser exploitation, or data exfiltration.
- SSRF or unsafe crawling through uploaded links or affiliate redirects.
- Affiliate attribution breakage by replacing original referral links.
- Compliance failure from unsupported claims, missing disclosure, or copied vendor assets.
- Public exposure of internal Hermes dashboards/workspaces or Oracle services.
- Tracking scope creep into privacy-invasive behavior.
- Runtime AI producing unreviewed page code or unsupported claims.

## Review Priorities

1. Authentication, session handling, and Hermes bearer-token validation.
2. Oracle change boundaries and deployment scripts.
3. File upload validation, storage, and analysis isolation.
4. Affiliate redirect and purchase destination review safety.
5. Compliance gate and evidence linkage.
6. Public tracking minimization.
7. Crawler source policy and SSRF controls.
8. Secret management and logging redaction.
