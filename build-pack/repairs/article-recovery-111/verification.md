# Deployment recovery verification for issue 111

Date: 27 November 2026

Branch: `codex/recovery-111`

Base integration revision: `ade0b52450b9b72c5bf1c596fb9fd27b1c87c101`

Scope: synthetic release adapters and isolated article fixtures only. No real article, provider, alias, rollback, deployment, merge, or publication was changed.

## Observed result

The release controller now saves the operation key, intended commit, production assignment, and known-good rollback identity before it calls the deployment provider. A restart looks up the recorded commit on the production alias before it can deploy again.

The lost-response fixture made one deployment call. Provider lookup recovered that deployment, the controller ran all nine production checks, retained production evidence and terminal proof, and reached `LIVE` without rollback. The hard-exit fixture stayed fenced while the prior lease was owned. After ownership ended, it reconciled the original deployment and reached `LIVE` without another deployment call. This case also preserved and reconciled the legacy `deployment:${commitSha}` operation key.

An indeterminate lookup made no deployment or rollback call. The controller stayed in `WAITING_EXTERNAL` and saved the missing provider identity and production alias evidence in the release journal and next action. The local Vercel adapter fixture confirmed that deployment identity, commit metadata, and the canonical production alias are checked together.

## Focused runtime checks

All selected checks passed with isolated temporary roots under the worktree:

- `a lost deployment response reconciles the original production assignment without another deploy`
- `a hard-exit deployment intent remains fenced and then resumes the original deployment`
- `indeterminate deployment lookup holds release and records the missing evidence`
- `local adapter reconciles the intended commit and production alias as one deployment identity`
- `successful release records and verifies the full production receipt`
- `failed production verification rolls back and never reports LIVE`
- `deployment commit mismatch rolls back before returning`
- `receipt failure after deployment rolls back exactly once`
- `dispatch handles verified LIVE`

The first test-first execution did not produce a valid behavioral red receipt. Windows sandbox temp-file rename restrictions stopped the fixture before it reached the new assertion. Redirecting `TEMP` and `TMP` into the worktree removed that environmental failure. The tests were written before the product change and passed after implementation.

## Repository gates

- `npm run verify:agent-workflow`: passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed with 16 existing warnings and no errors.
- `git diff --check`: passed.

The available shell runtime was Node 26.13.0 with npm 11.20.0, not the repository's Node 24.x and npm 12.0.2 contract. The repository checks and focused tests passed under that available runtime. No claim is made for the unavailable pinned runtime in this worktree.
