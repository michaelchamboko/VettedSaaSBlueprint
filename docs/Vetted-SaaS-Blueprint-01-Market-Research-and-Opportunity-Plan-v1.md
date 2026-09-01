# Vetted SaaS Blueprint — Market Research and Opportunity Plan

**Document:** 01 of 10  
**Version:** 1.0  
**Status:** Working strategic plan for validation  
**Date:** 28 August 2026  
**Product owner:** Michael Chamboko  
**Related document:** `Vetted-SaaS-Blueprint-Master-PRD-v1.md`

---

## 1. Purpose of This Document

This document defines **why Vetted SaaS Blueprint should exist, which market problem it will solve, who it will serve, how it will be different, and what must be validated before the product roadmap is finalised**.

It is the first document in the product-definition sequence:

1. **Market Research and Opportunity Plan** — this document
2. Product Roadmap
3. Design System
4. Art Direction
5. Product Requirements Document
6. Content Specification
7. Onboarding and Activation Plan
8. UI Kit and Component Library
9. Growth and Distribution Strategy
10. Quality Assurance and Testing Plan

The existing PRD remains a working draft. It should be reviewed after Documents 1–4 are completed so that the build specification reflects the validated market, roadmap, and design direction.

This document contains two distinct elements:

- **Initial strategic conclusions** agreed during discovery.
- **A research plan** for validating or rejecting those conclusions with evidence.

Assumptions must not be presented as proven market facts until the research work in this document has been completed.

### 1.1 Delivery continuity and revision invariant

Market validation changes the evidence state, confidence, prioritisation, and later revision of public work. It does not authorise withholding the connected daily three-page decision set.

Every active publishing day must deploy one Decision Hub, one Solution Hub, and one Decision Scenario. Found, partial, conflicting, missing, and stale evidence are all publishable states when represented truthfully. Missing evidence changes the answer; it does not cancel delivery.

Every published page and asset remains versioned and revisitable. Newly discovered, corrected, or materially changed evidence must create an update task for the affected live work, followed by redistribution where the change matters to users.

---

## 2. Executive Summary

Vetted SaaS Blueprint will not compete as another SaaS directory, product-review blog, or “best ten tools” publisher.

Its immediate opportunity is to become an **evidence-driven software decision platform** that helps people answer:

> **What is the right software for my actual situation, and why?**

The market does not suffer from a shortage of software information. Vendor pages, search engines, AI assistants, review platforms, videos, communities, and affiliate sites already produce large volumes of information. The unresolved problem is that buyers still struggle to:

- identify the real problem they are solving;
- distinguish important criteria from distracting features;
- determine which evidence is current and trustworthy;
- understand trade-offs;
- separate product quality from suitability for their specific context;
- make a confident decision without wasting money or implementation effort.

Vetted SaaS Blueprint will address this gap through:

- customer-problem-first content;
- structured and dated evidence;
- an approved source registry;
- repeatable scoring and recommendation rules;
- conditional recommendations;
- explicit uncertainty and conflicting-evidence handling;
- deterministic workflows with AI used as a controlled worker;
- public decision experiences generated from a private evidence base.

### Immediate commercial target

The immediate business target is to generate qualified human traffic and revenue through:

1. Organic search and Answer Engine Optimization.
2. Evidence-backed affiliate recommendations.
3. Email capture through useful decision assets.
4. Repeat visits created by trusted, continuously updated decision intelligence.
5. Selective distribution experiments, including Pinterest where the content category and visual format justify it.

### Long-term strategic option

The web is moving toward greater AI-mediated consumption. Vetted SaaS Blueprint should therefore build high-quality, structured, attributable content that is easy for legitimate AI systems to discover, understand, cite, and retrieve.

Cloudflare currently provides AI crawler monitoring and control on all plans, while Pay Per Crawl remains in closed beta. Cloudflare has also announced experiments that move toward Pay Per Use, where compensation may follow actual use or citation rather than the number of fetches. This validates the direction of content-control and content-monetization infrastructure, but it does **not** yet prove that crawler payments will become a reliable revenue stream for Vetted SaaS Blueprint.

Accordingly:

> **AI crawler or content-licensing revenue is a strategic option, not the immediate business case.**

The immediate objective is to own a trusted SaaS decision knowledge base. The platform must be built so that future crawler charging, content licensing, paid retrieval, data products, or API access can be added without rebuilding the underlying content and evidence system.

---

## 3. Core Market Question

The central market question is:

> **Why would someone use Vetted SaaS Blueprint instead of Google, ChatGPT, a vendor website, a review platform, YouTube, Reddit, or an established affiliate publisher?**

### Working answer

Vetted SaaS Blueprint will not merely retrieve or summarise available information. It will diagnose the buyer’s situation, apply a transparent evaluation method, reconcile current evidence, explain trade-offs, state uncertainty, and produce a conditional best-fit recommendation.

The user should receive more than an answer. The user should receive an understandable decision path:

- what problem appears to exist;
- which constraints matter;
- what evidence was checked;
- which options fit;
- why they fit;
- what could make the recommendation wrong;
- what the user should do next.

