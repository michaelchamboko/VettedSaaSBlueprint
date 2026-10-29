# Plan 2 implementation plan — execution-guidance reconciliation

## Outcome

Bring subordinate execution guidance and article-import behaviour into agreement with the settled repository authority, and close the one remaining Neon rollback-proof gap.

This plan is ready for implementation. It does not reopen the completed migration architecture.

## Baseline

- Start from current origin/main after ccc2e1de3206f21b4e710fbc70c1e783079e0b69.
- Create a fresh branch and worktree.
- Read AGENTS.md, planning.md, this packet, and the applicable skills before editing.
- Preserve the twelve source documents, deterministic manifest, canonical graph, Neon schema, exact-head review, editorial receipts, and release adapter.

## E01 — Establish the implementation candidate

Finding IDs: C-201 through C-204.

1. Fetch origin/main and create a fresh codex-prefixed branch/worktree.
2. Record baseline commit, status, remotes, worktrees, Node/npm/Python versions, and applicable instruction paths.
3. Run these baseline checks:

       npm run verify:agent-workflow
       npm run lint
       npm run typecheck
       npm test

4. Record pre-existing failures separately and stop after three failed attempts at the same issue.

Acceptance:

- Clean isolated checkout.
- Baseline evidence names exact commits and exit codes.
- No unrelated change is staged or modified.

## E02 — Prove transactional rollback on an isolated Neon branch

Finding: C-204. Policy: P-03.

Inspect first:

- db/repository-intelligence-v001.sql
- src/lib/repository-intelligence/neon.ts
- scripts/verify-neon-migration.ts
- tests/repository-intelligence.test.ts

Implement the smallest database-backed verification that:

1. Refuses to run without an explicitly supplied validation connection.
2. Refuses a production branch identifier.
3. Captures the current validation-branch snapshot keys and counts.
4. Builds one unique synthetic snapshot.
5. Injects a deterministic invalid edge endpoint during replaceSnapshot.
6. Observes the expected foreign-key failure.
7. Proves the failed snapshot key has no snapshot, node, or edge rows.
8. Proves all pre-existing snapshot keys and counts are unchanged.
9. Reapplies one valid synthetic snapshot twice and proves stable counts.
10. Removes the synthetic snapshot in a finally block and proves cleanup.

Use a disposable branch when available. If the existing validation branch is used, record its ID and before/after state. Never point the test at production.

Suggested bounded surfaces:

- Add scripts/verify-repository-intelligence-rollback.ts if no existing harness can express the proof.
- Add a package script named intelligence:verify:rollback.
- Extend tests/repository-intelligence.test.ts only for local argument and fail-closed behaviour; keep the database mutation proof as an explicit isolated receipt.

Acceptance:

- The invalid replacement fails for the intended constraint.
- No partial rows survive.
- Repeated valid apply is idempotent.
- Cleanup restores the exact before state.
- The retained evidence contains no connection string or credential.

## E03 — Remove unbound article-import continuation

Finding: C-202. Policy: P-04.

Modify:

- .agents/skills/external-article-import/SKILL.md
- package.json
- scripts/import-article.ts
- src/lib/article-import/engine.ts
- tests/article-import.test.ts
- tests/article-import-recovery.test.ts
- tests/article-import-supervised.test.ts

Required changes:

1. Remove import:article:resume-pending from package.json.
2. Remove the resume-pending ImportCommand variant and parser branch.
3. Remove resumePendingImports when no remaining runtime consumer exists.
4. Rewrite supervised and recovery tests to resume a named import ID.
5. Preserve source creation and named resume commands.
6. Preserve leases, idempotency keys, WAITING_EXTERNAL, quarantine, editorial evidence, exact-head review, deployment verification, and retry behaviour.
7. Remove heartbeat-window language. Describe continuation as an explicit manual or API action naming one existing import.

Required negative tests:

- Parsing --resume-pending fails with the supported-command message.
- No package script exposes the removed bulk command.
- A named resume advances only its named import.
- A second pending import remains unchanged.
- Repeating a named resume retains current lease and idempotency protections.

