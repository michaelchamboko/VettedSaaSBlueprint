# Product Requirements Document

## Product

**Controlled Affiliate Intelligence Loop**

## Project Summary

Build a compliance-first affiliate intelligence, research, publishing, and optimization engine for SaaS and digital product affiliate offers.

The product uses a Next.js application on Vercel as the public and administrative control plane, and a 24/7 Hermes worker on Oracle infrastructure as the intelligence plane. Hermes runs recurring research cycles, uses Scrapling for deep source discovery, builds an evidence ledger, creates structured page drafts, scores compliance risk, and recommends improvements based on live performance data.

The product must not behave as a blind mass-page generator. Every published page must have a clear search intent, a clear user problem, a valid affiliate link, visible affiliate disclosure, evidence-backed claims, mobile-first conversion design, and a defensible reason to exist.

---

## 1. Product Objective

Create a controlled affiliate operating system that helps the operator:

- Manage SaaS and digital affiliate products.
- Store and monitor affiliate links.
- Run recurring Hermes research on product demand, pain points, complaints, pricing concerns, competitors, and search intent.
- Generate structured, evidence-backed direct review landing pages.
- Publish pages through fixed Next.js components rather than AI-generated code.
- Track page views, CTA clicks, affiliate clicks, and engagement.
- Let Hermes recommend low-risk improvements and new opportunities.
- Prevent thin, repetitive, deceptive, or unsupported affiliate content from being published.

MVP 1 must prove a complete controlled loop:

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

---

## 2. Strategic Positioning

The product is an **affiliate research lab and publishing engine**, not a generic blog generator.

Its core value is not producing more pages. Its core value is producing affiliate landing pages that are:

- Research-backed.
- Compliance-aware.
- Conversion-focused.
- Mobile-first.
- Continuously improved.
- Auditable through source and evidence records.

---

## 3. Non-Negotiable Product Principles

### 3.1 Quality Before Quantity

The system may eventually support many pages, but MVP 1 must optimize for trustworthy publishing. Every page must pass quality, originality, evidence, SEO safety, and compliance checks before first publication.

### 3.2 Hermes Active From MVP 1

Hermes is not a future placeholder. Hermes must work from MVP 1 as the active Oracle-side research and optimization worker.

### 3.3 Scrapling Required For Research

Hermes must use `D4Vinci/Scrapling` as the required web research framework for deep source gathering, product documentation checks, pricing checks, competitor scans, and pain-point discovery.

### 3.4 Code-First Rendering

AI must not generate React code, CSS, or page layouts. AI may generate structured JSON only. Fixed Next.js components render approved content into controlled mobile-first layouts.

### 3.5 Evidence-Backed Claims

Important claims must be traceable to source records and evidence records. High-risk claims require claim-level evidence. Lower-risk synthesis may use page-level evidence.

### 3.6 Compliance By Design

Every public page must include a visible affiliate disclosure before or near the first affiliate CTA. The product must block fake testimonials, invented usage claims, deceptive urgency, fabricated ratings, unsupported rankings, and unsupported pricing claims.

### 3.7 Controlled Automation

The product should automate research and low-risk improvements as much as possible, but first publication and high-risk changes require manual approval.

### 3.8 Mobile-First Landing Pages

All landing pages must be designed, rendered, and tested for mobile first. Desktop is a progressive enhancement, not the primary design target.

---

## 4. System Architecture

```text
[Vercel / Next.js App]
  - Admin dashboard
  - Product vault UI
  - Affiliate link vault UI
  - Approval queue
  - Public landing pages
  - Tracking APIs
  - ISR revalidation APIs
      |
      v
[Oracle Postgres]
  - Products
  - Affiliate links
  - Jobs
  - Research sources
  - Evidence ledger
  - Page blueprints
  - Page versions
  - Analytics events
  - Optimization recommendations
      |
      v
[Oracle Hermes Worker]
  - 24/7 daemon
  - 3-hour research scheduler
  - Scrapling crawlers
  - Evidence extraction
  - Budget guard
  - MiniMax calls when needed
  - Quality/compliance scoring
  - Daily optimization loop
      |
      v
[Next.js Dynamic Page Engine]
  - Fixed mobile-first components
  - Structured JSON rendering
  - Affiliate disclosure enforcement
  - Tracking links
  - ISR publishing
```

### Platform Responsibilities

**Vercel**

- Host the Next.js app.
- Render public landing pages.
- Serve admin dashboard.
- Receive tracking events.
- Trigger ISR revalidation.
- Expose authenticated APIs for Hermes and admin actions.

**Oracle**

- Run Hermes continuously.
- Run the 3-hour research scheduler.
- Run Scrapling crawls and source refreshes.
- Store durable job state in Postgres.
- Run long-running research, scoring, and optimization work outside Vercel runtime limits.

**Oracle Postgres**

- Serve as the system of record.
- Store jobs, products, links, sources, evidence, page versions, metrics, and recommendations.
- Serve as the MVP job queue before adding external queue infrastructure.

---

## 5. MVP Scope

MVP 1 is the **Controlled Affiliate Intelligence Loop**.

### Included

- Next.js App Router application.
- Tailwind CSS.
- TypeScript.
- Admin dashboard shell.
- Product Vault.
- Affiliate Link Vault.
- Oracle Postgres schema.
- Postgres-backed job queue.
- Hermes Oracle worker integration.
- Oracle-side 3-hour research scheduler.
- Scrapling-based research jobs.
- Research source store.
- Compliance evidence ledger.
- Evidence graph for research context reuse.
- One page type: direct review landing page.
- Structured page JSON contract.
- Fixed mobile-first landing page renderer.
- Affiliate disclosure component.
- PartnerStack compliance and tracking rules.
- Compliance operating system.
- Quality and compliance gate.
- Manual approval queue.
- Low-risk auto-approval lane.
- Dynamic route rendering.
- ISR publishing and revalidation.
- Basic tracking: page view, CTA click, affiliate click, link error.
- Daily optimization recommendation queue.
- Credit and crawl budget guardrails.

