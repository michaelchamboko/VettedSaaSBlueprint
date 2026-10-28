---
document_id: VSB-DOC-07
title: Content Intelligence, Editorial Operations and Knowledge Governance
owner: Michael Chamboko
status: Working editorial authority
semantic_version: 1.0.0
last_updated: 2026-08-28
stable_filename: Vetted-SaaS-Blueprint-07-Content-Intelligence-and-Editorial-Operations.md
supersedes: null
product: Vetted SaaS Blueprint
production_url: https://vettedsaasblueprint.online/
primary_environment: Local-first editorial intelligence with Vercel publication
primary_consumers:
  - editorial orchestrator
  - research agents
  - evidence agents
  - intent-discovery agents
  - content-planning agents
  - content-assembly agents
  - review agents
  - refresh and maintenance agents
  - publishing agents
required_dependencies:
  - VSB-DOC-01 Market Research and Opportunity Plan
  - VSB-DOC-02 Product Roadmap
  - VSB-DOC-03 AI-First System Architecture and Automation Blueprint
  - VSB-DOC-04 Design Principles, Design System and Interaction Governance
  - VSB-DOC-06 Agent Technology, Implementation and Narrative Interaction Standards
  - Vetted SaaS Blueprint Master Product Requirements Document
---

# Vetted SaaS Blueprint — Content Intelligence, Editorial Operations and Knowledge Governance

## 1. Purpose of This Document

This document defines **how Vetted SaaS Blueprint discovers what people want to know, builds reusable product and market intelligence, supplies focused context to AI workers, selects what to publish, creates content, refreshes existing content, and learns from every editorial run**.

It does not replace the Master PRD.

The Master PRD defines the product, page types, evidence principles, evaluation framework and decision logic. This document defines the **editorial operating system** that turns those requirements into a repeatable daily content operation.

It governs:

- affiliate-product intake;
- product dossiers;
- local source material and evidence;
- customer-question and intent discovery;
- shared knowledge;
- product-specific knowledge;
- the business knowledge graph;
- cross-product knowledge reuse;
- context brokerage;
- agent context packages;
- content opportunity scoring;
- editorial work queues;
- the 06:00 SAST daily editorial brief (RETIRED 2026-10-28; an equivalent brief may be created only inside an explicitly triggered run);
- content assembly across the three primary page types;
- evidence-state handling;
- refresh and maintenance;
- archiving and redirects;
- traceability;
- knowledge promotion;
- editorial learning and continuous improvement.

The central objective is:

> **Publish what people genuinely need answered, using the strongest available evidence and the smallest relevant slice of reusable knowledge, without forcing every agent to rediscover the project from scratch.**

---

## 2. Document Authority and Boundaries

The words **MUST**, **SHOULD** and **MAY** are deliberate:

- **MUST** means mandatory.
- **SHOULD** means expected unless a documented reason supports a safer or more useful alternative.
- **MAY** means optional, experimental or implementation-dependent.

This document is authoritative for the editorial-intelligence and knowledge workflow.

**Cadence supersession (owner directive 2026-10-28):** Any "daily", "every active day", fixed-time, scheduled, watchdog, rescue, or recurring-publication wording in this document is retained only as historical batch terminology or traceability. It does not authorise a schedule or ongoing publication obligation. The release unit remains valid, but execution occurs only from an explicit manual or API trigger under `AGENTS.md` and `planning.md`.

It MUST NOT redefine rules that already have an authoritative home.

In particular:

- page purposes and mandatory content logic remain governed by the Master PRD;
- visual presentation remains governed by the Design System;
- implementation technology remains governed by Document 6;
- workflow architecture and model independence remain governed by Document 3;
- the daily release commitment remains governed by the Product Roadmap and architecture documents.

Where this document needs those rules, it references and operationalises them rather than creating competing versions.

---

## 3. Editorial Thesis

Vetted SaaS Blueprint is not a system for deciding what the business would like to write about.

It is a system for answering **real customer questions that can be connected to useful SaaS decisions**.

The editorial sequence is therefore:

**real demand → customer intent → evidence → product fit → decision answer → page type → publication → measured learning**

The sequence is not:

**affiliate product → promotional topic → generated article → SEO optimisation**

The product dossier exists to make answering customer questions faster and more accurate. It does not make the product the centre of the editorial strategy.

> **The affiliate URL is a seed for intelligence. The customer question determines the content.**

---

## 4. Core Editorial Principles

All editorial agents and workflows MUST follow these principles.

### EO-01 — User intent first

Content begins with what a person is trying to understand, solve, compare, avoid, justify or achieve.

### EO-02 — Questions come from demand; answers come from evidence

Search behaviour, communities, forums, support conversations and first-party signals reveal questions. They do not automatically prove the answer.

### EO-03 — One source of truth

A fact, claim, definition or reusable framework should have one authoritative record. Pages reference it rather than creating uncontrolled copies.

### EO-04 — Product knowledge and shared knowledge remain separate

