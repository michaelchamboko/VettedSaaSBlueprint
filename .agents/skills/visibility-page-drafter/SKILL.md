---
name: visibility-page-drafter
description: Use to draft structured VisibilityPageV1 content after a passing visibility intent brief.
---

# Visibility Page Drafter

## Contract

Produce only a validated VisibilityPageV1 JSON draft and companion evidence references. Never produce raw HTML/MDX, JSX, CSS, JavaScript, publication status, affiliate links, commercial CTA URLs, ratings, or self-authored JSON-LD. Visibility pages have no direct affiliate URL and Neon Postgres is publication authority.

## Drafting rules

- Use only the bounded content blocks and same-origin internal links from the approved link graph.
- Preserve claim ids and cite only approved evidence records. Do not invent facts or soften evidence requirements.
- Alternatives/comparisons use symmetric neutral language. Do not select a winner or imply superiority, price/value, hands-on use, or performance.
- The calculator accepts user inputs only; do not embed vendor plans or prices.
- Include a clear limitation and a reader action, but route commercial action through an internal audited review link.

## Output

Return JSON with the draft identity, content, claim ids, evidence references, related paths, relevant review path, design direction reference, and unresolved questions. Mark the draft as unpublished; the generated file is never a Neon authorization or release receipt.
