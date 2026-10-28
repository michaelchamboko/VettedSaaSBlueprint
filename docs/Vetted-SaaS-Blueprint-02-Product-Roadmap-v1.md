# Vetted SaaS Blueprint — Product Roadmap and Incremental Delivery Plan

**Document:** 02 of 10  
**Version:** 1.0  
**Status:** Working roadmap for phased implementation  
**Date:** 27 August 2026  
**Product owner:** Michael Chamboko  
**Related documents:**

- `Vetted-SaaS-Blueprint-01-Market-Research-and-Opportunity-Plan-v1.md`
- `Vetted-SaaS-Blueprint-Master-PRD-v1.md`

---

## 1. Purpose of This Document

This roadmap defines **what Vetted SaaS Blueprint will build first, what will be automated later, what each phase must deliver, and the conditions that must be met before work may advance**.

It is not a speculative feature list or a long-term calendar. It is an **incremental delivery contract** designed to prevent the project from spending weeks building infrastructure without producing public, useful content.

The roadmap is governed by one non-negotiable principle:

> **Visible, deployed customer value must come before deeper infrastructure.**

The roadmap therefore starts with a narrow, end-to-end version of the final product. The project will then improve the evidence, decision logic, publishing, automation, growth, and AI-distribution layers around that working vertical slice.

---

## 2. Roadmap Authority

The words **MUST**, **SHOULD**, and **MAY** are used deliberately:

- **MUST** means mandatory and cannot be silently deferred.
- **SHOULD** means expected unless a documented constraint requires a simpler implementation.
- **MAY** means optional or suitable for a later phase.

Where this roadmap conflicts with a lower-level implementation task, the roadmap takes priority unless the product owner explicitly changes the decision.

The roadmap does not select every framework, database, scraper, model, or cloud service. Those decisions belong in implementation planning. Tool selection must never be allowed to delay the required public output.

---

## 3. Locked Delivery Rule

### 3.1 The three-page release unit

The smallest acceptable public product increment is one complete **three-page decision set**:

1. **Decision Hub** — helps the user understand the problem, pain points, desired outcome, constraints, and important decision questions.
2. **Solution Hub** — maps a defined outcome and situation to conditional best-fit solutions, reasoning, evidence, trade-offs, and next steps.
3. **Decision Scenario** — resolves a specific real-world buying situation and compares options only where comparison is necessary to answer that situation.

These pages must be connected to the same user problem, product category, outcome, or buying scenario. They are not three unrelated articles.

### 3.2 Daily shipping rule

During active implementation and content-production work:

> **Every build day MUST end with one complete three-page decision set live and working on Vercel.** (Build-phase obligation; satisfied by the completed Phase One. Ongoing releases are on-demand via an explicit manual or API trigger per AGENTS.md and planning.md.)

**Cadence supersession (owner directive 2026-10-28):** Any "daily", "every active day", fixed-time, scheduled, watchdog, rescue, or recurring-publication wording in this document is retained only as historical batch terminology or traceability. It does not authorise a schedule or ongoing publication obligation. The release unit remains valid, but execution occurs only from an explicit manual or API trigger under `AGENTS.md` and `planning.md`.

A day spent only on invisible infrastructure, internal refactoring, orchestration, scraping, database work, agent prompts, or planning does not satisfy this rule.

Infrastructure work may proceed only when it supports the same day’s visible three-page release or improves an already deployed three-page set in a directly demonstrable way.

### 3.3 Phase advancement rule

The project MUST NOT advance to the next phase until the current phase has:

- produced its required public output;
- deployed that output to Vercel;
- passed the phase acceptance criteria;
- preserved at least one working Decision Hub, Solution Hub, and Decision Scenario;
- demonstrated the new capability through those public pages.

“Almost complete,” “working locally,” “waiting for one dependency,” and “the backend is ready” are not valid substitutes for a live release.

### 3.4 Failure response

If the team cannot deliver the required three pages, the response is not to extend the phase indefinitely. The response is to remove complexity immediately.

The project MUST:

1. stop adding new scope;
2. identify the blocking complexity;
3. replace automation with a manual fallback where necessary;
4. reduce the number of products or data fields;
5. use a simpler storage or publishing mechanism;
6. deploy the simplest truthful and useful version;
7. record what was removed and why;
8. resume deeper work only after the three pages are live.

### 3.5 Truthfulness rule

Speed does not permit fabricated public claims.

- Synthetic data, placeholder scores, and invented evidence MAY be used on a local or non-indexed preview environment to test layout.
- Public production pages MUST use real source material, clearly marked evidence states, or an explicit **insufficient evidence** result.
- A missing answer is valid data. An invented answer is not.

### 3.6 Continuous revision rule

Evidence readiness never controls whether the daily three-page set deploys. It controls what the pages may claim, how confidence is presented, and which follow-up research is scheduled.

Every page and derived asset remains versioned and open to revision after publication. New, corrected, conflicting, or previously unavailable evidence must update the affected live decision set and trigger appropriate redistribution. Later improvement supplements the next daily release; it does not replace or postpone it.

---

## 4. Product Delivery Thesis

Vetted SaaS Blueprint will be built as a sequence of **working vertical slices**, not as a collection of disconnected systems.

The core product loop is:

1. Discover a real customer question or pain point.
2. Define the buyer situation and desired outcome.
3. Gather bounded, approved evidence.
4. structure the evidence.
5. assess product quality, contextual fit, and evidence confidence.
6. produce conditional reasoning and recommendations.
7. assemble the correct public page type.
8. validate claims, evidence, links, usability, and commercial integrity.
9. publish to Vercel.
10. measure user and search behaviour.
11. refresh the evidence and improve the decision logic.

The initial version may perform several steps manually. Later phases automate them without changing the underlying contracts.

### 4.1 Automation principle

The deterministic workflow owns the process. AI models perform narrow tasks inside it.

> **The workflow is the production line. AI models are replaceable workers at controlled stations.**

No AI model may independently decide to skip required stages, invent new scoring logic, publish unsupported claims, or change the product methodology.

### 4.2 Hosting principle

- Public pages MUST be deployed to **Vercel from Phase 1**.
- Research and workflow automation SHOULD begin locally where that is fastest and easiest to inspect.
- Proven workflows SHOULD later move to an appropriate cloud execution environment so they can run reliably without the owner’s computer remaining active.
- The final cloud execution location will be selected during architecture planning based on job duration, cost, scheduling, storage, and platform limits.

### 4.3 Commercial principle

Affiliate monetisation is not postponed to a late phase.

- Relevant affiliate links MAY appear from the first public release.
- Affiliate disclosures MUST appear from the first public release.
- Commercial links MUST follow the evidence-backed recommendation and may never determine it.
- The later growth phase optimises monetisation; it does not introduce it for the first time.

---

## 5. Roadmap Principles

The implementation plan MUST follow these principles across every phase.

### 5.1 Visible proof before platform depth

A rough but truthful end-to-end experience is more valuable than a sophisticated internal platform that has not published anything.

### 5.2 Vertical slices before horizontal systems

Build one complete decision journey across research, reasoning, presentation, affiliate action, and deployment before broadening any individual layer.

### 5.3 Speed is a product requirement

The project is expected to create a publishable page in less than one hour of active production time once the initial template is working. The long-term target is to produce a complete three-page set with minimal operator intervention.

### 5.4 Manual first is acceptable

Manual research, local structured files, fixed templates, and direct publishing are acceptable when they are the quickest path to a truthful public result.

Manual work becomes a candidate for automation only after its inputs, outputs, and quality checks are understood.

### 5.5 No invisible-only build days

Every day of active implementation must produce a visible Vercel result. Internal work must be demonstrated through a public page, public metadata, a live decision interaction, or a deployed operational improvement.

### 5.6 Tools are replaceable

Scrapers, models, databases, schedulers, and cloud workers must sit behind clear contracts so that one tool can be replaced without redesigning the whole product.

### 5.7 Evidence states prevent workflow failure

The valid outcomes are:

- evidence found;
- partial evidence;
- conflicting evidence;
- insufficient evidence;
- source unavailable;
- refresh required.

None of these states should crash or indefinitely pause the workflow.

### 5.8 Narrow scope beats delayed completeness

When speed is threatened, reduce breadth before reducing truthfulness. One product category handled properly is better than ten categories held in unfinished infrastructure.

### 5.9 Monetisation follows decision quality

The commercial action must be the natural endpoint of a trustworthy decision journey, not the opening purpose of a page.

### 5.10 Deployment is part of development

A feature is not complete merely because it works locally. The definition of done includes deployment, production rendering, links, basic analytics, and public usability.

---

## 6. The Three Public Page Types

### 6.1 Decision Hub

**Purpose:** Help a user understand the problem they are facing and the decision they need to make.

The page should:

- begin with the customer’s pain or desired outcome;
- identify general and hidden pain points;
- separate symptoms from root causes;
- identify the buyer’s state, constraints, and risks;
- organise real questions into information domains;
- explain which decision factors matter;
- direct the user toward appropriate Solution Hubs or Decision Scenarios.

It must not become a generic category guide or padded pillar post.

### 6.2 Solution Hub

**Purpose:** Help the user identify which solution is the best fit for a defined goal and situation.

Every Solution Hub MUST use the agreed seven-step flow:

1. User goal.
2. Situation and constraints.
3. Decision criteria.
4. Best-fit scenarios.
5. Reasoning and trade-offs.
6. Evidence and confidence.
7. Next step.

Every recommendation must be conditional:

> **If these conditions are true, this solution is likely to fit because…**

### 6.3 Decision Scenario

**Purpose:** Resolve a narrow, real-world software decision.

Examples include:

- which tool fits a five-person team below a defined monthly budget;
- whether a buyer should switch from an existing product;
- whether a higher-priced plan is justified for a specific workflow;
- which option is more suitable for a non-technical team;
- which solution works with a required integration or compliance constraint.

Products may be compared, but never in isolation. The scenario and customer outcome must remain the organising principle.

---

## 7. Roadmap at a Glance

The timeboxes below are planning ceilings, not promises. If a phase approaches its ceiling without producing the required live result, scope must be reduced.