Product dossiers store what is specifically true about a product. Cross-product concepts belong in shared knowledge.

### EO-05 — Context is delivered, not rediscovered

A worker should receive the smallest complete context package required for its task. It should not begin by scanning the entire repository, all dossiers or the whole internet.

### EO-06 — Evidence uncertainty is a valid state

Missing, partial, conflicting or insufficient evidence is information. It does not make the workflow “go dumb” and does not automatically stop publication.

### EO-07 — Decision usefulness before word count

A page is complete when it resolves the required decision to the level justified by the evidence. Length is secondary.

### EO-08 — Affiliate relationships never determine the answer

Affiliate products create commercial opportunities and research seeds. Commission does not control scoring, ranking, wording or recommendation.

### EO-09 — Knowledge is reusable; pages are disposable views

The durable asset is the structured intelligence. Public pages are versioned presentations of that intelligence for specific user intents.

### EO-10 — Publish, observe, refresh

Useful truthful content should ship. Non-critical weaknesses enter the improvement queue. Evidence and content continue to evolve after publication.

The daily connected Decision Hub, Solution Hub, and Decision Scenario must publish for every evidence state. Missing, partial, conflicting, stale, or newly discovered evidence changes the editorial treatment and refresh queue; it never cancels the daily release. Every page and derived asset remains versioned, revisitable, and eligible for redistribution after a material update.

### EO-11 — Promote knowledge upward, never sideways

When product-specific research reveals a reusable concept, it is promoted into shared knowledge after validation. Other dossiers reference it rather than copying it.

### EO-12 — Every editorial result is traceable

A material public statement must be traceable through the content model to its evidence, source, date and applicable product or shared-knowledge record.

---

## 5. The Three Primary Public Page Types

The editorial operating system supports the three primary page types already defined by the Master PRD:

1. **Decision Hub**
2. **Solution Hub**
3. **Decision Scenario**

Their purpose is not redefined here.

Document 7 determines:

- how candidate questions are discovered;
- which dossier and shared knowledge is supplied;
- how a topic enters the work queue;
- how agents receive context;
- how existing intelligence is reused;
- when more research is required;
- when a page should be refreshed;
- how cross-product evidence is assembled.

The same operating system MAY later support decision assets, interactive selectors and other approved public experiences without changing the core knowledge architecture.

---

## 6. Affiliate URL as Product Intake Seed

### 6.1 Intake rule

A new affiliate URL is treated as the starting identifier for a product-intelligence dossier.

The intake workflow SHOULD capture:

- canonical product name;
- vendor;
- affiliate destination;
- affiliate programme reference where available;
- target market or category;
- known plans;
- user-provided affiliate documents;
- user-provided images or brand assets;
- relevant vendor URLs;
- date received;
- intake status;
- dossier identifier.

### 6.2 Affiliate material is source material, not unquestioned truth

Documents supplied through an affiliate programme MAY contain valuable:

- product descriptions;
- feature summaries;
- positioning;
- screenshots;
- brand assets;
- pricing information;
- use cases;
- partner guidance.

They remain vendor-originated information.

Marketing statements do not become verified independent claims merely because the vendor supplied them to affiliates.

### 6.3 Folder update as an intake event

When new approved material is added to a product’s local intake area, the editorial system SHOULD detect the change and create an ingestion task.

The ingestion task should:

1. identify new or changed files;
2. hash or otherwise identify them to prevent duplicates;
3. register their source and date;
4. extract relevant structured facts and candidate claims;
5. classify the material;
6. update the product dossier;
7. update affected knowledge-graph relationships;
8. identify evidence or intent records that may now be affected;
9. create refresh or research tasks where appropriate.

A folder update must not directly publish claims without the normal evidence and validation rules.

---

## 7. Product Dossier

### 7.1 Purpose

A product dossier is the **private, product-specific working source of truth** for one SaaS product.

It allows research workers to collect and normalise information once so future editorial workers can begin with prepared intelligence rather than repeating the same scraping and reading.

### 7.2 Product dossier contents

A dossier SHOULD logically contain:

- dossier manifest;
- affiliate URL and affiliate metadata;
- canonical vendor URLs;
- user-supplied affiliate documents;
- vendor documentation and captures;
- approved independent evidence references;
- screenshots and approved visual assets;
- claims and claim states;
- pricing facts;
- capabilities;
- integrations;
- plan restrictions;
- security and compliance facts;
- support facts;
- limitations;
- evidence records;
- product-change events;
- known user-intent relationships;
- related categories;
- related products;
- research history;
- refresh status;
- page references;
- audit history.

### 7.3 Default logical folder contract

The actual root path MUST follow the repository’s conventions. If no suitable convention exists, the following logical structure is the default:

```text
knowledge/
  products/
    <product-id>/
      manifest/
      intake/
      sources/
      captures/
      evidence/
      claims/
      product-data/
      assets/
      intent-links/
      change-log/
      refresh/
```

The structure is logical rather than technology-specific. It may be represented by files, structured storage or both after implementation proves the best form.