### One-sentence value proposition

> **Vetted SaaS Blueprint helps people choose software by turning their real business problem, constraints, and current evidence into a clear, explainable best-fit decision.**

---

## 4. Market Problem

### 4.1 The real problem is decision confidence

Most software-buying content is organised around products and keywords. Buyers think in problems, risks, outcomes, budgets, team limitations, and consequences.

Examples of the user’s actual questions include:

- Will this solve the problem I have?
- Is this too complicated for my team?
- Am I paying for features I will never use?
- Will it integrate with what I already have?
- What will it cost after the introductory plan?
- Can I migrate without disrupting the business?
- What happens when my team or data grows?
- Which risks are not obvious from the vendor page?
- Is the more expensive option justified in my situation?
- Is there enough trustworthy evidence to make a decision?

The opportunity is therefore not “more product content.” It is **better diagnosis and decision clarity**.

### 4.2 Common failures in the current market

The initial market hypothesis is that current alternatives frequently suffer from one or more of the following weaknesses:

- Generic listicles with little connection to a specific buyer context.
- Product descriptions repeated from vendor marketing pages.
- Rankings whose scoring logic is not visible.
- Affiliate incentives that may not be clearly separated from editorial decisions.
- Star-rating averages that conceal the reasons behind positive or negative sentiment.
- Stale pricing, features, limits, and integration information.
- Recommendations that do not state who should not choose the product.
- Excessive attention to benchmark scores or feature counts rather than user outcomes.
- Long-form content padded to meet a word-count convention.
- AI-generated summaries that lack dated source evidence.
- Product-first pages that fail to establish the user’s actual problem.
- Single-source claims presented as certainty.
- Workflows that fail when evidence cannot be found.

These points are working hypotheses. The research plan must determine how frequently they occur in selected categories and whether users respond positively to a different model.

### 4.3 User job to be done

> **When I need software to solve a business problem, help me understand what matters, compare the viable paths, and choose confidently without wasting money, time, or implementation effort.**

---

## 5. Target Market

### 5.1 The market should initially be segmented by decision state

Vetted SaaS Blueprint should not begin by assuming that all “small businesses” or all “SaaS buyers” behave in the same way. The first useful segmentation is the buyer’s decision state.

The platform should recognise at least:

1. **New buyer** — selecting a tool for the first time.
2. **Switcher** — replacing an existing product because of cost, limitations, dissatisfaction, or changing requirements.
3. **Scaler** — needing greater capacity, governance, reliability, or automation.
4. **Cost reducer** — trying to reduce spend or eliminate unused capability.
5. **Capability seeker** — looking for a specific business outcome or capability.
6. **Integration seeker** — needing compatibility with an existing technology stack.
7. **Risk-sensitive buyer** — prioritising security, privacy, reliability, compliance, or business continuity.
8. **Internal champion** — needing evidence to justify a decision to management, finance, procurement, or colleagues.
9. **Shortlist buyer** — already considering two or more options and needing a scenario-specific decision.
10. **Problem-aware but solution-uncertain buyer** — understands the pain but not the appropriate software category or solution pattern.

### 5.2 Initial practical audience hypothesis

The most practical initial audience is likely to be:

- owner-managed businesses;
- freelancers and small agencies;
- small and medium-sized teams;
- non-technical decision-makers;
- operations, marketing, sales, and administrative users who must choose software without a dedicated procurement or technology research function.

This remains a hypothesis until search demand, available affiliate programmes, competition, evidence availability, and conversion potential are evaluated by category.

### 5.3 Initial category selection criteria

The first category should not be selected only because products have affiliate links. It should score well across the following factors:

- recurring and costly user pain;
- visible question-shaped demand;
- multiple credible products with meaningful trade-offs;
- sufficient official and independent evidence;
- active affiliate programmes for more than one viable product;
- pricing complexity that creates decision uncertainty;
- clear differences by buyer context;
- potential for decision assets or calculators;
- reasonable opportunity to build authority without relying on generic “best software” keywords;
- products that change often enough to reward structured updates, but not so often that evidence becomes impossible to maintain.

### 5.4 Initial exclusions

The first category should avoid markets where:

- claims cannot be responsibly verified;
- legal or medical consequences make affiliate decision support unsuitable;
- most products lack usable public documentation;
- the product is primarily purchased through complex enterprise procurement;
- the available affiliate programme creates a single-vendor dependency;
- the content would require unlicensed reproduction of proprietary material;
- the recommendation cannot be made responsibly without paid hands-on testing that is currently unavailable.

---

## 6. Current Alternatives and Their Gaps