### Excluded From MVP 1

- Fully automated first publication.
- Large-scale page batching.
- Versus pages.
- Alternatives pages.
- Geo-intent pages.
- Use-case pages.
- Advanced A/B testing.
- Full PartnerStack API automation.
- PartnerStack webhook automation.
- CRM/email provider integrations.
- Complex image generation.
- Multi-language generation.
- Fully autonomous page retirement.
- Auto-generated product screenshots.
- Paid ad integration and paid acquisition workflows.
- Aggressive scraping bypass workflows.

---

## 6. Hermes Research Scheduler

### Purpose

Hermes must continuously improve product intelligence without wasting AI credits or creating unnecessary crawl load.

### Schedule

Hermes runs three categories of work:

```text
Every 3 hours:
- Light research refresh
- Source change detection
- Affiliate link health checks
- Pricing/doc page checks
- Pain-point source sampling
- Evidence updates when changed
- Low-risk optimization tasks

Daily:
- Page performance analysis
- CTA and engagement review
- Recommendation generation
- Weak page detection
- Source freshness review

Weekly or manual:
- Full deep research pass
- Competitor refresh
- New intent cluster discovery
- Broader pain-point crawl
```

### Job Types

```text
RESEARCH_REFRESH_CYCLE
PRODUCT_DEEP_RESEARCH
SOURCE_REFRESH
PAIN_POINT_DISCOVERY
COMPETITOR_SCAN
PRICING_REFRESH
AFFILIATE_LINK_CHECK
PAGE_DRAFT_GENERATION
QUALITY_COMPLIANCE_SCORE
DAILY_OPTIMIZATION_REVIEW
LOW_RISK_AUTO_UPDATE
```

### Job Locking

Hermes must claim jobs with database-level locks so duplicate research cycles do not overlap.

Rules:

- A product cannot have two active deep research jobs at once.
- A source cannot be crawled concurrently by multiple jobs.
- A failed job must record error details and retry count.
- Retry behavior must use exponential backoff.
- Stale locked jobs must be recoverable.

---

## 7. Budget Guard

### Purpose

The product must avoid wasting MiniMax or other AI credits by using cheap change detection before expensive summarization or generation.

### Required Budget Sequence

Hermes must process research in this order:

```text
1. Cheap checks
   - URL status
   - ETag
   - Last-Modified
   - Content hash
   - Title hash
   - Pricing block hash
   - Important DOM region hash

2. Scrapling extraction
   - Only when source changed, is stale, or is high priority.

3. Local clustering / graph lookup
   - Reuse existing evidence graph and prior findings.

4. AI summarization
   - Only when extracted findings changed materially.

5. Page draft regeneration
   - Only when changes affect a page or opportunity.
```

### Budget Controls

Each research cycle must support:

- Maximum products per cycle.
- Maximum sources per product.
- Maximum crawl depth.
- Maximum AI calls.
- Maximum AI spend estimate.
- Maximum runtime.
- Per-source refresh TTL.
- Per-product priority.
- Per-page importance score.

### Priority Order

Hermes should spend work budget in this order:

1. Published pages with active traffic or affiliate clicks.
2. Products with stale or changed evidence.
3. Products with broken or suspicious affiliate links.
4. Products with pending page drafts.
5. New product opportunities.
6. Low-priority exploratory research.

---

## 8. Scrapling Research Engine

### Purpose

Hermes uses Scrapling to gather public source data and extract structured findings.

### Supported Source Types

- Product website.
- Product documentation.
- Pricing page.
- Public changelog.
- Help center.
- PartnerStack campaign page where accessible.
- Competitor website.
- Public comparison page.
- Review platform where permitted.
- Forum discussion where permitted.
- Reddit or community data via approved access methods.
- Manual operator-provided source.

### Crawl Policy

Each Scrapling job must store:

- Target URL.
- Source type.
- Fetcher mode.
- Robots setting.
- Rate limit.
- Crawl depth.
- User agent policy.
- Extraction strategy.
- Started timestamp.
- Completed timestamp.
- Status.
- Error details if failed.

### MVP Scraping Boundary

MVP 1 should prefer public, permitted, rate-limited research. Stealth, proxy, or anti-bot capabilities must not be the default path. If used later, they require explicit operator-approved source policies.

---

## 9. Evidence Ledger

### Purpose

The evidence ledger prevents unsupported, thin, or deceptive affiliate content.

### Evidence Model

The system uses a hybrid evidence model:

- **Page-level evidence** for general positioning, audience fit, pain-point synthesis, and FAQ summaries.
- **Claim-level evidence** for high-risk claims.

### High-Risk Claims Requiring Claim-Level Evidence

- "Best", "#1", "top", or ranking claims.
- "Better than" or direct superiority claims.
- Pricing or value conclusions.
- Free trial, guarantee, refund, or cancellation claims.
- Customer count or user count claims.
- Review score or rating claims.
- Security, privacy, or compliance claims.
- Integration support claims.
- Geo availability or payment support claims.
- Product limitation claims.
- Competitor comparison claims.
- Verified discount or urgency claims.

### Evidence Records

```text
evidence_claims
- id
- product_id
- page_id nullable
- source_id
- claim_text
- claim_type
- risk_level
- extracted_quote nullable
- source_summary
- confidence_score
- usage_allowed
- created_at
- updated_at
```

### Source Records