### 7.4 Intake area

`intake/` is the controlled landing area for:

- affiliate programme documents;
- product brochures;
- owner-provided screenshots;
- approved downloaded files;
- product images;
- notes supplied by the owner.

The system MUST retain source provenance.

### 7.5 Dossier identity

Every dossier MUST have a stable product ID that does not depend on:

- display title;
- affiliate URL parameters;
- page slug;
- vendor marketing name changes.

A product rename must not create a second dossier.

---

## 8. Global Intent Layer

Customer intent is a first-class asset and does not belong exclusively to any one product dossier.

The global intent layer stores the real questions and decision situations the platform observes.

A single intent can map to:

- one product;
- several products;
- a category;
- a shared concept;
- a Decision Hub;
- a Solution Hub;
- a Decision Scenario;
- a future decision asset.

This prevents the content system from forcing every customer question into the folder of whichever affiliate product happened to be added first.

### 8.1 Default logical structure

```text
knowledge/
  intents/
    questions/
    clusters/
    personas/
    buyer-states/
    outcomes/
    pain-points/
    scenarios/
    opportunity-queue/
```

### 8.2 Intent record

Each validated intent record SHOULD contain:

- stable intent ID;
- original question;
- normalised question;
- source or source reference;
- date observed;
- source type;
- customer persona or context where inferable;
- buyer state;
- decision stage;
- pain point;
- desired outcome;
- constraints;
- relevant category;
- candidate products;
- related intents;
- recurrence or demand signal where available;
- freshness;
- current answer coverage;
- evidence readiness;
- candidate page type;
- opportunity priority;
- status.

### 8.3 Intent is not search volume alone

The system MUST NOT treat search volume as the definition of demand.

A lower-volume question can have high editorial value when it:

- reveals a high-stakes decision;
- shows strong commercial intent;
- addresses a recurring customer pain;
- maps tightly to an affiliate product;
- resolves a meaningful switching or purchasing decision;
- fills an important gap in the decision journey.

---

## 9. Intent Discovery

### 9.1 Goal

The system should publish answers to questions people are actually asking now, rather than produce a fixed calendar of internally invented topics.

### 9.2 Discovery sources

Subject to the Approved Source Registry and applicable access rules, intent signals MAY come from:

- first-party search data;
- search-query variations;
- People Also Ask;
- question-discovery tools;
- Reddit and specialist communities;
- product support communities;
- vendor FAQ and documentation searches;
- approved review text;
- relevant public discussions;
- site-search data;
- first-party questions submitted to Vetted SaaS Blueprint.

### 9.3 Demand-source rule

A demand source can establish that a question exists.

It does not automatically establish the truth of the answer.

### 9.4 Discovery output

Intent-discovery agents do not write articles.

They return structured intent records and evidence of why the question deserves consideration.

---

## 10. Shared Knowledge Layer

### 10.1 Purpose

The shared knowledge layer stores information that is useful across products or categories.

Examples include:

- “What is SSO?”
- “What is an API?”
- switching-cost frameworks;
- migration-risk concepts;
- total-cost-of-ownership logic;
- common buyer states;
- security terminology;
- integration concepts;
- evaluation criteria;
- decision frameworks;
- editorial definitions;
- approved methodologies.

### 10.2 Default logical structure

```text
knowledge/
  shared/
    concepts/
    terminology/
    buyer-frameworks/
    decision-frameworks/
    evaluation-methods/
    category-knowledge/
    compliance-concepts/
    reusable-explanations/
```

### 10.3 Single-ownership rule

Shared knowledge MUST have one authoritative record.

A product dossier should link to a shared concept rather than maintain a competing copy.

### 10.4 Product-specific exception

A product-specific interpretation MAY remain in the dossier.

Example:

- shared knowledge: what SSO means and why it matters;
- product dossier: whether Product A provides SSO, on which plan, under which conditions and with which evidence.

---

## 11. Knowledge Promotion

When research inside a dossier produces information that is clearly reusable, the system SHOULD create a knowledge-promotion candidate.

Promotion requires:

1. the concept is not uniquely product-specific;
2. the statement is supported at the level required for its claim type;
3. the wording is vendor-neutral;
4. the authoritative shared location is identified;
5. duplicate or conflicting shared records are checked;
6. links from the originating dossier are preserved;
7. the new shared record is versioned.

The rule is:

> **Promote upward. Reference downward. Do not copy sideways.**

---

## 12. Business Knowledge Graph

### 12.1 Purpose

The business knowledge graph is the relationship layer connecting the editorial system.

It connects entities such as:

- products;
- vendors;
- categories;
- capabilities;
- plans;
- integrations;
- questions;
- pain points;
- outcomes;
- buyer states;
- scenarios;
- evidence;
- claims;
- decision criteria;
- pages;
- shared concepts.

### 12.2 Graph examples

Examples of useful relationships:

- question → expresses → pain point;
- question → seeks → outcome;
- question → maps to → Decision Scenario;
- product → belongs to → category;
- product → supports → capability;
- capability → resolves → customer need;
- claim → supported by → evidence;
- evidence → originates from → source;
- product → suitable when → buyer condition;
- product → unsuitable when → disqualifier;
- page → answers → intent;
- page → uses → evidence;
- page → recommends → product;
- concept → applies to → category.

### 12.3 Graph is not the source of truth

The graph indexes and connects authoritative records.

It MUST NOT silently become a second uncontrolled copy of:

- raw evidence;
- canonical claims;
- affiliate records;
- page content.

### 12.4 No dedicated graph database requirement

Document 7 does **not** require a specialist graph database at the start.

The first implementation MAY use:

- structured files;
- relational records;
- a document database;
- indexes;
- explicit relationship tables;
- another repository-aligned representation.

A dedicated graph database should be introduced only when measured retrieval or relationship complexity justifies it.

### 12.5 Separation from engineering graphs

The business knowledge graph is an editorial intelligence asset.

Repository code graphs, symbol graphs and engineering context tools serve code navigation and implementation.

They MUST NOT be treated as the business knowledge graph.

---

## 13. Context Broker

### 13.1 Primary rule

> **Editorial agents do not go looking for context. They receive context.**

The Context Broker is responsible for assembling the smallest complete context package required for each bounded task.

### 13.2 Why it exists

Without a Context Broker, agents repeatedly:

- scan the repository;
- re-read product material;
- rediscover page rules;
- reopen unrelated dossiers;
- repeat web research;
- waste tokens;
- introduce inconsistent assumptions.

The Context Broker turns the knowledge system into focused task inputs.

### 13.3 Context selection order

The broker SHOULD resolve context in this order:

1. task definition and success criteria;
2. page-type contract;
3. primary intent;
4. relevant product dossier records;
5. relevant shared knowledge;
6. relevant evidence records;
7. relevant graph relationships;
8. freshness and uncertainty state;
9. related live-page context;
10. only then, additional targeted research if required.

---

## 14. Standard Context Package

Every editorial worker SHOULD receive a versioned context package containing the applicable fields:

- task ID;
- task type;
- required output;
- success criteria;
- page type;
- primary customer question;
- normalised intent ID;
- buyer state;
- desired outcome;
- pain points;
- constraints;
- relevant product IDs;
- affiliate relationship status;
- approved product facts;
- relevant claims;
- relevant evidence IDs;
- evidence states;
- evidence freshness;
- conflicting evidence;
- relevant shared-knowledge IDs;
- relevant graph relationships;
- allowed research sources;
- research stop conditions;
- related existing pages;
- canonical terminology;
- editorial principles;
- prohibited behaviours;
- output schema;
- validators;
- context-package version.

### 14.1 Context sufficiency

If the package is insufficient, the worker should return a structured missing-context request.

It must not independently perform an unrestricted repository or internet search unless the task contract explicitly authorises research.

### 14.2 Context package size

The broker should optimise for **relevance, not completeness**.

More context is not automatically better.

---

## 15. Editorial Agent Responsibilities

These are logical roles. They do not require permanently separate models.

### 15.1 Intake worker

Registers new affiliate URLs and local material.

### 15.2 Acquisition worker

Collects approved product and evidence material within defined source and cost limits.

### 15.3 Normalisation worker

Transforms raw material into structured product, claim and evidence records.

### 15.4 Intent-discovery worker

Finds and clusters real customer questions.

### 15.5 Relationship worker

Updates business knowledge-graph relationships.

### 15.6 Context Broker

Assembles task-specific context packages.

### 15.7 Editorial planner

Scores opportunities and prepares the publication and refresh queue.

### 15.8 Content assembler

Populates the correct page model from validated intelligence.

### 15.9 Editorial validator

Checks page purpose, decision coverage, evidence traceability, uncertainty, affiliate integrity and duplication.

### 15.10 Refresh worker

Detects changed evidence, stale claims, demand shifts and page degradation.

### 15.11 Knowledge curator

Promotes reusable knowledge and prevents duplicated or conflicting shared records.

### 15.12 Publishing worker

Publishes only after the applicable product, editorial, technical and design contracts are satisfied.

---

## 16. Separation of Knowledge Acquisition and Content Generation

Knowledge acquisition and content generation are separate operating modes.

### 16.1 Acquisition mode

The acquisition system continuously prepares:

- source records;
- evidence;
- product facts;
- claims;
- product changes;
- intent signals;
- shared concepts;
- graph relationships.

Its objective is to make future editorial work cheaper, faster and more reliable.

### 16.2 Generation mode

The content system consumes prepared intelligence to answer a selected customer question.

It should not repeat broad acquisition work unless the context package identifies a specific evidence gap.

### 16.3 Benefits

This separation reduces:

- duplicate scraping;
- duplicate model reasoning;
- inconsistent facts;
- token waste;
- content-generation latency;
- broad uncontrolled browsing.

---

