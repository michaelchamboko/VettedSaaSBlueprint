# Vetted SaaS Blueprint — Master Product Requirements Document

**Version:** 1.0  
**Status:** Working product-definition draft  
**Date:** 27 August 2026  
**Product owner:** Michael Chamboko  
**Document purpose:** Define the product, content system, evidence system, decision logic, workflows, data requirements, commercial model, and acceptance conditions before implementation planning.

---

## 1. Document Authority and Boundaries

This document records the product decisions agreed during the discovery discussion. It is the authoritative product definition for the current planning phase.

The words **MUST**, **SHOULD**, and **MAY** are used deliberately:

- **MUST** means the requirement is mandatory.
- **SHOULD** means the requirement is expected unless planning identifies a documented reason not to implement it.
- **MAY** means the capability is optional or planned for a later phase.

This PRD defines **what the product must achieve** and the high-level rules that keep it consistent. Detailed implementation tasks, exact service configuration, source-domain allowlists, scoring formulas, user-interface design, and test cases will be completed in the relevant companion documents and implementation plan.

---

## 2. Executive Summary

Vetted SaaS Blueprint will become an **evidence-driven SaaS decision platform**, not a conventional affiliate blog.

The platform will help a person:

1. Understand the business problem they are actually trying to solve.
2. Identify pain points, constraints, hidden risks, and desired outcomes.
3. Understand which decision factors matter in their situation.
4. See evidence-backed solution paths.
5. Select the best-fit SaaS product with clear reasoning, trade-offs, and confidence.
6. Take a commercial next step through an appropriate affiliate link or request a personalised decision asset.

The platform’s central differentiator is not access to exclusive vendor data. Its competitive advantage will come from:

- a repeatable evidence-gathering method;
- an approved source registry;
- structured product intelligence;
- transparent confidence and conflict handling;
- the **Vetted Evaluation Framework**;
- buyer-context-aware recommendation logic;
- deterministic workflows;
- decision-focused page formats;
- reusable evidence and scoring data;
- clear explanations of why a recommendation applies.

The product will organise knowledge around **customer decisions**, not around products.

> **Never lead with the software. Always lead with the customer’s problem, desired outcome, context, and decision.**

Affiliate links are the commercial endpoint of a trusted decision journey. They must never influence the score, recommendation, or presentation of evidence.

---

## 3. Product Vision

### 3.1 Vision Statement

Build the most useful and trusted place for a person to answer:

> “What is the right software for my actual situation, and why?”

Vetted SaaS Blueprint should become the source people consult before buying or changing software because it understands the problem, evaluates the relevant evidence, explains uncertainty, and makes conditional recommendations rather than publishing generic rankings.

### 3.2 Intended Market Position

Vetted SaaS Blueprint is positioned as a **software intelligence and decision-support platform**.

It is not positioned as:

- a generic SaaS directory;
- a vendor catalogue;
- a conventional affiliate blog;
- a “top ten tools” publisher;
- a product-review website;
- a benchmark-news website;
- a substitute for the vendor’s own documentation;
- an unstructured AI-generated content farm.

### 3.3 Core Product Promise

For every meaningful recommendation, the user should be able to see:

- **who** the recommendation is for;
- **which problem** it addresses;
- **which conditions** must be true;
- **which evidence** supports it;
- **which trade-offs** exist;
- **who should not choose it**;
- **how confident** Vetted SaaS Blueprint is;
- **when the evidence was last checked**.

---

## 4. Problem and Opportunity

### 4.1 User Problem

People shopping for SaaS products are commonly confronted by:

- generic “best software” lists;
- repeated vendor feature descriptions;
- undisclosed or poorly disclosed commercial bias;
- product rankings without a visible method;
- scores based on unexplained opinions;
- star-rating averages that hide conflicting experiences;
- stale prices and features;
- benchmark claims that do not reflect practical use;
- content that describes software but does not diagnose the user’s actual problem;
- long articles designed around word count rather than decision usefulness.

Users generally do not want more software information. They want confidence that they are making a suitable decision without wasting money, time, or implementation effort.

### 4.2 Business Opportunity

Vetted SaaS Blueprint can create a defensible affiliate business by becoming better at **decision clarity**, rather than attempting to out-publish large incumbents on generic product terms.

The opportunity is to serve question-shaped and outcome-shaped intent such as:

- “How can I reduce video production time?”
- “What should a five-person team use when budget is limited?”
- “Should I switch from my current email platform?”
- “Which option will be easier for a non-technical team?”
- “Is the higher-priced plan justified for my use case?”
- “What will integrate with the systems I already use?”
- “What hidden costs should I expect?”
- “Which product fits this exact scenario?”

The platform’s content and interactive tools should answer those decisions directly and introduce products only where the evidence shows a fit.

---

## 5. Product Goals

The product MUST:

1. Reduce uncertainty around SaaS purchasing decisions.
2. Diagnose the user’s problem before presenting software.
3. Convert product research into structured, reusable intelligence.
4. Generate recommendations from evidence and explicit rules.
5. Separate product quality, contextual fit, and evidence strength.
6. Show uncertainty honestly rather than manufacturing certainty.
7. Continue processing when evidence is missing, partial, or conflicting.
8. Prevent unrestricted AI agents from inventing page structures, claims, or scores.
9. Support public pages that are useful to humans and extractable by search and answer engines.
10. create a repeatable organic acquisition system through SEO, AEO, and later distribution channels.
11. Generate affiliate revenue without allowing commission rates to alter recommendations.
12. Capture qualified email leads through context-relevant decision assets.
13. Use the same evidence and decision logic across pages, reports, and future interactive tools.
14. Improve over time through versioned evidence refreshes, feedback signals, and controlled scoring updates.

---

## 6. Non-Goals

The initial product MUST NOT:

- publish generic “best 10” listicles;
- publish filler content to reach a target word count;
- lead pages with a product name unless the user’s actual query is explicitly product-specific;
- produce conventional “Product X Review” pages as a primary content strategy;
- reproduce information already adequately covered by a vendor’s product page;
- publish broad “how to use Product X” tutorials without a decision-support purpose;
- treat star ratings as objective product truth;
- use a single source as sufficient evidence for subjective claims;
- infer that missing evidence means a feature or quality is absent;
- treat “no evidence found” as a workflow error;
- expose the complete raw evidence repository publicly;
- allow a language model to control the overall workflow;
- allow affiliate commission value to influence rankings or recommendations;
- claim first-hand product testing when no first-hand test occurred;
- publish unsupported superlatives such as “best,” “fastest,” or “easiest” without a defined context and evidence;
- manipulate users through false urgency, fear, hidden defaults, or misleading design.

---

## 7. Target Users and Core Jobs

### 7.1 Primary User States

The system MUST recognise at least the following buyer states:

1. **New buyer** — selecting a tool for the first time.
2. **Switcher** — replacing an existing tool because of dissatisfaction or changing needs.
3. **Scaler** — needing a tool that can support increased users, data, workflows, or complexity.
4. **Cost reducer** — trying to lower current spend or avoid unnecessary features.
5. **Capability seeker** — needing a specific outcome or feature set.
6. **Integration seeker** — needing compatibility with an existing technology stack.
7. **Risk-sensitive buyer** — prioritising reliability, security, privacy, or compliance.
8. **Internal champion** — needing evidence to justify a purchase to management or colleagues.
9. **Shortlist buyer** — deciding between two or more already identified options.
10. **Problem-aware but solution-uncertain user** — knows the pain but does not yet know which software category or approach is appropriate.

### 7.2 Core Jobs to Be Done

Users should be able to use the platform to:

- identify the root problem behind a software need;
- discover pain points they may not yet have recognised;
- clarify their desired outcome;
- identify must-have constraints;
- understand which features matter and which do not;
- estimate total cost and implementation burden;
- understand trade-offs between viable options;
- determine whether a product is suitable for their specific context;
- understand the strength and limitations of the available evidence;
- produce a shortlist;
- obtain a personalised decision report;
- confidently continue to a vendor through an affiliate link.

---

## 8. Core Product Principles

### 8.1 Customer Problem First

Every public experience MUST begin with the customer’s problem, desired outcome, buyer state, or decision.

Products are introduced only after the user’s situation has been understood.

### 8.2 Decisions, Not Product Descriptions

The platform MUST organise knowledge around decisions and outcomes, not around software catalogues.

> **We organise knowledge around customer decisions, not products.**

### 8.3 Reduce Uncertainty

Every section, question, score, comparison, and call to action MUST have a defined role in reducing uncertainty.

A content block that does not remove a meaningful uncertainty must not be included.

### 8.4 Questions and Answers Use Different Source Pipelines

> **Questions come from the crowd. Answers come from evidence.**

Community conversations, search behaviour, forums, support threads, and FAQs reveal what people worry about. They do not automatically prove the answer.

Official documentation, approved independent sources, and corroborated evidence provide the answer.

### 8.5 No Evidence Is a Valid Output

Missing evidence MUST NOT halt the workflow.

The result must instead state:

- what was searched;
- what was not found;
- what remains uncertain;
- what conclusion cannot responsibly be made;
- when or how the evidence should be checked again.

The connected daily three-page decision set MUST deploy for every evidence state, including `partial`, `conflicting`, `insufficient_evidence`, `not_yet_researched`, and `stale`. Evidence state changes the claim, confidence, and presentation; it never changes the delivery obligation.

Every public page and derived asset MUST remain versioned and revisitable. New, corrected, or materially changed evidence MUST create a refresh task, update the affected live work, preserve the prior state in history, and trigger redistribution when the change affects the user decision.

### 8.6 Conditional Recommendations

Recommendations MUST be conditional, not absolute.

The required format is conceptually:

> “Choose Product A if these conditions apply. Choose Product B if these other conditions apply.”

The platform must avoid presenting a universal winner where the correct answer depends on context.

### 8.7 Explainability

Every score and recommendation MUST be accompanied by a plain-English reason.

Numbers without reasons are insufficient.

### 8.8 Evidence Before Opinion

Agents may extract, summarise, classify, and compare evidence. They may not invent claims, fill gaps with assumptions, or turn marketing language into verified fact.

### 8.9 Ethical Decision Psychology

The product MUST use evidence-based online buying and decision psychology to:

- recognise the user’s problem;
- clarify the consequence of leaving it unresolved;
- expose root causes;
- translate features into business outcomes;
- present manageable trade-offs;
- reduce perceived risk;
- build justified confidence;
- provide a clear next step.

It MUST NOT use manipulative persuasion.

### 8.10 Workflow Owns the Process

> **The workflow owns the process. AI performs bounded tasks inside that process.**

The sequence, states, schemas, retries, validation, and failure handling are deterministic. AI models are interchangeable workers.

### 8.11 Reuse One Source of Truth

Evidence must be captured once and reused across:

- Decision Hubs;
- Solution Hubs;
- Decision Scenarios;
- personalised reports;
- future recommendation tools;
- score updates;
- public citations;
- refresh workflows.

### 8.12 Decision Completion, Not Word Count

A page is complete when it has answered the relevant decision, not when it reaches an arbitrary length.

An 800-word page with complete reasoning can be superior to a 3,000-word page with filler.

---

## 9. Product System Overview

The product consists of the following logical systems:

1. **Question Discovery System**  
   Finds and structures real user problems, questions, pain points, constraints, and desired outcomes.

2. **Approved Source Registry**  
   Defines which sources agents may use, for which claim types, under which conditions, and with which freshness rules.

3. **Evidence Collection and Normalisation System**  
   Collects claims, source metadata, dates, excerpts, summaries, and optional private captures.

4. **Evidence Confidence System**  
   evaluates source quality, directness, recency, corroboration, specificity, and conflict.

5. **Vetted Evaluation Framework**  
   Scores product quality and category-relevant characteristics using defined criteria.

6. **Vetted Decision Orchestrator**  
   Classifies the buyer’s context and selects the required decision path, content blocks, criteria weights, and recommendation rules.

7. **Content Assembly System**  
   Builds public pages from validated structured blocks rather than asking an agent to write an unrestricted article.

8. **Lead Generation and Decision Asset System**  
   Creates context-relevant reports, checklists, scorecards, and calculators in exchange for a user’s email when requested.

9. **Affiliate Conversion Layer**  
   Presents clearly disclosed commercial next steps after the fit and reasoning have been established.

10. **Feedback and Refresh System**  
    Monitors evidence age, product changes, user signals, content usefulness, and scoring-model performance.

11. **Future Vetted Decision Engine**  
    An interactive rule-based selector that returns the two strongest fits for a user’s stated context.

---

## 10. Question Discovery and Customer Intelligence

### 10.1 Purpose

Question discovery identifies what users are genuinely trying to understand, fear, avoid, achieve, or justify.

Agents MUST NOT invent a set of convenient questions and treat it as customer research.

### 10.2 Approved Question Sources

Question sources MAY include:

- search queries and query variations;
- People Also Ask results;
- relevant Reddit communities;
- specialist forums;
- product support communities;
- vendor FAQ pages;
- public product-review text;
- public social discussions;
- customer-support questions where lawfully available;
- site-search data and future first-party user questions.

The final source list and collection methods must be defined in the Approved Source Registry and relevant implementation plan.

### 10.3 Required Question Domains

A page must not be built from one discovered question. The discovery workflow MUST attempt to populate all applicable information domains:

1. **Problem and pain domain**  
   What is going wrong today?

2. **Desired outcome domain**  
   What does the person want to achieve?

3. **Root-cause domain**  
   Why is the problem occurring?

4. **Hidden-pain domain**  
   Which secondary costs, risks, or constraints may not be obvious yet?

5. **Buyer-context domain**  
   What are the team size, skill level, industry, existing tools, location, and operational conditions?

6. **Budget and value domain**  
   What can the user spend, and which costs matter beyond the advertised price?

7. **Capability domain**  
   Which functions are essential, optional, or irrelevant?

8. **Adoption and usability domain**  
   How much setup, learning, migration, and ongoing administration can the user tolerate?

9. **Integration and ecosystem domain**  
   What must the solution connect to or replace?

10. **Reliability and support domain**  
    What service continuity and assistance are required?

11. **Trust, privacy, and compliance domain**  
    Which security, data, contractual, or regulatory considerations matter?

12. **Risk and objection domain**  
    What may prevent the user from choosing or successfully adopting a solution?

13. **Alternative and trade-off domain**  
    What other approaches or products should be considered?

14. **Decision and next-step domain**  
    What information will allow the user to proceed confidently?

### 10.4 Question Record

Each validated question SHOULD include:

- question ID;
- original wording;
- normalised wording;
- source URL or source reference;
- source type;
- date observed;
- category;
- product references, if any;
- buyer state;
- pain-point cluster;
- desired outcome;
- purchase stage;
- search or discussion frequency signal where available;
- business consequence;
- specificity;
- evidence availability;
- priority score;
- status;
- related questions.

### 10.5 Question Selection Rules

Questions SHOULD be prioritised using:

- relevance to a real business decision;
- recurrence across independent sources;
- specificity;
- business consequence;
- purchasing intent;
- uncertainty level;
- ability to answer responsibly with evidence;
- freshness;
- distinction from generic vendor documentation.

A question with no available evidence may still be retained and published as an explicit uncertainty where that uncertainty is itself valuable.

