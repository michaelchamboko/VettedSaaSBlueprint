# Vetted SaaS Blueprint - Design System and Experience Standards

**Document ID:** VSB-04-DESIGN-SYSTEM  
**Version:** 1.0 Working Baseline  
**Status:** Approved planning baseline, subject to controlled iteration  
**Date:** 27 August 2026  
**Product:** Vetted SaaS Blueprint  
**Production reference:** `https://vettedsaasblueprint.online/`  
**Current hosting:** Vercel  
**Original ten-document position:** Design System was listed as Document 3  
**Current programme position:** Document 4, because the AI-First Architecture and Automation Blueprint was inserted as an additional mandatory document

---

## 1. Purpose of This Document

This document defines the visual, interaction, content-presentation, and design-governance system for Vetted SaaS Blueprint.

It converts the product strategy, current production identity, three reference-video transcripts, Taste Skill, Impeccable, and the decisions made during product planning into rules that AI agents can execute consistently.

The design system exists to prevent five recurring failures:

1. AI-generated pages that look generic, repetitive, or visibly templated.
2. Attractive pages that do not help a visitor understand or make a decision.
3. Designs that drift away from the established Vetted SaaS Blueprint identity.
4. Pages delayed by endless visual refinement before anything is published.
5. Design instructions so subjective that only an expensive model can interpret them reliably.

This is not a greenfield redesign specification. Vetted SaaS Blueprint is already live, indexed, and deployed on Vercel. The system must extract, preserve, and deliberately evolve what already exists.

---

## 2. Relationship to the Other Planning Documents

This document must be read with:

1. `Vetted-SaaS-Blueprint-01-Market-Research-and-Opportunity-Plan-v1.md`
2. `Vetted-SaaS-Blueprint-02-Product-Roadmap-v1.md`
3. `Vetted-SaaS-Blueprint-03-AI-First-System-Architecture-and-Automation-Blueprint-v1.md`
4. `Vetted-SaaS-Blueprint-Master-PRD-v1.md`

The documents have different authority:

| Document | Primary responsibility |
|---|---|
| Market Research and Opportunity | Why the business should exist and where it can win |
| Product Roadmap | What must be delivered, in what sequence, and with what public proof |
| AI-First Architecture | How the workflows, models, evidence, and deployment system operate |
| Master PRD | What the product must do |
| This Design System | How the product must communicate, look, feel, and behave |
| Future Art Direction | How photography, illustration, diagrams, and visual storytelling are directed |
| Future UI Kit and Component Library | The actual production components and their technical implementation |

Where a visual preference conflicts with decision clarity, accessibility, evidence integrity, or the daily publishing commitment, those product requirements take priority.

**Cadence supersession (owner directive 2026-10-28):** Any "daily", "every active day", fixed-time, scheduled, watchdog, rescue, or recurring-publication wording in this document is retained only as historical batch terminology or traceability. It does not authorise a schedule or ongoing publication obligation. The release unit remains valid, but execution occurs only from an explicit manual or API trigger under `AGENTS.md` and `planning.md`.

---

## 3. Executive Design Thesis

Vetted SaaS Blueprint must feel like an intelligent, independent decision journal rather than an affiliate content farm, generic SaaS template, old WordPress publication, or artificial intelligence showcase.

The desired experience is:

- calm but not boring;
- premium but not wastefully luxurious;
- modern but not gimmicky;
- authoritative but not arrogant;
- human but not casual or sloppy;
- commercially effective but not manipulative;
- evidence-rich but not visually overwhelming;
- consistent but not repetitive;
- animated but not distracting;
- clear enough for a first-time visitor and structured enough for an AI crawler.

The core design statement is:

> Vetted SaaS Blueprint uses deliberate hierarchy, evidence placement, human-first language, restrained visual systems, and purposeful motion to help a visitor understand what matters, trust the reasoning, and confidently take the next step.

---

## 4. Existing Production Identity Is Canonical

### 4.1 Binding rule

The current production homepage is the canonical starting reference for:

- brand colours;
- typography;
- spacing rhythm;
- grid behaviour;
- navigation treatment;
- border and divider treatment;
- button styling;
- editorial tone;
- use of numbering and labels;
- evidence-oriented language;
- disclosure presentation;
- footer structure;
- overall visual restraint.

No agent may replace the current identity with a generic design system merely because another template appears more fashionable.

### 4.2 Existing brand signals to preserve

The live site already establishes several valuable signals:

- “Software decisions, vetted with receipts.”
- independent review-journal positioning;
- evidence before adjectives;
- fit over popularity;
- visible limitations and trade-offs;
- transparent affiliate disclosure;
- a numbered editorial structure;
- concise, direct, plain-English descriptions.

These signals are stronger than generic “best software” branding and must remain visible as the system evolves.

### 4.3 Required token-extraction task

Before creating new visual tokens, the implementation agent must inspect the current production code and extract the existing values into a formal token file.

The extraction must cover:

- colour palette and semantic colour roles;
- font families and fallbacks;
- font weights;
- type scale;
- line-height scale;
- letter-spacing rules;
- spacing scale;
- content widths;
- breakpoints;
- grid columns and gaps;
- border widths and colours;
- border radii;
- shadows;
- icon sizes and stroke styles;
- button heights and padding;
- navigation dimensions;
- image aspect ratios;
- transition durations and easing;
- focus-state styling;
- responsive behaviour.

Unknown values must be marked `TO_EXTRACT_FROM_PRODUCTION`. They must not be guessed simply to make the document appear complete.

### 4.4 Controlled evolution

A new token or component may be introduced only when:

1. the existing system cannot serve the required decision experience;
2. the new token has a defined semantic purpose;
3. it is reusable beyond one isolated page;
4. it passes mobile, accessibility, and consistency checks;
5. the change is logged in the design decision register.

---

## 5. Non-Negotiable Design Principles

### 5.1 Customer problem first

The interface must speak to the visitor’s problem, desired outcome, constraints, and decision before it speaks about the software provider.

Product names may appear where relevant, but they must not control the page merely because they carry affiliate links.

### 5.2 Clarity before aesthetics

A page is not successful because it looks impressive. It is successful when a first-time visitor can understand the situation, trust the reasoning, and identify the next step.

Visual polish supports clarity. It does not replace it.

### 5.3 Premium is consistency

For Vetted SaaS Blueprint, premium design is defined as consistent, deliberate execution across:

- message hierarchy;
- spacing;
- typography;
- colours;
- buttons;
- evidence presentation;
- motion;
- mobile behaviour;
- feedback states;
- affiliate disclosure;
- page-to-page terminology.

A single spectacular page beside inconsistent pages does not create a premium product.

### 5.4 Every section removes uncertainty

Every section must declare the uncertainty it removes.

Examples:

- “Am I in the right place?”
- “Do they understand my situation?”
- “What matters in this decision?”
- “Why is this option recommended?”
- “What are the limitations?”
- “Can I trust this evidence?”
- “What do I do next?”

A section that cannot name its purpose must be removed, merged, or redesigned.

### 5.5 Conversion means informed progress

The page must move the visitor one sensible step forward.

That step may be:

- continuing to another decision page;
- filtering options;
- viewing evidence;
- requesting a personalised report;
- joining an email sequence;
- visiting an affiliate product;
- deciding not to buy yet.

Conversion is not defined solely as an affiliate click.

### 5.6 Respect over manipulation

The design may use marketing psychology, hierarchy, motion, social proof, contrast, and specific calls to action. It must not use deception.

Prohibited patterns include:

- fake urgency;
- artificial countdowns;
- hidden affiliate relationships;
- misleading button labels;
- forced email capture before value is shown;
- fake ratings;
- fabricated testimonials;
- disguised advertisements;
- confusing opt-outs;
- pop-ups that interrupt the initial decision journey;
- visual pressure that hides trade-offs.

### 5.7 Modern, animated, and alive

The website must not become a static, frozen publication that merely presents long text blocks.

Modernity must come from:

- purposeful motion;
- responsive interactions;
- progressive disclosure;
- interactive evidence;
- guided decision controls;
- strong editorial layouts;
- varied but coherent compositions;
- high-quality imagery and diagrams;
- polished loading, success, and error states.

The answer to generic AI motion is not removing motion. It is giving motion a job and selecting it from an approved pattern system.

### 5.8 Mobile is a primary design environment

Mobile is not a reduced desktop layout. Every page must be designed and validated as a one-handed, small-screen decision experience.

### 5.9 Publish first, improve continuously

Design optimisation must not recreate the previous failure where gates and reviews prevent public output.

The sequence is:

1. assemble a truthful and usable page;
2. perform safety and correctness checks;
3. publish to Vercel;
4. run the deeper design evaluation;
5. queue and apply improvements;
6. record what changed and why.

Safety or correctness defects must be handled by removing, replacing, simplifying, or rolling back the affected claim, component, or interaction while the smallest safe and truthful connected set still publishes. Design review may not block an approved on-demand release (AGENTS.md; planning.md).

Missing, partial, conflicting, or stale evidence must have usable visual states. Those states publish when approved and released, remain visibly qualified, and can be updated when stronger evidence becomes available. Every page and asset must support versioned post-publication improvement rather than waiting for visual or evidential completeness.

### 5.10 No design change without a reason

An AI agent may not approve or introduce a design change merely because it “looks better.”

Every change must state:

- the principle it serves;
- the user uncertainty it reduces;
- the expected benefit;
- how the result will be checked;
- whether it changes a shared token or component.

---

## 6. Design Authority and Tool Roles

### 6.1 Authority order

When design instructions conflict, use this order:

1. Safety, truthfulness, legal and accessibility requirements
2. Master PRD and public decision usefulness
3. Existing production identity
4. This Design System
5. Approved Art Direction document
6. Approved UI Kit and Component Library
7. Approved UI and Motion Vault
8. Taste Skill guidance
9. Impeccable guidance and detector output
10. Model-generated design preference

### 6.2 Taste Skill role

Taste Skill is the controlled creative-design partner. It is used to improve:

- layout variance;
- visual hierarchy;
- spacing;
- typography;
- motion intensity;
- visual density;
- anti-repetition;
- modern frontend expression;
- image-first references where appropriate.

Taste Skill must read this design system and the extracted production tokens before generating or redesigning anything.

Its adjustable design dials should eventually be set per page type rather than left at arbitrary model defaults.

Initial working ranges:

| Page type | Design variance | Motion intensity | Visual density |
|---|---:|---:|---:|
| Decision Hub | 5-7 | 4-6 | 5-7 |
| Solution Hub | 5-7 | 5-7 | 5-7 |
| Decision Scenario | 6-8 | 5-7 | 4-6 |
| Evidence-heavy module | 3-5 | 2-4 | 7-9 |
| Lead-magnet landing state | 5-7 | 4-6 | 4-6 |

These values are starting hypotheses, not permanent truth. The implementation team must test and version them.

### 6.3 Impeccable role

Impeccable is the design quality, alignment, and anti-slop control system.

It should be used for:

- extracting existing design patterns;
- documenting the current design language;
- shaping page UX before implementation;
- critiquing hierarchy and clarity;
- auditing accessibility, responsiveness, and performance;
- improving spacing and layout;
- correcting typography;
- adding purposeful motion;
- hardening edge cases;
- polishing pages after publication;
- detecting repeat AI-generated frontend patterns.

Impeccable must not independently replace the brand direction. It operates within this system.

### 6.4 Combined workflow

Taste Skill and Impeccable are complementary:

- Taste Skill prevents bland, generic, low-variance output.
- Impeccable prevents inconsistency, technical weakness, and familiar AI-design anti-patterns.
- This Design System decides what both tools are trying to achieve.

### 6.5 Model role

The premium model establishes the reference-quality page and converts judgement into repeatable rules.

Lower-cost models may then assemble pages from approved schemas, tokens, and patterns. Their output is accepted only when it meets the same deterministic checks.

---

## 7. Principles Extracted From Reference Transcript 1

The first reference transcript focuses on first impressions, cognitive load, microinteractions, and respect for the visitor.

The psychological claims from the video are treated as design hypotheses and operating principles. Exact scientific claims must be independently verified before being used as public marketing claims.

### 7.1 Engineer the first impression

#### Principle

The first visible screen shapes the visitor’s interpretation of the rest of the experience.

#### Vetted SaaS Blueprint application

The first viewport must make the visitor feel:

> “They understand my problem, they have done the work, and I can see a sensible next step.”

#### Deterministic rule

Every first viewport must contain or expose without interaction:

1. the decision or problem;
2. the intended audience or context;
3. the immediate value or answer direction;
4. one trust signal;
5. one primary next action.

### 7.2 Reduce cognitive load

#### Principle

Confusing layouts create effort and distrust. Clear layouts create control and confidence.

#### Vetted SaaS Blueprint application

The system must make complex software decisions feel manageable without pretending the decision is simpler than it is.

#### Deterministic rules

- One section has one primary job.
- One section has one dominant visual message.
- Supporting evidence must not compete with the recommendation.
- Long evidence can use progressive disclosure.
- The page must use predictable navigation and headings.
- Duplicate explanations are prohibited.
- Plain language appears before technical language.

### 7.3 Use white space as structure

#### Principle

White space separates ideas and signals importance.

#### Vetted SaaS Blueprint application

White space must make the decision path easier to scan. It must not be used to imitate luxury-brand emptiness at the cost of useful evidence.

#### Deterministic rules

- Distinct decision blocks require visible separation.
- Important actions require breathing room.
- Related evidence remains visually grouped.
- A page must not be made artificially long through oversized spacing.
- Density may increase in evidence tables and decrease around major decisions.

### 7.4 Create purposeful microinteractions

#### Principle

Small, responsive details communicate care and system quality.

#### Vetted SaaS Blueprint application

Microinteractions should make the system feel intelligent and responsive.

Approved examples:

- a filter visibly changing the recommendation set;
- an evidence panel opening with clear continuity;
- a selected criterion changing state;
- a form confirming valid input;
- a progress indicator moving through a decision report;
- a source citation preview appearing without losing reading position;
- a clear handoff before the visitor opens an affiliate destination.

