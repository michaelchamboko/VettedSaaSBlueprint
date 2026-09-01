# Vetted SaaS Blueprint — AI-First System Architecture and Automation Blueprint

**Document:** 03 — mandatory architecture and automation companion document  
**Version:** 1.0  
**Status:** Working architectural contract  
**Date:** 27 August 2026  
**Product owner:** Michael Chamboko  
**Primary production environment:** Existing Vetted SaaS Blueprint website on Vercel  
**Related documents:**

- `Vetted-SaaS-Blueprint-01-Market-Research-and-Opportunity-Plan-v1.md`
- `Vetted-SaaS-Blueprint-02-Product-Roadmap-v1.md`
- `Vetted-SaaS-Blueprint-Master-PRD-v1.md`

> **Sequence note:** The original ten-document outline placed the Design System third. During roadmap definition, the product owner added this architecture and automation blueprint as a mandatory document because model independence, daily publishing, and incremental automation are central product requirements. The master document index may later label this file **03A** or renumber the remaining documents. Its requirements apply immediately regardless of final numbering.

---

## 1. Purpose of This Document

This document defines **how Vetted SaaS Blueprint must operate as an AI-first, deterministic, model-independent production system while continuously improving an existing live website**.

It establishes:

- the high-level system components;
- the movement of evidence and content through the system;
- the boundary between deterministic software and AI workers;
- the local-to-cloud automation strategy;
- the role of premium and lower-cost models;
- the daily publishing guarantee;
- the 23:00 SAST rescue and escalation rule;
- Vercel deployment requirements;
- GitHub’s optional, non-blocking role;
- data ownership and security boundaries;
- failure handling, observability, and recovery requirements;
- the acceptance conditions for model-independent automation.

This is not a low-level implementation plan. It does not lock the project into a particular queue, database, framework, scraper, model provider, or cloud worker before those choices are tested. It defines the contracts those tools must satisfy.

The architecture has one central purpose:

> **Help Vetted SaaS Blueprint publish truthful, useful, evidence-backed customer decision pages quickly every day, while progressively reducing the cost and intelligence required from the AI models doing the work.**

---

## 2. Document Authority

The words **MUST**, **SHOULD**, and **MAY** are deliberate:

- **MUST** means mandatory.
- **SHOULD** means expected unless a documented technical result proves a simpler approach is better.
- **MAY** means optional or deferred.

Where a future implementation task conflicts with this document, this document takes priority unless the product owner explicitly changes the decision.

No agent, model, framework, implementation plan, or infrastructure preference may silently weaken:

1. the three-page daily publishing guarantee;
2. truthful evidence handling;
3. model independence;
4. the deterministic workflow boundary;
5. production continuity for the existing indexed website;
6. affiliate impartiality;
7. the 23:00 SAST publishing rescue rule.

---

## 3. Existing Product Context

Vetted SaaS Blueprint is **not a greenfield application**.

The website:

- already exists;
- is deployed on Vercel;
- is publicly accessible;
- is already being discovered and indexed by Google;
- already contains affiliate-oriented content and product pages;
- must be enhanced incrementally rather than held back for a future relaunch.

The architecture must therefore protect the live product while improving it.

### 3.1 Enhancement-first rule

The default approach is to improve the existing system through small, reversible deployments.

The project MUST:

- preserve useful existing URLs wherever practical;
- avoid unnecessary full-site rewrites;
- add redirects where a URL must change;
- preserve indexing signals and working internal links;
- avoid removing live value merely because a new architecture is being introduced;
- allow old and new page formats to coexist during migration;
- keep production deployable throughout the transition.

A rewrite is justified only when it is demonstrably simpler, safer, and faster than incremental enhancement and does not threaten the daily publishing rule.

### 3.2 Production is the product

Local code, research files, automation scripts, prompts, schemas, tests, and preview deployments are supporting work. They are not the final output.

The product exists only when the customer can access the resulting pages on the live Vetted SaaS Blueprint website.

---

## 4. Non-Negotiable Delivery Contract

### 4.1 The daily release unit

Every active build day MUST end with one connected three-page decision set live on Vercel:

1. **Decision Hub** — helps the customer understand the problem, pain points, desired outcome, constraints, and decision factors.
2. **Solution Hub** — maps a customer outcome and situation to conditional best-fit solutions, reasoning, evidence, trade-offs, and next steps.
3. **Decision Scenario** — resolves one specific real-world buying situation and compares products only where comparison is necessary to answer the decision.

The three pages must address the same customer problem, outcome, category, or buying journey. Three unrelated pages do not satisfy the requirement.

### 4.2 Daily publishing guarantee

> **Every active build day MUST end with all three required pages live, working, and verifiable on Vercel.**

The daily result must include:

- live production URLs;
- working navigation between the relevant pages;
- truthful evidence or an explicit evidence limitation;
- visible affiliate disclosure where affiliate links are used;
- functioning affiliate links where available;
- acceptable mobile and desktop rendering;
- valid page titles and metadata;
- no known critical accessibility or rendering failure;
- a recorded deployment result.

A day spent only on infrastructure, automation, databases, prompts, agents, schemas, refactoring, or planning does not satisfy the guarantee.

### 4.3 No internal exception

An internal technical problem is not a reason to miss publication.

When publication is at risk, the system MUST reduce complexity by:

1. freezing new feature work;
2. limiting the product set;
3. reducing optional page sections;
4. replacing automation with direct AI-first execution;
5. replacing multi-agent work with one capable model;
6. replacing dynamic generation with a fixed template;
7. replacing a remote dependency with validated local structured data;
8. publishing a narrower but truthful result;
9. recording deferred improvements for the next build day.

An independently verifiable outage of Vercel, DNS, or another unavoidable production dependency is the only acceptable external exception. Even then, the system must produce a deploy-ready build, continue retries, preserve all work, and publish immediately when the external service recovers.

### 4.4 Speed does not permit fabrication

