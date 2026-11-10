# Design judgment contract for VALIDATING

Use this reference as the authoritative tracked instruction for every presentation/design review judgment in the VALIDATING stage. It is a contract, not a checklist shortcut.

## Verdict

Each design review judgment must state exactly one verdict:

- `pass`: every required finding is resolved and the reviewed design satisfies the rule for the frozen artifact and rendering manifest.
- `fail`: the reviewed design does not satisfy the rule; the finding is real and blocking.
- `insufficient-evidence`: the reviewer cannot honestly determine pass or fail from the retained artifact, rendering manifest, routes, source, or runtime observations.

Never use `pass` as a default, fallback, or forced outcome.

## Findings

- Each finding must use one disposition: `resolved` or `unresolved`.
- A truthful negative review may contain `unresolved` findings. Do not delete, downgrade, or relabel them.
- `pass` is invalid when any finding is `unresolved`.
- Unsupported capabilities and missing runtime observations must be reported as `unresolved` findings with an honest `fail` or `insufficient-evidence` verdict, not hidden or converted into `pass`.

## Historical prompts

This contract supersedes any historical ad hoc prompt that forced `verdict: "pass"`. Historical forced-pass instructions remain historical evidence only; they are not active instructions and must not be reused. Retain `fail` and `insufficient-evidence` outcomes exactly as reviewed.

## Runtime evidence

A source-only review, a clean mechanical detector, or a checklist does not prove runtime behavior. Report missing runtime observations as `unresolved` findings with `fail` or `insufficient-evidence`; do not convert them into `pass`.

## Advancement

- A negative review (`fail` or `insufficient-evidence`) is valid evidence but does not advance the import.
- `pass` with unresolved findings does not advance the import.
- Only `pass` with all findings resolved can support advancement, alongside the existing binding, render, detector, and route checks.
- Do not coerce a failing or incomplete review into `pass`, and do not fabricate missing runtime observations.