#### Deterministic rule

Every interaction must visibly communicate at least one of:

- state;
- progress;
- relationship;
- confirmation;
- error recovery;
- navigation context.

### 7.5 Design the ending

#### Principle

The visitor should finish with a strong sense of clarity rather than simply reaching the bottom of a page.

#### Vetted SaaS Blueprint application

Important completion moments include:

- receiving a recommendation;
- understanding a trade-off;
- seeing why the evidence is sufficient or insufficient;
- requesting a decision report;
- choosing to visit a provider;
- knowing what to investigate next.

#### Deterministic rule

Every page must end with:

1. a concise decision summary;
2. the important limitation or confidence state;
3. one logical next step;
4. a visible affiliate disclosure where the next step is commercial.

### 7.6 Respect is the conversion strategy

The visitor’s time, intelligence, and autonomy must be respected.

The page must not hide complexity, fabricate certainty, or pressure a click before resolving the core doubt.

---

## 8. Principles Extracted From Reference Transcript 2

The second transcript focuses on conversion rather than decoration, hierarchy, first-screen clarity, call-to-action wording, purposeful animation, and the “thunk” of polished interaction.

### 8.1 Design is structured communication

A page is not complete because its fonts, colours, and images look attractive. The page must perform its intended job.

#### Deterministic requirement

Every page record must declare:

- primary user question;
- primary user state;
- primary decision outcome;
- primary action;
- evidence required to support the action.

### 8.2 Do not major in the minor

Agents must solve message, structure, hierarchy, evidence, and action before polishing small visual details.

Required order:

1. user problem;
2. page purpose;
3. information structure;
4. evidence and reasoning;
5. hierarchy;
6. responsive layout;
7. interaction states;
8. visual polish.

### 8.3 One thing leads

When several buttons, headings, badges, or illustrations compete, the visitor cannot identify the intended path.

#### Deterministic rules

- Each section has one primary element.
- Each viewport has one dominant intended action.
- Secondary actions must be visually subordinate.
- Tertiary links must not resemble primary buttons.
- Badges must not compete with the headline.
- Decorative imagery must not pull attention away from the decision.

### 8.4 Hero is not a brochure introduction

The most important message must not be saved for further down the page.

The first screen must carry enough meaning for a scanning visitor to understand the page.

### 8.5 Calls to action must describe the action

Generic labels such as `Submit`, `Click here`, and `Learn more` are prohibited when a more specific action is available.

Preferred structures:

- `See which option fits`
- `Compare the evidence`
- `Build my shortlist`
- `Get my decision report`
- `Check current pricing`
- `Visit [Product]`
- `See the trade-offs`
- `Review the source`

CTA wording must tell the user what will happen next.

### 8.6 Motion is part of the product, not an afterthought

Motion should not be removed simply because purely decorative animation is discouraged.

The design must remain engaging. The system therefore uses a controlled motion strategy:

- at least one purposeful signature interaction on each major page where technically appropriate;
- responsive microinteractions on interactive controls;
- transitions that preserve context;
- progressive reveals for complex evidence;
- visually satisfying completion states.

Motion is rejected when it:

- delays content;
- blocks interaction;
- causes layout instability;
- exists only to demonstrate technical skill;
- repeats continuously without user value;
- ignores reduced-motion preferences;
- makes reading difficult.

### 8.7 Create the website “thunk”

The “thunk” is the cumulative feeling that the product is well made.

For Vetted SaaS Blueprint it comes from:

- buttons responding immediately;
- filters updating clearly;
- panels opening predictably;
- forms acknowledging input;
- evidence retaining context;
- navigation never surprising the user negatively;
- typography and spacing remaining consistent;
- mobile layouts feeling intentional;
- errors explaining what happened and what to do next.

It is not one animation or visual trick. It is consistent behaviour across hundreds of small decisions.

---

## 9. Principles Extracted From Reference Transcript 3

The third transcript adds a concrete seven-part premium-design framework: hero, hierarchy, white space, contrast and colour, social proof, typography, and mobile.

### 9.1 Hero as a complete pitch

The hero is treated as a compact decision interface, not a decorative banner.

Required hero slots:

1. **Eyebrow or context cue** - optional, but useful for category, buyer state, or freshness.
2. **Clear headline** - states the customer problem, outcome, or decision.
3. **Supporting context** - explains who the page is for and what conditions matter.
4. **Trust or proof element** - demonstrates why the visitor should continue.
5. **Primary CTA** - states exactly what happens next.
6. **Optional secondary action** - only where it supports a distinct lower-commitment path.
7. **Relevant visual or interactive element** - supports comprehension rather than decoration.

### 9.2 Hero no-scroll test

An AI agent must answer these five questions with `YES`, `NO`, or `UNCERTAIN`:

1. Can a first-time visitor tell what decision or problem this page addresses?
2. Can the visitor tell who or which situation the page is for?
3. Can the visitor see why the page is trustworthy?
4. Can the visitor identify the primary next action?
5. Can the visitor decide whether to continue without scrolling?

Result policy:

| Result | Action |
|---|---|
| Five `YES` answers | Hero passes the first review |
| One or more `UNCERTAIN` answers | Publish if safe and correct, then queue a high-priority hero improvement |
| One or more `NO` answers | Publish if safe, truthful, and usable; automatically queue immediate correction in the next optimisation run |
| Misleading, unsafe, broken, or legally non-compliant | Correct before publication |

The no-scroll test is not allowed to become another gate that prevents the daily three-page deployment.

### 9.3 Visual hierarchy

Every page must deliberately define what the eye encounters first, second, and third.

Required hierarchy levels:

- Level 1: page decision or main outcome;
- Level 2: section question or major recommendation;
- Level 3: supporting reasoning;
- Level 4: evidence detail, metadata, and fine print.

The implementation review should include:

- zoomed-out screenshot review;
- grayscale review where practical;
- mobile screenshot review;
- “squint test” or equivalent visual-salience check;
- primary CTA salience check.

### 9.4 White space and restraint

The default response to a weak section is not to add another element.

The agent must first test:

- whether spacing is too tight;
- whether unrelated information needs separation;
- whether the hierarchy lacks contrast;
- whether duplicate content can be removed;
- whether the section has too many competing actions.

### 9.5 Contrast and colour

Colour performs two jobs:

1. ensuring content is readable;
2. steering attention.

Rules:

- The production palette remains the baseline.
- Most of the page should remain visually restrained.
- The primary action should normally have the strongest intentional action contrast.
- Text contrast must meet the current accessibility baseline.
- Low-contrast grey text used merely to appear elegant is prohibited.
- Colour must not be the only indicator of meaning.
- Warning, success, uncertainty, conflict, and evidence states require consistent semantic tokens.

### 9.6 Proof at the point of doubt

Evidence and reassurance must appear where the related concern arises.

Examples:

- pricing evidence beside a pricing claim;
- source freshness beside a recommendation;
- affiliate disclosure beside a commercial action;
- security evidence beside a trust claim;
- limitation beside the recommendation it qualifies;
- review pattern beside a sentiment conclusion;
- methodology beside a score.