The publishing guarantee does not allow invented evidence, fabricated scores, false claims, fake user sentiment, or unsupported recommendations.

When evidence is unavailable, the page must state:

- that evidence is insufficient;
- which question could not be resolved;
- which sources were checked;
- what remains unknown;
- how the uncertainty affects the recommendation.

**No evidence is a valid output. It is not a workflow failure.**

Evidence state must never become a deployment gate. The system must publish the connected daily three-page set with its actual confidence and uncertainty, then create a versioned refresh task. When new, corrected, or materially changed evidence appears, the architecture must support updating the live pages and derived assets without waiting for a rebuild of the whole publication system.

---

## 5. AI-First Execution Definition

In this project, “manual” does not mean that the product owner must personally research, write, format, and publish every page.

The initial fallback is **direct AI-first execution using the most capable approved model**, initially GPT-5.6 Sol or the current equivalent premium reference model.

The premium model may:

- perform bounded research;
- interpret evidence;
- create structured content records;
- assemble the three page types;
- review quality;
- repair failed outputs;
- update implementation tasks;
- simplify the workflow when necessary;
- prepare and deploy the daily release.

Human involvement should be limited to:

- decisions that materially change product scope;
- credentials or account access that cannot be obtained automatically;
- legal or commercial commitments;
- irreversible external actions;
- deliberate changes to the Vetted methodology;
- final business judgement where the approved rules cannot resolve a conflict.

The system must not confuse “AI executed” with “fully automated.” Direct work by a premium model is the reference process from which repeatable automation is extracted.

---

## 6. Core Architecture Principles

### 6.1 Shipping before architectural perfection

Working public pages take priority over elegant internal systems.

Architecture exists to increase shipping speed, quality, recoverability, and affordability. Architecture that delays public output must be reduced or removed.

### 6.2 Determinism before intelligence

Where a rule can be expressed in code, schema validation, arithmetic, a lookup table, or a state transition, the system SHOULD use that deterministic mechanism instead of asking an AI model to decide.

AI should handle work that genuinely requires interpretation, language understanding, synthesis, classification, or explanation.

### 6.3 AI workers, not AI ownership

The deterministic workflow owns:

- state transitions;
- required stages;
- source policy;
- evidence-state definitions;
- scoring formulas;
- validation rules;
- publication permission;
- affiliate-integrity rules;
- retry and recovery policy;
- completion criteria.

AI workers may complete bounded tasks inside those rules. They may not redefine the rules during execution.

### 6.4 Model independence by design

The system must be designed so that a lower-cost, less capable model can eventually perform routine work at an acceptable quality level.

A task is not properly automated merely because it works with the most capable model.

> **Automation is considered mature only when the task can be performed reliably through a defined contract, tested against a reference result, and completed by the least expensive qualified model without material quality loss.**

### 6.5 Premium models establish and protect the quality bar

The premium reference model is used to:

- establish the first correct output;
- expose hidden reasoning steps that must become explicit rules;
- create reference examples;
- repair weak automation;
- handle genuinely ambiguous or high-risk tasks;
- rescue the daily publishing guarantee;
- improve prompts, schemas, validators, and deterministic modules.

The premium model is a quality and recovery layer, not the intended permanent worker for every routine task.

### 6.6 Incremental automation

Automation must be added one proven module at a time.

The project must not attempt to automate the entire research-to-publish process before the premium reference process has produced a valid live result.

### 6.7 Single source of truth

Each claim, source, evidence state, score, recommendation, and page record must have one authoritative structured representation.

Public pages are views of structured records. They must not become independent copies that drift away from the underlying evidence.

### 6.8 One writer at a time

Only one agent or process may hold write authority over the same code, content record, or deployment target at one time.

Other workers may research, review, test, or prepare proposed changes, but conflicting simultaneous writes are prohibited.

### 6.9 No idle workflow gates

A validation gate must return a next action.

Valid outcomes include:

- pass;
- qualified pass;
- fail with an automatic repair task;
- partial evidence;
- conflicting evidence;
- insufficient evidence;
- blocked external dependency while unrelated work continues;
- escalation to a more capable model.

A gate may not leave the workflow waiting indefinitely.

### 6.10 Infrastructure cannot become the product

Scrapers, databases, agent frameworks, queues, schedulers, Git hosting, and observability tools are replaceable support components.

None may become a prerequisite that prevents the simpler AI-first fallback from publishing the daily set.

---

## 7. High-Level System View

The target architecture consists of the following logical components.

### 7.1 Existing Vercel website

The existing Vetted SaaS Blueprint website remains the public product and production target.

Responsibilities:

- render public pages;
- preserve current navigation and indexed routes;
- host the three decision page types;
- expose structured metadata for search and answer engines;
- present evidence excerpts, confidence, freshness, and disclosures;
- provide affiliate and lead-generation actions;
- receive small, frequent deployments.

### 7.2 Content and page schema layer

A structured content model defines every mandatory and optional block for:

- Decision Hubs;
- Solution Hubs;
- Decision Scenarios;
- future decision assets and personalised reports.

The schema layer must prevent an AI worker from inventing arbitrary page structures.

It defines:

- required fields;
- conditional fields;
- evidence references;
- recommendation conditions;
- trade-offs;
- “not for” guidance;
- confidence and freshness data;
- affiliate disclosures and link records;
- validation errors and fallback rendering.

### 7.3 Private evidence repository

The raw evidence repository remains private and under the product owner’s control.

Initial storage may be local on the owner’s computer, with secure backup. The public website receives only the structured summaries and excerpts required to support a claim.

The repository stores:

- source identity and URL;
- source tier and type;
- access date;
- publication or update date where known;
- relevant claim or excerpt;
- screenshot or supporting capture where permitted and necessary;
- evidence summary;
- product and criterion mapping;
- freshness class;
- conflict relationships;
- confidence inputs;
- retrieval status;
- version history.

Whole websites, unnecessary media files, and unrelated scraped content should not be retained.

### 7.4 Evidence acquisition adapters