---

## 11. Approved Source Registry

### 11.1 Purpose

The Approved Source Registry prevents agents from spending days browsing low-quality sources or using unsuitable evidence.

Agents MUST NOT perform unrestricted web research.

### 11.2 Registry Requirements

Each registered source or domain MUST define:

- source name;
- domain;
- source tier;
- allowed claim types;
- disallowed claim types;
- geographic relevance;
- freshness expectations;
- whether direct quotation is permitted;
- whether screenshots or local captures are permitted;
- access method;
- paywall or login limitations;
- credibility notes;
- conflict-of-interest notes;
- review frequency;
- active, restricted, or retired status.

### 11.3 Initial Source Tiers

#### Tier 1 — Primary Product Sources

Used first for factual product claims:

- official product pages;
- official pricing pages;
- official documentation;
- official integration directories;
- official API documentation;
- official security and compliance pages;
- official privacy and data-processing documents;
- official status pages;
- official release notes and changelogs;
- official support-policy pages.

Vendor marketing statements such as “easy,” “fast,” or “best” are claims, not verified facts.

#### Tier 2 — Approved Independent Evidence Sources

Used to corroborate experience, practical limits, market context, or product behaviour:

- named analyst or research organisations;
- approved independent software-review platforms;
- approved technical publications;
- approved expert demonstrations and walkthroughs;
- approved benchmark or test sources where the methodology is suitable.

The exact named domain allowlist is a mandatory planning deliverable before the automated research workflow is implemented.

#### Tier 3 — Community and Experience Sources

Used primarily to discover questions and identify recurring themes:

- Reddit;
- specialist forums;
- public support communities;
- public review text;
- relevant social discussions;
- independent user videos.

These sources may support a sentiment pattern but must not independently establish a product fact.

### 11.4 Claim-Type Verification Rules

Examples:

- **Price:** official pricing page first; current date and region required.
- **Feature availability:** official documentation first.
- **Integration:** official directory or API documentation, followed by a spot check where required.
- **Security certification:** official trust or compliance documentation; certificate status must be verified where possible.
- **Usability:** multiple independent experience sources or a documented first-hand test.
- **Performance:** suitable independent testing or clearly described first-hand testing; vendor claim alone is insufficient.
- **Support quality:** documented service levels plus corroborated recurring experience themes.
- **Uptime:** official status history or a suitable independent service; absence of public history must be marked as unknown.
- **Sentiment:** recurring reasons across multiple sources, not a raw average of star ratings.

### 11.5 Bounded Search Policy

Every research task MUST have explicit stop conditions.

The workflow must define:

- approved domains;
- maximum sources per claim;
- maximum search attempts;
- maximum retries;
- freshness window;
- fallback order;
- time or cost budget;
- conditions for returning “insufficient evidence.”

After the approved strategy is exhausted, the system MUST record the evidence state and continue. It must not browse indefinitely.

---

## 12. Evidence System

### 12.1 Evidence Principle

The system evaluates evidence, not reputations or popularity alone.

A highly recognisable source is not automatically correct. A smaller source is not automatically wrong. The system must evaluate whether the evidence is:

- primary or secondary;
- direct or inferred;
- specific to the claim;
- recent enough;
- independently corroborated;
- transparent about method;
- relevant to the user’s category and context;
- affected by a commercial or political conflict.

### 12.2 Evidence States

Every claim or research task MUST return one of these valid states:

1. **Strong evidence**  
   Direct, relevant, recent, and appropriately corroborated.

2. **Moderate evidence**  
   Useful evidence exists but has a limitation such as age, limited corroboration, or indirectness.

3. **Partial evidence**  
   Some parts are supported, but the full claim cannot be verified.

4. **Conflicting evidence**  
   Credible sources disagree or describe materially different experiences.

5. **Insufficient evidence**  
   The approved search strategy was completed without adequate support.

6. **Not applicable**  
   The criterion does not apply to the product, category, or user context.

7. **Not yet researched**  
   The workflow has not completed the required research.

“No evidence” and “not yet researched” must never be treated as the same state.

### 12.3 Evidence Record

Each evidence record SHOULD include:

- evidence ID;
- product ID;
- category ID;
- claim ID;
- claim type;
- canonical claim;
- source URL;
- source domain;
- source title;
- source organisation or author;
- source tier;
- publication or update date where available;
- access date;
- geographic or plan scope;
- short permitted excerpt where useful;
- structured summary;
- local screenshot or capture reference where used;
- extraction method;
- directness rating;
- recency rating;
- corroboration links;
- conflict links;
- evidence state;
- confidence score;
- evaluator or agent ID;
- verification date;
- expiry or review date;
- evidence version;
- audit notes.

### 12.4 Raw Evidence Storage

Raw research material is private intellectual property.

The initial implementation MUST follow these rules:

- raw screenshots, archived extracts, notes, and research artefacts remain in a private evidence repository controlled by the owner;
- the raw evidence repository is not a public website section;
- the complete evidence repository is not exposed through a public API;
- full webpages and full videos are not copied into the application database;
- the public experience displays only the minimum cited excerpt, source metadata, date, and reasoning required for transparency;
- the application database may contain normalised public citation metadata and generated product intelligence, but not unrestricted raw research artefacts;
- the precise local repository format, backup process, encryption, retention, and machine-to-deployment transfer process must be defined during technical planning.

### 12.5 Conflict Handling

The system MUST NOT hide disagreement inside an average score.

When credible evidence conflicts, the output must state:

- which findings conflict;
- whether the sources examined different plans, regions, user types, or dates;
- the likely reason for disagreement, if supportable;
- the remaining uncertainty;
- how the conflict affects confidence;
- which user contexts may experience different results.

### 12.6 Sentiment Handling

Sentiment is a consistency signal, not a vote.

The system MUST:

- identify recurring reasons, not merely star values;
- distinguish positive and negative themes;
- record which user cohorts or plan levels reported the theme;
- require multiple independent sources before assigning a strong sentiment pattern;
- reduce confidence when themes are vague, old, commercially influenced, or contradictory;
- use sentiment as supporting evidence rather than the dominant score;
- show the reason behind the sentiment.

Example:

- Weak output: “Users rate support 4.6/5.”
- Preferred output: “Across three approved sources, users repeatedly praised the onboarding support, while lower-tier users reported slower response times. Confidence: moderate.”

---

## 13. Vetted Evaluation Framework

### 13.1 Purpose

The Vetted Evaluation Framework is the central scoring and interpretation method.

It converts structured evidence into three separate outputs:

1. **Product Score**  
   How strongly the product performs against the category’s defined baseline.

2. **Fit Score**  
   How well the product matches a specific buyer’s context, constraints, and desired outcome.

3. **Evidence Confidence Score**  
   How strong, current, direct, and corroborated the supporting evidence is.

These scores MUST remain separate. A strong product can be a poor fit. A high fit score can still have low evidence confidence.

### 13.2 Evaluation Criteria

#### Criterion 1 — Value and Total Cost

Evaluate:

- entry price;
- plan required for the needed capability;
- pricing transparency;
- billing period;
- usage limits;
- seat limits;
- required add-ons;
- implementation fees;
- migration cost;
- contract commitment;
- cancellation conditions;
- cost at the user’s expected scale;
- likely administration cost;
- free plan or trial limitations;
- value relative to the required outcome.

Advertised price alone is insufficient.

#### Criterion 2 — Capability and Feature Coverage

Evaluate against a category-specific capability checklist:

- must-have functions;
- advanced functions;
- limitations;
- API availability;
- automation options;
- export and portability;
- mobile or desktop support where relevant;
- collaboration;
- administration;
- reporting;
- product-specific quality factors.

Where possible, feature presence should be recorded as structured and verifiable rather than expressed as opinion.

