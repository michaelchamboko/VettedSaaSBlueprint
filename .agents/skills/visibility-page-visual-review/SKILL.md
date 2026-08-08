---
name: visibility-page-visual-review
description: Use to independently review a production-identical VisibilityPageV1 preview before semantic quality gates.
---

# Visibility Page Visual Review

## Boundary

Review a production-identical noindex/nofollow preview only. VisibilityPageV1 has no direct affiliate URL and Neon Postgres is publication authority; a visual pass does not approve publication.

## Required checks

- Desktop and mobile hierarchy, 200% zoom, keyboard focus, reduced motion, CTA/link wrapping, horizontal overflow, and browser errors.
- Visible breadcrumb, readable table and calculator states, semantic headings, and JavaScript-disabled article content.
- Original design direction without copied branding, content, or assets; distinguish hub, guide, decision, and calculator layouts without bespoke generated code.
- Confirm that candidate controls cannot set robots, schema, analytics, or publication state.
- At exact evidence expiry, verify the neutral no-store under-review response has no stale content, metadata, structured data, or discovery link.

## Output

Return structured JSON with status, viewport evidence, accessibility findings, overflow findings, motion findings, visual-fingerprint findings, expiry-boundary findings, required repairs, and handoff. Block downstream review on a visual hard failure.
