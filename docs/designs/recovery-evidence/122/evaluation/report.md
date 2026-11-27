# Blinded reviewer recheck

Status: passed. Six genuine independent native Codex reviewers returned the expected verdict and an evidence-matching explanation. The set contains zero missed defects and zero false alarms.

## Binding and ordering

The examined integration revision is `cf0012f0b8d0795e9717ca427bc8bad4ce41ed2e`. The unchanged source-case evidence comes from `bebb4fe644b3d97e9a21f46a6e06938ed35684cb`. Exact source packet and browser-artifact Git blobs are recorded in `evidence-bindings.json`.

The neutral packets and reviewer configuration were frozen at `150dd9ee522b246a39f439ef1dc0a834b548011b`. Each fresh reviewer received one packet without the answer key, expected outcome, pair mapping, sibling packet, or prior judgment. The six raw responses were frozen at `4597dc9249346cb4f5899dd3e11a3f8c8f5a7d12` before comparison.

The first orbit context stopped before opening its packet and returned no verdict because its prompt incorrectly prohibited the mandatory shared baseline read. A new fresh orbit context read the shared baseline, then only its assigned project packet. `reviewer-attempts.json` records both attempts. The stopped context is not a judgment and is not part of the denominator.

## Case checks

| Case | Observed judgment | Independent evidence check | Result |
| --- | --- | --- | --- |
| case-lantern | `meets` | Names the external-vendor label, comparison value, matching external destination, and absence of commitment. | Accurate acceptance |
| case-orbit | `does_not_meet` | Identifies the possible on-site-review meaning and missing external-visit disclosure despite the affiliate notice. | Defect detected |
| case-river | `meets` | Explains that both questions accept the same account and project workspace answer. | Accurate acceptance |
| case-summit | `does_not_meet` | Distinguishes current workspace context from priority or attention. | Defect detected |
| case-meadow | `does_not_meet` | Uses focus skipping the region and `scrollLeft` remaining 0 to show the hidden content is unreachable. | Defect detected |
| case-quartz | `meets` | Uses visible region focus and movement from `scrollLeft` 0 to 298 to show the hidden content is reachable. | Accurate acceptance |

## Totals and limits

- Accurate verdicts with evidence-matching explanations: 6/6.
- Misses, where a defective example was accepted: 0/3.
- False alarms, where an adequate example was rejected: 0/3.

This recheck measures recognition of these six unchanged synthetic cases under the recorded reviewer configuration. It does not establish general reviewer reliability, prove historical WebCatalog causation, or report a real article run. No article, import state, database, deployment, or publication was changed.