A remote “testimonials” section cannot compensate for missing proof at the decision point.

### 9.7 Typography restraint

Typography must be controlled rather than expressive everywhere.

Rules:

- Use the production font system unless a deliberate migration is approved.
- Limit the main interface to one or two font families.
- Keep body text highly readable.
- Use personality primarily in headings, labels, or editorial display moments.
- Maintain a clear, reusable type scale.
- Avoid decorative body fonts.
- Avoid arbitrary size changes introduced page by page.
- Line length, line height, and paragraph spacing must support scanning.

### 9.8 Mobile-first validation

Every public page must be checked on a real or accurately emulated mobile viewport before and after publication.

Required checks:

- no horizontal overflow;
- readable body text without zoom;
- visible primary CTA;
- controls that can be selected without accidental taps;
- navigation that remains understandable;
- tables that reflow, scroll clearly, or transform into cards without losing meaning;
- evidence drawers that do not trap the user;
- images that crop intentionally;
- motion that remains smooth and optional;
- forms usable with one hand;
- disclosure and source information still accessible.

The system should target WCAG 2.2 Level AA as its baseline and use larger touch targets for important controls where practical.

---

## 10. Brand Feeling and Emotional Outcome

### 10.1 Primary desired feeling

**Calm confidence.**

The visitor should feel that the website has reduced noise, recognised the real problem, and made the decision easier to understand.

### 10.2 Supporting feelings

- independent;
- intelligent;
- current;
- composed;
- transparent;
- human;
- practical;
- commercially aware;
- precise;
- alive.

### 10.3 Feelings to avoid

- sales pressure;
- content-farm repetition;
- generic artificial intelligence imagery;
- corporate sterility;
- chaotic dashboard density;
- influencer hype;
- academic distance;
- old blog-template familiarity;
- frozen or lifeless presentation;
- over-designed agency theatre.

---

## 11. Page-Type Design Systems

The three public page types share tokens and components, but they should not be visually identical.

Consistency comes from the underlying system. Variety comes from composition, emphasis, evidence type, imagery, and interaction.

### 11.1 Decision Hub

#### Job

Help the user understand the problem, recognise hidden pains, and determine which factors matter.

#### Default visual character

- editorial;
- diagnostic;
- calm;
- structured;
- question-led;
- moderate information density.

#### Recommended design patterns

- decision-opening hero;
- “you are in the right place if” context band;
- pain-point map;
- root-cause diagram;
- decision-question navigator;
- priority-factor cards or ranked list;
- trade-off callouts;
- conditional path selector;
- methodology and source drawer;
- next-decision card.

#### Signature interaction examples

- a guided pain-to-priority selector;
- a scroll-linked decision map;
- a “what matters to you” filter that changes the recommended next path;
- progressive root-cause reveal.

### 11.2 Solution Hub

#### Job

Connect a desired outcome and constraints to conditional best-fit solution options.

#### Default visual character

- practical;
- comparative without becoming a generic comparison table;
- scenario-led;
- evidence-rich;
- action-oriented.

#### Recommended design patterns

- outcome-focused hero;
- buyer-context chips;
- decision-criteria summary;
- best-fit scenario cards;
- fit and non-fit indicators;
- reasoning accordion;
- evidence-confidence meter;
- trade-off panel;
- affiliate action with disclosure;
- decision-report lead magnet.

#### Signature interaction examples

- scenario filters that update best-fit cards;
- an interactive constraint slider;
- a two-axis fit map;
- expandable evidence receipts;
- a shortlist builder.

### 11.3 Decision Scenario

#### Job

Resolve a concrete situation where two or more options, approaches, or actions must be weighed.

#### Default visual character

- focused;
- decisive;
- visually engaging;
- lower content density than a Decision Hub;
- stronger contrast around the final recommendation.

#### Recommended design patterns

- scenario statement hero;
- assumptions strip;
- “choose this when” branches;
- side-by-side trade-off view;
- conditional recommendation block;
- disagreement or uncertainty callout;
- cost, risk, and implementation consequences;
- final decision summary;
- next action.

#### Signature interaction examples

- toggle between buyer conditions;
- drag or slide a priority weight and see the recommendation change;
- reveal consequences as conditions change;
- compare evidence at the point of disagreement.

---

## 12. Shared Page Narrative

All three page types should guide the visitor through a coherent decision sequence:

1. **Recognition** - “This is my problem.”
2. **Understanding** - “I see why this is happening.”
3. **Prioritisation** - “I know what matters most.”
4. **Evaluation** - “I can compare the relevant paths.”
5. **Confidence** - “I understand the evidence and trade-offs.”
6. **Action** - “I know what to do next.”

The visual hierarchy, content order, and motion should support that sequence.

---

## 13. Layout and Grid Standards

### 13.1 General rule

The grid must support editorial clarity and modern composition without causing page-to-page randomness.

### 13.2 Layout behaviours

Approved layouts may include:

- full-width editorial hero with constrained copy;
- split hero with evidence or product visual;
- asymmetric content and supporting evidence;
- sticky decision navigation;
- alternating editorial bands;
- full-bleed diagrams;
- contained evidence tables;
- responsive side-by-side scenario panels;
- stepped decision flows;
- controlled horizontal story sections where accessible.

### 13.3 Anti-repetition rule

No three consecutive published pages may use the exact same:

- hero composition;
- section sequence presentation;
- card arrangement;
- signature interaction;
- image treatment.

They may share the same information schema and components, but composition must respond to the user problem and evidence.

### 13.4 Content width

- Long-form reading text requires a constrained readable width.
- Evidence grids and comparisons may expand beyond the reading column.
- Full-width visual sections must still preserve clear alignment anchors.
- Mobile content should use the available width without edge crowding.

Exact values must be extracted from or reconciled with production tokens.

---

## 14. Spacing and Density System

### 14.1 Spacing scale

The project must use one extracted and documented spacing scale. Agents may not introduce isolated values without justification.

### 14.2 Density by task

| Task | Preferred density |
|---|---|
| Hero and major decision | Low to medium |
| Explanation and narrative | Medium |
| Evidence table | Medium to high |
| Interactive selector | Medium |
| Final recommendation | Low to medium |
| Footer and legal | Medium to high, but readable |

### 14.3 White-space validation

An agent must check:

- Are related elements grouped?
- Are unrelated ideas separated?
- Does the primary action have enough breathing room?
- Is the page unnecessarily long because of spacing?
- Does mobile spacing remain proportionate?
- Does the section feel empty because information is missing rather than because restraint is working?

---

## 15. Colour System

### 15.1 Canonical palette

The current production palette must be extracted and converted into semantic tokens before new colours are added.

### 15.2 Required semantic roles

At minimum, the token system must define:

- page background;
- elevated surface;
- primary text;
- secondary text;
- subtle text;
- border and divider;
- primary brand;
- primary action;
- primary action hover;
- secondary action;
- focus indicator;
- evidence confirmed;
- evidence partial;
- evidence conflicting;
- evidence insufficient;
- positive fit;
- conditional fit;
- poor fit;
- warning;
- error;
- affiliate disclosure.

### 15.3 Colour discipline