| Alternative | What it does well | Common decision gap | Vetted SaaS Blueprint response |
|---|---|---|---|
| Search engines | Broad discovery and access to many sources | The user must reconcile conflicting, promotional, stale, and duplicated information | Assemble the relevant evidence into a structured decision with visible reasoning |
| General AI assistants | Fast, conversational synthesis | Sources, freshness, scoring logic, and evidence boundaries may be unclear or inconsistent | Store dated evidence and produce traceable recommendations from explicit rules |
| Vendor websites | Authoritative for official product facts | Optimised to sell one product and rarely explains when another option is a better fit | Use vendor documentation for facts, then evaluate fit independently |
| Review platforms | Large volumes of user feedback and product discovery | Ratings can hide context, recurring reasons, review quality, and disagreement | Extract recurring themes, reasons, source quality, recency, and confidence rather than copying an average |
| Affiliate publishers | Commercial buying content and product coverage | Often product-first, list-based, or weakly differentiated | Lead with the problem and publish conditional, evidence-backed decisions |
| YouTube reviewers | Demonstrations, visual walkthroughs, and personal experience | Difficult to compare systematically; may become outdated; opinions vary | Treat credible demonstrations as evidence inputs, not the final decision method |
| Reddit and communities | Authentic questions, pain points, and implementation experiences | Anecdotal, unverified, uneven, and vulnerable to hidden promotion | Use communities to discover questions and recurring concerns, then answer through verified evidence |
| Consultants | Contextual diagnosis and tailored recommendations | Expensive, difficult to scale, and inaccessible for many small buyers | Deliver a repeatable, lower-friction digital decision experience |

The competitive goal is not to replace every source. It is to **use each source for the job it performs best** and then add the missing decision layer.

> **Questions come from the crowd. Answers come from evidence. Recommendations come from the Vetted decision method.**

---

## 7. Opportunity Wedge and Positioning

### 7.1 Primary positioning

Vetted SaaS Blueprint should be positioned as:

> **An evidence-driven SaaS decision platform for people who need the right fit, not another ranked list.**

### 7.2 The initial wedge

The initial acquisition wedge should be **outcome-shaped and decision-shaped questions**, not broad product-review terms.

Examples:

- How can a small team reduce video production time without hiring an editor?
- What should a non-technical business use to automate follow-up emails?
- Which type of CRM fits a five-person sales team with no administrator?
- Should I switch from my current email platform before my subscriber list grows?
- Is the higher-priced plan justified if I only need three core capabilities?
- What is the lowest-risk option when data privacy matters more than advanced automation?

Products appear as possible solutions inside the decision. They are not automatically the page’s subject.

### 7.3 Public content model

The working content system contains three primary public page formats:

1. **Decision Hub** — helps a user understand the problem, hidden pain points, decision factors, and available paths.
2. **Solution Hub** — connects a stated outcome and context to conditional best-fit solution options.
3. **Decision Scenario** — resolves a specific real-world choice, including comparisons only where the scenario requires them.

Supporting decision assets may include:

- personalised decision reports;
- implementation-readiness checklists;
- vendor scorecards;
- migration-risk checklists;
- cost and return-on-investment calculators;
- shortlist summaries.

### 7.4 Explicit content exclusions

Vetted SaaS Blueprint should not rely on:

- generic “best 10” listicles;
- conventional “Product X Review” pages as the main acquisition strategy;
- generic product tutorials already covered by vendors;
- benchmark commentary without a decision consequence;
- content whose primary purpose is to reach a word count;
- absolute “best” claims without a stated user context;
- product comparisons performed in isolation from an actual decision.

---

## 8. Value Proposition and User Promise

### 8.1 Decision formula

The platform’s value can be expressed as:

> **User context + current evidence + transparent evaluation rules + explicit uncertainty = an explainable best-fit decision.**

### 8.2 Mandatory user promise

Every meaningful recommendation should tell the user:

- who the recommendation is for;
- which problem it addresses;
- which conditions must be true;
- which evidence supports it;
- which trade-offs exist;
- who should not choose it;
- how confident the system is;
- when the evidence was last checked;
- what the next sensible action is.

### 8.3 Emotional and practical outcome

The intended user outcome is not excitement about software. It is:

- reduced uncertainty;
- lower perceived risk;
- clearer priorities;
- confidence that the decision fits the user’s situation;
- a defensible reason for taking action.

The product should behave like a careful adviser: technically rigorous, clear, respectful, and practical. It must not behave like a manipulative salesperson or an impersonal product catalogue.

---

## 9. Defensible Advantage and Intellectual Property

The durable advantage will not come from a single article or a larger volume of generic pages. It will come from the system behind the pages.

### 9.1 Vetted Evaluation Framework

A repeatable framework for evaluating products across evidence-backed criteria, including:

- value and cost;
- capability fit;
- usability;
- ecosystem and integrations;
- reliability and support;
- trust, security, privacy, and compliance;
- carefully interpreted user sentiment.

### 9.2 Separate score types

The system should distinguish:

- **Product Score** — the product’s general assessed strength.
- **Fit Score** — suitability for a specific user context.
- **Evidence Confidence Score** — strength, quality, recency, and consistency of the evidence.

A high general product score must not automatically produce a high contextual fit score.

### 9.3 Approved source registry

Agents must use a controlled source hierarchy and claim-specific verification rules. The source registry should define:

- approved domains or source classes;
- which claim types each source may support;
- source priority;
- freshness requirements;
- corroboration requirements;
- prohibited or low-trust sources;
- stopping rules to prevent endless research.