```text
research_sources
- id
- product_id
- source_type
- source_url
- source_title
- retrieved_at
- source_hash
- usage_allowed
- robots_policy
- summary
- confidence_score
- notes
- created_at
```

### Publishing Evidence Requirements

A page cannot be published unless it has:

- Valid affiliate disclosure.
- Valid affiliate link.
- At least one clear user problem.
- At least one product-fit reason.
- At least one honest limitation or caveat.
- Page-level evidence score above threshold.
- Claim-level evidence for all high-risk claims.
- No unsupported ranking or superiority claims.
- No fabricated proof.
- No copied competitor content.

---

## 10. Evidence Graph

### Purpose

The Evidence Graph reduces repeated AI work by storing relationships among products, sources, pain points, objections, claims, and page sections.

### Graph Concepts

Nodes:

- Product.
- Source.
- Evidence claim.
- Pain point.
- Objection.
- Limitation.
- Competitor.
- Keyword cluster.
- Page.
- CTA.

Edges:

- Product has source.
- Source supports claim.
- Claim supports page section.
- Pain point maps to product benefit.
- Objection maps to FAQ.
- Competitor maps to comparison note.
- Keyword cluster maps to page opportunity.

The graph may be represented in Postgres initially using relational tables and JSONB. A dedicated graph database is not required for MVP 1.

---

## 11. CodeGraph Usage

### Purpose

CodeGraph may be used on the Oracle server to reduce Hermes/codebase context costs when Hermes or other agents inspect, maintain, or reason about the application and worker code.

### Boundary

CodeGraph is for codebase understanding. It is not the primary market research memory. Market research memory is handled by the Evidence Graph.

---

## 12. Product Vault

### Purpose

Store affiliate product metadata, status, research state, and publishing settings.

### Product Fields

```text
products
- id uuid primary key
- name varchar not null
- slug varchar unique not null
- website_url text
- partnerstack_id varchar nullable
- primary_category_id uuid nullable
- description text
- primary_audience text
- pricing_summary text
- commission_summary text
- target_countries text[]
- competitor_products text[]
- seed_keywords text[]
- status varchar
- research_priority int
- auto_low_risk_updates_enabled boolean
- created_at timestamp
- updated_at timestamp
```

### Product Statuses

```text
draft
active
researching
paused
archived
```

---

## 13. Affiliate Link Vault

### Purpose

Store and monitor affiliate links and tracking variants.

### Affiliate Link Fields

```text
affiliate_links
- id uuid primary key
- product_id uuid not null
- partnerstack_url text
- destination_url text nullable
- link_type varchar
- geo_target varchar nullable
- page_angle varchar nullable
- utm_source varchar nullable
- utm_medium varchar nullable
- utm_campaign varchar nullable
- subid_template varchar nullable
- status varchar
- last_checked_at timestamp nullable
- last_status_code int nullable
- click_count int default 0
- conversion_count int nullable
- created_at timestamp
- updated_at timestamp
```

### Link Types

- Main review CTA.
- Free trial CTA.
- Demo CTA.
- Pricing CTA.
- Comparison CTA.
- Alternative CTA.
- Geo-specific CTA.
- Exit-intent CTA.
- Newsletter capture CTA.

### Link Health Rules

- Broken links may be auto-disabled.
- Backup links may be activated only if pre-approved.
- Link destination changes must be logged.
- Suspicious redirects must create a review task.

---

## 14. Page Generation Engine

### Purpose

Generate structured content for direct review landing pages from Hermes research payloads and evidence records.

### AI Boundary

AI may generate:

- Page metadata.
- Headlines.
- Subheadlines.
- Benefit copy.
- Objection responses.
- FAQ answers.
- CTA labels from approved patterns.
- Structured direct review page JSON.

AI must not generate:

- React components.
- CSS.
- Layout code.
- Fake screenshots.
- Fake testimonials.
- Unsupported ratings.
- Unsupported claims.

### Page Type In MVP 1

Only direct review pages are included in MVP 1.

Example:

```text
/landing-page-builders/leadpages-review
```

Future page types are excluded from MVP 1:

- Versus pages.
- Alternatives pages.
- Use-case pages.
- Geo-intent pages.
- Problem-solution pages.
- Pricing-intent pages.

---

## 15. Page JSON Contract

### Purpose

The generation engine outputs structured JSON that maps directly into fixed React components.

### Contract

```json
{
  "metadata": {
    "product_id": "",
    "page_type": "direct_review",
    "target_keyword": "",
    "search_intent": "",
    "geo_target": "",
    "category_slug": "",
    "url_slug": "",
    "title_tag": "",
    "meta_description": "",
    "canonical_url": "",
    "robots": "index,follow"
  },
  "affiliate_disclosure": {
    "short_disclosure": "",
    "full_disclosure": "",
    "placement": "above_first_cta"
  },
  "hero": {
    "headline": "",
    "subheadline": "",
    "primary_cta_label": "",
    "primary_cta_link_id": "",
    "risk_reversal": "",
    "social_proof_summary": ""
  },
  "problem_solution": {
    "problem": "",
    "agitation": "",
    "solution": ""
  },
  "benefits": [
    {
      "benefit_title": "",
      "benefit_description": "",
      "feature_supporting_it": "",
      "source_reference_ids": []
    }
  ],
  "proof_blocks": [
    {
      "proof_type": "",
      "summary": "",
      "source_reference_id": "",
      "evidence_claim_id": "",
      "confidence_score": 0
    }
  ],
  "how_it_works": [
    {
      "step_number": 1,
      "title": "",
      "description": ""
    }
  ],
  "limitations": [
    {
      "limitation": "",
      "who_it_affects": "",
      "mitigation": "",
      "evidence_claim_id": ""
    }
  ],
  "objection_handling": [
    {
      "objection": "",
      "response": "",
      "source_reference_ids": []
    }
  ],
  "cta_blocks": [
    {
      "placement": "",
      "label": "",
      "supporting_text": "",
      "affiliate_link_id": ""
    }
  ],
  "faq": [
    {
      "question": "",
      "answer": "",
      "source_reference_ids": []
    }
  ],
  "schema_markup": {
    "faq_schema": {},
    "breadcrumb_schema": {}
  },
  "quality_scores": {
    "evidence_score": 0,
    "originality_score": 0,
    "conversion_score": 0,
    "compliance_score": 0,
    "readability_score": 0,
    "seo_safety_score": 0,
    "overall_score": 0
  }
}
```