## 17. Content Opportunity Record

Every candidate page or refresh SHOULD have a structured opportunity record.

It should include:

- opportunity ID;
- primary intent;
- candidate page type;
- related product or products;
- user problem;
- desired outcome;
- buyer state;
- demand evidence;
- commercial relevance;
- current site coverage;
- evidence readiness;
- freshness urgency;
- internal-link value;
- decision usefulness;
- estimated effort;
- duplication risk;
- opportunity score;
- recommended action;
- reason for priority.

---

## 18. Opportunity Prioritisation

### 18.1 Priority principle

The system should publish the **next most useful answer**, not merely the highest-volume keyword.

### 18.2 Priority dimensions

The prioritisation system SHOULD consider:

1. customer decision value;
2. evidence that the question is genuinely being asked;
3. fit with the active affiliate-product portfolio;
4. evidence readiness;
5. commercial intent;
6. freshness or urgency;
7. weakness or absence of current coverage;
8. ability to strengthen an existing decision journey;
9. cross-product or internal-link value;
10. production effort.

### 18.3 Hard exclusions

A high score cannot override:

- fabricated or materially unsupported claims;
- affiliate bias;
- a duplicate page with the same primary intent;
- a page that violates the approved page-type purpose;
- a topic that provides no meaningful customer decision value.

### 18.4 Exact weighting

The exact numerical weighting MAY be tuned after baseline data exists.

The weighting must be versioned and must not change silently.

---

## 19. Daily Editorial Brief — 06:00 SAST

RETIRED 2026-10-28: the fixed-time editorial brief and its scheduler are not part of the current execution path. The following subsections are retained as a historical brief schema only; an equivalent brief may be assembled inside an explicit manual or API-triggered run.

### 19.1 Purpose

RETIRED 2026-10-28: the editorial system does not produce a scheduled **06:00 SAST** brief.

The brief is the point where prepared intelligence becomes an executable work queue.

### 19.2 Daily brief inputs

The brief SHOULD evaluate:

- newly added affiliate products;
- newly added dossier material;
- newly discovered customer questions;
- changed product evidence;
- stale claims;
- changed pricing or packaging;
- changed product capabilities;
- new or stronger evidence;
- conflicting evidence;
- existing page performance;
- unanswered or weakly answered intents;
- broken affiliate destinations;
- current optimisation queue;
- incomplete knowledge-promotion tasks;
- the active three-page daily release requirement.

### 19.3 Daily brief output

The brief SHOULD return:

- today’s connected Decision Hub;
- today’s connected Solution Hub;
- today’s connected Decision Scenario;
- the primary customer decision connecting the set;
- product dossiers required;
- context packages required;
- evidence gaps requiring targeted research;
- refresh tasks;
- maintenance tasks;
- priority order;
- dependencies;
- success criteria;
- expected publication destinations.

### 19.4 Work-queue rule

The brief may allocate work to both new content and maintenance.

It must not allow low-priority maintenance to consume the mandatory daily public-output capacity.

Urgent factual, safety, legal, broken-link or materially misleading corrections take priority.

### 19.5 Empty-new-content condition

If no strong new opportunity is available, the daily system should:

1. select the strongest real unresolved or under-served intent;
2. publish a new connected three-page set with the actual evidence state, including explicit insufficient-evidence treatment where necessary;
3. create discovery and refresh tasks for every material gap;
4. optionally refresh and materially improve an existing decision journey in addition to the new daily set;
5. update and redistribute any live work affected by newly found evidence.

The system must not invent filler, certainty, evidence, comparisons, or recommendations. An honest unresolved result is useful public output and satisfies the daily delivery obligation.

---

## 20. Daily Editorial Work Queue

The queue MAY contain:

- new page set;
- targeted research;
- dossier enrichment;
- evidence verification;
- page refresh;
- broken-link correction;
- change-event processing;
- knowledge promotion;
- internal-link repair;
- content consolidation;
- archive or redirect review;
- editorial QA;
- structured-data correction.

Each task MUST have:

- task ID;
- owner or worker role;
- priority;
- input context package;
- expected output;
- acceptance criteria;
- dependency state;
- retry or fallback path.

A blocked task must not cause unrelated editorial work to stop.

---

## 21. Page Assembly Standard

Content workers do not receive “write an article about Product X.”

They receive a page contract and a context package.

The worker must:

1. identify the customer question;
2. state the answer early;
3. apply the correct page type;
4. use only relevant shared knowledge;
5. use product facts from the relevant dossiers;
6. preserve evidence states;
7. explain trade-offs;
8. distinguish fact from interpretation;
9. apply conditional recommendations;
10. make affiliate action a consequence of fit, not the starting point;
11. return structured content blocks for validation.

The public page may be concise or long depending on the decision.

No target word count overrides decision completeness.

---

## 22. Cross-Product and Long-Form Content

A page MAY use intelligence from multiple affiliate-product dossiers.

This is expected for:

- real comparison scenarios;
- solution selection;
- switching decisions;
- category-level decisions;
- integration decisions;
- cost trade-offs;
- buyer-context recommendations.

### 22.1 Cross-product assembly rule

The worker must not manually merge entire product folders.

The Context Broker supplies:

- relevant intent;
- relevant shared knowledge;
- only the applicable records from each candidate product;
- decision criteria;
- evidence and confidence;
- exclusions and trade-offs.

### 22.2 Comparison rule

Products are compared because the customer’s scenario requires comparison.

They are not compared merely because both have affiliate links.

### 22.3 Shared explanation rule

If multiple products require the same general explanation, the page references the shared concept once and applies product-specific facts separately.

---

## 23. Evidence-State Behaviour

Document 7 does not create a competing evidence taxonomy.

The canonical evidence states remain those defined by the Master PRD and the implementation mapping approved elsewhere.

Editorial behaviour is mandatory:

### 23.1 Strong or sufficient evidence

Use the evidence normally and preserve its source and freshness.

### 23.2 Partial evidence

State what is supported and what remains unverified.

### 23.3 Conflicting evidence

Show the disagreement when it is material to the user’s decision.

### 23.4 Insufficient evidence

Do not invent the missing answer.

The page MAY still publish when the useful answer is that the approved research did not establish the claim.

### 23.5 Not yet researched

Create a bounded research task where the missing information materially affects the decision.

### 23.6 Not applicable

Exclude or explain the criterion rather than penalising the product.

### 23.7 Non-blocking principle

> **Evidence uncertainty changes confidence and wording. It does not automatically terminate the editorial workflow.**

---

## 24. Editorial Traceability

Every material public statement SHOULD be traceable through:

**page block → intent → claim or interpretation → evidence → source → date**

Every recommendation SHOULD additionally trace through:

**recommendation → buyer context → decision criteria → relevant product records → evidence → confidence**

### 24.1 Page provenance

Each page record SHOULD retain:

- page ID;
- page type;
- primary intent ID;
- context-package version;
- product IDs used;
- shared-knowledge IDs used;
- evidence IDs used;
- algorithm or rule version;
- content schema version;
- publication date;
- last meaningful update date;
- refresh reasons;
- affiliate destinations;
- validation result;
- related pages.

---

## 25. Content Lifecycle

Public content is not deleted casually.

The lifecycle should support:

1. **candidate**
2. **researched**
3. **ready**
4. **published**
5. **observed**
6. **refresh_due**
7. **refreshing**
8. **updated**
9. **consolidation_candidate**
10. **redirected**
11. **archived**

### 25.1 Knowledge versus page lifecycle

Archiving a page does not mean deleting the underlying knowledge.

Evidence, product history, claims and intent records remain available according to their retention rules.

### 25.2 Page removal rule

A page may be removed from active publication when:

- the underlying decision no longer exists;
- it duplicates a stronger canonical page;
- the product or category is retired;
- the page is materially obsolete and cannot responsibly be refreshed;
- consolidation creates a better user journey.

Where the URL has value or inbound references, use an appropriate redirect rather than silent deletion.

---

## 26. Refresh Strategy

### 26.1 Event-driven first

Refresh should be triggered primarily by meaningful events rather than an arbitrary monthly rewrite.

Triggers MAY include:

- pricing or plan changes;
- feature changes;
- integration changes;
- policy or compliance changes;
- product retirement;
- affiliate-link change;
- evidence becoming stale;
- new conflicting evidence;
- stronger evidence becoming available;
- material search-demand shift;
- new customer questions;
- performance decline;
- broken links;
- misleading or outdated wording;
- new related products;
- a major shared-knowledge update.

### 26.2 Backstop review

Event-driven refresh is the primary mechanism.

A periodic backstop review SHOULD still check that quiet pages have not remained untouched indefinitely.

The initial default backstop is **90 days for active decision pages**, unless claim-specific freshness rules require a shorter period.

This is a review trigger, not an instruction to rewrite the page every 90 days.

### 26.3 Claim-specific freshness

High-change facts such as:

- pricing;
- plan packaging;
- integrations;
- limits;
- availability;

should have shorter review windows than stable concepts or historical explanations.

---

## 27. Maintenance Operating Model

Maintenance is continuous but bounded.

A maintenance worker should:

- process change events;
- scan for stale evidence;
- check affiliate destinations;
- inspect refresh-due pages;
- surface content conflicts;
- identify consolidation candidates;
- update the refresh queue;
- avoid consuming all daily production capacity.

RETIRED 2026-10-28: the former 06:00 SAST brief does not schedule maintenance. An explicitly triggered run may prioritise maintenance using the retained schema.

Critical factual or commercial-link failures may interrupt normal priority.

---

## 28. Page Performance and Learning Signals

Editorial improvement MAY consider:

- organic impressions;
- query coverage;
- search click-through;
- useful engagement;
- continuation through the decision journey;
- interaction with evidence;
- decision-asset requests;
- affiliate clicks after recommendation;
- helpful/not-helpful signals;
- repeated exits;
- unanswered questions;
- internal search behaviour;
- recurring follow-up queries;
- evidence warnings;
- page age.