- Use a restrained base palette.
- Reserve strong contrast for important actions and states.
- Do not use colourful gradients as a default sign of “AI” or “innovation.”
- Do not use colour without semantic meaning.
- Do not introduce a new accent colour for a single page.
- Do not place low-contrast grey text on coloured backgrounds.
- Do not use pure decorative colour where hierarchy can solve the problem.

---

## 16. Typography System

### 16.1 Token extraction

The current font families, sizes, weights, line heights, and letter spacing must be extracted from production.

### 16.2 Required semantic text styles

The final system should expose named roles rather than arbitrary font sizes:

- display headline;
- page headline;
- section headline;
- subsection headline;
- eyebrow label;
- body large;
- body standard;
- body compact;
- evidence label;
- source metadata;
- button label;
- input label;
- caption;
- legal and disclosure text.

### 16.3 Writing and typesetting rules

- Headings must communicate meaning, not merely label sections.
- Body copy must be readable and direct.
- Paragraphs should remain short enough to scan.
- Lists should be used when they genuinely simplify comparison.
- Bold must indicate decision significance, not decorate every sentence.
- Links must be visibly identifiable.
- Fine print must remain readable.
- Long unbroken centre-aligned body copy is prohibited.

---

## 17. Imagery and Visual Evidence Strategy

### 17.1 Imagery is not decoration

Every image must improve at least one of:

- comprehension;
- trust;
- emotional relevance;
- product understanding;
- decision confidence;
- recall.

If it does not, remove it.

### 17.2 Priority order

Use visual assets in this order where appropriate:

1. authentic product screenshots;
2. evidence visualisations;
3. explanatory diagrams;
4. original decision maps;
5. authentic people in credible working situations;
6. editorial photography;
7. carefully art-directed generated imagery;
8. generic stock imagery only as a last resort.

### 17.3 People photography

Images of people should:

- represent the buyer or user context;
- show believable work rather than staged excitement;
- feel editorial rather than generic corporate stock;
- avoid exaggerated smiles and unnatural laptop poses;
- support the emotional reality of the problem;
- reflect diverse real users without tokenistic composition.

### 17.4 Product screenshots

Screenshots must:

- be current where possible;
- identify the product and relevant screen;
- avoid implying hands-on testing where none occurred;
- use consistent framing and annotation;
- hide private or sensitive information;
- include source and capture date internally;
- remain legible on mobile or offer zoom/detail.

### 17.5 Generated imagery

AI-generated imagery is permitted only when:

- a real screenshot, diagram, or authentic photo cannot serve the purpose;
- the image follows an approved art direction;
- hands, text, interfaces, and physical details are checked;
- it does not pretend to document a real customer or product result;
- it does not use generic neon-AI symbolism by default;
- it is visually consistent with the site.

### 17.6 Image variation

Repeated generic hero illustrations are prohibited. Image style, crop, subject, and function must respond to the page’s actual decision context.

---

## 18. Motion and Interaction System

### 18.1 Motion objective

Motion should make the site feel current, alive, guided, and responsive.

The project explicitly rejects two extremes:

- lifeless static pages;
- technically impressive but distracting animation showcases.

### 18.2 Motion layers

#### Layer 1: Control feedback

Required for:

- buttons;
- tabs;
- toggles;
- filters;
- forms;
- drawers;
- accordions;
- menus;
- shortlist actions.

#### Layer 2: Context-preserving transitions

Used for:

- recommendation updates;
- evidence expansion;
- moving between decision steps;
- comparing scenarios;
- loading personalised reports;
- switching buyer conditions.

#### Layer 3: Signature page interaction

Each major page should include one meaningful, memorable interaction where appropriate.

Examples:

- animated decision path;
- interactive fit map;
- scenario slider;
- evidence constellation;
- problem-to-solution transformation;
- scroll-guided sequence;
- before-and-after workflow visualisation.

#### Layer 4: Editorial atmosphere

Subtle transitions may establish mood, including:

- calm content reveals;
- image masks;
- restrained parallax;
- section transitions;
- progress-linked line or shape motion.

These must never obscure the content.

### 18.3 Motion eligibility test

An animation is eligible when it does at least one of the following:

- directs attention to the next decision;
- explains cause and effect;
- confirms a user action;
- shows progress;
- preserves spatial context;
- reveals complexity gradually;
- distinguishes a state change;
- creates a deliberate completion moment.

### 18.4 Motion rejection test

Reject or reduce an animation when:

- it plays continuously without purpose;
- it delays reading;
- it causes motion sickness or ignores preferences;
- it competes with the CTA;
- it increases layout shift;
- it makes mobile interaction difficult;
- it is copied from a trend without relevance;
- it exists solely because the model can implement it.

### 18.5 Approved-library strategy

Agents should not search the open web and copy arbitrary animation code during every page build.

They must use:

1. approved internal motion patterns;
2. approved open-source component libraries;
3. approved code snippets stored in the UI and Motion Vault;
4. a documented exception process for new patterns.

### 18.6 Motion metadata

Every reusable motion pattern must record:

- name;
- user purpose;
- suitable components;
- unsuitable contexts;
- required library;
- licence;
- performance notes;
- mobile behaviour;
- reduced-motion fallback;
- accessibility notes;
- example screenshot or recording;
- implementation reference;
- version.

---

## 19. UI and Motion Vault - Deferred Curation Requirement

### 19.1 Locked reminder

Before the UI Kit and Component Library is finalised, Mike and the design assistant must hold a dedicated curation session.

Mike will provide:

- links to free UI libraries;
- screenshots of preferred patterns;
- links to individual components;
- examples of motion and layouts he finds engaging;
- examples he dislikes;
- notes on which visual ideas feel appropriate for Vetted SaaS Blueprint.

The design assistant will:

- classify the patterns;
- verify licence and reuse conditions;
- remove duplicates;
- identify accessibility and mobile risks;
- normalise them to the production design tokens;
- convert suitable patterns into reusable components;
- define usage rules;
- capture screenshots and metadata;
- create an agent-readable registry.

### 19.2 Vault purpose

The vault gives agents controlled creative freedom.

They may select and combine approved patterns instead of:

- inventing every interface from scratch;
- repeating the same generic AI layout;
- downloading random code during production;
- introducing incompatible styles;
- creating inaccessible animations.

### 19.3 Suggested vault categories

- heroes;
- navigation;
- decision maps;
- content reveals;
- evidence drawers;
- scenario selectors;
- comparison interactions;
- cards and lists;
- data visualisations;
- trust and proof blocks;
- lead magnets;
- forms;
- mobile navigation;
- footers;
- loading states;
- empty states;
- success states;
- motion patterns;
- image treatments.

### 19.4 Suggested repository structure

```text
/design-system
  /tokens
  /foundations
  /patterns
  /motion
  /imagery
  /references
  /decisions
  design-registry.json

/components
  /primitives
  /editorial
  /decision
  /evidence
  /conversion
  /motion

/docs/design-vault
  README.md
  approved-patterns.md
  rejected-patterns.md
  licensing.md
```

This structure is a planning recommendation. It must be adapted to the existing repository conventions rather than imposed blindly.

---

## 20. Core Component Families

