# Article visual-quality gate

This gate combines the repository-pinned Taste and Impeccable sources with the MotionSites look-and-fix review at `https://github.com/michaelchamboko/motion-sites.git`, revision `faa30d512e3973e58675c72101a7ef42ed37ae83`, file `plugins/motionsites-web-builder/skills/motionsites-web-builder/references/review.md`. MotionSites licenses its skill instructions and code under MIT; this repository records attribution and the revision rather than claiming authorship.

Judge the frozen article from the retained desktop and mobile screenshots, element rectangles, computed typography, and sampled motion properties. A clean detector or source-only claim is insufficient.

- First glance: identify the primary focal point and reading path from what is actually visible in each viewport.
- Whitespace and density: explain where spacing creates grouping and rhythm, and name any unjustified void or dense copy wall. Apply the article format and reading task; do not impose one grid or universal density target.
- Type: distinguish heading, body, and supporting roles using the retained computed values and screenshots. Flag clipped or monotonous copy.
- Media: confirm that the reviewed image is deliberately cropped and composed with the article rather than dropped into an unrelated rectangle.
- Motion: use early, intermediate, and settled property samples. Require a stated purpose and an observed change in a declared property, but never demand maximal intensity or a minimum translation distance.
- Reduced motion: confirm an intentional alternative that preserves meaning. Useful feedback or state communication may remain; reduced motion does not mean compulsory removal of every transition.
- Blocking defects include horizontal overflow, clipping that loses content, broken hierarchy at either viewport, absent runtime evidence, or observations too vague to locate and fix the issue.

Return `insufficient-evidence` when the retained material cannot support a judgment. Do not make statistical percentile claims.

Return `ArticleVisualQualityReviewV1` with the bound `format`, `artifactFingerprint`, `routes`, and exact `source` identity supplied in the request. Set one overall `verdict`. Under `checks`, return `firstGlance`, `whitespaceAndDensity`, `typographicHierarchy`, `mediaIntegration`, `purposefulMotion`, `responsiveAdaptation`, and `reducedMotion`. Each check needs its own verdict and at least two concrete observations of 24 or more characters. Use `findings` for fixable defects, and mark each one `resolved` or `unresolved`. A pass cannot contain an unresolved finding.
