# WebCatalog webpage issues

Reviewed: 27 November 2026, Africa/Johannesburg.

Page: https://vettedsaasblueprint.online/landing-page-builders/how-can-you-organize-multiple-web-apps-into-dedicated-desktop-workspaces

Status: Open review findings. This list records issues, not completed fixes or publication approval. Numbers 1–35 preserve the chat review; numbers 36–38 record the owner's additional P1 findings. P1 means major correction; P2 means a quality or usability improvement. Evidence concerns are distinguished from confirmed visitor-facing defects.

## Content and usefulness

1. **P1 — The page does not answer its URL's how-to question.** It does not explain how to create a workspace, add apps, separate accounts, or switch workspaces. The workflow section asks readers to evaluate the tool instead.
2. **P1 — No useful editorial verdict.** The opening says WebCatalog may suit the reader without providing concrete conditions for choosing it, choosing a plan, or keeping browser profiles.
3. **P2 — The headline describes an unclear benefit.** "Keep each client workspace easier to read" suggests readability rather than organizing apps and maintaining account context.
4. **P2 — Product concepts are undefined.** Desktop apps, profiles, and spaces are repeated without explaining their different functions.
5. **P2 — Benefits are reader tasks.** Listing needs and running an evaluation do not explain what the product changes for the user.

## Editorial depth and evidence

6. **P2 — Repetition replaces useful detail.** Multiple sections repeat the instruction to compare the current setup with WebCatalog without advancing the decision.
7. **P2 — The poor-fit objection does not answer its question.** It asks the reader to compare browser profiles instead of naming concrete disqualifying conditions.
8. **P2 — The shared-setup FAQ avoids an available answer.** It tells readers to check collaboration support despite the evidence paragraph already identifying the Business plan's shared spaces and team management.
9. **P2 — Research coverage is too narrow for the decision.** One official pricing source supports plan limits but does not explain setup, account behavior, compatibility, and notification behavior. Vendor-only research is not inherently prohibited.
10. **P1 — "Confidence 90%" has no methodology.** The page does not explain the score's scope or calculation, inviting confusion with confidence in the overall recommendation.

## Trust and conversion

11. **P1 — Evidence limitations follow the first affiliate action.** The vendor-documentation/no-hands-on qualification appears several sections after the first CTA.
12. **P1 — CTA wording does not describe its destination.** "Review WebCatalog" redirects to the vendor through an affiliate URL, rather than opening an on-site review.
13. **P2 — The ending lacks a decision summary.** It repeats evaluation advice without summarizing best fit, the principal limitation, and the resulting recommendation.

## Desktop design

14. **P2 — No visual explanation of the product.** The inspected live page had zero images and no explanatory diagram. A text card occupies the hero media area. Related owner criterion: #38.
15. **P2 — Competing desktop hero messages.** The large left-hand question competes with the main headline and repeats content in the next section. Visual judgment.
16. **P2 — Sparse content is stretched across a long page.** Large gaps, headings, and single-sentence cards create roughly 5,800 pixels of page height at the tested sizes without equivalent information value. Visual judgment.
17. **P2 — Half the desktop evidence panel is empty.** One evidence entry occupies a bordered two-column grid, leaving an unexplained blank half.

## Mobile usability and accessibility

18. **P2 — The first CTA falls outside the initial mobile viewport.** At 390 × 844 its top was approximately 992px; at 320 × 800 it was approximately 1,014px. The large introductory card delays the action.
19. **P1 — The limitations strip has a keyboard-accessibility defect.** At 390px, 656px of content occupies a 358px scroll container. The browser-alternative caveat is offscreen without explicit navigation controls. Axe reports `scrollable-region-focusable`; the region and its content have no explicit focusability.

## Navigation, SEO, and sharing

20. **P2 — Misleading URL taxonomy.** The workspace/productivity review sits under `/landing-page-builders/`, while its page metadata identifies `productivity`.
21. **P2 — No contextual onward decision links.** Links lead to home, legal pages, vendor evidence, or the affiliate destination, with no related category or comparison path.
22. **P2 — Generic social metadata.** Open Graph and Twitter titles/descriptions describe the site instead of this article; `og:url` points to the homepage.

## Retained verification evidence

23. **P2 — Retained visual screenshots contain older copy.** They show a different headline and CTA, so they cannot verify the current wrapping, spacing, or hero height.
24. **P2 — Retained release records contain conflicting completion signals.** The quality record says `local_candidate_pass_remote_release_pending`, while the release receipt marks its checks passed and identifies a preview URL. This does not establish that production verification never occurred elsewhere.

## Validating additions

25. **P1 — Primary CTA text shrinks to 9px at 320px viewport width.** The body remains 16px while the main action label becomes difficult to read. Correct the responsive typography rather than shrinking text to fit.
26. **P2 — Heading tracking exceeds the craft floor.** The measured H1 tracking is -0.07em and section-heading tracking is -0.06em, against Impeccable's -0.04em floor.
27. **P2 — Card heading hierarchy is weak.** Desktop section headings measure 68px, while card headings are 16px, weight 400, with zero bottom margin.
28. **P2 — Accordion indicators do not reflect expansion.** Opening an objection leaves its plus indicator unchanged, with no rotation or replacement.
29. **P2 — Decorative structure implies nonexistent sequences.** The closing action is numbered 01 without a sequence; a single objection receives timeline styling without describing a process.