---

## 16. Mobile-First Landing Page Requirements

### Purpose

Landing pages must convert well on mobile devices, where visitors often make fast buying decisions and tolerate less friction.

### Mobile Requirements

- The hero must communicate the main value within the first mobile viewport.
- The first CTA must be visible without excessive scrolling.
- Affiliate disclosure must appear before or near the first CTA on mobile.
- Tap targets must be large enough for thumb use.
- Sticky CTA must not obscure disclosure, FAQ controls, or important copy.
- Benefit sections must use short cards or compact rows.
- Comparison or proof content must collapse into mobile-friendly cards.
- Long tables are not allowed on mobile.
- FAQ controls must be easy to expand and collapse.
- Objection and limitation sections must be scannable.
- Paragraphs must be short.
- Page sections must avoid dense blog-style walls of text.
- Mobile page speed and Core Web Vitals are acceptance criteria.
- No desktop-only content may be required to understand the offer.

### Mobile Page Structure

```text
1. Disclosure
2. Hero headline
3. Subheadline
4. Primary CTA
5. Risk reversal / caveat
6. Trust or evidence summary
7. Problem-solution section
8. Benefits
9. Proof blocks
10. How it works
11. Limitations
12. Objection handling
13. FAQ
14. Final CTA
```

### Desktop Enhancement

Desktop layouts may use wider grids, side-by-side sections, and richer visual hierarchy, but must not introduce competing CTAs or distract from the single conversion goal.

---

## 17. Next.js Page Engine

### Required Route

```text
app/[category]/[slug]/page.tsx
```

### Required Components

```text
components/landing/PageSkeleton.tsx
components/landing/HeroSection.tsx
components/landing/AffiliateDisclosure.tsx
components/landing/ProblemSolutionSection.tsx
components/landing/BenefitGrid.tsx
components/landing/ProofStack.tsx
components/landing/HowItWorks.tsx
components/landing/LimitationsBlock.tsx
components/landing/ObjectionHandler.tsx
components/landing/FAQSection.tsx
components/landing/FinalCTA.tsx
components/landing/StickyCTA.tsx
components/landing/TrackingLink.tsx
```

### Rendering Rules

- Page code is fixed.
- Page JSON is validated before rendering.
- No page renders without disclosure.
- No page renders without at least one valid CTA.
- No page renders if status is not approved or published.
- Paused pages return noindex or redirect based on admin setting.
- Missing optional sections fail gracefully.
- High-risk claims without evidence are hidden or blocked.
- Mobile-first layout is the default.

---

## 18. Quality and Compliance Gate

### Required Scores

Each page version must receive:

```text
evidence_score
originality_score
conversion_score
compliance_score
readability_score
seo_safety_score
overall_score
```

### Publishing Requirements

A page can publish only if:

- Overall score is above configured threshold.
- Compliance score is above configured threshold.
- Evidence score is above configured threshold.
- Affiliate disclosure exists.
- Page has a single primary CTA.
- Page has a valid affiliate link.
- Page has valid title tag and meta description.
- Page has valid canonical URL.
- Page contains an honest limitation.
- High-risk claims have claim-level evidence.
- No fake reviews are present.
- No invented statistics are present.
- No deceptive urgency is present.
- No unsupported "best" or "#1" claims exist.
- No copied competitor content exists.
- Page has enough unique intent compared to existing pages.

### Review Statuses

```text
draft
needs_review
approved
published
paused
noindex
rejected
archived
```

---

## 19. Approval and Automation Rules

### Manual Approval Required

- First publication of a page.
- Major rewrite.
- Recommendation direction change.
- New competitor comparison.
- Strong claims.
- Ranking claims.
- Pricing/value conclusions.
- Geo availability claims.
- Publishing new page types.
- Pausing, archiving, or deleting pages.
- URL/category changes.
- Large page batches.

### Low-Risk Auto-Approval Allowed

Only when product-level auto low-risk updates are enabled:

- Disable broken affiliate link.
- Activate pre-approved backup link.
- Update CTA label from approved list.
- Refresh meta description.
- Add FAQ from approved research payload.
- Add verified limitation.
- Replace stale pricing copy with a generic official-site CTA.
- Refresh page timestamp.
- Update source freshness metadata.
- Add noindex to experimental page if product policy already allows it.

### Auto-Approval Constraints

Auto-approved changes must:

- Be logged.
- Create a page version.
- Reference source/evidence where relevant.
- Be reversible.
- Stay within configured risk level.
- Never introduce unsupported claims.

---

## 20. Publishing Workflow

```text
1. Admin creates product.
2. Admin adds affiliate link.
3. Admin starts research or waits for scheduled Hermes cycle.
4. Hermes creates research jobs.
5. Scrapling gathers and refreshes sources.
6. Hermes stores sources and evidence claims.
7. Hermes builds research payload.
8. Page draft is generated as structured JSON.
9. Quality/compliance gate scores draft.
10. Draft enters approval queue.
11. Admin reviews and approves.
12. Page publishes through ISR.
13. Tracking starts.
14. Hermes refreshes research every 3 hours.
15. Hermes performs daily optimization review.
16. Low-risk approved changes auto-apply.
17. High-risk recommendations enter approval queue.
```

