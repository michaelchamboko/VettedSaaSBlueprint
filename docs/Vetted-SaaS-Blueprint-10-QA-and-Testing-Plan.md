---
document_id: VSB-DOC-10
title: "Post-Deployment Quality Assurance and Continuous Improvement Plan"
tags: [quality-assurance, post-deployment, continuous-improvement, testing, daily-publication]
status: active
created: 2026-08-28
last_updated: 2026-08-28
owners: [Product, Engineering, Editorial, Research, Design, Distribution]
applies_to:
  - Daily Decision Hub
  - Daily Solution Hub
  - Daily Decision Scenario
  - Supporting distribution assets
authority: QA operating authority
---

# Vetted SaaS Blueprint — Post-Deployment Quality Assurance and Continuous Improvement Plan

## 1. Purpose

This document defines how Vetted SaaS Blueprint verifies and improves each daily three-page release after it is live in production.

The daily output is one connected set:

1. a Decision Hub;
2. a Solution Hub; and
3. a Decision Scenario.

Quality assurance exists to make deployed work better. It is not permission to publish, a release veto, or an excuse to miss the daily delivery commitment.

**Cadence supersession (owner directive 2026-10-28):** Any "daily", "every active day", fixed-time, scheduled, watchdog, rescue, or recurring-publication wording in this document is retained only as historical batch terminology or traceability. It does not authorise a schedule or ongoing publication obligation. The release unit remains valid, but execution occurs only from an explicit manual or API trigger under `AGENTS.md` and `planning.md`.

## 2. Governing invariant: deploy first, improve continuously

The mandatory sequence is:

> Build → Deploy → Confirm production → Inspect → Classify → Improve → Recheck → Record

The following rules apply without exception:

- The connected three-page set deploys every day.
- Specification QA starts only after production deployment has been confirmed.
- Missing, partial, conflicting, stale, or not-yet-researched evidence does not block deployment.
- Missing polish, optional graphics, advanced motion, secondary distribution assets, or non-critical enhancements does not block deployment.
- Every known limitation must be represented honestly on the live page or in its release record.
- QA findings create fix-forward work against the live version or a later version.
- Pages and assets remain versioned, revisitable, correctable, and redistributable.
- New evidence, better explanations, improved visuals, or stronger implementation may be added after the initial release.
- No post-deployment finding may be retroactively described as a reason the original daily set should not have shipped.

## 3. Deployment confirmation is not a QA gate

Deployment confirmation is the hand-off into QA. It is deliberately narrow.

A release is confirmed when:

- all three intended production URLs resolve;
- the deployed version or deployment identifier is recorded;
- each page returns its principal content rather than an error or placeholder shell;
- the three pages can identify or link to the other members of the set; and
- the production timestamp is recorded.

These checks establish that there is a deployed object to inspect. They do not certify design quality, evidence completeness, accessibility, performance, search readiness, or commercial effectiveness.

If production confirmation itself fails, the deployment process continues to retry or repair until the daily set is live. This is deployment recovery, not specification QA.

## 4. QA outcomes

Tests must not use release-blocking pass/fail language. Each observation receives one of four outcomes:

| Outcome | Meaning | Required response |
|---|---|---|
| Conforming | The observed production behaviour meets the cited requirement. | Record the evidence. |
| Improvement required | The page is live but can better meet the requirement. | Create a bounded improvement and retest it after correction. |
| Unable to observe | The condition could not be assessed with the available tooling, evidence, or environment. | Record the reason and schedule another observation when useful. |
| Not applicable | The requirement does not apply to this page, asset, or release. | Record the applicability decision. |

“Unable to observe” and “improvement required” never become hidden publication gates.

## 5. Severity and response model

Severity controls response speed, not whether the daily set is allowed to exist.

| Severity | Definition | Response |
|---|---|---|
| P0 — immediate correction | A live condition creates material user harm, exposes secrets or personal data, makes the principal content unusable, or presents a materially false claim as established fact. | Correct, isolate, or replace the affected live surface immediately while preserving the smallest truthful and safe useful page. Recheck after the correction. |
| P1 — same-day improvement | A major requirement is visibly broken or significantly harms comprehension, accessibility, trust, navigation, or conversion. | Repair the live version the same day when operationally possible, then recheck. |
| P2 — scheduled improvement | A meaningful quality gap exists but the page remains useful and truthful. | Add to the prioritised improvement queue. |
| P3 — observation or experiment | A refinement, hypothesis, or optimisation opportunity exists. | Track as an experiment or future enhancement. |