| Phase | Primary outcome | Required public proof | Suggested maximum timebox |
|---|---|---|---:|
| 1. Visible Decision Proof | Prove the final experience immediately | First three-page decision set live on Vercel | 1–2 working days |
| 2. Evidence Acquisition | Replace ad hoc research with a bounded evidence pipeline | Live pages populated or refreshed from structured evidence | 3–5 working days |
| 3. Decision Intelligence | Apply explainable scoring, fit, confidence, and trade-off logic | Live recommendations with visible reasons and evidence states | 3–5 working days |
| 4. Content and Publishing Engine | Generate and publish page types consistently from structured records | A new three-page set generated and deployed through the engine | 3–7 working days |
| 5. Automation and Cloud Execution | Run the controlled workflow with replaceable AI workers | At least one content set researched, validated, and deployed through automation | 5–10 working days |
| 6. Growth and Monetisation Optimisation | Improve affiliate performance, lead capture, and distribution | Live decision asset, tracking, and optimised commercial journey | 3–7 working days |
| 7. Learning and Platform Intelligence | Improve freshness and fit from real usage signals | Versioned refreshes and an initial interactive decision experience | 5–10 working days |
| 8. AI Ecosystem and Knowledge Readiness | Prepare structured knowledge for controlled AI retrieval and licensing | Crawler controls, machine-readable access, and licensing-ready architecture | Later strategic phase |

These phases are sequential in purpose, but not rigid silos. Affiliate links begin in Phase 1. AEO begins in Phase 1. Quality validation begins in Phase 1. Later phases deepen and automate those capabilities.

---

# PHASE 1 — VISIBLE DECISION PROOF

## 8. Phase 1 Objective

Phase 1 must prove what the final Vetted SaaS Blueprint experience will look and feel like before significant evidence automation, scoring infrastructure, database work, or agent orchestration is built.

The output is a **visual and functional proof of concept**, not a static design mock-up.

### 8.1 Initial scope

Select:

- one commercially relevant SaaS category or customer outcome;
- one clearly defined buyer situation;
- one to three existing affiliate products where appropriate;
- one narrow evidence set that can be gathered quickly from official and trusted sources.

The selected scope must be small enough to publish immediately.

### 8.2 Mandatory public output

Phase 1 MUST deploy:

1. one Decision Hub;
2. one Solution Hub;
3. one Decision Scenario;
4. working navigation between the three pages;
5. appropriate affiliate links;
6. a visible affiliate disclosure;
7. source references or evidence-state labels;
8. a visible “last checked” or equivalent freshness indicator;
9. mobile-responsive rendering;
10. indexable page metadata unless the page is explicitly marked as a prototype;
11. basic analytics for page views and outbound affiliate clicks.

### 8.3 Allowed implementation shortcuts

To maximise speed, Phase 1 MAY use:

- manually researched source material;
- local JSON, Markdown, or TypeScript data files;
- a single fixed page template per content type;
- hand-entered evidence records;
- simple deterministic rules;
- a single AI model for bounded drafting tasks;
- direct deployment through the existing Vercel project;
- existing site components and styles where practical.

Phase 1 MUST NOT be delayed by:

- final database selection;
- a general-purpose scraper platform;
- a multi-agent system;
- a complex admin interface;
- user authentication;
- personalised quiz logic;
- a complete scoring framework;
- a full design system;
- advanced caching or queues;
- automated refresh scheduling;
- a universal content generator.

### 8.4 Phase 1 quality floor

Although the pages may be visually or operationally incomplete, they must:

- speak to the customer rather than the vendor;
- lead with pain, outcome, and context;
- avoid generic product-review language;
- avoid listicles and filler;
- state why a recommendation applies;
- state material trade-offs;
- identify uncertainty honestly;
- use only real public claims;
- avoid broken links and placeholder text;
- include affiliate disclosure before a commercial action.

### 8.5 Phase 1 exit gate

Phase 1 is complete only when all three pages:

- are reachable through production Vercel URLs;
- render correctly on desktop and mobile;
- form one coherent user decision journey;
- contain useful, truthful content;
- have working internal links and commercial actions;
- demonstrate the intended public product direction;
- can be shown to another person without explaining unfinished infrastructure.

No deeper automation work may become the main focus before this gate is met.

---

# PHASE 2 — EVIDENCE ACQUISITION ENGINE

## 9. Phase 2 Objective

Phase 2 converts quick manual research into a controlled, repeatable evidence-acquisition process without allowing scraping infrastructure to become a project of its own.

The goal is to make high-quality page production faster and more reliable.

### 9.1 Required capabilities

Phase 2 SHOULD establish:

1. an approved source registry;
2. source tiers by claim type;
3. a bounded search strategy;
4. source-domain allowlists where appropriate;
5. a swappable scraper or retrieval adapter;
6. structured evidence records;
7. retrieval dates and source publication dates where available;
8. claim excerpts or concise summaries;
9. evidence-state classification;
10. source and claim deduplication;
11. freshness and recheck fields;
12. a private local evidence repository;
13. a clear boundary between raw private evidence and public cited output.

### 9.2 Initial acquisition approach

The first implementation MAY use **Scrapling** because the product owner already uses it. Other free or low-cost tools may be evaluated where they reduce failure rates or handle a specific source type better.

The system must not be coupled to one scraper. Each retrieval adapter should return a shared result contract such as:

- source URL;
- source domain;
- source type;
- retrieved status;
- retrieved date;
- page title;
- relevant content;
- claim type;
- evidence state;
- error or exclusion reason.

### 9.3 Source order

The default search order should be:

1. official pricing, feature, integration, security, support, and documentation pages;
2. official status pages and public policies;
3. approved independent review and analyst sources;
4. product marketplaces and integration directories;
5. credible technical walkthroughs;
6. community sources used primarily to discover recurring experience patterns;
7. other approved sources explicitly added to the registry.

Question sources and evidence sources remain separate:

- the crowd helps identify what people are asking;
- approved evidence sources support the answer.

### 9.4 Bounded search and resilient outcomes

