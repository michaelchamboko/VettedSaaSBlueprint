# Automation hardening verification

The implementation is complete locally on `codex/automation-hardening`. The reviewed and fully tested code commit is `ce1288b`. Publication remains disabled. No real article was authored, imported, resumed, migrated or published during this task. Release tests use injected adapters and synthetic artifacts.

## Mandatory sequence

The shared registry in `src/lib/article-import/workflow-requirements.ts` supplies the stage instructions used by OpenCode work packets.

1. INGESTING checks instructions and capabilities, preserves source bytes and intake order, and reconciles the earliest processing entry.
2. RESEARCHING retains source snapshots, scoped claims, excerpts, retrieval times and pricing context.
3. TRANSFORMING requires the complete artifact, intent brief and SEO/AEO assessment. Required checks must pass. Recommendations require adoption or a recorded justification for non-adoption.
4. REFINING requires Eleanor's full prose coverage, all three passes, a different-family cleanse, fidelity review and 5/5 CLEAN. Actual executions accompany the editorial receipt. The final artifact is reassessed for SEO/AEO and claims.
5. VALIDATING binds content approval and presentation evidence to the artifact and rendering inputs. It includes the design reviews, complete detector coverage and desktop/mobile/reduced-motion checks. RELEASING and VERIFYING then require repository gates, independent current-head review and retained production verification before LIVE. HTTP 200 alone is insufficient.

Missing or stale evidence stops advancement. Quarantine has its own proof requirements. Missing work cannot justify skipping an article. Shared capability failures stop intake; explicit recovery preserves identity, snapshot order and retry history.

## Observed checks

| Check | Result |
| --- | --- |
| `npm test` on unchanged `ce1288b` | Exit 0. 457 tests: 454 passed, 0 failed, 3 skipped. Duration 590987 ms. |
| `npm run verify:agent-workflow` | Exit 0. Pins, vendored hashes, instructions and command wiring pass. |
| `npm run lint` | Exit 0. Zero errors and 15 existing warnings. |
| `npm run typecheck` | Exit 0 on the final code. |
| `npm run validate:public-site` | Exit 0. |
| `npm run build -- --webpack` | Exit 0 during integration. Compiled the existing site; no article authoring or publication. |
| Fresh-context code review | `ce1288b`, no remaining findings in the reviewed scope. |

The full-suite log is retained locally at `.scratch/full-test-ce1288b.log`. Focused regressions also passed for evidence capture, stale receipts, detector scope, changed bytes at unchanged paths, leases, intake recovery, rendering changes and production envelopes. The preceding full run overlapped integration edits and failed two evidence fixtures. It was replaced by the unchanged-commit run above; it is not counted as passing evidence.

Tests ran with the permissions needed for temporary atomic renames and localhost fixtures. The default Turbopack build rejected the worktree's external dependency junction; the webpack build passed. No production database snapshot was applied. The source-intelligence command was used only in dry-run mode.

## Operational limits

The capability configuration intentionally has no unverified model-family mappings. Preflight rejects real execution until verified mappings are supplied. The installed Python path was supplied explicitly for the successful capability probe. Local evidence validates provenance and bindings; it does not prove semantic truth or defend against an actor with unrestricted filesystem access.

The task status means local implementation and verification are complete. It does not authorize a real intake run or indicate deployment. No push, PR, merge or deployment was performed. The primary checkout's pre-existing `_mark_live` scripts were left untouched.