P0 does not mean “do not deploy.” It means fix forward immediately after production confirmation and retain a truthful minimum viable surface throughout the correction.

## 6. Requirements traceability

Every test must cite the requirement that caused it to exist. Acceptable sources include:

- Document 01 — Market Research and Opportunity Plan;
- Document 02 — Product Roadmap;
- Document 03 — AI-First System Architecture and Automation Blueprint;
- Document 04 — Design System and Experience Standards;
- Document 05 — Master Product Requirements Document;
- Document 06 — Agent Technology and Implementation Standards;
- Document 07 — Content Intelligence and Editorial Operations;
- Document 08 — Knowledge Acquisition and Research Operations;
- Document 09 — Growth, Distribution and Audience Development Strategy; and
- this document.

A requirement may produce multiple tests. A test may cite multiple requirements when the observed behaviour genuinely crosses disciplines.

The traceability record must contain:

- source document;
- section or stable requirement identifier;
- requirement summary in testable language;
- applicable page types and assets;
- test identifiers; and
- the latest observation date.

Do not duplicate entire source documents inside the test catalogue. Link to the authority and state the smallest observable requirement.

## 7. Test-case contract

Every reusable test case must contain:

| Field | Requirement |
|---|---|
| Test ID | Stable identifier using `QA-{DOMAIN}-{NUMBER}`. |
| Requirement source | Exact document and section or requirement identifier. |
| Intent | The user, system, or business outcome protected by the test. |
| Applies to | Decision Hub, Solution Hub, Decision Scenario, distribution asset, or shared system. |
| Preconditions | Must include confirmed production deployment. |
| Method | Automated, manual, visual, evidence review, or mixed. |
| Viewports or agents | Required browser, device size, reduced-motion state, crawler, or consumer. |
| Procedure | Minimal repeatable observation steps. |
| Expected observation | Concrete and externally observable behaviour. |
| Actual observation | What occurred in production. |
| Evidence | URL, screenshot, trace, report, source snapshot, or measurement. |
| Outcome | Conforming, improvement required, unable to observe, or not applicable. |
| Severity | P0, P1, P2, or P3 when improvement is required. |
| Improvement action | Smallest useful correction or experiment. |
| Owner | Accountable role or worker. |
| Retest status | Not scheduled, scheduled, conforming after correction, or still improving. |

Expected observations must be measurable. Avoid vague formulations such as “looks premium,” “works well,” or “good SEO.” Translate them into observable properties.

## 8. Daily QA operating loop

### 8.1 Production hand-off

The deployment system records the three production URLs, the deployed version, deployment time, and page-set identifier.

### 8.2 Core automated observation

Run repeatable checks for availability, principal content, internal links, metadata, structured data, responsive layout indicators, accessibility signals, performance, and machine access.

### 8.3 Human and visual observation

Inspect the production pages at the required mobile and desktop viewports. Review composition, comprehension, motion, imagery, hierarchy, disclosure, and coherence across the set.

### 8.4 Evidence and editorial observation

Review representative claims, source relationships, uncertainty language, dates, commercial disclosures, and the difference between verified findings and editorial interpretation.

### 8.5 Classification

Record outcomes and severity. Do not turn the issue list into a retrospective publication gate.

### 8.6 Fix forward

Apply the smallest correction that improves the deployed experience. Preserve truthful content and working URLs while corrections are made.

### 8.7 Recheck and close the loop

Re-run the affected tests, attach new production evidence, update the issue state, and redistribute materially improved assets when Document 09 requires it.

### 8.8 Learn across releases

Repeated findings should improve templates, components, prompts, research operations, or deployment automation. Do not respond to every recurrence with another manual checklist item when a systemic fix is simpler.

## 9. Core post-deployment test catalogue

### 9.1 Production identity and availability

