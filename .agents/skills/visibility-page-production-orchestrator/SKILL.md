---
name: visibility-page-production-orchestrator
description: Use for any VisibilityPageV1 drafting, rewrite, refresh, review, or publication-readiness work.
---

# Visibility Page Production Orchestrator

## Boundary

This skill governs the approved ten-path VisibilityPageV1 catalogue. It is a sibling of direct-review publishing: do not modify PageBlueprint, LandingReleaseReceiptV1, the direct-review manifest, or approved-urls.md. Every visibility artifact has no direct affiliate URL, no external commercial CTA, and no self-attested publication state. Neon Postgres is the durable publication authority.

## Required sequence

1. Confirm the exact path is in the frozen catalogue and is authorized in Neon.
2. Complete type-aware Stage 0 and record a design direction, source hashes, reference roles, and non-copy boundaries.
3. Run visibility-page-intent-brief, then visibility-page-drafter.
4. Render the production-identical noindex preview and complete visibility-page-visual-review.
5. Run visibility-aware uniqueness, compliance, and conversion review. Route failures to the owning field and make at most two repair rounds.
6. Record a batch retro before the next wave.
7. Persist artifacts and hashes through the fenced Neon workflow. Owner approval is required for visibility publication, and alternatives/comparisons also require claim-level approval.

## Hard gates

- Do not draft before authorization, fresh evidence, and an approved page kind are available.
- Every visible claim needs an allowed source, source hash, retrieved_at, review_by, and expiry. Comparisons and alternatives need symmetric evidence; do not name a winner or make ranking, pricing/value, hands-on, or performance claims without explicit approved proof.
- Render structured text through approved components only. Never accept raw HTML/MDX or generated JSX/CSS/JavaScript.
- Previews are noindex/nofollow and analytics-free. A preview, Git commit, or local receipt is not a publication record.
- At exact expiry, production content, metadata, schema, and discovery links must fail closed to a neutral under-review response.

## Output

Return structured JSON describing the current stage, input identities, required handoff, blockers, and safe reason codes. Do not report LIVE unless the fenced Neon record says LIVE after the indexable deployment smoke.