Agents and scripts must complete a defined search strategy rather than search indefinitely.

When the bounded search ends, the workflow must return one of the valid evidence states. It must not stop because a desired claim could not be verified.

The public output may say:

- sufficient evidence supports the claim;
- evidence is partial;
- trusted sources conflict;
- evidence could not be verified;
- information appears outdated;
- the vendor does not publish the required information.

### 9.5 Responsible retrieval

Evidence acquisition must:

- respect applicable access controls, terms, and rate limits;
- avoid bypassing authentication or technical restrictions;
- avoid copying entire copyrighted pages into public output;
- store only what is necessary for traceability and analysis;
- keep private evidence out of the public source repository;
- record why a source was skipped or unavailable.

### 9.6 Required public proof

Phase 2 must visibly improve the deployed three-page set by showing structured evidence outputs such as:

- source references;
- last-checked dates;
- evidence-confidence labels;
- verified and unverified claim treatment;
- explicit conflicting-evidence treatment;
- updated recommendations when the evidence changes.

At least one live three-page set must be produced or materially regenerated through the evidence pipeline.

### 9.7 Phase 2 exit gate

Phase 2 is complete when:

- one selected category can be researched through a bounded process;
- every retrieval attempt returns a valid structured outcome;
- raw evidence remains private and local;
- public claims can be traced to evidence records;
- unavailable evidence does not halt publication;
- the live pages visibly use the structured evidence;
- the daily three-page release rule remains achievable.

---

# PHASE 3 — DECISION INTELLIGENCE

## 10. Phase 3 Objective

Phase 3 turns structured evidence into transparent, repeatable decision support.

The goal is not to produce a single unexplained score. The goal is to explain:

- how strong the product appears;
- how well it fits the specific user situation;
- how strong the supporting evidence is;
- which trade-offs affect the recommendation;
- what could cause a different recommendation.

### 10.1 Required scoring outputs

The first decision engine SHOULD separate:

1. **Product Score** — how the product performs against the published Vetted Evaluation Framework.
2. **Fit Score** — how well the product matches the buyer’s stated context and priorities.
3. **Evidence Confidence Score** — how complete, current, corroborated, and relevant the evidence is.

A strong Product Score does not automatically mean the product is the best fit for every buyer.

### 10.2 Evaluation criteria

The initial shared framework includes:

- value and total cost;
- capability and feature coverage;
- usability and time to value;
- ecosystem and integration fit;
- reliability and support;
- trust, security, privacy, and compliance;
- recurring user-experience patterns and sentiment.

Sentiment must be treated as a pattern of repeated reasons, not as a simple average of star ratings.

### 10.3 Primary page algorithms

Each page type owns one primary algorithm:

- **Decision Hub:** question-to-understanding algorithm;
- **Solution Hub:** best-fit recommendation algorithm;
- **Decision Scenario:** scenario-resolution algorithm.

They reuse shared components for:

- evidence confidence;
- source weighting;
- recency;
- claim conflict;
- buyer-state classification;
- constraint matching;
- criterion weighting;
- recommendation explanation.

### 10.4 Algorithm contract

Every algorithm must define:

- purpose;
- required inputs;
- optional inputs;
- expected structured output;
- validation rules;
- missing-data behaviour;
- conflicting-data behaviour;
- version identifier;
- metrics;
- reproducibility requirements.

### 10.5 Hard recommendation rules

Recommendations MUST:

- be conditional rather than absolute;
- identify the applicable buyer context;
- provide the reason;
- identify trade-offs;
- identify who should not choose the product;
- show the evidence state;
- distinguish fact from interpretation;
- remain independent of affiliate commission value.

An AI model may explain a calculation, but it may not invent the calculation.

### 10.6 Required public proof

The deployed pages must visibly show:

- why the recommendation applies;
- which user inputs or assumptions affected it;
- material strengths and trade-offs;
- separate fit and evidence-confidence signals;
- conflicting or missing evidence where relevant;
- a methodology or “how we decided” explanation.

### 10.7 Phase 3 exit gate

Phase 3 is complete when:

- the same structured inputs reproduce the same decision result;
- no recommendation is produced without a reason;
- no score is produced without supporting evidence or an explicit evidence limitation;
- all three page types use their agreed decision contracts;
- the deployed pages make the decision logic understandable to a non-technical user;
- the three-page daily output remains possible.

---

# PHASE 4 — CONTENT AND PUBLISHING ENGINE

## 11. Phase 4 Objective

Phase 4 converts structured customer questions, evidence, and decision results into consistent public pages without asking an AI agent to “write a blog post.”

The page is a view of the structured model. The model is not inferred from an unstructured article after publication.

### 11.1 Required capabilities

The publishing engine SHOULD support:

- mandatory information blocks per page type;
- deterministic block ordering;
- conditional blocks based on buyer context and evidence state;
- title and URL generation from user intent;
- internal links between related decision experiences;
- reusable evidence citations;
- affiliate-link insertion after recommendation logic;
- visible disclosures;
- structured metadata;
- canonical URLs;
- XML sitemap inclusion;
- answer-first summaries;
- accessible headings and navigation;
- mobile-first rendering;
- content freshness fields;
- publish, update, and rollback states.

### 11.2 SEO and AEO requirements

Every public page SHOULD be:

- organised around a real customer question, decision, or outcome;
- written in plain language;
- answerable in extractable sections;
- explicit about assumptions and conditions;
- supported by visible evidence;
- linked to related decision pages;
- available at a stable URL;
- crawlable unless deliberately excluded;
- free from filler written only to reach a target length.

