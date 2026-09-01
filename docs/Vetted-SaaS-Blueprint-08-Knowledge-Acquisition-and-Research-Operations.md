---
document_id: VSB-DOC-08
title: Knowledge Acquisition, Research Operations and Intelligence Compounding
owner: Michael Chamboko
status: Working research authority
semantic_version: 1.0.0
last_updated: 2026-08-28
stable_filename: Vetted-SaaS-Blueprint-08-Knowledge-Acquisition-and-Research-Operations.md
supersedes: null
product: Vetted SaaS Blueprint
production_url: https://vettedsaasblueprint.online/
primary_environment: Local-first research and intelligence accumulation with Vercel publication
default_execution_topology: Single primary agent with tools and capability providers
preferred_research_capabilities:
  - last30days
  - Scrapling
required_dependencies:
  - VSB-DOC-01 Market Research and Opportunity Plan
  - VSB-DOC-02 Product Roadmap
  - VSB-DOC-03 AI-First System Architecture and Automation Blueprint
  - VSB-DOC-06 Agent Technology, Implementation and Narrative Interaction Standards
  - VSB-DOC-07 Content Intelligence, Editorial Operations and Knowledge Governance
  - Vetted SaaS Blueprint Master Product Requirements Document
---

# Vetted SaaS Blueprint — Knowledge Acquisition, Research Operations and Intelligence Compounding

## 1. Purpose of This Document

This document defines **how Vetted SaaS Blueprint continuously acquires, validates, refreshes, structures, and compounds research intelligence so that page production becomes progressively faster, more accurate, more useful, and less dependent on expensive real-time reasoning**.

Document 7 defines how editorial intelligence is organised and used.

Document 8 defines how the knowledge required by that editorial system is obtained and kept useful.

The primary objective is:

> **Research once where possible, structure once, reuse everywhere, and keep improving the knowledge base without requiring new information to exist every day.**

The research system exists to make production easier.

It must not become a research project that prevents Vetted SaaS Blueprint from shipping public value.

---

## 2. Research Thesis

The durable asset is not a collection of scraped pages.

The durable asset is **compounding decision intelligence**.

Each research cycle should strengthen one or more of:

- product dossiers;
- intent knowledge;
- evidence records;
- shared knowledge;
- decision criteria;
- customer-language understanding;
- competitive context;
- market-change awareness;
- product-change history;
- business knowledge relationships;
- page-refresh intelligence.

Content is one of the outputs of this intelligence.

Research therefore follows this sequence:

**question or product seed → targeted acquisition → provenance → extraction → normalisation → validation → relationship mapping → persistence → reuse**

The system must not assume that every research run will discover something new.

A research run that finds no meaningful new information is still valid.

Previously validated intelligence remains usable until its freshness rules, evidence state, or a new event says otherwise.

---

## 3. Non-Negotiable Research Principles

### RA-01 — Research compounds

Every useful research result should strengthen a durable knowledge record rather than disappear inside a temporary prompt.

### RA-02 — No-news is a valid result

A research cycle may conclude that no material change was found.

This does not invalidate existing knowledge and does not block content production.

### RA-03 — Existing evidence remains usable according to its evidence and freshness state

The absence of new evidence does not mean existing evidence is obsolete.

### RA-04 — Research is demand-led and decision-led

Research should answer a defined product, evidence, customer-intent, comparison, or freshness question.

Broad exploration must have a bounded purpose.

### RA-05 — Source discovery and truth validation are different tasks

Community discussion can reveal what people care about.

It does not automatically establish product truth.

### RA-06 — Local intelligence is the durable working asset

Useful acquired information should be normalised into the local Vetted SaaS Blueprint knowledge system with source provenance.

### RA-07 — Context should be prepared before page construction

Page-building workers should consume structured research rather than conduct broad discovery from scratch.

### RA-08 — Free-first

Where capability and reliability are acceptable, free and open-source tools are preferred.

Paid services may be introduced only where their value is justified and the system can degrade gracefully without them.

### RA-09 — Capability contracts, not tool captivity

The architecture defines required capabilities.

A tool may internally perform several functions.

The system must not artificially force one tool into only one technical job.

### RA-10 — Research depth must match decision importance

Not every question deserves the same acquisition cost.

High-stakes or high-commercial-value decisions can justify deeper research than low-value supporting facts.

### RA-11 — Evidence uncertainty must survive ingestion

