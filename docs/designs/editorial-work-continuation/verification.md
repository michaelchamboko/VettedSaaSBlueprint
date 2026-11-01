# Verification and recovery checkpoint

Date: 2026-11-01. Baseline: `2124ef062daa10bd5485efb9e74546f11f48fb6e`, fetched from origin/main before creating `codex/editorial-work-continuation`.

## Instruction change

Before: the instructions required an editorial receipt but the recorded run submitted unchanged evidence three times. After: both supervisor entry points explicitly require completion of the editorial skill before another validation submission, prohibit unchanged failing inputs, and distinguish unfinished work from a demonstrated blocker. The editorial skill remains authoritative for editorial mechanics.

The scoped diff changes instructions and design records only. No runtime, schema, counter, source strategy, or release authority changed. Text was reviewed using unslop. `git diff --check` passed. This is documentation evidence, not a claim that a recovered article reached validation or publication.

## Required checks

- `npm run verify:agent-workflow`: passed.
- `npm run lint`: passed, 0 errors and 109 warnings in unchanged files.
- `npm run typecheck`: passed, with the existing Edge Runtime deprecation warning.
- Sandboxed `npm test`: 352 passed, 61 failed, 3 skipped. Failures included denied localhost connections and temporary-file operations.
- Unrestricted `npm test`: 409 passed, 4 failed, 3 skipped. Full local output: `.automation/article-imports/logs/editorial-continuation-tests.txt`.

Remaining failures:

1. `editorial-refinement.test.ts`: local vendored `references/principles.md` bytes do not match the pinned Git blob hash. This passes in the fresh baseline checkout; local byte representation remains unresolved.
2. `public-discovery.test.ts`: an expected `.studio-category` responsive CSS rule is absent. Reproduces on unchanged origin/main.
3. `repository-intelligence.test.ts`: prohibited historical graph-tool references remain in five unchanged tracked files. Reproduces on unchanged origin/main.
4. `vendor-removal.test.ts`: checkout-specific file inspection attempts to read a directory and fails with `EISDIR`. This passes in the fresh baseline checkout.

The same four test files were run in a fresh detached origin/main checkout. Result: 18 passed, 2 failed. Output: `.automation/logs-baseline-editorial.txt`. The task does not modify these tests or their application inputs. Required checks are not all green; merge and deployment remain blocked. Build and public-site validation were not run because no application or public content changed and the required test gate already failed.

## Existing import recovery

Read the persisted import and both intake records without executing another validation or retry. Import `article-c23a6320-0ba7-45e3-88dd-9160ce979f18` remains REFINING with its article blocker. The requested snapshot `intake-c8e12e5b-e280-41d4-8cf5-e10a780cb9d1` still records it as PROCESSING and later entries as PENDING.

The import's sourceFile points to `intake-97e6c2cc-e8a2-4c06-9ef8-58d75b0b2204`. Both captured sources hash to `860f40f630bdc9b771ca7871a80ec8698be36c3206bc2993d4dada2b8b5849c5`. `createArticleImport` reuses a non-LIVE import by source fingerprint, explaining the shared import ID without changing snapshot membership or captured bytes.

No `claude` or `gemini` executable or provider API-key variables were found in the inspected environment. OpenCode does have configured provider credentials and lists `minimax-coding-plan/MiniMax-M3` and `minimax-coding-plan/MiniMax-M3.1-Flash`. Listing credentials and models does not prove a successful model call. Different-family availability is not declared absent, and no cleanse is claimed.

The demonstrated shared blocker is the failing required test gate. Intake was not advanced, its blocker was not cleared, and no editorial receipt was fabricated. No publication, merge, deployment, or new LIVE receipt is claimed.

## Exact next action

Resolve the required-check failures in their own authorized scope. Then resume recovery of this same import from the primary checkout: perform the full editorial workflow, verify an actual different-family cleanse, generate matching editorial and quality evidence, repair the bound packet, and only then use explicit intake retry and resume the original snapshot. Preserve the existing retry counters.