| ID | Expected production observation |
|---|---|
| QA-PROD-001 | The Decision Hub URL resolves and exposes its principal content. |
| QA-PROD-002 | The Solution Hub URL resolves and exposes its principal content. |
| QA-PROD-003 | The Decision Scenario URL resolves and exposes its principal content. |
| QA-PROD-004 | The recorded deployment version matches the version served in production. |
| QA-PROD-005 | Navigation between the three related pages is available and does not create a dead end. |
| QA-PROD-006 | Error boundaries and unavailable dependencies preserve a useful truthful surface. |

### 9.2 Page-set and page-type contracts

| ID | Expected production observation |
|---|---|
| QA-SET-001 | All three pages address the same decision domain without becoming duplicate articles. |
| QA-SET-002 | The Decision Hub frames the decision, alternatives, criteria, and uncertainty. |
| QA-SET-003 | The Solution Hub explains a solution category or implementation path without disguising promotion as analysis. |
| QA-SET-004 | The Decision Scenario applies the decision to a concrete context, constraints, and trade-offs. |
| QA-SET-005 | Cross-links preserve context and identify why the related page is useful. |
| QA-SET-006 | Titles, summaries, breadcrumbs, and page-type labels accurately describe each page. |

### 9.3 Evidence, provenance, and truthfulness

| ID | Expected production observation |
|---|---|
| QA-EVID-001 | A sample of material claims can be traced to a cited source, disclosed inference, or explicit evidence-state label. |
| QA-EVID-002 | Missing evidence is stated honestly without hiding the page or replacing it with fabricated certainty. |
| QA-EVID-003 | Conflicting sources are represented as a conflict rather than silently resolved. |
| QA-EVID-004 | Time-sensitive claims expose an appropriate date or freshness signal. |
| QA-EVID-005 | Quotations, numbers, comparisons, and product claims preserve their source context. |
| QA-EVID-006 | New evidence can be attached to the existing page version history and trigger a correction or enrichment. |
| QA-EVID-007 | Affiliate or commercial relationships are not presented as independent evidence. |

### 9.4 Content and editorial quality

| ID | Expected production observation |
|---|---|
| QA-CONT-001 | The first screen communicates the decision, audience, and primary value without requiring exploratory scrolling. |
| QA-CONT-002 | Headings form a coherent outline and support scanning by humans and machines. |
| QA-CONT-003 | Claims distinguish fact, inference, recommendation, and opinion. |
| QA-CONT-004 | Definitions and decision criteria remain consistent across the three-page set. |
| QA-CONT-005 | The page provides a useful next action without forcing registration or onboarding. |
| QA-CONT-006 | Links and calls to action accurately describe their destinations. |
| QA-CONT-007 | The content contains no visible placeholders, internal prompt fragments, or unfinished production notes. |

### 9.5 Design-system and art-direction conformance

| ID | Expected production observation |
|---|---|
| QA-DES-001 | Typography, colour, spacing, layout, and components follow the shared design tokens or an explicitly recorded exception. |
| QA-DES-002 | Visual hierarchy makes the page purpose, primary conclusion, evidence, and next action distinguishable. |
| QA-DES-003 | Reusable components remain visually and behaviourally consistent across the set. |
| QA-DES-004 | Whitespace supports grouping and comprehension without creating accidental empty screens. |
| QA-DES-005 | The hero area fits its specified content at required viewports without clipping or hiding essential context. |
| QA-DES-006 | Dark, light, hover, focus, selected, loading, empty, and error states remain legible where applicable. |

### 9.6 Motion and interaction

| ID | Expected production observation |
|---|---|
| QA-MOT-001 | Motion explains hierarchy, causality, state, or progress rather than decorating without purpose. |
| QA-MOT-002 | Interactive elements respond consistently to pointer, keyboard, and touch input where applicable. |
| QA-MOT-003 | Reduced-motion preferences remove or simplify non-essential animation. |
| QA-MOT-004 | Motion does not delay access to principal content or obscure evidence. |
| QA-MOT-005 | Animations remain stable during loading, resizing, navigation, and repeated interaction. |
| QA-MOT-006 | Scroll-linked effects preserve reading position and do not trap or disorient the user. |

### 9.7 Graphics, imagery, and visual evidence