### 9.4 Structured private evidence base

Evidence should be captured once and reused. Each evidence record should preserve, at minimum:

- product;
- claim or observation;
- source name;
- source URL;
- publication or update date when available;
- access date;
- short relevant excerpt or faithful summary;
- claim type;
- source tier;
- corroboration state;
- conflict state;
- confidence;
- affected evaluation criterion;
- review or expiry date.

The raw evidence repository remains private and under Vetted SaaS Blueprint’s control. Public pages expose only the evidence necessary to support the published conclusion. The exact local or hosted storage architecture belongs in the PRD and implementation plan.

### 9.5 Resilient evidence states

Every research task must return one of the following valid states:

- evidence found;
- partial evidence;
- conflicting evidence;
- no evidence found.

“No evidence found” is data, not a workflow failure. The system must record what was searched, state what remains unknown, lower confidence, and continue.

### 9.6 Deterministic workflow

The workflow controls:

- the order of work;
- required inputs and outputs;
- validation gates;
- retry rules;
- fallback states;
- publication eligibility.

AI models operate as replaceable workers within controlled tasks. They do not control the overall process.

### 9.7 Accumulating advantage

Each completed evaluation should strengthen the platform by adding:

- reusable evidence;
- product history;
- pricing history;
- source reliability history;
- recurring user questions;
- scenario logic;
- score changes;
- decision outcomes;
- feedback signals.

The content becomes a view of an improving decision system rather than a collection of unrelated articles.

---

## 10. Market Validation Research Plan

### 10.1 Research objective

Validate that a meaningful audience will use, trust, return to, and commercially act on evidence-backed decision experiences that begin with user problems rather than product rankings.

### 10.2 Primary research questions

1. Which SaaS categories contain the strongest combination of pain, search demand, evidence availability, affiliate opportunity, and decision complexity?
2. What questions do buyers ask before naming a product or category?
3. Which existing pages currently answer those questions, and where do they fail?
4. Which decision factors repeatedly change the correct recommendation?
5. Can enough current evidence be collected without purchasing every product?
6. Which source types consistently produce reliable claims for each criterion?
7. Does visible evidence and uncertainty increase trust and commercial action?
8. Which lead assets are valuable enough for users to exchange an email address?
9. Can the content earn search visibility through narrow, outcome-shaped intent rather than generic review keywords?
10. Which page structures are easy for answer engines to extract and cite?
11. Which AI crawlers access the site, which return value, and which should be allowed, blocked, or potentially charged in future?
12. Does Pinterest provide qualified traffic for any selected category or decision asset?

### 10.3 Research workstreams

#### Workstream A — Category opportunity assessment

Evaluate an initial shortlist of SaaS categories against a common scorecard:

- problem severity;
- buying frequency;
- search and community question volume;
- competitive intensity;
- affiliate coverage;
- average commission quality;
- product variety;
- evidence availability;
- price and plan complexity;
- update burden;
- ability to create scenario-specific recommendations;
- lead-magnet potential;
- visual-distribution potential, including Pinterest.

**Output:** ranked category shortlist with a recommended pilot category and reasons.

#### Workstream B — Customer-question discovery

Collect questions from:

- search suggestions and related searches;
- People Also Ask results;
- Reddit and relevant communities;
- vendor support forums;
- product help centres and FAQs;
- review-platform complaint and praise themes;
- YouTube comments on credible walkthroughs;
- public buyer discussions;
- support and migration questions.

Questions must be clustered into information domains, including:

- problem and root cause;
- desired outcome;
- budget and total cost;
- team capability and usability;
- required capabilities;
- integration and ecosystem;
- migration and implementation;
- scale and future needs;
- reliability and support;
- security, privacy, and compliance;
- sentiment and recurring frustrations;
- purchase justification;
- switching risk.

**Output:** a sourced question library, clustered by buyer state, pain, and decision stage.

#### Workstream C — Competitive content audit

For each shortlisted category, review representative pages from:

- large review platforms;
- vendor sites;
- major affiliate publishers;
- specialist independent reviewers;
- answer-engine results;
- community discussions;
- high-ranking outcome pages.

Assess:

- whether the page starts with the user’s problem;
- whether it provides a visible method;
- whether recommendations are conditional;
- whether sources and dates are shown;
- whether uncertainty is acknowledged;
- whether it explains who should not choose a product;
- whether the page reduces a specific decision uncertainty;
- whether affiliate relationships appear to affect the structure;
- whether the content is extractable and quotable by answer engines;
- whether the next step is useful or merely promotional.

**Output:** competitor gap matrix and a list of opportunities Vetted SaaS Blueprint can answer materially better.

#### Workstream D — Evidence feasibility audit

Select two to five products in the leading category and test whether the full evaluation framework can be populated from approved sources.

Measure:

- time required per criterion;
- source availability;
- evidence freshness;
- corroboration difficulty;
- frequency of conflicts;
- frequency of missing evidence;
- evidence that requires paid access;
- product claims that cannot be responsibly verified;
- whether the proposed stopping rules prevent research from continuing indefinitely.

