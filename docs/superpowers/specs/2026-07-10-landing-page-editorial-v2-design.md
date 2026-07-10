# Future Landing-Page Design: `editorial_v2`

## Status

Approved design direction; implementation waits for written-spec review.

## Problem

The current direct-review landing-page renderer converges on a predictable mobile pattern: generic system typography, gradient-heavy interactive primitives, disclosure text that consumes the first viewport, ambiguous text pills, and CTA treatments that can wrap or compete for attention. Existing pages are already live and must remain visually unchanged.

The next 30 landing pages need a constrained visual identity and deterministic checks that prevent these failures from reappearing during drafting or rendering.

## Goals

- Preserve every currently published landing-page artifact, manifest entry, route, and legacy visual treatment.
- Introduce a future-only `editorial_v2` design profile for new page drafts.
- Enforce a distinctive display/body type pairing without changing global typography.
- Use a dark monochrome surface with one solid accent color and no gradient interactive primitives.
- Use an 8px spacing grid and mobile-safe CTA composition.
- Front-load a concise, answer-first snippet for AEO without burying the buyer decision.
- Reduce legal friction while retaining the existing disclosure hard gate: show a compact one-line disclosure near the first CTA and place the full disclosure in the page footer.
- Replace blind text pills with semantic decision cards and accessible disclosure rows.
- Keep future page production inside the existing intent, drafting, uniqueness, compliance, conversion, and owner-approval loop.

## Non-goals

- Do not rewrite, restyle, re-render, or republish any existing live landing page.
- Do not mutate the current published manifest or existing generated page JSON.
- Do not add public signup, tracking pixels, profiling, teams, billing, or new public infrastructure.
- Do not bypass evidence, destination, disclosure, affiliate-link, compliance, or owner-approval gates.
- Do not generate 30 page artifacts without approved intent briefs and resolved source-of-truth records.

## Recommended architecture

Use a versioned design profile carried inside the page blueprint:

```text
metadata.design_profile = "legacy" | "editorial_v2"
```

The field is optional with a `legacy` default so all existing artifacts continue to parse and render through their current path. New pages in the next-30 program must explicitly set `editorial_v2`. The route remains the same; `DirectReviewPage` dispatches to a new future-only renderer when the profile is selected and leaves the current markup path intact otherwise.

The implementation will add a scoped `EditorialReviewPage` component and scoped CSS/font classes. It will not change the global `body` font, global background, or legacy class names. The future component owns its own typography, spacing, CTA, disclosure, card, and footer rules.

## Future profile contract

### Typography

- Use a loaded display face such as Fraunces for headings and a loaded geometric grotesque such as Space Grotesk for body/UI copy.
- Keep the font classes scoped to `.landing-editorial-v2`; no global font replacement.
- Use intentional weight contrast: light/regular display text for editorial emphasis and heavy display/UI weights for decision labels.
- Reject `Inter`, Arial, Helvetica, and unqualified system-sans stacks in the future profile.

### Palette

- Backgrounds and surfaces must stay within a dark monochrome range.
- Use one solid accent token for links, CTA fill, focus states, and key numerals.
- Do not use linear/radial gradients on buttons, links, pills, or other interactive primitives.
- Preserve the existing legacy palette and radial background for artifacts without `editorial_v2`.

### Layout and spacing

- Use only 8px-grid spacing values in the future renderer: 8, 16, 24, 32, 40, 48, 64, and larger multiples as needed.
- Use a single-column mobile decision path and a restrained two-column desktop layout.
- Do not add `position: fixed`, `position: sticky`, or a floating bottom CTA in the future profile.
- Keep the primary CTA in the hero decision bundle; any secondary contextual link belongs in the footer and must not compete within the first mobile viewport.

### CTA primitive