## Refining additions

30. **P2 — Renderer-added prose is outside the structured article receipt's coverage.** "Questions before the click" and "Review the destination details before committing" are template strings. The article receipt alone cannot establish editorial review of the complete rendered page.
31. **P2 — The rewrite changes account context into prioritization.** "Which account and project should be open right now?" becomes "Which account and project needs your attention now?" The fidelity notes do not explain this change in meaning.
32. **P2 — The rewrite weakens evaluation instructions.** Checking whether active context is recognizable becomes a manual instruction to confirm it. The instruction to record interruptions and resource usage on the reader's own device also loses specificity.

## Stage evidence concerns

These findings require provenance reconciliation. They do not prove that the associated work never happened or that historical records were subject to today's schema.

33. **P1 verification concern — Independent review is not established by the retained editorial receipt.** Model-family names and pass booleans are present; the receipt does not identify a completed reviewer exchange or independent session/context. Current independence requirements need verifiable execution evidence.
34. **P1 verification concern — The quality companion asserts success without showing the checks.** `build-pack/editorial/article-c23a6320-quality.json` contains a fingerprint, `passed: true`, and a gate name, but no diagnostic or execution references. Detailed evidence elsewhere must be linked before relying on this companion alone.
35. **P1 verification concern — Presentation evidence has a documented provenance warning.** `docs/opencode-webcatalog-continuation.md`, step 3, records that archived `_val2.ts` assigned passing assertions without running checks and prohibits relying on its output. Trace current receipts to genuine checks; this review has not established that every current receipt descends from that helper.

## Owner-added P1 criteria

Authority: explicit product-owner instruction in this chat on 27 November 2026. These additions record the requested criteria and severity without silently amending source strategy or claiming a fresh publication gate passed.

36. **P1 — Article word count is outside the required 1,800–2,300-word range.** The reviewed article is substantially shorter. The retained editorial checker reports 330 words in its editable prose scope; that is not a fresh count of every rendered page string. Refining must provide substantive, evidence-backed coverage within the owner's range, without filler. Closure requires a reproducible count of the final article body with the counting scope stated.
37. **P1 — No visible motion in the reviewed page experience.** Owner-reported defect, also consistent with the latest normal-motion browser observation. The page declares `gsap_editorial`, `split_reveal`, and motion intensity 6, but declarations and source code do not establish visible runtime motion. Earlier captures showed reveal behavior, so root cause and consistency remain unverified. Validating must demonstrate purposeful working motion in normal mode and an accessible reduced-motion alternative; reduced-motion mode itself is not a failure.
38. **P1 — No images created with image generation are present.** The inspected page contains zero images and its hero and benefit visual assets are null. This fails the owner's explicit image-generation criterion. Create and integrate relevant generated imagery, verify desktop/mobile rendering and alternative text, and preserve the prohibition on presenting generated imagery as authentic product screenshots, tests, or customer evidence. This extends #14 with a specific production requirement; it is not a separate claim that missing imagery was previously unreported.

## Criteria and evidence basis

- D04, Design System and Experience Standards: §9.1 `D04-S-039819730d12`; §9.4 `D04-S-3f0f90c64b2f`; §9.6 `D04-S-76c9675d41ba`; §17.2 `D04-S-12b1f74d0e51`; §21.2 `D04-S-7ddc1a780270`; §21.3 `D04-S-d9110ce256e1`; §27.4 `D04-S-433fa6bc3810`; §27.5 `D04-S-41ae60fc2d84`; §27.8 `D04-S-2da91aade9ee`; §7.5 ending rule `D04-S-1ebfc692b28b`.
- D05, Master PRD, §26.2 Public Page Requirements: `D05-S-5151b43d272f`.
- D07, Content Intelligence and Editorial Operations, §32 Editorial Quality Standard: `D07-S-761a1d533ac1`.
- D10, QA and Testing Plan, §9.4 Content and editorial quality: `D10-S-574481d73201`.
- Local skills: `.agents/skills/design-taste-frontend/SKILL.md` §4.7; `.agents/skills/impeccable/reference/craft-floor.md`; `.agents/skills/eleanor-editorial/SKILL.md` and its editorial references.
- Article and release artifacts: `src/generated/landing-pages/how-can-you-organize-multiple-web-apps-into-dedicated-desktop-workspaces.json` and its matching `releases/` directory.
- Refining artifacts: `build-pack/editorial/article-c23a6320-before.json`, `article-c23a6320-evidence.json`, and `article-c23a6320-quality.json`.
- Live HTML, Playwright desktop/mobile measurements, accordion interaction, public-link probes, and Axe accessibility results from this chat. Native browser control timed out; the same public URL was inspected with the installed headless browser.

Checks that passed during review: eight unique link destinations returned HTTP 200; the affiliate destination matched WebCatalog; disclosure preceded the first CTA; canonical URL, one H1, and source date were present; tested viewports had no page-wide horizontal overflow. The mechanical Impeccable scan was clean but did not detect the live scrolling-region accessibility issue.

Limits: no comprehensive screen-reader, cross-browser, or field-performance audit. No current word-count gate or image-generation work was executed. This document does not claim any issue is fixed.