No single metric determines editorial truth.

Clicks do not automatically prove that a recommendation was correct.

---

## 29. Feedback Loop

Every meaningful editorial run should contribute knowledge back into the system.

The learning loop is:

1. observe;
2. identify a specific weakness or opportunity;
3. gather supporting evidence;
4. update the relevant intent, dossier, shared concept or rule;
5. version the change;
6. identify affected pages;
7. refresh where justified;
8. measure the result;
9. retain or revise the change.

### 29.1 No uncontrolled self-modification

Behavioural data may propose:

- an intent-priority change;
- a new question cluster;
- a page refresh;
- a knowledge update;
- a weighting review.

It must not silently rewrite editorial principles, scoring frameworks or evidence standards.

---

## 30. Knowledge Conflict Handling

The system must distinguish:

- two sources disagreeing;
- two products behaving differently;
- two dates describing different product states;
- a shared concept being defined inconsistently;
- an old record conflicting with a newer verified record.

When a conflict is detected:

1. identify the authoritative records;
2. compare dates and scope;
3. determine whether the conflict is real or contextual;
4. preserve both where genuinely unresolved;
5. lower confidence where appropriate;
6. identify affected pages;
7. queue a targeted refresh.

The system must not resolve conflicts by selecting whichever statement is more convenient for the current page.

---

## 31. Duplicate Knowledge and Duplicate Content Prevention

### 31.1 Knowledge duplication

Before creating a new shared concept, the system SHOULD search the shared knowledge registry.

### 31.2 Intent duplication

Before approving a new page, the planner SHOULD check:

- same primary question;
- same decision outcome;
- same scenario;
- same canonical URL intent;
- existing page that could be refreshed instead.

### 31.3 Cannibalisation rule

When two pages substantially answer the same primary intent, the planner should prefer:

- consolidation;
- clearer differentiation;
- canonicalisation;
- redirect where appropriate;

rather than allowing uncontrolled near-duplicate pages.

---

## 32. Editorial Quality Standard

Public content MUST:

- answer the user’s real decision;
- use plain English;
- provide the direct answer early;
- state assumptions where relevant;
- distinguish product fact, evidence, inference and recommendation;
- explain why a feature matters;
- state trade-offs;
- state meaningful uncertainty;
- avoid filler;
- avoid repetitive AI phrasing;
- avoid fake first-hand experience;
- avoid unsupported superlatives;
- use product names only where relevant to the user intent;
- remain useful without an affiliate click;
- include an appropriate next step;
- align with the canonical design and page contracts.

---

## 33. Prohibited Editorial Behaviours

Agents MUST NOT:

- begin with an affiliate product and invent a convenient customer question;
- publish a topic merely because the business wants more pages;
- scrape the entire web when a bounded context package is sufficient;
- scan every dossier for every task;
- duplicate a reusable concept into multiple product folders;
- treat a graph index as more authoritative than source records;
- overwrite conflicting evidence to make a cleaner narrative;
- convert “not found” into “does not exist”;
- stop the workflow merely because evidence is incomplete;
- present affiliate material as independent validation;
- choose a higher-paying affiliate product because it pays more;
- create generic “best 10” filler;
- publish an isolated comparison without a real decision scenario;
- create a new page when refreshing an existing canonical answer is better;
- delete evidence history because a page was archived;
- silently change an editorial rule based on engagement;
- allow an agent to rediscover unrestricted context that the Context Broker should supply.

---

## 34. Required Editorial Records

The editorial system SHOULD maintain:

1. **Product dossier manifest**
2. **Intent registry**
3. **Shared knowledge registry**
4. **Business relationship index or knowledge graph**
5. **Evidence registry**
6. **Content opportunity queue**
7. **Daily editorial brief**
8. **Context-package registry**
9. **Publication manifest**
10. **Refresh queue**
11. **Product-change log**
12. **Knowledge-promotion queue**
13. **Content consolidation log**
14. **Editorial decision log**
15. **Page provenance record**
16. **Affiliate-link health record**
17. **Editorial validation result**

These may begin as repository-local structured files and move to suitable structured storage when implementation demonstrates the need.

---

## 35. Naming and Versioning

Document 6 governs the project-wide naming, versioning and documentation manifest.

For editorial intelligence specifically:

- products use stable product IDs;
- intents use stable intent IDs;
- evidence uses stable evidence IDs;
- claims use stable claim IDs;
- shared concepts use stable knowledge IDs;
- pages use stable page IDs;
- context packages use versioned package IDs;
- daily briefs use date-stamped run IDs;
- opportunity-scoring rules are versioned;
- editorial schemas are versioned.

Changing a display name must not change identity.

---

## 36. Initial Implementation Sequence

The first useful implementation should remain small.

### Stage 1 — Create one real dossier

Use one actual affiliate URL and its supplied material.

