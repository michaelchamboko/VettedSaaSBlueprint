# Cream-and-red motion preview deployment receipt

Status: production verified and reconciled.

Preview: https://vettedsaasblueprint.online/landing-page-previews/levo-motion-study

Commit: ea3ba1e3dd8d4cc3d3894484f7228b505e793e4f
Deployment: dpl_C4iPdkAhX1BqcWYAEZkfLN5rt1Yu
Baseline: 900a85a2f3c1ea0c886dbe9d38e5c24d6741ad34
Recorded: 2026-09-15T13:57:43.060Z

## Scope and design decisions

Owner directive: implement the approved cream-and-red preview plan dated 2026-09-15. This is an isolated utility preview, not homepage rollout. Existing PublicPageShell preserves the production header. The dedicated static route uses noindex, nofollow, is absent from the sitemap, and has no public navigation entry. No backend, affiliate, content-pipeline or homepage changes.

Design read: cream #f2eee5, ink #1d211d, muted ink #62665e, red #B73332; variance 6 / motion 5 / density 4. Existing locally bundled Instrument Sans supplies the approved neutral Geist-style treatment. Two semantic SVG diagrams retain real labels, descriptions, links and reserved dimensions.

Registered patterns: levo-study-entrance and levo-study-workflow in DESIGN_STANDARDS.json. Source constraints: Doc 04 section 18.3 (D04-S-7c9f562cef00), section 18.4 (D04-S-4557b679e3a5), section 25.2 (D04-S-72ce2ad2c538), and section 35 (D04-S-77a07562db66). Owner's approved preview plan supplies the exact sequence and timing. Reduced motion and JavaScript failure render complete static diagrams without sticky spacers. Viewports that cannot fit the composition remain in normal flow.

## Verification

- build: exit 0
- lint: exit 0
- test: exit 0
- typecheck: exit 0
- validate:public-site: exit 0
- verify:design-standards: exit 0

Tests: 323 passed, 3 skipped, 0 failed. Existing repository lint warnings remain; final targeted lint is clean. Browser checks cover 1440x900, 390x844, 320x700, 844x390, keyboard/dropdown, CTA destinations, resize, forward/reverse drawing, every completed stroke, no overflow, reduced motion and JavaScript-disabled fallback. Production proof compares captured homepage text, header HTML and sitemap against the pre-release baseline. See production/preview-verification.json and production screenshots for start, midpoint, completion and reverse states. Existing buyer journeys and navigation verification also passed.

Independent design and implementation review: PASS. Initial SVG dash-unit defect was repaired by removing non-scaling stroke from animated shapes; completion and reverse screenshots were re-reviewed. Bounded Impeccable detector: one overused-font warning for Instrument Sans, retained because the owner explicitly approved neutral Geist-style typography. The installed detector is source-based; rendered evidence comes from browser screenshots and the independent critique. No PRODUCT.md was fabricated.

Repository impact tooling was unavailable because of execution-policy and native-worker failures. Direct imports, the exact file allowlist, unchanged baseline files, and regression checks supplied impact evidence instead.

## Release ownership

The existing Vercel project was deployed under the publisher lease. Provider commit metadata and production alias were verified; production checks passed before canonical checkout/baseline reconciliation and lease release. See receipt.json and reconciliation.json. Only the isolated release commit was deployed.

## Review action

Open the preview, scroll down to complete the workflow, then scroll back up. Homepage rollout requires a separate owner decision.