| ID | Expected production observation |
|---|---|
| QA-VIS-001 | Every image, diagram, chart, or illustration has an identifiable informational or experiential purpose. |
| QA-VIS-002 | Material visuals have appropriate alternative text, captioning, or adjacent explanation. |
| QA-VIS-003 | Charts and comparisons expose labels, units, source, and applicable date. |
| QA-VIS-004 | Generated or illustrative imagery is not presented as documentary evidence. |
| QA-VIS-005 | Visual assets have recorded provenance and permitted usage. |
| QA-VIS-006 | Images remain sharp, correctly cropped, and compositionally useful at required viewports. |

### 9.8 Responsive and browser behaviour

| ID | Expected production observation |
|---|---|
| QA-RESP-001 | Principal content and actions work at the defined narrow mobile viewport. |
| QA-RESP-002 | The layout scales to the defined desktop viewport without excessive line length or unused space. |
| QA-RESP-003 | Navigation, tables, cards, charts, and comparisons do not create unintended horizontal overflow. |
| QA-RESP-004 | Content order remains logical when multi-column layouts collapse. |
| QA-RESP-005 | Touch targets and controls remain usable on mobile. |
| QA-RESP-006 | Supported browsers expose equivalent principal information and actions. |

### 9.9 Accessibility

| ID | Expected production observation |
|---|---|
| QA-A11Y-001 | The page has one descriptive primary heading and a logical heading hierarchy. |
| QA-A11Y-002 | Keyboard users can reach and operate interactive elements in a coherent order. |
| QA-A11Y-003 | Focus is visible and is not trapped or unexpectedly moved. |
| QA-A11Y-004 | Text and meaningful interface elements meet the adopted contrast standard. |
| QA-A11Y-005 | Form fields and controls have accessible names, instructions, and error descriptions where applicable. |
| QA-A11Y-006 | Landmarks, link purpose, image alternatives, and document language are exposed to assistive technology. |
| QA-A11Y-007 | Automated findings are followed by targeted human checks rather than treated as complete accessibility certification. |

### 9.10 Performance and reliability

| ID | Expected production observation |
|---|---|
| QA-PERF-001 | Principal content renders within the adopted production performance budget. |
| QA-PERF-002 | Layout remains stable while fonts, images, embeds, and dynamic content load. |
| QA-PERF-003 | Images, scripts, fonts, motion, and third-party integrations are proportionate to user value. |
| QA-PERF-004 | A slow or failed third-party service does not remove the page’s principal explanation. |
| QA-PERF-005 | Caching and revalidation do not serve a misleading mixture of page versions. |
| QA-PERF-006 | Production errors are observable without exposing secrets or personal data. |

### 9.11 Search, answer engines, and machine access

| ID | Expected production observation |
|---|---|
| QA-DISC-001 | Title, description, canonical URL, indexation directive, and social metadata describe the deployed page accurately. |
| QA-DISC-002 | Structured data is syntactically valid and matches visible content. |
| QA-DISC-003 | Heading structure, summaries, lists, tables, definitions, and citations support reliable extraction. |
| QA-DISC-004 | Sitemap and internal-link discovery include the new pages as intended. |
| QA-DISC-005 | Approved crawlers can access the intended public content under the current crawler policy. |
| QA-DISC-006 | Blocked, rate-limited, monitored, or charged machine access behaves according to the recorded policy without blocking human publication. |
| QA-DISC-007 | Feeds, APIs, or approved machine-readable representations preserve canonical identity, attribution, and update information. |

### 9.12 Commercial integrity and user trust

| ID | Expected production observation |
|---|---|
| QA-TRUST-001 | Affiliate, sponsorship, ownership, and material commercial relationships are disclosed near the relevant decision. |
| QA-TRUST-002 | Ranking, inclusion, recommendation, and exclusion criteria are understandable. |
| QA-TRUST-003 | Commercial incentives do not overwrite evidence-state labels or uncertainty. |
| QA-TRUST-004 | Corrections and material updates are visible and versioned. |
| QA-TRUST-005 | Privacy choices and telemetry disclosures match observed production behaviour. |
| QA-TRUST-006 | The public experience does not require onboarding to access the core decision value. |