Conflicting, partial, stale, unavailable, or insufficient evidence must remain visible.

Normalisation must not turn uncertainty into false certainty.

### RA-12 — Daily research must never prevent daily delivery

Research supports production.

It does not replace production.

---

## 4. Mandatory Daily Value Delivery Rule

This is a **hard platform requirement** and must later be propagated across the full Vetted SaaS Blueprint documentation set.

### 4.1 Daily public-output mandate

Every active development and operating day MUST end with useful public content delivered to the production site.

The target remains the connected daily content requirement defined by the existing blueprint, including the applicable:

- Decision Hub;
- Solution Hub;
- Decision Scenario.

Development work, automation failures, incomplete research infrastructure, model experiments, scraper failures, or unfinished workflow enhancements do not cancel the daily delivery obligation.

Evidence availability also does not cancel that obligation. The connected daily set must publish with the actual evidence state, including partial, conflicting, missing, stale, or not-yet-researched states. Research changes what can be claimed and what must be refreshed; it never changes whether the set deploys.

Every published page and derived asset remains versioned and revisitable. New, corrected, or materially changed evidence must update the relevant records, create a refresh task, revise the affected live work, and trigger redistribution where the user decision changes. Research and updates continue after publication without blocking the next daily release.

### 4.2 Progressive automation rule

The platform is allowed to be imperfect while it develops.

Day one must still deliver a usable product.

New automation and intelligence capabilities may be introduced progressively.

Each new capability should be tested against the currently working production path.

If a new capability makes production unreliable, the platform should temporarily fall back to the previously proven production path while the new capability is repaired.

### 4.3 Model efficiency ladder

The implementation should progressively prove whether lower-cost or simpler models can reliably complete bounded production tasks.

The current intended pattern is:

1. use the prepared intelligence and deterministic workflow;
2. attempt the task with the approved lower-cost capable model where appropriate;
3. validate the result;
4. escalate when the result cannot satisfy the required contract;
5. preserve successful lower-cost paths for future runs.

Model choice must remain replaceable and versioned.

### 4.4 20:00 SAST delivery escalation

**20:00 SAST is the production-rescue checkpoint unless the implementation later establishes an earlier safer checkpoint.**

If the normal automation has not produced an acceptable daily public deliverable by that checkpoint:

1. stop relying on the unfinished experimental path for that day;
2. preserve its diagnostics for later repair;
3. invoke the premium fallback production path;
4. use **GPT-5.6 Sol** as the current designated high-capability fallback when available;
5. provide Sol with the prepared product dossiers, evidence, intent context, page contracts, and relevant prior production state;
6. complete the required pages;
7. run the minimum required validation;
8. publish the acceptable output to Vercel;
9. record that fallback intervention occurred;
10. return the failed automation path to the improvement queue.

### 4.5 Delivery beats architectural purity

If the automated research or content workflow is not ready, the system must still produce useful pages from the best validated intelligence currently available.

The platform must never say, in effect:

> “The new automation failed, therefore nothing will be published today.”

### 4.6 Later improvement

Fallback-produced pages are not exempt from future improvement.

Once the intended automation becomes reliable, earlier manually or premium-model-produced pages may be:

- re-evaluated;
- enriched;
- redesigned;
- refreshed;
- consolidated;
- improved with new evidence.

The daily-delivery rule guarantees continuity, not permanent acceptance of first-pass quality.

---

## 5. Research Operating Model

The research system operates in two complementary modes.

### 5.1 Continuous intelligence mode

Runs routinely to accumulate and refresh knowledge.

Typical work includes:

- recent-market research;
- product-change checking;
- intent discovery;
- customer-language discovery;
- source refreshes;
- evidence freshness checks;
- competitor and category changes;
- shared-knowledge enrichment.

### 5.2 Targeted production research mode

Runs only when the Context Broker or editorial workflow identifies a specific unresolved question required for a page.

The research task must state:

- what needs to be known;
- why it matters;
- required confidence;
- allowed sources;
- stop conditions;
- output schema.

The targeted mode must not become unrestricted web exploration.

---

## 6. Single-Agent Default

Vetted SaaS Blueprint does **not** require a large multi-agent system.

The default execution topology is:

> **One primary agent executing a structured workflow with tools, providers, deterministic utilities, stored knowledge, and validation contracts.**

The primary agent may invoke capabilities such as:

- last30days;
- Scrapling;
- search;
- browser extraction;
- structured parsers;
- local indexes;
- databases;
- Context Broker retrieval;
- validators.