---

## 21. Analytics and Tracking

### Events

MVP 1 tracks:

```text
page_view
cta_click
affiliate_click
link_error
scroll_depth_50
scroll_depth_75
faq_expand
```

### Dimensions

- Product.
- Page.
- Category.
- Page type.
- Target keyword.
- CTA placement.
- CTA label.
- Affiliate link.
- Device type.
- Country where available.
- Referrer.
- Session.
- Date.

### Privacy Boundary

MVP tracking should collect the minimum data needed to evaluate page and CTA performance. Tracking implementation must support consent-aware behavior for jurisdictions that require it.

---

## 22. Daily Optimization Loop

### Purpose

Hermes reviews performance and research freshness to recommend improvements.

### Inputs

- Page views.
- CTA clicks.
- Affiliate clicks.
- Link errors.
- Scroll depth.
- FAQ expands.
- Bounce indicators where available.
- Research source changes.
- Pricing/doc changes.
- New evidence findings.
- Compliance risk flags.

### Recommendations

```text
KEEP
REFRESH_META
REFRESH_CTA
ADD_FAQ
ADD_LIMITATION
ADD_PROOF_BLOCK
REWRITE_HERO
UPDATE_DISCLOSURE
FIX_LINK
NOINDEX_EXPERIMENTAL
REQUEST_MANUAL_REVIEW
```

MVP 1 does not include fully autonomous page retirement or new page batching.

---

## 23. SEO and Crawl Safety

### Requirements

- Use clean dynamic URLs.
- Generate canonical URLs.
- Generate sitemap entries only for published indexable pages.
- Avoid doorway pages.
- Avoid mass geo pages.
- Avoid duplicate pages.
- Avoid thin pages.
- Noindex weak or experimental pages.
- Preserve redirects when slugs change.
- Use structured data carefully.
- Avoid unsupported review schema.
- Use internal links only where relevant.

### Page Uniqueness Rules

A new page must have at least one unique:

- Product angle.
- Buyer persona.
- Use case.
- Search intent.
- Pain point.
- Pricing objection.
- Evidence cluster.

MVP 1 supports direct review pages only, so uniqueness mainly applies across product review pages and future variants.

---

## 24. Affiliate Compliance

### Disclosure Requirement

Every page must clearly disclose that the site may earn commission from affiliate links.

Disclosure must appear:

- Near the top of the page.
- Before or near the first affiliate CTA.
- In plain language.
- On mobile and desktop.
- Not only in footer or legal pages.

Example:

```text
Disclosure: This page contains affiliate links. If you buy through these links, we may earn a commission at no extra cost to you. We only recommend tools based on research, fit, and usefulness for the stated use case.
```

### Review Integrity Rules

The system must not:

- Invent personal usage claims.
- Invent customer testimonials.
- Invent star ratings.
- Invent review counts.
- Invent discounts.
- Invent product capabilities.
- Hide affiliate relationships.
- Use deceptive urgency.
- Claim a product is best without a defined, evidenced basis.

---

## 25. PartnerStack Compliance and Tracking Rules

### Purpose

PartnerStack links, offers, program rules, and tracking behavior vary by program. The product must preserve attribution, avoid stale offer claims, and prevent program-rule violations.

### Pricing and Offer Claims

Landing pages must not publish specific product pricing by default.

Rules:

- Pricing research may be stored internally for evidence and freshness monitoring, but specific pricing should not appear on public pages by default.
- Do not publish specific dollar amounts, plan prices, or package prices unless manually approved and freshness-dated.
- Do not publish discount claims unless the discount is verified through an approved source and freshness-dated.
- Do not publish trial, refund, cancellation, guarantee, or money-back claims unless verified through an approved source and freshness-dated.
- Prefer generic pricing language such as:
  - "Check current pricing on the official site."
  - "See the current offer."
  - "Review today's plans and trial details."
  - "Visit the official pricing page."
- Pricing-related claims are high-risk claims and require claim-level evidence.
- If pricing evidence is stale, the pricing claim must be removed or replaced with a generic official-site CTA.

### CTA Language

Approved CTA labels for PartnerStack-driven pages:

```text
See Current Offer
Check Current Pricing
Visit Official Site
Try the Official Offer
See If It Fits Your Workflow
Review Plans on the Official Site
```

Disallowed CTA labels unless manually approved:

```text
Get 50% Off
Claim This Deal
Lock In This Price
Get Lifetime Access
Only Today
Start for $X
```

### Referral Link Integrity

The product must always store and use the original PartnerStack referral link copied from PartnerStack or retrieved through an approved API source.

Rules:

- Do not replace a PartnerStack link with the final redirected destination URL.
- Do not publish final browser redirect URLs as affiliate links.
- Do not strip PartnerStack tracking parameters.
- Do not rewrite PartnerStack links unless using an approved redirect wrapper that preserves the full original destination.
- Link tests must verify that the PartnerStack link redirects and carries expected tracking indicators where available.
- If a link fails or redirects suspiciously, disable the CTA or route it to manual review.

### Custom and Deep Links

Custom links and deep links are conditional by program.

Rules:

- Do not assume custom links are enabled.
- Do not assume deep links to pricing, features, or product pages are allowed.
- Only use custom link destinations approved by the PartnerStack program.
- Wildcard or deep-link destinations may be used only when the program has explicitly enabled them.
- If a program does not allow custom links, use the default referral link.
- If a custom link's visible text is changed in PartnerStack, the product must update stored links before publishing.