Retrieval tools sit behind replaceable adapters.

Initial adapters may include:

- Scrapling;
- direct HTTP retrieval where permitted;
- official APIs or feeds;
- browser-based retrieval for dynamic pages;
- bounded search and manual AI-assisted research fallback.

Each adapter must return a common retrieval result rather than exposing tool-specific output to the rest of the workflow.

### 7.5 Deterministic workflow engine

A Python-based workflow is the current preferred direction because the project’s main need is readable orchestration, data processing, validation, and broad AI/tool integration rather than maximum computational speed.

The workflow engine owns:

- run identity;
- state;
- task order;
- input and output contracts;
- retries;
- timeouts;
- checkpointing;
- idempotency;
- model escalation;
- repair tasks;
- deployment permission;
- completion status;
- audit records.

The implementation may use a purpose-built state machine, a lightweight orchestration library, or plain Python modules. The simplest implementation that satisfies the contracts should be preferred.

### 7.6 Model gateway and router

All AI calls should pass through a model-neutral gateway.

The gateway is responsible for:

- task-to-model routing;
- provider and model configuration;
- structured-output enforcement;
- token and cost tracking;
- timeout and retry behaviour;
- response validation;
- fallback model selection;
- premium-model escalation;
- model qualification results.

Application modules must not be tightly coupled to one model provider’s response format.

### 7.7 Shared deterministic decision services

Shared services apply the Vetted methodology consistently.

They include:

- source eligibility checks;
- recency classification;
- evidence confidence calculation;
- evidence conflict handling;
- product score calculation;
- contextual fit score calculation;
- recommendation-condition evaluation;
- affiliate separation rules;
- page completeness checks;
- publication eligibility checks.

An AI model may explain a result. It may not invent the underlying formula or silently change a weight.

### 7.8 Validation and quality engine

The validation engine checks every structured record and rendered page before production deployment.

It covers:

- schema validity;
- required information blocks;
- claim-to-evidence traceability;
- unsupported superlatives;
- conditional recommendation language;
- evidence-state accuracy;
- duplicate or contradictory content;
- broken internal and affiliate links;
- metadata completeness;
- mobile and desktop render sanity;
- basic accessibility;
- production route conflicts;
- disclosure requirements.

### 7.9 Deployment adapter

Deployment must be abstracted behind a Vercel deployment adapter.

The adapter must support the Vercel deployment mechanism approved during implementation, such as the supported CLI or API available at that time, without requiring GitHub Actions.

It must:

- create or identify a preview deployment;
- expose the preview URL;
- run smoke checks;
- promote or deploy the approved build to production;
- verify the final production URLs;
- record deployment identity and source revision;
- support rollback or redeployment;
- return a structured deployment result.

### 7.10 Daily publishing watchdog

A scheduler or watchdog monitors whether the required three-page set has reached production.

It owns:

- the daily deadline;
- current page-set status;
- warning and escalation signals;
- the 23:00 SAST takeover trigger;
- freezing optional work;
- invoking the premium rescue path;
- post-deployment verification;
- failure logging and retry.

The watchdog must be independent of any one AI worker’s self-reported status. It must verify the actual production URLs.

### 7.11 Audit and observability layer

Every run must be traceable.

The audit layer records:

- run ID;
- selected customer problem and page set;
- state transitions;
- model and provider used per task;
- prompt or instruction version;
- input and output schema version;
- evidence versions;
- validation results;
- retries and repairs;
- cost and token usage where available;
- deployment result;
- production URLs;
- premium-model interventions;
- final completion state.

### 7.12 Optional private GitHub remote

Git remains useful for local version control, source history, diffs, and rollback.

A private GitHub repository MAY be used as a remote backup or collaboration mirror. It is not part of the critical publishing path.

The architecture must not require:

- GitHub Actions;
- paid GitHub runners;
- a successful GitHub workflow;
- a public repository;
- GitHub availability before Vercel deployment.

---

## 8. Core End-to-End Workflow

The production workflow uses fixed states. The exact implementation may evolve, but the contracts may not be skipped.

### State 1 — Daily scope selected

**Purpose:** Choose one customer problem and the connected three-page release set.

**Required inputs:**

- customer problem or desired outcome;
- intended audience or buyer state;
- relevant product category;
- initial products or solution types;
- affiliate availability where known;
- target production date.

**Output:** Validated daily scope record.

**Failure behaviour:** Reduce breadth until one coherent set is feasible.

### State 2 — Real questions and pain points discovered

**Purpose:** Identify what customers genuinely need resolved.

**Inputs may include:**

- search questions;
- People Also Ask patterns;
- forums and communities;
- product-support discussions;
- vendor FAQs;
- existing site query data;
- customer language from reviews.

Question sources identify what to answer. They do not prove the answer.

**Output:** Clustered question and pain-point model mapped to the three page types.

### State 3 — Source plan created

**Purpose:** Select approved evidence sources by claim type.

**Output:** Bounded retrieval plan containing:

- required claims;
- approved source tiers;
- preferred domains;
- fallback sources;
- maximum search effort;
- freshness requirement;
- stop condition.

### State 4 — Evidence retrieved

**Purpose:** Collect only the evidence needed to resolve the selected decision.

**Output states:**

- evidence found;
- partial evidence;
- conflicting evidence;
- insufficient evidence;
- source unavailable;
- retrieval prohibited or inaccessible.

Every state is valid and must allow the workflow to continue.

### State 5 — Evidence normalised

**Purpose:** Convert source-specific material into the common evidence schema.

The normalised record must separate:

- what the source directly states;
- what Vetted infers;
- how current the information is;
- how relevant it is to the criterion;
- whether another source corroborates or conflicts with it.

### State 6 — Evidence and decision calculations completed

**Purpose:** Apply deterministic methodology.

Outputs may include:

- evidence confidence;
- product-quality score;
- user-context fit score;
- criterion scores;
- unresolved conflicts;
- recommendation conditions;
- disqualifying conditions;
- uncertainty statements.