#### Criterion 3 — Usability and Time to Value

Evaluate:

- setup complexity;
- time to first useful result;
- learning curve;
- migration burden;
- workflow clarity;
- non-technical accessibility;
- administrative overhead;
- maintenance burden;
- documentation quality;
- availability of templates or guided setup;
- recurring usability themes.

Usability must not be inferred from vendor wording alone.

#### Criterion 4 — Ecosystem and Integration Fit

Evaluate:

- native integrations;
- marketplace breadth;
- API capability;
- webhooks;
- import and export options;
- compatibility with common systems;
- integration quality where evidence exists;
- partner ecosystem;
- lock-in risk;
- data portability.

A missing listing must be reported as unknown unless absence is verified.

#### Criterion 5 — Reliability and Support

Evaluate:

- public status information;
- incident history where available;
- published service commitments;
- support channels;
- support availability;
- plan-based support restrictions;
- documentation and self-service quality;
- response-time commitments;
- recurring support-experience themes;
- recovery, backup, and continuity information where relevant.

#### Criterion 6 — Trust, Security, Privacy, and Compliance

Evaluate only verifiable facts such as:

- published security documentation;
- encryption statements;
- access-control features;
- SSO availability;
- audit logs;
- privacy terms;
- data-processing terms;
- data location where relevant;
- retention and deletion controls;
- verified certifications or attestations;
- breach or incident disclosures where relevant;
- clarity of contractual commitments.

The framework must not imply certification or compliance that has not been verified.

#### Criterion 7 — User Experience Patterns and Sentiment

Evaluate:

- repeated positive themes;
- repeated negative themes;
- plan or cohort differences;
- recency;
- source independence;
- specificity of the reason;
- severity and business impact;
- contradiction level.

This criterion SHOULD have a controlled, lower influence than verified product facts and buyer fit.

### 13.3 Scoring Rules

The scoring system MUST:

- use defined subcriteria;
- maintain a visible score version;
- show criterion-level reasons;
- retain evidence references;
- distinguish missing evidence from poor performance;
- avoid converting unknown values to zero;
- show evidence coverage;
- reduce confidence when evidence is incomplete or conflicting;
- permit “not applicable” subcriteria;
- apply category-specific weights;
- apply user-context-specific fit weights;
- prevent sentiment volume from overpowering direct evidence;
- prevent affiliate commission data from entering the scoring function;
- avoid false precision where evidence quality does not justify it.

The exact numerical formula and initial weights are implementation-planning deliverables.

### 13.4 Recommendation Rules

A recommendation MUST include:

- relevant buyer context;
- required conditions;
- strongest reasons;
- important trade-offs;
- disqualifying conditions;
- confidence level;
- evidence freshness;
- alternatives where appropriate;
- “who it is not for.”

### 13.5 Framework Versioning

Scoring rules and weights may evolve, but changes MUST be:

- slow and controlled;
- versioned;
- logged;
- tested against existing records;
- accompanied by a plain-English explanation;
- applied consistently;
- reversible.

User behaviour may propose a weight review, but MUST NOT silently and automatically rewrite the scoring model.

---

## 14. Public Content System

### 14.1 General Rule

Agents do not receive an instruction such as “write a pillar post.”

They populate a validated content model. The public page is a view assembled from completed blocks.

The initial public content system has three primary page types:

1. Decision Hub
2. Solution Hub
3. Decision Scenario

Generic product reviews, generic comparisons, public evidence pages, and listicles are not primary page types.

### 14.2 Shared Page Requirements

Every public page MUST:

- open with the user’s problem, goal, context, or decision;
- provide a direct answer early;
- use plain English;
- state assumptions;
- show conditional reasoning;
- translate product features into practical outcomes;
- identify material trade-offs;
- cite evidence;
- show evidence dates or a last-reviewed date;
- disclose affiliate relationships;
- state uncertainty;
- avoid filler;
- provide a logical next step;
- remain useful without requiring the user to click an affiliate link;
- use headings that reflect real user questions and outcomes;
- remain crawlable and understandable without relying on hidden client-side state.

---

## 15. Page Type 1 — Decision Hub

### 15.1 Purpose

A Decision Hub helps a user understand a broad but meaningful decision area.

It replaces the conventional “pillar post.”

The Decision Hub is the front door to a decision, not a long educational article about a software category.

### 15.2 Primary User Need

The page answers:

- “What problem am I actually solving?”
- “Which factors matter in my situation?”
- “What questions should I ask?”
- “What risks or hidden pains should I recognise?”
- “Which solution directions are suitable?”
- “What should I do next?”

### 15.3 Primary Algorithm

**Question-to-Understanding Algorithm**

Purpose:

- organise validated questions into a coherent decision journey;
- diagnose the problem;
- expose root causes and hidden pains;
- identify the buyer state;
- determine which decision criteria matter;
- route the user to the appropriate Solution Hub, Decision Scenario, or decision asset.

### 15.4 Mandatory Information Blocks

A Decision Hub MUST contain or explicitly mark the evidence state for:

1. **Decision-opening hero**  
   State the user’s situation and the decision the page helps resolve.

2. **“You are in the right place if…” block**  
   Help the user confirm relevance without product promotion.

3. **Desired outcome block**  
   Clarify what success looks like.

4. **Problem landscape**  
   Describe validated pains and their practical consequences.

5. **Root causes and hidden pains**  
   Surface constraints or risks the user may not yet have recognised.

6. **Buyer-context questions**  
   Team size, budget, skill, existing stack, urgency, scale, and relevant risk factors.

7. **Decision-domain questions and direct answers**  
   Structured from the required question domains, not from whichever single question was easiest to find.

8. **What matters most**  
   Present only the Vetted Evaluation Framework criteria relevant to this decision.

9. **Trade-offs and common decision mistakes**  
   Explain where buyers commonly misdiagnose the need or overpay.

10. **Conditional solution pathways**  
    Explain which solution pattern fits which conditions.

11. **Evidence and methodology summary**  
    Show how the conclusions were reached.

12. **Next decision step**  
    Route to a Solution Hub, Decision Scenario, personalised report, or appropriate commercial action.

### 15.5 Completion Rules

A Decision Hub with only one discovered question MUST still publish as part of the daily connected set. It must identify the narrow question coverage, expose missing information domains, avoid unsupported generalisation, and create follow-up discovery and refresh tasks.

Each required information domain must be:

- populated with validated material; or
- explicitly marked as insufficient evidence or not applicable.

Completeness is determined by decision coverage, not word count.

Completeness controls the visible evidence state and improvement queue. It is not a publication gate.

---

## 16. Page Type 2 — Solution Hub

### 16.1 Purpose

A Solution Hub connects a specific customer outcome to the most appropriate solution options.

It does not begin as a product review. It begins with an outcome such as:

- reducing video-production time;
- automating a repetitive sales task;
- improving email deliverability;
- reducing support workload;
- replacing a costly tool;
- enabling a non-technical team to perform a task.

### 16.2 Primary User Need

The page answers:

- “What solution approach fits this goal?”
- “Which conditions change the answer?”
- “Which products fit those conditions?”
- “Why do they fit?”
- “What are the trade-offs?”
- “What should I choose next?”

### 16.3 Primary Algorithm

**Best-Fit Recommendation Algorithm**

The algorithm maps:

- desired outcome;
- buyer state;
- context;
- constraints;
- required capabilities;
- relevant evidence;
- category weights;

to:

- best-fit scenarios;
- ranked or grouped candidate products;
- conditional recommendations;
- trade-offs;
- evidence confidence;
- next step.

### 16.4 Mandatory Seven-Step Flow

Every Solution Hub MUST follow this deterministic flow:

1. **User goal**  
   State the outcome the user is trying to achieve.

2. **Situation**  
   Define the buyer contexts and constraints that materially affect the answer.

3. **Decision criteria**  
   Explain which factors matter and why.

4. **Best-fit scenarios**  
   Group solutions by scenario rather than declaring one universal winner.

5. **Reasoning**  
   Explain why each option fits its scenario and who it does not fit.

6. **Evidence**  
   Present the relevant evidence, confidence, dates, and disagreement.

7. **Next step**  
   Offer the most suitable continuation: vendor visit, Decision Scenario, personalised report, checklist, or future interactive selector.

### 16.5 Hard Rules

- Recommendations MUST be conditional.
- Every material claim MUST map to evidence or an explicit evidence state.
- The page MUST distinguish product quality from user fit.
- The product name is supporting information, not automatically the headline.
- The title and URL SHOULD use the real user outcome or question.
- The workflow MUST return a valid output even when evidence is partial or absent.
- The page MUST not become a disguised listicle.

---

## 17. Page Type 3 — Decision Scenario

### 17.1 Purpose

A Decision Scenario resolves a specific real-world choice.

It replaces the conventional isolated comparison page.

Products are compared only when comparison is necessary to resolve a user’s scenario.

### 17.2 Example Scenarios

- “Which option fits a five-person team with no technical administrator?”
- “Should I keep the lower-cost tool or pay more for automation?”
- “Which platform is safer for a regulated business?”
- “Should I switch when migration time is the biggest constraint?”
- “Which option is suitable when I need these three integrations?”

### 17.3 Primary Algorithm

**Scenario Resolution Algorithm**

The algorithm:

1. classifies the scenario;
2. identifies hard constraints;
3. selects relevant criteria;
4. excludes disqualified products;
5. compares remaining options at criterion level;
6. applies contextual weights;
7. reports conflict and uncertainty;
8. returns conditional choices.

### 17.4 Mandatory Structure

A Decision Scenario MUST contain:

1. the real-world scenario;
2. the user profile and assumptions;
3. hard constraints;
4. viable options;
5. disqualified options and reasons, where useful;
6. relevant decision criteria;
7. criterion-level evidence;
8. trade-offs;
9. conflicting or missing evidence;
10. conditional verdicts;
11. “choose this when…” and “avoid this when…” guidance;
12. next step or personalised report.

### 17.5 Comparison Rule

The platform MUST never compare products in isolation merely because both products have affiliate programmes.

Comparison exists to resolve the user’s decision.

---

## 18. Titles, URLs, and Search Intent

### 18.1 Naming Rule

“Decision Hub,” “Solution Hub,” and “Decision Scenario” are internal content-model names.

Public page titles MUST use the user’s natural question, problem, outcome, or scenario.

### 18.2 Title Requirements

Titles SHOULD:

- reflect a real question or outcome;
- be specific enough to signal context;
- avoid generic “best software” wording;
- avoid unnecessary product names;
- make the decision clear;
- remain natural when read aloud by an answer engine.

### 18.3 Product-Specific Queries

A product name MAY lead the title when the actual user intent is product-specific, for example:

- whether a product supports a required capability;
- whether it fits a particular use case;
- whether a user should switch from or to it;
- whether a price increase is justified;
- whether it satisfies a required integration or compliance condition.

Even then, the page must answer the decision, not merely describe the product.

---

## 19. Decision Psychology and Content Behaviour

### 19.1 Required Decision Journey

Where applicable, pages SHOULD move the user through:

1. problem recognition;
2. consequence understanding;
3. root-cause diagnosis;
4. desired-outcome clarification;
5. solution-pattern exploration;
6. fit evaluation;
7. risk reduction;
8. confidence formation;
9. commitment to a next step.

### 19.2 Feature-to-Outcome Translation

The system MUST translate features into their likely practical effect.

Example:

- Weak: “The product has an API.”
- Better: “The API can reduce manual data transfer if your team has the technical capacity to implement it.”

### 19.3 Ethical Requirements

The system MUST:

- state limitations;
- avoid artificial urgency;
- avoid false scarcity;
- avoid hiding better alternatives;
- avoid treating a higher price as a signal of quality;
- avoid exploiting fear;
- preserve user agency;
- make disclosures understandable;
- separate evidence from interpretation.

The exact evidence-based buying-psychology rules must be researched and documented in the Content Specification and implementation plan.

---

## 20. Deterministic Workflow and AI Worker Model

### 20.1 Architecture Principle

The workflow will be implemented as a deterministic orchestration layer, with Python as the current preferred language.

The orchestration layer controls:

- task order;
- state;
- retries;
- timeouts;
- source limits;
- schemas;
- validation;
- error handling;
- model selection;
- audit logs;
- completion.

AI models perform bounded tasks and do not control the production line.

### 20.2 Model Independence

The system SHOULD support multiple AI models through a common adapter.

A model may be replaced without changing:

- workflow state definitions;
- schemas;
- validation rules;
- scoring formulas;
- content contracts;
- evidence requirements.

### 20.3 High-Level Workflow

1. Select or identify the product category, user problem, or target decision.
2. Classify the buyer intent and likely page type.
3. Run question discovery.
4. Populate required information domains.
5. Create a source plan from the Approved Source Registry.
6. Collect evidence within bounded limits.
7. Extract and normalise claims.
8. Verify, corroborate, and classify evidence states.
9. Build or update product records.
10. Apply the Vetted Evaluation Framework.
11. Classify buyer context.
12. Run the page type’s primary algorithm.
13. Assemble the structured content model.
14. Run validation gates.
15. Render the public page.
16. attach appropriate affiliate and lead-generation actions.
17. Publish or return a documented non-publishable result.
18. Schedule evidence refresh.
19. collect performance and usefulness signals.
20. Propose controlled improvements.

### 20.4 Valid Workflow Outcomes

Every stage MUST return a structured result.

Valid outcomes include:

- completed;
- completed with strong evidence;
- completed with partial evidence;
- completed with conflicting evidence;
- completed with insufficient evidence;
- not applicable;
- retryable technical failure;
- permanent technical failure with recovery instructions;
- rejected by validation;
- publication-ready;
- retained as internal research only.

An evidence absence is not a technical failure.

### 20.5 Logical Worker Roles

The system MAY use separate agents or bounded tasks for:

- product and category classification;
- question discovery;
- source planning;
- evidence collection;
- claim extraction;
- evidence verification;
- conflict analysis;
- sentiment theme analysis;
- scoring;
- buyer-context classification;
- recommendation generation;
- content assembly;
- citation validation;
- editorial QA;
- refresh monitoring.

These are logical responsibilities. They do not require a permanently separate model or service for each role.

### 20.6 Algorithm Contracts

Every algorithm MUST define:

- purpose;
- required inputs;
- optional inputs;
- output schema;
- validation rules;
- failure states;
- confidence handling;
- audit fields;
- performance metrics;
- version.

### 20.7 Shared Algorithm Components

The three page algorithms MUST reuse shared components such as:

- evidence confidence calculation;
- source-tier evaluation;
- recency scoring;
- claim normalisation;
- contradiction detection;
- buyer-state classification;
- criteria-weight selection;
- product disqualification;
- score calculation;
- citation rendering;
- recommendation explanation;
- “who it is not for” generation;
- evidence-state handling.

> **Every content type owns one primary algorithm, but the algorithms reuse shared components.**

---

## 21. Vetted Decision Orchestrator

### 21.1 Purpose

The Vetted Decision Orchestrator decides which decision journey is required.

It does not freely invent a page. It selects from approved rules and schemas.

### 21.2 Inputs

Inputs MAY include:

- user question;
- desired outcome;
- current product;
- category;
- team size;
- budget;
- technical skill;
- current technology stack;
- must-have capabilities;
- risk sensitivity;
- migration tolerance;
- expected scale;
- purchase stage;
- industry or compliance context.

### 21.3 Responsibilities

The orchestrator MUST:

- classify the buyer state;
- select the appropriate page or interaction type;
- identify mandatory information blocks;
- select relevant evaluation criteria;
- set contextual weights;
- determine hard disqualifiers;
- select the correct recommendation algorithm;
- preserve evidence states;
- determine the appropriate next step;
- log the route taken.

### 21.4 Output

The output SHOULD include:

- buyer-state classification;
- selected decision path;
- assumptions;
- required content blocks;
- required evidence;
- selected criteria and weights;
- applicable products;
- disqualified products;
- recommendation conditions;
- confidence state;
- next action.

---

## 22. Data Model and Storage Requirements

### 22.1 Data Philosophy

This product is not fundamentally a blog. It is a structured software-intelligence database with public decision views.

### 22.2 Core Entities

The system SHOULD support at least:

- Category
- Product
- Product Plan
- Capability
- Integration
- Source
- Evidence
- Claim
- Question
- Pain Point
- Desired Outcome
- Buyer Context
- Evaluation Criterion
- Evaluation
- Score Version
- Recommendation
- Decision Hub
- Solution Hub
- Decision Scenario
- Evidence Conflict
- Product Change Event
- Affiliate Programme
- Affiliate Link
- Decision Asset
- Lead
- Anonymous Interaction
- Workflow Run
- Agent Task
- Validation Result
- Audit Log

### 22.3 Product Record

A product record SHOULD include:

- canonical name;
- vendor;
- category;
- description limited to factual positioning;
- target users;
- plans;
- current pricing metadata;
- capabilities;
- integrations;
- security and compliance facts;
- support facts;
- known limitations;
- evidence links;
- score history;
- recommendation history;
- last researched date;
- next review date;
- affiliate relationship;
- active, changed, retired, or insufficient-evidence status.

### 22.4 Database Direction

Convex is the current preferred application-database option because ease of use and rapid iteration are priorities.

This is a preference, not yet a final technical commitment.

Before implementation, planning MUST verify:

- current free-tier limits;
- storage and bandwidth suitability;
- export and backup options;
- access-control model;
- server-only write paths;
- data portability;
- expected cost at projected scale.

### 22.5 Separation of Data Layers

The design MUST separate:

1. **Private raw evidence layer**  
   Local captures, screenshots, research notes, and audit artefacts controlled by the owner.

2. **Normalised intelligence layer**  
   Structured products, claims, evaluation results, public citation metadata, scores, and page models.

3. **Public presentation layer**  
   Crawlable pages, evidence snippets, recommendations, lead assets, and affiliate actions.

### 22.6 Authentication and Access

The initial public site does not require user authentication.

Requirements:

- public users receive read-only access to public content;
- client-side code must not have direct unrestricted database write access;
- all agent and administrative writes occur through authenticated server-side paths;
- agent credentials are never exposed to the browser;
- evidence-repository access remains private;
- audit logs identify the workflow or agent responsible for each change;
- optional user accounts may be considered later but are not required for the first release.

---

## 23. Lead Generation and Decision Assets

### 23.1 Principle

Lead magnets must be the natural next step in the user’s decision, not unrelated downloadable content.

### 23.2 Initial Lead Asset

The preferred first lead asset is a **Personalised Decision Report** generated from:

- user context;
- selected criteria;
- applicable product records;
- evidence;
- fit scores;
- trade-offs;
- recommended next steps.

### 23.3 Additional Decision Assets

Later assets MAY include:

- implementation checklist;
- migration checklist;
- vendor scorecard;
- shortlist report;
- internal purchase-justification brief;
- requirements template;
- ROI calculator;
- risk-assessment checklist.

### 23.4 Stage-Based Mapping

- **Early stage:** problem diagnosis or decision report.
- **Evaluation stage:** shortlist scorecard or scenario report.
- **Justification stage:** ROI calculator or purchase brief.
- **Implementation stage:** migration or onboarding checklist.

### 23.5 Email Capture Rules

- Email is requested when the user asks to receive or save the asset.
- The platform MUST explain what will be sent.
- Consent must be clear.
- The form should collect the minimum necessary information.
- Email capture must not prevent access to the core public reasoning.
- Privacy and unsubscribe requirements must be implemented.
- Lead information must not alter the recommendation.

---

## 24. Future Vetted Decision Engine

### 24.1 Purpose

The Vetted Decision Engine will turn the evidence and scoring system into an interactive product.

### 24.2 Initial Interaction

The user may provide:

- budget;
- team size;
- required outcomes;
- must-have criteria;
- technical skill;
- existing tools;
- preferred integrations;
- risk sensitivity;
- expected growth;
- current shortlist.

### 24.3 Output

The first version SHOULD return:

- the two strongest fits;
- Fit Score;
- Product Score;
- Evidence Confidence Score;
- why each option fits;
- material trade-offs;
- who should not choose each option;
- missing or conflicting evidence;
- the next decision step.

### 24.4 Implementation Principle

The first version SHOULD be rule-based and deterministic.

It should not depend on uncontrolled “AI magic.” AI may explain the result, but the selection logic must be reproducible.

---

## 25. Affiliate Monetisation and Trust

### 25.1 Commercial Model

The initial revenue model is affiliate commission from suitable SaaS products.

A page may include multiple affiliate links where multiple products are legitimate fits.

### 25.2 Ranking Independence

The system MUST NOT use:

- commission percentage;
- payout amount;
- vendor relationship strength;
- campaign pressure;

as scoring or ranking inputs.

### 25.3 Disclosure

Affiliate relationships MUST be disclosed clearly and close enough to the relevant commercial action to be understood.

### 25.4 Call-to-Action Rules

Calls to action MUST:

- follow the reasoning;
- reflect the user’s scenario;
- use accurate language;
- avoid false urgency;
- avoid implying Vetted SaaS Blueprint is the vendor;
- link to the correct current plan or vendor destination;
- be monitored for broken or changed links.

### 25.5 Trust Before Conversion

The page must remain useful even when:

- the user does not click;
- the best-fit product has no affiliate programme;
- the higher-paying product is not the best fit;
- the evidence is inconclusive.

---

## 26. SEO and AEO Requirements

### 26.1 Search Strategy

The product will prioritise:

- customer problems;
- desired outcomes;
- decision questions;
- scenario-specific searches;
- switching decisions;
- cost and value decisions;
- integration constraints;
- adoption and risk concerns;
- product-specific fit questions where justified.

It will not rely primarily on broad “best software” keywords.

### 26.2 Public Page Requirements

Pages SHOULD:

- render meaningful crawlable HTML;
- provide a direct answer near the beginning;
- use clear question-based headings;
- define assumptions;
- expose concise reasoning;
- show source links and dates;
- provide last-reviewed dates;
- use stable canonical URLs;
- link related decision paths logically;
- distinguish facts from interpretation;
- include valid structured data only where appropriate;
- avoid schema markup that misrepresents the page;
- avoid hiding essential content behind interaction;
- remain usable on mobile;
- load efficiently.

### 26.3 Answer-Engine Suitability

Content should be easy for an answer engine to extract because it contains:

- explicit questions;
- direct answers;
- conditional statements;
- clear definitions;
- structured criteria;
- cited evidence;
- confidence levels;
- trade-offs;
- dates;
- identifiable entities and relationships.

The goal is not to write for a crawler at the expense of a person. Human decision usefulness remains the primary quality test.

---

## 27. Feedback, Learning, and Refresh Loop

### 27.1 Purpose

The platform must improve without allowing uncontrolled model drift.

### 27.2 Signals

