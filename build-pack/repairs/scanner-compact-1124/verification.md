# Scanner consolidation verification

## Scope and authority

User directive OWNER-2026-11-24-SCANNER-COMPACT: consolidate scanner registrations and runner mechanics, preserve all 16 checks and candidate/production scopes, verify behavior, and ship through the required workflow. Planning packet: SCANNER-COMPACT-1124. No article execution or content edits are included.

## Change

The three runners now derive scanner registrations from one registry. Async process collection and JSON-object parsing share one helper. Runner-specific ordering, scope arguments, scheduling, failure decisions, report formats, and Stage 2 freshness/count checks remain in their original runners. Stage 2 retains synchronous execution and its generic JSON parser.

The five production modules contain 1,079 lines after consolidation, compared with 1,157 before: 78 fewer lines, including the new helper. This measures code size, not model-token or latency savings.

## Independently verified behavior

Baseline: 2b1e285dce188acba4cf6b8fbbb32eb64f790353. Node 24.22.3 and npm 12.0.2.

- All 21 existing focused tests passed before the change.
- All 31 final focused tests passed in an independent parent run. Coverage includes candidate specialist ordering and exact scoped arguments, production flags, malformed JSON, spawn errors, durable reports, missing/stale reports, and fail-closed scope validation.
- Actual scanner execution produced exactly matching normalized JSON reports before and after: 16 single-candidate reports and 16 production reports. Only duration_ms and started_at were excluded. See parity-summary.json for the digest and counts.
- The parity probe deliberately stubbed the Stage 2 callback to isolate scanner output. It does not certify release eligibility.
- A separate actual Stage 2 scanner gate, with core checks delegated using --ci-parallel-core, failed on the same baseline content findings: compliance (21 blockers, 27 findings), uniqueness (2 findings), and conversion copy (2 high-severity findings). This is a release blocker, not a passing gate.
- The candidate runner's existing acceptance of valid report JSON on nonzero exit is preserved and characterized; this refactor does not change that policy.

## Repository verification and release

The required six-check profile is running independently: verify:agent-workflow, lint, typecheck, full npm test, build, and validate:public-site. Its completed outcome and current-head Codex review must be recorded in the PR before release. Worker-reported typecheck and focused-test success are not a substitute for parent verification.

Merge and deployment remain blocked while required checks or the applicable Stage 2 gate fail. No production content findings have been waived, and no deployment is claimed.

## Local evidence

The isolated task worktree retains .mece/evidence/before and .mece/evidence/after, including full scanner comparisons, focused-test logs, the actual Stage 2 result, and the verification-profile result. Raw scanner reports are not added to the repository. The baseline repository-intelligence snapshot has 3,662 nodes and 12,795 edges; snapshot key 0cb409201aaa33bdafa649c03040bb03a12dfe0375c5ee5ae4a455e3c4556f2e. No database apply was performed.