The future UI Kit should implement these families.

### 20.1 Foundations

- container;
- grid;
- stack;
- cluster;
- divider;
- surface;
- text roles;
- icon system;
- responsive media;
- focus ring;
- semantic status colour.

### 20.2 Navigation

- primary header;
- mobile menu;
- breadcrumb;
- decision-path navigation;
- sticky section navigator;
- related-decision links;
- back-to-context control.

### 20.3 Hero components

- decision hero;
- outcome hero;
- scenario hero;
- evidence-led hero;
- interactive hero;
- compact follow-up hero.

All hero variants must use the same required content contract.

### 20.4 Decision components

- decision cue;
- buyer-context selector;
- priority selector;
- fit card;
- non-fit card;
- conditional recommendation;
- trade-off panel;
- risk callout;
- scenario branch;
- shortlist builder;
- next-step card.

### 20.5 Evidence components

- evidence receipt;
- source citation;
- source drawer;
- freshness label;
- confidence indicator;
- conflict notice;
- insufficient-evidence state;
- methodology summary;
- score explanation;
- claim-to-source trace.

### 20.6 Commercial components

- affiliate CTA;
- affiliate disclosure;
- current-pricing action;
- personalised decision-report request;
- email capture;
- implementation checklist request;
- external-provider handoff.

### 20.7 Content components

- direct-answer block;
- question-answer block;
- root-cause diagram;
- pain-point map;
- outcome statement;
- common mistake;
- “know first” callout;
- editorial quote;
- glossary definition;
- related decision.

### 20.8 System states

- loading;
- partial result;
- conflicting evidence;
- insufficient evidence;
- error;
- empty state;
- success;
- offline or unavailable source;
- scheduled refresh;
- updated recommendation.

No state may be left to generic browser defaults if it is part of the core decision journey.

---

## 21. Human-First Writing and Conversion Psychology

### 21.1 Writing objective

The interface should sound like an experienced marketer and decision adviser who understands what the visitor is worried about.

It must not sound like:

- a software provider’s sales page;
- a generic SEO writer;
- an academic report;
- an AI summariser;
- a forced “friendly” chatbot;
- a benchmark-obsessed technology commentator.

### 21.2 Required writing qualities

- plain English;
- direct answers;
- recognisable pain points;
- customer outcomes;
- conditional language;
- visible assumptions;
- honest limitations;
- specific next steps;
- natural rhythm;
- concise but not empty.

### 21.3 Customer-first translation

Features must be translated into consequences.

Instead of:

> Includes an API.

Prefer:

> Connect it to your existing workflow so your team does not have to repeat the same work manually.

The evidence layer may still show the technical feature.

### 21.4 CTA language

A CTA must answer:

- What will happen?
- What value will I receive?
- Is this an internal step or an external provider visit?
- Does clicking create a commitment?

### 21.5 Affiliate action sequence

The normal sequence is:

1. recognise the visitor’s problem;
2. establish relevant criteria;
3. show the recommendation and trade-offs;
4. show supporting evidence;
5. present the affiliate action;
6. disclose the commercial relationship;
7. make the destination clear.

The affiliate link is the endpoint of a trusted decision path, not the centre of the page.

---

## 22. Evidence and Social Proof Placement

### 22.1 Proof follows doubt

Proof must be located beside the claim, recommendation, price, risk, or action it supports.

### 22.2 Approved trust signals

- traceable sources;
- access and review dates;
- methodology summaries;
- visible limitations;
- conflict disclosures;
- number and quality of sources;
- product screenshots;
- independent review patterns;
- verified customer evidence where legally reusable;
- transparent affiliate disclosure;
- correction history;
- framework version.

### 22.3 Prohibited trust theatre

- unsupported logos;
- fake counters;
- invented usage numbers;
- anonymous testimonials with no provenance;
- star ratings without context;
- badges that imply certification where none exists;
- generic “trusted by thousands” language.

---

## 23. Affiliate and Lead-Magnet Experience

### 23.1 Affiliate CTA design

Affiliate actions should be visible and attractive once the user has enough information to make sense of them.

They must not be visually hidden, but they must also not overpower the evidence or trade-offs.

### 23.2 Required information near affiliate actions

- destination product;
- action description;
- material limitation where relevant;
- affiliate relationship disclosure;
- whether pricing or availability may have changed;
- evidence or reasoning that led to the recommendation.

### 23.3 Lead magnets

Lead magnets must continue the decision journey.

Examples:

- personalised decision report;
- shortlist summary;
- implementation checklist;
- migration checklist;
- vendor questions;
- ROI worksheet;
- evidence update alert.

Email capture appears when the user requests the asset, not before the page provides value.

---

## 24. Responsive and Accessibility Standards

### 24.1 Baseline

The project should meet WCAG 2.2 Level AA as the minimum accessibility target.

### 24.2 Internal touch-target preference

Important controls should aim for at least 44 by 44 CSS pixels where practical, even though the current WCAG 2.2 Level AA minimum target criterion is less strict in some circumstances.

### 24.3 Required checks

- keyboard navigation;
- visible focus;
- semantic headings;
- labelled controls;
- descriptive errors;
- contrast;
- text resizing;
- reduced motion;
- screen-reader meaning;
- non-colour status indicators;
- mobile reflow;
- large enough interactive controls;
- accessible drawers and dialogs;
- skip links where appropriate.

### 24.4 Accessibility and excitement

Accessibility is not a reason to create a boring interface.

The system should use:

- strong hierarchy;
- clear colour contrast;
- meaningful animation with fallbacks;
- accessible interactive diagrams;
- modern typography;
- polished focus and success states;
- optional rather than mandatory motion.

---

## 25. Performance and Technical Experience

### 25.1 Design performance rule

A visual effect that materially damages load time or interaction responsiveness must be simplified, deferred, or removed.

### 25.2 Required technical behaviours

- meaningful content appears in crawlable HTML;
- the hero does not depend on a large client-side application to become understandable;
- images are appropriately sized and optimised;
- below-the-fold media loads progressively;
- layout shift is controlled;
- fonts do not cause disruptive reflow;
- interactions respond promptly;
- motion remains smooth on common mobile devices;
- essential content remains available when JavaScript features fail.

### 25.3 Vercel alignment

The design system must support small, incremental Vercel deployments and preview checks. It must not depend on a large, fragile design build pipeline before content can be published.

---

## 26. Agent Design Workflow

### 26.1 Step 1 - Read context

The agent must load:

- Master PRD;
- this Design System;
- current page schema;
- current production tokens;
- relevant page-type rules;
- relevant Art Direction when available;
- approved UI and Motion Vault registry;
- current evidence and content record.

### 26.2 Step 2 - Declare page intent

Before design, the agent records:

- user problem;
- buyer state;
- primary question;
- primary action;
- uncertainty removed by each section;
- evidence and trust needs;
- intended signature interaction;
- mobile constraints.

### 26.3 Step 3 - Select composition

The agent selects an approved page pattern or composes approved blocks.

It may introduce a new composition if it:

- uses existing tokens;
- has a clear user purpose;
- does not duplicate an existing pattern;
- is logged for later vault review.