Word count is not a quality gate. Decision completion is.

### 11.3 Throughput target

The engine should first meet these practical targets:

- no more than one hour of active production time per page;
- one complete three-page decision set per active build day;
- later, one complete set with minimal operator intervention.

### 11.4 Required public proof

Phase 4 must deploy at least one **new** three-page set generated from the structured content model, rather than manually assembled page-by-page.

The release must demonstrate:

- consistent page structure;
- correct evidence rendering;
- working internal navigation;
- metadata and indexability;
- affiliate link placement;
- visible freshness and confidence information;
- acceptable mobile and desktop presentation.

### 11.5 Phase 4 exit gate

Phase 4 is complete when:

- a structured record can generate each of the three page types;
- the page generator does not invent unsupported sections;
- validation catches missing required blocks;
- a failed optional block does not prevent the rest of the page from publishing;
- the system can update a page without duplicating the underlying research;
- the generated pages are live on Vercel;
- the daily three-page shipping rule is maintained.

---

# PHASE 5 — AUTOMATION AND CLOUD EXECUTION

## 12. Phase 5 Objective

Phase 5 automates the proven workflow. It does not redesign it.

The system should progress from a locally observable workflow to a reliable cloud-executed production line that can research, evaluate, assemble, validate, and publish without requiring the owner’s computer to remain active.

### 12.1 Deterministic state machine

The automation system should use fixed states such as:

1. scope selected;
2. questions discovered;
3. sources selected;
4. evidence retrieved;
5. evidence normalised;
6. evidence evaluated;
7. decision result generated;
8. page records assembled;
9. validation completed;
10. deployment completed;
11. metrics recorded;
12. refresh scheduled.

Each state must have:

- a defined input;
- a defined output schema;
- validation;
- retry rules;
- timeout rules;
- failure-state output;
- an audit record.

### 12.2 AI worker roles

AI models may be used for narrow roles such as:

- question clustering;
- claim extraction;
- evidence summarisation;
- conflict explanation;
- feature-to-outcome translation;
- structured draft assembly;
- quality review.

AI models must not own:

- workflow state;
- source policy;
- score formulas;
- affiliate prioritisation;
- publication permission rules;
- evidence-state definitions;
- irreversible external commitments.

### 12.3 Model independence

Every AI task should use a defined input and output contract so that models can be replaced according to cost, capability, or availability.

The system must not require a premium model for routine deterministic work where a cheaper model or non-AI rule is sufficient.

### 12.4 Local-to-cloud progression

The preferred sequence is:

1. prove the workflow locally;
2. log all state transitions;
3. verify retries and recovery;
4. identify long-running and scheduled jobs;
5. select an appropriate cloud runtime;
6. migrate one workflow at a time;
7. preserve a local recovery path;
8. add scheduling and monitoring;
9. demonstrate automated production deployment.

Cloud selection is an implementation decision. Public pages remain on Vercel; background work may run elsewhere if that is more reliable or economical.

### 12.5 No idle approval gates

Routine workflow stages should use automated validation rather than waiting for human approval.

Human input is required only for:

- a scope decision that cannot be resolved from the approved rules;
- a legal or commercial decision;
- credentials or access that cannot be obtained automatically;
- an irreversible external commitment;
- a deliberate methodology change.

When human input is required, all unrelated implementable work must continue.

### 12.6 Required public proof

Phase 5 must demonstrate at least one complete run that:

- starts from a defined decision topic;
- gathers or refreshes evidence;
- produces valid evidence states;
- applies the decision logic;
- assembles the three page types;
- validates them;
- deploys or updates them on Vercel;
- records the run result.

### 12.7 Phase 5 exit gate

Phase 5 is complete when:

- the automation can recover from an unavailable source;
- changing an AI worker does not change the workflow contract;
- retries do not create duplicate records or duplicate pages;
- the run produces a valid completion result even when evidence is missing;
- deployed pages can be traced to the workflow run and evidence version;
- the cloud process can operate without the owner’s computer remaining active;
- automation has not reduced the daily content output.

---

# PHASE 6 — GROWTH AND MONETISATION OPTIMISATION

## 13. Phase 6 Objective

Phase 6 improves the commercial and distribution performance of an already monetised product.

Affiliate links are present from Phase 1. This phase improves how effectively the platform attracts qualified users, earns trust, captures leads, and sends suitable buyers to vendors.

### 13.1 Affiliate optimisation

The system SHOULD add or improve:

- tracked affiliate links;
- link health checks;
- click attribution by page and recommendation context;
- CTA placement based on the user’s decision stage;
- clear affiliate disclosures;
- alternative actions where no affiliate relationship exists;
- comparison of commercial performance without changing editorial scores;
- reporting for clicks, conversions, revenue, and expired offers.

### 13.2 Decision assets and email capture

Lead capture should occur when the user requests a useful next-step asset, not through an unrelated interruption.

The initial lead asset should be a **personalised decision report** derived from the same evidence and recommendation model.

Later assets may include:

- implementation checklists;
- migration checklists;
- vendor scorecards;
- shortlist reports;
- ROI calculators;
- internal business-case summaries;
- risk and compliance checklists.

The asset offered must match the buyer’s stage and context.

### 13.3 Distribution

Phase 6 SHOULD test distribution channels that fit the content rather than publishing everywhere by default.