### Program-Specific Terms

Each PartnerStack program may have its own terms. The product must store and enforce program-specific restrictions where available.

Track:

- Paid ads allowed or prohibited.
- Brand bidding allowed or prohibited.
- Coupon/deal language allowed or prohibited.
- Email promotion rules.
- Social media rules.
- Trademark usage rules.
- Required disclosure language.
- Approved landing destinations.
- Resource usage permissions.
- Self-referral policy.

MVP 1 is organic/free-channel only. The product must not generate paid ad copy, brand-bidding guidance, coupon pages, or discount-focused pages.

### Program Resources and Materials

PartnerStack program resources may include sales or marketing materials. These are permissioned assets, not generic source content.

Rules:

- Store program resources only when accessible and allowed.
- Record source, retrieval date, and usage notes.
- Do not copy full resource text into landing pages.
- Use resources as evidence or background context unless the program explicitly allows reuse.
- Brand assets, screenshots, logos, or promotional images require usage permission.

### Self-Referral and Testing

The product must not perform self-referral signup or purchase tests.

Allowed tests:

- Link health check.
- Redirect check.
- Tracking parameter presence check where visible.
- Dashboard click-count review after expected reporting delay.

Disallowed tests:

- Signing up through the operator's own affiliate link.
- Purchasing through the operator's own affiliate link.
- Creating fake customers or fake conversions.

### Reporting Expectations

PartnerStack reporting may not update in real time.

Rules:

- Do not treat PartnerStack click, signup, sale, or commission data as instant.
- Store the last synced timestamp for PartnerStack data.
- Distinguish first-party click tracking from PartnerStack-reported performance.
- Use first-party click tracking for immediate page optimization.
- Use PartnerStack-reported data for delayed conversion and commission validation where available.

### API Sync Boundary

PartnerStack API sync should support:

- Partnerships.
- Offers where available.
- Marketplace program metadata.
- Rewards and commissions where available.
- Transactions or customers where available.
- Affiliate links only when exposed by the account/API response or manually supplied.
- Resources only when exposed, accessible, and allowed.

Manual fallback remains required for:

- Affiliate links not exposed by API.
- Program terms not exposed by API.
- Marketing resources not exposed by API.
- Program-specific restrictions that require operator review.

---

## 26. Compliance Operating System

### Purpose

The product must treat compliance as an operating system, not a final checklist. Every page, claim, link, source, tracking event, and automated update must pass through explicit rules before becoming public.

This section is product guidance, not legal advice. The operator remains responsible for legal review where needed.

### Default-Deny Policy

Unknown compliance state must be treated as restricted.

Rules:

- If a program rule is unknown, use the most conservative allowed behavior.
- If a claim lacks sufficient evidence, block it from publication.
- If link tracking is uncertain, route it to manual review.
- If a source's usage permission is unclear, use it for internal context only.
- If privacy consent requirements are unclear for a visitor, use minimal non-invasive tracking.
- If Hermes is uncertain, it must create a manual review task rather than apply the change.

### Compliance Gates

The system must run compliance checks at these points:

```text
1. Product creation
2. Affiliate link creation or update
3. PartnerStack program rule import
4. Source ingestion
5. Evidence claim creation
6. Page draft generation
7. Page approval
8. Page publication
9. Low-risk auto-update
10. Daily optimization recommendation
```

### Claim Risk Classes

Claims must be classified before publication.

```text
LOW_RISK
- General workflow descriptions
- Broad audience fit
- Pain-point summaries
- Non-comparative benefit language

MEDIUM_RISK
- Feature availability
- Integration mentions
- Setup effort
- Support or onboarding descriptions
- Audience suitability

HIGH_RISK
- Pricing
- Discounts
- Free trial
- Guarantees
- Refunds
- Review ratings
- Customer counts
- Security/privacy/compliance claims
- Geo availability
- Ranking claims
- Competitor superiority claims
- Urgency or scarcity
```

Publishing rules:

- Low-risk claims may rely on page-level evidence.
- Medium-risk claims should reference source IDs.
- High-risk claims require claim-level evidence and manual approval unless already covered by an approved reusable claim.

### Program Rule Registry

Every affiliate product should have a compliance profile.

The profile should include:

- PartnerStack program rules.
- Required disclosure language.
- Allowed channels.
- Disallowed channels.
- Link rules.
- Brand/trademark restrictions.
- Resource usage permissions.
- Pricing/discount permissions.
- Last reviewed timestamp.
- Source of the rule.

If no profile exists, the product remains eligible for internal research but cannot be published.

### Policy Pages

The public site must include:

- Affiliate disclosure page.
- Privacy policy.
- Terms of use.
- Contact page.

Landing pages must not rely only on those policy pages. They still require visible in-page disclosure.

### Privacy and Tracking Rules

MVP tracking must be minimal and consent-aware.

Rules:

- Track only what is needed for page and CTA performance.
- Separate first-party click tracking from PartnerStack-reported performance.
- Avoid collecting sensitive personal information.
- Store newsletter consent separately if newsletter capture is added later.
- Support consent-aware analytics behavior for regions that require it.
- Do not use third-party pixels by default in MVP.
- Do not fingerprint visitors.
- Do not sell or share tracking data.

### Scraping and Source Usage Rules

Hermes and Scrapling must respect source safety rules.

Rules:

- Store source URL, source type, retrieval date, source hash, and usage notes.
- Log robots and rate-limit settings for crawls.
- Prefer public, permitted, rate-limited sources.
- Do not copy full protected resources into page copy.
- Do not use program resources beyond their permitted purpose.
- Mark uncertain sources as internal-only.

### Audit Requirements

Every meaningful compliance action must be logged.

Log:

- Page publication.
- Page rejection.
- Page rewrite.
- Claim approval.
- Claim block.
- Affiliate link change.
- PartnerStack rule update.
- Low-risk auto-update.
- Manual override.
- Disclosure change.
- Noindex, pause, or archive action.

Audit entries must include actor, action, entity, timestamp, before state, after state, and reason where available.

### Manual Review Queue

The system must create manual review tasks for:

- High-risk claims.
- New first publications.
- Pricing or offer claims.
- Competitor comparisons.
- PartnerStack rule uncertainty.
- Suspicious affiliate redirects.
- Source permission uncertainty.
- Privacy/tracking configuration uncertainty.
- Any Hermes recommendation marked `REQUEST_MANUAL_REVIEW`.

---

## 27. Database Schema

### Core Tables

```text
products
categories
affiliate_links
partnerstack_program_rules
compliance_profiles
manual_review_tasks
generation_jobs
hermes_research_sessions
scrapling_crawl_runs
research_sources
evidence_claims
research_payloads
page_blueprints
page_versions
dynamic_pages
conversion_events
page_daily_metrics
optimization_recommendations
audit_log
```

### PartnerStack Program Rules

```text
partnerstack_program_rules
- id uuid primary key
- product_id uuid
- partnership_key varchar nullable
- program_name varchar
- paid_ads_allowed boolean nullable
- brand_bidding_allowed boolean nullable
- coupon_language_allowed boolean nullable
- custom_links_enabled boolean nullable
- deep_links_enabled boolean nullable
- approved_destinations jsonb
- required_disclosure text nullable
- resource_usage_notes text nullable
- self_referral_allowed boolean nullable
- raw_terms_source_id uuid nullable
- last_reviewed_at timestamp nullable
- created_at timestamp
- updated_at timestamp
```

### Compliance Profiles

```text
compliance_profiles
- id uuid primary key
- product_id uuid nullable
- scope varchar
- required_disclosure text nullable
- allowed_channels jsonb
- disallowed_channels jsonb
- link_rules jsonb
- claim_rules jsonb
- privacy_rules jsonb
- source_usage_rules jsonb
- status varchar
- last_reviewed_at timestamp nullable
- created_at timestamp
- updated_at timestamp
```

### Manual Review Tasks

```text
manual_review_tasks
- id uuid primary key
- product_id uuid nullable
- page_id uuid nullable
- entity_type varchar
- entity_id uuid nullable
- review_type varchar
- risk_level varchar
- reason text
- supporting_context jsonb
- status varchar
- assigned_to varchar nullable
- resolved_by varchar nullable
- resolved_at timestamp nullable
- created_at timestamp
```

### Generation Jobs

```text
generation_jobs
- id uuid primary key
- product_id uuid nullable
- page_id uuid nullable
- job_type varchar
- status varchar
- priority int
- input_payload jsonb
- output_payload jsonb
- error_message text nullable
- retry_count int
- locked_by varchar nullable
- locked_at timestamp nullable
- started_at timestamp nullable
- completed_at timestamp nullable
- created_at timestamp
```

### Scrapling Crawl Runs

```text
scrapling_crawl_runs
- id uuid primary key
- job_id uuid
- product_id uuid nullable
- source_id uuid nullable
- target_url text
- source_type varchar
- fetcher_mode varchar
- robots_obey boolean
- rate_limit_config jsonb
- crawl_depth int
- extraction_strategy jsonb
- status varchar
- pages_seen int
- pages_changed int
- error_message text nullable
- started_at timestamp
- completed_at timestamp nullable
- created_at timestamp
```

### Page Versions

```text
page_versions
- id uuid primary key
- blueprint_id uuid
- version_number int
- structural_copy jsonb
- compliance_result jsonb
- quality_score numeric
- evidence_score numeric
- approved_by varchar nullable
- approval_mode varchar
- published_at timestamp nullable
- created_at timestamp
```

### Audit Log

```text
audit_log
- id uuid primary key
- actor_type varchar
- actor_id varchar nullable
- action varchar
- entity_type varchar
- entity_id uuid
- before_state jsonb nullable
- after_state jsonb nullable
- reason text nullable
- created_at timestamp
```

---

## 28. API Routes

### Admin APIs

```text
POST /api/admin/products
GET /api/admin/products
GET /api/admin/products/:id
PATCH /api/admin/products/:id

POST /api/admin/affiliate-links
GET /api/admin/affiliate-links
PATCH /api/admin/affiliate-links/:id

POST /api/admin/generation-jobs
GET /api/admin/generation-jobs
GET /api/admin/generation-jobs/:id

GET /api/admin/pages
GET /api/admin/pages/:id
PATCH /api/admin/pages/:id
POST /api/admin/pages/:id/approve
POST /api/admin/pages/:id/publish
POST /api/admin/pages/:id/pause
POST /api/admin/pages/:id/noindex

GET /api/admin/optimization-recommendations
POST /api/admin/optimization-recommendations/:id/approve
POST /api/admin/optimization-recommendations/:id/reject
```

### Hermes APIs

```text
POST /api/hermes/jobs/claim
POST /api/hermes/jobs/:id/heartbeat
POST /api/hermes/jobs/:id/complete
POST /api/hermes/jobs/:id/fail
POST /api/hermes/revalidate-page
```

All Hermes endpoints must require authentication.

### Public Tracking APIs

```text
POST /api/events/page-view
POST /api/events/cta-click
POST /api/events/affiliate-click
POST /api/events/link-error
POST /api/events/faq-expand
```

---

## 29. Success Metrics

### MVP Product Metrics

