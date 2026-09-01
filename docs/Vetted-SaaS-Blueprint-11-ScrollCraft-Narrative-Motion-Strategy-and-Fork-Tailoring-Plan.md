---
title: "Vetted SaaS Blueprint - ScrollCraft Narrative Motion Strategy and Fork Tailoring Plan"
tags: [vetted-saas-blueprint, narrative-motion, scrollcraft, design-governance, implementation-planning]
status: verified-fork-ready
created: 2026-08-29
document_id: VSB-DOC-11
owner: Michael Chamboko
phase: strategy-only
implementation_authority: false
---

# Vetted SaaS Blueprint - ScrollCraft Narrative Motion Strategy and Fork Tailoring Plan

## 1. Decision

Vetted SaaS Blueprint should retain the `michaelchamboko/scroll-craft` fork and tailor it into a governed narrative-motion capability for selected high-value pages.

ScrollCraft is not the content strategy, design authority, general component library, or default animation layer. It is the mechanism that translates an already-approved page narrative into scroll-linked progression.

The operating stack is:

1. the content and evidence model determines what the user must understand;
2. Taste establishes the visual direction, hierarchy, composition, and anti-generic quality bar;
3. Impeccable critiques and refines the rendered interface;
4. ScrollCraft expresses approved narrative transitions through motion;
5. Global Setup converts the approved contracts into implementation tasks, tests, review gates, and release evidence.

No downstream tool may reverse this authority order.

## 2. Current-phase boundary

This document defines the intended system at near-implementation precision. The ScrollCraft fork-hardening work was separately authorised and is now published. It does not authorise changes to Global Setup or the production Vetted SaaS Blueprint application.

Production-page implementation begins only after this strategy and its amendment map are approved.

## 3. Why the fork is useful

The fork already contains a compact scroll runtime, declarative clip configuration, responsive conditions, reduced-motion handling, asset guidance, device diagnostics, screenshot tooling, and visual quality guidance. This is a better starting point than building another motion engine.