### State 7 — Three structured page records assembled

**Purpose:** Create one record for each page type from the same evidence and decision data.

AI may assist with language and synthesis, but it must populate fixed fields.

The records must not become free-form essays.

### State 8 — Content and claim validation completed

**Purpose:** Ensure the pages are useful, truthful, complete, and internally consistent.

A failure must create a repair task rather than halt the whole run.

### State 9 — Preview rendered and tested

**Purpose:** Inspect the actual customer experience.

Checks include:

- rendering;
- navigation;
- links;
- metadata;
- responsive layout;
- evidence display;
- affiliate disclosure;
- obvious accessibility failures;
- page-specific acceptance criteria.

### State 10 — Production deployment completed

**Purpose:** Publish the validated three-page set to the existing Vercel project.

Production deployment is not complete until the final public URLs return the expected pages.

### State 11 — Release verified and recorded

**Purpose:** Confirm actual public value.

The run records:

- production URLs;
- deployment ID;
- release timestamp;
- page checks;
- unresolved noncritical issues;
- evidence version;
- model usage;
- cost;
- whether premium rescue was required.

### State 12 — Improvement tasks scheduled

**Purpose:** Preserve learning without blocking the next day’s release.

Improvements may include:

- evidence refreshes;
- model prompt changes;
- deterministic rules to extract;
- UI issues;
- SEO/AEO improvements;
- automation candidates;
- source-adapter repairs.

---

## 9. The Reference-Quality-to-Automation Method

The architecture follows a specific learning sequence.

### 9.1 Step 1 — Premium reference execution

The first successful run of a new page type, criterion, research task, or workflow module should use the premium reference model where useful.

The goal is not merely to obtain output. The run must reveal:

- required inputs;
- hidden decisions;
- source-selection logic;
- expected structure;
- quality checks;
- common failure modes;
- repair actions;
- conditions requiring judgement.

The result becomes a reference fixture.

### 9.2 Step 2 — Convert judgement into explicit contracts

After the reference result is accepted, the implementation must extract everything that can be made explicit:

- schemas;
- enumerated states;
- lookup tables;
- source allowlists;
- formulae;
- examples;
- validators;
- deterministic transformations;
- retry rules;
- rubrics;
- negative examples.

### 9.3 Step 3 — Build one modular worker

Only one bounded task should be automated at a time, such as:

- extracting claims from an official pricing page;
- clustering customer questions;
- mapping features to customer outcomes;
- producing a structured page block;
- checking recommendation conditions.

The module must have a typed or otherwise strictly validated contract.

### 9.4 Step 4 — Test a lower-cost model

A lower-cost candidate model, such as the approved equivalent of GPT-5.4 or a fast model from another provider, runs the same fixture.

The result is compared against:

- schema validity;
- factual traceability;
- required-field completeness;
- consistency with deterministic calculations;
- decision usefulness;
- unsupported-claim rate;
- repair burden;
- cost and latency.

### 9.5 Step 5 — Qualify or reject the model

A model is qualified per task, not for the whole system.

Possible results:

- **Qualified primary:** meets the quality floor without premium repair.
- **Qualified with validator repair:** acceptable when deterministic repair resolves known issues.
- **Qualified draft-only:** may prepare output but cannot approve publication.
- **Not qualified:** result quality or reliability is insufficient.

### 9.6 Step 6 — Route routine work to the cheapest qualified option

Once qualified, routine executions use the least expensive suitable route:

1. deterministic code with no model;
2. low-cost model;
3. mid-tier model;
4. premium model;
5. premium rescue and workflow repair.

### 9.7 Step 7 — Keep testing for drift

Model qualification is version-specific.

The system must periodically rerun fixtures when:

- a model version changes;
- prompts or schemas change;
- the evidence format changes;
- output quality declines;
- costs materially change;
- a new model becomes available.

---

## 10. Model Routing Policy

### 10.1 Task risk classes

Each AI task should have a risk class.

#### Low risk

Examples:

- formatting validated data;
- classifying a source type;
- extracting explicit values;
- rewriting text into a fixed tone without changing meaning.

Preferred route: deterministic code or low-cost model.

#### Medium risk

Examples:

- clustering related questions;
- summarising multiple sources into a structured field;
- mapping features to customer outcomes;
- identifying recurring sentiment themes.

Preferred route: qualified lower-cost or mid-tier model with validation.

#### High risk

Examples:

- resolving conflicting evidence;
- creating conditional recommendations;
- identifying hidden buyer risks;
- determining whether a material claim is supported;
- repairing an end-to-end page set near the deadline.

Preferred route: premium model or lower-tier draft followed by premium review.

### 10.2 Escalation triggers

A task must escalate when:

- output fails schema validation repeatedly;
- a required claim lacks traceability;
- sources materially conflict;
- the recommendation changes depending on interpretation;
- the worker produces unsupported certainty;
- a retry loop exceeds its limit;
- the daily release is at risk;
- the cost of continued retries exceeds the cost of immediate premium completion.

### 10.3 De-escalation goal

Every premium intervention should produce a follow-up improvement task asking:

> **What rule, fixture, validation, example, or deterministic module would allow a cheaper worker to handle this case next time?**

The purpose of premium intervention is both completion and learning.

### 10.4 No hidden model dependency

Prompts must not depend on undocumented personality traits, private assumptions, or a model “just knowing what to do.”

Each worker receives:

- a task purpose;
- bounded context;
- approved inputs;
- required output schema;
- source and evidence rules;
- pass and failure conditions;
- examples where necessary;
- a repair instruction;
- explicit prohibition against inventing missing data.

---

## 11. Daily Operating Cycle

### 11.1 Start-of-day commitment

At the beginning of an active build day, the system records:

- the selected customer problem;
- the three planned production pages;
- the minimum evidence needed;
- the expected affiliate opportunity;
- the automation module being improved that day, if any;
- the production deadline;
- the premium fallback owner.

### 11.2 Shipping track and automation track