These capabilities are not automatically treated as separate autonomous agents.

Specialised workers may be introduced later only where measured scale, isolation, reliability, or concurrency justifies them.

Complexity must be earned.

---

## 7. Capability-Based Research Architecture

The system defines capabilities rather than unnecessarily restricting individual tools.

Required capabilities include:

1. recent-conversation discovery;
2. broad web discovery;
3. targeted page extraction;
4. dynamic-page extraction where required;
5. document acquisition;
6. structured parsing;
7. source provenance;
8. deduplication;
9. change detection;
10. evidence classification;
11. intent extraction;
12. entity extraction;
13. relationship extraction;
14. normalisation;
15. persistence;
16. retrieval;
17. freshness evaluation;
18. research summarisation.

A single provider may implement several capabilities.

A provider may also internally call another provider.

That is acceptable so long as:

- the resulting source provenance is preserved;
- failures are visible;
- cost is controlled;
- the output contract remains stable;
- implementation details do not leak into unrelated workflow components.

---

## 8. Preferred Research Providers

### 8.1 last30days

`last30days` is the preferred recent-market and current-conversation research capability.

Its role is to help answer questions such as:

- What are people discussing about this product now?
- What complaints or praise are recurring?
- What language are customers using?
- Which topics are gaining attention?
- What has changed recently?
- Which questions are appearing across communities?
- Which product or category narratives are emerging?
- What should the deeper evidence acquisition workflow investigate?

The current fork is:

`https://github.com/michaelchamboko/last30days`

The capability should be used for **freshness, discovery, customer language, trend context, and research direction**.

It must not be treated as sole proof of vendor facts.

Community engagement establishes importance and discussion, not necessarily factual correctness.

### 8.2 Scrapling

Scrapling is the preferred free-first targeted web acquisition framework where its capabilities fit the task.

Current use cases include:

- known-page extraction;
- website crawling;
- structured content extraction;
- dynamic-page acquisition;
- adaptive scraping;
- targeted source capture;
- repeatable refreshes;
- product-document collection.

The architecture should not hard-code the entire research system to Scrapling.

It should expose a stable acquisition contract so Scrapling can be:

- upgraded;
- wrapped;
- replaced;
- bypassed for specific source types;
- invoked indirectly by another research capability.

### 8.3 Provider composition

`last30days` and Scrapling are not required to be mutually exclusive.

A recent-market research provider may internally use scraping capability.

The architecture cares about the resulting capability and provenance, not an artificial rule that every tool must perform only one low-level job.

---

## 9. Current Provider Baseline as of 27 August 2026

The research architecture should be built against capabilities rather than frozen package versions.

However, implementation should note the current baseline:

### Scrapling

Scrapling remains actively maintained.

The current upstream changelog includes version `0.4.15`, released on 23 August 2026, with improvements including:

- reworked MCP support;
- RAG-oriented Markdown output;
- browser-session reuse;
- continued crawling and extraction improvements.

This supports retaining Scrapling as the preferred default acquisition framework while maintaining a replaceable adapter.

### last30days

The current project is designed to gather and synthesise recent information across sources such as:

- Reddit;
- X;
- YouTube;
- Hacker News;
- GitHub;
- web sources;
- other configured platforms.

Its architecture ranks information using signals such as freshness, relevance, and engagement and can operate with a useful free baseline while optional providers extend coverage.

The implementation must verify the exact installed fork and configuration before relying on any specific provider internally.

---

## 10. Source Roles

The system distinguishes three broad source roles.

### 10.1 Demand sources

Used to identify:

- questions;
- pains;
- terminology;
- objections;
- trends;
- sentiment;
- buying concerns.

Examples:

- Reddit;
- X;
- YouTube comments and transcripts;
- Hacker News;
- forums;
- first-party queries;
- community discussions.

### 10.2 Evidence sources

Used to establish factual product claims.

Examples:

- vendor documentation;
- pricing pages;
- product release notes;
- official security documentation;
- official integration listings;
- trusted technical documentation;
- approved independent sources.

### 10.3 Context sources

Used to understand:

- market changes;
- category direction;
- emerging language;
- competitor positioning;
- broader industry conditions.

One source may serve more than one role.

Its role must be explicit for the claim being made.

---

## 11. Source Hierarchy

The exact source tier rules remain governed by the Master PRD and Approved Source Registry.