### 9.13 Distribution and audience development

| ID | Expected production observation |
|---|---|
| QA-GROW-001 | The page set produces or can produce the required channel-specific distribution assets. |
| QA-GROW-002 | Distributed assets retain canonical links, attribution, and accurate claims. |
| QA-GROW-003 | Channel copy matches the deployed page rather than an obsolete draft. |
| QA-GROW-004 | Refreshes capable of changing a decision trigger an appropriate redistribution decision. |
| QA-GROW-005 | Owned-audience capture is optional, transparent, and does not conceal the core public value. |
| QA-GROW-006 | Distribution measurements distinguish reach, qualified engagement, decision assistance, citation, reuse, and conversion. |

### 9.14 Refresh, versioning, and correction

| ID | Expected production observation |
|---|---|
| QA-REF-001 | The deployed page exposes or records a stable canonical identity and current version. |
| QA-REF-002 | A correction preserves an auditable relationship with the earlier version. |
| QA-REF-003 | New evidence can change claims, rankings, scenarios, and distribution assets without rebuilding the content identity from scratch. |
| QA-REF-004 | Staleness signals create review work without unpublishing useful content. |
| QA-REF-005 | Material changes receive a post-change recheck against affected tests. |

### 9.15 Automation, model, and recovery behaviour

| ID | Expected production observation |
|---|---|
| QA-AUTO-001 | Model or worker substitution preserves required output structure and truthful evidence states. |
| QA-AUTO-002 | A failed specialist step degrades to the smallest useful output rather than cancelling the daily set. |
| QA-AUTO-003 | Retries are bounded, observable, and do not create duplicate production pages. |
| QA-AUTO-004 | Recovery can resume from durable state instead of repeating all successful work. |
| QA-AUTO-005 | Generated pages contain no leaked system instructions, credentials, private data, or internal chain-of-thought. |
| QA-AUTO-006 | Recurring defects create a template, component, prompt, data, or workflow improvement when that is simpler than repeated manual repair. |

## 10. Progressive QA intensity

Post-deployment QA becomes more intensive as observation capacity grows. Increased intensity must improve the product without expanding into a release veto.

### Level 1 — every release

- production identity and availability;
- three-page-set coherence;
- principal content and navigation;
- visible placeholders or unsafe disclosures;
- basic mobile and desktop screenshots;
- critical metadata and crawlability; and
- issue classification.

### Level 2 — daily sampled depth

- evidence traceability sample;
- accessibility automation plus targeted keyboard checks;
- performance measurements;
- structured-data validation;
- motion and responsive behaviour; and
- commercial disclosure review.

### Level 3 — rotating specialist depth

- complete visual and design-system review;
- cross-browser and assistive-technology review;
- research-method and source-provenance audit;
- crawler, feed, and machine-consumer tests;
- distribution attribution review; and
- orchestration and degraded-mode exercises.

### Level 4 — trend and systemic improvement

- recurrence analysis across releases;
- template and component defect clustering;
- performance and accessibility trends;
- claim correction and freshness trends;
- distribution effectiveness by page type; and
- removal of redundant tests that no longer produce useful learning.

## 11. Required daily QA record

Each daily release must accumulate a QA record containing:

- page-set identifier and production URLs;
- deployed version and confirmation time;
- test-suite version;
- tests observed and their outcomes;
- mobile and desktop visual evidence;
- automated reports where available;
- evidence-review sample;
- findings with severity and owners;
- corrections applied;
- retest evidence; and
- systemic lessons or reusable improvements.

The record may be completed progressively after deployment. Its incompleteness does not invalidate the published set.

## 12. Automation boundaries

Automate checks when the result is repeatable and externally observable. Good candidates include URL availability, link integrity, metadata, schema syntax, accessibility signals, performance measurements, overflow detection, console errors, sitemap inclusion, and crawler responses.

Retain human review for meaning, truthfulness, evidence context, art direction, visual hierarchy, motion purpose, recommendation integrity, and whether the page genuinely helps a decision.

Automated scores are evidence, not truth. A single aggregate score must never become a hidden release gate or replace the underlying observations.

## 13. Visual evidence standard

Visual QA must use production, not only local or preview environments.