The day may contain two parallel tracks:

#### Shipping track

Produces the three public pages using the most reliable available method.

#### Automation track

Automates or improves one bounded part of the proven process.

The automation track may not block the shipping track.

### 11.3 Continuous progress rule

When an automation task encounters a dependency, the system must:

- continue all unrelated implementable work;
- use a free or already approved substitute where practical;
- invoke premium AI assistance to repair a free dependency where possible;
- record paid, legal, credential, or irreversible blockers separately;
- preserve the daily publishing path.

### 11.4 Pre-deadline status

The scheduler should support one or more configurable warning checkpoints before 23:00 SAST.

At each checkpoint it verifies:

- which of the three pages are production-ready;
- which validations remain;
- whether deployment is still feasible;
- whether optional work must be frozen;
- whether model escalation should occur early.

The exact warning times are an implementation decision. They must leave sufficient time for the premium model to complete the release.

### 11.5 The 23:00 SAST hard takeover

At **23:00 Africa/Johannesburg time**, the watchdog MUST verify production directly.

If all three required pages are not live and passing the minimum production checks, the system triggers the **Premium Publishing Rescue**.

The rescue process MUST:

1. stop optional automation, refactoring, and feature work;
2. take ownership of the current run state and all completed artefacts;
3. identify the shortest truthful path to publication;
4. reduce scope and optional page blocks where necessary;
5. replace failed automation with direct premium-model execution;
6. preserve real evidence and explicit uncertainty;
7. use the fixed page templates where dynamic generation is failing;
8. repair critical validation failures;
9. deploy directly through the approved Vercel path;
10. verify the three production URLs;
11. record what failed and what was bypassed;
12. create repair tasks for the next build day.

The rescue model has authority to replan, resequence, simplify, and generate new implementation tasks as long as it does not:

- change the agreed customer scope without necessity;
- invent evidence;
- alter the Vetted scoring methodology;
- make irreversible external commitments;
- hide a material failure.

### 11.6 Completion condition

The daily run is complete only when:

- all three production URLs are verified;
- required evidence states are visible;
- critical tests pass;
- deployment and audit records exist;
- the next improvement queue is recorded.

An AI worker saying “done” is not sufficient.

---

## 12. Failure Handling and Recovery

### 12.1 Source unavailable

The workflow:

1. tries the next approved source or retrieval adapter;
2. respects retry and rate limits;
3. records the unavailable source;
4. returns partial or insufficient evidence if the search policy is exhausted;
5. continues page assembly with appropriate qualification.

### 12.2 No evidence found

The workflow produces a valid evidence-state record and continues.

The public page may say that the question could not be verified. It may not omit the issue silently or invent an answer.

### 12.3 Conflicting evidence

The system:

- preserves each material source position;
- scores the evidence rather than blindly trusting a publisher name;
- explains recency, specificity, independence, and corroboration;
- avoids collapsing meaningful disagreement into one average;
- lowers confidence where appropriate;
- states the practical effect on the recommendation.

### 12.4 Invalid AI output

The system:

1. validates the output;
2. performs a bounded repair attempt;
3. retries with clearer error context;
4. switches to another qualified model if necessary;
5. escalates to the premium model if the task remains unresolved;
6. records the failure pattern for future deterministic repair.

### 12.5 Model unavailable

The router selects the next qualified model.

If no cheaper model is qualified and the task is required for publication, the premium reference model takes over.

### 12.6 Duplicate execution

Every run and output must have stable identity and idempotency controls.

Retries must not create:

- duplicate evidence records;
- duplicate page routes;
- repeated affiliate links;
- conflicting production deployments;
- multiple active writers.

### 12.7 Workflow interruption

The workflow must checkpoint after meaningful states so that a restarted process can resume without repeating all completed work.

### 12.8 Validation failure

A failed optional section may be removed or rendered as unavailable.

A failed mandatory truthfulness, evidence, navigation, disclosure, or production-render requirement must be repaired before publication.

### 12.9 Deployment failure

The deployment adapter must:

- return a structured failure reason;
- retry bounded transient failures;
- preserve the last known good production state;
- avoid partial route corruption;
- support rollback;
- allow direct redeployment without depending on GitHub Actions.

### 12.10 GitHub failure

A GitHub outage, runner limit, failed Action, billing issue, or remote push problem must not prevent production publishing.

The work remains locally versioned and may be mirrored to GitHub later.

---

## 13. Vercel Production Architecture

### 13.1 Vercel remains the public deployment target

The architecture must work with the existing Vercel project rather than introducing a second public platform without a clear need.

### 13.2 Small deployment units

Changes should be incremental and independently reviewable.

A daily deployment should contain:

- the connected three-page set;
- only the supporting code and data needed for it;
- safe shared improvements already validated against existing pages;
- no unrelated large-scale refactor.

### 13.3 Preview before production

Where the approved Vercel workflow supports it, the process should create a preview deployment and perform automated smoke checks before production promotion.

Preview is a validation mechanism. It does not satisfy the daily production guarantee.

### 13.4 Direct deployment path

The critical path should support deployment directly from the controlled local or automation workspace through the approved Vercel CLI or API mechanism available during implementation.

GitHub may still receive source updates, but deployment may not depend on GitHub runners.

### 13.5 Stable URLs and indexing

The page system must:

- preserve valid existing URLs where possible;
- create deliberate, customer-intent-focused routes for new pages;
- prevent duplicate canonical pages;
- apply redirects where routes are replaced;
- preserve metadata and structured data;
- avoid accidentally de-indexing the existing site;
- verify production robots, canonical, sitemap, and navigation behaviour during relevant changes.

### 13.6 Background automation is decoupled

Public rendering remains on Vercel.

Long-running research, crawling, scheduling, or AI orchestration may run locally initially and later on a separate cloud runtime if that is more reliable and economical.

The public site must not wait synchronously for an entire research workflow before rendering an already published page.

### 13.7 Production rollback

