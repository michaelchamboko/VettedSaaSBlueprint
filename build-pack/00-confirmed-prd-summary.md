# 00 — Confirmed PRD Summary

**Product**: Controlled Affiliate Intelligence Loop  
**Source PRD**: `docs/VetterSaaSBlueprint_PRD.md`  
**Protocol**: GlobalSetup PRD-to-Blueprint / post-PRD Step 1  
**Status**: Planning initiated; pending human approval before Step 2 implementation.

## Product Objective

Build a compliance-first affiliate research, evidence, publishing, tracking, and optimization operating system for SaaS and digital product affiliate offers.

This is a single-operator personal marketing tool. The only authenticated human user is the owner/operator. Public visitors are anonymous landing-page visitors, not application users.

The product must prove the controlled loop:

```text
Product + affiliate link
  -> Hermes/Scrapling research
  -> Evidence ledger
  -> Structured direct review page draft
  -> Quality/compliance gate
  -> Manual approval
  -> Mobile-first published landing page
  -> Tracking
  -> 3-hour research refresh + daily optimization recommendations
```

## Non-Negotiable Principles

- Quality before quantity.
- Hermes is active from MVP 1.
- Scrapling is required for Oracle-side research.
- AI generates structured JSON only, never React/CSS/layout code.
- Important claims must be evidence-backed.
- Compliance defaults to deny when uncertain.
- First publication and high-risk changes require manual approval.
- Public landing pages must be mobile-first.
- Single-operator scope: do not build teams, seats, tenants, account billing, public signup, or multi-user SaaS features.

## MVP Included

- Next.js App Router app hosted on Vercel.
- Oracle Autonomous Database system of record.
- Oracle Hermes worker.
- Product Vault and Affiliate Link Vault.
- Oracle database-backed job queue.
- Scrapling crawl run storage and research source store.
- Evidence ledger and evidence graph representation in Oracle relational tables plus Oracle JSON columns.
- Direct review landing page JSON contract.
- Fixed mobile-first landing renderer.
- Affiliate disclosure enforcement.
- Quality/compliance gate and manual approval queue.
- ISR publishing/revalidation.
- Basic tracking events.
- Daily optimization recommendation queue.
- Budget guardrails.

## MVP Excluded

- Fully automated first publication.
- Large-scale page batching.
- Versus, alternatives, geo-intent, use-case, and pricing-intent page types.
- Advanced A/B testing.
- Full PartnerStack API/webhook automation.
- Paid ad workflows.
- Aggressive scraping bypass workflows.
- Multi-language generation.
- Complex image generation.