**Output:** pilot evidence records, source registry draft, missing-evidence report, and estimated maintenance cost.

#### Workstream E — Commercial validation

For each candidate category, record:

- available affiliate programmes;
- products covered;
- approval requirements;
- commission basis;
- attribution window;
- geographic limitations;
- payout conditions;
- restrictions on brand bidding, claims, comparisons, and promotional methods;
- whether both or multiple credible options can be monetised;
- risk of dependence on a single vendor.

Commission level must not become a scoring factor. Commercial data is used to assess business viability only after product fit has been determined independently.

**Output:** affiliate viability matrix and conflict-of-interest controls.

#### Workstream F — Prototype validation

Create a small pilot set from one category:

- one Decision Hub;
- one Solution Hub;
- one Decision Scenario;
- one downloadable decision asset;
- two to five structured product evaluations.

Test whether users can:

- identify their situation;
- understand why a recommendation applies;
- explain the trade-offs afterward;
- recognise uncertainty;
- choose a next action;
- request a useful asset;
- click through to an appropriate vendor.

**Output:** user feedback, usability findings, content-completion data, lead-capture data, and affiliate click data.

#### Workstream G — AI discoverability and crawl analysis

Establish a baseline for:

- known AI crawler activity;
- robots.txt compliance;
- pages crawled most often;
- answer-engine citations or mentions where measurable;
- referral traffic from AI services;
- page extraction quality;
- freshness and canonicalisation issues;
- effect of structured summaries and evidence markup.

**Output:** AI distribution baseline and recommended crawler policy.

### 10.4 Research stop conditions

Agents must not continue researching indefinitely. Each workstream should define:

- required source types;
- minimum source count where applicable;
- maximum number of search rounds;
- maximum elapsed task time;
- acceptable evidence states;
- escalation conditions;
- required output even when evidence is insufficient.

The completion objective is not “find a positive answer.” It is “complete the defined search strategy and return an honest evidence state.”

---

## 11. AI Distribution, AEO, and Crawl-Control Opportunity

### 11.1 Three separate objectives

The project must distinguish:

1. **AI discoverability** — legitimate AI systems can find and understand the content.
2. **AI citation and referral** — the content is useful enough to be cited, attributed, or used to send qualified traffic.
3. **AI access monetization** — crawlers, agents, or AI services pay for access or use.

These objectives are related but not interchangeable. A page may be crawled without being cited, cited without sending a click, or valuable without being eligible for paid access.

### 11.2 Current market signal

As checked on 27 August 2026:

- Cloudflare AI Crawl Control is available on all plans and provides visibility into AI crawler activity, allow/block controls, robots.txt monitoring, and monetization exploration.
- Cloudflare Pay Per Crawl enables a site owner to set a price for AI crawler access, with successful paid access using HTTP 200 and unpaid access receiving HTTP 402 Payment Required; the feature remains in closed beta.
- Cloudflare has announced experiments moving from crawl-based charging toward Pay Per Use or pay-per-query models, recognising that a fetch count may not reflect the value created when content is cited or used.

These developments support the strategic thesis that high-quality, controlled, attributable content may become directly monetizable. They do not yet justify a revenue forecast.

### 11.3 Immediate AEO objective

Vetted SaaS Blueprint should first become a source that answer engines **want to use** because it provides:

- direct answers to real decision questions;
- unique synthesis rather than copied vendor text;
- explicit assumptions;
- structured reasoning;
- current evidence dates;
- clear product and entity names;
- conditional conclusions;
- transparent uncertainty;
- stable page identity;
- concise, extractable summaries;
- supporting detail for deeper verification.

### 11.4 Machine-readable publishing requirements

The future content and technical specifications should require:

- server-rendered or otherwise reliably crawlable HTML;
- semantic headings and page landmarks;
- one clear primary question or decision per page;
- direct answer summaries near the relevant question;
- stable canonical URLs;
- accurate XML sitemaps;
- controlled robots.txt directives;
- structured metadata and appropriate schema markup;
- visible publication and last-reviewed dates;
- product, organisation, author, methodology, and evidence attribution where appropriate;
- internal links based on decision relationships;
- persistent evidence identifiers and update history;
- no important evidence hidden exclusively inside images or client-only interactions;
- downloadable or machine-readable decision summaries where commercially appropriate;
- investigation of emerging agent-discovery conventions, without relying on any single convention as the sole access path.

### 11.5 Crawler policy principle

The default strategy should not be “allow everything” or “block everything.” It should be evidence-based:

- allow crawlers that support discovery, citation, referral, or an agreed commercial relationship;
- monitor mixed or unclear crawler behaviour;
- block abusive or non-compliant crawlers where appropriate;
- consider charging only when the platform, crawler, economics, and user-acquisition trade-off are understood;
- preserve search and answer-engine discoverability while the site is building authority;
- review policies by crawler purpose, not only crawler company.

### 11.6 Long-term monetization options

The system should remain technically and commercially ready for:

- Pay Per Crawl;
- Pay Per Use or pay-per-query arrangements;
- direct content licensing;
- paid data exports;
- product intelligence APIs;
- premium decision reports;
- commercial research partnerships;
- access to specialised evidence or historical datasets.