Document 8 operationalises them.

For a claim requiring validation, the workflow should generally prefer:

1. authoritative first-party source where appropriate;
2. high-quality independent evidence;
3. reliable specialist source;
4. approved community or user-generated evidence for suitable claim types;
5. discovery-only signals.

Higher source authority does not make every statement universally applicable.

Plan, region, date, product version, and scenario still matter.

---

## 12. Research Acquisition Pipeline

The default pipeline is:

### Step 1 — Receive research question

The task must have a bounded objective.

### Step 2 — Retrieve existing knowledge first

Before acquiring anything new, check:

- product dossier;
- shared knowledge;
- evidence registry;
- intent registry;
- recent research history;
- related change events.

### Step 3 — Determine whether new research is necessary

If existing information is adequate and fresh enough for the decision, reuse it.

Do not browse merely because browsing is possible.

### Step 4 — Discover candidate sources

Use suitable discovery capabilities, including last30days where recent conversation matters.

### Step 5 — Acquire targeted source material

Use the most appropriate acquisition path, including Scrapling where suitable.

### Step 6 — Preserve provenance

Capture:

- URL or source identifier;
- provider;
- retrieval time;
- publication/update date where available;
- source type;
- product or topic;
- acquisition method;
- raw or derived status.

### Step 7 — Extract structured intelligence

Extract only useful information such as:

- facts;
- claims;
- limitations;
- prices;
- plan restrictions;
- capabilities;
- complaints;
- questions;
- outcomes;
- evidence snippets;
- change events;
- relationships.

### Step 8 — Normalise

Map information to stable entities and schemas.

### Step 9 — Compare against existing intelligence

Classify as:

- new;
- confirming;
- changed;
- conflicting;
- duplicate;
- weaker than existing evidence;
- no material change.

### Step 10 — Persist only useful durable results

Do not dump every fetched page into the active knowledge layer.

Raw captures may be retained according to retention rules.

Structured knowledge should remain curated.

### Step 11 — Trigger downstream actions

Possible outputs:

- dossier update;
- evidence update;
- intent update;
- shared-knowledge candidate;
- relationship update;
- refresh task;
- content opportunity;
- conflict review;
- no-change event.

---

## 13. Research-First Reuse Rule

Before any new research call, the system asks:

> **Do we already know enough to answer this responsibly?**

If yes:

- reuse the existing intelligence;
- verify freshness where required;
- continue production.

If no:

- identify the specific missing knowledge;
- research only that gap.

This rule is essential for speed and cost control.

---

## 14. Daily Research Cycle

A routine research cycle should run every day as part of the intelligence-compounding system.

The research cycle may precede or feed the 06:00 SAST editorial brief.

It should consider:

- active affiliate-product dossiers;
- recently changed dossiers;
- high-priority product categories;
- current content opportunities;
- stale high-value claims;
- currently performing pages;
- unanswered customer intents;
- known product-change feeds;
- recent community conversation;
- new products or competitors relevant to active decisions.

### 14.1 Daily research output

The cycle should return:

- material new findings;
- confirmed existing knowledge;
- no-change results;
- detected conflicts;
- newly observed questions;
- changed products;
- changed terminology;
- new evidence candidates;
- freshness warnings;
- dossier updates;
- relationship updates;
- proposed refresh tasks;
- research confidence;
- source references.

### 14.2 No-change behaviour

If nothing material is discovered:

- record the research run;
- update applicable checked-at metadata;
- retain existing validated intelligence;
- do not manufacture novelty;
- do not block the editorial brief;
- proceed to content production from existing knowledge.

---

## 15. Research Compounding

The value of the research system should increase over time.

A mature dossier should require less repeated acquisition because the system already knows:

- core product identity;
- historical pricing;
- feature history;
- plan structure;
- relevant questions;
- recurring objections;
- important comparisons;
- trusted source locations;
- evidence quality;
- change patterns.

New research should increasingly focus on:

- what changed;
- what is newly relevant;
- where evidence is weak;
- what users are newly asking.

This is the compounding effect.

---

## 16. Change Detection

The research system should detect meaningful changes rather than repeatedly reprocess unchanged sources.

Useful mechanisms may include:

- content hashes;
- document hashes;
- ETag or Last-Modified metadata;
- structured field comparison;
- DOM-target comparison;
- feed monitoring;
- release-note monitoring;
- pricing-field comparison;
- sitemap changes;
- dossier file changes;
- previous acquisition fingerprints.