### 26.4 Step 4 - Apply Taste Skill

Taste Skill is used to:

- avoid generic layout;
- tune variance, motion, and density;
- improve visual hierarchy;
- propose a strong signature interaction;
- maintain a modern 2026 feel.

### 26.5 Step 5 - Assemble and render

The page is built with approved components and real or clearly marked provisional content.

No invented evidence is permitted for visual completeness.

### 26.6 Step 6 - Run Impeccable review

At minimum:

- critique hierarchy and clarity;
- audit responsiveness and accessibility;
- check anti-patterns;
- correct typography and spacing;
- add or refine purposeful motion;
- harden overflow and edge cases;
- polish design-system alignment.

### 26.7 Step 7 - Preview and safety/correctness check

Check:

- page renders;
- links and controls work;
- affiliate destination is correct;
- claims are not misleading;
- mobile is usable;
- no essential content is hidden;
- no severe accessibility failure prevents use.

### 26.8 Step 8 - Publish

Publish the page to Vercel as part of the daily three-page release unit.

### 26.9 Step 9 - Post-publication design evaluation

Run the full design checklist, collect screenshots, and assign improvements.

### 26.10 Step 10 - Scheduled optimisation

RETIRED by owner directive 2026-10-28 (see planning.md "Product-owner retirement directive"): scheduled evening optimisation windows and the 23:00 SAST publishing-rescue policy are not part of the current execution path. Design improvements are applied in normal change windows via the isolate/build/prove/ship workflow. This section remains for traceability only. See contradiction register C003 and amendment M003.

### 26.11 Step 11 - Promote reusable improvements

When an improvement works:

- extract it into a shared token, component, or pattern;
- update the registry;
- add a design decision entry;
- apply it to future pages;
- consider back-porting it to existing pages.

---

## 27. Deterministic Design Checks

The following checks convert subjective design principles into agent-readable requirements.

### 27.1 Page purpose checks

| ID | Check | Expected result |
|---|---|---|
| DS-PUR-001 | Page declares one primary user question | Required |
| DS-PUR-002 | Page declares one primary next action | Required |
| DS-PUR-003 | Each section declares the uncertainty it removes | Required |
| DS-PUR-004 | Product is introduced as a solution, not the opening subject by default | Required unless the user query is explicitly product-led |
| DS-PUR-005 | Affiliate commission does not determine visual prominence | Required |

### 27.2 Hero checks

| ID | Check | Expected result |
|---|---|---|
| DS-HERO-001 | Problem, outcome, or decision is visible | Required |
| DS-HERO-002 | Intended audience or situation is visible | Required |
| DS-HERO-003 | Trust signal is present | Required |
| DS-HERO-004 | Primary CTA is visible and specific | Required |
| DS-HERO-005 | Hero can stand alone as a compact pitch | Optimisation target |
| DS-HERO-006 | Visual does not compete with the headline or CTA | Required |
| DS-HERO-007 | Hero remains understandable on mobile | Required |

### 27.3 Hierarchy checks

| ID | Check | Expected result |
|---|---|---|
| DS-HIER-001 | One primary element leads each section | Required |
| DS-HIER-002 | Primary and secondary actions are visually distinct | Required |
| DS-HIER-003 | Heading levels follow semantic order | Required |
| DS-HIER-004 | Evidence metadata is quieter than the decision | Required |
| DS-HIER-005 | Zoomed-out view still reveals the reading path | Optimisation target |

### 27.4 Evidence checks

| ID | Check | Expected result |
|---|---|---|
| DS-EVD-001 | Proof appears beside the related doubt or claim | Required |
| DS-EVD-002 | Limitations appear beside the recommendation | Required |
| DS-EVD-003 | Evidence state is visually distinguishable | Required |
| DS-EVD-004 | Source details remain accessible without overwhelming the page | Required |
| DS-EVD-005 | Insufficient evidence has a designed state | Required |

### 27.5 CTA checks

| ID | Check | Expected result |
|---|---|---|
| DS-CTA-001 | CTA describes what happens next | Required |
| DS-CTA-002 | Primary CTA has the strongest action contrast | Required |
| DS-CTA-003 | Affiliate action has nearby disclosure | Required |
| DS-CTA-004 | CTA destination matches the label | Required |
| DS-CTA-005 | No more than one primary action competes in one viewport | Required |

### 27.6 Motion checks

| ID | Check | Expected result |
|---|---|---|
| DS-MOT-001 | Motion has a declared purpose | Required |
| DS-MOT-002 | Major page has a signature interaction where suitable | Optimisation target |
| DS-MOT-003 | Interactive controls provide feedback | Required |
| DS-MOT-004 | Reduced-motion alternative exists | Required |
| DS-MOT-005 | Motion does not delay essential content | Required |
| DS-MOT-006 | Animation pattern comes from approved library or is logged for review | Required |

### 27.7 Typography and colour checks

| ID | Check | Expected result |
|---|---|---|
| DS-TYPE-001 | Production font system is used | Required until approved migration |
| DS-TYPE-002 | Text roles use semantic tokens | Required |
| DS-TYPE-003 | Body copy is comfortably readable | Required |
| DS-COL-001 | Production palette is used | Required |
| DS-COL-002 | Contrast meets accessibility requirements | Required |
| DS-COL-003 | Colour is not the only state indicator | Required |
| DS-COL-004 | New colours have a documented semantic role | Required |

### 27.8 Mobile checks

| ID | Check | Expected result |
|---|---|---|
| DS-MOB-001 | No unintended horizontal overflow | Required |
| DS-MOB-002 | Primary CTA is usable with one hand | Required |
| DS-MOB-003 | Tables and evidence adapt without losing meaning | Required |
| DS-MOB-004 | Navigation remains understandable | Required |
| DS-MOB-005 | Text is readable without zoom | Required |
| DS-MOB-006 | Motion remains usable or reduces appropriately | Required |

### 27.9 Anti-slop checks

| ID | Check | Expected result |
|---|---|---|
| DS-SLOP-001 | No generic purple-to-blue gradient used by default | Required |
| DS-SLOP-002 | No card nested inside card without structural need | Required |
| DS-SLOP-003 | No identical icon tile above every heading | Required |
| DS-SLOP-004 | No unsupported fake dashboard screenshot | Required |
| DS-SLOP-005 | No generic generated people or robot imagery | Required |
| DS-SLOP-006 | No three consecutive pages use identical composition | Required |
| DS-SLOP-007 | No change is justified only as “looks better” | Required |

---

## 28. Release Classification

The system must not use broad “design blocker” language.

Every issue receives one of these classifications:

### 28.1 Correct before publication

Only when the page is:

- materially misleading;
- unsafe;
- legally non-compliant;
- broken to the point that the intended action cannot work;
- inaccessible to the point that the core journey cannot be completed;
- exposing confidential information;
- sending users to the wrong commercial destination.

### 28.2 Publish and fix immediately

Use when:

- hero clarity is weak;
- hierarchy is confusing but usable;
- mobile presentation is poor but functional;
- motion is missing or generic;
- imagery is provisional;
- spacing is inconsistent;
- proof placement is weak;
- CTA language is vague but not misleading.