No future monetization mechanism may compromise the independence of product scoring or create paid rankings.

---

## 12. Business Model and Monetization Sequence

### Phase 1 — Trusted affiliate decision journeys

Primary revenue comes from affiliate links placed at the natural endpoint of an evidence-backed recommendation.

Rules:

- multiple viable vendors should be monetised where possible;
- the higher commission must never determine the winner;
- affiliate status must be disclosed clearly;
- unsupported products may still be recommended when they are the best fit, even if no commission is available;
- the recommendation record must be created before commercial metadata is applied.

### Phase 2 — Email and decision assets

Capture emails when users request a useful context-specific asset, such as:

- personalised decision report;
- migration checklist;
- implementation plan;
- vendor scorecard;
- cost model;
- return-on-investment calculator;
- shortlist report.

Email capture should be the natural exchange for a useful output, not a barrier placed before the user has received value.

### Phase 3 — Premium intelligence

Potential later products include:

- advanced reports;
- saved shortlists and monitored changes;
- procurement evidence packs;
- category benchmarks based on Vetted’s structured data;
- business or team subscriptions;
- API or data access.

### Phase 4 — AI access and licensing

When the ecosystem and traffic justify it, evaluate crawler charging, content licensing, pay-per-use arrangements, and agent-access products.

This phase must remain optional. The business must be viable without assuming crawler revenue.

---

## 13. Distribution Opportunity

### 13.1 Primary distribution

The initial distribution model should prioritise:

- outcome-shaped organic search;
- answer-engine discoverability and citations;
- internal linking between related decisions;
- downloadable decision assets;
- email follow-up and update alerts;
- credible mentions and backlinks earned through original methods and data;
- affiliate partner relationships that do not control editorial decisions.

### 13.2 Pinterest experiment

Pinterest should be treated as a channel hypothesis, not a compulsory platform.

It is worth testing when the selected category supports visual, saveable, or planning-oriented assets such as:

- decision trees;
- checklists;
- comparison frameworks;
- workflow diagrams;
- budget planners;
- implementation roadmaps;
- “choose based on your situation” cards.

The Pinterest experiment should be retained only if it generates qualified visits, saves, email requests, or affiliate actions rather than superficial impressions.

### 13.3 Authority-building strategy

Authority should be earned through:

- consistent methodology;
- visible evidence and update dates;
- original decision frameworks;
- versioned product intelligence;
- honest missing-evidence disclosures;
- useful outcome-focused pages;
- primary-source citations;
- strong internal topic relationships;
- measured corrections and update history.

Volume alone is not authority.

---

## 14. Initial Strategic Hypotheses

| Hypothesis | Evidence required | Passing signal | Failure response |
|---|---|---|---|
| Buyers prefer contextual decisions to generic rankings | User interviews, behaviour on prototype pages, feedback | Users understand and act on conditional recommendations | Simplify the decision flow or narrow the audience |
| Outcome-shaped pages can attract organic traffic | Search demand, competitor gaps, indexation and traffic data | Qualified impressions and visits on narrow decision queries | Change category, query cluster, or page format |
| Visible evidence increases trust | Usability tests, engagement, click and lead data | Users consult evidence and report greater confidence | Reduce complexity or improve evidence presentation |
| A private structured evidence base can support multiple outputs | Pilot evaluations and page generation | One evidence record reliably supports multiple page types | Redesign the evidence schema before scaling |
| One category developed deeply will outperform broad thin coverage | Pilot category comparison | Higher quality, linking, repeat use, and conversion | Reassess category choice or depth requirements |
| Missing evidence can be handled without stopping the workflow | Pilot research runs | Every run returns a valid state and continues | Strengthen fallback contracts and stop conditions |
| AI-readable structure improves citation or retrieval | Crawl, citation, referral, and extraction testing | Improved crawler access, answer-engine inclusion, or AI referral | Review technical accessibility and answer structure |
| Pinterest can support selected decision content | Channel experiment | Qualified traffic, saves, leads, or assisted conversions | Stop the channel and reallocate effort |
| Paid AI access may become commercially relevant | Platform availability, crawler demand, content usage data | A credible payment or licensing opportunity emerges | Keep content open or selectively controlled; do not force monetization |

No hypothesis should be treated as permanently proven. Material changes must be recorded and the document versioned.

---

## 15. Success Measures

Exact numeric targets should be established in the Product Roadmap after a baseline is measured. This document defines what must be measured.

### 15.1 Market-validation metrics

- number and quality of sourced customer questions;
- number of meaningful competitor gaps;
- evidence availability by criterion;
- average research effort per product;
- percentage of claims with sufficient corroboration;
- proportion of partial, conflicting, and missing-evidence states;
- affiliate coverage across viable products;
- number of categories that pass the selection gate.

### 15.2 User-value metrics

- percentage of users who identify a relevant scenario;
- decision-flow completion rate;
- recommendation explanation engagement;
- evidence-detail engagement;
- user-reported confidence before and after the experience;
- shortlist creation or decision-asset requests;
- return visits for updated information.

