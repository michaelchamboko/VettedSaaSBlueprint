# Review request: Plan 1 authority alignment

## Candidate identity

- Baseline: `e48691c0bcd19043b14de55ad1f124c8e4542e9e`.
- Branch: `codex/plan-01-authority-alignment`.
- Review target: resolve and record the branch or PR head OID immediately before review. Do not use an embedded earlier SHA or the historical A0038-A0039 metadata.
- Scope: Plan 1 only. Map and reconcile authority, amend living source strategy, regenerate direct projections, and produce the Plan 2 handoff.

## Required review questions

1. Do C001-C005 and M001-M005 follow the owner directive without inventing a new schedule, service, publication authority, or product requirement?
2. Do D01-D10 distinguish the reusable release unit from retired cadence, and are all 06:00, 20:00, and 23:00 programme references locally retired without changing heading ancestry?
3. Did the source projection reconciler preserve execution-owned fields, retain only explicit owner-retired history, and fail closed on unexplained removals?
4. Are normalized hashes, Git lifecycle verification, and the 1.6.10 GitNexus pin correct without weakening semantic validation?
5. Are generated inventory, graph, bridge, active requirements, phase map, and source manifest internally consistent and reproducible from the checked-in sources?
6. Does `plan_02_handoff.md` bound remaining execution guidance without implementing Plan 2 or Plan 3?
7. Is any unrelated change, stale active programme claim, over-deletion, or misleading completion statement present?

## Verified candidate state

- Sources: 12.
- Headings: 1,424.
- Candidates: 112, comprising 79 accepted, 25 unresolved, and 8 duplicate.
- Graph: 791 claims, 8 directives, 868 relationships, zero unreviewed sections.
- Bridge: 2,223 node exports and 868 relationship exports.
- Active projections: 803 requirements, no UID migrations, four explicit owner-retired retained records, final reconciliation `stale: []`.
- Manifest SHA-256: `fa4d058c60c874aa412936248e7298539d946988bb2023ee47a79a2943568d53`.
- GitNexus reconciliation: skipped because pinned CLI 1.6.10 is not installed in this checkout. Direct-source and canonical-graph checks passed.

## Gate evidence

- `npm run verify:agent-workflow`: pass.
- `npm run lint`: pass, 0 errors and 15 pre-existing warnings.
- `npm run typecheck`: pass.
- `npm test`: pass, 394 tests, 391 passed, 3 environment skips, 0 failed.
- Focused Python closeout tests: 3 passed.
- Document-intelligence unit tests: pass.
- `verify-document-intelligence.ps1 -SkipGitNexus`: pass.
- `npm run build`: pass, 130/130 static pages.
- `npm run validate:public-site`: pass.

The first full-suite run after C005 failed only because the explicit retired-requirement list omitted the newly retired D03 and D07 records. The focused assertion was updated and passed before the full suite passed. An earlier parallel graph attempt failed closed on candidate-manifest mismatch; the full producer chain was then rerun serially.

## Historical evidence boundary

`A0038-changed-tracked-files.txt` and `A0039-candidate-file-hashes.txt` describe an earlier uncommitted candidate. They remain as small historical metadata, but do not use them to identify or approve the current candidate. The duplicate 20 MB patch and full generated snapshots were pruned before commit. Git commit and PR head OIDs are the current candidate identity.

## Review outcome format

Record:

- exact reviewed head SHA;
- findings ordered by severity with exact paths and evidence;
- whether each finding is actionable, nonblocking, or disputed;
- any missing check or uncertainty;
- one final result: `CLEAN`, `CHANGES REQUIRED`, or `BLOCKED`.

Do not return `CLEAN` if the reviewed head differs from the current PR head, a required gate is missing, or a material source/projection inconsistency remains.