### 16.1 Material-change filter

Not every page modification matters.

The system should prioritise changes affecting:

- price;
- plan;
- capability;
- integration;
- availability;
- limitation;
- policy;
- security;
- compliance;
- affiliate destination;
- user decision logic.

Navigation or cosmetic changes should not automatically trigger editorial refreshes.

---

## 17. Research Stop Conditions

Research must have explicit stop conditions.

A research task should stop when one or more of these is true:

1. required confidence has been reached;
2. the relevant authoritative source has answered the question;
3. sufficient independent corroboration exists;
4. the research budget has been reached;
5. approved sources have been exhausted;
6. further sources are repeating the same information;
7. the result is clearly an unresolved evidence state;
8. the information is not material enough to justify further effort;
9. publication can responsibly proceed with disclosed uncertainty.

“Keep searching until certainty exists” is not an acceptable default.

---

## 18. Research Budgeting

Research should be proportional to expected decision value.

The system should support bounded budgets for:

- number of URLs;
- crawl depth;
- total bytes;
- browser sessions;
- model calls;
- provider calls;
- elapsed execution;
- retries.

Free-first does not mean unlimited.

Compute, time, rate limits, and model tokens are resources.

---

## 19. Deduplication

The system must avoid accumulating duplicate intelligence.

Deduplication should occur at:

- file level;
- URL level;
- canonical-source level;
- content level;
- claim level;
- evidence level;
- intent level;
- entity level.

A duplicate source may still increase confidence if it is genuinely independent.

Repeated copies of the same originating source do not constitute independent corroboration.

---

## 20. Normalisation

Raw acquisition output must not become production truth automatically.

Normalisation should:

- identify canonical entities;
- resolve product names;
- preserve dates;
- preserve plan context;
- preserve region;
- preserve source;
- preserve wording where exact wording matters;
- separate claims from evidence;
- identify uncertainty;
- identify contradictions;
- map customer language to normalised intent without discarding the original language.

---

## 21. Customer-Language Preservation

A key research asset is the language real customers use.

The system should preserve:

- original questions;
- recurring phrases;
- objections;
- problem descriptions;
- desired outcomes;
- emotional framing;
- category terminology;
- comparison language.

This language may inform:

- page headings;
- question framing;
- scenario construction;
- calls to action;
- internal search;
- AEO;
- SEO;
- conversion copy.

Customer language may shape communication.

It must not override factual accuracy.

---

## 22. SEO and AEO Research Support

Research should directly support discoverability.

The system should identify:

- actual question phrasing;
- question clusters;
- related subquestions;
- decision-stage vocabulary;
- entities;
- comparison relationships;
- definitions;
- concise answer opportunities;
- evidence-backed explanatory statements;
- internal-link relationships.

Research should enable pages to answer questions clearly enough for both humans and answer engines.

The system must not produce low-value text merely to cover keyword variants.

---

## 23. Conversion and Commercial Research Support

Vetted SaaS Blueprint is a commercial product.

Research should help understand:

- why a person is considering a product;
- what blocks purchase;
- what creates trust;
- what creates uncertainty;
- what comparison criteria matter;
- which objections recur;
- what outcome the buyer wants;
- when a product is a bad fit;
- what information is needed immediately before a click.

These signals may inform:

- page narrative;
- decision framing;
- proof placement;
- calls to action;
- scenario selection;
- product positioning.

Conversion optimisation must remain subordinate to truthful recommendation and disclosed affiliate relationships.

---

## 24. Research Quality Controls

A research result must not be accepted simply because a provider returned it.

Validation should consider:

- source identity;
- source authority;
- date;
- product/version applicability;
- geographic applicability;
- plan applicability;
- independence;
- corroboration;
- conflicts;
- extraction quality;
- relevance to the actual research question.

Research synthesis must preserve these attributes.

---

## 25. Prompt-Injection and Untrusted Content

Web content is untrusted input.

Acquisition and research workflows must treat page instructions, embedded prompts, hidden text, and malicious content as data rather than instructions.

Scraping tools and browser-based research should use available untrusted-content safeguards.

Research providers must not receive authority to:

- modify local instructions from webpage text;
- expose secrets;
- execute arbitrary external commands;
- override research policy;
- change evidence state based on page instructions.

---

## 26. Failure and Degradation Behaviour

Research infrastructure must degrade gracefully.

### last30days source unavailable