### 15.3 Commercial metrics

- qualified affiliate click-through rate;
- affiliate conversion rate where reporting is available;
- revenue per qualified visit;
- email capture rate on decision assets;
- lead-to-commercial-action rate;
- revenue concentration by vendor;
- percentage of recommendations unaffected by affiliate availability.

### 15.4 SEO and AEO metrics

- indexed decision pages;
- impressions and clicks from outcome-shaped queries;
- ranking coverage by buyer question and scenario;
- backlinks or references to the methodology;
- AI crawler requests by operator and purpose;
- answer-engine citations or mentions where measurable;
- AI referral traffic;
- extraction accuracy from machine-readable page tests;
- content freshness and recrawl behaviour.

### 15.5 Quality metrics

- unsupported claim rate;
- stale evidence rate;
- correction rate;
- recommendation-to-evidence traceability;
- workflow completion rate;
- duplicate-content rate;
- percentage of recommendations with explicit conditions and exclusions.

---

## 16. Principal Risks and Controls

### 16.1 Crawler revenue is uncertain

**Risk:** The project overvalues a future monetization method that remains experimental.  
**Control:** Build the immediate business around human utility, affiliate revenue, and email assets. Treat crawler monetization as an option.

### 16.2 Search competition remains strong

**Risk:** Large platforms dominate broad product and category keywords.  
**Control:** Focus on narrow problem, outcome, constraint, switching, and scenario intent. Avoid competing primarily on generic review terms.

### 16.3 Evidence becomes stale

**Risk:** Pricing, features, policies, and integrations change.  
**Control:** Store dates, expiry rules, product-change signals, refresh schedules, and visible last-reviewed information.

### 16.4 AI agents invent or overstate claims

**Risk:** Automated workers fill gaps with plausible but unsupported content.  
**Control:** Structured inputs, source registry, evidence-state outputs, validation gates, and prohibition of unsupported scoring.

### 16.5 Research runs indefinitely

**Risk:** Agents search low-quality sources for days because “enough evidence” is undefined.  
**Control:** Claim-specific source rules, maximum search rounds, acceptable fallback states, and mandatory completion outputs.

### 16.6 Affiliate incentives undermine trust

**Risk:** Revenue potential influences recommendations.  
**Control:** Separate evaluation data from commercial metadata, disclose relationships, support non-affiliate recommendations, and prohibit pay-to-rank arrangements.

### 16.7 Evidence storage creates copyright or security exposure

**Risk:** Full pages, videos, or copyrighted materials are copied unnecessarily or raw research is exposed publicly.  
**Control:** Store only necessary excerpts, summaries, metadata, and permitted screenshots; keep the raw evidence layer private; publish limited justified evidence.

### 16.8 The first version becomes too broad

**Risk:** The team builds a large platform before proving that users value the decision method.  
**Control:** Validate one category, a small product set, three page types, and one decision asset before scaling.

### 16.9 AEO becomes a vague content label

**Risk:** “AI-readable” is treated as a slogan rather than a measurable capability.  
**Control:** Define technical extraction tests, citation monitoring, crawler analytics, structured content contracts, and answer-quality checks.

---

## 17. Decision Gates Before the Product Roadmap Is Finalised

Document 2, the Product Roadmap, may be drafted next, but its priorities must remain provisional until the following gates are completed:

### Gate 1 — Category selection

- At least three categories assessed.
- One pilot category selected through the common opportunity scorecard.
- Selection rationale documented.

### Gate 2 — Customer-question validation

- Real questions collected from multiple source types.
- Questions clustered by buyer state and decision domain.
- At least one high-value, non-generic decision journey identified.

### Gate 3 — Evidence feasibility

- Two to five products researched.
- Every criterion returns a valid evidence state.
- Research effort and maintenance burden estimated.
- Approved source registry drafted.

### Gate 4 — Commercial viability

- Multiple credible products have viable affiliate or commercial paths, or the category has a documented alternative monetization case.
- No single vendor is required for the business model to work.
- Programme restrictions are understood.

### Gate 5 — Prototype value

- A Decision Hub, Solution Hub, Decision Scenario, and decision asset are tested.
- Users can understand the reasoning and identify an appropriate next step.
- Critical confusion and trust issues are recorded.

### Gate 6 — Distribution feasibility

- Search and answer-engine opportunity is documented.
- Technical crawlability baseline is established.
- Pinterest is either justified as an experiment or explicitly excluded.

### Gate 7 — Go, revise, or redirect

A short opportunity decision memo must recommend one of:

- **Go** — proceed with the selected category and roadmap.
- **Revise** — adjust audience, category, evidence method, or monetization.
- **Redirect** — continue the daily public-output obligation through the strongest truthful current opportunity while a materially better category, audience, evidence method, or monetisation path is found.

These gates govern investment and prioritisation. They never suspend the daily three-page publishing obligation.

---

## 18. Recommended Seven-Day Validation Sprint

This sprint is an initial plan, not a fixed implementation schedule.

### Day 1 — Category shortlist