Potential channels include:

- organic Google search;
- answer-engine visibility;
- Pinterest for visual decision assets and suitable categories;
- email sequences tied to requested decision assets;
- partner referrals;
- vendor or expert citations;
- selected communities where participation is relevant and non-spammy.

### 13.4 Ethical conversion rules

Growth features must not use:

- false urgency;
- hidden affiliate relationships;
- manipulated rankings;
- misleading savings claims;
- preselected answers that distort fit;
- email gates before the user receives basic decision value;
- dark patterns.

### 13.5 Required public proof

Phase 6 must deploy:

- at least one context-relevant decision asset;
- a working email request flow;
- affiliate click tracking;
- clear disclosures;
- a measurable next-step journey from each page type.

### 13.6 Phase 6 exit gate

Phase 6 is complete when:

- affiliate activity can be measured by decision context;
- at least one lead asset is generated from structured data;
- email capture does not block access to the core public answer;
- the recommendation remains unchanged when commission values change;
- growth experiments are traceable and reversible;
- the public pages continue to satisfy the evidence and daily shipping rules.

---

# PHASE 7 — LEARNING AND PLATFORM INTELLIGENCE

## 14. Phase 7 Objective

Phase 7 turns usage, search, freshness, and feedback signals into controlled improvements without allowing the system to change its methodology unpredictably.

### 14.1 Signals to collect

The platform SHOULD collect:

- search queries and landing-page intent;
- page engagement;
- outbound affiliate clicks;
- requested decision assets;
- user-selected priorities;
- shortlist choices;
- evidence age;
- pricing or feature changes;
- broken or redirected sources;
- recurring source disagreements;
- recommendation usefulness feedback;
- content gaps;
- crawler activity where available.

### 14.2 Controlled learning loop

The improvement cycle should be:

1. collect signals;
2. validate signal quality;
3. identify a proposed change;
4. test the change against existing cases;
5. document the reason;
6. approve the methodology version;
7. deploy the change;
8. monitor the result;
9. retain the ability to roll back.

Scoring weights must not silently drift because of a small or biased dataset.

### 14.3 Vetted Decision Engine beta

Once enough structured products and decisions exist, this phase MAY introduce the first interactive Vetted Decision Engine.

The initial tool should:

- ask for budget, team, outcome, constraints, required capabilities, and risk priorities;
- apply deterministic fit logic;
- return the best two suitable options where evidence supports them;
- explain why each option fits;
- identify the trade-offs;
- show evidence confidence;
- state when no confident recommendation is possible;
- offer a personalised decision report.

### 14.4 Required public proof

Phase 7 must deploy at least one of the following as a working public capability:

- an evidence refresh and change-history experience;
- a methodology version history;
- an interactive decision tool;
- a user feedback mechanism that visibly changes a subsequent page version;
- a dynamic category or decision insight generated from the evidence base.

### 14.5 Phase 7 exit gate

Phase 7 is complete when:

- user and system signals can be traced to proposed improvements;
- framework changes are versioned;
- stale evidence is identifiable;
- page refreshes preserve historical traceability;
- the interactive decision result is reproducible;
- the feedback loop improves the product without undermining editorial independence.

---

# PHASE 8 — AI ECOSYSTEM AND KNOWLEDGE READINESS

## 15. Phase 8 Objective

Phase 8 prepares Vetted SaaS Blueprint to serve legitimate AI systems, controlled crawlers, retrieval partners, and future knowledge-licensing models.

This is a strategic option, not a dependency for the immediate affiliate business.

### 15.1 Required readiness capabilities

The platform MAY develop:

- AI crawler identification, monitoring, and control;
- clear crawler policies;
- structured data and machine-readable summaries;
- stable source and evidence identifiers;
- content licensing terms;
- selective retrieval endpoints;
- a knowledge API;
- rate limiting and access controls;
- attribution requirements;
- citation monitoring;
- paid retrieval or crawler monetisation where a viable platform supports it;
- partner feeds for approved consumers;
- audit logs for machine access.

### 15.2 Entry condition

Phase 8 should not become the main focus until:

- the human decision product is useful;
- affiliate and lead-generation journeys are working;
- the evidence system is reliable;
- public content is consistently structured;
- there is enough proprietary decision intelligence to justify controlled access.

### 15.3 Required public proof

The phase should produce a demonstrable capability such as:

- a deployed crawler-control policy;
- machine-readable decision summaries;
- a controlled knowledge endpoint;
- a licensing-ready data export;
- an AI access dashboard;
- an attribution or citation report.

### 15.4 Phase 8 exit gate

Phase 8 is complete only when AI access can be monitored, controlled, and connected to a clear strategic or commercial purpose without reducing public usability or search visibility unintentionally.

---

## 16. Cross-Phase Capability Map

| Capability | Phase introduced | Phase matured |
|---|---:|---:|
| Decision Hub | 1 | 4–7 |
| Solution Hub | 1 | 4–7 |
| Decision Scenario | 1 | 4–7 |
| Affiliate links and disclosure | 1 | 6 |
| Basic SEO and AEO | 1 | 4 and 8 |
| Manual evidence records | 1 | 2 |
| Approved source registry | 2 | 7 |
| Scraping and retrieval adapters | 2 | 5 |
| Evidence confidence | 2 | 3 and 7 |
| Product and Fit Scores | 3 | 7 |
| Deterministic page algorithms | 3 | 5 and 7 |
| Structured content generation | 4 | 5 |
| Automated publishing | 4 | 5 |
| Cloud workflow execution | 5 | 7 |
| Model-independent AI workers | 5 | 7 |
| Lead magnets and email capture | 6 | 7 |
| Distribution optimisation | 6 | 7 |
| Interactive Decision Engine | 7 | 8 |
| AI crawler control and licensing readiness | 8 | Ongoing |

