# TRANSFORM-CLAIMS-1126 verification

Branch: `codex/transform-claims-1126`

Scope: synthetic fixtures only. No real article import, publication, or deployment ran.

## Before

Command:

```text
npx tsx --test --test-name-pattern "assessment findings|artifact snapshot already checked" tests/article-workflow-evidence.test.ts
```

Result: exit 1, 0 passed and 4 failed. The unknown finding claim did not produce `ASSESSMENT_CLAIM_MISMATCH`, and the transition ignored the checked artifact object. The first draft of the finding helper also serialized its judgment fields in the wrong order, so the known and empty-ID cases failed with `ASSESSMENT_JUDGMENT_MISMATCH`; that was test-fixture noise, not a product defect.

Direct inspection of `origin/main` confirmed the product gap. Claim coverage checked IDs against research, but assessment findings did not check their `claimIds`. The supervised executor also read and checked the artifact before `advanceImport`, whose assessment validator read it again.

## After

Command registered in `build-pack/execution-state.json` and run on the changed tree:

```text
node --test --import tsx --test-name-pattern "assessment findings|schema and commercial artifact object|the default CLI|supervised transforming handoff" tests/article-workflow-evidence.test.ts tests/article-import-supervised.test.ts
```

Result: exit 0, 6 passed, 0 failed, duration 22505.6368 ms.

- Known finding claim IDs pass.
- Unknown finding claim IDs fail against the bound research.
- Empty finding claim-ID arrays remain valid.
- The assessment inspects the same in-memory artifact object that passed schema and commercial checks.
- The focused supervised executor crosses TRANSFORMING to REFINING through the scoped artifact callback.
- A later independent evaluation rereads the artifact and verifies the original execution references and file hashes.
- The existing default-CLI regression retains early commercial rejection before the intentionally absent assessment receipt.

Repository-wide workflow, lint, and type checks are separate release gates and are not claimed by this receipt.