The fork is now a verified, vendor-neutral Codex plugin at [`bfddbd4`](https://github.com/michaelchamboko/scroll-craft/commit/bfddbd4f79d912bd20861a576527215d15c53d22), published to its `main` branch on 2026-08-30. GitHub Actions passed on that exact commit.

The published capability has a root `AGENTS.md`, a Codex marketplace catalogue, a `plugins/scroll-craft/.codex-plugin/plugin.json` manifest, canonical `skills/scrollcraft` instructions, an optional Vetted SaaS reference, Node package and lockfile, deterministic root commands, unit/browser tests, and CI. The original MIT licence and upstream attribution remain.

The hardening work also makes static semantic content visible before enhancement, exposes `mount()` teardown, cleans runtime resources, responds to operating-system reduced-motion changes, restores normal flow for reduced motion, scopes `will-change`, protects inactive worldflight content from keyboard and assistive-technology exposure, fails serious screenshot diagnostics, and binds the development server to loopback with resolved-path containment.

This is implementation-ready fork evidence, not an authority to change a Vetted SaaS production page.

## 4. Core principle: motion must carry meaning

Every motion sequence must have a declared communication job. Acceptable jobs are limited to:

- reveal a causal sequence;
- compare alternatives or states;
- preserve context while evidence changes;
- show progress through a decision;
- focus attention on the next uncertainty being resolved;
- connect a claim to its supporting evidence;
- demonstrate a product workflow that is materially easier to understand in motion.

Decoration alone is not an acceptable job.

Motion must never:

- conceal missing evidence;
- imply product capability that has not been verified;
- delay the first useful content;
- force the user to scrub through essential prose;
- change the semantic reading order;
- interfere with native scrolling, browser history, focus, text selection, or anchor links;
- turn an ordinary article into a cinematic experience without a decision-usefulness case.

### 4.1 Adjudicated engagement strategy

The product-owner direction is that motion follows **attention → understanding → confidence → action**. It may guide attention towards a qualified commercial action, including an affiliate action, only after the relevant decision has been resolved by the available evidence. Success is qualified, evidence-earned action rather than raw click pressure.

- **Decision Hubs** use the strongest evidence-led narrative progression: problem, evidence, criteria, resolution, then action.
- **Solution Hubs** use selective comparison motion only where it clarifies a meaningful criterion or outcome.
- **Decision Scenarios** use a shorter trade-off → recommendation → action sequence.

This direction is constrained by the existing evidence, ranking-independence, disclosure, and anti-deception requirements; motion cannot manufacture certainty or commercial preference.

## 5. Page eligibility contract

### 5.1 Eligible by default

- homepage or campaign narrative;
- flagship Decision Hub;
- high-value comparison with meaningful state changes;
- product or category explainer where a workflow must be demonstrated;
- evidence-led story in which the sequence itself affects comprehension.

### 5.2 Conditionally eligible

- Solution Hub;
- Decision Scenario;
- major research release;
- interactive methodology explanation.

Conditional pages require a written motion brief and must pass the value test below.

### 5.3 Ineligible for full narrative choreography by default

- routine buyer article, although it may use the lightweight editorial-motion tier defined below;
- news or update post;
- glossary or reference page;
- legal, privacy, disclosure, or policy content;
- search results and index pages;
- account, form, and transactional flows;
- content whose primary value is fast scanning or quotation.

### 5.4 Two motion tiers

The system must distinguish cinematic narrative choreography from lightweight editorial engagement.

**Tier 1 - Narrative motion** applies to flagship and high-value pages. It may use sticky stages, scroll-linked state changes, step progression, and bounded media scrubbing. It requires the complete narrative motion brief and the full verification matrix.

**Tier 2 - Editorial motion** applies selectively to blog posts and supporting content. It keeps the normal document flow and may use:

- unobtrusive reading progress;
- evidence-card or citation emphasis as the reader reaches the relevant claim;
- annotated diagram steps;
- restrained comparison transitions;
- figure captions and callouts that enter without displacing text;
- short, user-controlled product demonstrations;
- table or chart focus states;
- related-content transitions at genuine decision breaks.

Tier 2 must not use pinning, scroll hijacking, long scrub sequences, concealed prose, or animation that makes scanning slower. The article must remain readable as a normal article. Editorial motion is chosen because it improves attention at a specific evidence or explanation point, not because the page template demands movement.

The content brief should therefore mark candidate engagement moments even when a full scroll story is not justified.

### 5.5 Motion value test

A page may use narrative scroll motion only when all answers are yes:

1. Is there a specific uncertainty that sequence or transformation resolves?
2. Is the moving relationship easier to understand than a static arrangement?
3. Can the same content remain complete and correctly ordered without motion?
4. Can mobile and reduced-motion users reach the same conclusion without extra work?
5. Can the effect be verified with objective checkpoints?

## 6. Narrative motion brief

Before implementation, every eligible page must provide a machine-readable and human-readable brief containing:

- page identifier and archetype;
- target user and decision state;
- one-sentence page promise;
- uncertainty being reduced;
- narrative beats in semantic reading order;
- evidence attached to each beat;
- motion job for each animated beat;
- static fallback for each animated beat;
- mobile adaptation;
- reduced-motion adaptation;
- asset provenance and licence;
- expected entry, midpoint, and exit states;
- performance class and resource budget;
- analytics hypothesis;
- rejection conditions;
- named owner and approval state.

If the brief cannot explain why motion improves comprehension, the page remains static.

## 7. Narrative beat model

Each scroll story should use a small number of explicit beats:

1. **Orient** - establish the decision and current state.
2. **Tension** - make the cost, trade-off, or unresolved uncertainty concrete.
3. **Explain** - reveal the model, workflow, comparison, or evidence.
4. **Resolve** - show what the evidence supports and what remains uncertain.
5. **Act** - offer the next useful step without false urgency.

Not every page needs all five beats. A sequence should contain only the beats required by the decision journey.

Each beat owns content first and motion second. The DOM must contain the complete content in the correct order before animation is attached.

## 8. Approved motion primitives

The fork should expose a restrained Vetted SaaS Blueprint primitive set:

- section progress;
- reveal and emphasis;
- sticky evidence stage;
- state swap;
- before-and-after comparison;
- step progression;
- diagram trace;
- metric or evidence focus;
- bounded horizontal sequence on wide screens only;
- media scrub only when the media itself is the evidence.

Each primitive must declare:

- semantic purpose;
- supported page archetypes;
- required markup contract;
- desktop behaviour;
- mobile behaviour;
- reduced-motion behaviour;
- keyboard and focus behaviour;
- performance characteristics;
- test checkpoints;
- known failure modes.

The first implementation should not add more primitives until the initial set is proven in production.

## 9. Motion limits

- At most three major narrative-motion patterns per page.
- At most one dominant sticky or pinned sequence per page unless an approved exception explains the need.
- Essential content must be visible in the DOM and available without JavaScript.
- No full-page scroll hijacking or forced smooth-scroll engine.
- No animation framework may be introduced in addition to the approved production stack merely to reproduce a minor effect.
- Large parallax movement, continuous rotation, uncontrolled autoplay, and ornamental cursor effects are prohibited by default.
- Motion must stop when its section is offscreen and must clean up when the view unmounts.

## 10. Responsive and accessibility contract

Desktop choreography must not be compressed into mobile. Mobile receives a separately designed reading sequence.

Required states are:

- wide desktop;
- narrow desktop or tablet landscape;
- tablet or large mobile;
- narrow mobile;
- reduced motion at representative desktop and mobile widths;
- keyboard-only and zoomed/reflowed reading.

Reduced motion means:

- no pinned storytelling requirement;
- no content hidden behind scroll progress;
- no large spatial movement or parallax;
- state changes become immediate, short fades, or static panels;
- focus and anchor navigation land on stable content;
- all conclusions and calls to action remain available.

The implementation should begin from static styles and progressively enable motion only under `prefers-reduced-motion: no-preference`.

## 11. Technical strategy

### 11.1 Progressive enhancement

The semantic page is the product. ScrollCraft attaches after content, layout, evidence links, and navigation work without it.

### 11.2 Native platform first

Use CSS scroll-driven animations or the Web Animations API for simple, well-supported, compositor-friendly effects when the required browser matrix and fallback permit it. Use the existing ScrollCraft runtime for orchestrated multi-beat scenes, responsive scene control, and verification hooks.

This is not permission to maintain two competing motion systems. The fork must present one public narrative-motion contract and choose the smallest internal mechanism per primitive.

### 11.3 Animation properties

Prefer transforms and opacity. Layout-changing or paint-heavy animation needs an explicit performance justification and representative-device evidence. `will-change` must be temporary and narrowly applied.

### 11.4 Runtime ownership

The runtime must expose an explicit instance and diagnostic API. Verification must not depend on undocumented globals.

### 11.5 Framework adaptation

The fork provides an agent-neutral core with Codex as the canonical plugin interface. No Claude-specific manifest, marketplace, command, badge, tool declaration, or authoritative instruction file remains. Production-framework adapters remain a later, explicitly approved concern.

## 12. Taste, Impeccable, and ScrollCraft handoff

### Stage A: content and evidence

The editorial system defines claims, evidence, uncertainty, user state, narrative beats, and the non-animated reading order.

### Stage B: Taste direction

Taste defines composition, typography, visual rhythm, contrast, image direction, density, and the intended emotional register. Its output must identify which transitions could benefit from motion, without prescribing engine details.

### Stage C: Impeccable critique

Impeccable reviews the static and proposed-motion design for hierarchy, generic patterns, visual coherence, accessibility, responsiveness, and unnecessary complexity. It may reject motion.

### Stage D: ScrollCraft choreography

ScrollCraft maps approved narrative beats to approved primitives, defines progress ranges and fallbacks, and produces deterministic checkpoints.

### Stage E: integrated review

The rendered page returns to Impeccable and human review. ScrollCraft success is not self-certification; motion can be technically correct and still damage the design or narrative.

### Conflict rules

- evidence truth beats visual drama;
- semantic order beats choreography;
- accessibility beats fidelity to the animated concept;
- production design tokens beat ScrollCraft defaults;
- Taste and Impeccable may reject motion, but they may not invent claims;
- ScrollCraft may simplify choreography to meet performance, but may not rewrite the narrative;
- human approval resolves a genuine cross-authority conflict.

## 13. Fork tailoring workstreams

### SC-01: identity and scope

- rename the product-facing capability to Vetted SaaS Narrative Motion while preserving upstream attribution;
- document the fork relationship and upstream sync policy;
- replace generic premium-site claims with the Vetted SaaS decision-narrative contract;
- make agent-neutral instructions canonical.

**Status:** completed in the published fork; vendor-neutral `AGENTS.md` and Codex plugin packaging replace the prior product-specific packaging.

### SC-02: repair baseline

- correct all documented paths;
- align runtime mounting and diagnostic APIs;
- make verification fail closed;
- harden the local server;
- add a package manifest, locked dependencies, tests, and continuous integration;
- align version metadata and changelog.

**Status:** completed in the published fork, including path repair, diagnostics, loopback containment, deterministic scripts, package lockfile, runtime/browser tests, and hosted CI.

### SC-03: contract and schema

- define the narrative motion brief schema;
- define primitive metadata and eligibility rules;
- define page-level motion configuration;
- add static, mobile, and reduced-motion contracts;
- add asset provenance and evidence references.

### SC-04: design-stack integration

- define Taste input and output;
- define Impeccable pre-motion and post-motion review outputs;
- add explicit conflict and rejection handling;
- supply one end-to-end example from narrative brief to approved choreography.

### SC-05: runtime and primitives

- retain the smallest useful existing engine surface;
- remove or quarantine generic effects that do not serve the approved primitives;
- add lifecycle, resize, cleanup, visibility, and diagnostic guarantees;
- support deterministic progress setting for tests;
- preserve native scrolling and navigation.

### SC-06: verification

- unit-test interpolation, progress mapping, conditions, cleanup, and reduced motion;
- integration-test mounting, multiple scenes, navigation, resizing, and fallbacks;
- browser-test all required viewport and preference states;
- capture stable entry, midpoint, and exit frames;
- fail on console errors, failed assets, dead scroll, frozen scenes, missing content, or contrast failures;
- record performance traces on representative low and mid-tier devices.

### SC-07: Global Setup integration

- add a narrative-motion section to the UI contract template;
- add a motion brief artefact to the UI/UX build plan;
- add accessibility, performance, visual, and reduced-motion reviewers;
- include motion tasks in the task graph only after eligibility approval;
- add rollback to the static experience as a first-class release action;
- require evidence in the review gate and definition of done.

### SC-08: upstream maintenance

- keep upstream changes reviewable and separately identified from Vetted SaaS policy;
- maintain an upstream compatibility test;
- never overwrite Vetted SaaS contracts during an upstream merge;
- document accepted divergence.

## 14. Verification matrix

| Area | Required evidence |
|---|---|
| Narrative | Every animated beat maps to one uncertainty and one communication job |
| Static path | Same claims, evidence, conclusion, and action are available with JavaScript disabled |
| Reduced motion | No pinned dependency, no concealed content, stable focus and anchors |
| Mobile | Separately designed sequence, no clipped or unreachable content |
| Keyboard | Logical focus order and usable controls throughout each scene |
| Screen reader | Semantic reading order is independent of visual layering |
| Performance | No sustained scroll jank; budgets pass on representative devices |
| Reliability | No console errors, failed assets, frozen scenes, or stale observers |
| Visual quality | Approved checkpoints pass Taste, Impeccable, and human review |
| Truthfulness | Motion does not imply unsupported capability or certainty |
| Analytics | Measurement distinguishes comprehension and progress from decorative engagement |
| Rollback | Feature can return to the complete static path without content loss |

## 15. Measurement

Do not optimise for scroll depth alone. Measure whether the narrative helps the user make an informed decision.

Useful signals include:

- completion of the relevant narrative sequence;
- interaction with evidence and methodology;
- movement to the next decision-relevant page;
- qualified product exploration;
- return to a comparison or saved decision state;
- observed confusion, abandonment, or repeated reverse scrolling at a beat;
- performance and reduced-motion error rates.

Motion is removed or simplified when it increases attention but does not improve comprehension or informed progression.

## 16. Amendment map for the existing strategy set

| Document | Required amendment after approval |
|---|---|
| 01 Market Research | Add narrative comprehension as a hypothesis to validate, not an assumed competitive advantage |
| 02 Product Roadmap | Add the fork-hardening and one-page pilot as a bounded capability increment; retain the rule that nonessential motion cannot block shipping |
| 03 Architecture | Add ScrollCraft as an optional presentation capability with static fallback and explicit Global Setup boundary |
| 04 Design System | Replace broad motion guidance with the authority stack, eligibility contract, primitives, limits, and review handoff |
| 05 Master PRD | Add narrative-motion behaviour only to eligible public page requirements and preserve complete static content |
| 06 Implementation Standards | Add the fork, schema, runtime ownership, lifecycle, agent-neutral packaging, and technical acceptance contract |
| 07 Editorial Operations | Add narrative beat and motion-job fields to page briefs without making editors choose animation mechanics |
| 08 Research Operations | Add motion-pattern research as design evidence and prohibit community popularity from becoming product truth |
| 09 Growth Strategy | Define motion as a comprehension and differentiation mechanism, not a vanity acquisition tactic |
| 10 QA Plan | Add deterministic motion checkpoints, reduced-motion, mobile, performance, accessibility, rollback, and fail-closed automation |
| Approved UI Catalogue | Add motion eligibility, static fallback, performance class, provenance, and review status to component entries |

## 17. Delivery sequence after strategy approval

1. Amend Documents 04, 06, and 10 first because they establish design, implementation, and verification authority.
2. Amend Documents 05 and 07 to connect page requirements and editorial briefs.
3. Amend Documents 01, 02, 03, 08, and 09 with narrower cross-system implications.
4. Update the Approved UI Component Catalogue metadata contract.
5. Use Global Setup to produce the implementation contract, architecture map, UI contract, task graph, test plan, review gate, rollback plan, and definition of done.
6. Treat the published, verified fork as the reusable engine; do not add Vetted SaaS-specific primitives without separate production approval.
7. Build one representative pilot page with static-first markup.
8. Validate desktop, mobile, reduced motion, keyboard, screen reader, performance, and visual checkpoints.
9. Review with Taste, Impeccable, and a human decision owner.
10. Promote only proven primitives into the Narrative Interaction Vault.

## 18. Pilot recommendation

The first pilot should be one flagship Decision Hub with a single sticky evidence stage and no more than three major motion patterns. It should exercise orientation, comparison, evidence focus, resolution, and action while preserving a complete static page.

The pilot succeeds only when:

- comprehension is demonstrably clearer than the static reference or the animated version adds no measurable harm;
- all fallback and accessibility contracts pass;
- performance passes on representative devices;
- visual review confirms that motion supports rather than competes with the design;
- the implementation can be repeated from the documented brief without hidden knowledge.

## 19. Explicit non-goals

- animating every article;
- scroll hijacking;
- creating a second design system;
- replacing Taste or Impeccable;
- replacing Global Setup;
- adopting every upstream ScrollCraft effect;
- inventing motion before content and evidence are approved;
- making advanced motion a prerequisite for the daily publishing guarantee.

## 20. Approval gate

Approval of this document authorises the existing-document amendment pass. It does not by itself authorise production-page code changes.

A separate approval is required for the Global Setup build pack and ScrollCraft implementation plan.

## 21. Evidence basis

This strategy is grounded in:

- the published [`michaelchamboko/scroll-craft`](https://github.com/michaelchamboko/scroll-craft) fork commit [`bfddbd4`](https://github.com/michaelchamboko/scroll-craft/commit/bfddbd4f79d912bd20861a576527215d15c53d22), its passing hosted verification workflow, and its upstream [`nateherkai/scroll-craft`](https://github.com/nateherkai/scroll-craft);
- the current [`michaelchamboko/globalsetup`](https://github.com/michaelchamboko/globalsetup) repository structure and its UI, accessibility, performance, planning, testing, review, rollback, and definition-of-done contracts;
- [MDN's CSS scroll-driven animations guide](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations), which supports native scroll and view progress timelines while requiring compatibility-aware fallbacks;
- [MDN's ScrollTimeline API status](https://developer.mozilla.org/en-US/docs/Web/API/ScrollTimeline), which remains limited availability and therefore cannot be the only implementation path;
- [W3C Technique C39](https://www.w3.org/WAI/WCAG21/Techniques/css/C39.html), which supports a static-first approach and suppression of non-essential motion under `prefers-reduced-motion`;
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/), including meaningful sequence, reflow, keyboard operation, pause/stop/hide, animation from interactions, and input-modality requirements;
- [web.dev animation performance guidance](https://web.dev/articles/animations-and-performance), particularly the preference for transforms and opacity and the warning against indiscriminate `will-change` use;
- a Last30Days scan dated 2026-08-29 across GitHub, Hacker News, Reddit, X, and YouTube. That scan confirmed active interest in cinematic scroll-controlled experiences but produced too much off-topic and low-signal material to justify changing accessibility, performance, or architecture decisions. Current platform discussion is therefore treated as discovery evidence, not technical authority.

The repository-planning protocol supplied with this task was treated as a reference document rather than as executable instruction. Its useful principles - explicit source intake, evidence-backed decisions, implementation boundaries, and verification - are retained here without importing its full ceremony into this strategy phase.