- Number of active products.
- Number of valid affiliate links.
- Number of researched products.
- Number of research sources stored.
- Number of evidence claims stored.
- Number of approved page drafts.
- Number of published direct review pages.
- Average evidence score.
- Average compliance score.
- Number of auto-approved low-risk updates.
- Number of blocked high-risk claims.
- Number of blocked stale pricing claims.
- Number of PartnerStack links verified.
- Number of program-rule violations prevented.
- Number of manual review tasks created.
- Number of compliance profile gaps found.
- Number of unsupported claims blocked before publication.

### Traffic Metrics

- Page views.
- Unique visitors where available.
- Referrer breakdown.
- Device breakdown.
- Mobile engagement.
- Scroll depth.
- FAQ expands.

### Conversion Proxy Metrics

- CTA click-through rate.
- Affiliate click-through rate.
- Link error rate.
- Mobile CTA click-through rate.

### Optimization Metrics

- Recommendations created.
- Recommendations approved.
- Low-risk updates auto-applied.
- Pages improved after recommendation.
- Lift after CTA/meta/FAQ changes.

---

## 30. Key Risks and Mitigations

### Risk: Scaled Content Abuse

Mitigation:

- One page type in MVP 1.
- Manual first-publish approval.
- Page uniqueness gate.
- Evidence requirement.
- No mass page batching.

### Risk: Thin Affiliate Content

Mitigation:

- Evidence ledger.
- Pain-point synthesis.
- Required limitations.
- Required use-case fit.
- No copied vendor descriptions.

### Risk: Affiliate Disclosure Failure

Mitigation:

- Disclosure component is mandatory.
- Rendering fails without disclosure.
- Disclosure appears before or near first CTA.
- Mobile disclosure is required.

### Risk: Stale Pricing or Offer Claims

Mitigation:

- Specific prices blocked by default.
- Pricing claims require manual approval and freshness date.
- Generic official-site CTAs preferred.
- Hermes removes or flags stale pricing evidence.

### Risk: PartnerStack Attribution Breakage

Mitigation:

- Store original PartnerStack referral links.
- Never publish final redirected URLs as affiliate links.
- Link health checks preserve tracking parameters.
- Custom and deep links require program approval.

### Risk: Program Rule Violation

Mitigation:

- Store program-specific rules.
- MVP acquisition is organic/free-channel only.
- Brand bidding and coupon language blocked by default.
- Self-referral testing prohibited.

### Risk: Missing Legal or Compliance Review

Mitigation:

- Compliance operating system uses default-deny behavior.
- Unknown program rules block publication.
- High-risk claims enter manual review.
- Audit log records compliance decisions.
- Public policy pages are required.

### Risk: Privacy or Tracking Non-Compliance

Mitigation:

- Minimal first-party tracking in MVP.
- Consent-aware tracking behavior where required.
- No third-party pixels by default.
- No fingerprinting.
- Newsletter consent stored separately if added later.

### Risk: AI Hallucination

Mitigation:

- Structured JSON only.
- Claim-level evidence for high-risk claims.
- Manual approval for major changes.
- Unsupported claims blocked.

### Risk: Credit Waste

Mitigation:

- 3-hour light refresh only.
- Hash and metadata checks before AI calls.
- AI budget caps.
- Weekly deep research instead of constant full crawls.

### Risk: Scraping Overreach

Mitigation:

- Source policies.
- Rate limits.
- Robots settings logged.
- Public permitted sources preferred.
- Aggressive bypass excluded from MVP default behavior.

### Risk: Oracle Reliability

Mitigation:

- Hermes managed by systemd or Docker restart policy.
- Job locks.
- Backups.
- Heartbeats.
- Error logs.
- Retry handling.

### Risk: Mobile Conversion Failure

Mitigation:

- Mobile-first page structure.
- Sticky CTA safety rules.
- Tap target requirements.
- Mobile Core Web Vitals acceptance criteria.
- Mobile CTA metrics tracked.

---

## 31. Recommended Build Order

```text
1. Next.js skeleton and Tailwind setup
2. Oracle Postgres schema
3. Database connection layer
4. Product Vault
5. Affiliate Link Vault
6. PartnerStack compliance rules storage
7. Compliance profiles and default-deny rules
8. Manual review task queue
9. Job queue
10. Hermes job API
11. Hermes Oracle worker skeleton
12. Oracle-side 3-hour scheduler
13. Scrapling crawl run storage
14. Research source store
15. Evidence ledger
16. Budget guard
17. Direct review page JSON schema
18. Mobile-first landing page renderer
19. Affiliate disclosure enforcement
20. PartnerStack tracking enforcement
21. Quality/compliance gate
22. Approval queue
23. ISR publishing
24. Tracking events
25. Daily optimization recommendation queue
26. Low-risk auto-approval workflow
```

---

## 32. Final Product Definition

The Controlled Affiliate Intelligence Loop is a compliance-first affiliate research and publishing system. Hermes runs continuously on Oracle, uses Scrapling to monitor public sources and discover changing user intent, stores findings in an evidence ledger, generates structured direct review page drafts, and recommends improvements based on research and performance data.

Next.js on Vercel renders fast, mobile-first affiliate landing pages from approved structured JSON. The system automates research and low-risk improvements while keeping first publication, major rewrites, competitor claims, ranking claims, and pricing conclusions under human approval.

The system avoids stale pricing claims and preserves PartnerStack attribution by sending users through approved PartnerStack referral links to official offer pages. Its compliance operating system uses default-deny rules, manual review tasks, claim-risk classes, and audit logging to keep pages aligned with partner program rules and legal disclosure expectations.

The goal is not to generate many affiliate pages quickly. The goal is to create a defensible, self-improving affiliate engine where every page has evidence, disclosure, mobile usability, measurable performance, correct affiliate tracking, and a clear reason to exist.
