# Deployment recovery verification for issue 111

Date: 27 November 2026

Branch: `codex/recovery-111`

Base integration revision: `ade0b52450b9b72c5bf1c596fb9fd27b1c87c101`

Merged integration tip: `bfbd2aa3cd24f5dea0202ae095eab17f1b888ec0`

Scope: synthetic release adapters and isolated article fixtures only. No real article, provider, alias, rollback, deployment, merge, or publication was changed.

## Observed result

The release controller now saves the operation key, intended commit, production assignment, and known-good rollback identity before it calls the deployment provider. The default Vercel adapter stamps that stable operation key as deployment metadata. A restart filters production deployments by the exact metadata identity and confirms the provider deployment ID, intended commit, and canonical production alias together before it can deploy again.

The lost-response fixture made one deployment call. Provider lookup recovered that deployment, the controller ran all nine production checks, retained production evidence and terminal proof, and reached `LIVE` without rollback. The hard-exit fixture stayed fenced while the prior lease was owned. After ownership ended, it reconciled the original deployment and reached `LIVE` without another deployment call. This case also preserved and reconciled the legacy `deployment:${commitSha}` operation key.

An indeterminate lookup made no deployment or rollback call. The controller stayed in `WAITING_EXTERNAL` and saved the missing provider identity and production alias evidence in the release journal and next action. Default-adapter fixtures also proved that an unrelated deployment of the same commit and duplicate metadata matches are held instead of confirmed. A legacy `deployment:${commitSha}` record confirms only when its recorded provider deployment ID, commit, and production alias agree; an unrecorded legacy operation remains held for evidence.

## Focused runtime checks

All selected checks passed with isolated temporary roots under the worktree:

- `a lost deployment response reconciles the original production assignment without another deploy`
- `a hard-exit deployment intent remains fenced and then resumes the original deployment`
- `indeterminate deployment lookup holds release and records the missing evidence`
- `local adapter reconciles an exact metadata operation match and production alias as one deployment identity`
- `local adapter holds when an unrelated deployment of the same commit owns production`
- `local adapter holds duplicate deployments carrying the same operation identity`
- `local adapter proves a legacy operation from its recorded provider deployment and alias`
- `local adapter holds an unrecorded legacy operation even when production has the intended commit`
- `local adapter stamps and verifies the durable operation identity on deploy`
- `successful release records and verifies the full production receipt`
- `failed production verification rolls back and never reports LIVE`
- `deployment commit mismatch rolls back before returning`
- `receipt failure after deployment rolls back exactly once`

The first controller test-first execution did not produce a valid behavioral red receipt. Windows sandbox temp-file rename restrictions stopped the fixture before it reached the new assertion. Redirecting `TEMP` and `TMP` into the worktree removed that environmental failure. The controller tests were written before the product change and passed after implementation. The default-adapter identity tests then produced four behavioral failures against the pre-fix adapter (missing metadata lookup, unrelated same-commit confirmation, duplicate-match handling, and missing deploy metadata) and all passed after the adapter change.

The broad supervised `dispatch handles verified LIVE` case passed before the integration-tip merge. Exact merged-head reruns reached neither an assertion nor a terminal result before the 240-second and 300-second command limits, so it is not presented as current-head passing evidence. The directly affected controller, default-adapter, successful-release, and rollback cases above passed on the current head.

## Repository gates

- `npm run verify:agent-workflow`: passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed with 16 existing warnings and no errors.
- `git diff --check`: passed.

The available shell runtime was Node 26.13.0 with npm 11.20.0, not the repository's Node 24.x and npm 12.0.2 contract. The repository checks and focused tests passed under that available runtime. No claim is made for the unavailable pinned runtime in this worktree.

The required local code-intelligence refresh was attempted after implementation. It could not start because the installed codebase-memory CLI reported that exact-build admission could not be verified while other CBM operations were active. No code-graph artifact was changed, and all affected relationships were verified directly in source and focused tests.