Each deployment must preserve the ability to return to the last known good version.

Rollback must not erase the evidence or audit record associated with the failed release.

---

## 14. Git and GitHub Policy

### 14.1 Local Git is recommended

The project should retain local Git versioning for:

- source history;
- diffs;
- reversible changes;
- release identification;
- debugging;
- auditability.

### 14.2 GitHub is optional infrastructure

The private GitHub repository may provide:

- off-device backup;
- collaboration;
- pull-request review where useful;
- issue tracking;
- an additional source history.

It must not control whether a daily release can happen.

### 14.3 No GitHub Actions dependency

The initial architecture must not require GitHub-hosted runners for:

- content generation;
- evidence retrieval;
- validation;
- production deployment;
- daily scheduling;
- premium rescue.

A later decision may add GitHub Actions for optional tasks where free capacity is sufficient, but each such task must have a non-GitHub fallback.

### 14.4 Private repository requirement

Any GitHub repository containing proprietary code, workflow instructions, unpublished scoring logic, or internal product data must remain private unless the product owner explicitly approves publication.

Raw private evidence must not be committed to the public website repository.

### 14.5 Release identity without GitHub

Each production deployment must still record a local source revision, build identity, or content version even when the GitHub remote is unavailable.

---

## 15. Data Architecture and Ownership

### 15.1 Data classes

The system separates at least four data classes.

#### A. Private raw evidence

Examples:

- source captures;
- screenshots;
- extracts;
- source-level notes;
- conflict records;
- full retrieval metadata.

Default location: private local evidence repository with secure backup.

#### B. Structured product intelligence

Examples:

- product identity;
- pricing facts;
- capability records;
- criterion scores;
- fit conditions;
- evidence confidence;
- freshness state;
- recommendation rules.

Storage must sit behind a repository interface so the implementation can begin with validated files and move to Convex or another approved store without rewriting the business logic.

#### C. Public page records

Examples:

- Decision Hub records;
- Solution Hub records;
- Decision Scenario records;
- public evidence excerpts;
- affiliate links and disclosures;
- metadata;
- public freshness and confidence labels.

These records must contain only data safe and necessary for publication.

#### D. Operational and audit data

Examples:

- workflow state;
- model calls;
- cost;
- validation results;
- deployment status;
- errors;
- retries;
- model qualification history.

### 15.2 Repository abstraction

Application and workflow modules must read and write through explicit repository interfaces rather than directly depending on one database vendor.

This is not a demand for premature multi-database complexity. It is a narrow separation that protects the methodology and workflow from storage changes.

### 15.3 Versioning

The system must version:

- evidence records;
- scoring methodology;
- criterion weights;
- recommendation rules;
- page schemas;
- public page records;
- prompts and worker instructions;
- model qualification fixtures.

Material data must not be silently overwritten.

### 15.4 Public and private separation

The public site may expose:

- claim summaries;
- source attribution;
- access or verification dates;
- selected excerpts where legally and operationally appropriate;
- evidence confidence;
- reasons for uncertainty.

It must not expose:

- private credentials;
- unrestricted raw captures;
- internal model prompts;
- proprietary scoring implementation where disclosure would create unnecessary risk;
- personal or unrelated scraped data;
- internal commercial negotiations.

---

## 16. Security and Access Control

### 16.1 Agent permissions

Each worker receives only the access needed for its role.

Examples:

- research workers may write proposed evidence records but cannot deploy;
- evaluation services may read evidence and write scores but cannot change source policy;
- page assemblers may write structured drafts but cannot approve unsupported claims;
- the deployment worker may deploy approved artefacts but cannot alter the methodology;
- the premium rescue worker receives temporary broad execution authority, with full audit logging.

### 16.2 Secrets

API keys, Vercel tokens, affiliate credentials, model-provider keys, and other secrets must be stored outside source files and public content.

No model prompt should contain a secret unless the specific tool call requires it and the execution environment protects it.

### 16.3 Evidence security

The local evidence repository should have:

- restricted filesystem access;
- encrypted backup;
- documented recovery;
- separation from the public repository;
- retention rules;
- source and copyright-aware storage practices.

### 16.4 Affiliate independence

Commercial attributes such as commission rate, payout, and affiliate availability must be stored separately from editorial scoring inputs.

The recommendation algorithm may know whether a valid customer action exists, but it may not raise a product’s quality or fit score because it pays more.

---

## 17. Module Contracts

Every automation module must define the following before implementation.

### 17.1 Purpose

One sentence describing the single job the module performs.

### 17.2 Input contract

- required fields;
- optional fields;
- schema version;
- maximum input size;
- allowed evidence states;
- required provenance.

### 17.3 Output contract

- required fields;
- allowed enumerations;
- evidence references;
- confidence data;
- error or fallback state;
- schema version.

### 17.4 Validation

- syntactic checks;
- semantic checks;
- traceability checks;
- deterministic calculations;
- negative conditions;
- completeness threshold.

### 17.5 Retry and timeout

- maximum attempts;
- retryable errors;
- non-retryable errors;
- backoff policy;
- escalation threshold.

### 17.6 Idempotency

The module must be safe to rerun without duplicating or corrupting results.

### 17.7 Model policy

- lowest qualified model;
- fallback model;
- premium escalation condition;
- qualification fixture version;
- maximum acceptable cost where applicable.

### 17.8 Audit output

- start and end times;
- worker identity;
- model identity;
- input and output versions;
- validation result;
- cost;
- retry count;
- final status.

---

## 18. Initial Modular Automation Backlog

Automation should begin with modules that are bounded, repeatable, and easy to validate.

### Priority 1 — Page schema validation

Reason: deterministic, high impact, and protects every release.

### Priority 2 — Evidence record normalisation

Reason: creates a stable input for all downstream work.

### Priority 3 — Claim-to-evidence traceability check

Reason: directly reduces hallucination and unsupported statements.

### Priority 4 — Required-block completeness

Reason: prevents incomplete or one-question pages.

