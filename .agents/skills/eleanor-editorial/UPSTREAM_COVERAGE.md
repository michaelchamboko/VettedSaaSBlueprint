# SlopMonster upstream coverage

This adapter pins SlopMonster commit `8bf609edfaeed844f1d03bb6b69f80dc21728c8b`. `UPSTREAM_TREE.json` records every file in that Git tree, including files that the runtime does not need. `UPSTREAM.json` records the smaller set copied into this skill. The verifier checks both records and the copied bytes.

## Workflow mapping

| Upstream step | Local execution | Local boundary |
| --- | --- | --- |
| 1. Establish context and run the checker | The Eleanor workflow identifies reader, page intent, decision, evidence constraints and format, then captures the checker output for all editable prose. | Structured article formats replace the upstream generic Markdown and HTML entry points. The checker remains the exact pinned `tools/deslop.py`. |
| 2. Review and rewrite in three ordered passes | The local passes are purpose and structure, meaning and evidence, then wording and rhythm. Every eligible prose field must change. | Evidence, disclosures, destinations, claims, metadata, object keys, array lengths and item order stay frozen. A substantive factual correction returns to drafting. |
| 3. Request a rival-family editing pass | The local workflow uses `prompts/cleanse.txt` in a separate, verifiable reviewer context and retains the completed exchange. | The adapter does not vendor `tools/cleanse.sh`. Model routing is tool-neutral, and ordinary refinement makes no network request of its own. A missing or unverifiable independent review blocks the receipt. |
| 4. Compare and check again | `scripts/compare-editorial-artifacts.ts` checks protected structure, runs the pinned checker, records before and after output, and requires `score 5/5 CLEAN`. A final fidelity review follows. | A clean score does not prove accuracy, human authorship or editorial quality. The receipt binds the final artifact and pinned revision. |

The local workflow is stricter than the general upstream skill in two places. It requires every editable field to be rewritten, and it fails closed when the independent review cannot be verified. These rules come from the repository owner directive and do not modify the pinned vendor files.

## File inventory and runtime choice

The runtime copies nine upstream files without changing their bytes:

- `LICENSE`
- `tools/deslop.py`
- `prompts/cleanse.txt`
- all five files under `references/`
- `examples/ridgeline-roofing.md`

The complete 24-file tree remains represented by hashes and modes in `UPSTREAM_TREE.json`. The adapter intentionally does not copy upstream `README.md`, `SKILL.md`, `.gitignore`, GitHub workflow, image assets, gate sample, Jasper transcript, `tools/cleanse.sh`, or the two upstream test files. The local skill supplies repository-specific instructions. Update verification runs the upstream tests from a trusted checkout instead of placing test programs, shell routing or images in the editorial runtime.

## Verify the current pin

The ordinary local check reads only repository files:

```text
node .agents/skills/eleanor-editorial/scripts/verify-upstream.mjs
```

For an update review, fetch the candidate into a separate ignored checkout, detach it at the proposed commit, and run:

```text
node .agents/skills/eleanor-editorial/scripts/verify-upstream.mjs --upstream-checkout <trusted-pinned-checkout>
python <trusted-pinned-checkout>/tools/test_deslop.py
bash <trusted-pinned-checkout>/tools/test_cleanse.sh
```

The checkout verifier requires the exact commit, repository origin and a clean worktree. It compares every path, mode and Git blob hash. Added, removed, changed or mode-only drift fails the check.

Before changing the pin, inspect the complete old-to-new tree diff and review the candidate `SKILL.md`, `prompts/cleanse.txt`, references, checker and tests. Run the upstream tests from the candidate checkout before copying approved files. Copy only the files the adapter uses, update both JSON records from `git ls-tree -r --full-tree`, rerun the checkout verifier, then run the repository's focused editorial tests and required gates. Do not copy upstream images, CI files or model-routing scripts into the runtime merely because they exist upstream.
