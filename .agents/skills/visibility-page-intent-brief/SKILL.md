---
name: visibility-page-intent-brief
description: Use before drafting a VisibilityPageV1 hub, guide, alternatives, comparison, or calculator page.
---

# Visibility Page Intent Brief

## Boundary

Return structured JSON only. A VisibilityPageV1 has no direct affiliate URL, no external commercial CTA, and uses Neon Postgres as publication authority. It may link internally to an audited review and cite ordinary HTTPS sources.

## Required inputs

- Frozen approved path and page kind.
- User task, audience, distinct buyer decision, and relevant review path.
- Fresh evidence records with source hashes, retrieved_at, review_by, expires_at, allowed wording, and risk tier.
- Closest published siblings and link-graph role.
- For alternatives/comparisons: a closed competitor set, symmetric claim matrix, and manual-approval requirement.

## Gate

Fail when a separate page cannot make a distinct useful decision; any claim is unproved or stale; an alternative/comparison lacks symmetric evidence; or the page would need pricing, ranking, winner, hands-on, or performance framing without an approved source. A calculator must be user-input-only and vendor-neutral.

## Output

Provide schema_version, status, path, kind, audience, JTBD, buyer_decision, people_first_reason, claim_inventory, claim_to_evidence_map, sibling_difference_matrix, internal_link_plan, risky_claims_to_omit, manual_approval_requirements, blockers, and next_handoff.