---

## 17. De-Scope Ladder

When the daily or phase delivery gate is at risk, complexity must be removed in this order.

### 17.1 Remove breadth

1. Reduce the number of categories.
2. Reduce the number of products.
3. Reduce optional evidence fields.
4. Reduce optional page blocks.
5. Reduce channels and integrations.

### 17.2 Replace automation with direct execution

6. Replace automated research with manual bounded research.
7. Replace multi-agent work with one controlled worker.
8. Replace dynamic orchestration with a fixed script.
9. Replace a remote service with a local process.
10. Replace a database dependency with validated local structured files.
11. Replace dynamic page assembly with a fixed deterministic template.

### 17.3 Postpone nonessential platform work

12. Postpone dashboards.
13. Postpone user accounts.
14. Postpone personalisation.
15. Postpone advanced analytics.
16. Postpone multi-cloud or migration abstractions.
17. Postpone nonessential animations and visual effects.
18. Postpone broad crawler or licensing infrastructure.

### 17.4 Requirements that may not be removed

The following must remain even in the simplest release:

- truthful claims;
- evidence or an explicit evidence limitation;
- customer-problem-first structure;
- conditional recommendation language;
- working production pages;
- affiliate disclosure;
- basic accessibility;
- working navigation and links;
- no fabricated public evidence;
- no workflow halt caused solely by missing evidence.

---

## 18. Roadmap Governance

### 18.1 One active delivery queue

The project should maintain one ordered implementation queue. New ideas may be recorded, but they must not interrupt the current three-page release unless they resolve an active blocker.

### 18.2 One writer at a time

Only one agent or process should have write authority over the same code or content area at a time. Other agents may research, review, or test without creating conflicting edits.

### 18.3 Automated gates, not idle gates

Validation gates should run automatically wherever possible. A gate must return:

- pass;
- qualified pass;
- fail with a repair action;
- insufficient evidence;
- blocked external dependency while unrelated work continues.

A gate may not simply leave the workflow waiting without a next action.

### 18.4 Roadmap changes

Any material roadmap change should record:

- what changed;
- why it changed;
- which evidence or build result justified it;
- which phase and acceptance criteria are affected;
- whether the three-page shipping rule remains protected.

### 18.5 Phase review

At each phase boundary, review only:

1. What is live?
2. What customer value is now possible?
3. What was automated?
4. What remains manual?
5. What failed?
6. What complexity should be removed?
7. What is the next smallest deployable improvement?

---

## 19. Roadmap Metrics

### 19.1 Delivery metrics

- Complete three-page sets deployed per active build day.
- Percentage of active build days ending with a Vercel deployment.
- Average active time required per page.
- Average time from topic selection to production deployment.
- Number of days blocked by infrastructure without public output.
- Percentage of phase acceptance criteria demonstrated publicly.

### 19.2 Evidence metrics

- Percentage of material claims linked to evidence.
- Percentage of records with retrieval dates.
- Percentage of searches returning a valid evidence state.
- Frequency of workflow failures caused by missing evidence.
- Age of evidence by claim type.
- Rate of source conflicts and unresolved claims.

### 19.3 Decision-quality metrics

- Percentage of recommendations that state applicable conditions.
- Percentage that explain trade-offs.
- Percentage that identify who should not choose the product.
- Reproducibility of scores and recommendations.
- User-reported usefulness or confidence.
- Frequency of recommendation changes after evidence refreshes.

### 19.4 Commercial metrics

- Affiliate click-through rate by page type and decision context.
- Affiliate conversion and revenue where partner reporting permits.
- Decision-asset request rate.
- Email capture rate after value has been delivered.
- Revenue per qualified decision journey.
- Broken or expired affiliate links.

### 19.5 Organic and AEO metrics

- Indexed decision pages.
- Search impressions and qualified clicks.
- Queries that match intended customer decisions.
- Pages receiving answer-engine referrals or citations where measurable.
- Legitimate crawler activity.
- Internal link coverage across decision journeys.

### 19.6 Automation metrics

- Successful workflow completion rate.
- Manual interventions per content set.
- Retry and recovery success rate.
- Cost per evidence record and published page.
- Time saved compared with the manual baseline.
- Ability to replace an AI model without changing the workflow.

---

## 20. Key Risks and Mitigations

### 20.1 Overengineering before publication

**Risk:** The project builds a scraper, agent platform, database, or orchestrator for weeks without live customer value.

**Mitigation:** Three-page daily release rule, Vercel phase gates, manual fallback, and the de-scope ladder.

### 20.2 Speed causes low-quality or invented content

**Risk:** Pressure to publish encourages hallucinated evidence or generic writing.

**Mitigation:** Use real minimum viable evidence, explicit insufficient-evidence states, fixed page contracts, and public claim validation.

### 20.3 Scraping becomes fragile or expensive

**Risk:** Sources block retrieval, change layouts, or impose cost.

**Mitigation:** Approved source tiers, swappable adapters, bounded search, structured failure states, rate-limit compliance, and manual fallback.

### 20.4 Affiliate bias damages trust