Use the remaining configured sources and existing local intelligence.

### Scrapling extraction fails

Try an approved alternate acquisition method or mark the source as unavailable.

### Dynamic page cannot be captured

Use another approved source or preserve the evidence gap.

### API quota exhausted

Fall back to free/local sources where possible.

### No new information found

Continue using current validated intelligence.

### Research provider gives conflicting output

Persist the conflict and route it through evidence handling.

### Research automation fails completely

Do not cancel the daily publishing obligation.

Invoke the production fallback path before the daily cutoff.

---

## 27. Storage Boundary

Research output should be divided into:

### Raw acquisition

Examples:

- downloaded documents;
- source captures;
- HTML;
- source JSON;
- transcripts;
- screenshots where approved.

### Normalised intelligence

Examples:

- evidence records;
- claims;
- product facts;
- intents;
- change events;
- relationships;
- shared concepts.

### Derived synthesis

Examples:

- recent-market briefs;
- research summaries;
- proposed questions;
- opportunity recommendations.

Derived synthesis is not automatically evidence.

Its underlying sources remain authoritative.

---

## 28. Retrieval and the Business Knowledge Layer

Research outputs ultimately feed the knowledge architecture defined in Document 7.

This includes:

- product dossiers;
- shared knowledge;
- intent registry;
- evidence registry;
- business relationships.

The system may build indexes over this information.

Engineering tools such as code graphs or code-context systems are not the canonical home for business knowledge.

They may help implement or navigate the software.

The business knowledge layer must remain separately understandable and portable.

---

## 29. Research-to-Context Contract

Research does not directly write public pages.

Its durable output is made available to the Context Broker.

The broker selects the applicable slice for the production task.

This means the page-building path should increasingly look like:

**intent → retrieve prepared knowledge → targeted gap research if needed → context package → page assembly → validation → publication**

rather than:

**prompt → entire web → large model → page**

---

## 30. Research Run Record

Every material research run should record:

- research run ID;
- date/time;
- research purpose;
- triggering task;
- product/category;
- question;
- providers used;
- sources used;
- acquisition budget;
- results found;
- no-change state where applicable;
- conflicts;
- persisted records;
- affected dossiers;
- affected pages;
- follow-up tasks;
- confidence;
- errors;
- fallback behaviour.

This makes research auditable and helps determine which providers actually add value.

---

## 31. Provider Evaluation

Providers should be measured on useful outcomes rather than novelty.

Evaluation dimensions should include:

- useful findings per run;
- unique findings;
- factual accuracy;
- extraction reliability;
- source provenance quality;
- freshness;
- cost;
- runtime;
- failure rate;
- duplicate rate;
- ability to work locally;
- free-tier usefulness;
- maintainability.

A fashionable provider should not replace a proven provider without evidence that it improves the system.

---

## 32. Provider Replacement Rule

The research architecture must make provider replacement straightforward.

A new tool can replace or supplement an existing provider when it demonstrates a meaningful improvement in one or more of:

- coverage;
- accuracy;
- reliability;
- speed;
- cost;
- local execution;
- structured output;
- maintenance;
- anti-breakage behaviour.

Replacement must not require rewriting:

- dossier schemas;
- evidence schemas;
- context packages;
- page contracts;
- editorial rules.

---

## 33. Research Acceptance Criteria

A research task is complete when:

1. its research question is answered to the required evidence level; or
2. the applicable evidence state is responsibly established; and
3. provenance is captured; and
4. useful durable knowledge is normalised; and
5. conflicts remain visible; and
6. no unnecessary duplicate knowledge is created; and
7. downstream actions are identified; and
8. the task stops rather than continuing indefinitely.

A task does not fail merely because the answer is “no material new information found.”

---

## 34. Daily Research Success Criteria

The daily research cycle succeeds when it:

1. checks the highest-priority active research areas;
2. identifies meaningful changes where they exist;
3. identifies customer-intent changes where they exist;
4. records no-change states honestly;
5. improves or confirms the durable knowledge base;
6. provides actionable inputs to the 06:00 editorial brief;
7. stays inside its resource budget;
8. does not delay the daily public-output mandate.

---

## 35. Phase-One Implementation Acceptance Criteria

Document 8 is implemented successfully when:

1. one existing product dossier can be checked before new research is performed;
2. the system can decide that existing intelligence is sufficient;
3. last30days can be invoked through a stable capability contract;
4. Scrapling can be invoked through a stable acquisition contract;
5. provider provenance is retained;
6. raw source material is separated from normalised intelligence;
7. duplicate source material is detected;
8. a source change can be detected;
9. a material product change can update the correct dossier record;
10. a recent community question can enter the intent system without becoming unverified product truth;
11. conflicting evidence remains conflicting;
12. a no-change research run completes successfully;
13. research results can update the business knowledge relationships;
14. the Context Broker can consume the resulting structured intelligence;
15. a page can be produced from previously accumulated intelligence without mandatory fresh scraping;
16. the research system can degrade when one provider is unavailable;
17. an automation failure cannot prevent the daily publishing fallback;
18. the 20:00 SAST rescue rule can trigger the premium fallback path;
19. fallback intervention is logged;
20. failed experimental work returns to the improvement queue after the day's production obligation is satisfied.

---

## 36. Architecture Review Register

This section deliberately captures decisions that must be reconciled across the wider blueprint when the project returns to Codex.

It is not optional cleanup.

It is an explicit implementation input.

### ARR-001 — Global Daily Value Delivery Mandate

**Decision**

Every active day must produce useful public Vetted SaaS Blueprint output.

Automation or development failure does not cancel delivery.

**Required follow-up**

Create a platform-wide operating-principles amendment and propagate this rule across all applicable Documents 1–8 and implementation plans.

**Current required fallback**

At the 20:00 SAST rescue checkpoint, use the premium production fallback, currently GPT-5.6 Sol where available, to complete and publish the required pages if the automated path has failed.

**Status**

OPEN — captured here; requires cross-document propagation in Codex.

### ARR-002 — Single-Agent Default

**Decision**

Do not build a multi-agent architecture merely because the workflow contains several responsibilities.

Default to one primary agent plus tools/capability providers.

**Required follow-up**

Review all Documents 1–8 and implementation plans for language that unnecessarily mandates multiple autonomous agents.

Replace it with capability/role language unless a genuinely independent agent is justified.

**Status**

OPEN — requires documentation sweep.

### ARR-003 — Provider Capability Boundaries

**Decision**

Research tools are governed by capability contracts, not artificial one-tool/one-task boundaries.

A provider such as last30days may internally use scraping capability.

**Required follow-up**

Remove conflicting implementation assumptions that treat Scrapling, last30days, or other providers as mutually exclusive single-purpose components.

**Status**

OPEN — requires implementation mapping.

### ARR-004 — Compounding Intelligence Before Repeated Research

**Decision**

Workers must retrieve existing structured knowledge before launching new acquisition.

No-new-information is a valid research result.

**Required follow-up**

Ensure all research and content plans explicitly support reuse-first behaviour and no-change completion.

**Status**

OPEN — requires implementation verification.

### ARR-005 — Deferred Requirements Sweep

**Decision**

Several blueprint documents contain sections such as:

- mandatory follow-up implementation work;
- deferred implementation decisions;
- acceptance criteria;
- open architecture decisions;
- future validation items.

These must not be forgotten when coding begins.

**Required follow-up**

Codex must scan the complete approved documentation set, extract every unresolved/deferred requirement, deduplicate them, identify conflicts, and create one implementation review register.

No unresolved item should depend on human memory.

**Status**

OPEN — mandatory Codex bootstrap task.

### ARR-006 — Global Operating Principles Amendment

**Decision**

A single global amendment should capture cross-cutting rules that were agreed after earlier documents had already been saved.

**Required follow-up**

Codex should create the global amendment only after reviewing all existing documents so it does not create competing authority.

At minimum it must include:

- daily value delivery;
- progressive automation;
- graceful fallback;
- single-agent default;
- free-first capability selection;
- reusable knowledge before repeated research;
- evidence uncertainty as a valid state;
- context delivered rather than rediscovered.

**Status**

OPEN — create during documentation reconciliation.

---

## 37. Architecture Decision Log

This records why important decisions were made so they are not repeatedly reopened without new evidence.

### ADR-08-001 — Single primary agent

**Decision**

Use one primary agent by default.

**Reason**

Reduces orchestration complexity, token overhead, debugging surface, handoff failure, and unnecessary architecture.

**Trade-off**

Less parallel autonomous execution.

**Revisit when**

Measured workload, concurrency, isolation, or reliability proves a multi-agent topology materially better.

### ADR-08-002 — Scrapling remains preferred acquisition framework

**Decision**