### Priority 5 — Source and freshness classification

Reason: mostly deterministic after the approved registry is defined.

### Priority 6 — Affiliate-link and disclosure validation

Reason: commercial value from day one with low editorial risk.

### Priority 7 — Question clustering

Reason: appropriate for a lower-cost model once the taxonomy and examples exist.

### Priority 8 — Feature-to-outcome mapping

Reason: useful but requires strong examples and review.

### Priority 9 — Structured page assembly

Reason: should follow stable schemas and accepted reference pages.

### Priority 10 — Conditional recommendation drafting

Reason: high value but higher risk; keep premium review until fixtures prove lower-cost reliability.

### Priority 11 — Automated preview and production smoke checks

Reason: protects the daily publishing guarantee.

### Priority 12 — Daily watchdog and premium rescue trigger

Reason: enforces the non-negotiable deadline independently of agent self-reporting.

---

## 19. Model Qualification Framework

A candidate model is tested using a fixed suite of representative tasks.

### 19.1 Fixture categories

The suite should include:

- clear official facts;
- incomplete evidence;
- conflicting sources;
- outdated source material;
- unsupported vendor marketing claims;
- community sentiment with recurring reasons;
- conditional recommendation scenarios;
- products with and without affiliate links;
- page records with missing mandatory blocks;
- attempts to induce fabricated certainty.

### 19.2 Qualification measures

- valid schema rate;
- claim traceability rate;
- unsupported claim rate;
- mandatory-field completion;
- correct evidence-state classification;
- consistency with deterministic scores;
- quality of trade-off explanation;
- correct “not for” guidance;
- repair rate;
- premium-review rejection rate;
- cost per accepted task;
- latency per accepted task.

### 19.3 Required comparison

Candidate output should be compared with:

- the accepted premium reference fixture;
- deterministic expected values;
- human-readable acceptance criteria;
- previous qualified model performance.

### 19.4 Economic acceptance

A cheaper model is not economical if its retry, repair, and review costs exceed direct use of a better model.

Routing decisions must use **accepted output cost**, not raw token price alone.

### 19.5 Publication authority

A model may be qualified for drafting without being qualified for publication approval.

Publication authority requires stronger evidence of reliability.

---

## 20. Observability and Operating Metrics

### 20.1 Daily delivery metrics

- complete three-page sets deployed per active build day;
- percentage of build days meeting the production deadline;
- production URLs verified;
- time from scope selection to production;
- number of page sets requiring 23:00 rescue;
- number of externally blocked deployment days.

### 20.2 Automation metrics

- percentage of workflow completed without premium intervention;
- premium interventions by task type;
- successful retries;
- failed automation modules;
- manual or direct-AI fallback frequency;
- average checkpoint recovery time;
- duplicate-prevention incidents;
- cloud versus local run success.

### 20.3 Model-economics metrics

- accepted output cost by task and model;
- premium-model cost per page set;
- lower-cost-model acceptance rate;
- repair cost per model;
- token and latency trends;
- cost reduction achieved without quality loss.

### 20.4 Quality metrics

- material claims with evidence references;
- explicit insufficient-evidence outputs;
- unsupported claim rate;
- conditional recommendation compliance;
- pages identifying who should not choose a solution;
- broken links;
- accessibility failures;
- post-publication corrections.

### 20.5 Production metrics

- Vercel deployment success rate;
- preview smoke-check pass rate;
- production smoke-check pass rate;
- rollback frequency;
- URL or redirect regressions;
- indexing-critical configuration failures.

---

## 21. Initial Implementation Slice

The first implementation slice must prove the architecture through production, not through diagrams alone.

### 21.1 Initial target

Select one real customer problem connected to one or more current affiliate products.

Produce and deploy:

1. one Decision Hub;
2. one Solution Hub;
3. one Decision Scenario.

### 21.2 Initial execution method

The premium reference model may perform most steps directly.

The initial implementation may use:

- bounded web research;
- real minimum viable evidence;
- validated local Markdown, JSON, or similar structured records;
- fixed page templates;
- direct Vercel deployment;
- local Git history;
- private GitHub backup where convenient.

It must not wait for:

- the final database;
- full scraping automation;
- a multi-agent platform;
- cloud orchestration;
- GitHub runners;
- the complete design system;
- the final scoring model;
- every source integration.

### 21.3 Reference capture

During the first run, the premium model and implementation process must record:

- every task completed;
- inputs and outputs;
- judgement calls;
- evidence searches;
- page assembly decisions;
- validation failures;
- deployment steps;
- opportunities for deterministic automation.

### 21.4 Next-day automation rule

On the next active day:

- select the next three-page set;
- automate one bounded module from the reference process;
- test a lower-cost model on that module;
- retain premium rescue capability;
- still publish the next three pages before the deadline.

The project repeats this cycle until the workflow is increasingly model-independent.

---

## 22. Architecture Evolution Stages

### Stage A — Direct premium AI execution

**Goal:** Establish customer-visible quality and the correct end-to-end process.

**Result:** Three pages live; reference artefacts captured.

### Stage B — Structured local workflow

**Goal:** Convert the reference process into schemas, modules, validators, and local checkpoints.

**Result:** Repeatable local production with fewer hidden decisions.

### Stage C — Lower-cost model qualification

**Goal:** Replace premium work task by task.

**Result:** Routine modules run on the least expensive qualified model.

### Stage D — Automated publishing path

**Goal:** Generate, validate, preview, deploy, and verify with reduced operator intervention.

**Result:** One full page set reaches production through the controlled pipeline.

### Stage E — Scheduled cloud execution

**Goal:** Run proven background work without the owner’s computer remaining active.

**Result:** Reliable scheduled research, refresh, generation, and rescue monitoring.

### Stage F — Continuous quality and cost optimisation

**Goal:** Improve model routing, evidence freshness, conversion, and automation reliability.

**Result:** Lower accepted-output cost without reducing the Vetted quality floor.

Every stage retains the same daily public release obligation.

---