- Render the CTA as `flex items-center justify-between whitespace-nowrap`.
- Keep label and arrow/icon in separate flex children; never embed `-`, `>`, or arrow glyphs into the generated label.
- Enforce a short label budget suitable for 320px-wide screens and preserve the reviewed CTA intent/destination.
- Use a solid accent fill, dark text, visible focus treatment, and `rel="nofollow sponsored"`.
- Keep hero CTA id and the first CTA block affiliate id identical unless an audited mapping exists.

### Answer-first hero

- Add an optional `hero.answer_snippet` field for the future profile.
- Require a 40–60-word answer snippet under the H1 for `editorial_v2` pages; it must answer the target buyer decision in plain language and avoid unsupported claims.
- Keep the existing subheadline for audience, expectation, and destination context rather than using it as a legal block.

### Disclosure and trust

- Keep the existing contract value `affiliate_disclosure.placement: "above_first_cta"`.
- Render the short disclosure as one compact, non-card line immediately before/alongside the primary CTA.
- Render `full_disclosure` in the future page footer with the affiliate disclosure link and other secondary/legal links.
- Do not render a large disclosure panel directly beneath the H1/subheadline.
- Unknown disclosure/material-connection state remains a hard block.

### Content components

- Render benefits as semantic decision cards with a numbered marker or meaningful icon, title, and buyer-specific explanation.
- Do not render plain text pills that resemble filters or controls without interaction semantics.
- Render FAQs as accessible `<details>` rows with clear summary affordances and page-specific friction questions.
- Keep the page to one primary decision CTA per mobile viewport.

## Batch controls for the next 30 pages

- Store future drafts separately from the published manifest until they pass the existing gates and owner approval. No draft is public by file presence.
- Build one exemplar first.
- Cap working batches at three pages until the exemplar and one small batch pass all gates without major rework.
- Run deterministic uniqueness, compliance, conversion-copy, responsive, and A11Y/static checks before subjective owner review.
- Run `landing-page-batch-retro` after the exemplar and every batch; convert repeated failures into scanner fixtures or skill/process updates before continuing.
- Treat “next 30” as a production target, not permission to skip intent viability, evidence, destination continuity, or owner approval.

## Source-of-truth changes

The implementation plan must cover:

1. Page schema support for the optional profile and future answer snippet.
2. A future-only renderer branch with scoped typography, palette, spacing, disclosure, CTA, card, FAQ, and footer rules.
3. Project rules and drafter contract updates that make `editorial_v2` mandatory for the next-30 batch.
4. Deterministic scanner checks for future-profile violations and a regression fixture proving legacy artifacts remain untouched.
5. A docs-only/static validation report. Hosted build and full typecheck remain GitHub/Vercel responsibilities per project rules.

## Acceptance criteria

- Existing published artifacts and the current manifest are unchanged.
- Existing artifacts without `design_profile` render through the legacy path.
- A future-profile artifact renders with the scoped display/body fonts and no global typography change.
- No future-profile CTA wraps at 320px/360px test widths, uses gradient primitives, or participates in a sticky/floating bottom action.
- The future hero contains the answer snippet, compact disclosure, one primary CTA, and clear destination expectation in a readable first viewport.
- Full disclosure and secondary links appear in the future footer.
- Benefits and FAQs have semantic structure and clear affordances; no blind text pills are used.
- Static checks fail malformed future-profile artifacts before the next batch advances.
- The ordered landing-page skill loop and owner approval requirements remain unchanged.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| A global CSS change alters live pages | Keep all new styles scoped to `.landing-editorial-v2`; leave legacy branch and global tokens unchanged. |
| Disclosure becomes too hidden for compliance | Retain a compact disclosure before/near the CTA and keep full legal text in the footer; preserve `above_first_cta`. |
| Long generated CTA labels still overflow | Enforce a future-profile label budget plus `whitespace-nowrap` and static 320px/360px checks. |
| Batch pages become visually distinct but semantically duplicative | Keep intent/uniqueness gates and the three-page cap; require a distinct buyer decision and evidence need for each page. |
| Font loading becomes a build dependency | Use the existing Vercel-owned Next.js runtime and keep the fallback stack scoped; validate in hosted CI rather than local install/build. |

