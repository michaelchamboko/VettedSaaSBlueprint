# 02 — Build Brief

## What Will Be Built

A deployment-first MVP blueprint for the Controlled Affiliate Intelligence Loop as a single-operator personal marketing tool:

1. **Vercel control plane**: Next.js App Router app with admin dashboard shell, Product Vault, Affiliate Link Vault, approval queue, Hermes APIs, tracking APIs, ISR revalidation, and public landing pages.
2. **Oracle database layer**: Oracle Autonomous Database schema for products, affiliate links, compliance profiles, program rules, jobs, crawl runs, research sources, evidence claims, page blueprints, page versions, dynamic pages, conversion events, metrics, recommendations, and audit logs.
3. **Oracle Hermes worker**: Long-running worker that claims jobs, runs scheduled research cycles, executes Scrapling crawls, applies budget guards, creates evidence, scores compliance, and generates optimization recommendations.
4. **Structured page generation boundary**: AI may generate only validated page JSON matching the direct-review contract.
5. **Fixed landing renderer**: Controlled mobile-first components render approved structured JSON and enforce disclosure placement.
6. **Compliance operating system**: Default-deny publication gate, manual review tasks, claim risk classes, PartnerStack link rules, and audit logging.
7. **Tracking and optimization loop**: Minimal first-party event capture and daily recommendations from Hermes.
8. **Manual PartnerStack resource intake**: Owner can upload or reference PartnerStack program rules/resources as text, PDFs, images/screenshots, links, and video references. Hermes analyzes these resources to extract compliance rules and review tasks.

## What Will Not Be Built in MVP 1

- Fully autonomous first publication.
- Page types beyond direct review.
- Paid ad generation, coupon/deal pages, or brand bidding support.
- Self-referral signup or purchase tests.
- Third-party tracking pixels by default.
- Aggressive scraping bypass or stealth/proxy defaults.
- PartnerStack API integration or automation.
- Public user accounts, teams, tenants, seats, workspaces, subscriptions, or account billing.

## Deployment Assumptions

- `package.json` defines dependencies for Vercel build only.
- Oracle Autonomous Database owns schema execution and durable data.
- Oracle owns Hermes/Scrapling installation and long-running execution.
- Local workstation setup is optional and not the runtime.

## Acceptance Criteria

- [ ] Build pack contains PRD summary, review checklist, build brief, architecture map, contracts, task graph, test plan, rollback plan, pre-ship checklist, and definition of done.
- [ ] Contracts explicitly separate Vercel app responsibilities from Oracle database and Oracle worker responsibilities.
- [ ] No Step 2 implementation begins before human approval.
- [ ] Task cards are independently executable and scoped to low-risk changes.
- [ ] Test plan includes localized task validation and full pre-ship validation.
