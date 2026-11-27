# Independent review: case-meadow

Review only this packet and the immutable interaction evidence named below. Do not inspect sibling cases, evaluation files, issue 107 reports or results, or prior judgments. Return the requested fields before discussing the case with anyone.

## Criterion

Source: *Vetted SaaS Blueprint - Agent Technology, Implementation and Narrative Interaction Standards*, section 27 "Accessibility Standards", stable source `D06-S-cab36a11f0f9`.

Where an internal horizontal region contains content outside the visible mobile viewport, keyboard users must be able to reach the region, see focus, and operate it to reach the hidden content. Page-wide absence of horizontal overflow does not establish this behavior.

## Reviewable evidence

The evidence is frozen in Git revision `bebb4fe644b3d97e9a21f46a6e06938ed35684cb` under `docs/designs/recovery-evidence/107/reviewer-packets/case-meadow/`:

- `interaction.webm`, Git blob `57c9c784d5779c75a8cb4b027c769a42fec7ee3d`
- `01-before.png`, Git blob `aee55b56cfbc4c7d4d5195a666ba032cf9037a59`
- `02-after.png`, Git blob `60883080caa5f2c91c2b6eb70cfaffc3cabaf51c`
- `interaction.json`, Git blob `ecf64ccc79d4544ca1d44acd18e51fc990da683e`

The viewport is 390 by 844 CSS pixels. The internal region is 358 pixels wide and contains 656 pixels of content. The second limitation begins outside the visible portion.

## Required response

Return exactly these three fields:

- **Observed evidence:** what focus and scroll behavior the rendered interaction demonstrates.
- **Verdict:** `meets` or `does_not_meet`.
- **Explanation:** why a keyboard user can or cannot reach the internally hidden limitation.