### 28.3 Publish and optimise normally

Use for:

- additional delight;
- stronger art direction;
- better transitions;
- component extraction;
- alternative composition;
- back-porting a successful pattern;
- performance polish beyond the required floor.

This classification protects the daily release rule while preserving a route to quality.

---

## 29. Design Decision Register

Every material design decision must record:

- decision ID;
- date;
- page or component;
- problem;
- selected principle;
- chosen solution;
- alternatives considered;
- expected user benefit;
- evidence or design reference;
- model or person responsible;
- token or component impact;
- accessibility impact;
- mobile impact;
- result after publication;
- promote, revise, or retire decision.

Example:

```text
Decision ID: VSB-DD-0042
Problem: Visitors do not notice evidence confidence beside the recommendation.
Principle: Proof at the point of doubt.
Change: Move confidence state into the recommendation header and use the semantic evidence token.
Expected result: Visitors understand the certainty level before selecting the affiliate action.
Validation: Mobile screenshot, click behaviour, helpfulness signal, Impeccable critique.
```

---

## 30. Continuous Improvement Loop

The design system is living, but it must not drift.

The loop is:

1. publish;
2. capture screenshots and interaction results;
3. run deterministic checks;
4. run Taste and Impeccable critique;
5. identify one concrete weakness;
6. implement the smallest useful improvement;
7. deploy;
8. measure or review;
9. promote reusable improvements;
10. version the design system when rules change.

No automatic optimisation may silently change:

- affiliate disclosure;
- recommendation meaning;
- evidence confidence;
- product ranking;
- legal text;
- brand identity;
- core navigation.

---

## 31. Initial Design Quality Metrics

These metrics are signals, not automatic truth.

### 31.1 Comprehension

- Hero no-scroll test results
- First-screen question answered
- Unanswered-question feedback
- Exit rate before first decision block
- Users reaching evidence or recommendation sections

### 31.2 Decision progress

- Filter or scenario interaction
- Shortlist creation
- Decision-report request
- Evidence expansion
- Next-page progression
- Affiliate click after evidence exposure

### 31.3 Trust

- Source-link use
- Methodology views
- Helpful/not-helpful feedback
- Correction rate
- Returns to related decision pages

### 31.4 Design quality

- Deterministic check pass rate
- Mobile issue count
- Accessibility issue count
- Repeated-layout detector results
- Design-system token violations
- Motion-pattern violations
- Post-publication fix volume

### 31.5 Commercial integrity

- Affiliate click-through by evidence state
- Affiliate clicks that occur before reasoning is viewed
- Disclosure visibility
- Product mix rather than concentration only on high-paying vendors

---

## 32. Initial Implementation Sequence

### Stage 1 - Extract production design language

- inspect current code;
- create token inventory;
- document existing components;
- capture desktop and mobile screenshots;
- identify current inconsistencies;
- do not redesign yet.

### Stage 2 - Define the shared page contract

- hero schema;
- evidence schema;
- recommendation schema;
- CTA and disclosure schema;
- mobile behaviour;
- shared system states.

### Stage 3 - Create one visual reference for each page type

- one Decision Hub;
- one Solution Hub;
- one Decision Scenario;
- publish all three to Vercel;
- use premium-model execution to establish the quality bar.

### Stage 4 - Run Taste and Impeccable

- strengthen composition;
- correct hierarchy;
- add purposeful motion;
- remove anti-patterns;
- document changes.

### Stage 5 - Begin UI and Motion Vault curation

- schedule Mike and assistant curation session;
- gather preferred examples;
- normalise the first approved patterns;
- create registry.

### Stage 6 - Convert reference quality into components

- extract reusable tokens;
- extract reusable components;
- document variants;
- add deterministic tests;
- test with lower-cost models.

### Stage 7 - Daily improvement

- publish three pages per active build day;
- apply approved patterns;
- run post-publication audits;
- promote successful improvements.

---

## 33. Acceptance Criteria for This Design System

This design system is ready to guide implementation when:

- [ ] Production colours, fonts, spacing, and component patterns have been extracted.
- [ ] The three page types have approved reference designs.
- [ ] Each page type has at least one signature interaction pattern.
- [ ] Hero content contracts are implemented.
- [ ] Evidence, confidence, conflict, and insufficient-evidence states are designed.
- [ ] Affiliate CTAs and disclosures have approved patterns.
- [ ] Mobile versions of all core components exist.
- [ ] Taste Skill settings are documented per page type.
- [ ] Impeccable review commands are integrated into the design workflow.
- [ ] The deterministic design checks can be run or answered consistently.
- [ ] The publish-first improvement workflow is implemented.
- [ ] The UI and Motion Vault curation session has been scheduled.
- [ ] At least the first approved UI patterns have been normalised and registered.
- [ ] Accessibility and reduced-motion behaviour have been tested.
- [ ] New pages can look varied without drifting from the production identity.

---

## 34. Open Decisions

The following must be resolved during design implementation rather than guessed now:

1. Exact extracted colour values and semantic mapping.
2. Exact current font families and final type scale.
3. Whether the current homepage needs targeted refurbishment after token extraction.
4. Final Taste Skill variance, motion, and density values per page type.
5. Which open-source UI libraries enter the approved vault.
6. Which motion library or libraries are standardised.
7. (RETIRED 2026-10-28) Exact scheduled times for evening design-improvement runs — retired by owner directive; see planning.md and AGENTS.md.
8. Exact signature interaction used for each of the first three reference pages.
9. Final image sourcing and licensing workflow.
10. Whether a separate design-review page or internal visual dashboard is required.
11. Which design checks can be automated without an LLM.
12. Which checks require visual-model review.
13. How post-publication user signals influence design changes without creating uncontrolled drift.

---

## 35. Source and Reference Register

### Product and planning references

- Vetted SaaS Blueprint production site: `https://vettedsaasblueprint.online/`
- Vetted SaaS Blueprint Master PRD
- Vetted SaaS Blueprint Market Research and Opportunity Plan
- Vetted SaaS Blueprint Product Roadmap
- Vetted SaaS Blueprint AI-First System Architecture and Automation Blueprint

### Design-tool references

- Impeccable repository: `https://github.com/michaelchamboko/impeccable`
- Taste Skill repository: `https://github.com/michaelchamboko/taste-skill`

### Video references discussed during planning

- `https://youtu.be/f2mGqlLLqok`
- `https://youtu.be/kfnFBIKbShg`
- `https://youtu.be/cWZ9_EbT_2g`

The transcript text was supplied directly by the product owner during planning and distilled into operational rules in this document.

### Accessibility reference

- W3C Web Content Accessibility Guidelines 2.2: `https://www.w3.org/WAI/standards-guidelines/wcag/`

---

## 36. Final Design Principle

> Vetted SaaS Blueprint must never look premium merely because it is sparse, animated, or fashionable. It must feel premium because every message, space, colour, image, interaction, proof point, and next step has been chosen deliberately and behaves consistently.

> The visitor should not leave thinking that the website looked impressive. The visitor should leave thinking that the decision became clear, the evidence was trustworthy, and the next action made sense.