The system MAY collect privacy-conscious signals such as:

- page visits;
- decision-path selections;
- criteria selected;
- shortlist changes;
- decision-report requests;
- affiliate clicks;
- “helpful/not helpful” responses;
- unanswered questions;
- no-result states;
- repeated exits at a particular block;
- stale evidence warnings;
- product-change alerts.

### 27.3 Deterministic Improvement Cycle

1. Collect signals.
2. Aggregate by page, question, buyer state, and criterion.
3. Identify a defined improvement candidate.
4. Gather supporting evidence.
5. Propose a change.
6. Validate the change against rules and historical outputs.
7. Approve automatically only where policy permits.
8. Version and apply the change.
9. Log what changed and why.
10. Monitor the result.

### 27.4 Weight Changes

Weights must not change silently based only on clicks.

User behaviour may indicate that a criterion deserves review. A scoring change requires a new version and documented justification.

### 27.5 Evidence Refresh

Each evidence record SHOULD have a refresh policy based on claim type.

High-change claims such as price, packaging, and integrations require more frequent checks than stable historical or methodological information.

---

## 28. Functional Requirements

| ID | Requirement |
|---|---|
| FR-001 | The system MUST maintain an Approved Source Registry. |
| FR-002 | Research agents MUST be restricted to approved source and search rules. |
| FR-003 | Every research task MUST have bounded stop conditions. |
| FR-004 | Every evidence task MUST return a structured evidence state. |
| FR-005 | Missing evidence MUST NOT halt the workflow. |
| FR-006 | Every material public claim MUST map to evidence or an explicit uncertainty state. |
| FR-007 | The system MUST preserve publication date, access date, and last-verification date where available. |
| FR-008 | The system MUST distinguish product quality, user fit, and evidence confidence. |
| FR-009 | The Vetted Evaluation Framework MUST be versioned. |
| FR-010 | Affiliate commission data MUST be excluded from recommendation logic. |
| FR-011 | Question discovery MUST use real user-question sources. |
| FR-012 | A Decision Hub MUST cover all applicable mandatory information domains. |
| FR-013 | A Solution Hub MUST follow the mandatory seven-step flow. |
| FR-014 | A Decision Scenario MUST resolve a real user context rather than compare products in isolation. |
| FR-015 | All recommendations MUST be conditional and explain trade-offs. |
| FR-016 | Public pages MUST show useful evidence references and freshness information. |
| FR-017 | Raw evidence artefacts MUST remain private. |
| FR-018 | Public users MUST not require authentication in the first release. |
| FR-019 | Database writes MUST occur through authenticated server-side paths. |
| FR-020 | The orchestration workflow MUST be deterministic and model-independent. |
| FR-021 | AI workers MUST use defined input and output schemas. |
| FR-022 | Every algorithm MUST define purpose, inputs, outputs, validation, failure states, metrics, and version. |
| FR-023 | The system MUST retain score and evidence history rather than silently overwrite it. |
| FR-024 | The system MUST provide an audit trail for generated recommendations. |
| FR-025 | The system MUST support stage-based lead assets. |
| FR-026 | The first lead asset SHOULD be a Personalised Decision Report. |
| FR-027 | Email capture MUST be requested only when the user requests the asset. |
| FR-028 | Affiliate disclosures MUST be clear. |
| FR-029 | The system MUST support evidence refresh and product-change events. |
| FR-030 | The future interactive selector MUST reuse the same scoring and evidence systems. |
| FR-031 | Public content MUST remain useful without an affiliate click. |
| FR-032 | The system MUST explicitly display conflicting evidence where material. |
| FR-033 | Sentiment analysis MUST capture recurring reasons rather than only ratings. |
| FR-034 | Unsupported claims and invented scores MUST fail validation. |
| FR-035 | Product, source, evidence, scoring, and page records MUST be linkable through stable identifiers. |

---

## 29. Non-Functional Requirements

### 29.1 Traceability

A reviewer must be able to trace:

public statement → recommendation → score → criterion → claim → evidence → source.

### 29.2 Reproducibility

Given the same evidence set, framework version, buyer context, and configuration, the deterministic components should return the same result.

### 29.3 Security

- Raw evidence must remain private.
- Write credentials must remain server-side.
- Secrets must not be present in public code or page output.
- Administrative and agent actions must be auditable.
- Public input must be validated.
- Lead data must be protected.

### 29.4 Maintainability

- Workflow logic must remain separate from model prompts.
- Scoring logic must remain separate from the database implementation.
- Source rules must remain configurable.
- Page schemas must be versioned.
- Model providers must be replaceable.

### 29.5 Resilience

- Workflows must resume after recoverable failures.
- A single unavailable source must not terminate a run.
- Partial results must be retained.
- Retry limits must prevent infinite loops.
- Evidence absence must be handled as a business state.

### 29.6 Performance

Primary decision content should load quickly and be available in crawlable HTML.

### 29.7 Accessibility

Public interfaces SHOULD meet recognised accessibility expectations for:

- keyboard navigation;
- semantic headings;
- readable contrast;
- descriptive controls;
- form labels;
- error messages;
- mobile use.

### 29.8 Editorial Quality

The system must maintain:

- plain English;
- consistent terminology;
- factual restraint;
- visible assumptions;
- useful headings;
- concise explanations;
- no filler;
- no fake first-person experience;
- no unsupported marketing language.

---

## 30. Validation Gates

### 30.1 Evidence Gate

Pass conditions:

- source is allowed;
- dates are present where available;
- claim type is allowed for the source;
- evidence state is assigned;
- conflicts are linked;
- excerpt and summary accurately reflect the source.

### 30.2 Scoring Gate

Pass conditions:

- correct framework version used;
- relevant criteria selected;
- unsupported fields remain unknown;
- missing evidence is not scored as failure;
- reasons are generated;
- evidence coverage is reported;
- affiliate data is absent.

### 30.3 Recommendation Gate

Pass conditions:

- buyer context is stated;
- recommendation is conditional;
- trade-offs are present;
- disqualifiers are present;
- confidence is visible;
- alternatives are included where appropriate;
- no universal claim is made without justification.

### 30.4 Content Gate

Pass conditions:

- correct page schema used;
- mandatory blocks are completed or assigned an evidence state;
- direct answer appears early;
- product does not lead unless intent requires it;
- no generic listicle structure;
- all material claims are traceable;
- page is useful without conversion;
- next step is relevant.

### 30.5 Commercial Gate

Pass conditions:

- affiliate disclosure is present;
- link is current;
- call to action matches the recommendation;
- commission did not influence ranking;
- commercial language does not overstate the evidence.

### 30.6 Publication Outcomes

A page may be:

- publishable;
- publishable with visible uncertainty;
- retained for further research;
- blocked for unsupported claims;
- blocked for insufficient decision coverage;
- blocked for technical failure.

“Insufficient evidence” does not automatically mean “do not publish.” It may be the useful answer.

---

## 31. Initial Release Scope

The first release SHOULD prove the complete system in one bounded SaaS category before broad expansion.

The exact first category and product cohort remain an owner decision.

The initial release should include:

- one approved-source registry for the selected category;
- a bounded product cohort;
- private raw evidence storage;
- normalised product and evidence records;
- Vetted Evaluation Framework version 1;
- all three public page models;
- at least one complete Decision Hub;
- multiple outcome-focused Solution Hubs;
- at least one real Decision Scenario;
- affiliate disclosure and link management;
- Personalised Decision Report lead asset;
- deterministic Python orchestration;
- model-adapter boundary;
- validation gates;
- audit logging;
- evidence refresh scheduling;
- public read-only experience with no user authentication.

The first release does not require:

- a large product catalogue;
- automated weight self-modification;
- public user accounts;
- an advanced AI chatbot;
- unrestricted web crawling;
- a public raw evidence browser;
- a full interactive Vetted Decision Engine.

---

## 32. Later-Phase Capabilities

Later phases MAY add:

- interactive Vetted Decision Engine;
- category-specific scoring profiles;
- richer anonymous personalisation;
- saved shortlists;
- user accounts;
- multiple decision-report formats;
- ROI calculators;
- vendor-change monitoring;
- automatic pricing and integration refreshes;
- broader category coverage;
- Pinterest and other distribution workflows;
- first-party question collection;
- user feedback incorporated into controlled framework reviews;
- public methodology pages;
- selected public evidence cards where legally and strategically appropriate.

---

## 33. Success Metrics

### 33.1 North-Star Outcome

The product should increase the number of users who reach a **confident, evidence-supported software decision**.

Because confidence is not directly observable, the system will use a combination of behavioural and quality signals.

### 33.2 User and Commercial Metrics

- Decision Hub engagement.
- Completion of decision pathways.
- Personalised Decision Report request rate.
- Qualified email capture rate.
- Affiliate click-through after recommendation.
- Affiliate conversion where data is available.
- Return visits.
- Shortlist interactions.
- Helpful/not-helpful score.
- Low no-result abandonment.

### 33.3 Organic and AEO Metrics

- Qualified organic sessions.
- Rankings for outcome and decision queries.
- Search impressions for question-shaped queries.
- Inclusion or citation in answer-engine responses where measurable.
- Click-through rate from problem- and outcome-shaped searches.
- Index coverage.
- Crawl and rendering health.

### 33.4 Evidence and Workflow Metrics

- Percentage of claims with valid evidence.
- Evidence freshness coverage.
- Percentage of records with strong, moderate, partial, conflicting, or insufficient evidence.
- Average sources examined before completion.
- Workflow completion rate.
- Frequency of halted runs caused by technical errors.
- Zero workflow halts caused solely by missing evidence.
- Unsupported-claim rejection rate.
- Time and cost per completed product evaluation.
- Score reproducibility.

Initial numeric targets must be set after the first baseline is measured.

---

## 34. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Generic AI content drift | Structured page schemas, required information domains, and validation gates. |
| Endless agent research | Approved source registry, bounded search, fixed stop conditions, and valid insufficient-evidence output. |
| Hallucinated claims | Evidence-linked claims, schema validation, and rejection of unsupported outputs. |
| Affiliate bias | Commission excluded from ranking inputs and transparent disclosures. |
| Stale pricing or features | Claim-specific review dates, refresh schedules, and product-change events. |
| False precision in scores | Separate confidence score, evidence coverage, and visible uncertainty. |
| Star-rating manipulation | Sentiment based on recurring reasons and source evaluation, not averages alone. |
| Conflicting sources | Preserve and explain disagreement rather than flattening it. |
| Raw evidence loss | Private backup, integrity hashes, retention policy, and recovery plan to be defined. |
| Copyright or source-use concerns | Store minimal excerpts, keep raw captures private, define retention and use rules during planning. |
| Database lock-in | Separate domain logic from storage and verify export options. |
| Free-tier limits | Verify actual current limits before implementation and monitor usage. |
| Over-complex multi-agent system | Treat workers as logical tasks; use the minimum model calls needed. |
| Poor AEO performance | Prioritise human usefulness, structured answers, citations, clear entities, and ongoing measurement. |
| Manipulative conversion design | Ethical decision-psychology requirements and commercial validation gate. |
| Thin page caused by limited questions | Required information-domain coverage and explicit insufficient-evidence states. |
| Local evidence repository becoming a deployment bottleneck | Define controlled normalisation and publication handoff during technical planning. |

---

## 35. Open Decisions for Planning

The following items are intentionally unresolved and MUST be finalised during the relevant planning work:

1. Initial SaaS category.
2. Initial product cohort.
3. Exact approved source-domain allowlist.
4. Source-specific claim permissions.
5. Exact source freshness rules.
6. Initial scoring formula and category weights.
7. Evidence Confidence Score formula.
8. User Fit Score formula.
9. Minimum decision-domain coverage thresholds.
10. Local evidence repository format.
11. Screenshot capture, storage, encryption, and retention policy.
12. Backup and disaster-recovery process for evidence.
13. Final application database after current limits are verified.
14. Exact data exported from the private evidence layer to the public system.
15. Model providers and routing policy.
16. Prompt and schema versioning mechanism.
17. Email provider and lead-data retention policy.
18. Affiliate-link management and health checking.
19. Exact analytics events.
20. Valid structured-data types for each public page.
21. Evidence-based online buying-psychology rules.
22. Product change-detection method.
23. Public methodology and scoring-transparency level.
24. Legal review requirements for excerpts, screenshots, privacy, email capture, and disclosures.
25. Quantitative launch targets.

---

## 36. Definition of Done for Product Planning

This PRD is ready to enter implementation planning when:

- the owner accepts the product vision and non-goals;
- the three public page types are accepted;
- the evidence-state policy is accepted;
- raw evidence privacy requirements are accepted;
- the Vetted Evaluation Framework criteria are accepted;
- the separation of Product Score, Fit Score, and Evidence Confidence Score is accepted;
- the deterministic workflow principle is accepted;
- the first category and product cohort are selected;
- the source-registry research task is authorised;
- the remaining open decisions are assigned to specific companion documents or planning tasks.

The implementation itself is not complete until a full example can be traced from:

**real user question → approved-source research → structured evidence → evaluated product → contextual recommendation → validated public page → relevant decision asset or affiliate action → audit record.**

---

## 37. Glossary

### Approved Source Registry
The controlled list of sources agents may use, including rules for claim types, freshness, and credibility.

### Decision Asset
A personalised report, checklist, scorecard, calculator, or other useful output derived from the user’s decision and the evidence model.

### Decision Hub
A broad decision entry point that helps users understand the problem, relevant questions, hidden pains, criteria, and solution paths.

### Decision Scenario
A page that resolves a specific real-world choice and compares products only where required by that scenario.

### Evidence Confidence Score
A measure of how direct, recent, specific, corroborated, and reliable the evidence is.

### Evidence State
The structured status assigned to evidence: strong, moderate, partial, conflicting, insufficient, not applicable, or not yet researched.

### Fit Score
A measure of how well a product matches a particular user context.

### Product Score
A measure of product performance against a category-specific baseline.

### Solution Hub
An outcome-to-solution page that maps a user’s goal and constraints to conditional best-fit options.

### Vetted Decision Engine
The future interactive selector that uses the same structured intelligence and algorithms to recommend the strongest fits.

### Vetted Decision Orchestrator
The rule-based component that classifies buyer context and selects the correct decision path, criteria, content blocks, and algorithm.

### Vetted Evaluation Framework
The versioned criteria, scoring rules, and evidence requirements used to evaluate SaaS products.

---

## 38. Companion Document Set

This PRD is one part of a broader product-documentation system. Separate documents should be created for:

1. **Market Research and Opportunity**
2. **Product Roadmap**
3. **Design System**
4. **Art Direction**
5. **Master Product Requirements Document** — this document
6. **Content Specification and Product Glossary**
7. **Onboarding and Activation Plan**
8. **UI Kit and Component Library**
9. **Growth and Distribution Strategy**
10. **QA and Testing Plan**

A root `README.md` should eventually explain the purpose, authority, and reading order of all ten documents so implementation agents understand how the documentation is structured.

---

## 39. Final Product Principle

> Vetted SaaS Blueprint does not explain software for the benefit of software providers. It diagnoses customer problems, organises trustworthy evidence, and helps people make suitable decisions with clear reasoning.

> Content is not the end product. The decision system is the product.