At minimum, capture:

- the first screen on a narrow mobile viewport;
- the full page on a narrow mobile viewport;
- the first screen on a representative desktop viewport;
- the full page on a representative desktop viewport; and
- relevant interactive, error, loading, or reduced-motion states.

Review screenshots for clipping, overflow, unintended empty space, broken hierarchy, text density, image cropping, component drift, and content hidden behind interaction.

## 14. Improvement queue rules

Every finding must be bounded. An improvement item contains:

- the observed production problem;
- the requirement it affects;
- the smallest proposed correction;
- severity and rationale;
- affected URLs and components;
- owner;
- target response window;
- verification method; and
- closure evidence.

Do not create broad items such as “improve the design” or “fix SEO.” Split them into observable corrections.

Prioritise in this order:

1. truthful and safe representation;
2. access to principal content;
3. comprehension and decision usefulness;
4. accessibility and interaction;
5. reliability and performance;
6. discoverability and distribution;
7. aesthetic and experimental refinements.

## 15. Learning and recurrence policy

QA must reduce future manual effort.

When the same defect recurs:

- identify the stable failure pattern;
- determine whether the source is a requirement, template, component, prompt, model, source-data contract, deployment step, or test;
- correct the earliest responsible layer;
- add or refine a regression observation; and
- verify the correction on a later production release.

Do not add process complexity unless it prevents a demonstrated recurring defect or materially improves observability.

## 16. Roles and accountability

| Role | Accountability |
|---|---|
| Deployment owner | Confirms the production page set and supplies the deployment receipt. |
| QA coordinator | Maintains traceability, chooses the applicable suite, and records outcomes without acting as a publication gatekeeper. |
| Research or evidence reviewer | Checks source relationships, claim states, freshness, and uncertainty. |
| Editorial reviewer | Checks decision usefulness, clarity, consistency, and commercial integrity. |
| Design reviewer | Checks design-system, art-direction, imagery, responsive, and motion requirements. |
| Engineering reviewer | Checks reliability, performance, accessibility implementation, metadata, telemetry, and recovery behaviour. |
| Distribution owner | Checks generated assets, canonical attribution, crawler behaviour, redistribution, and measurement. |
| Improvement owner | Applies the bounded correction and supplies retest evidence. |

One person or agent may fulfil multiple roles. Accountability must still be explicit in the record.

## 17. Prohibited QA behaviours

The following are prohibited:

- delaying or cancelling daily publication because optional evidence or polish is missing;
- running specification QA before production and treating it as permission to deploy;
- hiding a useful page because an automated score is below a threshold;
- fabricating evidence to obtain a conforming result;
- silently changing a material claim without version or correction history;
- treating preview screenshots as production proof;
- describing “unable to observe” as failure;
- allowing commercial performance to override truthfulness;
- accumulating unbounded improvement tasks without ownership or verification; and
- repeatedly fixing symptoms when a simpler systemic correction is available.

## 18. Definition of QA completion for a release

QA for a daily set is sufficiently recorded when:

- production deployment has been confirmed independently of QA;
- the applicable Level 1 suite has observations;
- deeper scheduled or sampled checks have been recorded where performed;
- findings have outcomes, severity, and owners;
- completed corrections have production retest evidence; and
- unresolved improvements remain visible in the improvement queue.

QA completion does not mean the pages are final. The pages remain living, versioned assets.

## 19. Relationship to the documentation set

This document converts requirements from Documents 01–09 into observable post-deployment checks. It does not replace their product, research, editorial, design, engineering, or distribution authority.

When documents conflict:

1. preserve daily production delivery;
2. preserve truthfulness, user safety, and access to principal value;
3. record the conflict;
4. apply the most specific current requirement that does not violate the first two rules; and
5. create a documentation correction without blocking the deployed page set.

## 20. Governing statement

Vetted SaaS Blueprint ships its connected three-page set every day. Production confirmation begins quality assurance; it does not conclude it. QA then becomes progressively more intensive, using traceable observations, production evidence, bounded corrections, and retesting to improve live pages, future deployments, and the system that produces them. Evidence gaps and quality opportunities are reasons to revisit and strengthen published work, never reasons to stop delivering it.