### Stage 2 — Establish intake and normalisation

Prove that local files can be registered, normalised and traced.

### Stage 3 — Build the first intent set

Collect real customer questions relevant to that product and category.

### Stage 4 — Establish shared knowledge

Promote the first genuinely reusable concepts.

### Stage 5 — Build relationship indexing

Create the first queryable relationships across product, intent, evidence and shared knowledge.

### Stage 6 — Build Context Broker v1

Generate a focused context package for each of the three page types.

### Stage 7 — Produce one connected three-page set

Use the prepared intelligence to assemble and publish:

- one Decision Hub;
- one Solution Hub;
- one Decision Scenario.

### Stage 8 — Run the first 06:00 editorial brief

RETIRED 2026-10-28: do not schedule a 06:00 editorial brief. An explicitly triggered run may generate a bounded queue from demand, evidence and page state.

### Stage 9 — Prove refresh

Change or add one evidence item and demonstrate that the affected page or knowledge record is identified.

### Stage 10 — Scale only after retrieval works

Add more products and automate more acquisition after the first dossier-to-page flow is reliable.

---

## 37. Phase-One Acceptance Criteria

Document 7 is implemented successfully when:

1. one affiliate URL can create or map to one stable product dossier;
2. owner-supplied affiliate files can be added without losing provenance;
3. a folder update can create an ingestion task;
4. product-specific facts are separated from shared knowledge;
5. real user questions are stored independently of product dossiers;
6. intents can map to multiple products;
7. a reusable shared concept can be referenced by multiple dossiers;
8. business relationships can be queried without requiring a dedicated graph database;
9. the Context Broker can assemble a focused context package;
10. a content worker can operate from that package without scanning the entire knowledge repository;
11. missing or conflicting evidence produces a valid structured result rather than a dead end;
12. one connected Decision Hub, Solution Hub and Decision Scenario can be assembled from the system;
13. each material claim can be traced to evidence or a declared evidence state;
14. multiple product dossiers can support one real decision scenario;
15. (RETIRED 2026-10-28) the 06:00 SAST editorial brief is not an implementation acceptance criterion;
16. a product or evidence change can create a targeted refresh task;
17. pages can be refreshed, consolidated, redirected or archived without deleting underlying knowledge;
18. reusable knowledge can be promoted upward without duplication;
19. affiliate commission does not enter editorial priority or recommendation logic except as a commercial relevance signal after fit is established;
20. the system ends each active editorial day with public value and a durable learning record.

---

## 38. Mandatory Follow-Up Implementation Work

The following are approved but require implementation-level definition:

### 38.1 Physical repository paths

Inspect the existing repository and choose the exact root directories that implement the logical dossier, intent and shared-knowledge structure.

### 38.2 Intake watcher

Choose the simplest reliable local mechanism for detecting new or changed dossier files.

### 38.3 File identity and deduplication

Define hashing, duplicate detection and update behaviour.

### 38.4 Structured schemas

Define the exact machine-readable schemas for:

- dossier manifest;
- intent;
- claim;
- evidence;
- shared knowledge;
- relationship;
- context package;
- opportunity;
- refresh event;
- daily brief.

### 38.5 Context Broker implementation

Define how the broker retrieves and ranks relevant context without overloading worker prompts.

### 38.6 Business graph representation

Begin with the simplest repository-aligned structure. Introduce specialised graph infrastructure only when justified by measured needs.

### 38.7 Opportunity scoring baseline

Create the first versioned weighting using real discovered questions.

### 38.8 Refresh policy matrix

Define claim-specific default freshness windows for high-change and low-change claim types.

### 38.9 06:00 scheduler

RETIRED 2026-10-28: do not implement a 06:00 scheduler. Brief generation is permitted only inside an explicit manual or API-triggered run.

### 38.10 Dossier backup and privacy

Implement the private-evidence backup, access, retention and recovery rules required by the Master PRD and Document 6.

---

## 39. Final Editorial Contract

Vetted SaaS Blueprint must operate as a **living decision-intelligence system**, not an AI article factory.

The editorial system succeeds when:

- affiliate URLs create research opportunities without controlling the editorial answer;
- product dossiers make research reusable;
- customer questions determine what content deserves to exist;
- shared knowledge prevents repeated explanations and inconsistent definitions;
- the business knowledge graph connects products, evidence, needs and decisions;
- the Context Broker gives workers focused context instead of forcing broad discovery;
- evidence uncertainty changes confidence rather than stopping the pipeline;
- multiple product dossiers can support one real customer decision;
- the daily brief chooses work from real demand, evidence and site state;
- maintenance is continuous but bounded;
- page refresh is event-driven with a periodic safety backstop;
- pages may be archived while knowledge remains durable;
- every editorial run improves the underlying intelligence;
- every active publishing day produces useful public decision value.

> **Discover the question first. Prepare the knowledge once. Deliver only the context required. Answer the decision truthfully. Reuse what was learned. Refresh when reality changes.**