Keep Scrapling as the current preferred free-first scraping/acquisition framework.

**Reason**

It has already worked in the project, remains actively maintained, supports broad crawling/extraction capabilities, and fits the local/free-first strategy.

**Trade-off**

No permanent dependency should be created.

**Revisit when**

A replacement demonstrates materially better reliability, coverage, cost, or maintenance.

### ADR-08-003 — last30days as recent-intelligence capability

**Decision**

Use last30days as a preferred current-market and conversation-research capability.

**Reason**

It brings recent cross-source signals together and directly supports customer-intent, freshness, language, and trend research.

**Trade-off**

Not every configured source is free or authoritative evidence.

**Revisit when**

Coverage, source access, maintenance, cost, or accuracy changes materially.

### ADR-08-004 — Research daily, novelty not required

**Decision**

Run routine research daily, but do not require every run to discover new information.

**Reason**

Existing validated intelligence remains valuable and compounding requires confirmation and change detection as well as novelty.

**Trade-off**

Some daily research runs will intentionally produce “no material change.”

### ADR-08-005 — Daily production outranks automation completion

**Decision**

If the developing automation cannot deliver the required public output, use the working or premium fallback production path.

**Reason**

Vetted SaaS Blueprint is a live commercial product and must accumulate public value while its automation matures.

**Trade-off**

Some early pages may later need enhancement or rebuilding.

---

## 38. Mandatory Codex Bootstrap Instruction

When implementation work resumes in Codex, the first documentation-reconciliation task should be:

> **Read the complete approved Vetted SaaS Blueprint documentation set. Extract every mandatory requirement, deferred implementation item, acceptance criterion, open decision, follow-up action, and cross-document dependency. Build a deduplicated review register. Identify contradictions and authority conflicts. Apply the open Architecture Review Register items in Document 8, including the Global Daily Value Delivery Mandate. Do not silently discard any approved requirement. Produce a proposed amendment set before changing existing authority documents.**

This requirement exists specifically so that decisions made across extended planning discussions do not depend on the owner remembering them later.

---

## 39. Implementation Sequence

The first research implementation should remain pragmatic.

### Stage 1 — Reuse-first retrieval

Before adding more scraping, prove the system can retrieve existing dossier intelligence.

### Stage 2 — last30days capability

Connect recent-market research through a stable provider interface.

### Stage 3 — Scrapling capability

Connect targeted acquisition through a stable provider interface.

### Stage 4 — Provenance and deduplication

Ensure both acquisition paths produce traceable structured records.

### Stage 5 — Change detection

Prove one known source can change without forcing full re-research.

### Stage 6 — No-change success path

Prove a daily run can correctly conclude that nothing material changed.

### Stage 7 — Context integration

Feed research output into the Context Broker.

### Stage 8 — Daily brief integration

Use the accumulated research to prepare the editorial work queue.

### Stage 9 — Low-cost production trials

Test whether prepared context allows simpler approved models to produce acceptable bounded outputs.

### Stage 10 — Delivery fallback

Prove the 20:00 SAST rescue path can complete production if the normal workflow is unsuccessful.

### Stage 11 — Optimise after reliability

Only then increase autonomy, crawl breadth, provider count, and scheduling complexity.

---

## 40. Final Research Contract

The Vetted SaaS Blueprint research system must behave like a **compounding commercial intelligence engine**, not an endless scraper.

It succeeds when:

- research begins from a defined decision or intelligence need;
- existing knowledge is checked before new acquisition;
- validated prior research remains useful when no new information exists;
- daily research strengthens or confirms the knowledge base;
- recent conversations reveal what people care about;
- authoritative sources establish product facts;
- Scrapling provides a strong free-first acquisition path without becoming an architectural prison;
- last30days provides a strong recent-intelligence path without being mistaken for universal evidence;
- provider details can change without rewriting the editorial system;
- customer language improves relevance, SEO, AEO, and conversion communication;
- uncertainty is preserved;
- changed facts trigger targeted refresh;
- no-change research is accepted;
- page workers receive prepared intelligence;
- simpler models are given a fair opportunity to execute bounded work efficiently;
- premium reasoning remains an escalation path;
- unfinished automation never becomes an excuse for publishing nothing;
- every active day leaves Vetted SaaS Blueprint with more public value, more reusable intelligence, or preferably both.

> **Research continuously. Reuse aggressively. Detect change precisely. Preserve uncertainty. Build from prepared intelligence. Ship every day.**