Focused verification:

    npx tsx --test tests/article-import.test.ts tests/article-import-recovery.test.ts tests/article-import-supervised.test.ts

Acceptance:

- No documented or executable unbound continuation remains.
- Explicit source and named resume paths continue to pass.

## E04 — Align release and review guidance with actual policy

Finding: C-201. Policy: P-05.

Modify:

- .agents/skills/external-article-import/SKILL.md
- .agents/skills/code-review/SKILL.md
- tests/zero-approval-landing-instructions.test.ts
- tests/article-import-supervised.test.ts only where its description or fixtures encode owner merge

Required changes:

1. State that a clean current-head independent review plus all required gates permits automatic merge and deployment.
2. Remove instructions to wait for owner-approved merge or prohibit automatic merge.
3. Keep product-owner authority over source strategy, product requirements, affiliate destinations, and unresolved policy decisions.
4. Add both skills to the active-instruction regression test.
5. Preserve the existing runtime exact-head, merged-commit, receipt-rebinding, deployment, rollback, and production-verification gates.

Do not modify release.ts or local-release-adapter.ts unless a focused test demonstrates a behavioural mismatch; current code already implements P-05.

Focused verification:

    npx tsx --test tests/zero-approval-landing-instructions.test.ts tests/article-import-release.test.ts tests/article-import-supervised.test.ts

Acceptance:

- Active guidance contains no extra owner-merge state.
- Exact-head review remains mandatory.
- Existing automatic-merge release tests pass.

## E05 — Require both frontend design skills in the orchestrator

Finding: C-203. Policy: P-06.

Modify:

- .agents/skills/landing-page-production-orchestrator/SKILL.md
- tests/landing-skill-stage0-contract.test.ts

Required changes:

1. Require design-taste-frontend and project-local Impeccable before qualifying UI implementation.
2. Preserve Impeccable context and shape before implementation.
3. Preserve desktop/mobile inspection and critique, audit, detect, bounded correction, and polish after rendering.
4. Keep optional specialist routing conditional on its existing feature triggers.
5. Add focused assertions for both skill names and the required sequence.

Focused verification:

    npx tsx --test tests/landing-skill-stage0-contract.test.ts

Acceptance:

- The orchestrator and test require both skills.
- No new design authority or release gate is introduced.

## E06 — Re-run generators and verify the complete candidate

Run only generators affected by changed source records. These tasks should not alter the twelve source documents or canonical graph.

Required checks:

    npm run verify:agent-workflow
    npm run lint
    npm run typecheck
    npm test

Also run:

- The focused commands from E02–E05.
- npm run build and npm run validate:public-site if any runtime or release surface requires them under the repository contract.
- A current tracked-content and path audit for the retired provider token.
- A retired-schedule audit classifying each retained match.

Review the final diff against C-201 through C-204. Every changed line must trace to one finding.

Acceptance:

- All required checks pass or a precise blocker is recorded.
- Generated changes are reproducible and explained.
- No source strategy or unrelated product behaviour changed.

## E07 — Independent review and release

1. Commit the verified candidate through repository hooks.
2. Push the branch and open a PR whose description lists findings, before/after behaviour, focused tests, full gates, and isolated Neon receipt.
3. Obtain independent Codex review of the exact PR head.
4. Fix verified findings, rerun affected checks, and request review of the new head.
5. When the current head is clean and every required gate passes, merge and deploy under the repository contract.
6. Verify the merged commit through Vercel metadata, the public deployment endpoint, key public routes, and runtime error logs.
7. Do not apply a repository-intelligence snapshot to production unless the implementation changed snapshot inputs or schema and the reviewed release requires it.

Completion evidence:

- PR URL, reviewed head, merge commit, deployment ID and URL.
- Exact check results.
- Independent-review verdict.
- Isolated database receipt.
- Production verification or an explicit reason no database update was required.

## Stop conditions

Stop implementation and record the blocker when:

- A required policy is genuinely unresolved.
- The isolated database target cannot be proved non-production.
- A proposed fix would amend source strategy or expand product scope.
- The same fix fails three times.
- Independent review is unavailable after the candidate and all evidence are ready.