- Select three to five candidate SaaS categories.
- Score pain, decision complexity, competition, evidence, affiliate coverage, and update burden.
- Identify the leading two categories.

### Day 2 — Question discovery

- Gather real user questions for the leading categories.
- Cluster them by buyer state, pain, outcome, risk, and stage.
- Identify questions poorly answered by current pages.

### Day 3 — Competitive gap audit

- Review representative search, AI, vendor, review-platform, affiliate, community, and video results.
- Record where current experiences fail to reduce uncertainty.
- Define one Decision Hub, Solution Hub, and Decision Scenario opportunity.

### Day 4 — Evidence feasibility

- Select two to five products.
- Test the source hierarchy and evaluation criteria.
- Record found, partial, conflicting, and missing evidence.
- Estimate research and refresh effort.

### Day 5 — Commercial and distribution validation

- Confirm affiliate programme availability and restrictions.
- Review likely acquisition paths.
- Decide whether Pinterest deserves a small controlled test.
- Establish the Cloudflare AI Crawl Control baseline.

### Day 6 — Prototype assembly

- Create low-fidelity versions of the three page formats.
- Generate one decision asset.
- Validate that each recommendation is conditional, sourced, and understandable.

### Day 7 — Opportunity decision

- Review user feedback and evidence feasibility.
- Select the pilot category.
- Record unresolved risks.
- Issue the Go, Revise, or Stop decision memo.
- Update the Product Roadmap assumptions.

---

## 19. Open Decisions

The following items remain deliberately open:

1. Which SaaS category will be the first pilot?
2. Is the first audience global English-speaking buyers, South African businesses, or another defined segment?
3. Which affiliate networks and direct vendor programmes are available and acceptable?
4. Which evidence source domains will be approved for each claim type?
5. Which parts of the private evidence repository will be stored locally versus in the application’s structured data layer?
6. Which Cloudflare AI crawler settings currently apply to the live site?
7. Which answer engines and AI referral sources can be measured reliably?
8. Does Pinterest fit the selected category after a small test?
9. Which lead asset should be the first email-capture mechanism?
10. What baseline period will be used before numeric roadmap targets are set?

These decisions should not be guessed by implementation agents. They must be resolved through the research gates or explicitly recorded as assumptions.

---

## 20. Research and Product Guardrails

The following rules are mandatory throughout the project:

1. Never lead with the software when the user’s real query is a problem or outcome.
2. Never publish a recommendation without explaining the applicable conditions.
3. Never allow commission value to influence evaluation or ranking.
4. Never turn a lack of evidence into invented certainty.
5. Never stop the workflow merely because evidence is missing.
6. Never use community sentiment as proof of an objective product fact.
7. Never use one subjective source as sufficient support for a general conclusion.
8. Never publish copied vendor claims as independent analysis.
9. Never optimise for word count when the decision can be completed more clearly with less content.
10. Never treat AI crawl volume, AI citation, AI referral, and AI monetization as the same outcome.
11. Never assume crawler revenue until a real commercial mechanism and demand are verified.
12. Never expose the full private evidence repository merely to appear transparent.
13. Always preserve source, date, evidence state, reasoning, and confidence.
14. Always let a user understand why a product fits and why it may not fit.
15. Always design the system for human usefulness first and machine extraction second; neither should destroy the other.

---

## 21. Conclusion

Vetted SaaS Blueprint’s opportunity is not to become another large collection of software articles. Its opportunity is to own a trusted, structured, and explainable layer between a business problem and a software decision.

The immediate business should be built around:

- solving real buyer uncertainty;
- outcome-shaped organic acquisition;
- trustworthy affiliate recommendations;
- useful email-capture assets;
- reusable decision intelligence.

The longer-term opportunity is to make that intelligence valuable to both humans and AI systems through structured publishing, crawler control, attribution, licensing readiness, and emerging paid-access models.

The core strategic position is:

> **Build the trusted SaaS decision knowledge base for humans now, while making it ready for the agentic web as that market develops.**

---

## 22. Official References

The following sources were checked on 27 August 2026:

1. Cloudflare, **AI Crawl Control**  
   https://www.cloudflare.com/ai-crawl-control/

2. Cloudflare Developers, **AI Crawl Control Overview**  
   https://developers.cloudflare.com/ai-crawl-control/

3. Cloudflare Developers, **What is Pay Per Crawl?**  
   https://developers.cloudflare.com/ai-crawl-control/features/pay-per-crawl/what-is-pay-per-crawl/

4. Cloudflare Blog, **Introducing Pay Per Crawl: Enabling Content Owners to Charge AI Crawlers for Access**  
   https://blog.cloudflare.com/introducing-pay-per-crawl/

5. Cloudflare, **Your Content, Your Rules — Agentic Internet and Pay Per Use announcement**  
   https://www.cloudflare.com/press/press-releases/2026/cloudflare-allows-the-agentic-internet-to-flourish-with-a-simple-philosophy-your-content-your-rules/

6. Cloudflare Blog, **Making AI Search Smarter**  
   https://blog.cloudflare.com/making-ai-search-smarter/

---

**End of Document 01**