**Risk:** Higher-paying products receive stronger recommendations.

**Mitigation:** Separate commercial data from evaluation inputs, publish the methodology, track recommendation independence, and provide non-affiliate alternatives where appropriate.

### 20.5 Automation reduces output instead of increasing it

**Risk:** The team spends more time repairing agents than publishing pages.

**Mitigation:** Automate only proven manual tasks, measure time saved, and remove automation that threatens the daily release target.

### 20.6 Evidence becomes stale

**Risk:** Prices, features, policies, and integrations change.

**Mitigation:** Retrieval dates, freshness classes, scheduled rechecks, change detection, evidence versioning, and visible last-checked dates.

### 20.7 Raw evidence is exposed or lost

**Risk:** The private research base is committed publicly, accessed improperly, or lost from the owner’s computer.

**Mitigation:** Keep raw evidence outside the public repository, use access controls, maintain encrypted backups, and publish only necessary cited summaries.

### 20.8 Cloud execution creates new dependencies

**Risk:** Moving too early to cloud workers adds cost and complexity.

**Mitigation:** Local proof first, one workflow migration at a time, provider-neutral contracts, and no cloud dependency before public page value is proven.

### 20.9 Search traffic does not arrive quickly

**Risk:** High-quality pages take time to earn organic visibility.

**Mitigation:** Affiliate links from day one, targeted decision intent, internal linking, email decision assets, selective Pinterest tests, partner distribution, and continual query-based refinement.

### 20.10 Page volume becomes the goal

**Risk:** The daily rule is misused to create shallow pages.

**Mitigation:** Three pages must form one coherent decision set, pass the minimum quality floor, and use real evidence or explicit uncertainty. Raw page count is not accepted without usefulness.

---

## 21. Decisions Locked by This Roadmap

The following decisions are now treated as fixed unless the product owner explicitly revises them:

1. The project will build public output before deep infrastructure.
2. The minimum release unit is one Decision Hub, one Solution Hub, and one Decision Scenario.
3. Every active build day must end with a complete three-page set live on Vercel.
4. No phase may advance without public Vercel proof.
5. Failure to ship triggers de-scoping, not indefinite extension.
6. Public claims may not be fabricated for the sake of speed.
7. Missing, partial, and conflicting evidence are valid outputs.
8. Affiliate links and disclosures may be present from Phase 1.
9. Affiliate value may not influence editorial scoring or recommendations.
10. Manual research and local structured files are acceptable before automation.
11. Scrapling may be the first retrieval tool, but the evidence system must remain tool-independent.
12. Raw evidence remains private and local unless a later security and storage decision changes this.
13. Public pages render only the evidence needed to justify the decision.
14. The deterministic workflow controls the process; AI models are replaceable workers.
15. Automation starts locally and moves to the cloud only after the flow works.
16. Public pages remain deployed through Vercel.
17. Each content type owns one primary algorithm and reuses shared decision components.
18. Phase 6 optimises monetisation; it does not postpone monetisation until then.
19. AEO and machine readability begin with the first public pages.
20. AI crawler monetisation is a future strategic option, not a prerequisite for the immediate business.

---

## 22. Open Decisions for Implementation Planning

The roadmap deliberately leaves the following choices for the detailed implementation plan:

- the first customer problem or SaaS category;
- the first affiliate products;
- the exact three Phase 1 page titles and URLs;
- the visual shell used before the full design system is completed;
- the local evidence directory, encryption, and backup approach;
- whether initial structured public data uses local files, Convex, or another store;
- the exact Scrapling integration and fallback retrieval tools;
- the model-routing policy for each worker task;
- the cloud runtime for long-running or scheduled workflows;
- analytics and affiliate attribution tools;
- the email service used for decision assets;
- the schema formats for content, evidence, and algorithm outputs;
- the exact performance and accessibility thresholds;
- the first Pinterest or partner-distribution experiments.

These decisions must be made at the smallest useful scope. They may not be used as reasons to postpone the Phase 1 public release.

---

## 23. Definition of Done for This Roadmap

This roadmap is ready to guide planning when:

- the phase sequence is accepted;
- the three-page daily release rule is understood as mandatory;
- every phase has a public Vercel proof requirement;
- Phase 1 can begin without waiting for final architecture;
- evidence automation is clearly separated from the first visual proof;
- affiliate monetisation is included from the initial release;
- local-to-cloud automation progression is understood;
- de-scoping rules are accepted;
- the next document can define the visual system without changing the delivery strategy.

---

## 24. Relationship to the Ten-Document Product Set

The complete product-definition sequence is:

1. Market Research and Opportunity Plan
2. **Product Roadmap and Incremental Delivery Plan — this document**
3. Design System
4. Art Direction
5. Product Requirements Document
6. Content Specification
7. Onboarding and Activation Plan
8. UI Kit and Component Library
9. Growth and Distribution Strategy
10. Quality Assurance and Testing Plan

The current Master PRD was created before Documents 1–4 were finalised. It remains a working source of product decisions and should be revised after the Design System and Art Direction documents are completed.

The next document is the **Design System**, which will define the locked visual, interaction, accessibility, responsive, and consistency rules required to render the roadmap’s public experiences.

---

## 25. Final Roadmap Principle

> **Build the smallest truthful version of the final decision product, publish it immediately, and automate only what has already proved useful. Every phase must leave Vetted SaaS Blueprint more visible, more useful, and more commercially capable than it was before.**
