# Decision Guide Accordion Card Amendment — Implementation Plan

Status: implemented, independently reviewed, and authorized for production deployment
Branch: `codex/decision-card-accordion`
Base: `origin/main` at `c6254d70e75dc48a01439a7428c196cad45e66e3`
Approved direction: Concept 1, expanding editorial stack

## 1. Objective

Replace the homepage's static, equal-width decision-guide card rows with one reusable expanding editorial accordion. Preserve the existing VettedSaaSBlueprint paper, ink, clay, sage, serif, and sans-serif identity. Keep all current routes and source-bound copy unchanged.

The amendment applies to every three-card decision-guide group rendered on the homepage so the initial guide group and generated decision-set groups do not diverge visually.

## 2. Authority and constraints

- **User directive:** Concept 1 is approved for implementation. This is a card interaction and presentation amendment, not a site rebrand.
- **Repository fact:** D04 §6.2, Taste Skill role (`D04-S-c52a0e3d7a64`), sets Decision Hub working ranges of design variance 5–7, motion intensity 4–6, and visual density 5–7.
- **Repository fact:** D04 §7.4, purposeful microinteractions (`D04-S-50c9466739ae`), requires interaction to communicate state, progress, relationship, or confirmation.
- **Repository fact:** D04 §18.2, control feedback and context-preserving transitions (`D04-S-c95a9cafb49e`, `D04-S-4ada08689845`), explicitly includes accordions and evidence expansion.
- **Repository fact:** D04 §18.3, motion eligibility (`D04-S-7c9f562cef00`), permits motion only when it supports the decision or confirms an action.
- **Repository fact:** D04 §24.3, required accessibility checks (`D04-S-f0fcea5c8b33`), requires keyboard navigation, visible focus, reduced motion, screen-reader meaning, mobile reflow, non-colour state, and adequate targets.
- **Repository fact:** D04 §32 Stage 4 (`D04-S-1daaf8613a03`) requires Taste and Impeccable review, hierarchy correction, purposeful motion, anti-pattern removal, and documentation.
- **Scope guard:** Do not add the mockup's invented “Evidence current” label, new claims, imagery, routes, analytics, dependencies, or global redesign.

## 3. Design Read

Reading this as: a narrow refinement of a trust-first editorial SaaS homepage for evidence-conscious buyers, preserving the established identity while replacing an equal-card grid with a clearer progressive-disclosure interaction.

Working dials: `DESIGN_VARIANCE: 6`, `MOTION_INTENSITY: 5`, `VISUAL_DENSITY: 5`.

## 4. Technical decision

Use native HTML `<details>` and `<summary>` elements grouped with a unique `name` per card set. The first card starts open. This gives keyboard operation, disclosure semantics, and no-JavaScript functionality without adding client state or another dependency.

Desktop presentation uses a horizontal flex accordion: the open item grows, exposes its description and action, and receives one restrained offset shadow; closed items retain their number and title. Mobile presentation becomes a vertical accordion with the same semantics. Hover may preview emphasis, but only an explicit disclosure action changes state.

The existing GSAP homepage reveal may continue to target each item through `data-home-motion="review-card"`; the accordion itself remains native and CSS-driven. `HomepageMotion.tsx` should remain unchanged unless browser verification proves a real conflict.

## 5. Development tasks

### Task 1 — Accordion semantics and homepage integration

Write `tests/decision-guide-accordion.test.ts` first. Render the real homepage with `react-dom/server`, load the rendered markup in Playwright, and assert the visitor-visible contract:

- every decision-guide group contains three native `<details>` disclosures and three `<summary>` controls;
- each group has its own disclosure `name`, with one item open by default;
- titles, descriptions, and destination links remain available in server-rendered markup;
- opening a second item closes the first without application JavaScript;
- the existing initial routes and generated decision-set routes remain unchanged.

Run the focused test before production code. Expected: FAIL because the current homepage renders equal `<article>` cards and no disclosures.

Then create `src/components/public/DecisionGuideAccordion.tsx` and modify `src/app/page.tsx`:

- define only `title`, `description`, and `href` in the local item contract;
- accept a unique `groupName` and the three-item array;
- render a labelled list with grouped native `<details>` elements and the first item open;
- use `<summary>` as the disclosure control and keep a semantic level-three card heading;
- place the existing description and `Open guide` link in the revealed panel;
- preserve `data-home-motion="review-card"`;
- replace both duplicated homepage maps with the shared component;
- preserve all copy, routes, section order, and labels;
- add no client state, pointer tracking, dependency, image, or claim.

Run:

`node --test --import tsx tests/decision-guide-accordion.test.ts tests/public-home.test.ts`

Expected: PASS.

### Task 2 — Responsive visual interaction

Extend the same Playwright test before changing styles. Use the real rendered homepage and production stylesheet to assert:

- at 1440px the open card is materially wider than a closed card;
- activating another summary transfers the dominant state;
- the open panel is visible and closed panels are hidden;
- summary focus has a visible outline and important controls are at least 44px high;
- at 390px and 320px the disclosures stack without horizontal overflow;
- under reduced motion, accordion transitions and transforms resolve to none.

Run the focused test. Expected: FAIL because the existing stylesheet uses an equal three-column grid and has no accordion states.

Then modify only the decision-guide selectors in `src/app/globals.css`:

- replace the equal grid with a desktop horizontal expanding layout;
- give the open item increased width, a warm-paper surface, 12–16px radius, and one soft offset shadow;
- keep clay for sequence/state, near-black for primary text, and existing muted ink for body copy;
- keep closed titles readable and summary controls at least 44px high;
- add explicit hover, open, and `:focus-visible` states that do not rely on colour alone;
- animate only flex growth, content continuity, indicator rotation, and restrained shadow changes;
- remove those transitions and transforms under `prefers-reduced-motion: reduce`;
- use a vertical mobile accordion with full-width actions and no clipping;
- remove superseded grid-card rules instead of layering contradictory styles.

Run the focused test again. Expected: PASS.

### Task 3 — Full verification and mandatory design review

Run, in order:

1. `npm run lint`
2. `npm run typecheck`
3. `npm test`
4. `npm run build`
5. `npm run validate:public-site`

Expected: every command exits 0.

Render and inspect desktop and mobile together, including 1440px, tablet, 390px, 320px, 200% text zoom, keyboard focus, JavaScript disabled, and reduced motion. Record the bounded evidence under `build-pack/evidence/DECISION-CARD-ACCORDION/`.

Run the mandatory design review:

Before editing, run:

`./.agents/skills/impeccable/scripts/impeccable.cmd context --target src/app/page.tsx`

After the first verified render, inspect desktop and mobile together, then run:

1. `./.agents/skills/impeccable/scripts/impeccable.cmd critique src/app/page.tsx`
2. `./.agents/skills/impeccable/scripts/impeccable.cmd audit src/app/page.tsx`
3. `./.agents/skills/impeccable/scripts/impeccable.cmd detect src/app/page.tsx`

Correct findings in one bounded pass and confirm once. Record screenshots for desktop, mobile, keyboard focus, JavaScript-disabled, and reduced-motion states under `build-pack/evidence/DECISION-CARD-ACCORDION/`.

## 6. Acceptance criteria

- All homepage decision-guide groups use the approved expanding editorial design.
- One card is open by default; another can be opened with pointer, keyboard, and touch.
- Disclosure state is announced semantically and remains understandable without colour or motion.
- The component works without JavaScript; reduced motion produces an immediate, non-animated state change.
- Existing copy, claims, URLs, source evidence, and global brand tokens remain unchanged.
- No new runtime dependency is added.
- Desktop, tablet, 390px mobile, 320px mobile, and 200% text zoom pass visual inspection.
- Focused tests, lint, typecheck, full tests, production build, and public-site validation pass.
- Impeccable critique, audit, and detect outputs are resolved or explicitly recorded.

## 7. Explicit non-goals

- No redesign of review cards, studio categories, legal pages, headers, footers, or decision-journey pages.
- No new image asset from the approval mockup.
- No generated evidence status, ranking, recommendation, or commercial copy.
- No analytics event, database, API, deployment, or automation change.
- No source-strategy amendment.

## 8. Rollback boundary

The change is isolated to the new component, the two homepage call sites, scoped CSS, and focused tests. Rollback removes the component, restores the two existing maps and the prior `.decision-guide-catalogue__grid` rules, and leaves every route and content record untouched.