## 23. Decisions Locked by This Document

The following decisions are mandatory unless the product owner explicitly revises them:

1. Vetted SaaS Blueprint is an existing live production website, not a greenfield build.
2. The architecture must enhance the Vercel site incrementally.
3. Every active build day ends with one Decision Hub, one Solution Hub, and one Decision Scenario live on Vercel.
4. Internal infrastructure progress does not replace public output.
5. Missing, partial, conflicting, and unavailable evidence are valid workflow outputs.
6. Public evidence and recommendations may not be fabricated to meet the deadline.
7. The initial fallback is direct AI-first execution by the premium reference model, not manual human production.
8. GPT-5.6 Sol, or the current approved premium equivalent, establishes and protects the reference quality bar.
9. The long-term automation must not depend economically on premium models for routine tasks.
10. Every AI task must have a defined contract and be qualified per model and model version.
11. Deterministic code owns workflow state, scoring formulas, policy, validation, and publication rules.
12. AI models are replaceable workers inside the workflow.
13. Automation is added one bounded, proven module at a time.
14. The shipping track may not be blocked by the automation track.
15. At 23:00 SAST, any incomplete daily production set triggers the Premium Publishing Rescue.
16. The rescue process may simplify and replan but may not invent evidence or change methodology.
17. Production completion is verified from live URLs, not agent self-reporting.
18. Vercel remains the public deployment target.
19. Preview deployments are acceptance tools; they do not satisfy the production requirement.
20. Direct Vercel deployment must be possible without GitHub Actions.
21. GitHub may remain a private optional backup and collaboration remote.
22. GitHub runner limits or billing may not block publication.
23. Raw evidence remains private and separate from the public repository.
24. Public content is generated from structured records and evidence references.
25. Affiliate commercial data remains separate from editorial scoring inputs.
26. Long-running automation may move to a separate cloud runtime after local proof.
27. Every premium intervention must create a learning task aimed at reducing future premium dependence.

---

## 24. Open Implementation Decisions

The following choices remain open for detailed technical planning:

- the current repository structure and framework conventions;
- the precise page-record schemas;
- the first customer problem and affiliate products;
- the initial local evidence directory structure;
- local encryption and backup tooling;
- whether operational product data starts in local files, Convex, or another store;
- the workflow state-machine implementation;
- the model gateway interface;
- the first lower-cost candidate models;
- task-specific qualification thresholds;
- the supported Vercel CLI/API deployment route;
- preview and production smoke-test tooling;
- the scheduler used for the 23:00 watchdog;
- the cloud runtime for long-running jobs;
- monitoring and alert delivery;
- the exact pre-deadline warning checkpoints;
- retention periods for evidence and audit records;
- which source captures may legally and practically be retained;
- how production content changes are reflected in the optional GitHub remote.

These decisions must be resolved through the smallest working implementation. They may not postpone the first three-page production release.

---

## 25. Acceptance Criteria for the Architecture

This architecture is considered implemented at its first useful level when:

- [ ] the existing Vercel site remains operational;
- [ ] one connected three-page set is live in production;
- [ ] each page is generated from a defined structured record;
- [ ] public claims link to real evidence or state the evidence limitation;
- [ ] the premium model can complete the entire workflow directly when automation fails;
- [ ] at least one bounded module has a strict input/output contract;
- [ ] at least one lower-cost model has been tested against a premium reference fixture;
- [ ] invalid model output produces repair or escalation rather than silent publication;
- [ ] missing evidence does not stop the workflow;
- [ ] production deployment works without GitHub Actions;
- [ ] the deployment result records production URLs and source/content version;
- [ ] the private evidence repository is separated from public source and content;
- [ ] affiliate links and disclosures work without influencing editorial scores;
- [ ] one writer at a time is enforced for shared outputs;
- [ ] workflow checkpoints support recovery;
- [ ] the 23:00 SAST watchdog and Premium Publishing Rescue have an implementable specification;
- [ ] public production status is verified independently of agent self-reporting;
- [ ] failures and premium interventions create improvement tasks;
- [ ] the architecture has not reduced the three-page daily output.

---

## 26. Definition of Done for This Document

This document is complete enough to guide implementation planning when all participants understand that:

- the primary goal is daily public customer value;
- direct premium AI execution is the initial reference process;
- automation is extracted from successful work rather than designed in isolation;
- every module must become explicit enough for cheaper models to be tested;
- the workflow, not the AI model, controls the process;
- the existing Vercel site must remain live and progressively improve;
- GitHub is optional infrastructure and not a publishing dependency;
- the 23:00 SAST rescue rule protects the daily release;
- quality, truthfulness, and affiliate impartiality remain mandatory at every speed.

---

## 27. Relationship to the Wider Documentation Set

This architecture document informs the remaining product documents.

It provides constraints for:

- **Design System:** components and interactions must support structured, reusable decision blocks.
- **Art Direction:** visual treatments must remain compatible with rapid deterministic page assembly.
- **PRD:** functional requirements must map to the architecture contracts and daily release guarantee.
- **Content Specification:** language, labels, terminology, schemas, and evidence presentation must be model-independent.
- **Onboarding and Activation:** initial customer journeys must use the same decision records and recommendation logic.
- **UI Kit and Component Library:** reusable components must map directly to page-schema blocks.
- **Growth and Distribution Strategy:** measurement, affiliate actions, lead assets, AEO, and distribution must use the same structured source of truth.
- **QA and Testing Plan:** tests must cover model swaps, evidence states, workflow recovery, Vercel deployment, the daily watchdog, and premium rescue.

The final documentation index should reference this file explicitly even if the original ten-document numbering is retained.

---

## 28. Governing Statement

> **Use the strongest approved model to establish and protect the standard. Convert every repeatable judgement into a deterministic rule, schema, validator, fixture, or modular worker. Test cheaper models continuously. Never let automation, infrastructure, GitHub, or missing evidence prevent three truthful customer decision pages from reaching Vercel each active build day.**
